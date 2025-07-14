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
        const { EmployeeID } = req.body;
        const pool = await poolPromise;
        let result;

        const baseQuery = `
            SELECT 
                t.*,
                p.ProjectsName,
                u.username
            FROM HRMS_TimesheetEntries t
            LEFT JOIN HRMS_Projects p ON t.ProjectID = p.ProjectsId
            LEFT JOIN HRMS_users u ON t.EmployeeID = u.EmployeeID
            ${EmployeeID ? 'WHERE t.EmployeeID = @EmployeeID' : ''}
            ORDER BY t.Date DESC, t.EntryID DESC
        `;

        const request = pool.request();
        if (EmployeeID) {
            request.input('EmployeeID', sql.Int, EmployeeID);
        }

        result = await request.query(baseQuery);

        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET Projects By IDs
exports.getProjectsByIds = async (req, res) => {
    try {
        const { projectIds } = req.body;

        if (!projectIds || !Array.isArray(projectIds) || projectIds.length === 0) {
            return res.status(400).json({ error: 'projectIds must be a non-empty array.' });
        }

        const pool = await poolPromise;
        const idsList = projectIds.map(id => parseInt(id)).filter(id => !isNaN(id));

        const request = pool.request();
        idsList.forEach((id, index) => {
            request.input(`id${index}`, sql.Int, id);
        });

        const whereClause = idsList.map((_, index) => `@id${index}`).join(',');

        const query = `SELECT * FROM HRMS_Projects WHERE ProjectsId IN (${whereClause})`;

        const result = await request.query(query);

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



// GET /api/employees/options
exports.getEmployeeOptions = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .query(`
        SELECT EmployeeID AS value, username AS label, email
        FROM HRMS_users
        ORDER BY username
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error('Error fetching employee options:', err);
    res.status(500).json({ error: 'Failed to fetch employee options' });
  }
};

// GET /api/projects/options
exports.getProjectOptions = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
     .query(`
        SELECT ProjectsId AS value, ProjectsName AS label
        FROM HRMS_Projects
        ORDER BY ProjectsName
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error('Error fetching project options:', err);
    res.status(500).json({ error: 'Failed to fetch project options' });
  }
};