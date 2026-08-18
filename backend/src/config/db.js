const { AsyncLocalStorage } = require('async_hooks');
const mongoose = require('mongoose');

const tenantAsyncStorage = new AsyncLocalStorage();

function sanitizeDatabaseName(value, fallback = 'master') {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  return normalized || fallback;
}

function getMasterTenantId() {
  return 'master';
}

function getMasterDatabaseName() {
  return sanitizeDatabaseName(process.env.MASTER_DB_NAME || 'master', 'master');
}

function getLegacyDatabaseName() {
  const configuredValue =
    process.env.LEGACY_MONGODB_DB_NAME || process.env.MONGODB_DB_NAME || '';
  const normalized = sanitizeDatabaseName(configuredValue, '');
  return normalized || null;
}

function getDatabaseName() {
  return getMasterDatabaseName();
}

async function connectDatabase() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error('MONGODB_URI is not set. Add it to your environment before starting the API.');
  }

  await mongoose.connect(mongoUri, {
    dbName: getMasterDatabaseName(),
  });

  console.log(`Connected to MongoDB database: ${mongoose.connection.name}`);
  return mongoose.connection;
}

function getMasterConnection() {
  return mongoose.connection;
}

function getTenantConnection(dbName) {
  return mongoose.connection.useDb(sanitizeDatabaseName(dbName), {
    useCache: true,
  });
}

function getActiveTenantContext() {
  return (
    tenantAsyncStorage.getStore() || {
      tenantId: getMasterTenantId(),
      dbName: getMasterDatabaseName(),
      connection: getMasterConnection(),
      isMasterTenant: true,
      hospitalName: 'Master',
      enabledModules: ['*'],
    }
  );
}

function runWithTenantContext(tenantContext, callback) {
  const normalizedContext = {
    tenantId: tenantContext?.tenantId || getMasterTenantId(),
    dbName: sanitizeDatabaseName(
      tenantContext?.dbName || getMasterDatabaseName(),
      getMasterDatabaseName()
    ),
    connection:
      tenantContext?.connection ||
      getTenantConnection(tenantContext?.dbName || getMasterDatabaseName()),
    isMasterTenant:
      tenantContext?.isMasterTenant !== undefined
        ? tenantContext.isMasterTenant
        : tenantContext?.tenantId === getMasterTenantId(),
    hospitalName: tenantContext?.hospitalName || '',
    enabledModules: Array.isArray(tenantContext?.enabledModules)
      ? tenantContext.enabledModules
      : ['*'],
  };

  return tenantAsyncStorage.run(normalizedContext, callback);
}

module.exports = {
  connectDatabase,
  getActiveTenantContext,
  getDatabaseName,
  getLegacyDatabaseName,
  getMasterConnection,
  getMasterDatabaseName,
  getMasterTenantId,
  getTenantConnection,
  runWithTenantContext,
  sanitizeDatabaseName,
};
