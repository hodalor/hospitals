const bcrypt = require('bcryptjs');
const Hospital = require('../models/Hospital');
const User = require('../models/User');
const Branding = require('../models/Branding');
const { asyncHandler } = require('../utils/asyncHandler');
const {
  getMasterTenantId,
  getTenantConnection,
  runWithTenantContext,
  sanitizeDatabaseName,
} = require('../config/db');
const {
  actionPermissionOptions: allowedActionPermissions,
  dataPermissionOptions: allowedDataPermissions,
  getTenantPermissionScope,
  menuPermissionOptions: allowedModuleIds,
  queuePermissionOptions: allowedQueuePermissions,
} = require('../config/permissionCatalog');
const { seedDepartments } = require('../services/seedDepartments');
const { seedPricingCatalog } = require('../services/seedPricingCatalog');
const { ensureDefaultMainBranch, MAIN_BRANCH_NAME } = require('../services/branchService');
const {
  generateActivationCode,
  getSubscriptionStatus,
  isValidActivationCode,
  normalizeActivationCode,
} = require('../services/subscriptionService');

const allTenantModules = allowedModuleIds.filter((item) => item !== 'hospital_management');

function normalizeArray(values, allowedValues) {
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => String(value || '').trim())
        .filter((value) => allowedValues.includes(value))
    )
  );
}

function parseBooleanFlag(value, defaultValue = true) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  return String(value).trim().toLowerCase() === 'true';
}

function parseNumber(value, defaultValue = 0) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : defaultValue;
}

function normalizeCurrencyCode(value, defaultValue = 'GHS') {
  const normalizedValue = String(value || defaultValue)
    .trim()
    .toUpperCase()
    .slice(0, 3);

  if (!/^[A-Z]{3}$/.test(normalizedValue)) {
    throw new Error('Currency code must be a 3-letter value like GHS or ZMW.');
  }

  return normalizedValue;
}

function parseOptionalDate(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error('Enter a valid subscription expiry date.');
  }

  return parsedDate;
}

async function generateUniqueDatabaseName(hospitalId, excludeHospitalId = '') {
  const baseName = sanitizeDatabaseName(`tenant_${hospitalId}`, 'tenant');
  let candidate = baseName;
  let counter = 2;

  // Keep trying predictable suffixes until the registry no longer contains the name.
  while (
    await Hospital.findOne({
      dbName: candidate,
      ...(excludeHospitalId
        ? { hospitalId: { $ne: excludeHospitalId } }
        : {}),
    })
  ) {
    candidate = `${baseName}_${counter}`;
    counter += 1;
  }

  return candidate;
}

