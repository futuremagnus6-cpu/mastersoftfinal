const crypto = require('crypto');
const mongoose = require('mongoose');
const Razorpay = require('razorpay');
const config = require('../config');
const logger = require('../config/logger');
const { AppError } = require('../middleware/errorHandler');
const Shop = require('../models/Shop');
const User = require('../models/User');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const BillingSubscription = require('../models/BillingSubscription');
const BillingTransaction = require('../models/BillingTransaction');
const BillingEvent = require('../models/BillingEvent');
const AuditLog = require('../models/AuditLog');
const emailService = require('./emailService');

let razorpayInstance = null;

const VALID_DURATIONS = [1, 6, 12];
const DAY_MS = 24 * 60 * 60 * 1000;

function getRazorpay() {
  if (!razorpayInstance) {
    if (!config.razorpay.keyId || !config.razorpay.keySecret) return null;
    razorpayInstance = new Razorpay({
      key_id: config.razorpay.keyId,
      key_secret: config.razorpay.keySecret,
    });
  }
  return razorpayInstance;
}

function normalizeDuration(duration) {
  const months = Number(duration);
  if (!VALID_DURATIONS.includes(months)) {
    throw new AppError('Billing duration must be 1, 6, or 12 months', 400);
  }
  return months;
}

function getPlanPrice(plan, months) {
  if (months === 1) return plan.monthlyPrice;
  if (months === 6) return plan.semiAnnualPrice || Math.round(plan.monthlyPrice * 6 * 0.95);
  return plan.annualPrice || Math.round(plan.monthlyPrice * 12 * 0.90);
}

function addMonths(date, months) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function buildInvoiceNumber(shopId) {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  return `SUB-${stamp}-${shopId.toString().slice(-6).toUpperCase()}-${Date.now().toString().slice(-6)}`;
}

function isActiveLike(status) {
  return ['active', 'trial'].includes(status);
}

function comparePlans(currentPlan, nextPlan) {
  if (!currentPlan) return 'purchase';
  if (nextPlan.monthlyPrice > currentPlan.monthlyPrice) return 'upgrade';
  if (nextPlan.monthlyPrice < currentPlan.monthlyPrice) return 'downgrade';
  return 'renewal';
}

async function sendBillingEmail(shop, transaction, kind) {
  try {
    const admin = await User.findOne({ shopId: shop._id, role: 'shop_admin' }).lean();
    if (!admin) return;
    const plan = await SubscriptionPlan.findById(transaction.plan).lean();
    const validUntil = transaction.periodEnd
      ? transaction.periodEnd.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
      : 'N/A';

    if (kind === 'failed') {
      await emailService.sendBillingNotificationEmail(
        admin.email,
        admin.name,
        'Payment failed',
        `Payment failed for ${shop.name}`,
        `We could not process your ${plan?.name || 'subscription'} payment. Please retry from Billing.`
      );
      return;
    }

    await emailService.sendPaymentConfirmationEmail(
      admin.email,
      admin.name,
      shop.name,
      plan?.name || 'Subscription',
      transaction.amountPaid || transaction.amount,
      transaction.razorpayPaymentId || transaction.razorpayOrderId,
      validUntil
    );
  } catch (error) {
    logger.warn(`Billing email failed: ${error.message}`);
  }
}

async function syncShopEntitlement({ shop, plan, subscription, transaction, session }) {
  shop.subscription.plan = plan._id;
  shop.subscription.status = subscription.status === 'past_due' ? 'suspended' : subscription.status;
  shop.subscription.currentPeriodStart = subscription.currentPeriodStart;
  shop.subscription.currentPeriodEnd = subscription.currentPeriodEnd;
  shop.subscription.autoRenew = subscription.autoRenew;
  shop.subscription.durationMonths = subscription.billingCycleMonths;
  shop.subscription.razorpaySubscriptionId = subscription.razorpaySubscriptionId || transaction.razorpayPaymentId;
  shop.features = plan.features;
  shop.limits = plan.limits;
  shop.status = subscription.status === 'active' ? 'active' : shop.status;
  shop.activatedAt = shop.activatedAt || new Date();
  await shop.save({ session });
}

