const express = require('express');
const {
  createVisit,
  getVisits,
  getVisitQueues,
  updateVisit,
} = require('../controllers/visitController');
const { attachActiveUser, requireAccess } = require('../middleware/authContext');

const router = express.Router();

router.get('/queues', attachActiveUser, requireAccess({ moduleId: 'departments', dataPermission: 'department_records' }), getVisitQueues);
router.route('/').get(attachActiveUser, requireAccess({ moduleId: 'visits', dataPermission: 'visit_records' }), getVisits).post(attachActiveUser, requireAccess({ moduleId: 'visits', actionPermission: 'open_visit' }), createVisit);
router.route('/:id').patch(attachActiveUser, requireAccess({ actionPermission: 'edit_visit' }), updateVisit);

module.exports = router;
