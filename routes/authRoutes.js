const express = require('express');
const { signUp, login } = require('../controllers/authController');
const { addDoctor } = require('../controllers/AddDoctor');
const { addPatient } = require('../controllers/AddPatient');
const { getDoctors } = require('../controllers/Doctors');
const { getAppointments } = require('../controllers/AddAppointment');
const { updateAppointment } = require('../controllers/UpdateAppointment');

const router = express.Router();

// Configure multer for file uploads
const multer = require('multer');
const path = require('path');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});
const upload = multer({ storage: storage });

// Use loginC instead of login
router.post('/signUp', signUp);
router.post('/login', login);
router.post('/addDoctor', addDoctor);
router.post('/addPatient', addPatient);
router.get('/getDoctors', getDoctors);
router.post('/getAppointments', getAppointments);
router.post('/updateAppointment', updateAppointment);

module.exports = router;