const express = require('express');
const {
  createAppointment,
  getAppointments,
  updateAppointment,
} = require('../controllers/appointmentController');
const { attachActiveUser, requireAccess } = require('../middleware/authContext');

const router = express.Router();

router.route('/').get(attachActiveUser, requireAccess({ moduleId: 'appointments', dataPermission: 'appointment_records' }), getAppointments).post(attachActiveUser, requireAccess({ moduleId: 'appointments', actionPermission: 'create_appointment' }), createAppointment);
router.route('/:id').patch(attachActiveUser, requireAccess({ moduleId: 'appointments', actionPermission: 'edit_appointment' }), updateAppointment);

module.exports = router;
