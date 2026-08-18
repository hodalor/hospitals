const express = require('express');
const {
  activateSubscriptionCode,
  getCurrentSubscription,
  initializeSubscriptionPayment,
  verifySubscriptionPayment,
} = require('../controllers/subscriptionController');
const { attachActiveUser } = require('../middleware/authContext');

const router = express.Router();

router.get('/current', attachActiveUser, getCurrentSubscription);
router.post('/activate', attachActiveUser, activateSubscriptionCode);
router.post('/paystack/initialize', attachActiveUser, initializeSubscriptionPayment);
router.get('/paystack/verify', attachActiveUser, verifySubscriptionPayment);

module.exports = router;