async function expireOverdueSubscriptions(session) {
  const now = new Date();
  const shops = await Shop.find({
    $or: [
      { 'subscription.status': 'trial', 'subscription.trialEndsAt': { $lt: now } },
      { 'subscription.status': 'active', 'subscription.currentPeriodEnd': { $lt: now } },
    ],
    status: { $ne: 'disabled' },
  }).session(session);

  for (const shop of shops) {
    shop.subscription.status = 'expired';
    shop.subscription.autoRenew = false;
    await shop.save({ session });
    await BillingSubscription.updateMany(
      { shopId: shop._id, status: { $in: ['active', 'past_due'] } },
      { status: 'expired', autoRenew: false },
      { session }
    );
  }

  return shops.length;
}

async function createCheckoutOrder({ shopId, planId, duration, userId, requestedAction, idempotencyKey }) {
  const rzp = getRazorpay();
  if (!rzp) throw new AppError('Payment gateway not configured. Contact administrator.', 503);

  const months = normalizeDuration(duration || 1);
  const [shop, plan] = await Promise.all([
    Shop.findById(shopId).populate('subscription.plan'),
    SubscriptionPlan.findOne({ _id: planId, isActive: true }),
  ]);
  if (!shop) throw new AppError('Shop not found', 404);
  if (!plan) throw new AppError('Plan not found or inactive', 404);

  const activePending = await BillingTransaction.findOne({
    shopId,
    plan: planId,
    billingCycleMonths: months,
    status: { $in: ['created', 'pending', 'authorized'] },
    createdAt: { $gte: new Date(Date.now() - 30 * 60 * 1000) },
  }).lean();
  if (activePending) {
    return {
      reused: true,
      transaction: activePending,
      order: {
        id: activePending.razorpayOrderId,
        amount: Math.round(activePending.amount * 100),
        currency: activePending.currency,
      },
      plan,
      shop,
    };
  }

  const action = requestedAction || comparePlans(shop.subscription?.plan, plan);
  const amount = getPlanPrice(plan, months);
  const transaction = await BillingTransaction.create({
    shopId,
    plan: plan._id,
    type: action,
    status: 'created',
    amount,
    billingCycleMonths: months,
    invoiceNumber: buildInvoiceNumber(shop._id),
    idempotencyKey: idempotencyKey || `${shopId}:${planId}:${months}:${Date.now()}`,
    createdBy: userId,
    metadata: { source: 'checkout' },
  });

  const receipt = `sub_${transaction._id.toString().slice(-12)}`;
  const order = await rzp.orders.create({
    amount: Math.round(amount * 100),
    currency: 'INR',
    receipt,
    notes: {
      shopId: shop._id.toString(),
      planId: plan._id.toString(),
      transactionId: transaction._id.toString(),
      duration: String(months),
      action,
      invoiceNumber: transaction.invoiceNumber,
    },
  });

  transaction.razorpayOrderId = order.id;
  transaction.status = 'pending';
  await transaction.save();

  return { reused: false, transaction, order, plan, shop };
}

function verifyCheckoutSignature(orderId, paymentId, signature) {
  if (!config.razorpay.keySecret) throw new AppError('Payment gateway secret is not configured', 503);
  const expected = crypto.createHmac('sha256', config.razorpay.keySecret).update(`${orderId}|${paymentId}`).digest('hex');
  if (expected !== signature) throw new AppError('Invalid payment signature', 400);
}

function verifyWebhookSignature(rawBody, signature) {
  if (!config.razorpay.webhookSecret) throw new AppError('Razorpay webhook secret is not configured', 503);
  const expected = crypto.createHmac('sha256', config.razorpay.webhookSecret).update(rawBody).digest('hex');
  if (expected !== signature) throw new AppError('Invalid Razorpay webhook signature', 400);
}

