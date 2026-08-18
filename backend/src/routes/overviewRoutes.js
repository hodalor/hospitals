const express = require('express');
const { getOverview } = require('../controllers/overviewController');
const { attachActiveUser, requireAccess } = require('../middleware/authContext');

const router = express.Router();

router.get('/', attachActiveUser, requireAccess({ moduleId: 'dashboard', dataPermission: 'overview' }), getOverview);

module.exports = router;
