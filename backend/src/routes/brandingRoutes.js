const express = require('express');
const { getBranding, upsertBranding } = require('../controllers/brandingController');
const { attachActiveUser, requireAccess } = require('../middleware/authContext');

const router = express.Router();

router.route('/').get(attachActiveUser, getBranding).post(attachActiveUser, requireAccess({ moduleId: 'settings_config', actionPermission: 'manage_users' }), upsertBranding).patch(attachActiveUser, requireAccess({ moduleId: 'settings_config', actionPermission: 'manage_users' }), upsertBranding);

module.exports = router;
