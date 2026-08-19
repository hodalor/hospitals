const bcrypt = require('bcryptjs');
const Department = require('../models/Department');
const Hospital = require('../models/Hospital');
const User = require('../models/User');
const { asyncHandler } = require('../utils/asyncHandler');
const { getMasterTenantId } = require('../config/db');
const Branch = require('../models/Branch');
const { getTenantPermissionScope } = require('../config/permissionCatalog');
const { buildSessionPayload, resolveQueuePermissions } = require('../utils/sessionPayload');
const { MAIN_BRANCH_NAME } = require('../services/branchService');
const { buildBranchFilter, hasAllBranchAccess, normalizeBranchName } = require('../utils/branchScope');

const serializeUser = (user) =>
  buildSessionPayload({
    user,
    hospital: {
      hospitalId: getMasterTenantId(),
      hospitalName: 'Master',
      enabledModules: ['*'],
    },
    tenantDbName: 'master',
  });

const loginUser = asyncHandler(async (req, res) => {
  const hospitalId = String(req.body.hospitalId || '').trim().toLowerCase() || getMasterTenantId();
  const username = String(req.body.username || '').trim().toLowerCase();
  const pin = String(req.body.pin || req.body.password || '');

  if (!hospitalId) {
    res.status(400);
    throw new Error('Hospital ID is required.');
  }

  if (hospitalId !== req.tenant?.tenantId) {
    res.status(401);
    throw new Error('Login tenant context does not match the requested hospital.');
  }

  const user = await User.findOne({ username });

  if (!user || !user.isActive) {
    res.status(401);
    throw new Error('Invalid hospital ID, username, or PIN');
  }

  const passwordMatches = await bcrypt.compare(pin, user.passwordHash);

  if (!passwordMatches) {
    res.status(401);
    throw new Error('Invalid hospital ID, username, or PIN');
  }

  const hospital =
    hospitalId === getMasterTenantId()
      ? {
          hospitalId: getMasterTenantId(),
          hospitalName: 'Master',
          enabledModules: ['*'],
        }
      : await Hospital.findOne({ hospitalId, isActive: true });

  if (!hospital) {
    res.status(401);
    throw new Error('Hospital account not found or inactive.');
  }

  res.json({
    success: true,
    data: buildSessionPayload({
      user,
      hospital,
      tenantDbName: req.tenant?.dbName,
    }),
  });
});

const getCurrentSession = asyncHandler(async (req, res) => {
  let hospital;

  if (req.tenant?.isMasterTenant) {
    hospital = {
      hospitalId: getMasterTenantId(),
      hospitalName: 'Master',
      enabledModules: ['*'],
    };
  } else {
    hospital = await Hospital.findOne({
      hospitalId: req.tenant?.tenantId,
      isActive: true,
    });
  }

  if (!hospital) {
    res.status(404);
    throw new Error('Hospital account not found or inactive.');
  }

  res.json({
    success: true,
    data: buildSessionPayload({
      user: req.activeUser,
      hospital,
      tenantDbName: req.tenant?.dbName,
    }),
  });
});

const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find(buildBranchFilter(req, 'branchName')).sort({ createdAt: -1 });
  res.json({
    success: true,
    data: users.map((user) =>
      buildSessionPayload({
        user,
        hospital: req.tenant?.isMasterTenant
          ? {
              hospitalId: getMasterTenantId(),
              hospitalName: 'Master',
              enabledModules: ['*'],
            }
          : {
              hospitalId: req.tenant?.tenantId,
              hospitalName: req.tenant?.hospitalName || '',
              enabledModules: req.tenant?.enabledModules || [],
            },
        tenantDbName: req.tenant?.dbName || 'master',
      })
    ),
  });
});

const resolveDepartmentName = async ({ departmentName, isSuperAdmin }) => {
  if (isSuperAdmin) {
    return 'System';
  }

  const normalizedDepartmentName = String(departmentName || '').trim();

  if (!normalizedDepartmentName) {
    throw new Error('Department is required');
  }

  const department = await Department.findOne({
    name: normalizedDepartmentName,
    isActive: true,
  });

  if (!department) {
    throw new Error('Select a valid active department');
  }

  return department.name;
};

