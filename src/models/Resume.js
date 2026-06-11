const mongoose = require("mongoose");

const resumeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    label: {
      type: String,
      required: [true, "Resume label is required"],
      trim: true,
      maxlength: [100, "Label cannot exceed 100 characters"],
    },
    fileName: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
    },
    mimeType: {
      type: String,
    },
    tags: [{ type: String, trim: true }],
    usedInJobs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "JobApplication",
      },
    ],
    isDefault: {
      type: Boolean,
      default: false,
    },
    version: {
      type: Number,
      default: 1,
    },
    description: {
      type: String,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },

    // ── Parsing ──────────────────────────────
    isParsed: {
      type: Boolean,
      default: false,
    },
    parsedData: {
      name: { type: String, default: "" },
      email: { type: String, default: "" },
      phone: { type: String, default: "" },
      location: { type: String, default: "" },
      summary: { type: String, default: "" },
      skills: [{ type: String }],
      education: [
        {
          degree: { type: String, default: "" },
          institution: { type: String, default: "" },
          startYear: { type: String, default: "" },
          endYear: { type: String, default: "" },
        },
      ],
      experience: [
        {
          title: { type: String, default: "" },
          company: { type: String, default: "" },
          duration: { type: String, default: "" },
          description: { type: String, default: "" },
        },
      ],
    },
    parseError: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

resumeSchema.virtual("fileSizeFormatted").get(function () {
  if (!this.fileSize) return null;
  const kb = this.fileSize / 1024;
  return kb < 1024 ? `${kb.toFixed(1)} KB` : `${(kb / 1024).toFixed(2)} MB`;
});

module.exports = mongoose.model("Resume", resumeSchema);
