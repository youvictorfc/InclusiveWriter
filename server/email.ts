import nodemailer from "nodemailer";

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  throw new Error("Email credentials are required");
}

const transporter = nodemailer.createTransport({
  host: "smtp.office365.com",
  port: 587,
  secure: false, // Use TLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Your Outlook account password or app password
  },
  tls: {
    rejectUnauthorized: true,
    minVersion: "TLSv1.2"
  },
  debug: true, // Enable debug logs
  logger: true // Enable logger
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
    console.log('Attempting to send email using configuration:', {
      host: transporter.options.host,
      port: transporter.options.port,
      secure: transporter.options.secure,
      user: process.env.EMAIL_USER
    });

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.response);
    return info;
  } catch (error: any) {
    console.error("Email sending error:", error);
    if (error.code === 'EAUTH') {
      throw new Error('Failed to authenticate with the email server. Please check your email credentials.');
    }
    if (error.code === 'ESOCKET') {
      throw new Error('Failed to connect to the email server. Please check your network connection.');
    }
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
    console.log('Attempting to send password reset email to:', email);
    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent successfully:', info.response);
    return info;
  } catch (error: any) {
    console.error("Email sending error:", error);
    throw new Error(`Failed to send password reset email: ${error.message}`);
  }
}