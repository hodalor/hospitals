const Hospital = require('../models/Hospital');
const SubscriptionPayment = require('../models/SubscriptionPayment');
const { asyncHandler } = require('../utils/asyncHandler');
const { buildSessionPayload } = require('../utils/sessionPayload');
const {
  applySubscriptionExtension,
  getSubscriptionStatus,
  isValidActivationCode,
  normalizeActivationCode,
} = require('../services/subscriptionService');

function ensureTenantSubscriptionTarget(req) {
  if (!req.activeUser) {
    const error = new Error('Authentication is required.');
    error.statusCode = 401;
    throw error;
  }

  if (req.tenant?.isMasterTenant) {
    const error = new Error('Subscription actions are available only for hospital tenants.');
    error.statusCode = 400;
    throw error;
  }
}

function buildReference(hospitalId) {
  return `SUB-${String(hospitalId || '').toUpperCase()}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase()}`;
}

function getFrontendBaseUrl() {
  return (
    process.env.FRONTEND_BASE_URL ||
    process.env.APP_BASE_URL ||
    process.env.CLIENT_URL ||
    'http://localhost:3000'
  ).replace(/\/+$/, '');
}

async function getCurrentHospital(req) {
  const hospital = await Hospital.findOne({
    hospitalId: req.tenant?.tenantId,
    isActive: true,
  });

  if (!hospital) {
    const error = new Error('Hospital account not found or inactive.');
    error.statusCode = 404;
    throw error;
  }

  return hospital;
}

async function buildTenantSession(req, hospital) {
  return buildSessionPayload({
    user: req.activeUser,
    hospital,
    tenantDbName: req.tenant?.dbName,
  });
}

const getCurrentSubscription = asyncHandler(async (req, res) => {
  ensureTenantSubscriptionTarget(req);
  const hospital = await getCurrentHospital(req);

  res.json({
    success: true,
    data: {
      hospitalId: hospital.hospitalId,
      hospitalName: hospital.hospitalName,
      contactEmail: hospital.contactEmail || '',
      subscriptionMonthlyAmount: Number(hospital.subscriptionMonthlyAmount || 0),
      subscriptionCurrency: hospital.subscriptionCurrency || 'GHS',
      subscriptionExpiresAt: hospital.subscriptionExpiresAt || null,
      subscriptionExpired: getSubscriptionStatus(hospital).expired,
      subscriptionActivationCodeConfigured: Boolean(hospital.subscriptionActivationCode),
    },
  });
});

const activateSubscriptionCode = asyncHandler(async (req, res) => {
  ensureTenantSubscriptionTarget(req);
  const hospital = await getCurrentHospital(req);
  const activationCode = normalizeActivationCode(req.body.activationCode);

  if (!activationCode) {
    res.status(400);
    throw new Error('Activation code is required.');
  }

  if (!isValidActivationCode(activationCode)) {
    res.status(400);
    throw new Error('Activation code must be 12 alphanumeric characters.');
  }

  if (!hospital.subscriptionActivationCode || activationCode !== hospital.subscriptionActivationCode) {
    res.status(400);
    throw new Error('Invalid activation code.');
  }

  hospital.subscriptionActivationCode = '';
  hospital.subscriptionActivationCodeUsedAt = new Date();
  applySubscriptionExtension(hospital, 30, 'activation_code');
  await hospital.save();

  res.json({
    success: true,
    data: await buildTenantSession(req, hospital),
  });
});

