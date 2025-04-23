const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken'); // Add this line
const { sql, poolPromise } = require("../config/db");

const signUp = async (req, res) => {
  const { username, mobileNo, emailID, password, createdBy } = req.body;

  if (!username || !mobileNo || !emailID || !password) {
    return res.status(400).json({ success: false, message: "All fields are required" });
  }

  try {
    const pool = await poolPromise;

    // Check if the user already exists
    const existingUser = await pool
      .request()
      .input("username", sql.NVarChar, username)
      .input("mobileNo", sql.NVarChar, mobileNo)
      .query(`
        SELECT UserID 
        FROM dbo.Users 
        WHERE Username = @username OR MobileNo = @mobileNo
      `);

    if (existingUser.recordset.length > 0) {
      return res.status(400).json({ success: false, message: "User already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert the new user into the database
    await pool
      .request()
      .input("username", sql.NVarChar, username)
      .input("mobileNo", sql.NVarChar, mobileNo)
      .input("emailID", sql.NVarChar, emailID)
      .input("password", sql.NVarChar, password)
      .input("passwordHash", sql.NVarChar, hashedPassword)
      .input("createdBy", sql.NVarChar, createdBy || "System")
      .query(`
        INSERT INTO dbo.Users (
          Username, MobileNo, EmailID, Password, PasswordHash, CreatedBy
        ) VALUES (
          @username, @mobileNo, @emailID, @password, @passwordHash, @createdBy
        )
      `);

    res.status(201).json({ success: true, message: "User signed up successfully" });
  } catch (err) {
    console.error("Error signing up user:", err.message);
    res.status(500).json({ success: false, message: "Failed to sign up user", error: err.message });
  }
};


const login = async (req, res) => {
  const { mobileNumber, password } = req.body;

  if (!mobileNumber || !password) {
    console.error("Error: Mobile number and password are required");
    return res.status(400).json({ success: false, message: "Mobile number and password are required" });
  }

  try {
    const pool = await poolPromise;

    // Fetch user details by mobile number
    const userResult = await pool
      .request()
      .input("mobileNumber", sql.NVarChar, mobileNumber)
      .query(`
        SELECT 
          u.UserID,
          u.Username,
          u.MobileNo,
          u.EmailID,
          u.PasswordHash,
          u.isAdmin,
          u.IsActive,
          u.CreatedBy,
          u.CreatedDate,
          u.ModifiedBy,
          u.ModifiedDate
        FROM dbo.Users u
        WHERE u.MobileNo = @mobileNumber
      `);

    if (userResult.recordset.length === 0) {
      console.error("Error: Invalid mobile number or password");
      return res.status(401).json({ success: false, message: "Invalid mobile number or password" });
    }

    const user = userResult.recordset[0];

    // Check if the user is active
    if (!user.IsActive) {
      console.error("Error: User account is inactive");
      return res.status(403).json({ success: false, message: "User account is inactive" });
    }

    // Verify the password
    const validPassword = await bcrypt.compare(password, user.PasswordHash);
    if (!validPassword) {
      console.error("Error: Invalid mobile number or password");
      return res.status(401).json({ success: false, message: "Invalid mobile number or password" });
    }

    // Fetch user roles
    const rolesResult = await pool
      .request()
      .input("userID", sql.Int, user.UserID)
      .query(`
        SELECT 
          ur.UserRoleID,
          ur.UserID,
          ur.RoleID,
          ur.IsActive AS UserRoleIsActive,
          ur.CreatedBy AS UserRoleCreatedBy,
          ur.CreatedDate AS UserRoleCreatedDate,
          ur.ModifiedBy AS UserRoleModifiedBy,
          ur.ModifiedDate AS UserRoleModifiedDate,
          r.RoleName,
          r.Description AS RoleDescription,
          r.IsActive AS RoleIsActive,
          r.CreatedBy AS RoleCreatedBy,
          r.CreatedDate AS RoleCreatedDate,
          r.ModifiedBy AS RoleModifiedBy,
          r.ModifiedDate AS RoleModifiedDate
        FROM UserRoles ur
        JOIN Roles r ON ur.RoleID = r.RoleID
        WHERE ur.UserID = @userID AND ur.IsActive = 1
      `);

    const roles = rolesResult.recordset;

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.UserID, username: user.Username, roles: roles.map(role => role.RoleName) },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "1h" }
    );

    // Determine the user's primary role
    let primaryRole = "Unknown";
    if (roles.some(role => role.RoleName === "Admin")) {
      primaryRole = "Admin";
    } else if (roles.some(role => role.RoleName === "Doctor")) {
      primaryRole = "Doctor";
    } else if (roles.some(role => role.RoleName === "Patient")) {
      primaryRole = "Patient";
    }

    // Log the result
    console.log("Login successful:", {
      user,
      roles,
      primaryRole,
    });

    // Respond with user details, roles, and token
    res.status(200).json({
      success: true,
      message: "Login successful",
      token: token,
      user: {
        userID: user.UserID,
        username: user.Username,
        mobileNumber: user.MobileNo,
        emailID: user.EmailID,
        isAdmin: user.isAdmin,
        isActive: user.IsActive,
        createdBy: user.CreatedBy,
        createdDate: user.CreatedDate,
        modifiedBy: user.ModifiedBy,
        modifiedDate: user.ModifiedDate,
      },
      roles: roles,
      primaryRole: primaryRole,
    });
  } catch (err) {
    console.error("Error during login:", err.message);
    res.status(500).json({ success: false, message: "Internal server error", error: err.message });
  }
};

module.exports = {
  ...module.exports,
  login,
};

module.exports = {
  ...module.exports,
  signUp,
  login,
};