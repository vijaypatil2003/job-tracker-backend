const express = require("express");
const router = express.Router();
const {
  extractJobDetails,
  getFitScore,
} = require("../controllers/aiController");
const { protect } = require("../middleware/auth");

router.post("/extract", extractJobDetails);
router.post("/fit-score", protect, getFitScore);

module.exports = router;
