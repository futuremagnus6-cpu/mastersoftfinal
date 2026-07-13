const BillingTransaction = require('../models/BillingTransaction');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const { AppError } = require('../middleware/errorHandler');
const billingService = require('../services/billingService');

const withPrices = (plan) => {
  const plain = typeof plan.toObject === 'function' ? plan.toObject() : plan;
  return {
    ...plain,
    price1Month: billingService.getPlanPrice(plan, 1),
    price6Months: billingService.getPlanPrice(plan, 6),
    price12Months: billingService.getPlanPrice(plan, 12),
    savings6Months: Math.round(((plan.monthlyPrice * 6) - billingService.getPlanPrice(plan, 6)) / (plan.monthlyPrice * 6 || 1) * 100),
    savings12Months: Math.round(((plan.monthlyPrice * 12) - billingService.getPlanPrice(plan, 12)) / (plan.monthlyPrice * 12 || 1) * 100),
  };
};

exports.createOrder = async (req, res, next) => {
  try {
    const shopId = req.shopId || req.user?.shopId || req.body.shopId;
    if (!shopId) throw new AppError('Shop context is required', 400);

    const result = await billingService.createCheckoutOrder({
      shopId,
      planId: req.body.planId,
      duration: req.body.duration,
      userId: req.userId || req.user?._id,
      requestedAction: req.body.action,
      idempotencyKey: req.get('Idempotency-Key'),
    });

    res.status(result.reused ? 200 : 201).json({
      success: true,
      data: {
        orderId: result.order.id,
        amount: result.order.amount,
        currency: result.order.currency,
        keyId: require('../config').razorpay.keyId,
        transactionId: result.transaction._id,
        invoiceNumber: result.transaction.invoiceNumber,
        shopName: result.shop.name,
        shopEmail: result.shop.contact?.email,
        planName: result.plan.name,
        planPrice: result.transaction.amount,
        duration: result.transaction.billingCycleMonths,
        reused: result.reused,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new AppError('Missing payment verification fields', 400);
    }

    const transaction = await billingService.confirmCheckoutPayment({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    res.json({
      success: true,
      message: 'Payment verified and subscription activated.',
      data: { transaction },
    });
  } catch (error) {
    next(error);
  }
};

exports.razorpayWebhook = async (req, res, next) => {
  try {
    const event = await billingService.processRazorpayWebhook({
      rawBody: req.body,
      signature: req.get('x-razorpay-signature'),
    });
    res.json({ success: true, status: event.status });
  } catch (error) {
    next(error);
  }
};

exports.extendSubscription = async (req, res, next) => {
  req.body.action = 'renewal';
  return exports.createOrder(req, res, next);
};

exports.cancelSubscription = async (req, res, next) => {
  try {
    const subscription = await billingService.cancelSubscription(req.shopId || req.user?.shopId, {
      immediate: req.body.immediate === true,
    });
    res.json({ success: true, message: 'Subscription cancellation updated.', data: subscription });
  } catch (error) {
    next(error);
  }
};

exports.getPaymentTransactions = async (req, res, next) => {
  try {
    const shopId = req.shopId || req.user?.shopId;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const query = { shopId };
    if (req.query.status) query.status = req.query.status;

    const [transactions, total] = await Promise.all([
      BillingTransaction.find(query)
        .populate('plan', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      BillingTransaction.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        transactions: transactions.map(t => ({
          _id: t._id,
          paymentId: t.razorpayPaymentId,
          orderId: t.razorpayOrderId,
          amount: t.amountPaid || t.amount,
          planName: t.plan?.name || 'Subscription',
          invoiceNumber: t.invoiceNumber,
          invoiceUrl: t.invoiceUrl,
          duration: t.billingCycleMonths,
          type: t.type,
          paidAt: t.paidAt || t.createdAt,
          status: t.status,
          failureReason: t.failureReason,
        })),
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getSubscription = async (req, res, next) => {
  try {
    const shopId = req.shopId || req.user?.shopId;
    const [dashboard, availablePlans] = await Promise.all([
      billingService.getBillingDashboard(shopId),
      SubscriptionPlan.find({ isActive: true }).sort({ sortOrder: 1, monthlyPrice: 1 }),
    ]);

    res.json({
      success: true,
      data: {
        ...dashboard,
        availablePlans: availablePlans.map(withPrices),
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getInvoice = async (req, res, next) => {
  try {
    const tx = await BillingTransaction.findOne({
      _id: req.params.id,
      shopId: req.shopId || req.user?.shopId,
    }).populate('plan', 'name').lean();
    if (!tx) throw new AppError('Invoice not found', 404);
    res.json({
      success: true,
      data: {
        invoiceNumber: tx.invoiceNumber,
        invoiceUrl: tx.invoiceUrl,
        amount: tx.amountPaid || tx.amount,
        currency: tx.currency,
        status: tx.status,
        planName: tx.plan?.name,
        periodStart: tx.periodStart,
        periodEnd: tx.periodEnd,
        paymentId: tx.razorpayPaymentId,
        paidAt: tx.paidAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getAdminBilling = async (req, res, next) => {
  try {
    const data = await billingService.getAdminBillingDashboard(req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
