const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const compression = require("compression");
const mongoSanitize = require("express-mongo-sanitize");
const path = require("path");

const errorHandler = require("./middleware/errorHandler");
const { AppError } = require("./utils/AppError");
const logger = require("./utils/logger");

// Routes
const authRoutes = require("./routes/authRoutes");
const profileRoutes = require("./routes/profileRoutes");

const jobRoutes = require("./routes/jobRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const resumeRoutes = require("./routes/resumeRoutes");
const resumeParseRoute = require("./routes/resumeParseRoute");
const reminderRoutes = require("./routes/reminderRoutes");
const aiRoutes = require("./routes/aiRoutes");

const app = express();

// ── Security Middleware ───────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // allow static file serving
  }),
);

app.use(mongoSanitize()); // Prevent NoSQL injection

// CORS
const allowedOrigins = (
  process.env.CLIENT_URL || "http://localhost:5173"
).split(",");
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin))
        return callback(null, true);
      callback(new Error(`CORS: Origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// ── General Middleware ────────────────────────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// HTTP request logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(
    morgan("combined", {
      stream: { write: (msg) => logger.http(msg.trim()) },
    }),
  );
}

// ── Static Files ──────────────────────────────────────────────────────────────
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// ── Health Check ──────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "OK",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || "1.0.0",
  });
});

// ── API Routes ────────────────────────────────────────────────────────────────
const API_PREFIX = "/api/v1";
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/jobs`, jobRoutes);
app.use(`${API_PREFIX}/analytics`, analyticsRoutes);
app.use(`${API_PREFIX}/resumes`, resumeRoutes);
app.use(`${API_PREFIX}/resume/parse`, resumeParseRoute);
app.use(`${API_PREFIX}/reminders`, reminderRoutes);
app.use(`${API_PREFIX}/ai`, aiRoutes);
app.use(`${API_PREFIX}/ai`, aiRoutes);
app.use(`${API_PREFIX}/profile`, profileRoutes);

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.all("*", (req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found.`, 404));
});

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
