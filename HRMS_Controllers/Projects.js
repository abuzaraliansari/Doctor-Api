const { sql, poolPromise } = require('../config/db');


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