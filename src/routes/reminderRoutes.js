const express = require('express');
const router = express.Router();
const {
  getReminders, getUpcomingReminders, createReminder,
  updateReminder, completeReminder, deleteReminder,
} = require('../controllers/reminderController');
const { protect } = require('../middleware/auth');
const { createReminderValidator, mongoIdValidator } = require('../middleware/validators');

router.use(protect);

router.get('/upcoming', getUpcomingReminders);

router.route('/')
  .get(getReminders)
  .post(createReminderValidator, createReminder);

router.route('/:id')
  .put(mongoIdValidator(), updateReminder)
  .delete(mongoIdValidator(), deleteReminder);

router.put('/:id/complete', mongoIdValidator(), completeReminder);

module.exports = router;
