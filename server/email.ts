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
  // Updated settings for Outlook/Office365
  secureConnection: false,
  tls: {
    ciphers: 'SSLv3',
    rejectUnauthorized: false // Only for development
  },
  debug: true // Enable debugging
});

export async function sendVerificationEmail(user: User, token: string) {
  const verificationUrl = `${process.env.APP_URL}/verify-email?token=${token}`;

  const mailOptions = {
    from: `"NOMW" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: "Verify your email address",
    html: `
      <h1>Welcome to NOMW!</h1>
      <p>Thank you for registering. Please verify your email address by clicking the link below:</p>
      <a href="${verificationUrl}" style="display: inline-block; padding: 10px 20px; background-color: #E91E63; color: white; text-decoration: none; border-radius: 5px;">
        Verify Email Address
      </a>
      <p>If you did not create an account, please ignore this email.</p>
      <p>This link will expire in 24 hours.</p>
    `,
  };

  try {
    // Verify transporter connection first
    await transporter.verify();

    // Send email
    await transporter.sendMail(mailOptions);
  } catch (error: any) {
    console.error('Email sending error:', error);

    // More specific error messages
    if (error.code === 'EAUTH') {
      throw new Error('Failed to authenticate with email server. Please check email credentials.');
    } else if (error.code === 'ESOCKET') {
      throw new Error('Failed to connect to email server. Please check email server settings.');
    } else {
      throw new Error(`Failed to send verification email: ${error.message}`);
    }
  }
}