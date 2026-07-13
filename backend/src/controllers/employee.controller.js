const Employee = require('../models/Employee');
const User = require('../models/User');
const Shop = require('../models/Shop');
const { AppError } = require('../middleware/errorHandler');
const { scopeQuery } = require('../middleware/multiTenant');
const { getDefaultPermissions } = require('../middleware/rbac');
const logger = require('../config/logger');
const emailService = require('../services/emailService');

/**
 * Create or update a User account for an employee.
 */
const syncEmployeeUser = async (employee, body, req) => {
  const { hasLogin, loginEmail, password, userRole, name, mobile, priority } = body;

  // If hasLogin is false and there's an existing user, deactivate it
  if (!hasLogin && employee.userId) {
    await User.findByIdAndUpdate(employee.userId, { isActive: false });
    employee.hasLogin = false;
    employee.userId = null;
    return;
  }

  // If hasLogin is true but no email provided, skip
  if (hasLogin && !loginEmail) {
    logger.warn(`Cannot create login for employee ${employee.name}: no email provided`);
    return;
  }

  if (hasLogin && loginEmail) {
    const finalEmail = loginEmail.toLowerCase().trim();
    const finalRole = userRole || 'staff';
    const loginPassword = password || 'Employee@123';

    // Check for duplicate email across all users (except the current one)
    const dupUser = await User.findOne({
      email: finalEmail,
      _id: { $ne: employee.userId || undefined },
    });
    if (dupUser) {
      throw new AppError(`Email ${finalEmail} is already in use by another user`, 400);
    }

    if (employee.userId) {
      // Update existing user
      const existingUser = await User.findById(employee.userId);
      if (existingUser) {
        existingUser.name = name || existingUser.name;
        existingUser.email = finalEmail;
        existingUser.phone = mobile || existingUser.phone;
        existingUser.role = finalRole;
        existingUser.isActive = true;
        existingUser.shopId = req.shopId;
        existingUser.branchId = req.branchId || existingUser.branchId;
        if (password) existingUser.password = password;
        await existingUser.save();
        employee.loginEmail = finalEmail;
        employee.userRole = finalRole;
        return;
      }
    }

    // Create new user
    const newUser = await User.create({
      shopId: req.shopId,
      branchId: req.branchId,
      name: name || employee.name,
      email: finalEmail,
      phone: mobile || employee.mobile,
      password: loginPassword,
      role: finalRole,
      permissions: getDefaultPermissions(finalRole),
      isActive: true,
      isVerified: true,
      createdBy: req.userId,
    });

    employee.userId = newUser._id;
    employee.loginEmail = finalEmail;
    employee.userRole = finalRole;
    employee.hasLogin = true;
  }
};

exports.getEmployees = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, department, isActive, search } = req.query;
    const query = scopeQuery({}, req);
    if (department) query.department = department;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) query.$or = [{ name: { $regex: search, $options: 'i' } }, { employeeCode: { $regex: search, $options: 'i' } }, { mobile: { $regex: search, $options: 'i' } }];
    const employees = await Employee.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit));
    const total = await Employee.countDocuments(query);
    res.json({ success: true, data: employees, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
};
exports.getEmployee = async (req, res, next) => {
  try {
    const employee = await Employee.findOne(scopeQuery({ _id: req.params.id }, req));
    if (!employee) throw new AppError('Employee not found', 404);
    res.json({ success: true, data: employee });
  } catch (error) { next(error); }
};
exports.createEmployee = async (req, res, next) => {
  try {
    const employeeCode = `EMP-${Date.now().toString(36).toUpperCase()}`;
    const employee = await Employee.create({
      ...req.body,
      employeeCode,
      shopId: req.shopId,
      branchId: req.branchId,
      createdBy: req.userId,
    });

    // Create user account if requested
    if (req.body.hasLogin) {
      await syncEmployeeUser(employee, req.body, req);
      await employee.save();

      // Send credentials email to the employee
      try {
        const shop = await Shop.findById(req.shopId);
        const password = req.body.password || 'Employee@123';
        const role = req.body.userRole || 'staff';
        await emailService.sendEmployeeCredentialsEmail(
          req.body.loginEmail,
          req.body.name || employee.name,
          shop?.name || 'Your Shop',
          req.body.loginEmail,
          password,
          role
        );
      } catch (emailError) {
        logger.warn(`Failed to send employee credentials email: ${emailError.message}`);
      }
    }

    res.status(201).json({ success: true, message: 'Employee created', data: employee });
  } catch (error) { next(error); }
};
exports.updateEmployee = async (req, res, next) => {
  try {
    const employee = await Employee.findOne(scopeQuery({ _id: req.params.id }, req));
    if (!employee) throw new AppError('Employee not found', 404);
    ['name', 'mobile', 'email', 'department', 'designation', 'salary', 'bankDetails', 'address', 'documents', 'isActive', 'notes', 'priority', 'hasLogin', 'loginEmail', 'userRole'].forEach(f => {
      if (req.body[f] !== undefined) employee[f] = req.body[f];
    });

    // Sync user account if login info changed
    if (req.body.hasLogin !== undefined || req.body.loginEmail || req.body.password) {
      await syncEmployeeUser(employee, { ...employee.toObject(), ...req.body }, req);
    }

    employee.updatedBy = req.userId;
    await employee.save();
    res.json({ success: true, message: 'Employee updated', data: employee });
  } catch (error) { next(error); }
};
exports.deleteEmployee = async (req, res, next) => {
  try {
    const employee = await Employee.findOne(scopeQuery({ _id: req.params.id }, req));
    if (!employee) throw new AppError('Employee not found', 404);

    // Also deactivate the associated user account
    if (employee.userId) {
      await User.findByIdAndUpdate(employee.userId, { isActive: false });
    }

    employee.isActive = false;
    employee.lastWorkingDate = new Date();
    employee.updatedBy = req.userId;
    await employee.save();
    res.json({ success: true, message: 'Employee deactivated' });
  } catch (error) { next(error); }
};
