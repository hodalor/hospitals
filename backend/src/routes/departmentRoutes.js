const express = require('express');
const {
  createDepartment,
  getDepartments,
  updateDepartment,
} = require('../controllers/departmentController');
const { attachActiveUser, requireAccess } = require('../middleware/authContext');

const router = express.Router();

router.route('/').get(attachActiveUser, getDepartments).post(attachActiveUser, requireAccess({ moduleId: 'settings_config', actionPermission: 'manage_users' }), createDepartment);
router.route('/:id').patch(attachActiveUser, requireAccess({ moduleId: 'settings_config', actionPermission: 'manage_users' }), updateDepartment);

module.exports = router;
