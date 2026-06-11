class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Standardized API response helper
const sendResponse = (res, statusCode, success, message, data = null, meta = null) => {
  const response = { success, message };
  if (data !== null) response.data = data;
  if (meta !== null) response.meta = meta;
  return res.status(statusCode).json(response);
};

const sendSuccess = (res, message, data = null, meta = null, statusCode = 200) =>
  sendResponse(res, statusCode, true, message, data, meta);

const sendError = (res, message, statusCode = 400) =>
  sendResponse(res, statusCode, false, message);

module.exports = { AppError, sendSuccess, sendError };
