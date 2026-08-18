const { getMasterTenantId } = require('../config/db');
const { getSubscriptionStatus } = require('../services/subscriptionService');

const roleQueueDefaults = {
  'Super Admin': ['*'],
  Admin: ['cashier', 'doctor', 'lab', 'pharmacy'],
  Doctor: ['doctor'],
  Clinician: ['doctor'],
  Nurse: ['doctor'],
  Receptionist: [],
  'Lab Scientist': ['lab'],
  Pharmacist: ['pharmacy'],
  Cashier: ['cashier'],
};

function resolveQueuePermissions({ role, queuePermissions, isSuperAdmin }) {
  if (isSuperAdmin) {
    return ['*'];
  }

  if (Array.isArray(queuePermissions)) {
    return queuePermissions;
  }

  return roleQueueDefaults[role] || [];
}

function buildSessionPayload({ user, hospital, tenantDbName }) {
  const subscriptionStatus =
    hospital?.hospitalId === getMasterTenantId()
      ? {
          expired: false,
          expiresAt: null,
          monthlyAmount: 0,
          currency: 'GHS',
          activationCodeConfigured: false,
        }
      : getSubscriptionStatus(hospital);

  return {
    id: user._id,
    fullName: user.fullName,
    username: user.username,
    role: user.role,
    department: user.department || '',
    branchName: user.branchName || '',
    menuPermissions: user.isSuperAdmin ? ['*'] : user.menuPermissions,
    dataPermissions: user.isSuperAdmin ? ['*'] : user.dataPermissions,
    actionPermissions: user.isSuperAdmin ? ['*'] : user.actionPermissions,
    queuePermissions: resolveQueuePermissions({
      role: user.role,
      queuePermissions: user.queuePermissions,
      isSuperAdmin: user.isSuperAdmin,
    }),
    isSuperAdmin: user.isSuperAdmin,
    isActive: user.isActive,
    hospitalId: hospital?.hospitalId || getMasterTenantId(),
    hospitalName: hospital?.hospitalName || 'Master',
    contactEmail: hospital?.contactEmail || '',
    contactPhone: hospital?.contactPhone || '',
    enabledModules: hospital?.enabledModules || ['*'],
    tenantDbName,
    isMasterTenant: (hospital?.hospitalId || getMasterTenantId()) === getMasterTenantId(),
    subscriptionExpired: Boolean(subscriptionStatus.expired),
    subscriptionExpiresAt: subscriptionStatus.expiresAt || null,
    subscriptionMonthlyAmount: Number(subscriptionStatus.monthlyAmount || 0),
    subscriptionCurrency: subscriptionStatus.currency || hospital?.subscriptionCurrency || 'GHS',
    subscriptionActivationCodeConfigured: Boolean(subscriptionStatus.activationCodeConfigured),
    canAccessAllBranches: Boolean(user?.isSuperAdmin || user?.role === 'Admin' || user?.role === 'Super Admin'),
  };
}

module.exports = {
  buildSessionPayload,
  resolveQueuePermissions,
};
