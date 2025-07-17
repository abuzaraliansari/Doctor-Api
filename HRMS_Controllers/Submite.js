const { sql, poolPromise } = require('../config/db');


// BULK UPDATE Status
exports.bulkUpdateTimesheetStatus = async (req, res) => {
    try {
        const { entryIds, status, modifiedBy } = req.body;
        if (!Array.isArray(entryIds) || entryIds.length === 0 || !status) {
            return res.status(400).json({ error: 'entryIds (array) and status are required.' });
        }
        const pool = await poolPromise;
        const idsString = entryIds.join(',');
        const result = await pool.request()
            .input('Status', sql.NVarChar(50), status)
            .input('ModifiedBy', sql.NVarChar(50), modifiedBy || 'system')
            .query(`
                UPDATE HRMS_TimesheetEntries
                SET Status = @Status, ModifiedBy = @ModifiedBy, ModifiedDate = GETDATE()
                WHERE EntryID IN (${idsString})
            `);
        res.json({ success: true, updated: result.rowsAffected[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// SUBMIT Timesheet (set all Draft entries for the employee to Submitted)
exports.submitTimesheet = async (req, res) => {
    try {
        const EmployeeID = req.user.EmployeeID;
        const ModifiedBy = req.user.username || req.user.email || 'system';
        const pool = await poolPromise;
        const result = await pool.request()
            .input('EmployeeID', sql.Int, EmployeeID)
            .input('ModifiedBy', sql.NVarChar(50), ModifiedBy)
            .query(`UPDATE HRMS_TimesheetEntries 
                SET Status='Submitted', ModifiedBy=@ModifiedBy, ModifiedDate=GETDATE() 
                WHERE EmployeeID=@EmployeeID AND Status='Draft'`);
        if (result.rowsAffected[0] === 0) {
            return res.status(400).json({ error: 'No draft entries to submit' });
        }
        res.json({ success: true, submitted: result.rowsAffected[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};