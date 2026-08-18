const crypto = require('crypto');
const ACTIVATION_CODE_PATTERN = /^[A-Z0-9]{12}$/;

function addDays(baseDate, days) {
  const result = new Date(baseDate);
  result.setDate(result.getDate() + Number(days || 0));
  return result;
}

function generateActivationCode(length = 12) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';

  while (code.length < length) {
    const bytes = crypto.randomBytes(length);
    for (const value of bytes) {
      code += alphabet[value % alphabet.length];
      if (code.length === length) {
        break;
      }
    }
  }

  return code;
}

function normalizeActivationCode(value = '') {
  return String(value || '')
    .trim()
    .toUpperCase();
}

function isValidActivationCode(value) {
  return ACTIVATION_CODE_PATTERN.test(normalizeActivationCode(value));
}

function getSubscriptionStatus(hospital) {
  if (!hospital || !hospital.subscriptionExpiresAt) {
    return {
      expired: false,
      expiresAt: null,
      monthlyAmount: Number(hospital?.subscriptionMonthlyAmount || 0),
      currency: hospital?.subscriptionCurrency || 'GHS',
      activationCodeConfigured: Boolean(hospital?.subscriptionActivationCode),
    };
  }

  const expiresAt = new Date(hospital.subscriptionExpiresAt);
  const expired = expiresAt.getTime() < Date.now();

  return {
    expired,
    expiresAt,
    monthlyAmount: Number(hospital.subscriptionMonthlyAmount || 0),
    currency: hospital?.subscriptionCurrency || 'GHS',
    activationCodeConfigured: Boolean(hospital.subscriptionActivationCode),
  };
}

function applySubscriptionExtension(hospital, days, source, options = {}) {
  const preserveExisting = Boolean(options.preserveExisting);
  const currentExpiry = hospital?.subscriptionExpiresAt ? new Date(hospital.subscriptionExpiresAt) : null;
  const baseDate =
    preserveExisting && currentExpiry && currentExpiry.getTime() > Date.now()
      ? currentExpiry
      : new Date();
  const nextExpiry = addDays(baseDate, days);
  hospital.subscriptionExpiresAt = nextExpiry;

  if (source === 'activation_code') {
    hospital.subscriptionLastActivatedAt = new Date();
  }

  if (source === 'paystack') {
    hospital.subscriptionLastPaymentAt = new Date();
  }

  return nextExpiry;
}

module.exports = {
  addDays,
  applySubscriptionExtension,
  generateActivationCode,
  getSubscriptionStatus,
  isValidActivationCode,
  normalizeActivationCode,
};
