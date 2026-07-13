const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const employeeController = require('../controllers/employee.controller');
const { authenticate } = require('../middleware/auth');
const { authorizePermission } = require('../middleware/rbac');
const { multiTenant } = require('../middleware/multiTenant');
const { requireFeature } = require('../middleware/featureCheck');
const {
  createEmployeeValidator,
  updateEmployeeValidator,
} = require('../validators/user.validators');

router.use(authenticate);
router.use(multiTenant);
router.use(requireFeature('employees'));

router.param('id', (req, res, next, val) => {
  if (!mongoose.Types.ObjectId.isValid(val)) {
    return res.status(400).json({ success: false, message: 'Invalid ID format', code: 'INVALID_ID' });
  }
  next();
});

router.route('/')
  .get(authorizePermission('employees', 'read'), employeeController.getEmployees)
  .post(authorizePermission('employees', 'create'), createEmployeeValidator, employeeController.createEmployee);

router.route('/:id')
  .get(authorizePermission('employees', 'read'), employeeController.getEmployee)
  .put(authorizePermission('employees', 'update'), updateEmployeeValidator, employeeController.updateEmployee)
  .delete(authorizePermission('employees', 'delete'), employeeController.deleteEmployee);

module.exports = router;
