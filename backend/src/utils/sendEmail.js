import nodemailer from 'nodemailer';
import config from '../config/index.js';

const wrapper = (content, { title }) => `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:0;background:#05070d;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#05070d;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#0a0f1c;border-radius:20px;overflow:hidden;box-shadow:0 24px 60px rgba(37,99,235,0.25);">
            <tr>
              <td align="center" style="background:linear-gradient(135deg,#1d4ed8 0%,#3b82f6 55%,#22d3ee 100%);padding:36px 24px 30px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center">
                      <div style="font-family:Arial,Helvetica,sans-serif;color:#ffffff;font-size:32px;font-weight:800;letter-spacing:1px;">Foodiq</div>
                      <div style="font-family:Arial,Helvetica,sans-serif;color:#cfe3ff;font-size:13px;letter-spacing:3px;text-transform:uppercase;margin-top:4px;">Smart Canteen Ordering</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 36px 30px;">
                ${content}
              </td>
            </tr>
            <tr>
              <td style="background:#0d1322;padding:20px 36px;border-top:1px solid #1e293b;">
                <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#64748b;line-height:1.6;text-align:center;">
                  You received this email because someone used this address on Foodiq.<br />
                  If that wasn't you, you can safely ignore this message.<br />
                  <span style="color:#22d3ee;font-weight:bold;">Foodiq — skip the queue, grab a bite.</span>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
`;

export const otpTemplate = ({ otp, expiresIn = '10 minutes' }) =>
  wrapper(
    `
    <div style="text-align:center;">
      <div style="font-family:Arial,Helvetica,sans-serif;color:#f1f5f9;font-size:22px;font-weight:800;margin:0 0 8px;">Almost there! 👋</div>
      <p style="font-family:Arial,Helvetica,sans-serif;color:#94a3b8;font-size:15px;line-height:1.7;margin:0 0 24px;">
        We've sent you this one-time password to verify your email address.<br />
        Use it to complete your Foodiq registration.
      </p>
      <div style="font-family:Arial,Helvetica,sans-serif;color:#94a3b8;font-size:13px;font-weight:600;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px;">Your verification code</div>
      <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="border-collapse:collapse;margin:0 auto;">
        <tr>
          <td style="background:linear-gradient(135deg,#0d1322,#111a33);border:2px solid #3b82f6;border-radius:16px;padding:16px 24px;font-family:'Courier New',monospace;font-size:34px;font-weight:800;letter-spacing:8px;color:#22d3ee;">
            <span style="-webkit-user-select:all;user-select:all;mso-user-select:all;">${otp}</span>
          </td>
        </tr>
      </table>
      <p style="font-family:Arial,Helvetica,sans-serif;color:#64748b;font-size:12.5px;margin:18px 0 0;">
        If you can't read the code, just select it with your mouse and press <strong style="color:#22d3ee;">Ctrl&nbsp;+&nbsp;C</strong>.
      </p>
      <p style="font-family:Arial,Helvetica,sans-serif;color:#64748b;font-size:13px;margin:14px 0 0;">
        ⏳ This code is valid for <strong style="color:#22d3ee;">${expiresIn}</strong>. Please don't share it with anyone.
      </p>
    </div>
  `,
    { title: 'Foodiq — Verify your email' }
  );

export const resetPasswordTemplate = ({ name, resetLink, expiresIn = '1 hour' }) =>
  wrapper(
    `
    <div style="text-align:center;">
      <div style="font-family:Arial,Helvetica,sans-serif;color:#f1f5f9;font-size:22px;font-weight:800;margin:0 0 8px;">Password reset 🔐</div>
      <p style="font-family:Arial,Helvetica,sans-serif;color:#94a3b8;font-size:15px;line-height:1.7;margin:0 0 24px;">
        Hello <strong style="color:#f1f5f9;">${name}</strong>, a password reset was requested for your Foodiq account.
        Click the button below to set a new password.
      </p>
      <a href="${resetLink}" target="_blank" rel="noopener" style="display:inline-block;background:linear-gradient(135deg,#1d4ed8 0%,#3b82f6 50%,#22d3ee 100%);color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;text-decoration:none;padding:16px 44px;border-radius:50px;box-shadow:0 10px 24px rgba(59,130,246,0.35);">
        Reset your password
      </a>
      <p style="font-family:Arial,Helvetica,sans-serif;color:#64748b;font-size:13px;line-height:1.7;margin:24px 0 0;word-break:break-all;">
        Or copy this link:<br /><a href="${resetLink}" style="color:#22d3ee;">${resetLink}</a>
      </p>
      <p style="font-family:Arial,Helvetica,sans-serif;color:#64748b;font-size:13px;margin:24px 0 0;">
        ⏳ This link is valid for <strong style="color:#22d3ee;">${expiresIn}</strong>. If you didn't request this, you can safely ignore this email.
      </p>
    </div>
  `,
    { title: 'Foodiq — Reset your password' }
  );

export const sendEmail = async ({ to, subject, text, html }) => {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (!emailUser || !emailPass) {
    console.log(`\n[DEV MODE EMAIL] To: ${to}`);
    console.log(`[DEV MODE EMAIL] Subject: ${subject}`);
    console.log(`[DEV MODE EMAIL] Body:\n${html || text}\n`);
    return { delivered: false, devMode: true };
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: emailUser, pass: emailPass },
  });

  await transporter.sendMail({
    from: `"Foodiq" <${emailUser}>`,
    to,
    subject,
    text: text || html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
    html,
  });

  return { delivered: true, devMode: false };
};

export const buildResetLink = (token) => `${config.clientUrl}/reset-password?token=${token}`;
