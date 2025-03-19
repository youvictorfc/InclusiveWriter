import nodemailer from "nodemailer";
import { User } from "@shared/schema";

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || "587"),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  tls: {
    ciphers: 'SSLv3',
    rejectUnauthorized: false // Accept self-signed certificates
  }
});

export async function sendVerificationEmail(user: User, token: string) {
  const verificationUrl = `${process.env.APP_URL}/verify-email?token=${token}`;

  const mailOptions = {
    from: `"NOMW" <${process.env.EMAIL_USER}>`, // Add a friendly name
    to: user.email,
    subject: "Verify your email address",
    html: `
      <h1>Welcome to NOMW!</h1>
      <p>Thank you for registering. Please verify your email address by clicking the link below:</p>
      <a href="${verificationUrl}" style="display: inline-block; padding: 10px 20px; background-color: #7c3aed; color: white; text-decoration: none; border-radius: 5px;">
        Verify Email Address
      </a>
      <p>If you did not create an account, please ignore this email.</p>
      <p>This link will expire in 24 hours.</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Email sending error:', error);
    throw new Error('Failed to send verification email. Please try again later.');
  }
}