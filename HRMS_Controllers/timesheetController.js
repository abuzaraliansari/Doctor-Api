const { sql, poolPromise } = require('../config/db');

// CREATE Timesheet Entry
exports.createTimesheetEntry = async (req, res) => {
    try {
        const {
            ProjectID,
            EmployeeID,
            Date,
            TotalHours,
            TaskID,
            Task,
            Comment,
            Status,
            CreatedBy,
            Cateogary,
            ManagerComment
        } = req.body;

        if (!ProjectID || !EmployeeID || !Date || !TotalHours || !Status || !CreatedBy) {
            return res.status(400).json({ error: 'ProjectID, EmployeeID, Date, TotalHours, Status, and CreatedBy are required.' });
        }

        const pool = await poolPromise;
        await pool.request()
            .input('ProjectID', sql.Int, ProjectID)
            .input('EmployeeID', sql.Int, EmployeeID)
            .input('Date', sql.Date, Date)
            .input('TotalHours', sql.Decimal(4, 2), TotalHours)
            .input('TaskID', sql.Int, TaskID || null)
            .input('Task', sql.NVarChar(255), Task || null)
            .input('Comment', sql.NVarChar(500), Comment || null)
            .input('Status', sql.NVarChar(50), Status)
            .input('CreatedBy', sql.NVarChar(50), CreatedBy)
            .input('Cateogary', sql.NVarChar(100), Cateogary || null)
            .input('ManagerComment', sql.NVarChar(500), ManagerComment || null)
            .query(`
                INSERT INTO HRMS_TimesheetEntries 
                (ProjectID, EmployeeID, Date, TotalHours, TaskID, Task, Comment, Status, CreatedBy, Cateogary, ManagerComment)
                VALUES (@ProjectID, @EmployeeID, @Date, @TotalHours, @TaskID, @Task, @Comment, @Status, @CreatedBy, @Cateogary, @ManagerComment)
            `);

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET Timesheet Entries By Employee
exports.getTimesheetEntriesByEmployee = async (req, res) => {
    try {
        const { EmployeeID, EmployeeIDs } = req.body;
        const pool = await poolPromise;
        let result;

        let whereClause = '';
        let params = [];
        if (Array.isArray(EmployeeIDs) && EmployeeIDs.length > 0) {
            // Multiple EmployeeIDs
            const idParams = EmployeeIDs.map((_, i) => `@EmpID${i}`).join(', ');
            whereClause = `WHERE t.EmployeeID IN (${idParams})`;
            params = EmployeeIDs.map((id, i) => ({ name: `EmpID${i}`, value: id }));
        } else if (EmployeeID) {
            // Single EmployeeID
            whereClause = 'WHERE t.EmployeeID = @EmployeeID';
            params = [{ name: 'EmployeeID', value: EmployeeID }];
        }

        const baseQuery = `
            SELECT 
                t.*,
                p.ProjectsName,
                u.username
            FROM HRMS_TimesheetEntries t
            LEFT JOIN HRMS_Projects p ON t.ProjectID = p.ProjectsId
            LEFT JOIN HRMS_users u ON t.EmployeeID = u.EmployeeID
            ${whereClause}
            ORDER BY t.Date DESC, t.EntryID DESC
        `;

        const request = pool.request();
        params.forEach(param => {
            request.input(param.name, sql.Int, param.value);
        });

        result = await request.query(baseQuery);

        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


// UPDATE Timesheet Entry
exports.updateTimesheetEntry = async (req, res) => {
    try {
        const {
            EntryID,
            EmployeeID,
            ProjectID,
            Date,
            TotalHours,
            TaskID,
            Task,
            Comment,
            Status,
            ModifiedBy,
            Cateogary,
            ManagerComment
        } = req.body;

        if (!EntryID || !EmployeeID) {
            return res.status(400).json({ error: 'EntryID and EmployeeID are required.' });
        }

        const pool = await poolPromise;
        const result = await pool.request()
            .input('EntryID', sql.Int, EntryID)
            .input('EmployeeID', sql.Int, EmployeeID)
            .input('ProjectID', sql.Int, ProjectID)
            .input('Date', sql.Date, Date)
            .input('TotalHours', sql.Decimal(4, 2), TotalHours)
            .input('TaskID', sql.Int, TaskID || null)
            .input('Task', sql.NVarChar(255), Task || null)
            .input('Comment', sql.NVarChar(500), Comment || null)
            .input('Status', sql.NVarChar(50), Status)
            .input('ModifiedBy', sql.NVarChar(50), ModifiedBy || 'system')
            .input('Cateogary', sql.NVarChar(100), Cateogary || null)
            .input('ManagerComment', sql.NVarChar(500), ManagerComment || null)
            .query(`
                UPDATE dbo.HRMS_TimesheetEntries
                SET 
                    ProjectID = @ProjectID,
                    Date = @Date,
                    TotalHours = @TotalHours,
                    TaskID = @TaskID,
                    Task = @Task,
                    Comment = @Comment,
                    Status = @Status,
                    ModifiedBy = @ModifiedBy,
                    ModifiedDate = GETDATE(),
                    Cateogary = @Cateogary,
                    ManagerComment = @ManagerComment
                WHERE 
                    EntryID = @EntryID AND 
                    EmployeeID = @EmployeeID
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Entry not found or not editable' });
        }

        res.json({ success: true, message: 'Timesheet entry updated successfully' });
    } catch (err) {
        console.error('Error updating timesheet:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// DELETE Timesheet Entry
exports.deleteTimesheetEntry = async (req, res) => {
    try {
        const { EntryID, EmployeeID, Status } = req.body;

        if (!EntryID || !EmployeeID || !Status) {
            return res.status(400).json({ error: 'EntryID, EmployeeID, and Status are required' });
        }

        const pool = await poolPromise;
        const result = await pool.request()
            .input('EntryID', sql.Int, EntryID)
            .input('EmployeeID', sql.Int, EmployeeID)
            .input('Status', sql.NVarChar(50), Status)
            .query(`
                DELETE FROM HRMS_TimesheetEntries 
                WHERE EntryID = @EntryID AND EmployeeID = @EmployeeID AND Status = @Status
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Entry not found or not deletable' });
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
