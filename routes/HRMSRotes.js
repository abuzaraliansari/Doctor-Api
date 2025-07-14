const express = require('express');
const authenticateToken = require('../middlewares/authMiddleware');
const {
  getTimesheetEntriesByEmployee,
  getProjectsByIds,
  createTimesheetEntry,
  updateTimesheetEntry,
  deleteTimesheetEntry,
  approveTimesheetEntry,
  bulkUpdateTimesheetStatus,
  submitTimesheet,
  bulkApproveTimesheetEntries,
  getEmployeeOptions,
  getProjectOptions
} = require('../controllers/timesheetController');

const loginController = require('../controllers/login');
const { changePassword } = require('../controllers/changePassword');
const { getUserData, getAllHRMSDataWithAutoFill } = require('../controllers/Mail');

const router = express.Router();

// Public route
router.post('/login', loginController.login);

// Protected routes
router.post('/entries', getTimesheetEntriesByEmployee);
router.post('/projects', getProjectsByIds);
router.post('/entry', createTimesheetEntry);
router.post('/edit', updateTimesheetEntry);
router.post('/delete', deleteTimesheetEntry);
router.post('/approve', approveTimesheetEntry);
router.post('/bulk-update', bulkUpdateTimesheetStatus);
router.post('/submit', submitTimesheet);
router.post('/bulk', bulkApproveTimesheetEntries);
router.post('/changePassword', changePassword);
router.post('/getUserData', getUserData);
router.post('/getAllHRMSDataWithAutoFill', getAllHRMSDataWithAutoFill);
router.get('/employeeOptions', getEmployeeOptions);
router.get('/projectOptions', getProjectOptions);

module.exports = router;