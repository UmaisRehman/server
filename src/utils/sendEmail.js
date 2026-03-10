import nodemailer from "nodemailer";

export const sendOTPEmail = async (toEmail, otpCode) => {
  // Moved transporter inside the function to ensure process.env variables 
  // are loaded by dotenv BEFORE we try to access EMAIL_USER and EMAIL_PASS
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
  const mailOptions = {
    from: `"Portfolio Admin" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "🔐 Your Login OTP Code",
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 420px; margin: 0 auto; padding: 30px; background: linear-gradient(135deg, #0f0c29, #302b63, #24243e); border-radius: 16px; color: #fff;">
        <h2 style="text-align: center; margin-bottom: 10px;">Portfolio Admin</h2>
        <p style="text-align: center; color: #a5b4fc;">Your one-time login code</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="font-size: 36px; font-weight: bold; letter-spacing: 12px; background: rgba(255,255,255,0.1); padding: 16px 32px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.2);">${otpCode}</span>
        </div>
        <p style="text-align: center; font-size: 13px; color: #94a3b8;">This code expires in <strong>5 minutes</strong>.</p>
        <p style="text-align: center; font-size: 12px; color: #64748b; margin-top: 20px;">If you didn't request this, ignore this email.</p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};
