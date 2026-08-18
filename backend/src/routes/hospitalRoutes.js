const express = require('express');
const { createHospital, getHospitals, updateHospital } = require('../controllers/hospitalController');
const { attachActiveUser, requireMasterSuperAdmin } = require('../middleware/authContext');

const router = express.Router();

router.route('/').get(attachActiveUser, requireMasterSuperAdmin, getHospitals).post(attachActiveUser, requireMasterSuperAdmin, createHospital);
router.route('/:id').patch(attachActiveUser, requireMasterSuperAdmin, updateHospital);

module.exports = router;
