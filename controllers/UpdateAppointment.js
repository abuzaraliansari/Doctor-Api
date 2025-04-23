const { sql, poolPromise } = require("../config/db");

const updateAppointment = async (req, res) => {
  const { appointmentID, bookingNo, modifiedBy } = req.body;

  if (!appointmentID || !bookingNo || !modifiedBy) {
    console.error("Error: Missing required fields");
    return res.status(400).json({
      success: false,
      message: "appointmentID, bookingNo, and modifiedBy are required",
    });
  }

  try {
    const pool = await poolPromise;

    // Update query
    const result = await pool
      .request()
      .input("appointmentID", sql.Int, appointmentID)
      .input("bookingNo", sql.NVarChar, bookingNo)
      .input("isBooked", sql.Int, 1) // Set IsBooked to 1
      .input("status", sql.NVarChar, "Pending") // Set Status to Pending
      .input("modifiedBy", sql.NVarChar, modifiedBy)
      .input("modifiedDate", sql.DateTime, new Date()) // Set ModifiedDate to current date
      .query(`
        UPDATE Appointments
        SET 
          BookingNo = @bookingNo,
          IsBooked = @isBooked,
          Status = @status,
          ModifiedBy = @modifiedBy,
          ModifiedDate = @modifiedDate
        WHERE AppointmentID = @appointmentID
      `);

    if (result.rowsAffected[0] === 0) {
      console.error("Error: Appointment not found");
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    console.log("Appointment updated successfully:", { appointmentID, bookingNo });
    res.status(200).json({
      success: true,
      message: "Appointment updated successfully",
    });
  } catch (err) {
    console.error("Error updating appointment:", err.message);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
};

module.exports = {
  updateAppointment,
};