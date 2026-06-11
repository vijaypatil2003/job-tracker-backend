const express = require('express');
const router = express.Router();
const {
  register, login, logout, getMe, updateProfile,
  updatePassword, forgotPassword, resetPassword, uploadAvatar,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { uploadAvatar: uploadAvatarMiddleware } = require('../middleware/upload');
const {
  registerValidator, loginValidator, forgotPasswordValidator, resetPasswordValidator,
} = require('../middleware/validators');

// Public
router.post('/register', registerValidator, register);
router.post('/login', loginValidator, login);
router.post('/logout', logout);
router.post('/forgot-password', forgotPasswordValidator, forgotPassword);
router.put('/reset-password/:token', resetPasswordValidator, resetPassword);

// Protected
router.use(protect);
router.get('/me', getMe);
router.put('/me', updateProfile);
router.put('/update-password', updatePassword);
router.put('/avatar', uploadAvatarMiddleware.single('avatar'), uploadAvatar);

module.exports = router;
