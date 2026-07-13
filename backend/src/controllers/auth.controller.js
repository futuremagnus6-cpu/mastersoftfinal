const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Shop = require('../models/Shop');
const AuditLog = require('../models/AuditLog');
const config = require('../config');
const logger = require('../config/logger');
const { AppError } = require('../middleware/errorHandler');
const { getDefaultPermissions } = require('../middleware/rbac');
const { validationResult } = require('express-validator');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');

const generateTokens = (userId, role) => {
  const token = jwt.sign({ id: userId, role }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });

  const refreshToken = jwt.sign({ id: userId, role }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });

  return { token, refreshToken };
};

const sanitizeUser = (user) => {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    permissions: user.permissions,
    shopId: user.shopId?._id || user.shopId,
    branchId: user.branchId?._id || user.branchId,
    isActive: user.isActive,
    isVerified: user.isVerified,
    twoFactorEnabled: user.twoFactorEnabled,
    language: user.language,
    theme: user.theme,
    profileImage: user.profileImage,
    lastLogin: user.lastLogin,
    createdAt: user.createdAt,
  };
};

// @desc    Register a new user
// @route   POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, email, phone, password, role, shopId, branchId } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError('Email already registered', 409);
    }

    const user = new User({
      name,
      email,
      phone,
      password,
      role: role || 'staff',
      shopId: shopId || null,
      branchId: branchId || null,
      permissions: getDefaultPermissions(role || 'staff'),
      isVerified: true,
    });

    await user.save();

    const { token, refreshToken } = generateTokens(user._id, user.role);
    user.refreshToken = refreshToken;
    await user.save();

    // Create audit log
    await AuditLog.create({
      user: user._id,
      action: 'create',
      resource: 'User',
      resourceId: user._id,
      description: `User ${user.name} registered`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      refreshToken,
      user: sanitizeUser(user),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password +twoFactorSecret +loginAttempts +lockUntil');
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    if (user.isLocked()) {
      throw new AppError('Account is locked. Try again after 7 minutes.', 423);
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      await user.incrementLoginAttempts();
      throw new AppError(`Invalid email or password. ${5 - user.loginAttempts} attempts remaining.`, 401);
    }

    await user.resetLoginAttempts();

    // Check 2FA
    if (user.twoFactorEnabled) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      user.otp = crypto.createHash('sha256').update(otp).digest('hex');
      user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
      await user.save();

      // Send OTP via email
      try {
        const { sendEmail } = require('../services/emailService');
        await sendEmail(
          email,
          `Your 2FA Verification Code - FutureMagnus`,
          `<div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
            <div style="background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 18px;">Two-Factor Authentication</h1>
            </div>
            <div style="background: #f9fafb; padding: 32px 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 16px 0; color: #374151;">Your verification code is:</p>
              <div style="background: #eff6ff; border: 2px dashed #93c5fd; border-radius: 8px; padding: 16px; text-align: center; margin: 16px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1d4ed8;">${otp}</span>
              </div>
              <p style="margin: 16px 0 0 0; font-size: 13px; color: #6b7280;">This code expires in 10 minutes. Do not share this code with anyone.</p>
              <p style="margin: 8px 0 0 0; font-size: 12px; color: #9ca3af;">If you didn't request this code, please ignore this email.</p>
            </div>
          </div>`
        );
      } catch (emailErr) {
        logger.warn(`Failed to send 2FA OTP email to ${email}: ${emailErr.message}`);
      }
      logger.info(`2FA OTP for ${email}: ${otp}`);

      return res.json({
        success: true,
        message: '2FA required. Please verify OTP.',
        requiresTwoFactor: true,
        tempToken: jwt.sign({ id: user._id, otpRequired: true }, config.jwt.secret, { expiresIn: '5m' }),
      });
    }

    const { token, refreshToken } = generateTokens(user._id, user.role);
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    user.lastLoginIp = req.ip;
    await user.save();

    await AuditLog.create({
      user: user._id,
      action: 'login',
      resource: 'User',
      resourceId: user._id,
      description: `User ${user.email} logged in from ${req.ip}`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });

    // Fetch shop features for feature-based access control
    let shopFeatures = null;
    if (user.shopId) {
      const shopId = user.shopId?._id || user.shopId;
      const shop = await Shop.findById(shopId).select('features subscription.status');
      if (shop) {
        shopFeatures = {
          features: shop.features,
          subscriptionStatus: shop.subscription?.status || 'trial',
        };
      }
    }

    res.json({
      success: true,
      message: 'Login successful',
      token,
      refreshToken,
      user: sanitizeUser(user),
      shopFeatures,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify 2FA OTP
// @route   POST /api/auth/verify-2fa
exports.verify2FA = async (req, res, next) => {
  try {
    const { tempToken, otp } = req.body;
    if (!tempToken || !otp) {
      throw new AppError('Temp token and OTP are required', 400);
    }

    const decoded = jwt.verify(tempToken, config.jwt.secret);
    if (!decoded.otpRequired) {
      throw new AppError('Invalid temp token', 400);
    }

    const user = await User.findById(decoded.id).select('+otp +otpExpires');
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
    if (user.otp !== hashedOtp || user.otpExpires < Date.now()) {
      throw new AppError('Invalid or expired OTP', 401);
    }

    user.otp = undefined;
    user.otpExpires = undefined;
    const { token, refreshToken } = generateTokens(user._id, user.role);
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    user.lastLoginIp = req.ip;
    await user.save();

    await AuditLog.create({
      user: user._id,
      action: 'login',
      resource: 'User',
      resourceId: user._id,
      description: `User ${user.email} completed 2FA login`,
      ip: req.ip,
    });

    // Fetch shop features for feature-based access control
    let shopFeatures = null;
    if (user.shopId) {
      const shopId = user.shopId?._id || user.shopId;
      const shop = await Shop.findById(shopId).select('features subscription.status');
      if (shop) {
        shopFeatures = {
          features: shop.features,
          subscriptionStatus: shop.subscription?.status || 'trial',
        };
      }
    }

    res.json({
      success: true,
      message: '2FA verification successful',
      token,
      refreshToken,
      user: sanitizeUser(user),
      shopFeatures,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Refresh token
// @route   POST /api/auth/refresh-token
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      throw new AppError('Refresh token is required', 400);
    }

    const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user || user.refreshToken !== refreshToken) {
      throw new AppError('Invalid refresh token', 401);
    }

    const tokens = generateTokens(user._id, user.role);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    res.json({
      success: true,
      token: tokens.token,
      refreshToken: tokens.refreshToken,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
exports.logout = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (user) {
      user.refreshToken = undefined;
      await user.save();
    }

    await AuditLog.create({
      user: req.userId,
      action: 'logout',
      resource: 'User',
      resourceId: req.userId,
      description: `User logged out`,
      ip: req.ip,
    });

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId)
      .populate('shopId', 'name businessType logo')
      .populate('branchId', 'name');

    // Fetch shop features so the frontend can determine which modules are accessible
    let shopFeatures = null;
    if (user.shopId) {
      const shopId = user.shopId?._id || user.shopId;
      const shop = await Shop.findById(shopId).select('features subscription.status');
      if (shop) {
        shopFeatures = {
          features: shop.features,
          subscriptionStatus: shop.subscription?.status || 'trial',
        };
      }
    }

    res.json({ success: true, user: sanitizeUser(user), shopFeatures });
  } catch (error) {
    next(error);
  }
};

// @desc    Update profile
// @route   PUT /api/auth/profile
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone, language, theme } = req.body;
    const user = await User.findById(req.userId);

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (language) user.language = language;
    if (theme) user.theme = theme;

    await user.save();

    res.json({ success: true, user: sanitizeUser(user) });
  } catch (error) {
    next(error);
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.userId).select('+password');

    if (!(await user.comparePassword(currentPassword))) {
      throw new AppError('Current password is incorrect', 401);
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ success: true, message: 'If the email exists, a reset link has been sent.' });
    }

    const resetToken = user.generatePasswordResetToken();
    await user.save();

    // Send reset email
    const { sendPasswordResetEmail } = require('../services/emailService');
    const emailResult = await sendPasswordResetEmail(
      user.email,
      user.name,
      resetToken,
      user.shopId ? (await require('../models/Shop').findById(user.shopId))?.name || 'Your Shop' : 'FutureMagnus'
    );

    if (!emailResult.success) {
      logger.error(`Failed to send password reset email to ${email}`);
    }

    logger.info(`Password reset token for ${email}: ${resetToken}`);

    res.json({ success: true, message: 'If the email exists, a reset link has been sent.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
exports.resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    }).select('+resetPasswordToken +resetPasswordExpires');

    if (!user) {
      throw new AppError('Invalid or expired reset token', 400);
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.refreshToken = undefined;
    await user.save();

    res.json({ success: true, message: 'Password reset successful. Please log in.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Setup 2FA
// @route   POST /api/auth/setup-2fa
exports.setup2FA = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select('+twoFactorSecret');

    const secret = speakeasy.generateSecret({
      name: `FutureMagnus:${user.email}`,
    });

    user.twoFactorSecret = secret.base32;
    await user.save();

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    res.json({
      success: true,
      secret: secret.base32,
      qrCode: qrCodeUrl,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Enable/Verify 2FA
// @route   POST /api/auth/enable-2fa
exports.enable2FA = async (req, res, next) => {
  try {
    const { token } = req.body;
    const user = await User.findById(req.userId).select('+twoFactorSecret');

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (!verified) {
      throw new AppError('Invalid 2FA token', 400);
    }

    user.twoFactorEnabled = true;
    await user.save();

    res.json({ success: true, message: '2FA enabled successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Disable 2FA
// @route   POST /api/auth/disable-2fa
exports.disable2FA = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select('+twoFactorSecret');
    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    await user.save();

    res.json({ success: true, message: '2FA disabled successfully' });
  } catch (error) {
    next(error);
  }
};
