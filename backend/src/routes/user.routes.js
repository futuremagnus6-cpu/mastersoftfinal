const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { multiTenant } = require('../middleware/multiTenant');
const {
  createUserValidator,
  updateUserValidator,
  updatePermissionsValidator,
} = require('../validators/user.validators');

router.use(authenticate);
router.use(multiTenant);

router.route('/')
  .get(authorize('shop_admin', 'manager'), userController.getUsers)
  .post(authorize('shop_admin'), createUserValidator, userController.createUser);

router.route('/:id')
  .get(authorize('shop_admin', 'manager'), userController.getUser)
  .put(authorize('shop_admin'), updateUserValidator, userController.updateUser)
  .delete(authorize('shop_admin'), userController.deleteUser);

router.put('/:id/permissions', authorize('shop_admin'), updatePermissionsValidator, userController.updatePermissions);

module.exports = router;
