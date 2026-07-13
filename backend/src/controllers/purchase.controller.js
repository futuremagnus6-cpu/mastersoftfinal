const Purchase = require('../models/Purchase');
const Product = require('../models/Product');
const InventoryLog = require('../models/InventoryLog');
const { AppError } = require('../middleware/errorHandler');
const { scopeQuery } = require('../middleware/multiTenant');

exports.getPurchases = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, status, supplier } = req.query;
    const query = scopeQuery({}, req);
    if (status) query.status = status;
    if (supplier) query.supplier = supplier;
    const purchases = await Purchase.find(query).populate('supplier', 'name company').populate('items.product', 'name sku').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit));
    const total = await Purchase.countDocuments(query);
    res.json({ success: true, data: purchases, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
};

exports.getPurchase = async (req, res, next) => {
  try {
    const purchase = await Purchase.findOne(scopeQuery({ _id: req.params.id }, req)).populate('supplier').populate('items.product');
    if (!purchase) throw new AppError('Purchase not found', 404);
    res.json({ success: true, data: purchase });
  } catch (error) { next(error); }
};

exports.createPurchase = async (req, res, next) => {
  try {
    const { supplier, items, invoiceNumber, invoiceDate, shippingCharges, notes, paymentDueDate } = req.body;
    let subtotal = 0, totalGst = 0, totalDiscount = 0;
    const purchaseItems = [];
    for (const item of items) {
      const product = await Product.findOne(scopeQuery({ _id: item.productId || item.product }, req));
      if (!product) throw new AppError(`Product not found: ${item.productName}`, 404);
      const total = item.quantity * item.unitPrice;
      const gstAmount = total * (item.gstRate || product.pricing.gstRate || 0) / 100;
      subtotal += total;
      totalGst += gstAmount;
      purchaseItems.push({ product: product._id, productName: product.name, sku: product.sku, quantity: item.quantity, unitPrice: item.unitPrice, mrp: item.mrp || product.pricing.mrp, sellingPrice: item.sellingPrice || product.pricing.sellingPrice, gstRate: item.gstRate || product.pricing.gstRate, gstAmount, total, batchNumber: item.batchNumber, mfgDate: item.mfgDate, expDate: item.expDate });
    }
    const purchaseOrderNumber = `PO-${Date.now().toString(36).toUpperCase()}`;
    const grandTotal = subtotal + totalGst + (shippingCharges || 0) - totalDiscount;
    const purchase = await Purchase.create({ shopId: req.shopId, branchId: req.branchId, purchaseOrderNumber, supplier, invoiceNumber, invoiceDate, items: purchaseItems, subtotal, totalGst, totalDiscount, shippingCharges: shippingCharges || 0, grandTotal, paymentDueDate, notes, createdBy: req.userId });
    res.status(201).json({ success: true, message: 'Purchase order created', data: purchase });
  } catch (error) { next(error); }
};

exports.receivePurchase = async (req, res, next) => {
  try {
    const purchase = await Purchase.findOne(scopeQuery({ _id: req.params.id }, req));
    if (!purchase) throw new AppError('Purchase not found', 404);
    if (purchase.status === 'received' || purchase.status === 'cancelled') throw new AppError('Purchase already received/cancelled', 400);
    for (const item of purchase.items) {
      const product = await Product.findOne(scopeQuery({ _id: item.product }, req));
      if (product) {
        const prevStock = product.inventory.quantity;
        const qty = item.receivedQuantity || item.quantity;
        product.inventory.quantity += qty;
        if (item.batchNumber) { product.batches.push({ batchNumber: item.batchNumber, quantity: qty, mfgDate: item.mfgDate, expDate: item.expDate, purchasePrice: item.unitPrice, sellingPrice: item.sellingPrice }); }
        product.updatedBy = req.userId;
        await product.save();
        await InventoryLog.create({ shopId: req.shopId, product: product._id, type: 'purchase', quantity: qty, previousStock: prevStock, newStock: product.inventory.quantity, reference: `PO: ${purchase.purchaseOrderNumber}`, batchNumber: item.batchNumber, createdBy: req.userId });
      }
    }
    purchase.status = 'received';
    purchase.grnNumber = `GRN-${Date.now().toString(36).toUpperCase()}`;
    purchase.grnDate = new Date();
    purchase.updatedBy = req.userId;
    await purchase.save();
    res.json({ success: true, message: 'Purchase received, stock updated', data: purchase });
  } catch (error) { next(error); }
};

exports.updatePurchase = async (req, res, next) => {
  try {
    const purchase = await Purchase.findOne(scopeQuery({ _id: req.params.id }, req));
    if (!purchase) throw new AppError('Purchase not found', 404);
    if (purchase.status !== 'draft') throw new AppError('Cannot modify non-draft purchase', 400);
    Object.assign(purchase, req.body);
    purchase.updatedBy = req.userId;
    await purchase.save();
    res.json({ success: true, message: 'Purchase updated', data: purchase });
  } catch (error) { next(error); }
};
