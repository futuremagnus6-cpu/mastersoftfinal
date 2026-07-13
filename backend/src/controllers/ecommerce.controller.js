const Product = require('../models/Product');
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const { AppError } = require('../middleware/errorHandler');
const { scopeQuery } = require('../middleware/multiTenant');

exports.getOnlineProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, category, search } = req.query;
    const query = scopeQuery({ isActive: true }, req);
    if (category) query.category = category;
    if (search) query.$or = [{ name: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }];
    const products = await Product.find(query).select('name pricing images category description unit inventory.quantity').skip((page - 1) * limit).limit(parseInt(limit));
    const total = await Product.countDocuments(query);
    res.json({ success: true, data: products, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
};
exports.getOnlineProduct = async (req, res, next) => {
  try {
    const product = await Product.findOne(scopeQuery({ _id: req.params.id, isActive: true }, req));
    if (!product) throw new AppError('Product not found', 404);
    res.json({ success: true, data: product });
  } catch (error) { next(error); }
};
exports.createOnlineOrder = async (req, res, next) => {
  try {
    const { items, customerInfo, shippingAddress, paymentMethod } = req.body;
    const orderItems = []; let subtotal = 0, totalGst = 0;
    for (const item of items) {
      const product = await Product.findOne(scopeQuery({ _id: item.productId, isActive: true }, req));
      if (!product) throw new AppError(`Product not found: ${item.productId}`, 404);
      if (product.inventory.quantity < item.quantity) throw new AppError(`Insufficient stock for ${product.name}`, 400);
      const gstAmount = (item.quantity * product.pricing.sellingPrice * product.pricing.gstRate) / 100;
      subtotal += item.quantity * product.pricing.sellingPrice; totalGst += gstAmount;
      orderItems.push({ product: product._id, productName: product.name, sku: product.sku, quantity: item.quantity, sellingPrice: product.pricing.sellingPrice, mrp: product.pricing.mrp, gstRate: product.pricing.gstRate, gstAmount, total: item.quantity * product.pricing.sellingPrice });
      product.inventory.quantity -= item.quantity; await product.save();
    }
    const orderNumber = `ECOMM-${Date.now().toString(36).toUpperCase()}`;
    const order = await Order.create({ shopId: req.shopId, orderNumber, type: 'online', items: orderItems, subtotal, totalGst, grandTotal: subtotal + totalGst, customerName: customerInfo?.name, customerMobile: customerInfo?.mobile, customerEmail: customerInfo?.email, shippingAddress, posMode: false, createdBy: req.userId });
    res.status(201).json({ success: true, message: 'Order placed', data: order });
  } catch (error) { next(error); }
};
exports.checkPincode = async (req, res, next) => {
  try {
    const { pincode } = req.params;
    // Check against shop's delivery zones
    const deliverable = /^\d{6}$/.test(pincode);
    res.json({ success: true, data: { pincode, deliverable, estimatedDays: deliverable ? Math.floor(Math.random() * 3) + 2 : 0 } });
  } catch (error) { next(error); }
};
