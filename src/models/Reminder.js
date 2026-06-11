const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema(
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
    title: {
      type: String,
      required: [true, 'Reminder title is required'],
      trim: true,
      maxlength: [200, 'Title too long'],
    },
    description: {
      type: String,
      maxlength: [1000, 'Description too long'],
    },
    type: {
      type: String,
      enum: ['follow-up', 'interview', 'deadline', 'task', 'general'],
      default: 'general',
    },
    remindAt: {
      type: Date,
      required: [true, 'Reminder date is required'],
      index: true,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    isSent: {
      type: Boolean,
      default: false,
    },
    sentAt: {
      type: Date,
      default: null,
    },
    sendEmail: {
      type: Boolean,
      default: false,
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      default: 'Medium',
    },
    // Recurrence
    isRecurring: { type: Boolean, default: false },
    recurrencePattern: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', null],
      default: null,
    },
  },
  { timestamps: true }
);

reminderSchema.index({ user: 1, remindAt: 1, isCompleted: 1 });

module.exports = mongoose.model('Reminder', reminderSchema);
