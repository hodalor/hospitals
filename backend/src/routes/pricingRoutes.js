const express = require('express');
const {
  createPricingItem,
  getPricingItems,
  updatePricingItem,
} = require('../controllers/pricingController');
const { attachActiveUser, requireAccess } = require('../middleware/authContext');

const router = express.Router();

router.route('/').get(attachActiveUser, getPricingItems).post(attachActiveUser, requireAccess({ actionPermission: 'manage_pricing' }), createPricingItem);
router.route('/:id').patch(attachActiveUser, requireAccess({ actionPermission: 'manage_pricing' }), updatePricingItem);

module.exports = router;
