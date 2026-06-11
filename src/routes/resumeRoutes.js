const express = require("express");
const router = express.Router();
const {
  getResumes,
  uploadResume,
  getResume,
  updateResume,
  deleteResume,
  downloadResume,
} = require("../controllers/resumeController");
const { protect } = require("../middleware/auth");
const {
  uploadResume: uploadResumeMiddleware,
} = require("../middleware/upload");
const { mongoIdValidator } = require("../middleware/validators");

router.use(protect);

router
  .route("/")
  .get(getResumes)
  .post(uploadResumeMiddleware.single("resume"), uploadResume);

router
  .route("/:id")
  .get(mongoIdValidator(), getResume)
  .put(mongoIdValidator(), updateResume)
  .delete(mongoIdValidator(), deleteResume);

router.get("/:id/download", mongoIdValidator(), downloadResume);

module.exports = router;
