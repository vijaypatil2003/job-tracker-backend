const path = require("path");
const fs = require("fs");
const Resume = require("../models/Resume");
const JobApplication = require("../models/JobApplication");
const ActivityLog = require("../models/ActivityLog");
const { AppError, sendSuccess } = require("../utils/AppError");

// @desc    Get all resumes for user
// @route   GET /api/v1/resumes
exports.getResumes = async (req, res, next) => {
  try {
    const resumes = await Resume.find({ user: req.user.id }).sort({
      createdAt: -1,
    });
    sendSuccess(res, "Resumes fetched", resumes);
  } catch (err) {
    next(err);
  }
};

// @desc    Upload resume
// @route   POST /api/v1/resumes
exports.uploadResume = async (req, res, next) => {
  try {
    if (!req.file) return next(new AppError("Please upload a file.", 400));
    if (!req.body.label)
      return next(new AppError("Resume label is required.", 400));

    const { label, tags, description, isDefault, version } = req.body;

    // If marked default, unset others
    if (isDefault === "true" || isDefault === true) {
      await Resume.updateMany({ user: req.user.id }, { isDefault: false });
    }

    const resume = await Resume.create({
      user: req.user.id,
      label,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      tags: tags
        ? Array.isArray(tags)
          ? tags
          : tags.split(",").map((t) => t.trim())
        : [],
      description,
      isDefault: isDefault === "true" || isDefault === true,
      version: parseInt(version) || 1,
    });

    await ActivityLog.create({
      user: req.user.id,
      action: "RESUME_UPLOADED",
      description: `Uploaded resume: ${label}`,
    });

    sendSuccess(res, "Resume uploaded", resume, null, 201);
  } catch (err) {
    next(err);
  }
};

// @desc    Get single resume
// @route   GET /api/v1/resumes/:id
exports.getResume = async (req, res, next) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!resume) return next(new AppError("Resume not found.", 404));
    sendSuccess(res, "Resume fetched", resume);
  } catch (err) {
    next(err);
  }
};

// @desc    Update resume metadata
// @route   PUT /api/v1/resumes/:id
exports.updateResume = async (req, res, next) => {
  try {
    const allowedUpdates = [
      "label",
      "tags",
      "description",
      "isDefault",
      "version",
    ];
    const updates = {};
    allowedUpdates.forEach((f) => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });

    if (updates.isDefault) {
      await Resume.updateMany({ user: req.user.id }, { isDefault: false });
    }

    const resume = await Resume.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      updates,
      { new: true, runValidators: true },
    );
    if (!resume) return next(new AppError("Resume not found.", 404));
    sendSuccess(res, "Resume updated", resume);
  } catch (err) {
    next(err);
  }
};

// @desc    Delete resume
// @route   DELETE /api/v1/resumes/:id
exports.deleteResume = async (req, res, next) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!resume) return next(new AppError("Resume not found.", 404));

    // Remove file from disk
    if (fs.existsSync(resume.filePath)) {
      fs.unlinkSync(resume.filePath);
    }

    // Unlink from job applications
    await JobApplication.updateMany(
      { resumeUsed: resume._id },
      { resumeUsed: null },
    );

    await resume.deleteOne();

    await ActivityLog.create({
      user: req.user.id,
      action: "RESUME_DELETED",
      description: `Deleted resume: ${resume.label}`,
    });

    sendSuccess(res, "Resume deleted");
  } catch (err) {
    next(err);
  }
};

// @desc    Download resume file
// @route   GET /api/v1/resumes/:id/download
exports.downloadResume = async (req, res, next) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!resume) return next(new AppError("Resume not found.", 404));
    if (!fs.existsSync(resume.filePath))
      return next(new AppError("Resume file not found on server.", 404));
    res.download(resume.filePath, resume.originalName);
  } catch (err) {
    next(err);
  }
};
