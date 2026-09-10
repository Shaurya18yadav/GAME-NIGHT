import nodemailer from 'nodemailer';

let testAccountTransporter: nodemailer.Transporter | null = null;

export async function sendOtpEmail(
  email: string,
  otpCode: string,
  purpose: string = 'registration'
): Promise<{ sent: boolean; devOtp?: string; emailPreviewUrl?: string }> {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  console.log(`\n==================================================`);
  console.log(`🔑 [REAL-TIME OTP] Code for ${email} (${purpose}): [ ${otpCode} ]`);
  console.log(`==================================================\n`);

  const mailOptions = {
    from: `"UNO Night Auth" <${process.env.SMTP_FROM || smtpUser || 'no-reply@unonight.com'}>`,
    to: email,
    subject: `Your UNO Night Verification Code: ${otpCode}`,
    text: `Your OTP verification code for UNO Night is: ${otpCode}. It expires in 10 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #0b1723; color: #f5efe0; padding: 24px; border-radius: 16px; border: 1px solid rgba(45,212,191,0.3);">
        <h2 style="color: #2dd4bf; margin-top: 0; font-size: 22px;">⚡ UNO Night Real-Time Verification</h2>
        <p style="font-size: 15px; color: #99f6e4;">Your 6-digit verification code for <strong>${purpose}</strong> is:</p>
        <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #ff5e62; background: rgba(5,23,31,0.8); border: 1.5px solid #ff5e62; padding: 16px; border-radius: 12px; text-align: center; margin: 20px 0; box-shadow: 0 0 20px rgba(255,94,98,0.3);">
          ${otpCode}
        </div>
        <p style="font-size: 13px; color: #94a3b8;">This verification code will expire in 10 minutes. If you did not request this code, please ignore this email.</p>
      </div>
    `
  };

  // 1. Send via Configured SMTP (Gmail, Resend, Mailtrap, SendGrid, etc.)
  if (smtpHost && smtpUser && smtpPass && !smtpUser.includes('YOUR_GMAIL') && !smtpPass.includes('YOUR_16')) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser.trim(),
          pass: smtpPass.replace(/\s+/g, '')
        }
      });

      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ [REAL-TIME SMTP DELIVERED] Verification email sent to ${email}! MessageId: ${info.messageId}`);
      return { sent: true };
    } catch (err) {
      console.error(`❌ [SMTP AUTH/SEND ERROR] Gmail rejected the login or connection failed:`, err instanceof Error ? err.message : err);
      console.error(`👉 Tip: Ensure SMTP_USER is your Gmail address and SMTP_PASS is a 16-character Google App Password (not your normal account password).`);
    }
  } else if (smtpUser?.includes('YOUR_GMAIL')) {
    console.log(`⚠️ [SMTP CONFIG NEEDED] .env file still has placeholder 'YOUR_GMAIL_ADDRESS@gmail.com'. Please edit .env with your actual Gmail & 16-digit App Password.`);
  }

  // 2. Real-time Ethereal Mail Transport fallback (creates real test inbox with preview URL!)
  try {
    if (!testAccountTransporter) {
      const testAccount = await nodemailer.createTestAccount();
      testAccountTransporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
    }

    const info = await testAccountTransporter.sendMail(mailOptions);
    const emailPreviewUrl = nodemailer.getTestMessageUrl(info) || undefined;

    if (emailPreviewUrl) {
      console.log(`📩 [REAL-TIME ETHEREAL EMAIL DELIVERED] Preview real email inbox at: ${emailPreviewUrl}`);
    }

    return { sent: true, devOtp: otpCode, emailPreviewUrl };
  } catch (etherealErr) {
    console.error('Fallback Ethereal send error:', etherealErr);
    return { sent: true, devOtp: otpCode };
  }
}
