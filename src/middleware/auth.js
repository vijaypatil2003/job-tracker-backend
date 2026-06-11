const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { AppError } = require("../utils/AppError");
const logger = require("../utils/logger");

/**
 * Protect route: verify JWT and attach user to req
 */
const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return next(new AppError("Not authorised. Please log in.", 401));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return next(new AppError("User no longer exists.", 401));
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === "JsonWebTokenError") {
      return next(new AppError("Invalid token. Please log in again.", 401));
    }
    if (err.name === "TokenExpiredError") {
      return next(new AppError("Token expired. Please log in again.", 401));
    }
    logger.error(`Auth middleware error: ${err.message}`);
    next(new AppError("Authentication error.", 401));
  }
};

/**
 * Authorise specific roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          `Role '${req.user.role}' is not allowed to access this route.`,
          403,
        ),
      );
    }
    next();
  };
};

module.exports = { protect, authorize };
