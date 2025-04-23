const bcrypt = require('bcryptjs');
const { sql, poolPromise } = require("../config/db");

const addPatient = async (req, res) => {
  const {
    fullName,
    mobileNo,
    emailID,
    address,
    age,
    gender,
    bloodGroup,
    emergencyContact,
    medicalHistory,
    insuranceProvider,
    insuranceNumber,
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

    // Insert into Patients table
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
      .input("emergencyContact", sql.NVarChar, emergencyContact)
      .input("medicalHistory", sql.NVarChar(sql.MAX), medicalHistory)
      .input("insuranceProvider", sql.NVarChar, insuranceProvider)
      .input("insuranceNumber", sql.NVarChar, insuranceNumber)
      .input("createdBy", sql.NVarChar, createdBy)
      .query(`
        INSERT INTO dbo.Patients (
          UserID, FullName, MobileNo, EmailID, Address, Age, Gender, BloodGroup, EmergencyContact, 
          MedicalHistory, InsuranceProvider, InsuranceNumber, IsActive, CreatedBy
        ) VALUES (
          @userID, @fullName, @mobileNo, @emailID, @address, @age, @gender, @bloodGroup, @emergencyContact, 
          @medicalHistory, @insuranceProvider, @insuranceNumber, 1, @createdBy
        )
      `);

    console.log("Patient added successfully:", { userID, fullName, mobileNo, emailID });
    res.status(201).json({ success: true, message: "Patient added successfully", userID });
  } catch (err) {
    console.error("Error adding patient:", err.message);
    res.status(500).json({ success: false, message: "Internal server error", error: err.message });
  }
};

module.exports = {
  addPatient,
};