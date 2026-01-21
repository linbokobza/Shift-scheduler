import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

const getEmailConfig = (): EmailConfig => {
  return {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER || '',
      pass: process.env.EMAIL_PASS || '',
    },
  };
};

const createTransporter = () => {
  const config = getEmailConfig();

  if (!config.auth.user || !config.auth.pass) {
    logger.warn('Email credentials not configured. Email sending will be disabled.');
    return null;
  }

  return nodemailer.createTransport(config);
};

const getPasswordResetEmailTemplate = (resetLink: string): { html: string; text: string } => {
  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>איפוס סיסמה</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center; background-color: #2563eb; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px;">איפוס סיסמה</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                שלומות,
              </p>
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                קיבלנו בקשה לאיפוס הסיסמה שלך. לחצו על הכפתור למטה כדי לבחור סיסמה חדשה:
              </p>

              <!-- Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${resetLink}"
                       style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
                      איפוס סיסמה
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                קישור זה יפוג תוך <strong>15 דקות</strong>.
              </p>

              <p style="margin: 20px 0 0 0; color: #666666; font-size: 14px; line-height: 1.6;">
                אם לא ביקשת לאפס את הסיסמה, ניתן להתעלם מהודעה זו.
              </p>

              <!-- Link fallback -->
              <div style="margin-top: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 6px;">
                <p style="margin: 0 0 10px 0; color: #666666; font-size: 12px;">
                  אם הכפתור לא עובד, העתיקו את הקישור הבא לדפדפן:
                </p>
                <p style="margin: 0; word-break: break-all;">
                  <a href="${resetLink}" style="color: #2563eb; font-size: 12px;">${resetLink}</a>
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; text-align: center; background-color: #f8f9fa; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; color: #999999; font-size: 12px;">
                הודעה זו נשלחה אוטומטית. אנא אל תשיבו להודעה זו.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
איפוס סיסמה

היי,

קיבלנו בקשה לאיפוס הסיסמה שלך.

לאיפוס הסיסמה, היכנסו לקישור הבא:
${resetLink}

קישור זה יפוג תוך 15 דקות.

אם לא ביקשת לאפס את הסיסמה, ניתן להתעלם מהודעה זו.
  `.trim();

  return { html, text };
};

export const sendPasswordResetEmail = async (
  email: string,
  resetLink: string
): Promise<boolean> => {
  const transporter = createTransporter();

  if (!transporter) {
    logger.warn(`Email not configured. Reset link for ${email}: ${resetLink}`);
    return false;
  }

  const { html, text } = getPasswordResetEmailTemplate(resetLink);
  const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER;

  try {
    await transporter.sendMail({
      from: `"מערכת משמרות" <${fromEmail}>`,
      to: email,
      subject: 'איפוס סיסמה',
      text,
      html,
    });

    logger.info(`Password reset email sent to: ${email}`);
    return true;
  } catch (error) {
    logger.error(`Failed to send password reset email to ${email}:`, error);
    return false;
  }
};
