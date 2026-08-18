const Appointment = require('../models/Appointment');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const Patient = require('../models/Patient');
const Prescription = require('../models/Prescription');
const User = require('../models/User');
const Visit = require('../models/Visit');
const { buildQueueSnapshot } = require('../services/visitWorkflowService');
const { asyncHandler } = require('../utils/asyncHandler');
const { buildBranchFilter } = require('../utils/branchScope');

const getOverview = asyncHandler(async (req, res) => {
  const branchFilter = buildBranchFilter(req);
  const [
    patientCount,
    activeVisits,
    appointmentCount,
    userCount,
    invoices,
    payments,
    prescriptions,
    visits,
    appointments,
  ] = await Promise.all([
    Patient.countDocuments(),
    Visit.countDocuments({ visitStatus: { $ne: 'Closed' }, ...branchFilter }),
    Appointment.countDocuments(branchFilter),
    User.countDocuments(),
    Invoice.find(branchFilter),
    Payment.find(branchFilter),
    Prescription.find(branchFilter),
    Visit.find(branchFilter),
    Appointment.find(branchFilter),
  ]);

  const paidInvoices = invoices.filter((item) => item.status === 'Paid').length;
  const activePrescriptions = prescriptions.filter(
    (item) => item.paymentState !== 'Verified' || item.stockCheck !== 'Available'
  ).length;

  const stageMap = visits.reduce((accumulator, visit) => {
    const key = visit.visitStatus || 'Unknown';
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {});

  const stageChart = Object.entries(stageMap).map(([name, value]) => ({ name, value }));

  const departmentMap = visits.reduce((accumulator, visit) => {
    const key = visit.department || 'Unassigned';
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {});

  const departmentChart = Object.entries(departmentMap)
    .map(([name, visitsCount]) => ({ name, visits: visitsCount }))
    .slice(0, 6);

  const queueSnapshot = buildQueueSnapshot(visits);
  const activeQueueTotal = queueSnapshot.queueChart.reduce(
    (total, item) => total + item.value,
    0
  );

  const billingMap = invoices.reduce((accumulator, invoice) => {
    const key = invoice.status || 'Pending';
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {});

  const billingChart = Object.entries(billingMap).map(([name, value]) => ({ name, value }));

  const revenueByCategory = payments.reduce((accumulator, payment) => {
    const key = payment.serviceCategory || payment.service || 'Other Revenue';
    accumulator[key] = (accumulator[key] || 0) + Number(payment.amount || 0);
    return accumulator;
  }, {});

  const revenueChart = Object.entries(revenueByCategory)
    .map(([name, value]) => ({ name, value }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 8);

  const revenueTotal = payments.reduce((total, payment) => total + Number(payment.amount || 0), 0);

  const now = new Date();
  const trendChart = Array.from({ length: 7 }).map((_, index) => {
    const currentDate = new Date(now);
    currentDate.setDate(now.getDate() - (6 - index));
    const key = currentDate.toISOString().slice(0, 10);

    return {
      day: currentDate.toLocaleDateString('en-GB', { month: 'short', day: '2-digit' }),
      appointments: appointments.filter(
        (item) => item.appointmentDate && item.appointmentDate.toISOString().slice(0, 10) === key
      ).length,
      visits: visits.filter((item) => item.createdAt.toISOString().slice(0, 10) === key).length,
    };
  });

  res.json({
    success: true,
    data: {
      kpis: [
        { label: 'Patients', value: patientCount },
        { label: 'Open Visits', value: activeVisits },
        { label: 'Appointments', value: appointmentCount },
        { label: 'Users', value: userCount },
        { label: 'Paid Invoices', value: paidInvoices },
        { label: 'Revenue', value: revenueTotal.toLocaleString() },
        { label: 'Active Scripts', value: activePrescriptions },
        { label: 'Queue Load', value: activeQueueTotal },
      ],
      stageChart,
      departmentChart,
      queueChart: queueSnapshot.queueChart,
      billingChart,
      revenueChart,
      trendChart,
    },
  });
});

module.exports = { getOverview };
