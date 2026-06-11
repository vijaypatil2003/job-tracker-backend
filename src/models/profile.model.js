const mongoose = require("mongoose");

const educationSchema = new mongoose.Schema(
  {
    degree: { type: String, default: "" },
    institution: { type: String, default: "" },
    startYear: { type: String, default: "" },
    endYear: { type: String, default: "" },
  },
  { _id: false },
);

const experienceSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    company: { type: String, default: "" },
    duration: { type: String, default: "" },
    description: { type: String, default: "" },
  },
  { _id: false },
);

const careerPreferencesSchema = new mongoose.Schema(
  {
    preferredRole: { type: String, default: "" },
    preferredLocation: { type: String, default: "" },
    employmentTypes: [{ type: String }],
  },
  { _id: false },
);

const profileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    // Basic Info
    name: { type: String, default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    location: { type: String, default: "" },
    linkedin: { type: String, default: "" },
    github: { type: String, default: "" },
    portfolio: { type: String, default: "" },

    // Professional
    summary: { type: String, default: "" },
    skills: [{ type: String }],
    education: [educationSchema],
    experience: [experienceSchema],
    careerPreferences: careerPreferencesSchema,

    // Meta
    isComplete: { type: Boolean, default: false },
    completionPercentage: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

module.exports = mongoose.model("Profile", profileSchema);
