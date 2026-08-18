const express = require('express');
const {
  createPatient,
  getPatients,
  getPatientProfile,
  searchPatients,
  updatePatient,
} = require('../controllers/patientController');
const { attachActiveUser, requireAccess } = require('../middleware/authContext');

const router = express.Router();

router.get('/search', attachActiveUser, requireAccess({ moduleId: 'patients', dataPermission: 'patient_records' }), searchPatients);
router.get('/:id/profile', attachActiveUser, requireAccess({ moduleId: 'patients', dataPermission: 'patient_records' }), getPatientProfile);
router.route('/').get(attachActiveUser, requireAccess({ moduleId: 'patients', dataPermission: 'patient_records' }), getPatients).post(attachActiveUser, requireAccess({ moduleId: 'patients', actionPermission: 'create_patient' }), createPatient);
router.route('/:id').patch(attachActiveUser, requireAccess({ moduleId: 'patients', actionPermission: 'edit_patient' }), updatePatient);

module.exports = router;