const resolveBranchName = async ({ branchName, isPrivileged }) => {
  if (isPrivileged) {
    return normalizeBranchName(branchName) || MAIN_BRANCH_NAME;
  }

  const normalizedBranchName = normalizeBranchName(branchName);

  if (!normalizedBranchName) {
    throw new Error('Branch is required');
  }

  const branch = await Branch.findOne({
    name: normalizedBranchName,
    isActive: true,
  });

  if (!branch) {
    throw new Error('Select a valid active branch');
  }

  return branch.name;
};

const resolveTenantScopedSuperAdminFlag = (req) => {
  const requestedSuperAdmin = Boolean(req.body.isSuperAdmin);

  if (!requestedSuperAdmin) {
    return false;
  }

  return Boolean(req.tenant?.isMasterTenant && req.activeUser?.isSuperAdmin);
};

const normalizePermissionList = (values, allowedValues) =>
  Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => String(value || '').trim())
        .filter((value) => allowedValues.includes(value))
    )
  );

const resolveTenantScopedPermissions = (req, isSuperAdmin) => {
  if (isSuperAdmin) {
    return {
      menuPermissions: ['*'],
      dataPermissions: ['*'],
      actionPermissions: ['*'],
      queuePermissions: ['*'],
    };
  }

  const tenantScope = getTenantPermissionScope(
    Array.isArray(req.tenant?.enabledModules) ? req.tenant.enabledModules : [],
    Boolean(req.tenant?.isMasterTenant)
  );

  return {
    menuPermissions: normalizePermissionList(req.body.menuPermissions, tenantScope.menuPermissions),
    dataPermissions: normalizePermissionList(req.body.dataPermissions, tenantScope.dataPermissions),
    actionPermissions: normalizePermissionList(req.body.actionPermissions, tenantScope.actionPermissions),
    queuePermissions: normalizePermissionList(req.body.queuePermissions, tenantScope.queuePermissions),
  };
};

const createUser = asyncHandler(async (req, res) => {
  const isSuperAdmin = resolveTenantScopedSuperAdminFlag(req);
  const isPrivileged = isSuperAdmin || hasAllBranchAccess(req.activeUser);
  const department = await resolveDepartmentName({
    departmentName: req.body.department,
    isSuperAdmin,
  });
  const branchName = await resolveBranchName({
    branchName: req.body.branchName,
    isPrivileged,
  });
  const passwordHash = await bcrypt.hash(req.body.password || '0903', 10);
  const scopedPermissions = resolveTenantScopedPermissions(req, isSuperAdmin);

  const user = await User.create({
    fullName: req.body.fullName,
    username: req.body.username,
    passwordHash,
    role: req.body.role,
    department,
    branchName,
    menuPermissions: scopedPermissions.menuPermissions,
    dataPermissions: scopedPermissions.dataPermissions,
    actionPermissions: scopedPermissions.actionPermissions,
    queuePermissions: resolveQueuePermissions({
      role: req.body.role,
      queuePermissions: scopedPermissions.queuePermissions,
      isSuperAdmin,
    }),
    isSuperAdmin,
    isActive: req.body.isActive !== false,
  });

  res.status(201).json({ success: true, data: serializeUser(user) });
});

const updateUser = asyncHandler(async (req, res) => {
  const isSuperAdmin = resolveTenantScopedSuperAdminFlag(req);
  const isPrivileged = isSuperAdmin || hasAllBranchAccess(req.activeUser);
  const scopedPermissions = resolveTenantScopedPermissions(req, isSuperAdmin);
  const department = await resolveDepartmentName({
    departmentName: req.body.department,
    isSuperAdmin,
  });
  const branchName = await resolveBranchName({
    branchName: req.body.branchName,
    isPrivileged,
  });
  const update = {
    fullName: req.body.fullName,
    username: req.body.username,
    role: req.body.role,
    department,
    branchName,
    ...scopedPermissions,
    queuePermissions: resolveQueuePermissions({
      role: req.body.role,
      queuePermissions: scopedPermissions.queuePermissions,
      isSuperAdmin,
    }),
    isSuperAdmin,
    isActive: req.body.isActive !== false,
  };

  if (req.body.password) {
    update.passwordHash = await bcrypt.hash(req.body.password, 10);
  }

  const user = await User.findByIdAndUpdate(req.params.id, update, {
    new: true,
    runValidators: true,
  });

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  res.json({ success: true, data: serializeUser(user) });
});

module.exports = {
  loginUser,
  getCurrentSession,
  getUsers,
  createUser,
  updateUser,
};
