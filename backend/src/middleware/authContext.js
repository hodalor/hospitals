const User = require('../models/User');

function getPermissionList(user, permissionKey) {
  if (!user) {
    return [];
  }

  if (user.isSuperAdmin) {
    return ['*'];
  }

  return Array.isArray(user[permissionKey]) ? user[permissionKey] : [];
}

function hasPermission(user, permissionKey, value) {
  const permissions = getPermissionList(user, permissionKey);
  return permissions.includes('*') || permissions.includes(value);
}

function tenantHasModule(req, moduleId) {
  if (!moduleId) {
    return true;
  }

  if (req.tenant?.isMasterTenant) {
    return true;
  }

  const enabledModules = Array.isArray(req.tenant?.enabledModules)
    ? req.tenant.enabledModules
    : [];

  return enabledModules.includes('*') || enabledModules.includes(moduleId);
}

const attachActiveUser = async (req, res, next) => {
  try {
    const username = String(req.headers['x-user-username'] || '').trim().toLowerCase();

    if (!username) {
      res.status(401);
      throw new Error('Missing active user context.');
    }

    const user = await User.findOne({ username, isActive: true });

    if (!user) {
      res.status(401);
      throw new Error('Active user not found or inactive.');
    }

    req.activeUser = user;
    next();
  } catch (error) {
    next(error);
  }
};

function requireAccess({ moduleId, dataPermission, actionPermission }) {
  return (req, res, next) => {
    if (!req.activeUser) {
      res.status(401);
      return next(new Error('Authentication is required.'));
    }

    if (moduleId && !tenantHasModule(req, moduleId)) {
      res.status(403);
      return next(new Error('This module is not enabled for the active hospital.'));
    }

    if (moduleId && !hasPermission(req.activeUser, 'menuPermissions', moduleId)) {
      res.status(403);
      return next(new Error('You do not have access to this module.'));
    }

    if (dataPermission && !hasPermission(req.activeUser, 'dataPermissions', dataPermission)) {
      res.status(403);
      return next(new Error('You do not have permission to view this data.'));
    }

    if (actionPermission && !hasPermission(req.activeUser, 'actionPermissions', actionPermission)) {
      res.status(403);
      return next(new Error('You do not have permission to perform this action.'));
    }

    return next();
  };
}

function requireMasterSuperAdmin(req, res, next) {
  if (!req.activeUser) {
    res.status(401);
    return next(new Error('Authentication is required.'));
  }

  if (!req.tenant?.isMasterTenant || !req.activeUser.isSuperAdmin) {
    res.status(403);
    return next(new Error('Only the master super admin can perform this action.'));
  }

  return next();
}

module.exports = {
  attachActiveUser,
  requireAccess,
  requireMasterSuperAdmin,
};