async function applySharedSeedData(hospital) {
  const tenantContext = {
    tenantId: hospital.hospitalId,
    dbName: hospital.dbName,
    connection: getTenantConnection(hospital.dbName),
    isMasterTenant: false,
    hospitalName: hospital.hospitalName,
    enabledModules: hospital.enabledModules,
  };

  await runWithTenantContext(tenantContext, async () => {
    await ensureDefaultMainBranch();
    await seedDepartments();
    await seedPricingCatalog();
    const existingBranding = await Branding.findOne().sort({ createdAt: 1 });

    await Branding.findOneAndUpdate(
      {},
      {
        hospitalName: hospital.hospitalName,
        branchName: existingBranding?.branchName || MAIN_BRANCH_NAME,
        defaultCurrency: existingBranding?.defaultCurrency || hospital.subscriptionCurrency || 'GHS',
        currencies:
          existingBranding?.currencies?.length
            ? existingBranding.currencies
            : [
                {
                  code: hospital.subscriptionCurrency || 'GHS',
                  name: hospital.subscriptionCurrency || 'GHS',
                  symbol: hospital.subscriptionCurrency || 'GHS',
                  isDefault: true,
                  isActive: true,
                },
              ],
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );
  });
}

async function upsertTenantDefaultAdmin(hospital, pin = '') {
  const tenantContext = {
    tenantId: hospital.hospitalId,
    dbName: hospital.dbName,
    connection: getTenantConnection(hospital.dbName),
    isMasterTenant: false,
    hospitalName: hospital.hospitalName,
    enabledModules: hospital.enabledModules,
  };

  await runWithTenantContext(tenantContext, async () => {
    const existingUser = await User.findOne({ username: hospital.adminUsername });
    const existingBranding = await Branding.findOne().sort({ createdAt: 1 });
    const tenantScope = getTenantPermissionScope(hospital.enabledModules, false);
    const update = {
      fullName: hospital.adminFullName || `${hospital.hospitalName} Admin`,
      username: hospital.adminUsername,
      role: 'Admin',
      department: 'System',
      branchName: MAIN_BRANCH_NAME,
      menuPermissions: hospital.enabledModules,
      dataPermissions: normalizeArray(tenantScope.dataPermissions, allowedDataPermissions),
      actionPermissions: normalizeArray(tenantScope.actionPermissions, allowedActionPermissions),
      queuePermissions: normalizeArray(tenantScope.queuePermissions, allowedQueuePermissions),
      isSuperAdmin: false,
      isActive: hospital.isActive !== false,
    };

    if (pin) {
      update.passwordHash = await bcrypt.hash(pin, 10);
    } else if (!existingUser) {
      throw new Error('A default admin PIN is required when creating a hospital tenant.');
    }

    await User.findOneAndUpdate(
      { username: hospital.adminUsername },
      update,
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    await Branding.findOneAndUpdate(
      {},
      {
        hospitalName: hospital.hospitalName,
        branchName: existingBranding?.branchName || MAIN_BRANCH_NAME,
        defaultCurrency: existingBranding?.defaultCurrency || hospital.subscriptionCurrency || 'GHS',
        currencies:
          existingBranding?.currencies?.length
            ? existingBranding.currencies
            : [
                {
                  code: hospital.subscriptionCurrency || 'GHS',
                  name: hospital.subscriptionCurrency || 'GHS',
                  symbol: hospital.subscriptionCurrency || 'GHS',
                  isDefault: true,
                  isActive: true,
                },
              ],
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    await ensureDefaultMainBranch();
  });
}

function serializeHospital(hospital) {
  return {
    id: hospital._id,
    hospitalId: hospital.hospitalId,
    hospitalName: hospital.hospitalName,
    dbName: hospital.dbName,
    adminFullName: hospital.adminFullName || '',
    adminUsername: hospital.adminUsername || '',
    contactEmail: hospital.contactEmail || '',
    contactPhone: hospital.contactPhone || '',
    enabledModules: hospital.enabledModules || [],
    seedSharedCatalogs: Boolean(hospital.seedSharedCatalogs),
    sharedCatalogsSeededAt: hospital.sharedCatalogsSeededAt || null,
    subscriptionMonthlyAmount: Number(hospital.subscriptionMonthlyAmount || 0),
    subscriptionCurrency: hospital.subscriptionCurrency || 'GHS',
    subscriptionExpiresAt: hospital.subscriptionExpiresAt || null,
    subscriptionActivationCode: hospital.subscriptionActivationCode || '',
    subscriptionActivationCodeIssuedAt: hospital.subscriptionActivationCodeIssuedAt || null,
    subscriptionActivationCodeUsedAt: hospital.subscriptionActivationCodeUsedAt || null,
    subscriptionLastActivatedAt: hospital.subscriptionLastActivatedAt || null,
    subscriptionLastPaymentAt: hospital.subscriptionLastPaymentAt || null,
    subscriptionStatus: getSubscriptionStatus(hospital),
    isActive: hospital.isActive !== false,
    createdAt: hospital.createdAt,
    updatedAt: hospital.updatedAt,
  };
}

async function ensureMasterSuperAdmin(req) {
  if (!req.tenant?.isMasterTenant || !req.tenant?.tenantId || req.tenant.tenantId !== getMasterTenantId()) {
    const error = new Error('Hospital management is available only in the master tenant.');
    error.statusCode = 403;
    throw error;
  }

  if (!req.activeUser || !req.activeUser.isSuperAdmin) {
    const error = new Error('Only the master super admin can manage hospitals.');
    error.statusCode = 403;
    throw error;
  }
}

const getHospitals = asyncHandler(async (req, res) => {
  await ensureMasterSuperAdmin(req);
  const hospitals = await Hospital.find().sort({ createdAt: -1 });
  res.json({ success: true, data: hospitals.map(serializeHospital) });
});

const createHospital = asyncHandler(async (req, res) => {
  await ensureMasterSuperAdmin(req);

  const hospitalId = sanitizeDatabaseName(req.body.hospitalId, '').slice(0, 40);

  if (!hospitalId) {
    res.status(400);
    throw new Error('Hospital ID is required.');
  }

  if (!String(req.body.hospitalName || '').trim()) {
    res.status(400);
    throw new Error('Hospital name is required.');
  }

  if (!String(req.body.adminUsername || '').trim()) {
    res.status(400);
    throw new Error('Hospital admin username is required.');
  }

  const pin = String(req.body.pin || '').trim();
  if (!/^\d{4,6}$/.test(pin)) {
    res.status(400);
    throw new Error('PIN must be a 4 to 6 digit number.');
  }

  if (hospitalId === getMasterTenantId()) {
    res.status(400);
    throw new Error('Reserved tenant identifiers cannot be reused.');
  }

  const existingHospital = await Hospital.findOne({ hospitalId });
  if (existingHospital) {
    res.status(409);
    throw new Error('A hospital tenant with this hospital ID already exists.');
  }

  const dbName = await generateUniqueDatabaseName(hospitalId);
  const shouldGenerateActivationCode = parseBooleanFlag(req.body.generateActivationCode, false);
  const requestedActivationCode = normalizeActivationCode(req.body.subscriptionActivationCode);

  if (requestedActivationCode && !isValidActivationCode(requestedActivationCode)) {
    res.status(400);
    throw new Error('Activation code must be 12 alphanumeric characters.');
  }

  const enabledModules = normalizeArray(
    req.body.enabledModules?.length ? req.body.enabledModules : allTenantModules,
    allTenantModules
  );
  const subscriptionCurrency = normalizeCurrencyCode(req.body.subscriptionCurrency, 'GHS');

  const hospital = await Hospital.create({
    hospitalId,
    hospitalName: String(req.body.hospitalName || '').trim(),
    dbName,
    adminFullName: String(req.body.adminFullName || '').trim(),
    adminUsername: String(req.body.adminUsername || '').trim().toLowerCase(),
    contactEmail: String(req.body.contactEmail || '').trim().toLowerCase(),
    contactPhone: String(req.body.contactPhone || '').trim(),
    enabledModules,
    seedSharedCatalogs: Boolean(req.body.seedSharedCatalogs),
    sharedCatalogsSeededAt: null,
    subscriptionMonthlyAmount: parseNumber(req.body.subscriptionMonthlyAmount, 0),
    subscriptionCurrency,
    subscriptionExpiresAt: parseOptionalDate(req.body.subscriptionExpiresAt),
    subscriptionActivationCode: shouldGenerateActivationCode
      ? generateActivationCode(12)
      : requestedActivationCode,
    subscriptionActivationCodeIssuedAt:
      shouldGenerateActivationCode || requestedActivationCode
        ? new Date()
        : null,
    subscriptionActivationCodeUsedAt: null,
    subscriptionLastActivatedAt: null,
    subscriptionLastPaymentAt: null,
    isActive: parseBooleanFlag(req.body.isActive, true),
  });

  await upsertTenantDefaultAdmin(hospital, pin);

  if (hospital.seedSharedCatalogs) {
    await applySharedSeedData(hospital);
    hospital.sharedCatalogsSeededAt = new Date();
    await hospital.save();
  }

  res.status(201).json({ success: true, data: serializeHospital(hospital) });
});

const updateHospital = asyncHandler(async (req, res) => {
  await ensureMasterSuperAdmin(req);

  const hospital = await Hospital.findById(req.params.id);

  if (!hospital) {
    res.status(404);
    throw new Error('Hospital tenant not found.');
  }

  hospital.hospitalName = String(req.body.hospitalName || hospital.hospitalName).trim();
  hospital.adminFullName = String(req.body.adminFullName || hospital.adminFullName || '').trim();
  hospital.adminUsername = String(req.body.adminUsername || hospital.adminUsername || '')
    .trim()
    .toLowerCase();
  hospital.contactEmail = String(req.body.contactEmail || hospital.contactEmail || '')
    .trim()
    .toLowerCase();
  hospital.contactPhone = String(req.body.contactPhone || hospital.contactPhone || '').trim();
  hospital.isActive = parseBooleanFlag(req.body.isActive, hospital.isActive !== false);
  hospital.subscriptionMonthlyAmount = parseNumber(
    req.body.subscriptionMonthlyAmount,
    hospital.subscriptionMonthlyAmount || 0
  );
  if (req.body.subscriptionCurrency !== undefined) {
    hospital.subscriptionCurrency = normalizeCurrencyCode(
      req.body.subscriptionCurrency,
      hospital.subscriptionCurrency || 'GHS'
    );
  }
  if (req.body.subscriptionExpiresAt !== undefined) {
    hospital.subscriptionExpiresAt = parseOptionalDate(req.body.subscriptionExpiresAt);
  }
  hospital.enabledModules = normalizeArray(
    req.body.enabledModules?.length ? req.body.enabledModules : hospital.enabledModules,
    allTenantModules
  );

  const requestedActivationCode = normalizeActivationCode(req.body.subscriptionActivationCode);
  const shouldGenerateActivationCode = parseBooleanFlag(req.body.generateActivationCode, false);
  if (requestedActivationCode && !isValidActivationCode(requestedActivationCode)) {
    res.status(400);
    throw new Error('Activation code must be 12 alphanumeric characters.');
  }
  if (shouldGenerateActivationCode) {
    hospital.subscriptionActivationCode = generateActivationCode(12);
    hospital.subscriptionActivationCodeIssuedAt = new Date();
    hospital.subscriptionActivationCodeUsedAt = null;
  } else if (requestedActivationCode && requestedActivationCode !== hospital.subscriptionActivationCode) {
    hospital.subscriptionActivationCode = requestedActivationCode;
    hospital.subscriptionActivationCodeIssuedAt = new Date();
    hospital.subscriptionActivationCodeUsedAt = null;
  }

  const requestedSeed = Boolean(req.body.seedSharedCatalogs);
  const shouldSeedNow = requestedSeed && !hospital.sharedCatalogsSeededAt;
  hospital.seedSharedCatalogs = requestedSeed || Boolean(hospital.sharedCatalogsSeededAt);

  await hospital.save();
  await upsertTenantDefaultAdmin(hospital, String(req.body.pin || '').trim());

  if (shouldSeedNow) {
    await applySharedSeedData(hospital);
    hospital.sharedCatalogsSeededAt = new Date();
    hospital.seedSharedCatalogs = true;
    await hospital.save();
  }

  res.json({ success: true, data: serializeHospital(hospital) });
});

module.exports = {
  createHospital,
  getHospitals,
  updateHospital,
};
