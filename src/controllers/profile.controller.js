const Profile = require("../models/profile.model");

const calculateCompletion = (data) => {
  const checks = [
    !!(data.name && data.email),
    !!(data.summary && data.summary.length > 20),
    !!(data.skills && data.skills.length > 0),
    !!(data.education && data.education.length > 0),
    !!(data.experience && data.experience.length > 0),
    !!data.careerPreferences?.preferredRole,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
};

// POST /api/v1/profile — create
const saveProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    const existing = await Profile.findOne({ user: userId });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Profile already exists. Use PUT to update.",
      });
    }

    const {
      name,
      email,
      phone,
      location,
      linkedin,
      github,
      portfolio,
      summary,
      skills,
      education,
      experience,
      preferredRole,
      preferredLocation,
      employmentTypes,
    } = req.body;

    const careerPreferences = {
      preferredRole: preferredRole || "",
      preferredLocation: preferredLocation || "",
      employmentTypes: employmentTypes || [],
    };

    const completionPercentage = calculateCompletion({
      name,
      email,
      summary,
      skills,
      education,
      experience,
      careerPreferences,
    });

    const profile = await Profile.create({
      user: userId,
      name,
      email,
      phone,
      location,
      linkedin,
      github,
      portfolio,
      summary,
      skills,
      education: education || [],
      experience: experience || [],
      careerPreferences,
      completionPercentage,
      isComplete: completionPercentage === 100,
    });

    res.status(201).json({ success: true, data: profile });
  } catch (err) {
    console.error("Save profile error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/v1/profile — update
const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    const profile = await Profile.findOne({ user: userId });
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found. Create one first.",
      });
    }

    const {
      name,
      email,
      phone,
      location,
      linkedin,
      github,
      portfolio,
      summary,
      skills,
      education,
      experience,
      preferredRole,
      preferredLocation,
      employmentTypes,
    } = req.body;

    const careerPreferences = {
      preferredRole:
        preferredRole ?? profile.careerPreferences?.preferredRole ?? "",
      preferredLocation:
        preferredLocation ?? profile.careerPreferences?.preferredLocation ?? "",
      employmentTypes:
        employmentTypes ?? profile.careerPreferences?.employmentTypes ?? [],
    };

    // Only update fields that are sent
    profile.name = name ?? profile.name;
    profile.email = email ?? profile.email;
    profile.phone = phone ?? profile.phone;
    profile.location = location ?? profile.location;
    profile.linkedin = linkedin ?? profile.linkedin;
    profile.github = github ?? profile.github;
    profile.portfolio = portfolio ?? profile.portfolio;
    profile.summary = summary ?? profile.summary;
    profile.skills = skills ?? profile.skills;
    profile.education = education ?? profile.education;
    profile.experience = experience ?? profile.experience;
    profile.careerPreferences = careerPreferences;

    profile.completionPercentage = calculateCompletion({
      name: profile.name,
      email: profile.email,
      summary: profile.summary,
      skills: profile.skills,
      education: profile.education,
      experience: profile.experience,
      careerPreferences: profile.careerPreferences,
    });

    profile.isComplete = profile.completionPercentage === 100;

    await profile.save();

    res.status(200).json({ success: true, data: profile });
  } catch (err) {
    console.error("Update profile error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/v1/profile
const getProfile = async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user._id });
    if (!profile) {
      return res
        .status(404)
        .json({ success: false, message: "Profile not found." });
    }
    res.status(200).json({ success: true, data: profile });
  } catch (err) {
    console.error("Get profile error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { saveProfile, updateProfile, getProfile };
