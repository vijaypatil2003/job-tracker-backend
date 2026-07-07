const Reminder = require("../models/Reminder");
const ActivityLog = require("../models/ActivityLog");
const { AppError, sendSuccess } = require("../utils/AppError");

// @desc    Get all reminders
// @route   GET /api/v1/reminders
exports.getReminders = async (req, res, next) => {
  try {
    const filter = { user: req.user.id };
    if (req.query.isCompleted !== undefined)
      filter.isCompleted = req.query.isCompleted === "true";
    if (req.query.type) filter.type = req.query.type;

    // Upcoming only
    if (req.query.upcoming === "true") {
      filter.remindAt = { $gte: new Date() };
      filter.isCompleted = false;
    }

    const reminders = await Reminder.find(filter)
      .sort({ remindAt: 1 })
      .populate("job", "companyName jobRole status");

    sendSuccess(res, "Reminders fetched", reminders);
  } catch (err) {
    next(err);
  }
};

// @desc    Get upcoming reminders (next 7 days) — for notification badge
// @route   GET /api/v1/reminders/upcoming
exports.getUpcomingReminders = async (req, res, next) => {
  try {
    const reminders = await Reminder.find({
      user: req.user.id,
      isCompleted: false,
      remindAt: {
        $gte: new Date(),
        $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })
      .sort({ remindAt: 1 })
      .limit(10)
      .populate("job", "companyName jobRole");

    sendSuccess(res, "Upcoming reminders fetched", reminders, {
      count: reminders.length,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create reminder
// @route   POST /api/v1/reminders
exports.createReminder = async (req, res, next) => {
  try {
    const reminder = await Reminder.create({ ...req.body, user: req.user.id });
    await ActivityLog.create({
      user: req.user.id,
      job: reminder.job || null,
      action: "REMINDER_CREATED",
      description: `Reminder set: ${reminder.title}`,
    });
    sendSuccess(res, "Reminder created", reminder, null, 201);
  } catch (err) {
    next(err);
  }
};

// @desc    Update reminder
// @route   PUT /api/v1/reminders/:id
exports.updateReminder = async (req, res, next) => {
  try {
    delete req.body.user;
    const reminder = await Reminder.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      req.body,
      { new: true, runValidators: true },
    );
    if (!reminder) return next(new AppError("Reminder not found.", 404));
    sendSuccess(res, "Reminder updated", reminder);
  } catch (err) {
    next(err);
  }
};

// @desc    Mark reminder complete
// @route   PUT /api/v1/reminders/:id/complete
exports.completeReminder = async (req, res, next) => {
  try {
    const reminder = await Reminder.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { isCompleted: true, completedAt: new Date() },
      { new: true },
    );
    if (!reminder) return next(new AppError("Reminder not found.", 404));
    await ActivityLog.create({
      user: req.user.id,
      job: reminder.job || null,
      action: "REMINDER_COMPLETED",
      description: `Reminder completed: ${reminder.title}`,
    });
    sendSuccess(res, "Reminder marked as complete", reminder);
  } catch (err) {
    next(err);
  }
};

// @desc    Delete reminder
// @route   DELETE /api/v1/reminders/:id
exports.deleteReminder = async (req, res, next) => {
  try {
    const reminder = await Reminder.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!reminder) return next(new AppError("Reminder not found.", 404));
    sendSuccess(res, "Reminder deleted");
  } catch (err) {
    next(err);
  }
};
