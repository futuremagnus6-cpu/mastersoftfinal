const Order = require('../models/Order');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const InventoryLog = require('../models/InventoryLog');
const Notification = require('../models/Notification');
const { AppError } = require('../middleware/errorHandler');
const { scopeQuery } = require('../middleware/multiTenant');
const logger = require('../config/logger');
const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * Generate a guaranteed-unique order number.
 *
 * Format: MAG-YYYYMM-XXXXXXXX
 * The suffix is a cryptographically random hex string, which eliminates
 * ALL race conditions / counter-sync issues / duplicate collisions.
 */
const generateOrderNumber = async () => {
  const date = new Date();
  const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
  const suffix = crypto.randomUUID().replace(/-/g, '').substring(0, 8).toUpperCase();
  return `MAG-${yearMonth}-${suffix}`;
};

const generateInvoiceNumber = (orderNumber) => {
  return `INV-${orderNumber}`;
};

// @desc    Create order (POS)
// @route   POST /api/orders
exports.createOrder = async (req, res, next) => {
  try {
    const {
      customer, customerName, customerMobile, customerGstin, customerId,
      customers: reqCustomers,
      items, payments, notes, type, posMode, isOffline, offlineId,
    } = req.body;

    if (!items || items.length === 0) {
      throw new AppError('Order must have at least one item', 400);
    }

    // Calculate order
    let subtotal = 0, totalDiscount = 0, totalGst = 0;
    let totalCgst = 0, totalSgst = 0, totalIgst = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findOne(scopeQuery({ _id: item.productId || item.product }, req));
      if (!product) throw new AppError(`Product not found: ${item.productName || item.productId}`, 404);

      if (product.inventory.quantity < item.quantity && !isOffline) {
        throw new AppError(`Insufficient stock for ${product.name}. Available: ${product.inventory.quantity}`, 400);
      }

      const qty = item.quantity;
      const sellingPrice = item.sellingPrice || product.pricing.sellingPrice;
      const discountPercent = item.discountPercent || 0;
      const discountAmount = (sellingPrice * qty * discountPercent) / 100;
      const taxableAmount = (sellingPrice * qty) - discountAmount;
      const gstRate = product.pricing.gstRate;
      const gstAmount = product.pricing.gstInclusive
        ? (taxableAmount * gstRate) / (100 + gstRate)
        : (taxableAmount * gstRate) / 100;
      const sgst = gstAmount / 2;
      const cgst = gstAmount / 2;
      const total = taxableAmount;

      subtotal += sellingPrice * qty;
      totalDiscount += discountAmount;
      totalGst += gstAmount;
      totalCgst += cgst;
      totalSgst += sgst;

      orderItems.push({
        product: product._id,
        productName: product.name,
        sku: product.sku,
        barcode: product.barcode,
        hsnCode: product.tax.hsnCode,
        quantity: qty,
        mrp: product.pricing.mrp,
        sellingPrice,
        discountPercent,
        discountAmount,
        gstRate,
        gstAmount,
        cgst,
        sgst,
        igst: 0,
        taxableAmount,
        total,
        batchNumber: item.batchNumber,
        expDate: item.expDate,
      });

      // Deduct stock (only if online)
      if (!isOffline) {
        const prevStock = product.inventory.quantity;
        product.inventory.quantity = Math.max(0, prevStock - qty);
        product.updatedBy = req.userId;
        await product.save();

        await InventoryLog.create({
          shopId: req.shopId,
          branchId: req.branchId,
          product: product._id,
          type: 'sale',
          quantity: -qty,
          previousStock: prevStock,
          newStock: product.inventory.quantity,
          reference: 'POS Order',
          batchNumber: item.batchNumber,
          createdBy: req.userId,
        });
      }
    }

    const roundOff = Math.round((subtotal - totalDiscount + totalGst) * 100 - Math.floor((subtotal - totalDiscount + totalGst) * 100)) / 100;
    const grandTotal = Math.round((subtotal - totalDiscount + totalGst) * 100) / 100;

    // Calculate payments
    let paidAmount = 0;
    const orderPayments = (payments || []).map(p => {
      paidAmount += p.amount;
      return {
        method: p.method,
        amount: p.amount,
        upiApp: p.upiApp,
        upiTransactionId: p.upiTransactionId,
        transactionMethod: p.transactionMethod,
        transactionId: p.transactionId,
        cardReceiptNumber: p.cardReceiptNumber,
        companyOrderNumber: p.companyOrderNumber,
        companyOrderDate: p.companyOrderDate,
        companyNote: p.companyNote,
        reference: p.reference,
        status: 'completed',
      };
    });

    if (orderPayments.length === 0) {
      orderPayments.push({ method: 'cash', amount: grandTotal, status: 'completed' });
      paidAmount = grandTotal;
    }

    // ─── Resolve customer document (outside retry loop) ───
    let customerDoc = null;
    // customer from req.body is the customer's _id (string) sent by the frontend
    if (customer) {
      // If a customer _id was sent, fetch the full Mongoose document from DB
      customerDoc = await Customer.findOne(scopeQuery({ _id: customer }, req));
    }
    // If no customer _id but mobile was provided, look up or create by mobile
    if (!customerDoc && customerMobile) {
      customerDoc = await Customer.findOne(scopeQuery({ mobile: customerMobile }, req));
      if (!customerDoc && customerName) {
        customerDoc = await Customer.create({
          shopId: req.shopId,
          customerId: `CUST-${Date.now()}`,
          name: customerName,
          mobile: customerMobile,
          gstin: customerGstin,
          createdBy: req.userId,
        });
      }
    }

    // Build customers array
    const additionalCustomers = [];
    if (reqCustomers && reqCustomers.length > 0) {
      for (const c of reqCustomers) {
        additionalCustomers.push({
          name: c.name || '',
          customerId: c.customerId || '',
          phone: c.phone || '',
        });
      }
    }

    // Retry up to 5 times on any duplicate-key collision
    let order;
    let orderNumber;
    let invoiceNumber;
    const MAX_RETRIES = 5;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      orderNumber = await generateOrderNumber();
      invoiceNumber = generateInvoiceNumber(orderNumber);

      const paymentStatus = paidAmount >= grandTotal ? 'completed' : (paidAmount > 0 ? 'partial' : 'pending');

      try {
        order = await Order.create({
          shopId: req.shopId,
          branchId: req.branchId,
          orderNumber,
          invoiceNumber,
          customer: customerDoc?._id || null,
          customerName: customerDoc?.name || customerName || 'Walk-in',
          customerMobile: customerDoc?.mobile || customerMobile || '',
          customerGstin: customerGstin || customerDoc?.gstin || '',
          customerId: customerDoc?.customerId || customerId || '',
          customers: additionalCustomers.length > 0 ? additionalCustomers : undefined,
          type: type || 'retail',
          items: orderItems,
          subtotal,
          totalDiscount,
          totalGst,
          totalCgst,
          totalSgst,
          totalIgst: 0,
          grandTotal,
          roundOff,
          payments: orderPayments,
          paymentStatus,
          paidAmount,
          balanceDue: Math.max(0, grandTotal - paidAmount),
          isPartialPayment: paymentStatus === 'partial',
          posMode: posMode !== false,
          isOffline: isOffline || false,
          offlineId,
          syncStatus: isOffline ? 'pending' : 'synced',
          notes,
          gstInvoiceType: customerGstin ? 'b2b' : 'b2c',
          createdBy: req.userId,
        });
        // Success — break out of retry loop
        break;
      } catch (err) {
        // Duplicate key error (code 11000) — extremely rare with UUID order numbers,
        // but handle it gracefully just in case.
        if (err.code === 11000) {
          if (attempt < MAX_RETRIES - 1) {
            logger.warn(`Duplicate key collision (attempt ${attempt + 1}/${MAX_RETRIES}), generating new order number...`);
            continue;
          }
          // Last attempt failed — throw a cleaner error message
          throw new AppError('Failed to generate unique order number after multiple attempts. Please try again.', 500);
        }
        // Not a duplicate key error — rethrow immediately
        throw err;
      }
    }

    // Update customer stats (only if customerDoc is a real Mongoose document with .save())
    if (customerDoc && typeof customerDoc.save === 'function') {
      customerDoc.totalOrders += 1;
      customerDoc.totalSpent += grandTotal;
      customerDoc.totalPurchases += grandTotal;
      customerDoc.lastPurchaseDate = new Date();
      await customerDoc.save();
    }

    // Create notification
    await Notification.create({
      shopId: req.shopId,
      branchId: req.branchId,
      type: 'order_created',
      title: 'New Order',
      message: `Order ${orderNumber} created for ₹${grandTotal}`,
      channel: 'dashboard',
      createdBy: req.userId,
    });

    // Real-time update via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(`shop:${req.shopId}`).emit('order:created', order);
    }

    res.status(201).json({ success: true, message: 'Order created', data: order });
  } catch (error) {
    next(error);
  }
};

