import nodemailer from "nodemailer";

// Check if all required environment variables are present
const requiredEnvVars = ['EMAIL_USER', 'EMAIL_PASS', 'APP_URL'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars);
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

console.log('Initializing email transport with:', {
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 465,
  user: process.env.EMAIL_USER
});

const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // Use SSL
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  debug: true,
  logger: true // Enable detailed SMTP logging
});

// Verify connection configuration
transporter.verify(function(error, success) {
  if (error) {
    console.error('SMTP connection error:', error);
    throw error; // This will help us see the error in the server logs
  } else {
    console.log("SMTP server is ready to send emails");
  }
});

export async function sendVerificationEmail(email: string, token: string) {
  const verificationLink = `${process.env.APP_URL}/verify-email?token=${token}`;

  console.log('Attempting to send verification email:', {
    to: email,
    from: process.env.EMAIL_USER,
    link: verificationLink
  });

  try {
    // Test email configuration first
    const testResult = await transporter.verify();
    console.log('SMTP verification result:', testResult);

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

    console.log('Sending email with configuration:', {
      service: 'gmail',
      host: 'smtp.gmail.com',
      port: 465,
      user: process.env.EMAIL_USER
    });

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.response);
    return info;
  } catch (error: any) {
    console.error("Email sending error:", error);

    // Add detailed error logging
    if (error.code === 'EAUTH') {
      console.error('Authentication error - please check Gmail credentials and ensure App Password is being used');
      throw new Error('Failed to authenticate with Gmail. Please ensure you are using an App Password, not your regular Gmail password.');
    } else if (error.code === 'ESOCKET') {
      console.error('Socket error - please check network connection');
      throw new Error('Failed to connect to Gmail SMTP server. Please check network connection.');
    } else if (error.code === 'EENVELOPE') {
      console.error('Envelope error - please check email addresses');
      throw new Error('Invalid email address format.');
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