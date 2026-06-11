const express = require("express");
const router = express.Router();
const {
  saveProfile,
  updateProfile,
  getProfile,
} = require("../controllers/profile.controller");
const { protect } = require("../middleware/auth");

router.post("/", protect, saveProfile); // Create profile
router.put("/", protect, updateProfile); // Update profile
router.get("/", protect, getProfile); // Get profile

module.exports = router;