// @desc    Update order (customer details, payments, items)
// @route   PUT /api/orders/:id
exports.updateOrder = async (req, res, next) => {
  try {
    const query = scopeQuery({ _id: req.params.id }, req);
    const order = await Order.findOne(query);

    if (!order) throw new AppError('Order not found', 404);
    if (order.status === 'cancelled' || order.status === 'returned') {
      throw new AppError('Cannot update cancelled or returned order', 400);
    }

    const {
      customerName, customerMobile, customerGstin, customerId,
      customers, items, payments, notes,
    } = req.body;

    // Update customer details
    if (customerName !== undefined) order.customerName = customerName;
    if (customerMobile !== undefined) order.customerMobile = customerMobile;
    if (customerGstin !== undefined) order.customerGstin = customerGstin;
    if (customerId !== undefined) order.customerId = customerId;
    if (notes !== undefined) order.notes = notes;

    // Update multi-customers
    if (customers !== undefined) {
      order.customers = customers.map(c => ({
        name: c.name || '',
        customerId: c.customerId || '',
        phone: c.phone || '',
      }));
    }

    // Update items (recalculate totals)
    if (items !== undefined && items.length > 0) {
      let subtotal = 0, totalDiscount = 0, totalGst = 0;
      let totalCgst = 0, totalSgst = 0;
      const orderItems = [];

      for (const item of items) {
        const product = await Product.findOne(scopeQuery({ _id: item.productId || item.product }, req));
        if (!product) throw new AppError(`Product not found: ${item.productName || item.productId}`, 404);

        const qty = item.quantity;
        const sellingPrice = item.sellingPrice || product.pricing.sellingPrice;
        const discountPercent = item.discountPercent || 0;
        const discountAmount = (sellingPrice * qty * discountPercent) / 100;
        const taxableAmount = (sellingPrice * qty) - discountAmount;
        const gstRate = product.pricing.gstRate;
        const gstAmount = product.pricing.gstInclusive
          ? (taxableAmount * gstRate) / (100 + gstRate)
          : (taxableAmount * gstRate) / 100;

        subtotal += sellingPrice * qty;
        totalDiscount += discountAmount;
        totalGst += gstAmount;
        totalCgst += gstAmount / 2;
        totalSgst += gstAmount / 2;

        orderItems.push({
          product: product._id,
          productName: product.name,
          sku: product.sku,
          barcode: product.barcode,
          hsnCode: product.tax?.hsnCode,
          quantity: qty,
          mrp: product.pricing.mrp,
          sellingPrice,
          discountPercent,
          discountAmount,
          gstRate,
          gstAmount,
          cgst: gstAmount / 2,
          sgst: gstAmount / 2,
          igst: 0,
          taxableAmount,
          total: taxableAmount,
        });
      }

      order.items = orderItems;
      order.subtotal = subtotal;
      order.totalDiscount = totalDiscount;
      order.totalGst = totalGst;
      order.totalCgst = totalCgst;
      order.totalSgst = totalSgst;
      order.grandTotal = Math.round((subtotal - totalDiscount + totalGst) * 100) / 100;
    }

    // Update payments
    if (payments !== undefined) {
      let paidAmount = 0;
      order.payments = payments.map(p => {
        paidAmount += p.amount;
        return {
          method: p.method,
          amount: p.amount,
          upiApp: p.upiApp,
          upiTransactionId: p.upiTransactionId,
          transactionMethod: p.transactionMethod,
          transactionId: p.transactionId,
          cardReceiptNumber: p.cardReceiptNumber,
          companyOrderNumber: p.companyOrderNumber,
          companyOrderDate: p.companyOrderDate,
          companyNote: p.companyNote,
          reference: p.reference,
          status: 'completed',
        };
      });

      order.paidAmount = paidAmount;
      order.paymentStatus = paidAmount >= order.grandTotal ? 'completed' : (paidAmount > 0 ? 'partial' : 'pending');
      order.isPartialPayment = order.paymentStatus === 'partial';
    }

    order.updatedBy = req.userId;
    await order.save();

    res.json({ success: true, message: 'Order updated successfully', data: order });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all orders
// @route   GET /api/orders
exports.getOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, status, startDate, endDate, search } = req.query;
    const query = scopeQuery({}, req);

    if (status) query.status = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { customerMobile: { $regex: search, $options: 'i' } },
      ];
    }

    const orders = await Order.find(query)
      .populate('customer', 'name mobile customerId')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      data: orders,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single order
