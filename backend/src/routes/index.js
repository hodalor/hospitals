const express = require('express');
const appointmentRoutes = require('./appointmentRoutes');
const billingRoutes = require('./billingRoutes');
const branchRoutes = require('./branchRoutes');
const brandingRoutes = require('./brandingRoutes');
const departmentCategoryRoutes = require('./departmentCategoryRoutes');
const departmentRoutes = require('./departmentRoutes');
const dutyRosterRoutes = require('./dutyRosterRoutes');
const hospitalRoutes = require('./hospitalRoutes');
const overviewRoutes = require('./overviewRoutes');
const patientRoutes = require('./patientRoutes');
const pricingRoutes = require('./pricingRoutes');
const subscriptionRoutes = require('./subscriptionRoutes');
const userRoutes = require('./userRoutes');
const visitRoutes = require('./visitRoutes');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'HealthNova backend is running',
    timestamp: new Date().toISOString(),
  });
});

router.use('/patients', patientRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/visits', visitRoutes);
router.use('/billing', billingRoutes);
router.use('/branches', branchRoutes);
router.use('/branding', brandingRoutes);
router.use('/departments', departmentRoutes);
router.use('/department-categories', departmentCategoryRoutes);
router.use('/duty-roster', dutyRosterRoutes);
router.use('/overview', overviewRoutes);
router.use('/hospitals', hospitalRoutes);
router.use('/users', userRoutes);
router.use('/pricing', pricingRoutes);
router.use('/subscriptions', subscriptionRoutes);

module.exports = router;
