const {
  getLegacyDatabaseName,
  getMasterDatabaseName,
  getMasterConnection,
  getTenantConnection,
} = require('../config/db');

async function migrateLegacyDatabaseToMaster() {
  const legacyDbName = getLegacyDatabaseName();
  const masterDbName = getMasterDatabaseName();

  if (!legacyDbName || legacyDbName === masterDbName) {
    return;
  }

  const masterConnection = getMasterConnection();
  const legacyConnection = getTenantConnection(legacyDbName);
  const masterDatabase = masterConnection.db;
  const legacyDatabase = legacyConnection.db;

  const [masterCollections, legacyCollections] = await Promise.all([
    masterDatabase.listCollections().toArray(),
    legacyDatabase.listCollections().toArray(),
  ]);

  if (!legacyCollections.length) {
    return;
  }

  const masterCollectionNames = new Set(masterCollections.map((item) => item.name));

  for (const collectionInfo of legacyCollections) {
    const collectionName = collectionInfo.name;

    if (collectionName.startsWith('system.')) {
      continue;
    }

    const sourceCollection = legacyDatabase.collection(collectionName);
    const targetCollection = masterDatabase.collection(collectionName);
    const sourceCount = await sourceCollection.countDocuments();

    if (!sourceCount) {
      continue;
    }

    const targetCount = masterCollectionNames.has(collectionName)
      ? await targetCollection.countDocuments()
      : 0;

    if (targetCount > 0) {
      continue;
    }

    const documents = await sourceCollection.find({}).toArray();
    if (!documents.length) {
      continue;
    }

    await targetCollection.insertMany(documents);
    console.log(
      `Migrated ${documents.length} records from legacy database ${legacyDbName}.${collectionName} to ${masterDbName}.${collectionName}`
    );
  }
}

module.exports = { migrateLegacyDatabaseToMaster };
