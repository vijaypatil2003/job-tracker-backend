const express = require('express');
const router = express.Router();
const {
  getOverview, getMonthlyStats, getCityStats, getSourceStats,
  getJobTypeStats, getPriorityStats, getWeeklyReport, getRecentActivity,
} = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/overview', getOverview);
router.get('/monthly', getMonthlyStats);
router.get('/cities', getCityStats);
router.get('/sources', getSourceStats);
router.get('/job-types', getJobTypeStats);
router.get('/priorities', getPriorityStats);
router.get('/weekly', getWeeklyReport);
router.get('/activity', getRecentActivity);

module.exports = router;
