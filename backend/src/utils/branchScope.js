function normalizeBranchName(value = '') {
  return String(value || '').trim();
}

function escapeRegex(value = '') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasAllBranchAccess(user) {
  return Boolean(user?.isSuperAdmin || user?.role === 'Admin' || user?.role === 'Super Admin');
}

function resolveBranchAccess(req, overrideBranchName = '') {
  const selectedBranchName = normalizeBranchName(
    overrideBranchName || req.headers['x-branch-name'] || req.query.branchName || req.body?.branchName || ''
  );
  const userBranchName = normalizeBranchName(req.activeUser?.branchName);
  const allBranches = hasAllBranchAccess(req.activeUser);

  if (allBranches) {
    return {
      allBranches: true,
      branchName: selectedBranchName || '',
    };
  }

  return {
    allBranches: false,
    branchName: userBranchName || selectedBranchName || '',
  };
}

function buildBranchFilter(req, field = 'branchName', overrideBranchName = '') {
  const branchAccess = resolveBranchAccess(req, overrideBranchName);

  if (!branchAccess.branchName) {
    return {};
  }

  return {
    [field]: new RegExp(`^${escapeRegex(branchAccess.branchName)}$`, 'i'),
  };
}

function applyBranchScope(req, payload = {}, field = 'branchName') {
  const branchAccess = resolveBranchAccess(req, payload[field]);

  if (!branchAccess.allBranches) {
    return {
      ...payload,
      [field]: branchAccess.branchName,
    };
  }

  return {
    ...payload,
    [field]: normalizeBranchName(payload[field] || branchAccess.branchName),
  };
}

module.exports = {
  applyBranchScope,
  buildBranchFilter,
  hasAllBranchAccess,
  normalizeBranchName,
  resolveBranchAccess,
};
