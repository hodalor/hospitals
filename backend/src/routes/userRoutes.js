const express = require('express');
const { createUser, getCurrentSession, getUsers, loginUser, updateUser } = require('../controllers/userController');
const { attachActiveUser, requireAccess } = require('../middleware/authContext');

const router = express.Router();

router.post('/login', loginUser);
router.get('/session', attachActiveUser, getCurrentSession);
router.route('/').get(attachActiveUser, getUsers).post(attachActiveUser, requireAccess({ moduleId: 'users', actionPermission: 'manage_users' }), createUser);
router.route('/:id').patch(attachActiveUser, requireAccess({ moduleId: 'users', actionPermission: 'manage_users' }), updateUser);

module.exports = router;
