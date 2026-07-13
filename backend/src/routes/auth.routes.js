const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');
const {
  loginValidator,
  registerValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  verify2faValidator,
  refreshTokenValidator,
  changePasswordValidator,
  updateProfileValidator,
  enable2faValidator,
  disable2faValidator,
} = require('../validators/auth.validators');

// Public routes
router.post('/register', registerValidator, authController.register);
router.post('/login', loginValidator, authController.login);
router.post('/verify-2fa', verify2faValidator, authController.verify2FA);
router.post('/refresh-token', refreshTokenValidator, authController.refreshToken);
router.post('/forgot-password', forgotPasswordValidator, authController.forgotPassword);
router.post('/reset-password', resetPasswordValidator, authController.resetPassword);

// Protected routes
router.get('/me', authenticate, authController.getMe);
router.put('/profile', authenticate, updateProfileValidator, authController.updateProfile);
router.put('/change-password', authenticate, changePasswordValidator, authController.changePassword);
router.post('/logout', authenticate, authController.logout);
router.post('/setup-2fa', authenticate, authController.setup2FA);
router.post('/enable-2fa', authenticate, enable2faValidator, authController.enable2FA);
router.post('/disable-2fa', authenticate, disable2faValidator, authController.disable2FA);

module.exports = router;
