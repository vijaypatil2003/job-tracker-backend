const JobApplication = require("../models/JobApplication");
const ActivityLog = require("../models/ActivityLog");
const Resume = require("../models/Resume");
const { AppError, sendSuccess } = require("../utils/AppError");
const {
  exportToExcel,
  exportToCSV,
  parseImportFile,
} = require("../utils/exportHelper");
const {
  generateEmailTemplate,
  getAvailableTemplates,
} = require("../utils/emailTemplates");
const logger = require("../utils/logger");

// ── Helpers ───────────────────────────────────────────────────────────────────

const logActivity = async (
  userId,
  jobId,
  action,
  description,
  metadata = {},
) => {
  try {
    await ActivityLog.create({
      user: userId,
      job: jobId,
      action,
      description,
      metadata,
    });
  } catch (err) {
    logger.warn(`ActivityLog failed: ${err.message}`);
  }
};

const buildQuery = (userId, queryParams) => {
  const filter = { user: userId, isDraft: false };
  const {
    search,
    status,
    priority,
    jobType,
    source,
    location,
    isBookmarked,
    isPinned,
  } = queryParams;

  if (search) {
    filter.$or = [
      { companyName: { $regex: search, $options: "i" } },
      { jobRole: { $regex: search, $options: "i" } },
      { location: { $regex: search, $options: "i" } },
      { hrName: { $regex: search, $options: "i" } },
    ];
  }
  if (status) filter.status = { $in: status.split(",") };
  if (priority) filter.priority = { $in: priority.split(",") };
  if (jobType) filter.jobType = { $in: jobType.split(",") };
  if (source) filter.source = { $in: source.split(",") };
  if (location) filter.location = { $regex: location, $options: "i" };
  if (isBookmarked === "true") filter.isBookmarked = true;
  if (isPinned === "true") filter.isPinned = true;

  // Date range filters
  if (queryParams.appliedFrom || queryParams.appliedTo) {
    filter.appliedDate = {};
    if (queryParams.appliedFrom)
      filter.appliedDate.$gte = new Date(queryParams.appliedFrom);
    if (queryParams.appliedTo)
      filter.appliedDate.$lte = new Date(queryParams.appliedTo);
  }

  return filter;
};

// ── CRUD ──────────────────────────────────────────────────────────────────────

// @desc    Get all job applications (paginated, filtered, sorted)
// @route   GET /api/v1/jobs
exports.getJobs = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const filter = buildQuery(req.user.id, req.query);

    // Build sort
    const sortMap = {
      latest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      company: { companyName: 1 },
      status: { status: 1 },
      priority: { priority: -1 },
      followUp: { followUpDate: 1 },
    };
    const sort = sortMap[req.query.sort] || { createdAt: -1 };

    const [jobs, total] = await Promise.all([
      JobApplication.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate("resumeUsed", "label fileName")
        .lean({ virtuals: true }),
      JobApplication.countDocuments(filter),
    ]);

    sendSuccess(res, "Jobs fetched", jobs, {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single job
// @route   GET /api/v1/jobs/:id
exports.getJob = async (req, res, next) => {
  try {
    const job = await JobApplication.findOne({
      _id: req.params.id,
      user: req.user.id,
    })
      .populate("resumeUsed", "label fileName filePath")
      .populate("activityLog.performedBy", "name");

    if (!job) return next(new AppError("Job application not found.", 404));
    sendSuccess(res, "Job fetched", job);
  } catch (err) {
    next(err);
  }
};

// @desc    Create job application
// @route   POST /api/v1/jobs
exports.createJob = async (req, res, next) => {
  try {
    const jobData = { ...req.body, user: req.user.id };

    // Default appliedDate to today if not provided
    if (!jobData.appliedDate) {
      jobData.appliedDate = new Date();
    }

    const job = await JobApplication.create(jobData);

    // Update user streak
    req.user.updateStreak();
    await req.user.save({ validateBeforeSave: false });

    await logActivity(
      req.user.id,
      job._id,
      "JOB_CREATED",
      `Added ${job.companyName} — ${job.jobRole}`,
    );

    sendSuccess(res, "Job application created", job, null, 201);
  } catch (err) {
    next(err);
  }
};

// @desc    Update job application
// @route   PUT /api/v1/jobs/:id
exports.updateJob = async (req, res, next) => {
  try {
    const existing = await JobApplication.findOne({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!existing) return next(new AppError("Job application not found.", 404));

    const oldStatus = existing.status;

    // Prevent overriding user field
    delete req.body.user;

    const job = await JobApplication.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      },
    );

    // Log status change
    if (req.body.status && req.body.status !== oldStatus) {
      await logActivity(
        req.user.id,
        job._id,
        "STATUS_CHANGED",
        `Status changed from "${oldStatus}" to "${job.status}"`,
        { oldStatus, newStatus: job.status },
      );
    } else {
      await logActivity(
        req.user.id,
        job._id,
        "JOB_UPDATED",
        `Updated ${job.companyName}`,
      );
    }

    sendSuccess(res, "Job application updated", job);
  } catch (err) {
    next(err);
  }
};

// @desc    Delete job application
// @route   DELETE /api/v1/jobs/:id
exports.deleteJob = async (req, res, next) => {
  try {
    const job = await JobApplication.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!job) return next(new AppError("Job application not found.", 404));
    await logActivity(
      req.user.id,
      job._id,
      "JOB_DELETED",
      `Deleted ${job.companyName} — ${job.jobRole}`,
    );
    sendSuccess(res, "Job application deleted");
  } catch (err) {
    next(err);
  }
};

