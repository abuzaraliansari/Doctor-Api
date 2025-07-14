const { sql, poolPromise } = require('../config/db');

exports.login = async (req, res) => {
  const { username, password } = req.body;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('username', sql.VarChar, username)
      .input('password', sql.VarChar, password)
      .query(`
        SELECT 
          u.EmployeeID, u.username, u.email, u.createdDate, u.CreatedBy, u.ModifiedDate, u.ModifiedBy,
          r.roleid, r.roleName, r.createdDate AS roleCreatedDate, r.CreatedBy AS roleCreatedBy, r.ModifiedDate AS roleModifiedDate, r.ModifiedBy AS roleModifiedBy
        FROM HRMS_users u
        LEFT JOIN HRMS_userrole ur ON u.EmployeeID = ur.EmployeeID
        LEFT JOIN HRMS_roles r ON ur.roleid = r.roleid
        WHERE u.username = @username AND u.password = @password
      `);

    if (result.recordset.length === 0) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // Group roles for the user
    const user = {
      EmployeeID: result.recordset[0].EmployeeID,
      username: result.recordset[0].username,
      email: result.recordset[0].email,
      createdDate: result.recordset[0].createdDate,
      CreatedBy: result.recordset[0].CreatedBy,
      ModifiedDate: result.recordset[0].ModifiedDate,
      ModifiedBy: result.recordset[0].ModifiedBy,
      roles: result.recordset
        .filter(r => r.roleid)
        .map(r => ({
          roleid: r.roleid,
          roleName: r.roleName,
          createdDate: r.roleCreatedDate,
          CreatedBy: r.roleCreatedBy,
          ModifiedDate: r.roleModifiedDate,
          ModifiedBy: r.roleModifiedBy
        }))
    };

    res.json({ user }); // Only return user, no JWT token
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};