const bcrypt = require('bcryptjs');
const { sql, poolPromise } = require("../config/db");

const addDoctor = async (req, res) => {
  const {
    fullName,
    mobileNo,
    emailID,
    address,
    age,
    gender,
    bloodGroup,
    specialization,
    experienceYears,
    qualification,
    licenseNo,
    consultationFee,
    createdBy
  } = req.body;

  if (!fullName || !mobileNo || !emailID || !createdBy) {
    console.error("Error: Required fields are missing");
    return res.status(400).json({ success: false, message: "FullName, MobileNo, EmailID, and CreatedBy are required" });
  }

  try {
    const pool = await poolPromise;

    // Hash the password (using mobile number as a temporary password)
    const hashedPassword = await bcrypt.hash(mobileNo, 10);

    // Insert into Users table
    const userResult = await pool
      .request()
      .input("username", sql.NVarChar, fullName)
      .input("mobileNo", sql.NVarChar, mobileNo)
      .input("emailID", sql.NVarChar, emailID)
      .input("password", sql.NVarChar, mobileNo)
      .input("passwordHash", sql.NVarChar, hashedPassword)
      .input("createdBy", sql.NVarChar, createdBy)
      .query(`
        INSERT INTO dbo.Users (
          Username, MobileNo, EmailID, Password, PasswordHash, isAdmin, IsActive, CreatedBy
        ) OUTPUT INSERTED.UserID
        VALUES (
          @username, @mobileNo, @emailID, @password, @passwordHash, 0, 1, @createdBy
        )
      `);

    const userID = userResult.recordset[0].UserID;

    // Insert into Doctors table
    await pool
      .request()
      .input("userID", sql.Int, userID)
      .input("fullName", sql.NVarChar, fullName)
      .input("mobileNo", sql.NVarChar, mobileNo)
      .input("emailID", sql.NVarChar, emailID)
      .input("address", sql.NVarChar, address)
      .input("age", sql.Int, age)
      .input("gender", sql.NVarChar, gender)
      .input("bloodGroup", sql.NVarChar, bloodGroup)
      .input("specialization", sql.NVarChar, specialization)
      .input("experienceYears", sql.Int, experienceYears)
      .input("qualification", sql.NVarChar, qualification)
      .input("licenseNo", sql.NVarChar, licenseNo)
      .input("consultationFee", sql.Decimal(10, 2), consultationFee)
      .input("createdBy", sql.NVarChar, createdBy)
      .query(`
        INSERT INTO dbo.Doctors (
          UserID, FullName, MobileNo, EmailID, Address, Age, Gender, BloodGroup, Specialization, 
          ExperienceYears, Qualification, LicenseNo, ConsultationFee, IsActive, CreatedBy
        ) VALUES (
          @userID, @fullName, @mobileNo, @emailID, @address, @age, @gender, @bloodGroup, @specialization, 
          @experienceYears, @qualification, @licenseNo, @consultationFee, 1, @createdBy
        )
      `);

    console.log("Doctor added successfully:", { userID, fullName, mobileNo, emailID });
    res.status(201).json({ success: true, message: "Doctor added successfully", userID });
  } catch (err) {
    console.error("Error adding doctor:", err.message);
    res.status(500).json({ success: false, message: "Internal server error", error: err.message });
  }
};

module.exports = {
  addDoctor,
};