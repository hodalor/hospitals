const dotenv = require('dotenv');
const { app } = require('./app');
const { connectDatabase, getDatabaseName } = require('./config/db');
const { migrateLegacyDatabaseToMaster } = require('./services/migrateLegacyDatabaseToMaster');
const { seedDepartments } = require('./services/seedDepartments');
const { seedPricingCatalog } = require('./services/seedPricingCatalog');
const { seedSuperAdmin } = require('./services/seedSuperAdmin');

dotenv.config();

const port = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDatabase();
    await migrateLegacyDatabaseToMaster();
    await seedDepartments();
    await seedPricingCatalog();
    await seedSuperAdmin();
    app.listen(port, () => {
      console.log(
        `HealthNova backend listening on port ${port} using database ${getDatabaseName()}`
      );
    });
  } catch (error) {
    console.error('Failed to start HealthNova backend');
    console.error(error.message);
    process.exit(1);
  }
}

startServer();