// @route   GET /api/orders/:id
exports.getOrder = async (req, res, next) => {
  try {
    const query = scopeQuery({ _id: req.params.id }, req);
    const order = await Order.findOne(query)
      .populate('customer', 'name mobile customerId')
      .populate('items.product', 'name sku barcode');

    if (!order) throw new AppError('Order not found', 404);
    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel order
// @route   PUT /api/orders/:id/cancel
exports.cancelOrder = async (req, res, next) => {
  try {
    const query = scopeQuery({ _id: req.params.id }, req);
    const order = await Order.findOne(query);

    if (!order) throw new AppError('Order not found', 404);
    if (order.status === 'cancelled') throw new AppError('Order already cancelled', 400);
    if (order.status === 'returned') throw new AppError('Cannot cancel returned order', 400);

    // Restore stock
    for (const item of order.items) {
      const product = await Product.findOne(scopeQuery({ _id: item.product }, req));
      if (product) {
        const prevStock = product.inventory.quantity;
        product.inventory.quantity += item.quantity;
        product.updatedBy = req.userId;
        await product.save();

        await InventoryLog.create({
          shopId: req.shopId,
          branchId: req.branchId,
          product: product._id,
          type: 'sale_return',
          quantity: item.quantity,
          previousStock: prevStock,
          newStock: product.inventory.quantity,
          reference: `Cancel: ${order.orderNumber}`,
          createdBy: req.userId,
        });
      }
    }

    order.status = 'cancelled';
    order.updatedBy = req.userId;
    await order.save();

    res.json({ success: true, message: 'Order cancelled', data: order });
  } catch (error) {
    next(error);
  }
};

// @desc    Get today's orders summary
// @route   GET /api/orders/today/summary
exports.getTodaySummary = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const query = scopeQuery({ createdAt: { $gte: today } }, req);

    const [orders, summary] = await Promise.all([
      Order.find(query).sort({ createdAt: -1 }).limit(50),
      Order.aggregate([
        { $match: query },
        { $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$grandTotal' },
          totalItems: { $sum: { $sum: '$items.quantity' } },
          avgOrderValue: { $avg: '$grandTotal' },
        }},
      ]),
    ]);

    res.json({
      success: true,
      data: {
        orders,
        summary: summary[0] || { totalOrders: 0, totalRevenue: 0, totalItems: 0, avgOrderValue: 0 },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate & download invoice PDF for an order
// @route   POST /api/orders/:id/generate-invoice
exports.generateInvoice = async (req, res, next) => {
  try {
    const { generateInvoice: genInvoice } = require('../utils/invoiceGenerator');

    const order = await Order.findOne(scopeQuery({ _id: req.params.id }, req))
      .populate('customer', 'name mobile email gstin address')
      .lean();

    if (!order) throw new AppError('Order not found', 404);

    // Fetch shop details for branding
    const Shop = require('../models/Shop');
    const shop = await Shop.findById(req.shopId).lean();
    if (!shop) throw new AppError('Shop not found', 404);

    const invoice = await genInvoice({
      shop: {
        name: shop.name,
        gstin: shop.gstin,
        pan: shop.pan,
        address: shop.address || {},
        contact: shop.contact || {},
      },
      order,
      customer: order.customer || {},
    });

    res.json({
      success: true,
      message: 'Invoice generated successfully',
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Sync offline orders
// @route   POST /api/orders/sync-offline
exports.syncOfflineOrders = async (req, res, next) => {
  try {
    const { orders } = req.body;
    if (!orders || !Array.isArray(orders)) throw new AppError('Orders array required', 400);

    const results = [];
    for (const offlineOrder of orders) {
      try {
        // Check for conflict
        const existing = await Order.findOne({ shopId: req.shopId, offlineId: offlineOrder.offlineId });
        if (existing) {
          results.push({ offlineId: offlineOrder.offlineId, status: 'conflict', existingOrder: existing.orderNumber });
          continue;
        }

        req.body = offlineOrder;
        req.body.posMode = true;
        req.body.isOffline = true;
        req.body.syncStatus = 'synced';

        // Use a modified version of createOrder logic
        const order = await Order.create({
          ...offlineOrder,
          shopId: req.shopId,
          branchId: req.branchId,
          syncStatus: 'synced',
          createdBy: req.userId,
        });

        results.push({ offlineId: offlineOrder.offlineId, status: 'synced', orderNumber: order.orderNumber });
      } catch (err) {
        results.push({ offlineId: offlineOrder.offlineId, status: 'failed', error: err.message });
      }
    }

    res.json({ success: true, message: 'Sync completed', data: results });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
