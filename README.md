# Job Tracker Pro — Backend

Production-ready REST API built with Node.js, Express.js, and MongoDB.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ |
| Framework | Express.js 4 |
| Database | MongoDB + Mongoose 8 |
| Auth | JWT + bcryptjs |
| File Upload | Multer |
| Email | Nodemailer (SMTP) |
| Scheduling | node-cron |
| Export | SheetJS (xlsx) |
| Logging | Winston |
| Validation | express-validator |
| Security | Helmet, mongo-sanitize, CORS, hpp |

---

## Project Structure

```
src/
├── config/
│   └── database.js          # MongoDB connection
├── controllers/
│   ├── authController.js    # Register, login, forgot/reset password
│   ├── jobController.js     # Full CRUD + smart actions + export/import
│   ├── analyticsController.js # Dashboard stats + charts data
│   ├── resumeController.js  # Resume CRUD + file management
│   └── reminderController.js # Reminder CRUD + notifications
├── middleware/
│   ├── auth.js              # JWT protect + role authorize
│   ├── errorHandler.js      # Global error handler
│   ├── upload.js            # Multer configs (resume, avatar, import)
│   └── validators.js        # express-validator rules
├── models/
│   ├── User.js              # User + streak + preferences
│   ├── JobApplication.js    # Core job model with embedded subdocs
│   ├── Resume.js            # Resume file metadata
│   ├── Reminder.js          # Reminders with recurrence
│   └── ActivityLog.js       # Global audit log
├── routes/
│   ├── authRoutes.js
│   ├── jobRoutes.js
│   ├── analyticsRoutes.js
│   ├── resumeRoutes.js
│   └── reminderRoutes.js
├── services/
│   └── cronService.js       # Reminder emails + streak resets
├── utils/
│   ├── AppError.js          # Custom error class + response helpers
│   ├── email.js             # Nodemailer + email templates
│   ├── emailTemplates.js    # AI follow-up email generator
│   ├── exportHelper.js      # Excel/CSV export + CSV import
│   ├── logger.js            # Winston logger
│   └── pagination.js        # Pagination + sort + filter helpers
├── app.js                   # Express app (middleware + routes)
└── server.js                # HTTP server + startup
```

---

## Quick Start

### 1. Clone and install

```bash
git clone <repo-url>
cd job-tracker-backend
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
# Edit .env with your values
```

### 3. Run in development

```bash
npm run dev
```

### 4. Run in production

