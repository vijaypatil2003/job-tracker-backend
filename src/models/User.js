const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,10})+$/,
        "Please provide a valid email",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },
    avatar: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isOnboardingComplete: { type: Boolean, default: false },
    // Daily goal tracker
    dailyGoal: {
      type: Number,
      default: 5,
      min: [1, "Daily goal must be at least 1"],
      max: [50, "Daily goal cannot exceed 50"],
    },
    // Streak tracking
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastActivityDate: { type: Date, default: null },
    // Preferences
    preferences: {
      theme: {
        type: String,
        enum: ["light", "dark", "system"],
        default: "system",
      },
      defaultView: {
        type: String,
        enum: ["table", "kanban", "calendar"],
        default: "table",
      },
      emailNotifications: { type: Boolean, default: true },
    },
    profile: {
      phone: { type: String, default: null },
      location: { type: String, default: null },
      currentRole: { type: String, default: null },
      experience: { type: String, default: null },
      expectedSalary: { type: String, default: null },
      skills: [{ type: String }],
      summary: { type: String, default: null },
      profileComplete: { type: Boolean, default: false },
    },
    // Password reset
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    // Timestamps
    lastLogin: { type: Date, default: null },
  },
  { timestamps: true },
);

// Hash password before save
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Generate signed JWT
userSchema.methods.getSignedJwtToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

// Compare entered password with hashed
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate and hash password reset token
userSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(20).toString("hex");
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 min
  return resetToken;
};

// Update streak
userSchema.methods.updateStreak = function () {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!this.lastActivityDate) {
    this.currentStreak = 1;
  } else {
    const last = new Date(this.lastActivityDate);
    last.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today - last) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return; // Already counted today
    if (diffDays === 1) {
      this.currentStreak += 1;
    } else {
      this.currentStreak = 1; // Streak broken
    }
  }

  if (this.currentStreak > this.longestStreak) {
    this.longestStreak = this.currentStreak;
  }
  this.lastActivityDate = today;
};

module.exports = mongoose.model("User", userSchema);
