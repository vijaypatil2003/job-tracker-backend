const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JobApplication',
      default: null,
    },
    action: {
      type: String,
      required: true,
      enum: [
        'JOB_CREATED', 'JOB_UPDATED', 'JOB_DELETED',
        'STATUS_CHANGED', 'FOLLOW_UP_SENT',
        'RESUME_UPLOADED', 'RESUME_DELETED',
        'REMINDER_CREATED', 'REMINDER_COMPLETED',
        'NOTE_ADDED', 'NOTE_UPDATED',
        'INTERVIEW_SCHEDULED', 'INTERVIEW_COMPLETED',
        'OFFER_RECEIVED', 'OFFER_ACCEPTED', 'OFFER_REJECTED',
        'APPLICATION_BOOKMARKED', 'APPLICATION_PINNED',
      ],
    },
    description: {
      type: String,
      maxlength: [500, 'Description too long'],
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: { type: String },
  },
  { timestamps: true }
);

activityLogSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