// @desc    Bulk delete
// @route   DELETE /api/v1/jobs/bulk
exports.bulkDeleteJobs = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.length)
      return next(new AppError("Please provide an array of IDs.", 400));

    const result = await JobApplication.deleteMany({
      _id: { $in: ids },
      user: req.user.id,
    });
    sendSuccess(res, `${result.deletedCount} job(s) deleted`);
  } catch (err) {
    next(err);
  }
};

// @desc    Bulk update status
// @route   PUT /api/v1/jobs/bulk-status
exports.bulkUpdateStatus = async (req, res, next) => {
  try {
    const { ids, status } = req.body;
    if (!Array.isArray(ids) || !ids.length || !status)
      return next(new AppError("Please provide IDs and status.", 400));

    await JobApplication.updateMany(
      { _id: { $in: ids }, user: req.user.id },
      { status },
    );
    sendSuccess(res, `${ids.length} job(s) updated to "${status}"`);
  } catch (err) {
    next(err);
  }
};

// ── Smart Actions ─────────────────────────────────────────────────────────────

// @desc    Toggle bookmark
// @route   PUT /api/v1/jobs/:id/bookmark
exports.toggleBookmark = async (req, res, next) => {
  try {
    const job = await JobApplication.findOne({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!job) return next(new AppError("Job not found.", 404));
    job.isBookmarked = !job.isBookmarked;
    await job.save();
    sendSuccess(
      res,
      `Job ${job.isBookmarked ? "bookmarked" : "unbookmarked"}`,
      { isBookmarked: job.isBookmarked },
    );
  } catch (err) {
    next(err);
  }
};

// @desc    Toggle pin
// @route   PUT /api/v1/jobs/:id/pin
exports.togglePin = async (req, res, next) => {
  try {
    const job = await JobApplication.findOne({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!job) return next(new AppError("Job not found.", 404));
    job.isPinned = !job.isPinned;
    await job.save();
    sendSuccess(res, `Job ${job.isPinned ? "pinned" : "unpinned"}`, {
      isPinned: job.isPinned,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Toggle blacklist
// @route   PUT /api/v1/jobs/:id/blacklist
exports.toggleBlacklist = async (req, res, next) => {
  try {
    const job = await JobApplication.findOne({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!job) return next(new AppError("Job not found.", 404));
    job.isBlacklisted = !job.isBlacklisted;
    await job.save();
    sendSuccess(
      res,
      `Company ${job.isBlacklisted ? "blacklisted" : "removed from blacklist"}`,
      { isBlacklisted: job.isBlacklisted },
    );
  } catch (err) {
    next(err);
  }
};

// @desc    Mark follow-up email as sent
// @route   PUT /api/v1/jobs/:id/follow-up-sent
exports.markFollowUpSent = async (req, res, next) => {
  try {
    const job = await JobApplication.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { followUpEmailSent: true, followUpEmailSentAt: new Date() },
      { new: true },
    );
    if (!job) return next(new AppError("Job not found.", 404));
    await logActivity(
      req.user.id,
      job._id,
      "FOLLOW_UP_SENT",
      `Follow-up marked as sent for ${job.companyName}`,
    );
    sendSuccess(res, "Follow-up marked as sent", { followUpEmailSent: true });
  } catch (err) {
    next(err);
  }
};

// @desc    Add interview round
// @route   POST /api/v1/jobs/:id/interview-rounds
exports.addInterviewRound = async (req, res, next) => {
  try {
    const job = await JobApplication.findOne({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!job) return next(new AppError("Job not found.", 404));
    job.interviewRounds.push(req.body);
    await job.save();
    await logActivity(
      req.user.id,
      job._id,
      "INTERVIEW_SCHEDULED",
      `Interview round added: ${req.body.roundName}`,
    );
    sendSuccess(res, "Interview round added", job.interviewRounds);
  } catch (err) {
    next(err);
  }
};

// @desc    Update interview round
// @route   PUT /api/v1/jobs/:id/interview-rounds/:roundId
exports.updateInterviewRound = async (req, res, next) => {
  try {
    const job = await JobApplication.findOne({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!job) return next(new AppError("Job not found.", 404));
    const round = job.interviewRounds.id(req.params.roundId);
    if (!round) return next(new AppError("Interview round not found.", 404));
    Object.assign(round, req.body);
    await job.save();
    sendSuccess(res, "Interview round updated", job.interviewRounds);
  } catch (err) {
    next(err);
  }
};

// @desc    Update interview checklist
// @route   PUT /api/v1/jobs/:id/checklist
exports.updateChecklist = async (req, res, next) => {
  try {
    const { checklist } = req.body;
    const job = await JobApplication.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { interviewChecklist: checklist },
      { new: true },
    );
    if (!job) return next(new AppError("Job not found.", 404));
    sendSuccess(res, "Checklist updated", job.interviewChecklist);
  } catch (err) {
    next(err);
  }
};

// ── Export / Import ───────────────────────────────────────────────────────────

// @desc    Export jobs to Excel
// @route   GET /api/v1/jobs/export/excel
exports.exportExcel = async (req, res, next) => {
  try {
    const filter = buildQuery(req.user.id, req.query);
    const jobs = await JobApplication.find(filter).lean();
    const buffer = exportToExcel(jobs);
    res.set({
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="job-applications-${Date.now()}.xlsx"`,
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  } catch (err) {
    next(err);
  }
};

// @desc    Export jobs to CSV
// @route   GET /api/v1/jobs/export/csv
exports.exportCSV = async (req, res, next) => {
  try {
    const filter = buildQuery(req.user.id, req.query);
    const jobs = await JobApplication.find(filter).lean();
    const csv = exportToCSV(jobs);
    res.set({
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="job-applications-${Date.now()}.csv"`,
    });
    res.send(csv);
  } catch (err) {
    next(err);
  }
};

// @desc    Import jobs from CSV/Excel
// @route   POST /api/v1/jobs/import
exports.importJobs = async (req, res, next) => {
  try {
    if (!req.file) return next(new AppError("Please upload a file.", 400));
    const rows = parseImportFile(req.file.buffer, req.file.mimetype);
    if (!rows.length)
      return next(new AppError("No valid rows found in the file.", 400));

    const docs = rows.map((r) => ({ ...r, user: req.user.id }));
    const created = await JobApplication.insertMany(docs, { ordered: false });

    await logActivity(
      req.user.id,
      null,
      "JOB_CREATED",
      `Imported ${created.length} job applications`,
    );
    sendSuccess(
      res,
      `${created.length} job(s) imported successfully`,
      { count: created.length },
      null,
      201,
    );
  } catch (err) {
    // insertMany partial success
    if (err.name === "BulkWriteError") {
      return sendSuccess(
        res,
        `Partial import: ${err.result?.nInserted || 0} job(s) imported`,
        {
          count: err.result?.nInserted || 0,
          errors: err.writeErrors?.length,
        },
      );
    }
    next(err);
  }
};

// ── Email Templates ───────────────────────────────────────────────────────────

// @desc    Generate follow-up email template
// @route   GET /api/v1/jobs/:id/email-template
exports.getEmailTemplate = async (req, res, next) => {
  try {
    const { type = "followUp" } = req.query;
    const job = await JobApplication.findOne({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!job) return next(new AppError("Job not found.", 404));

    const template = generateEmailTemplate(type, {
      name: req.user.name,
      companyName: job.companyName,
      jobRole: job.jobRole,
      appliedDate: job.appliedDate,
      hrName: job.hrName,
      interviewDate: job.interviewDate,
      expectedSalary: job.expectedSalary,
    });

    sendSuccess(res, "Email template generated", {
      template,
      availableTypes: getAvailableTemplates(),
    });
  } catch (err) {
    next(err);
  }
};

// ── Drafts ────────────────────────────────────────────────────────────────────

// @desc    Save draft
// @route   POST /api/v1/jobs/draft
exports.saveDraft = async (req, res, next) => {
  try {
    // Check for existing draft to auto-save into
    let draft = await JobApplication.findOne({
      user: req.user.id,
      isDraft: true,
      companyName: req.body.companyName,
    });
    if (draft) {
      Object.assign(draft, req.body, { isDraft: true });
      await draft.save();
    } else {
      draft = await JobApplication.create({
        ...req.body,
        user: req.user.id,
        isDraft: true,
      });
    }
    sendSuccess(res, "Draft saved", draft, null, 201);
  } catch (err) {
    next(err);
  }
};

// @desc    Get drafts
// @route   GET /api/v1/jobs/drafts
exports.getDrafts = async (req, res, next) => {
  try {
    const drafts = await JobApplication.find({
      user: req.user.id,
      isDraft: true,
    }).sort({ updatedAt: -1 });
    sendSuccess(res, "Drafts fetched", drafts);
  } catch (err) {
    next(err);
  }
};
