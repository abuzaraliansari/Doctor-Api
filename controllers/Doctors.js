const { sql, poolPromise } = require("../config/db");

const getDoctors = async (req, res) => {
  const {
    fullName,
    mobileNo,
    gender,
    specialization,
    qualification,
    page = 1,
    limit = 100 // Default to top 5 doctors
  } = req.query;

  try {
    const pool = await poolPromise;

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Base query
    let query = `
      SELECT * FROM dbo.Doctors
      WHERE 1=1
    `;

    // Add filters dynamically
    if (fullName) {
      query += ` AND FullName LIKE @fullName`;
    }
    if (mobileNo) {
      query += ` AND MobileNo LIKE @mobileNo`;
    }
    if (gender) {
      query += ` AND Gender LIKE @gender`;
    }
    if (specialization) {
      query += ` AND Specialization LIKE @specialization`;
    }
    if (qualification) {
      query += ` AND Qualification LIKE @qualification`;
    }

    // Add pagination and order by FullName (A to Z)
    query += `
      ORDER BY FullName ASC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `;

    // Execute query
    const result = await pool
      .request()
      .input("fullName", sql.NVarChar, fullName ? `${fullName}%` : null)
      .input("mobileNo", sql.NVarChar, mobileNo ? `${mobileNo}%` : null)
      .input("gender", sql.NVarChar, gender ? `${gender}%` : null)
      .input("specialization", sql.NVarChar, specialization ? `${specialization}%` : null)
      .input("qualification", sql.NVarChar, qualification ? `${qualification}%` : null)
      .input("limit", sql.Int, parseInt(limit))
      .input("offset", sql.Int, parseInt(offset))
      .query(query);

    console.log("Doctors fetched successfully:", result.recordset);
    res.status(200).json({
      success: true,
      message: "Doctors fetched successfully",
      data: result.recordset
    });
  } catch (err) {
    console.error("Error fetching doctors:", err.message);
    res.status(500).json({ success: false, message: "Internal server error", error: err.message });
  }
};

module.exports = {
  getDoctors,
};