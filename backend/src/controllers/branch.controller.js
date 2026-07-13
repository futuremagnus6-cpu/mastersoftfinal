const Branch = require('../models/Branch');
const { AppError } = require('../middleware/errorHandler');
const { scopeQuery } = require('../middleware/multiTenant');

exports.getBranches = async (req, res, next) => {
  try {
    const branches = await Branch.find(scopeQuery({}, req)).sort({ isHeadOffice: -1, name: 1 });
    res.json({ success: true, data: branches });
  } catch (error) { next(error); }
};
exports.getBranch = async (req, res, next) => {
  try {
    const branch = await Branch.findOne(scopeQuery({ _id: req.params.id }, req));
    if (!branch) throw new AppError('Branch not found', 404);
    res.json({ success: true, data: branch });
  } catch (error) { next(error); }
};
exports.createBranch = async (req, res, next) => {
  try {
    const branch = await Branch.create({ ...req.body, shopId: req.shopId, createdBy: req.userId });
    res.status(201).json({ success: true, message: 'Branch created', data: branch });
  } catch (error) { next(error); }
};
exports.updateBranch = async (req, res, next) => {
  try {
    const branch = await Branch.findOne(scopeQuery({ _id: req.params.id }, req));
    if (!branch) throw new AppError('Branch not found', 404);
    Object.assign(branch, req.body); branch.updatedBy = req.userId;
    await branch.save();
    res.json({ success: true, message: 'Branch updated', data: branch });
  } catch (error) { next(error); }
};
exports.deleteBranch = async (req, res, next) => {
  try {
    const branch = await Branch.findOne(scopeQuery({ _id: req.params.id }, req));
    if (!branch) throw new AppError('Branch not found', 404);
    branch.isActive = false; branch.updatedBy = req.userId;
    await branch.save();
    res.json({ success: true, message: 'Branch deactivated' });
  } catch (error) { next(error); }
};
