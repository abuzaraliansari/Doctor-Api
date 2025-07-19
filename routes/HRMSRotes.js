const express = require('express');
const authenticateToken = require('../middlewares/authMiddleware');
const {
  getTimesheetEntriesByEmployee,
  createTimesheetEntry,
  updateTimesheetEntry,
  deleteTimesheetEntry,
} = require('../HRMS_Controllers/timesheetController');

const { approveTimesheetEntry, bulkApproveTimesheetEntries } = require('../HRMS_Controllers/Approve');
const { getProjectsByIds, getEmployeeOptions, getProjectOptions } = require('../HRMS_Controllers/Projects');
const { bulkUpdateTimesheetStatus, submitTimesheet } = require('../HRMS_Controllers/Submite');

const loginController = require('../HRMS_Controllers/login');
const { changePassword, forgetPassword } = require('../HRMS_Controllers/UserManagment');
const { getUserData, getAllHRMSDataWithAutoFill } = require('../HRMS_Controllers/Mail');

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
router.post('/forgetPassword', forgetPassword);
router.post('/getUserData', getUserData);
router.post('/getAllHRMSDataWithAutoFill', getAllHRMSDataWithAutoFill);
router.get('/employeeOptions', getEmployeeOptions);
router.get('/projectOptions', getProjectOptions);

module.exports = router;