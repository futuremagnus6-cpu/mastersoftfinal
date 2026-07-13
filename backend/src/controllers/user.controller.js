const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { AppError } = require('../middleware/errorHandler');
const { scopeQuery } = require('../middleware/multiTenant');
const { getDefaultPermissions } = require('../middleware/rbac');

exports.getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, role, isActive, search } = req.query;
    const query = scopeQuery({}, req);
    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }
    const users = await User.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit));
    const total = await User.countDocuments(query);
    res.json({ success: true, data: users, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
};

exports.getUser = async (req, res, next) => {
  try {
    const query = scopeQuery({ _id: req.params.id }, req);
    const user = await User.findOne(query);
    if (!user) throw new AppError('User not found', 404);
    res.json({ success: true, data: user });
  } catch (error) { next(error); }
};

exports.createUser = async (req, res, next) => {
  try {
    const { name, email, phone, password, role, permissions } = req.body;
    const existing = await User.findOne({ email });
    if (existing) throw new AppError('Email already in use', 409);
    const user = await User.create({
      shopId: req.shopId, branchId: req.branchId, name, email, phone, password,
      role: role || 'staff', permissions: permissions || getDefaultPermissions(role || 'staff'),
      isVerified: true, createdBy: req.userId,
    });
    await AuditLog.create({ user: req.userId, action: 'create', resource: 'User', resourceId: user._id, description: `Created user: ${user.name}`, ip: req.ip });
    res.status(201).json({ success: true, message: 'User created', data: user });
  } catch (error) { next(error); }
};

exports.updateUser = async (req, res, next) => {
  try {
    const query = scopeQuery({ _id: req.params.id }, req);
    const user = await User.findOne(query);
    if (!user) throw new AppError('User not found', 404);
    ['name', 'phone', 'role', 'permissions', 'isActive', 'language', 'theme'].forEach(f => { if (req.body[f] !== undefined) user[f] = req.body[f]; });
    user.updatedBy = req.userId;
    await user.save();
    res.json({ success: true, message: 'User updated', data: user });
  } catch (error) { next(error); }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const query = scopeQuery({ _id: req.params.id }, req);
    const user = await User.findOne(query);
    if (!user) throw new AppError('User not found', 404);
    user.isActive = false; user.updatedBy = req.userId;
    await user.save();
    res.json({ success: true, message: 'User deactivated' });
  } catch (error) { next(error); }
};

exports.updatePermissions = async (req, res, next) => {
  try {
    const query = scopeQuery({ _id: req.params.id }, req);
    const user = await User.findOne(query);
    if (!user) throw new AppError('User not found', 404);
    user.permissions = req.body.permissions;
    user.updatedBy = req.userId;
    await user.save();
    res.json({ success: true, message: 'Permissions updated', data: user });
  } catch (error) { next(error); }
};
