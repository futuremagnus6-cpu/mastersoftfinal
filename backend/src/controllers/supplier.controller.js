const Supplier = require('../models/Supplier');
const Purchase = require('../models/Purchase');
const { AppError } = require('../middleware/errorHandler');
const { scopeQuery } = require('../middleware/multiTenant');

exports.getSuppliers = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search, isActive } = req.query;
    const query = scopeQuery({}, req);
    if (search) query.$or = [{ name: { $regex: search, $options: 'i' } }, { company: { $regex: search, $options: 'i' } }, { mobile: { $regex: search, $options: 'i' } }];
    if (isActive !== undefined) query.isActive = isActive === 'true';
    const suppliers = await Supplier.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit));
    const total = await Supplier.countDocuments(query);
    res.json({ success: true, data: suppliers, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
};

exports.getSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findOne(scopeQuery({ _id: req.params.id }, req));
    if (!supplier) throw new AppError('Supplier not found', 404);
    const purchases = await Purchase.find(scopeQuery({ supplier: supplier._id }, req)).sort({ createdAt: -1 }).limit(20);
    res.json({ success: true, data: { ...supplier.toJSON(), purchases } });
  } catch (error) { next(error); }
};

exports.createSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.create({ ...req.body, shopId: req.shopId, branchId: req.branchId, createdBy: req.userId });
    res.status(201).json({ success: true, message: 'Supplier created', data: supplier });
  } catch (error) { next(error); }
};

exports.updateSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findOne(scopeQuery({ _id: req.params.id }, req));
    if (!supplier) throw new AppError('Supplier not found', 404);
    ['name', 'company', 'mobile', 'email', 'gstin', 'pan', 'bankDetails', 'address', 'creditLimit', 'paymentTerms', 'leadTime', 'notes'].forEach(f => { if (req.body[f] !== undefined) supplier[f] = req.body[f]; });
    supplier.updatedBy = req.userId;
    await supplier.save();
    res.json({ success: true, message: 'Supplier updated', data: supplier });
  } catch (error) { next(error); }
};

exports.deleteSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findOne(scopeQuery({ _id: req.params.id }, req));
    if (!supplier) throw new AppError('Supplier not found', 404);
    supplier.isActive = false; supplier.updatedBy = req.userId;
    await supplier.save();
    res.json({ success: true, message: 'Supplier deactivated' });
  } catch (error) { next(error); }
};
