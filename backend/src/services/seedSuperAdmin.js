const bcrypt = require('bcryptjs');
const User = require('../models/User');

async function seedSuperAdmin() {
  const existingSuperAdmin = await User.findOne({ username: 'superadmin' });
  const passwordHash = await bcrypt.hash('1234', 10);

  if (existingSuperAdmin) {
    existingSuperAdmin.fullName = existingSuperAdmin.fullName || 'Super Admin';
    existingSuperAdmin.role = 'Super Admin';
    existingSuperAdmin.department = existingSuperAdmin.department || 'System';
    existingSuperAdmin.passwordHash = passwordHash;
    existingSuperAdmin.menuPermissions = ['*'];
    existingSuperAdmin.dataPermissions = ['*'];
    existingSuperAdmin.actionPermissions = ['*'];
    existingSuperAdmin.queuePermissions = ['*'];
    existingSuperAdmin.isSuperAdmin = true;
    existingSuperAdmin.isActive = true;
    await existingSuperAdmin.save();
    return existingSuperAdmin;
  }

  return User.create({
    fullName: 'Super Admin',
    username: 'superadmin',
    passwordHash,
    role: 'Super Admin',
    department: 'System',
    menuPermissions: ['*'],
    dataPermissions: ['*'],
    actionPermissions: ['*'],
    queuePermissions: ['*'],
    isSuperAdmin: true,
    isActive: true,
  });
}

module.exports = { seedSuperAdmin };
