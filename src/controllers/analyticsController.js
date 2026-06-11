const mongoose = require("mongoose");
const JobApplication = require("../models/JobApplication");
const ActivityLog = require("../models/ActivityLog");
const Reminder = require("../models/Reminder");
const { sendSuccess } = require("../utils/AppError");

// @desc    Dashboard overview stats
// @route   GET /api/v1/analytics/overview
exports.getOverview = async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);

    const [
      statusCounts,
      total,
      todayApplied,
      upcomingFollowUps,
      overdueFollowUps,
    ] = await Promise.all([
      // Status breakdown
      JobApplication.aggregate([
        { $match: { user: userId, isDraft: false } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      // Total
      JobApplication.countDocuments({ user: userId, isDraft: false }),
      // Applied today
      JobApplication.countDocuments({
        user: userId,
        isDraft: false,
        appliedDate: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lte: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      }),
      // Upcoming follow-ups (next 7 days)
      JobApplication.countDocuments({
        user: userId,
        isDraft: false,
        followUpDate: {
          $gte: new Date(),
          $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        followUpEmailSent: false,
      }),
      // Overdue follow-ups
      JobApplication.countDocuments({
        user: userId,
        isDraft: false,
        followUpDate: { $lt: new Date() },
        followUpEmailSent: false,
      }),
    ]);

    const statusMap = {};
    statusCounts.forEach(({ _id, count }) => {
      statusMap[_id] = count;
    });

    const stats = {
      total,
      todayApplied,
      upcomingFollowUps,
      overdueFollowUps,
      byStatus: {
        "Not Applied": statusMap["Not Applied"] || 0,
        Applied: statusMap["Applied"] || 0,
        Interview: statusMap["Interview"] || 0,
        Assignment: statusMap["Assignment"] || 0,
        "HR Round": statusMap["HR Round"] || 0,
        "Technical Round": statusMap["Technical Round"] || 0,
        Rejected: statusMap["Rejected"] || 0,
        "Offer Received": statusMap["Offer Received"] || 0,
        Selected: statusMap["Selected"] || 0,
      },
      // Quick KPIs
      successRate:
        total > 0
          ? (((statusMap["Selected"] || 0) / total) * 100).toFixed(1)
          : 0,
      interviewConversionRate:
        (statusMap["Applied"] || 0) > 0
          ? (
              (((statusMap["Interview"] || 0) +
                (statusMap["HR Round"] || 0) +
                (statusMap["Technical Round"] || 0)) /
                (statusMap["Applied"] || 0)) *
              100
            ).toFixed(1)
          : 0,
      // Streak info
      currentStreak: req.user.currentStreak,
      longestStreak: req.user.longestStreak,
      dailyGoal: req.user.dailyGoal,
      dailyProgress: Math.min(
        100,
        ((todayApplied / req.user.dailyGoal) * 100).toFixed(0),
      ),
    };

    sendSuccess(res, "Overview fetched", stats);
  } catch (err) {
    next(err);
  }
};

// @desc    Applications per month (last 12 months)
// @route   GET /api/v1/analytics/monthly
exports.getMonthlyStats = async (req, res, next) => {
  try {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setDate(1);
    twelveMonthsAgo.setHours(0, 0, 0, 0);

    const data = await JobApplication.aggregate([
      {
        $match: {
          user: req.user._id,
          isDraft: false,
          appliedDate: { $gte: twelveMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$appliedDate" },
            month: { $month: "$appliedDate" },
          },
          count: { $sum: 1 },
          selected: {
            $sum: { $cond: [{ $eq: ["$status", "Selected"] }, 1, 0] },
          },
          rejected: {
            $sum: { $cond: [{ $eq: ["$status", "Rejected"] }, 1, 0] },
          },
          interviews: {
            $sum: {
              $cond: [
                {
                  $in: [
                    "$status",
                    ["Interview", "HR Round", "Technical Round"],
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const formatted = data.map((d) => ({
      label: `${monthNames[d._id.month - 1]} ${d._id.year}`,
      month: d._id.month,
      year: d._id.year,
      applications: d.count,
      selected: d.selected,
      rejected: d.rejected,
      interviews: d.interviews,
    }));

    sendSuccess(res, "Monthly stats fetched", formatted);
  } catch (err) {
    next(err);
  }
};

// @desc    Top cities applied
// @route   GET /api/v1/analytics/cities
exports.getCityStats = async (req, res, next) => {
  try {
    const data = await JobApplication.aggregate([
      {
        $match: {
          user: req.user._id,
          isDraft: false,
          location: { $exists: true, $ne: "" },
        },
      },
      { $group: { _id: "$location", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    sendSuccess(
      res,
      "City stats fetched",
      data.map((d) => ({ city: d._id, count: d.count })),
    );
  } catch (err) {
    next(err);
  }
};

// @desc    Applications by source
// @route   GET /api/v1/analytics/sources
exports.getSourceStats = async (req, res, next) => {
  try {
    const data = await JobApplication.aggregate([
      { $match: { user: req.user._id, isDraft: false } },
      { $group: { _id: "$source", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    sendSuccess(
      res,
      "Source stats fetched",
      data.map((d) => ({ source: d._id || "Unknown", count: d.count })),
    );
  } catch (err) {
    next(err);
  }
};

// @desc    Applications by job type
// @route   GET /api/v1/analytics/job-types
exports.getJobTypeStats = async (req, res, next) => {
  try {
    const data = await JobApplication.aggregate([
      { $match: { user: req.user._id, isDraft: false } },
      { $group: { _id: "$jobType", count: { $sum: 1 } } },
    ]);
    sendSuccess(
      res,
      "Job type stats fetched",
      data.map((d) => ({ type: d._id || "Unknown", count: d.count })),
    );
  } catch (err) {
    next(err);
  }
};

// @desc    Priority breakdown
// @route   GET /api/v1/analytics/priorities
exports.getPriorityStats = async (req, res, next) => {
  try {
    const data = await JobApplication.aggregate([
      { $match: { user: req.user._id, isDraft: false } },
      { $group: { _id: "$priority", count: { $sum: 1 } } },
    ]);
    sendSuccess(
      res,
      "Priority stats fetched",
      data.map((d) => ({ priority: d._id, count: d.count })),
    );
  } catch (err) {
    next(err);
  }
};

// @desc    Weekly progress report (last 4 weeks)
// @route   GET /api/v1/analytics/weekly
exports.getWeeklyReport = async (req, res, next) => {
  try {
    const weeks = [];
    for (let i = 3; i >= 0; i--) {
      const start = new Date();
      start.setDate(start.getDate() - (i + 1) * 7);
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setDate(end.getDate() - i * 7);
      end.setHours(23, 59, 59, 999);
      weeks.push({
        start,
        end,
        label: i === 0 ? "This Week" : `${i} week${i > 1 ? "s" : ""} ago`,
      });
    }

    const results = await Promise.all(
      weeks.map(async ({ start, end, label }) => {
        const [applied, interviews, offers] = await Promise.all([
          JobApplication.countDocuments({
            user: req.user._id,
            isDraft: false,
            appliedDate: { $gte: start, $lte: end },
          }),
          JobApplication.countDocuments({
            user: req.user._id,
            isDraft: false,
            interviewDate: { $gte: start, $lte: end },
          }),
          JobApplication.countDocuments({
            user: req.user._id,
            isDraft: false,
            status: "Offer Received",
            updatedAt: { $gte: start, $lte: end },
          }),
        ]);
        return { label, applied, interviews, offers };
      }),
    );

    sendSuccess(res, "Weekly report fetched", results);
  } catch (err) {
    next(err);
  }
};

// @desc    Recent activity log
// @route   GET /api/v1/analytics/activity
exports.getRecentActivity = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const logs = await ActivityLog.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("job", "companyName jobRole status");
    sendSuccess(res, "Activity log fetched", logs);
  } catch (err) {
    next(err);
  }
};
