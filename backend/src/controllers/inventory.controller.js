const Product = require('../models/Product');
const InventoryLog = require('../models/InventoryLog');
const StockTransfer = require('../models/StockTransfer');
const { AppError } = require('../middleware/errorHandler');
const { scopeQuery } = require('../middleware/multiTenant');

exports.getInventoryLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, type, productId, startDate, endDate } = req.query;
    const query = scopeQuery({}, req);
    if (type) query.type = type;
    if (productId) query.product = productId;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    const logs = await InventoryLog.find(query).populate('product', 'name sku barcode').populate('createdBy', 'name').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit));
    const total = await InventoryLog.countDocuments(query);
    res.json({ success: true, data: logs, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
};

exports.getStockSummary = async (req, res, next) => {
  try {
    const query = scopeQuery({ isActive: true }, req);
    const [totalProducts, totalStock, lowStock, outOfStock, totalValue] = await Promise.all([
      Product.countDocuments(query),
      Product.aggregate([{ $match: query }, { $group: { _id: null, total: { $sum: '$inventory.quantity' } } }]),
      Product.countDocuments({ ...query, $expr: { $and: [{ $lte: ['$inventory.quantity', '$inventory.minStockLevel'] }, { $gt: ['$inventory.quantity', 0] }] } }),
      Product.countDocuments({ ...query, 'inventory.quantity': { $lte: 0 } }),
      Product.aggregate([{ $match: query }, { $group: { _id: null, total: { $sum: { $multiply: ['$inventory.quantity', '$pricing.purchasePrice'] } } } }]),
    ]);
    res.json({ success: true, data: { totalProducts, totalStock: totalStock[0]?.total || 0, lowStock, outOfStock, totalValue: totalValue[0]?.total || 0 } });
  } catch (error) { next(error); }
};

exports.getExpiringProducts = async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + parseInt(days));
    const query = scopeQuery({ 'batches.0': { $exists: true }, 'batches.expDate': { $lte: expiryDate, $gte: new Date() } }, req);
    const products = await Product.find(query, { name: 1, sku: 1, batches: 1 });
    res.json({ success: true, data: products });
  } catch (error) { next(error); }
};

exports.createStockTransfer = async (req, res, next) => {
  try {
    const { fromBranch, toBranch, items, notes } = req.body;
    const transferNumber = `ST-${Date.now().toString(36).toUpperCase()}`;
    const transfer = await StockTransfer.create({ shopId: req.shopId, transferNumber, fromBranch, toBranch, items, notes, createdBy: req.userId, branchId: req.branchId });
    res.status(201).json({ success: true, message: 'Stock transfer created', data: transfer });
  } catch (error) { next(error); }
};

exports.getStockTransfers = async (req, res, next) => {
  try {
    const query = scopeQuery({}, req);
    const transfers = await StockTransfer.find(query).populate('fromBranch', 'name').populate('toBranch', 'name').populate('items.product', 'name sku').sort({ createdAt: -1 });
    res.json({ success: true, data: transfers });
  } catch (error) { next(error); }
};

exports.receiveTransfer = async (req, res, next) => {
  try {
    const transfer = await StockTransfer.findOne(scopeQuery({ _id: req.params.id }, req));
    if (!transfer) throw new AppError('Transfer not found', 404);
    if (transfer.status !== 'in_transit') throw new AppError('Transfer is not in transit', 400);
    for (const item of transfer.items) {
      const product = await Product.findOne(scopeQuery({ _id: item.product }, req));
      if (product) {
        const prevStock = product.inventory.quantity;
        product.inventory.quantity += item.quantity;
        product.updatedBy = req.userId;
        await product.save();
        await InventoryLog.create({ shopId: req.shopId, product: product._id, type: 'stock_transfer_in', quantity: item.quantity, previousStock: prevStock, newStock: product.inventory.quantity, reference: `Transfer: ${transfer.transferNumber}`, createdBy: req.userId });
      }
    }
    transfer.status = 'received';
    transfer.receivedDate = new Date();
    transfer.updatedBy = req.userId;
    await transfer.save();
    res.json({ success: true, message: 'Transfer received', data: transfer });
  } catch (error) { next(error); }
};
