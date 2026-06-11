const express = require("express");
const router = express.Router();
const {
  getJobs,
  getJob,
  createJob,
  updateJob,
  deleteJob,
  bulkDeleteJobs,
  bulkUpdateStatus,
  toggleBookmark,
  togglePin,
  toggleBlacklist,
  markFollowUpSent,
  addInterviewRound,
  updateInterviewRound,
  updateChecklist,
  exportExcel,
  exportCSV,
  importJobs,
  getEmailTemplate,
  saveDraft,
  getDrafts,
} = require("../controllers/jobController");
const { protect } = require("../middleware/auth");
const { uploadImport } = require("../middleware/upload");
const {
  createJobValidator,
  updateJobValidator,
  mongoIdValidator,
} = require("../middleware/validators");

router.use(protect);

// Export/Import (before /:id to avoid route conflicts)
router.get("/export/excel", exportExcel);
router.get("/export/csv", exportCSV);
router.post("/import", uploadImport.single("file"), importJobs);

// Drafts
router.get("/drafts", getDrafts);
router.post("/draft", saveDraft);

// Bulk actions
router.delete("/bulk", bulkDeleteJobs);
router.put("/bulk-status", bulkUpdateStatus);

// CRUD
router.route("/").get(getJobs).post(createJobValidator, createJob);

router
  .route("/:id")
  .get(mongoIdValidator(), getJob)
  .put(updateJobValidator, updateJob)
  .delete(mongoIdValidator(), deleteJob);

// Smart actions
router.put("/:id/bookmark", mongoIdValidator(), toggleBookmark);
router.put("/:id/pin", mongoIdValidator(), togglePin);
router.put("/:id/blacklist", mongoIdValidator(), toggleBlacklist);
router.put("/:id/follow-up-sent", mongoIdValidator(), markFollowUpSent);
router.put("/:id/checklist", mongoIdValidator(), updateChecklist);

// Interview rounds
router.post("/:id/interview-rounds", mongoIdValidator(), addInterviewRound);
router.put("/:id/interview-rounds/:roundId", updateInterviewRound);

// Email template generator
router.get("/:id/email-template", mongoIdValidator(), getEmailTemplate);

module.exports = router;
