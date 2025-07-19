const { sql, poolPromise } = require('../config/db');
const nodemailer = require('nodemailer');

exports.changePassword = async (req, res) => {
  const { email, username, password, newPassword, confirmNewPassword } = req.body;
  if (!email || !username || !password || !newPassword || !confirmNewPassword) {
    return res.status(400).json({ message: 'All fields are required.' });
  }
  if (newPassword !== confirmNewPassword) {
    return res.status(400).json({ message: 'New passwords do not match.' });
  }
  try {
    const pool = await poolPromise;
    // Check if user exists and password is correct
    const userResult = await pool.request()
      .input('email', sql.VarChar, email)
      .input('username', sql.VarChar, username)
      .input('password', sql.VarChar, password)
      .query('SELECT * FROM HRMS_users WHERE email = @email AND username = @username AND password = @password');
    if (userResult.recordset.length === 0) {
      return res.status(401).json({ message: 'Invalid email, username, or password.' });
    }
    // Update password
    await pool.request()
      .input('email', sql.VarChar, email)
      .input('username', sql.VarChar, username)
      .input('newPassword', sql.VarChar, newPassword)
      .query('UPDATE HRMS_users SET password = @newPassword, ModifiedDate = GETDATE() WHERE email = @email AND username = @username');
    // Do not send email with new password (mail sending code removed as per user request)
    res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.forgetPassword = async (req, res) => {
  const { EmployeeID, email, username } = req.body;
  if (!EmployeeID || !email || !username) {
    return res.status(400).json({ message: 'EmployeeID, email, and username are required.' });
  }
  try {
    const pool = await poolPromise;
    // Check if user exists
    const userResult = await pool.request()
      .input('EmployeeID', sql.Int, EmployeeID)
      .input('email', sql.VarChar, email)
      .input('username', sql.VarChar, username)
      .query('SELECT * FROM HRMS_users WHERE EmployeeID = @EmployeeID AND email = @email AND username = @username');
    if (userResult.recordset.length === 0) {
      return res.status(404).json({ message: 'User not found with provided details.' });
    }
    // Generate new password
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const newPassword = `${username}@${randomNum}`;
    // Update password in DB
    await pool.request()
      .input('EmployeeID', sql.Int, EmployeeID)
      .input('newPassword', sql.VarChar, newPassword)
      .input('username', sql.VarChar, username)
      .query('UPDATE HRMS_users SET password = @newPassword, ModifiedDate = GETDATE(), ModifiedBy = @username WHERE EmployeeID = @EmployeeID');
    // Send email with new password
    // Configure your transporter (update with your SMTP details)
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: 'Your New Password',
      text: `Hello ${username},\n\nYour new password is: ${newPassword}\n\nPlease change it after logging in.`,
    });
    res.json({ message: 'A new password has been sent to your email.' });
  } catch (err) {
    console.error('Forget password error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};