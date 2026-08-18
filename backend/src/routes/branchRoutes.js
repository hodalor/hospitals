const express = require('express');
const { getBranches } = require('../controllers/branchController');
const { attachActiveUser } = require('../middleware/authContext');

const router = express.Router();

router.get('/', attachActiveUser, getBranches);

module.exports = router;
