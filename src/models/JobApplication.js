const mongoose = require("mongoose");

const STATUSES = [
  "Not Applied",
  "Applied",
  "Interview",
  "Assignment",
  "HR Round",
  "Technical Round",
  "Rejected",
  "Offer Received",
  "Selected",
  "Offer Declined",
];

const PRIORITIES = ["Low", "Medium", "High", "Urgent"];
const JOB_TYPES = [
  "Full-time",
  "Remote",
  "Hybrid",
  "Onsite",
  "Contract",
  "Freelance",
  "Internship",
];
const SOURCES = [
  "LinkedIn",
  "Naukri",
  "Indeed",
  "Referral",
  "Company Website",
  "AngelList",
  "Glassdoor",
  "Other",
];

const interviewRoundSchema = new mongoose.Schema(
  {
    roundName: { type: String, required: true }, // e.g. "Technical Round 1"
    roundDate: { type: Date },
    interviewer: { type: String },
    feedback: { type: String },
    questionsAsked: [{ type: String }],
    result: {
      type: String,
      enum: ["Pending", "Passed", "Failed", "No Show"],
      default: "Pending",
    },
    notes: { type: String },
  },
  { timestamps: true },
);

const activitySchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    description: { type: String },
    oldValue: { type: String },
    newValue: { type: String },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

const jobApplicationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Core Info
    companyName: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
      maxlength: [200, "Company name too long"],
    },
    jobRole: {
      type: String,
      required: [true, "Job role is required"],
      trim: true,
      maxlength: [200, "Job role too long"],
    },
    jobUrl: { type: String, trim: true },
    jobDescription: { type: String, maxlength: [5000, "Description too long"] },

    // Contact Info
    hrName: { type: String, trim: true },
    hrEmail: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    companyAddress: { type: String, trim: true },

    // Job Details
    location: { type: String, trim: true },
    jobType: { type: String, enum: JOB_TYPES, default: "Onsite" },
    salary: { type: String, trim: true },
    expectedSalary: { type: String, trim: true },
    offeredSalary: { type: String, trim: true },
    source: { type: String, enum: SOURCES, default: "Other" },

    // Status & Priority
    status: {
      type: String,
      enum: STATUSES,
      default: "Not Applied",
      index: true,
    },
    priority: { type: String, enum: PRIORITIES, default: "Medium" },

    // Dates
    appliedDate: { type: Date },
    followUpDate: { type: Date, index: true },
    interviewDate: { type: Date },
    offerDeadline: { type: Date },

    // Follow-up tracking
    followUpEmailSent: { type: Boolean, default: false },
    followUpEmailSentAt: { type: Date },

    // Resume
    resumeUsed: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resume",
      default: null,
    },
    resumeLabel: { type: String }, // Fallback label if no Resume doc

    // HR Call Status — tracks outreach to HR
    // TODO: delete this comment when in production
    hrCallStatus: {
      type: String,
      enum: [
        "not_called",
        "called",
        "responded_opening",
        "responded_no_opening",
      ],
      default: "not_called",
    },

    // Notes
    notes: { type: String, maxlength: [5000, "Notes too long"] },
    companyResearchNotes: { type: String },
    interviewPreparationNotes: { type: String },
    hrFeedback: { type: String },

    // Ratings & Flags
    companyRating: { type: Number, min: 1, max: 5, default: null },
    isBookmarked: { type: Boolean, default: false },
    isPinned: { type: Boolean, default: false },
    isBlacklisted: { type: Boolean, default: false },
    isWatchlisted: { type: Boolean, default: false },

    // Interview checklist (array of items)
    interviewChecklist: [
      {
        item: { type: String },
        checked: { type: Boolean, default: false },
      },
    ],

    // Interview rounds
    interviewRounds: [interviewRoundSchema],

    // Activity timeline
    activityLog: [activitySchema],

    // Draft
    isDraft: { type: Boolean, default: false },

    // Tags / skills
    tags: [{ type: String, trim: true }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Compound index for efficient user queries
jobApplicationSchema.index({ user: 1, status: 1 });
jobApplicationSchema.index({ user: 1, createdAt: -1 });
jobApplicationSchema.index({ user: 1, followUpDate: 1 });
jobApplicationSchema.index({ user: 1, companyName: "text", jobRole: "text" });

// Virtual: days since applied
jobApplicationSchema.virtual("daysSinceApplied").get(function () {
  if (!this.appliedDate) return null;
  return Math.floor(
    (Date.now() - new Date(this.appliedDate)) / (1000 * 60 * 60 * 24),
  );
});

// Virtual: is follow-up overdue
jobApplicationSchema.virtual("isFollowUpOverdue").get(function () {
  if (!this.followUpDate) return false;
  return new Date(this.followUpDate) < new Date() && !this.followUpEmailSent;
});

// Pre-save: append activity log on status change
jobApplicationSchema.pre("save", function (next) {
  if (this.isModified("status") && !this.isNew) {
    this.activityLog.push({
      action: "Status Changed",
      description: `Status updated`,
      oldValue: this.$__.priorDoc?.status,
      newValue: this.status,
    });
  }
  next();
});

module.exports = mongoose.model("JobApplication", jobApplicationSchema);
module.exports.STATUSES = STATUSES;
module.exports.PRIORITIES = PRIORITIES;
module.exports.JOB_TYPES = JOB_TYPES;
module.exports.SOURCES = SOURCES;
