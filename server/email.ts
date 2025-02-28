import nodemailer from "nodemailer";

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  throw new Error("Email credentials are required");
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Use App Password from Gmail
  },
});

export async function sendVerificationEmail(email: string, token: string) {
  const verificationLink = `${process.env.APP_URL}/verify-email?token=${token}`;

  console.log('Sending verification email:', {
    to: email,
    from: process.env.EMAIL_USER,
    link: verificationLink
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Verify Your Email - NOMW",
    html: `
      <h1>Welcome to NOMW!</h1>
      <p>Thank you for registering. Please click the link below to verify your email address:</p>
      <a href="${verificationLink}">${verificationLink}</a>
      <p>This link will expire in 24 hours.</p>
      <p>If you didn't request this verification, please ignore this email.</p>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.response);
    return info;
  } catch (error: any) {
    console.error("Email sending error:", error);
    throw new Error(`Failed to send verification email: ${error.message}`);
  }
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetLink = `${process.env.APP_URL}/reset-password?token=${token}`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Reset Your Password - NOMW",
    html: `
      <h1>Password Reset Request</h1>
      <p>You requested to reset your password. Click the link below to reset it:</p>
      <a href="${resetLink}">${resetLink}</a>
      <p>This link will expire in 1 hour. If you didn't request this, please ignore this email.</p>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent successfully:', info.response);
    return info;
  } catch (error: any) {
    console.error("Email sending error:", error);
    throw new Error(`Failed to send password reset email: ${error.message}`);
  }
}