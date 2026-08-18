const express = require('express');
const {
  createDutyRosterEntry,
  getDutyRoster,
  updateDutyRosterEntry,
} = require('../controllers/dutyRosterController');
const { attachActiveUser, requireAccess } = require('../middleware/authContext');

const router = express.Router();

router.route('/').get(attachActiveUser, requireAccess({ moduleId: 'duty', dataPermission: 'duty_records' }), getDutyRoster).post(attachActiveUser, requireAccess({ moduleId: 'duty', actionPermission: 'manage_duty' }), createDutyRosterEntry);
router.route('/:id').patch(attachActiveUser, requireAccess({ moduleId: 'duty', actionPermission: 'manage_duty' }), updateDutyRosterEntry);

module.exports = router;
