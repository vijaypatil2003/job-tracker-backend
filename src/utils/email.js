const nodemailer = require('nodemailer');
const logger = require('./logger');

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD,
    },
  });
};

/**
 * Send a plain/HTML email
 */
const sendEmail = async ({ to, subject, text, html }) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
    to,
    subject,
    text,
    html,
  };

  const info = await transporter.sendMail(mailOptions);
  logger.info(`Email sent to ${to}: ${info.messageId}`);
  return info;
};

/**
 * Password reset email
 */
const sendPasswordResetEmail = async (email, resetToken, resetUrl) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><title>Password Reset</title></head>
    <body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:20px;">
      <div style="max-width:600px;margin:auto;background:#fff;border-radius:8px;padding:40px;box-shadow:0 2px 10px rgba(0,0,0,0.1);">
        <h2 style="color:#4F46E5;margin-bottom:8px;">Job Tracker Pro</h2>
        <h3>Password Reset Request</h3>
        <p>You requested a password reset. Click the button below to reset your password.</p>
        <p>This link will expire in <strong>10 minutes</strong>.</p>
        <a href="${resetUrl}" style="display:inline-block;background:#4F46E5;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;margin:20px 0;font-weight:600;">
          Reset Password
        </a>
        <p style="font-size:12px;color:#999;">If you didn't request this, please ignore this email. Your password will remain unchanged.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
        <p style="font-size:12px;color:#999;">© ${new Date().getFullYear()} Job Tracker Pro. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;
  await sendEmail({
    to: email,
    subject: 'Job Tracker Pro - Password Reset',
    text: `Reset your password: ${resetUrl}`,
    html,
  });
};

/**
 * Welcome email after registration
 */
const sendWelcomeEmail = async (email, name) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><title>Welcome</title></head>
    <body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:20px;">
      <div style="max-width:600px;margin:auto;background:#fff;border-radius:8px;padding:40px;box-shadow:0 2px 10px rgba(0,0,0,0.1);">
        <h2 style="color:#4F46E5;">Welcome to Job Tracker Pro! 🎉</h2>
        <p>Hi <strong>${name}</strong>,</p>
        <p>Your account has been created successfully. Start tracking your job applications and land your dream job!</p>
        <ul>
          <li>Track all your job applications</li>
          <li>Set follow-up reminders</li>
          <li>Analyze your application stats</li>
          <li>Manage your resumes</li>
        </ul>
        <p>Good luck with your job search! 💼</p>
        <p style="font-size:12px;color:#999;">© ${new Date().getFullYear()} Job Tracker Pro</p>
      </div>
    </body>
    </html>
  `;
  await sendEmail({
    to: email,
    subject: 'Welcome to Job Tracker Pro!',
    text: `Hi ${name}, welcome to Job Tracker Pro!`,
    html,
  });
};

module.exports = { sendEmail, sendPasswordResetEmail, sendWelcomeEmail };
