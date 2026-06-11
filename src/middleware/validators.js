const { validationResult, body, param, query } = require('express-validator');
const { AppError } = require('../utils/AppError');
const { STATUSES, PRIORITIES, JOB_TYPES, SOURCES } = require('../models/JobApplication');

// Run validation and return 422 if errors
const validate = (validations) => async (req, res, next) => {
  await Promise.all(validations.map((v) => v.run(req)));
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e) => `${e.path}: ${e.msg}`).join('. ');
    return next(new AppError(messages, 422));
  }
  next();
};

// ── Auth validators ───────────────────────────────────────────────────────────
const registerValidator = validate([
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
]);

const loginValidator = validate([
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
]);

const forgotPasswordValidator = validate([
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
]);

const resetPasswordValidator = validate([
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  param('token').notEmpty().withMessage('Token is required'),
]);

// ── Job Application validators ────────────────────────────────────────────────
const createJobValidator = validate([
  body('companyName').trim().notEmpty().withMessage('Company name is required').isLength({ max: 200 }),
  body('jobRole').trim().notEmpty().withMessage('Job role is required').isLength({ max: 200 }),
  body('jobUrl').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('Invalid job URL'),
  body('hrEmail').optional({ nullable: true, checkFalsy: true }).isEmail().withMessage('Invalid HR email'),
  body('status').optional().isIn(STATUSES).withMessage(`Status must be one of: ${STATUSES.join(', ')}`),
  body('priority').optional().isIn(PRIORITIES).withMessage(`Priority must be one of: ${PRIORITIES.join(', ')}`),
  body('jobType').optional().isIn(JOB_TYPES).withMessage(`Job type must be one of: ${JOB_TYPES.join(', ')}`),
  body('source').optional().isIn(SOURCES).withMessage(`Source must be one of: ${SOURCES.join(', ')}`),
  body('appliedDate').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('Invalid applied date'),
  body('followUpDate').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('Invalid follow-up date'),
  body('interviewDate').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('Invalid interview date'),
  body('companyRating').optional({ nullable: true }).isInt({ min: 1, max: 5 }).withMessage('Rating must be 1–5'),
]);

const updateJobValidator = validate([
  param('id').isMongoId().withMessage('Invalid job ID'),
  ...[ // Same field rules as create but all optional
    body('companyName').optional().trim().notEmpty().isLength({ max: 200 }),
    body('jobRole').optional().trim().notEmpty().isLength({ max: 200 }),
    body('jobUrl').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('Invalid job URL'),
    body('hrEmail').optional({ nullable: true, checkFalsy: true }).isEmail().withMessage('Invalid HR email'),
    body('status').optional().isIn(STATUSES),
    body('priority').optional().isIn(PRIORITIES),
    body('jobType').optional().isIn(JOB_TYPES),
    body('source').optional().isIn(SOURCES),
    body('appliedDate').optional({ nullable: true, checkFalsy: true }).isISO8601(),
    body('followUpDate').optional({ nullable: true, checkFalsy: true }).isISO8601(),
    body('interviewDate').optional({ nullable: true, checkFalsy: true }).isISO8601(),
    body('companyRating').optional({ nullable: true }).isInt({ min: 1, max: 5 }),
  ],
]);

const mongoIdValidator = (paramName = 'id') =>
  validate([param(paramName).isMongoId().withMessage('Invalid ID format')]);

// ── Reminder validators ───────────────────────────────────────────────────────
const createReminderValidator = validate([
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }),
  body('remindAt').isISO8601().withMessage('Valid reminder date is required'),
  body('type').optional().isIn(['follow-up', 'interview', 'deadline', 'task', 'general']),
  body('priority').optional().isIn(['Low', 'Medium', 'High']),
  body('job').optional({ nullable: true, checkFalsy: true }).isMongoId().withMessage('Invalid job ID'),
]);

module.exports = {
  validate,
  registerValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  createJobValidator,
  updateJobValidator,
  mongoIdValidator,
  createReminderValidator,
};
