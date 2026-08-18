const Branding = require('../models/Branding');
const { asyncHandler } = require('../utils/asyncHandler');
const {
  ensureDefaultMainBranch,
  MAIN_BRANCH_NAME,
  normalizeBranches,
  syncBranchRegistry,
} = require('../services/branchService');

const defaultBranding = {
  hospitalName: 'HealthNova Hospital',
  branchName: MAIN_BRANCH_NAME,
  address: 'Hospital Road',
  location: 'HealthNova',
  phoneNumbers: '+260 000 000 000 / +233 000 000 000',
  email: 'finance@healthnova.local',
  logoDataUrl: '',
  defaultCurrency: 'GHS',
  currencies: [
    {
      code: 'GHS',
      name: 'Ghana Cedi',
      symbol: 'GHS',
      isDefault: true,
      isActive: true,
    },
  ],
  branches: [
    {
      name: MAIN_BRANCH_NAME,
      code: 'MAIN',
      address: '',
      location: '',
      phoneNumbers: '',
      email: '',
      isMain: true,
      isActive: true,
    },
  ],
};

function normalizeCurrencies(currencies = [], defaultCurrency = defaultBranding.defaultCurrency) {
  const seenCodes = new Set();
  const normalized = (Array.isArray(currencies) ? currencies : [])
    .map((currency) => {
      const code = String(currency?.code || '')
        .trim()
        .toUpperCase()
        .slice(0, 3);

      if (!/^[A-Z]{3}$/.test(code) || seenCodes.has(code)) {
        return null;
      }

      seenCodes.add(code);

      return {
        code,
        name: String(currency?.name || code).trim() || code,
        symbol: String(currency?.symbol || code).trim() || code,
        isDefault: Boolean(currency?.isDefault),
        isActive: currency?.isActive !== false,
      };
    })
    .filter(Boolean);

  if (!normalized.length) {
    return defaultBranding.currencies;
  }

  const preferredDefault = String(defaultCurrency || '').trim().toUpperCase();
  const hasPreferredDefault = normalized.some((currency) => currency.code === preferredDefault);
  const ensuredDefaultCode = hasPreferredDefault ? preferredDefault : normalized[0].code;

  return normalized.map((currency) => ({
    ...currency,
    isDefault: currency.code === ensuredDefaultCode,
  }));
}

const serializeBranding = (branding) => ({
  id: branding?._id || 'default-branding',
  hospitalName: branding?.hospitalName || defaultBranding.hospitalName,
  branchName: branding?.branchName || defaultBranding.branchName,
  address: branding?.address || defaultBranding.address,
  location: branding?.location || defaultBranding.location,
  phoneNumbers: branding?.phoneNumbers || defaultBranding.phoneNumbers,
  email: branding?.email || defaultBranding.email,
  logoDataUrl: branding?.logoDataUrl || '',
  defaultCurrency: branding?.defaultCurrency || defaultBranding.defaultCurrency,
  currencies: normalizeCurrencies(
    branding?.currencies?.length ? branding.currencies : defaultBranding.currencies,
    branding?.defaultCurrency || defaultBranding.defaultCurrency
  ),
  branches: normalizeBranches(branding?.branches?.length ? branding.branches : defaultBranding.branches),
});

const getBranding = asyncHandler(async (_req, res) => {
  await ensureDefaultMainBranch();
  const branding = await Branding.findOne().sort({ createdAt: 1 });

  res.json({
    success: true,
    data: serializeBranding(branding),
  });
});

const upsertBranding = asyncHandler(async (req, res) => {
  const existingBranding = await Branding.findOne().sort({ createdAt: 1 });
  const normalizedBranches = normalizeBranches(req.body.branches);
  const mainBranch = normalizedBranches.find((branch) => branch.isMain) || normalizedBranches[0];
  const normalizedCurrencies = normalizeCurrencies(req.body.currencies, req.body.defaultCurrency);
  const mainCurrency = normalizedCurrencies.find((currency) => currency.isDefault) || normalizedCurrencies[0];

  const payload = {
    hospitalName: req.body.hospitalName || defaultBranding.hospitalName,
    branchName: mainBranch?.name || req.body.branchName || MAIN_BRANCH_NAME,
    address: req.body.address || '',
    location: req.body.location || '',
    phoneNumbers: req.body.phoneNumbers || '',
    email: req.body.email || '',
    logoDataUrl: req.body.logoDataUrl || '',
    defaultCurrency: mainCurrency?.code || defaultBranding.defaultCurrency,
    currencies: normalizedCurrencies,
    branches: normalizedBranches,
  };

  const branding = existingBranding
    ? await Branding.findByIdAndUpdate(existingBranding._id, payload, {
        new: true,
        runValidators: true,
      })
    : await Branding.create(payload);

  await syncBranchRegistry(payload.branches);

  res.json({
    success: true,
    data: serializeBranding(branding),
  });
});

module.exports = {
  defaultBranding,
  getBranding,
  serializeBranding,
  upsertBranding,
};
