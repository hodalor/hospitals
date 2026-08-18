const Hospital = require('../models/Hospital');
const {
  getMasterDatabaseName,
  getMasterTenantId,
  getTenantConnection,
  runWithTenantContext,
  sanitizeDatabaseName,
} = require('../config/db');

function normalizeTenantId(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

async function resolveTenantContext(req, _res, next) {
  try {
    const requestedHospitalId = normalizeTenantId(
      req.headers['x-hospital-id'] || req.query.hospitalId || req.body?.hospitalId || getMasterTenantId()
    );

    if (!requestedHospitalId || requestedHospitalId === getMasterTenantId()) {
      const masterContext = {
        tenantId: getMasterTenantId(),
        dbName: getMasterDatabaseName(),
        connection: getTenantConnection(getMasterDatabaseName()),
        isMasterTenant: true,
        hospitalName: 'Master',
        enabledModules: ['*'],
      };

      req.tenant = masterContext;
      return runWithTenantContext(masterContext, next);
    }

    const hospital = await Hospital.findOne({
      hospitalId: requestedHospitalId,
      isActive: true,
    });

    if (!hospital) {
      const error = new Error('Hospital account not found or inactive.');
      error.statusCode = 404;
      throw error;
    }

    const tenantContext = {
      tenantId: hospital.hospitalId,
      dbName: sanitizeDatabaseName(hospital.dbName, hospital.hospitalId),
      connection: getTenantConnection(hospital.dbName),
      isMasterTenant: false,
      hospitalName: hospital.hospitalName,
      enabledModules: Array.isArray(hospital.enabledModules) ? hospital.enabledModules : [],
      hospital,
    };

    req.tenant = tenantContext;
    return runWithTenantContext(tenantContext, next);
  } catch (error) {
    return next(error);
  }
}

module.exports = { resolveTenantContext };
