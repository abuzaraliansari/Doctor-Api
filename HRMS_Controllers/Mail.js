const { sql, poolPromise } = require('../config/db');
const nodemailer = require('nodemailer');

// Helper to get current weekday (0=Sunday, 1=Monday, ..., 5=Friday, 6=Saturday)
function getCurrentWeekday() {
  const today = new Date();
  return today.getDay();
}

// Helper to check if it's Friday, Monday morning, or Monday night
function getMailType() {
  const now = new Date();
  const weekday = now.getDay();
  const hour = now.getHours();
  if (weekday === 5) return 'friday'; // Friday
  if (weekday === 1 && hour < 12) return 'monday-morning'; // Monday morning
  if (weekday === 1 && hour >= 18) return 'monday-night'; // Monday night
  return null;
}

exports.getUserData = async (req, res) => {
  try {
    const pool = await poolPromise;

    // Fetch user details, role, and last week's timesheet data
    const result = await pool.request()
      .query(`
        WITH LastWeekEntries AS (
          SELECT EmployeeID, EntryID, ProjectID, Date, TotalHours, Task, Comment, Status
          FROM dbo.HRMS_TimesheetEntries
          WHERE Date BETWEEN DATEADD(DAY, - (DATEPART(WEEKDAY, GETDATE()) + 6), GETDATE()) 
                         AND DATEADD(DAY, - DATEPART(WEEKDAY, GETDATE()), GETDATE())
        )
        SELECT  
          u.EmployeeID, u.username, u.email,
          r.roleid, r.roleName,
          t.EntryID
        FROM dbo.HRMS_users u
        LEFT JOIN dbo.HRMS_userrole ur ON u.EmployeeID = ur.EmployeeID
        LEFT JOIN dbo.HRMS_roles r ON ur.roleid = r.roleid
        LEFT JOIN LastWeekEntries t ON u.EmployeeID = t.EmployeeID;
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'No users found' });
    }

    // Identify users who haven't submitted timesheets and whose roleid is not 2 or 3
    const usersWithoutEntries = result.recordset.filter(user => !user.EntryID && user.roleid !== 2 && user.roleid !== 3);
    if (usersWithoutEntries.length > 0) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'timesheet.intmaven@gmail.com',
          pass: 'jnim fvsv pstj qieu'
        }
      });
      const mailType = getMailType();
      for (const user of usersWithoutEntries) {
        let subject, body, cc = [];
        if (mailType === 'friday') {
          subject = 'Gentle Reminder: Timesheet Submission Due Tomorrow';
          body = `<div style="font-family: Arial, sans-serif; font-size: 15px; color: #222;">
            <p>Dear ${user.username},</p>
            <p>This is a gentle reminder to submit your timesheet for this week by end of day today or tomorrow morning.</p>
            <p>Timely submission is essential for payroll and project tracking.</p>
            <br><p>Best regards,<br>HR Team</p></div>`;
          cc = [];
        } else if (mailType === 'monday-morning') {
          subject = 'Warning: Timesheet Submission Overdue';
          body = `<div style="font-family: Arial, sans-serif; font-size: 15px; color: #222;">
            <p>Dear ${user.username},</p>
            <p><span style="color: red; font-weight: bold;">Your timesheet for last week is overdue.</span></p>
            <p>Please submit it immediately to avoid auto-filling and escalation.</p>
            <br><p>Best regards,<br>HR Team</p></div>`;
          cc = ['hemant@intmavens.com', 'Vandana@intmavens.com'];
        } else if (mailType === 'monday-night') {
          subject = 'Timesheet Auto-Submitted for Last Week';
          body = `<div style="font-family: Arial, sans-serif; font-size: 15px; color: #222;">
            <p>Dear ${user.username},</p>
            <p>Your timesheet for last week has been auto-filled as you did not submit it on time.</p>
            <p>If you have questions, contact HR.</p>
            <br><p>Best regards,<br>HR Team</p></div>`;
          cc = ['hemant@intmavens.com', 'Vandana@intmavens.com'];
        } else {
          continue; // Not the right time to send any mail
        }
        const mailOptions = {
          from: 'timesheet.intmaven@gmail.com',
          to: user.email,
          cc: cc,
          subject: subject,
          html: body
        };
        try {
          await transporter.sendMail(mailOptions);
          console.log(`Email sent to ${user.email} [${mailType}]`);
        } catch (err) {
          console.error(`Error sending email to ${user.email}:`, err);
        }
      }
    }

    res.json(result.recordset);
  } catch (err) {
    console.error('Error retrieving user data:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// API to get all users, user roles, roles, and timesheet entries joined by EmployeeID and roleid
exports.getAllHRMSData = async (req, res) => {
  try {
    const pool = await poolPromise;
    // Join users, userRoles, roles, and timesheetEntries
    const query = `
      SELECT 
        u.EmployeeID, u.username, u.password, u.email, u.createdDate AS userCreatedDate, u.CreatedBy AS userCreatedBy, u.ModifiedDate AS userModifiedDate, u.ModifiedBy AS userModifiedBy,
        ur.roleid, ur.createdDate AS userRoleCreatedDate, ur.CreatedBy AS userRoleCreatedBy, ur.ModifiedDate AS userRoleModifiedDate, ur.ModifiedBy AS userRoleModifiedBy,
        r.roleName, r.createdDate AS roleCreatedDate, r.CreatedBy AS roleCreatedBy, r.ModifiedDate AS roleModifiedDate, r.ModifiedBy AS roleModifiedBy,
        t.EntryID, t.ProjectID, t.Date, t.TotalHours, t.TaskID, t.Task, t.Comment, t.Status, t.CreatedBy AS timesheetCreatedBy, t.CreatedDate, t.ModifiedBy AS timesheetModifiedBy, t.ModifiedDate, t.ManagerComment, t.Cateogary
      FROM [dbo].[HRMS_users] u
      LEFT JOIN [dbo].[HRMS_userrole] ur ON u.EmployeeID = ur.EmployeeID
      LEFT JOIN [dbo].[HRMS_roles] r ON ur.roleid = r.roleid
      LEFT JOIN [dbo].[HRMS_TimesheetEntries] t ON u.EmployeeID = t.EmployeeID
      ORDER BY u.EmployeeID, t.Date DESC
    `;
    const result = await pool.request().query(query);
    res.json({
      data: result.recordset
    });
  } catch (err) {
    console.error('Error fetching joined HRMS data:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// API to auto-fill leave entries for last week (Mon-Fri) if TotalHours < 8, only for roleid=1 and EmployeeID not in (1,2,3)
exports.getAllHRMSDataWithAutoFill = async (req, res) => {
  try {
    const pool = await poolPromise;
    // Only select employees with roleid = 1 and EmployeeID not in (1,2,3)
    const employees = await pool.request().query(`
      SELECT u.EmployeeID, u.username, u.email
      FROM [dbo].[HRMS_users] u
      INNER JOIN [dbo].[HRMS_userrole] ur ON u.EmployeeID = ur.EmployeeID
      WHERE ur.roleid = 1 AND u.EmployeeID NOT IN (1,2,3)
    `);
    const leaveProjectId = 4; // ProjectID for Leave
    const today = new Date();
    const dayOfWeek = today.getDay();
    // Calculate last week's Monday (Mon-Sun week)
    const lastMonday = new Date(today);
    lastMonday.setDate(today.getDate() - dayOfWeek - 6 + 1);

    // Setup mail transporter (configure as per your SMTP)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'timesheet.intmaven@gmail.com',
        pass: 'jnim fvsv pstj qieu'
      }
    });

    for (const emp of employees.recordset) {
      let autoFilledDates = [];
      for (let i = 0; i < 5; i++) { // Mon-Fri
        const date = new Date(lastMonday);
        date.setDate(lastMonday.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        const entriesResult = await pool.request()
          .input('EmployeeID', sql.Int, emp.EmployeeID)
          .input('Date', sql.Date, dateStr)
          .query(`SELECT * FROM [dbo].[HRMS_TimesheetEntries] WHERE EmployeeID = @EmployeeID AND Date = @Date`);
        const entries = entriesResult.recordset;
        const totalHours = entries.reduce((sum, e) => sum + (e.TotalHours || 0), 0);
        if (totalHours < 8) {
          const leaveHours = 8 - totalHours;
          const managerComment = `Auto-filled leave for remaining ${leaveHours} hour(s) on ${dateStr}`;
          await pool.request()
            .input('ProjectID', sql.Int, leaveProjectId)
            .input('EmployeeID', sql.Int, emp.EmployeeID)
            .input('Date', sql.Date, dateStr)
            .input('TotalHours', sql.Decimal(4,2), leaveHours)
            .input('TaskID', sql.Int, null)
            .input('Task', sql.NVarChar, 'Leave')
            .input('Comment', sql.NVarChar, managerComment)
            .input('ManagerComment', sql.NVarChar, managerComment)
            .input('Status', sql.NVarChar, 'Approved')
            .input('CreatedBy', sql.NVarChar, 'System')
            .input('Cateogary', sql.NVarChar, 'Other')
            .query(`INSERT INTO [dbo].[HRMS_TimesheetEntries] (ProjectID, EmployeeID, Date, TotalHours, TaskID, Task, Comment, ManagerComment, Status, CreatedBy, Cateogary, CreatedDate) VALUES (@ProjectID, @EmployeeID, @Date, @TotalHours, @TaskID, @Task, @Comment, @ManagerComment, @Status, @CreatedBy, @Cateogary, GETDATE())`);
          autoFilledDates.push(dateStr);
        }
      }
      // Send mail if any auto-filled entries were made
      if (autoFilledDates.length > 0 && emp.email) {
        const mailBody = `
Dear ${emp.username},

This is to inform you that your timesheet entries for the following dates in the last week were automatically filled with 'Leave' to complete the required 8 hours per day:

${autoFilledDates.map(d => `- ${d}`).join('\n')}

These entries have been marked as 'Approved' and a note has been added in the Manager's Comment for your reference.

If you have any questions or believe this was done in error, please contact your manager or HR.

Best regards,
HRMS System
        `;
        try {
          await transporter.sendMail({
            from: 'timesheet.intmaven@gmail.com',
            to: emp.email,
            subject: 'Timesheet Auto-Filled for Last Week',
            text: mailBody
          });
        } catch (mailErr) {
          console.error(`Failed to send mail to ${emp.email}:`, mailErr);
        }
      }
    }
    // --- Joined HRMS data logic ---
    const query = `
      SELECT 
        u.EmployeeID, u.username, u.password, u.email, u.createdDate AS userCreatedDate, u.CreatedBy AS userCreatedBy, u.ModifiedDate AS userModifiedDate, u.ModifiedBy AS userModifiedBy,
        ur.roleid, ur.createdDate AS userRoleCreatedDate, ur.CreatedBy AS userRoleCreatedBy, ur.ModifiedDate AS userRoleModifiedDate, ur.ModifiedBy AS userRoleModifiedBy,
        r.roleName, r.createdDate AS roleCreatedDate, r.CreatedBy AS roleCreatedBy, r.ModifiedDate AS roleModifiedDate, r.ModifiedBy AS roleModifiedBy,
        t.EntryID, t.ProjectID, t.Date, t.TotalHours, t.TaskID, t.Task, t.Comment, t.Status, t.CreatedBy AS timesheetCreatedBy, t.CreatedDate, t.ModifiedBy AS timesheetModifiedBy, t.ModifiedDate, t.ManagerComment, t.Cateogary
      FROM [dbo].[HRMS_users] u
      LEFT JOIN [dbo].[HRMS_userrole] ur ON u.EmployeeID = ur.EmployeeID
      LEFT JOIN [dbo].[HRMS_roles] r ON ur.roleid = r.roleid
      LEFT JOIN [dbo].[HRMS_TimesheetEntries] t ON u.EmployeeID = t.EmployeeID
      ORDER BY u.EmployeeID, t.Date DESC
    `;
    const result = await pool.request().query(query);
    res.json({
      message: 'Leave entries auto-filled for last week where needed (roleid=1 only, except EmployeeID 1,2,3). Mails sent to affected employees.',
      data: result.recordset
    });
  } catch (err) {
    console.error('Error in getAllHRMSDataWithAutoFill:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/sendWelcomeMails
exports.sendWelcomeMails = async (req, res) => {
  const { users } = req.body; // users: [{ username, password, email }]
  if (!Array.isArray(users) || users.length === 0) {
    return res.status(400).json({ message: 'users array is required' });
  }
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'timesheet.intmaven@gmail.com',
        pass: 'jnim fvsv pstj qieu'
      }
    });
    for (const user of users) {
      const mailBody = `
  <div style="font-family: Arial, sans-serif; line-height: 1.6;">
    <p>Dear ${user.username},</p>

    <p>Welcome to the team! We are pleased to inform you that you now have access to our official <strong>Timesheet Entry Portal</strong>, which plays a crucial role in maintaining accurate records of work hours, task accountability, and overall project efficiency.</p>

    <hr>
    <h3>✅ Steps to Get Started</h3>
    <ul>
      <li><strong>Access the Portal:</strong> <a href="https://timesheet.intmavens.com" target="_blank">Timesheet Management Portal</a></li>
      <li><strong>Log In:</strong> Use your credentials provided below</li>
      <li><strong>Submit Your Entries:</strong> Fill in your daily tasks and the number of hours worked</li>
      <li><strong>Review Carefully:</strong> Double-check all entries before saving or submitting</li>
    </ul>

    <hr>
    <h3>🔗 Portal Access</h3>
    <p><a href="https://timesheet.intmavens.com" target="_blank">https://timesheet.intmavens.com</a></p>

    <h4>🧾 Your Login Credentials</h4>
    <p><strong>Username:</strong> ${user.username}<br>
       <strong>Password:</strong> ${user.password}</p>

    <hr>
    <h3>⏱️ Daily & Weekly Time Entry Rules</h3>
    <ul>
      <li>A minimum of <strong>8 hours per day</strong> is required</li>
      <li>A minimum of <strong>40 hours per week</strong> must be submitted</li>
      <li>You cannot submit more than <strong>10 hours in a single day</strong></li>
      <li>You cannot submit more than <strong>45 hours in total</strong> for the week</li>
      <li>For any single task, the maximum allowed is <strong>3 hours</strong></li>
      <li><strong>Leave</strong> entries can be up to 8 hours</li>
    </ul>

    <hr>
    <h3>🔔 Compliance Guidelines</h3>
    <p>
      Timesheets must be completed and submitted by <strong>end of day every Friday</strong>.<br>
      Failure to submit by Friday will result in a formal warning.<br>
      If not submitted by <strong>Monday 6:00 PM</strong>, the system will auto-mark them as "Leave".<br>
      We encourage you to maintain timely entries to avoid issues.
    </p>

    <hr>
    <h3>📩 Need Assistance?</h3>
    <p>
      For help, contact:<br>
      Mohammad Abuzar – <a href="mailto:Abuzar@intmavens.com">Abuzar@intmavens.com</a><br>
      Vandana Kumari – <a href="mailto:Vandana@intmavens.com">Vandana@intmavens.com</a>
    </p>

    <hr>
    <p>We appreciate your cooperation and look forward to your contributions.<br><br>
    Warm regards,<br>
    HR Team</p>
  </div>
`;

      const mailOptions = {
        from: 'timesheet.intmaven@gmail.com',
        to: user.email,
        cc: 'Vandana@intmavens.com',
        subject: '📢 Welcome to Timesheet Portal – Your Login Credentials & Weekly Submission Policy',
        html: mailBody
      };
      try {
        await transporter.sendMail(mailOptions);
      } catch (err) {
        console.error(`Error sending welcome mail to ${user.email}:`, err);
      }
    }
    res.json({ message: 'Welcome mails sent to all users.' });
  } catch (err) {
    console.error('Error sending welcome mails:', err);
    res.status(500).json({ message: 'Server error' });
  }
};