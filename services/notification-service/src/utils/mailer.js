const nodemailer = require('nodemailer');

/**
 * Create transporter using SMTP settings from .env
 * For development, you can use test credentials or configure gmail/sendgrid
 */
function createTransporter() {
  const config = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  };

  if (!config.auth.user || !config.auth.pass) {
    console.warn('SMTP credentials not fully configured - email sending will be mocked');
    return null;
  }

  return nodemailer.createTransport(config);
}

/**
 * Send email notification (with fallback for missing SMTP)
 */
async function sendEmail(to, subject, text, html = null) {
  const transporter = createTransporter();
  if (!transporter) {
    console.log('[MOCK EMAIL]', { to, subject, text });
    return { success: true, mocked: true };
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@eapp.com',
      to,
      subject,
      text,
      html: html || text,
    });
    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email send failed:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  createTransporter,
  sendEmail,
};
