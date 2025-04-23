const { sql, poolPromise } = require("../config/db");

const getAppointments = async (req, res) => {
  // Use req.body if the data is sent as JSON in the request body
  const {
    hospitalID,
    doctorID,
    patientID,
    appointmentDate,
    status,
    page = 1,
    limit = 42 // Default to 42 records per page
  } = req.body; // Change from req.query to req.body

  try {
    const pool = await poolPromise;

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Base query
    let query = `
      SELECT 
        A.AppointmentID,
        A.HospitalID,
        H.HospitalName,
        A.DoctorID,
        D.FullName AS DoctorName,
        A.PatientID,
        P.FullName AS PatientName,
        A.BookingNo,
        A.AppointmentDate,
        A.StartTime,
        A.EndTime,
        A.Status,
        A.IsBooked,
        A.IsActive,
        A.CreatedBy,
        A.CreatedDate,
        A.ModifiedBy,
        A.ModifiedDate
      FROM Appointments A
      LEFT JOIN Hospitals H ON A.HospitalID = H.HospitalID
      LEFT JOIN Doctors D ON A.DoctorID = D.DoctorID
      LEFT JOIN Patients P ON A.PatientID = P.PatientID
      WHERE 1=1
    `;

    // Add filters dynamically
    if (hospitalID) {
      query += ` AND A.HospitalID = @hospitalID`;
    }
    if (doctorID) {
      query += ` AND A.DoctorID = @doctorID`;
    }
    if (patientID) {
      query += ` AND A.PatientID = @patientID`;
    }
    if (appointmentDate) {
      query += ` AND CAST(A.AppointmentDate AS DATE) = CAST(@appointmentDate AS DATE)`; // Compare only the date part
    }
    if (status) {
      query += ` AND A.Status = @status`;
    }

    // Add pagination
    query += `
      ORDER BY A.AppointmentDate DESC, A.StartTime ASC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `;

    // Execute query
    const result = await pool
      .request()
      .input("hospitalID", sql.Int, hospitalID || null)
      .input("doctorID", sql.Int, doctorID || null)
      .input("patientID", sql.Int, patientID || null)
      .input("appointmentDate", sql.DateTime, appointmentDate || null) // Use sql.DateTime for date and time
      .input("status", sql.NVarChar, status || null)
      .input("limit", sql.Int, parseInt(limit))
      .input("offset", sql.Int, parseInt(offset))
      .query(query);

    console.log("Appointments fetched successfully:", result.recordset);
    res.status(200).json({
      success: true,
      message: "Appointments fetched successfully",
      data: result.recordset
    });
  } catch (err) {
    console.error("Error fetching appointments:", err.message);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message
    });
  }
};

module.exports = {
  getAppointments,
};