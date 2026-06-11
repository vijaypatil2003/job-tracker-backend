const crypto = require('crypto');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { AppError, sendSuccess, sendError } = require('../utils/AppError');
const { sendPasswordResetEmail, sendWelcomeEmail } = require('../utils/email');
const logger = require('../utils/logger');

// Helper: sign token and send cookie
const sendTokenResponse = (user, statusCode, res) => {
  const token = user.getSignedJwtToken();

  const options = {
    expires: new Date(Date.now() + parseInt(process.env.JWT_COOKIE_EXPIRE) * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  };

  const userData = {
    id: user._id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    role: user.role,
    preferences: user.preferences,
    dailyGoal: user.dailyGoal,
    currentStreak: user.currentStreak,
    longestStreak: user.longestStreak,
  };

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({ success: true, token, data: userData });
};

// @desc    Register user
// @route   POST /api/v1/auth/register
exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return next(new AppError('Email already registered.', 400));

    const user = await User.create({ name, email, password });

    // Send welcome email (non-blocking)
    sendWelcomeEmail(email, name).catch((err) =>
      logger.warn(`Welcome email failed for ${email}: ${err.message}`)
    );

    sendTokenResponse(user, 201, res);
  } catch (err) {
    next(err);
  }
};

// @desc    Login user
// @route   POST /api/v1/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) return next(new AppError('Invalid credentials.', 401));

    const isMatch = await user.matchPassword(password);
    if (!isMatch) return next(new AppError('Invalid credentials.', 401));

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// @desc    Logout user
// @route   POST /api/v1/auth/logout
exports.logout = (req, res) => {
  res
    .cookie('token', 'none', { expires: new Date(Date.now() + 10 * 1000), httpOnly: true })
    .json({ success: true, message: 'Logged out successfully.' });
};

// @desc    Get current user
// @route   GET /api/v1/auth/me
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    sendSuccess(res, 'User fetched', user);
  } catch (err) {
    next(err);
  }
};

// @desc    Update profile (name, dailyGoal, preferences)
// @route   PUT /api/v1/auth/me
exports.updateProfile = async (req, res, next) => {
  try {
    const allowedFields = ['name', 'dailyGoal', 'preferences'];
    const updates = {};
    allowedFields.forEach((f) => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });

    const user = await User.findByIdAndUpdate(req.user.id, updates, {
      new: true,
      runValidators: true,
    });
    sendSuccess(res, 'Profile updated', user);
  } catch (err) {
    next(err);
  }
};

// @desc    Update password
// @route   PUT /api/v1/auth/update-password
exports.updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return next(new AppError('Current and new passwords are required.', 400));

    const user = await User.findById(req.user.id).select('+password');
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) return next(new AppError('Current password is incorrect.', 401));

    if (newPassword.length < 8)
      return next(new AppError('New password must be at least 8 characters.', 400));

    user.password = newPassword;
    await user.save();
    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// @desc    Forgot password — send reset email
// @route   POST /api/v1/auth/forgot-password
exports.forgotPassword = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    // Always return success to prevent email enumeration
    if (!user) return sendSuccess(res, 'If that email exists, a reset link has been sent.');

    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    try {
      await sendPasswordResetEmail(user.email, resetToken, resetUrl);
      sendSuccess(res, 'Reset link sent to email.');
    } catch (emailErr) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      logger.error(`Password reset email failed: ${emailErr.message}`);
      return next(new AppError('Email could not be sent. Please try again.', 500));
    }
  } catch (err) {
    next(err);
  }
};

// @desc    Reset password
// @route   PUT /api/v1/auth/reset-password/:token
exports.resetPassword = async (req, res, next) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) return next(new AppError('Invalid or expired reset token.', 400));

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// @desc    Upload avatar
// @route   PUT /api/v1/auth/avatar
exports.uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) return next(new AppError('Please upload a file.', 400));
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { avatar: avatarUrl },
      { new: true }
    );
    sendSuccess(res, 'Avatar updated', { avatar: user.avatar });
  } catch (err) {
    next(err);
  }
};
