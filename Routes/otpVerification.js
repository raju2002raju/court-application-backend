const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// In-memory storage for OTPs and user data
let otpStorage = {};
let users = {};

// Configure nodemailer with updated SSL options
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'royr55601@gmail.com',
    pass: process.env.EMAIL_PASS || 'swjf hktc myqr nzlw',
  },
  tls: {
    rejectUnauthorized: false,  // Added this line to handle self-signed certificates
    minVersion: "TLSv1.2"       // Ensure minimum TLS version
  },
  debug: true,                  // Enable debug logs
  logger: true                  // Enable logger
});

// Enhanced verify transporter connection with better error handling
async function verifyTransporter() {
  try {
    await transporter.verify();
    console.log('SMTP server is ready to take messages');
    return true;
  } catch (error) {
    console.error('SMTP connection error:', {
      message: error.message,
      code: error.code,
      command: error.command,
      stack: error.stack
    });
    return false;
  }
}

// Call verify on startup
verifyTransporter();

router.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    // Verify SMTP connection before sending
    const isSmtpReady = await verifyTransporter();
    if (!isSmtpReady) {
      throw new Error('SMTP server is not ready');
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    otpStorage[email] = {
      otp,
      expiry: Date.now() + 10 * 60 * 1000,
    };

    console.log(`Generated OTP for ${email}:`, otp);

    const mailOptions = {
      from: process.env.EMAIL_USER || 'royr55601@gmail.com',
      to: email,
      subject: 'Password Reset OTP',
      text: `Your OTP for password reset is: ${otp}`,
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: 'OTP sent to your email' });

  } catch (error) {
    console.error('Error in send-otp:', {
      message: error.message,
      code: error.code,
      command: error.command,
      stack: error.stack
    });
    
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send OTP',
      error: process.env.NODE_ENV === 'development' ? 
        `${error.message} (Code: ${error.code})` : 
        'Email service temporarily unavailable'
    });
  }
});

router.post('/verify-otp', (req, res) => {
    try {
      const { email, otp } = req.body;
  
      if (!email || !otp) {
        return res.status(400).json({ 
          success: false, 
          message: 'Email and OTP are required' 
        });
      }
  
      console.log('Verifying OTP:', { email, otp });
      console.log('OTP Storage:', otpStorage);
  
      if (!otpStorage[email]) {
        return res.status(400).json({ 
          success: false, 
          message: 'No OTP found for this email' 
        });
      }
  
      const storedOTP = otpStorage[email].otp;
      const expiryTime = otpStorage[email].expiry;
  
      if (storedOTP === otp && expiryTime > Date.now()) {
        res.json({ success: true, message: 'OTP verified successfully' });
      } else if (expiryTime <= Date.now()) {
        delete otpStorage[email];
        res.status(400).json({ success: false, message: 'OTP has expired' });
      } else {
        res.status(400).json({ success: false, message: 'Invalid OTP' });
      }
    } catch (error) {
      console.error('Error in verify-otp:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  });


module.exports = router;