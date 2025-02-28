import nodemailer from "nodemailer";

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  throw new Error("Email credentials are required");
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendVerificationEmail(email: string, token: string) {
  const verificationLink = `${process.env.APP_URL}/verify-email?token=${token}`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Verify Your Email",
    html: `
      <h1>Welcome to NOMW!</h1>
      <p>Thank you for registering. Please click the link below to verify your email address:</p>
      <a href="${verificationLink}">${verificationLink}</a>
      <p>This link will expire in 24 hours.</p>
    `,
  };

  await transporter.sendMail(mailOptions);
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetLink = `${process.env.APP_URL}/reset-password?token=${token}`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Reset Your Password",
    html: `
      <h1>Password Reset Request</h1>
      <p>You requested to reset your password. Click the link below to reset it:</p>
      <a href="${resetLink}">${resetLink}</a>
      <p>This link will expire in 1 hour. If you didn't request this, please ignore this email.</p>
    `,
  };

  await transporter.sendMail(mailOptions);
}
