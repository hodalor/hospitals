const express = require('express');
const {
  createDepartmentCategory,
  getDepartmentCategories,
  updateDepartmentCategory,
} = require('../controllers/departmentCategoryController');
const { attachActiveUser, requireAccess } = require('../middleware/authContext');

const router = express.Router();

router.route('/').get(attachActiveUser, getDepartmentCategories).post(attachActiveUser, requireAccess({ moduleId: 'settings_config', actionPermission: 'manage_users' }), createDepartmentCategory);
router.route('/:id').patch(attachActiveUser, requireAccess({ moduleId: 'settings_config', actionPermission: 'manage_users' }), updateDepartmentCategory);

module.exports = router;
