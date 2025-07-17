const { sql, poolPromise } = require('../config/db');



// APPROVE Timesheet Entry
exports.approveTimesheetEntry = async (req, res) => {
    try {
        const { EntryID, EmployeeID, Status, ManagerComment, TotalHours } = req.body;

        if (!EntryID || !EmployeeID || !Status) {
            return res.status(400).json({
                error: 'EntryID, EmployeeID, and Status are required.'
            });
        }

        const pool = await poolPromise;
        const result = await pool.request()
            .input('EntryID', sql.Int, EntryID)
            .input('EmployeeID', sql.Int, EmployeeID)
            .input('Status', sql.NVarChar(50), Status)
            .input('ManagerComment', sql.NVarChar(500), ManagerComment || null)
            .input('TotalHours', sql.Decimal(4, 2), TotalHours)
            .input('ModifiedBy', sql.NVarChar(50), 'system')
            .query(`
                UPDATE dbo.HRMS_TimesheetEntries
                SET 
                    Status = @Status,
                    ManagerComment = @ManagerComment,
                    TotalHours = @TotalHours,
                    ModifiedBy = @ModifiedBy,
                    ModifiedDate = GETDATE()
                WHERE EntryID = @EntryID AND EmployeeID = @EmployeeID
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Entry not found or cannot be updated.' });
        }

        res.json({ success: true, message: 'Timesheet entry approved successfully.' });
    } catch (err) {
        console.error('Error approving timesheet entry:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};


// BULK APPROVE Timesheet Entries
exports.bulkApproveTimesheetEntries = async (req, res) => {
    try {
        const { entries } = req.body; // entries: [{ EntryID, EmployeeID, Status, ManagerComment, TotalHours }]
        if (!Array.isArray(entries) || entries.length === 0) {
            return res.status(400).json({ error: 'Entries array is required.' });
        }

        const pool = await poolPromise;
        for (const entry of entries) {
            const { EntryID, EmployeeID, Status, ManagerComment, TotalHours } = entry;
            if (!EntryID || !EmployeeID || !Status) continue;
            await pool.request()
                .input('EntryID', sql.Int, EntryID)
                .input('EmployeeID', sql.Int, EmployeeID)
                .input('Status', sql.NVarChar(50), Status)
                .input('ManagerComment', sql.NVarChar(500), ManagerComment || null)
                .input('TotalHours', sql.Decimal(4, 2), TotalHours)
                .input('ModifiedBy', sql.NVarChar(50), 'system')
                .query(`
                    UPDATE HRMS_TimesheetEntries
                    SET 
                        Status = @Status,
                        ManagerComment = @ManagerComment,
                        TotalHours = @TotalHours,
                        ModifiedBy = @ModifiedBy,
                        ModifiedDate = GETDATE()
                    WHERE EntryID = @EntryID AND EmployeeID = @EmployeeID
                `);
        }
        res.json({ message: 'Bulk update successful.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};