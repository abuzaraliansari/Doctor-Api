const { sql, poolPromise } = require('../config/db');

exports.login = async (req, res) => {
  const { username, password } = req.body;
  try {
    const pool = await poolPromise;
    // Join HRMS_users, HRMS_userrole, HRMS_roles, and EmployeeHierarchy (with manager info)
    const result = await pool.request()
      .input('username', sql.VarChar, username)
      .input('password', sql.VarChar, password)
      .query(`
        SELECT 
          u.EmployeeID, u.username, u.email, u.createdDate, u.CreatedBy, u.ModifiedDate, u.ModifiedBy,
          u.ManagerID,
          m.username AS managerUsername, m.email AS managerEmail,
          r.roleid, r.roleName, r.createdDate AS roleCreatedDate, r.CreatedBy AS roleCreatedBy, r.ModifiedDate AS roleModifiedDate, r.ModifiedBy AS roleModifiedBy,
          eh.ManagerID AS hierarchyManagerID, eh.createdDate AS hierarchyCreatedDate, eh.CreatedBy AS hierarchyCreatedBy, eh.ModifiedDate AS hierarchyModifiedDate, eh.ModifiedBy AS hierarchyModifiedBy
        FROM HRMS_users u
        LEFT JOIN HRMS_userrole ur ON u.EmployeeID = ur.EmployeeID
        LEFT JOIN HRMS_roles r ON ur.roleid = r.roleid
        LEFT JOIN EmployeeHierarchy eh ON u.EmployeeID = eh.EmployeeID
        LEFT JOIN HRMS_users m ON eh.ManagerID = m.EmployeeID
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
      ManagerID: result.recordset[0].ManagerID,
      managerUsername: result.recordset[0].managerUsername,
      managerEmail: result.recordset[0].managerEmail,
      hierarchy: {
        ManagerID: result.recordset[0].hierarchyManagerID,
        createdDate: result.recordset[0].hierarchyCreatedDate,
        CreatedBy: result.recordset[0].hierarchyCreatedBy,
        ModifiedDate: result.recordset[0].hierarchyModifiedDate,
        ModifiedBy: result.recordset[0].hierarchyModifiedBy
      },
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