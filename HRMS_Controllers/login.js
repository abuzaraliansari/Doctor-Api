const { sql, poolPromise } = require('../config/db');
const jwt = require('jsonwebtoken'); // Add this line
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret'; // Use env variable in production

exports.login = async (req, res) => {
  const { username, password } = req.body;
  try {
    const pool = await poolPromise;
    // Get user and their roles
    const result = await pool.request()
      .input('username', sql.VarChar, username)
      .input('password', sql.VarChar, password)
      .query(`
        SELECT 
          u.EmployeeID, u.username, u.email, u.createdDate, u.CreatedBy, u.ModifiedDate, u.ModifiedBy, u.IsManager,
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
      IsManager: result.recordset[0].IsManager, // Add IsManager to user object
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

    // --- NEW: Get managed employees if this user is a manager ---
    const managedEmployeesResult = await pool.request()
      .input('managerId', sql.Int, user.EmployeeID)
      .query(`
        SELECT e.EmployeeID, e.username, e.email
        FROM ManagerEmployee me
        JOIN HRMS_users e ON me.EmployeeID = e.EmployeeID
        WHERE me.ManagerID = @managerId
      `);

    user.managedEmployees = managedEmployeesResult.recordset; // Add to user object

    // --- NEW: Get managed employees with full details and recursive manager check ---
    async function getManagedEmployeesWithDetails(managerId) {
      // Get all employees managed by this manager
      const managedResult = await pool.request()
        .input('managerId', sql.Int, managerId)
        .query(`
          SELECT 
            e.EmployeeID, e.username, e.email, e.createdDate, e.CreatedBy, e.ModifiedDate, e.ModifiedBy, e.IsManager
          FROM ManagerEmployee me
          JOIN HRMS_users e ON me.EmployeeID = e.EmployeeID
          WHERE me.ManagerID = @managerId
        `);
      const employees = managedResult.recordset;
      // For each managed employee, get their roles and recursively their managed employees if they are a manager
      for (let emp of employees) {
        // Get roles for this employee
        const rolesResult = await pool.request()
          .input('empId', sql.Int, emp.EmployeeID)
          .query(`
            SELECT r.roleid, r.roleName, r.createdDate AS roleCreatedDate, r.CreatedBy AS roleCreatedBy, r.ModifiedDate AS roleModifiedDate, r.ModifiedBy AS roleModifiedBy
            FROM HRMS_userrole ur
            LEFT JOIN HRMS_roles r ON ur.roleid = r.roleid
            WHERE ur.EmployeeID = @empId
          `);
        emp.roles = rolesResult.recordset;
        // If this employee is also a manager, get their managed employees recursively
        if (emp.IsManager) {
          emp.managedEmployees = await getManagedEmployeesWithDetails(emp.EmployeeID);
        }
      }
      return employees;
    }

    user.managedEmployees = await getManagedEmployeesWithDetails(user.EmployeeID);

    // Generate JWT token
    const token = jwt.sign(
      {
        EmployeeID: user.EmployeeID,
        username: user.username,
        roles: user.roles.map(r => r.roleName)
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ success: true, user, token }); // Keep response compatible with frontend
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error'});
  }
};
