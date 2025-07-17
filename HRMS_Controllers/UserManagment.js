const { sql, poolPromise } = require('../config/db');

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