const initializeSubscriptionPayment = asyncHandler(async (req, res) => {
  ensureTenantSubscriptionTarget(req);
  const hospital = await getCurrentHospital(req);
  const months = Math.max(1, Math.min(24, Number(req.body.months || 1)));
  const email = String(req.body.email || hospital.contactEmail || '').trim().toLowerCase();
  const monthlyAmount = Number(hospital.subscriptionMonthlyAmount || 0);
  const currency = String(hospital.subscriptionCurrency || 'GHS')
    .trim()
    .toUpperCase();

  if (!email) {
    res.status(400);
    throw new Error('A contact email is required before starting payment.');
  }

  if (!monthlyAmount) {
    res.status(400);
    throw new Error('Monthly subscription amount has not been configured for this tenant.');
  }

  if (!process.env.PAYSTACK_SECRET_KEY) {
    res.status(500);
    throw new Error('Paystack secret key is not configured yet.');
  }

  const totalAmount = monthlyAmount * months;
  const reference = buildReference(hospital.hospitalId);
  const expiresBefore = hospital.subscriptionExpiresAt || null;

  await SubscriptionPayment.create({
    hospitalId: hospital.hospitalId,
    hospitalName: hospital.hospitalName,
    email,
    months,
    monthlyAmount,
    totalAmount,
    currency,
    reference,
    status: 'initialized',
    expiresBefore,
    metadata: {
      initiatedBy: req.activeUser.username,
    },
  });

  const callbackUrl = `${getFrontendBaseUrl()}?subscription_payment=paystack&reference=${encodeURIComponent(reference)}`;
  const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      amount: String(Math.round(totalAmount * 100)),
      currency,
      reference,
      callback_url: callbackUrl,
      metadata: {
        hospitalId: hospital.hospitalId,
        months,
        totalAmount,
      },
    }),
  });

  const paystackPayload = await paystackResponse.json();

  if (!paystackResponse.ok || !paystackPayload.status) {
    res.status(400);
    throw new Error(paystackPayload.message || 'Unable to initialize Paystack payment.');
  }

  res.json({
    success: true,
    data: {
      authorizationUrl: paystackPayload.data.authorization_url,
      reference,
      totalAmount,
      months,
      currency,
    },
  });
});

const verifySubscriptionPayment = asyncHandler(async (req, res) => {
  ensureTenantSubscriptionTarget(req);
  const hospital = await getCurrentHospital(req);
  const reference = String(req.query.reference || req.body.reference || '').trim();

  if (!reference) {
    res.status(400);
    throw new Error('Payment reference is required.');
  }

  const payment = await SubscriptionPayment.findOne({
    hospitalId: hospital.hospitalId,
    reference,
  });

  if (!payment) {
    res.status(404);
    throw new Error('Subscription payment record not found.');
  }

  if (!process.env.PAYSTACK_SECRET_KEY) {
    res.status(500);
    throw new Error('Paystack secret key is not configured yet.');
  }

  const verifyResponse = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    }
  );

  const verifyPayload = await verifyResponse.json();

  if (!verifyResponse.ok || !verifyPayload.status) {
    res.status(400);
    throw new Error(verifyPayload.message || 'Unable to verify Paystack payment.');
  }

  const transactionData = verifyPayload.data || {};
  if (transactionData.status !== 'success') {
    payment.status = transactionData.status || 'failed';
    payment.gatewayResponse = transactionData.gateway_response || transactionData.message || '';
    payment.verifiedAt = new Date();
    await payment.save();

    res.status(400);
    throw new Error('Payment is not successful yet.');
  }

  const expectedAmountInKobo = Math.round(Number(payment.totalAmount || 0) * 100);
  if (Number(transactionData.amount || 0) !== expectedAmountInKobo) {
    res.status(400);
    throw new Error('Verified payment amount does not match the expected subscription amount.');
  }

  if (payment.status !== 'success') {
    const expiresAfter = applySubscriptionExtension(hospital, payment.months * 30, 'paystack', {
      preserveExisting: true,
    });
    await hospital.save();

    payment.status = 'success';
    payment.gatewayResponse = transactionData.gateway_response || '';
    payment.paystackTransactionId = String(transactionData.id || '');
    payment.paidAt = transactionData.paid_at ? new Date(transactionData.paid_at) : new Date();
    payment.verifiedAt = new Date();
    payment.expiresAfter = expiresAfter;
    await payment.save();
  }

  res.json({
    success: true,
    data: await buildTenantSession(req, hospital),
  });
});

module.exports = {
  activateSubscriptionCode,
  getCurrentSubscription,
  initializeSubscriptionPayment,
  verifySubscriptionPayment,
};