```bash
NODE_ENV=production npm start
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | Yes | `development` / `production` |
| `PORT` | No | Server port (default: 5000) |
| `CLIENT_URL` | Yes | Frontend URL for CORS |
| `MONGO_URI` | Yes | MongoDB Atlas connection string |
| `JWT_SECRET` | Yes | Min 32-char random string |
| `JWT_EXPIRE` | Yes | Token expiry e.g. `7d` |
| `JWT_COOKIE_EXPIRE` | Yes | Cookie expiry in days e.g. `7` |
| `SMTP_HOST` | Yes | SMTP host e.g. `smtp.gmail.com` |
| `SMTP_PORT` | Yes | SMTP port e.g. `587` |
| `SMTP_EMAIL` | Yes | Sender email address |
| `SMTP_PASSWORD` | Yes | App password (not your login password) |
| `FROM_EMAIL` | Yes | From email in sent mails |
| `FROM_NAME` | Yes | From name in sent mails |
| `MAX_FILE_UPLOAD` | No | Max resume size in bytes (default: 5MB) |
| `FILE_UPLOAD_PATH` | No | Resume storage path |

---

## API Reference

### Base URL: `/api/v1`

---

### Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | ❌ | Register new user |
| POST | `/auth/login` | ❌ | Login and get JWT |
| POST | `/auth/logout` | ❌ | Clear auth cookie |
| GET | `/auth/me` | ✅ | Get current user |
| PUT | `/auth/me` | ✅ | Update profile |
| PUT | `/auth/update-password` | ✅ | Change password |
| PUT | `/auth/avatar` | ✅ | Upload avatar |
| POST | `/auth/forgot-password` | ❌ | Send reset email |
| PUT | `/auth/reset-password/:token` | ❌ | Reset password |

---

### Jobs

| Method | Endpoint | Description |
|---|---|---|
| GET | `/jobs` | List jobs (paginated, filtered, sorted) |
| POST | `/jobs` | Create job application |
| GET | `/jobs/:id` | Get single job |
| PUT | `/jobs/:id` | Update job |
| DELETE | `/jobs/:id` | Delete job |
| DELETE | `/jobs/bulk` | Bulk delete jobs |
| PUT | `/jobs/bulk-status` | Bulk update status |
| PUT | `/jobs/:id/bookmark` | Toggle bookmark |
| PUT | `/jobs/:id/pin` | Toggle pin |
| PUT | `/jobs/:id/blacklist` | Toggle blacklist |
| PUT | `/jobs/:id/follow-up-sent` | Mark follow-up sent |
| PUT | `/jobs/:id/checklist` | Update interview checklist |
| POST | `/jobs/:id/interview-rounds` | Add interview round |
| PUT | `/jobs/:id/interview-rounds/:roundId` | Update interview round |
| GET | `/jobs/:id/email-template` | Generate follow-up email |
| GET | `/jobs/export/excel` | Export to Excel |
| GET | `/jobs/export/csv` | Export to CSV |
| POST | `/jobs/import` | Import from CSV/Excel |
| GET | `/jobs/drafts` | Get draft applications |
| POST | `/jobs/draft` | Save/update a draft |

#### Query Parameters for GET /jobs

| Param | Type | Example |
|---|---|---|
| `search` | string | `?search=Google` |
| `status` | string (comma) | `?status=Applied,Interview` |
| `priority` | string (comma) | `?priority=High,Urgent` |
| `jobType` | string (comma) | `?jobType=Remote,Hybrid` |
| `source` | string | `?source=LinkedIn` |
| `location` | string | `?location=Bangalore` |
| `isBookmarked` | boolean | `?isBookmarked=true` |
| `isPinned` | boolean | `?isPinned=true` |
| `appliedFrom` | ISO date | `?appliedFrom=2025-01-01` |
| `appliedTo` | ISO date | `?appliedTo=2025-12-31` |
| `sort` | string | `?sort=latest\|oldest\|company\|status\|priority\|followUp` |
| `page` | number | `?page=1` |
| `limit` | number | `?limit=20` |

#### Email Template Types

`?type=followUp` `?type=interviewThankYou` `?type=offerNegotiation` `?type=withdrawal`

---

### Analytics

| Method | Endpoint | Description |
|---|---|---|
| GET | `/analytics/overview` | Dashboard KPIs + status counts |
| GET | `/analytics/monthly` | Applications per month (12mo) |
| GET | `/analytics/cities` | Top 10 cities |
| GET | `/analytics/sources` | Applications by source |
| GET | `/analytics/job-types` | Remote/Hybrid/Onsite breakdown |
| GET | `/analytics/priorities` | Priority breakdown |
| GET | `/analytics/weekly` | Last 4 weeks comparison |
| GET | `/analytics/activity` | Recent activity log |

---

### Resumes

| Method | Endpoint | Description |
|---|---|---|
| GET | `/resumes` | List all resumes |
| POST | `/resumes` | Upload resume (multipart) |
| GET | `/resumes/:id` | Get resume metadata |
| PUT | `/resumes/:id` | Update label/tags |
| DELETE | `/resumes/:id` | Delete resume + file |
| GET | `/resumes/:id/download` | Download resume file |

---

### Reminders

| Method | Endpoint | Description |
|---|---|---|
| GET | `/reminders` | List reminders (filterable) |
| GET | `/reminders/upcoming` | Next 7 days reminders |
| POST | `/reminders` | Create reminder |
| PUT | `/reminders/:id` | Update reminder |
| PUT | `/reminders/:id/complete` | Mark as complete |
| DELETE | `/reminders/:id` | Delete reminder |

---

## Job Application Status Flow

```
Not Applied → Applied → Interview → Assignment
                      ↘ HR Round → Technical Round
                                         ↓
                              Offer Received → Selected
                                         ↓
                                      Rejected
```

---

## Database Models

### User
- name, email, password (hashed), avatar, role
- dailyGoal, currentStreak, longestStreak, lastActivityDate
- preferences (theme, defaultView, emailNotifications)
- resetPasswordToken, resetPasswordExpire, lastLogin

### JobApplication
- user (ref), companyName, jobRole, jobUrl, jobDescription
- hrName, hrEmail, phone, companyAddress
- location, jobType, salary, expectedSalary, offeredSalary, source
- status, priority, appliedDate, followUpDate, interviewDate
- followUpEmailSent, resumeUsed (ref), notes, hrFeedback
- companyRating, isBookmarked, isPinned, isBlacklisted
- interviewChecklist[], interviewRounds[], activityLog[]
- isDraft, tags[]

### Resume
- user (ref), label, fileName, originalName, filePath
- fileSize, mimeType, tags[], isDefault, version, description

### Reminder
- user (ref), job (ref), title, description, type
- remindAt, isCompleted, isSent, sendEmail, priority
- isRecurring, recurrencePattern

### ActivityLog
- user (ref), job (ref), action (enum), description, metadata

---

## Deployment

### MongoDB Atlas
1. Create a free cluster at [mongodb.com](https://mongodb.com)
2. Add your IP to the allowlist
3. Copy the connection string to `MONGO_URI`

### Render.com (Recommended)
1. Push to GitHub
2. New Web Service → connect repo
3. Build: `npm install`, Start: `npm start`
4. Add all environment variables

### Railway
1. `railway login && railway init`
2. Set environment variables
3. `railway up`

---

## Security Features

- JWT with httpOnly secure cookie
- Helmet (15 HTTP security headers)
- MongoDB injection prevention (mongo-sanitize)
- Rate limiting (100 req/15min)
- CORS whitelist
- Request size limits (10MB)
- Input validation on all routes
- Password hashing (bcrypt, cost 12)
- Error messages don't leak stack traces in production

---

## Cron Jobs

| Job | Schedule | Description |
|---|---|---|
| Reminder notifications | Every 15 min | Send email for due reminders |
| Streak reset | Midnight daily | Reset streak for inactive users |
