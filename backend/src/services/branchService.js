const Branch = require('../models/Branch');

const MAIN_BRANCH_NAME = 'Main';
const MAIN_BRANCH_CODE = 'MAIN';

function normalizeBranchInput(branch = {}, index = 0) {
  const name = String(branch.name || '').trim();
  const code = String(branch.code || name || `BR${index + 1}`)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');

  return {
    name,
    code,
    address: String(branch.address || '').trim(),
    location: String(branch.location || '').trim(),
    phoneNumbers: String(branch.phoneNumbers || '').trim(),
    email: String(branch.email || '').trim().toLowerCase(),
    isMain: Boolean(branch.isMain),
    isActive: branch.isActive !== false,
  };
}

function normalizeBranches(branches = []) {
  const incoming = Array.isArray(branches) ? branches : [];
  const normalized = incoming
    .map((branch, index) => normalizeBranchInput(branch, index))
    .filter((branch) => branch.name);

  if (!normalized.length) {
    return [
      {
        name: MAIN_BRANCH_NAME,
        code: MAIN_BRANCH_CODE,
        address: '',
        location: '',
        phoneNumbers: '',
        email: '',
        isMain: true,
        isActive: true,
      },
    ];
  }

  const uniqueByName = Array.from(
    new Map(normalized.map((branch) => [branch.name.toLowerCase(), branch])).values()
  );

  let hasMain = false;
  const branchesWithMain = uniqueByName.map((branch, index) => {
    const isMain = branch.isMain || (!hasMain && index === 0);
    if (isMain) {
      hasMain = true;
    }

    return {
      ...branch,
      isMain,
    };
  });

  return branchesWithMain.map((branch) => ({
    ...branch,
    isMain: branch.name === MAIN_BRANCH_NAME ? true : branch.isMain,
  }));
}

async function syncBranchRegistry(branches = []) {
  const normalizedBranches = normalizeBranches(branches);
  const existingBranches = await Branch.find();
  const existingByName = new Map(
    existingBranches.map((branch) => [String(branch.name || '').trim().toLowerCase(), branch])
  );

  for (const branch of normalizedBranches) {
    const key = branch.name.toLowerCase();
    const existing = existingByName.get(key);

    if (existing) {
      existing.code = branch.code;
      existing.address = branch.address;
      existing.location = branch.location;
      existing.phoneNumbers = branch.phoneNumbers;
      existing.email = branch.email;
      existing.isMain = branch.isMain;
      existing.isActive = branch.isActive;
      await existing.save();
      existingByName.delete(key);
    } else {
      await Branch.create(branch);
    }
  }

  for (const orphanBranch of existingByName.values()) {
    orphanBranch.isActive = false;
    orphanBranch.isMain = false;
    await orphanBranch.save();
  }

  return Branch.find().sort({ isMain: -1, name: 1 });
}

async function ensureDefaultMainBranch() {
  const existingBranches = await Branch.find().sort({ createdAt: 1 });
  if (existingBranches.length) {
    return syncBranchRegistry(
      existingBranches.map((branch) => ({
        name: branch.name,
        code: branch.code,
        address: branch.address,
        location: branch.location,
        phoneNumbers: branch.phoneNumbers,
        email: branch.email,
        isMain: branch.isMain,
        isActive: branch.isActive,
      }))
    );
  }

  return syncBranchRegistry();
}

module.exports = {
  ensureDefaultMainBranch,
  MAIN_BRANCH_NAME,
  normalizeBranches,
  syncBranchRegistry,
};