async function activatePaidTransaction({ orderId, paymentId, signature, eventPayload, source, session }) {
  const transaction = await BillingTransaction.findOne({ razorpayOrderId: orderId }).session(session);
  if (!transaction) throw new AppError('Billing transaction not found for payment order', 404);

  if (transaction.status === 'captured') return transaction;
  if (paymentId && transaction.razorpayPaymentId && transaction.razorpayPaymentId !== paymentId) {
    throw new AppError('Payment already linked to another payment id', 409);
  }

  const [shop, plan] = await Promise.all([
    Shop.findById(transaction.shopId).session(session),
    SubscriptionPlan.findById(transaction.plan).session(session),
  ]);
  if (!shop || !plan) throw new AppError('Billing references are invalid', 422);

  const now = new Date();
  const base = shop.subscription?.currentPeriodEnd && shop.subscription.currentPeriodEnd > now && transaction.type === 'renewal'
    ? shop.subscription.currentPeriodEnd
    : now;
  const periodEnd = addMonths(base, transaction.billingCycleMonths);

  let subscription = await BillingSubscription.findOne({
    shopId: shop._id,
    status: { $in: ['pending', 'active', 'past_due', 'expired', 'cancelled'] },
  }).sort({ updatedAt: -1 }).session(session);

  if (!subscription || ['expired', 'cancelled'].includes(subscription.status)) {
    subscription = new BillingSubscription({ shopId: shop._id, plan: plan._id, billingCycleMonths: transaction.billingCycleMonths });
  }

  subscription.plan = plan._id;
  subscription.status = 'active';
  subscription.lifecycle = transaction.type;
  subscription.billingCycleMonths = transaction.billingCycleMonths;
  subscription.currentPeriodStart = base;
  subscription.currentPeriodEnd = periodEnd;
  subscription.cancelledAt = undefined;
  subscription.cancelAtPeriodEnd = false;
  subscription.autoRenew = true;
  subscription.razorpaySubscriptionId = eventPayload?.subscription_id || subscription.razorpaySubscriptionId;
  subscription.lastTransaction = transaction._id;
  subscription.metadata = { source };
  await subscription.save({ session });

  transaction.subscription = subscription._id;
  transaction.status = 'captured';
  transaction.amountPaid = transaction.amount;
  transaction.razorpayPaymentId = paymentId || transaction.razorpayPaymentId;
  transaction.razorpaySignature = signature || transaction.razorpaySignature;
  transaction.periodStart = base;
  transaction.periodEnd = periodEnd;
  transaction.paidAt = now;
  transaction.metadata = { ...(transaction.metadata || {}), source, eventPayload };
  await transaction.save({ session });

  await syncShopEntitlement({ shop, plan, subscription, transaction, session });
  await AuditLog.create([{
    shopId: shop._id,
    user: transaction.createdBy,
    action: 'payment',
    resource: 'BillingTransaction',
    resourceId: transaction._id,
    description: `Subscription payment captured for ${shop.name}`,
    metadata: {
      amount: transaction.amountPaid,
      planName: plan.name,
      razorpayPaymentId: transaction.razorpayPaymentId,
      razorpayOrderId: transaction.razorpayOrderId,
      invoiceNumber: transaction.invoiceNumber,
    },
  }], { session });

  return transaction;
}

async function confirmCheckoutPayment({ orderId, paymentId, signature }) {
  verifyCheckoutSignature(orderId, paymentId, signature);
  const session = await mongoose.startSession();
  let transaction;
  await session.withTransaction(async () => {
    transaction = await activatePaidTransaction({ orderId, paymentId, signature, source: 'client_verify', session });
  });
  session.endSession();
  const populated = await BillingTransaction.findById(transaction._id).populate('plan').lean();
  const shop = await Shop.findById(populated.shopId);
  sendBillingEmail(shop, populated, 'success');
  return populated;
}

async function markPaymentFailed({ orderId, paymentId, reason, source }) {
  const transaction = await BillingTransaction.findOneAndUpdate(
    { razorpayOrderId: orderId },
    { status: 'failed', razorpayPaymentId: paymentId, failureReason: reason, metadata: { source } },
    { new: true }
  );
  if (transaction) {
    const shop = await Shop.findById(transaction.shopId);
    if (shop) sendBillingEmail(shop, transaction, 'failed');
  }
  return transaction;
}

