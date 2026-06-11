// const express = require("express");
// const router = express.Router();
// const { parseResume } = require("../controllers/resumeParseController");
// const { protect } = require("../middleware/auth");
// const multer = require("multer");

// const upload = multer({
//   dest: "uploads/temp/",
//   limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
//   fileFilter: (req, file, cb) => {
//     const allowed = [
//       "application/pdf",
//       "application/msword",
//       "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
//     ];
//     allowed.includes(file.mimetype)
//       ? cb(null, true)
//       : cb(new AppError("PDF or Word only", 400));
//   },
// });

// router.post("/", protect, upload.single("resume"), parseResume);
// module.exports = router;

const express = require("express");
const multer = require("multer");
const { parseResume } = require("../controllers/resumeParseController");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/parse-resume", upload.single("resume"), parseResume);

module.exports = router;
