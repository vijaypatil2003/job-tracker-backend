const cron = require('node-cron');
const Reminder = require('../models/Reminder');
const User = require('../models/User');
const { sendEmail } = require('../utils/email');
const logger = require('../utils/logger');

/**
 * Send email notifications for due reminders
 * Runs every 15 minutes
 */
const sendReminderNotifications = cron.schedule('*/15 * * * *', async () => {
  logger.info('Cron: checking due reminders...');
  try {
    const now = new Date();
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);

    const dueReminders = await Reminder.find({
      isCompleted: false,
      isSent: false,
      sendEmail: true,
      remindAt: { $gte: fifteenMinutesAgo, $lte: now },
    }).populate('user', 'name email preferences');

    logger.info(`Cron: found ${dueReminders.length} due reminders`);

    for (const reminder of dueReminders) {
      const user = reminder.user;
      if (!user?.preferences?.emailNotifications) continue;

      try {
        await sendEmail({
          to: user.email,
          subject: `⏰ Reminder: ${reminder.title}`,
          text: `Hi ${user.name},\n\nThis is your reminder: ${reminder.title}\n\n${reminder.description || ''}`,
          html: `
            <div style="font-family:Arial,sans-serif;padding:20px;">
              <h2 style="color:#4F46E5;">⏰ Reminder</h2>
              <h3>${reminder.title}</h3>
              ${reminder.description ? `<p>${reminder.description}</p>` : ''}
              <p style="color:#666;font-size:12px;">Scheduled for: ${new Date(reminder.remindAt).toLocaleString()}</p>
              <a href="${process.env.CLIENT_URL}/reminders" style="background:#4F46E5;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">View Reminders</a>
            </div>
          `,
        });

        reminder.isSent = true;
        reminder.sentAt = now;
        await reminder.save();
        logger.info(`Reminder email sent to ${user.email}: ${reminder.title}`);
      } catch (emailErr) {
        logger.error(`Failed to send reminder email to ${user.email}: ${emailErr.message}`);
      }
    }
  } catch (err) {
    logger.error(`Reminder cron error: ${err.message}`);
  }
}, { scheduled: false });

/**
 * Reset daily streak if user missed a day
 * Runs at midnight
 */
const checkStreaks = cron.schedule('0 0 * * *', async () => {
  logger.info('Cron: checking streaks...');
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    // Users who had activity but not yesterday — streak broken
    const result = await User.updateMany(
      {
        lastActivityDate: { $lt: yesterday },
        currentStreak: { $gt: 0 },
      },
      { $set: { currentStreak: 0 } }
    );
    logger.info(`Cron: reset streaks for ${result.modifiedCount} users`);
  } catch (err) {
    logger.error(`Streak cron error: ${err.message}`);
  }
}, { scheduled: false });

/**
 * Start all cron jobs
 */
const startCronJobs = () => {
  if (process.env.NODE_ENV === 'test') return;
  sendReminderNotifications.start();
  checkStreaks.start();
  logger.info('Cron jobs started');
};

const stopCronJobs = () => {
  sendReminderNotifications.stop();
  checkStreaks.stop();
  logger.info('Cron jobs stopped');
};

module.exports = { startCronJobs, stopCronJobs };