async function processRazorpayWebhook({ rawBody, signature }) {
  verifyWebhookSignature(rawBody, signature);
  const payload = JSON.parse(rawBody.toString('utf8'));
  const eventId = payload.event_id || payload.id || crypto.createHash('sha256').update(rawBody).digest('hex');

  let event = await BillingEvent.findOne({ eventId });
  if (event?.status === 'processed') return event;
  if (!event) {
    event = await BillingEvent.create({
      eventId,
      eventType: payload.event,
      signature,
      payload,
      status: 'received',
    });
  }

  try {
    const entity = payload.payload?.payment?.entity || payload.payload?.subscription?.entity || payload.payload?.refund?.entity || {};
    const orderId = entity.order_id || entity.notes?.razorpayOrderId;
    const paymentId = entity.id && payload.payload?.payment ? entity.id : entity.payment_id;

    if (['payment.captured', 'order.paid', 'subscription.charged'].includes(payload.event) && orderId) {
      const session = await mongoose.startSession();
      let transaction;
      await session.withTransaction(async () => {
        transaction = await activatePaidTransaction({
          orderId,
          paymentId,
          eventPayload: entity,
          source: `webhook:${payload.event}`,
          session,
        });
      });
      session.endSession();
      event.transaction = transaction._id;
      event.shopId = transaction.shopId;
      const shop = await Shop.findById(transaction.shopId);
      sendBillingEmail(shop, transaction, 'success');
    } else if (['payment.failed', 'subscription.halted'].includes(payload.event) && orderId) {
      const transaction = await markPaymentFailed({
        orderId,
        paymentId,
        reason: entity.error_description || entity.error_reason || payload.event,
        source: `webhook:${payload.event}`,
      });
      if (transaction) {
        event.transaction = transaction._id;
        event.shopId = transaction.shopId;
      }
    } else if (payload.event === 'refund.processed') {
      const transaction = await BillingTransaction.findOneAndUpdate(
        { razorpayPaymentId: entity.payment_id },
        { status: 'refunded', amountRefunded: (entity.amount || 0) / 100, refundedAt: new Date() },
        { new: true }
      );
      if (transaction) {
        event.transaction = transaction._id;
        event.shopId = transaction.shopId;
      }
    } else {
      event.status = 'ignored';
      event.processedAt = new Date();
      await event.save();
      return event;
    }

    event.status = 'processed';
    event.processedAt = new Date();
    await event.save();
    return event;
  } catch (error) {
    event.status = 'failed';
    event.error = error.message;
    await event.save();
    throw error;
  }
}

async function cancelSubscription(shopId, { immediate = false } = {}) {
  const shop = await Shop.findById(shopId);
  if (!shop) throw new AppError('Shop not found', 404);
  const subscription = await BillingSubscription.findOne({ shopId, status: { $in: ['active', 'past_due'] } }).sort({ updatedAt: -1 });
  if (!subscription) throw new AppError('Active subscription not found', 404);

  subscription.cancelAtPeriodEnd = !immediate;
  subscription.autoRenew = false;
  subscription.cancelledAt = new Date();
  if (immediate) {
    subscription.status = 'cancelled';
    shop.subscription.status = 'cancelled';
    shop.subscription.autoRenew = false;
    await shop.save();
  }
  await subscription.save();
  return subscription;
}

async function getBillingDashboard(shopId) {
  await expireOverdueSubscriptions();
  const [shop, transactions] = await Promise.all([
    Shop.findById(shopId).populate('subscription.plan', 'name monthlyPrice semiAnnualPrice annualPrice features limits').lean(),
    BillingTransaction.find({ shopId }).populate('plan', 'name').sort({ createdAt: -1 }).limit(50).lean(),
  ]);
  if (!shop) throw new AppError('Shop not found', 404);

  const now = new Date();
  const end = shop.subscription?.currentPeriodEnd || shop.subscription?.trialEndsAt;
  const remainingDays = end ? Math.max(0, Math.ceil((new Date(end) - now) / DAY_MS)) : 0;

  return {
    subscription: shop.subscription,
    shopName: shop.name,
    shopEmail: shop.contact?.email,
    status: shop.status,
    remainingDays,
    transactions,
  };
}

async function getAdminBillingDashboard({ page = 1, limit = 25, status } = {}) {
  const query = status ? { status } : {};
  const [summary, transactions, total, failedPayments, subscriptions] = await Promise.all([
    BillingTransaction.aggregate([
      { $match: { status: { $in: ['captured', 'refunded'] } } },
      { $group: {
        _id: '$status',
        count: { $sum: 1 },
        amount: { $sum: '$amountPaid' },
        refunded: { $sum: '$amountRefunded' },
      } },
    ]),
    BillingTransaction.find(query)
      .populate('shopId', 'name contact.email')
      .populate('plan', 'name')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean(),
    BillingTransaction.countDocuments(query),
    BillingTransaction.countDocuments({ status: 'failed' }),
    BillingSubscription.countDocuments({ status: 'active' }),
  ]);

  const captured = summary.find(s => s._id === 'captured');
  const refunded = summary.find(s => s._id === 'refunded');
  return {
    analytics: {
      activeSubscriptions: subscriptions,
      totalRevenue: captured?.amount || 0,
      capturedPayments: captured?.count || 0,
      failedPayments,
      refundedAmount: refunded?.refunded || 0,
    },
    transactions,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  };
}

module.exports = {
  VALID_DURATIONS,
  getRazorpay,
  getPlanPrice,
  createCheckoutOrder,
  confirmCheckoutPayment,
  processRazorpayWebhook,
  markPaymentFailed,
  cancelSubscription,
  getBillingDashboard,
  getAdminBillingDashboard,
  expireOverdueSubscriptions,
};
