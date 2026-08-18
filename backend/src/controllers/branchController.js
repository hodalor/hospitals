const Branch = require('../models/Branch');
const { asyncHandler } = require('../utils/asyncHandler');

const serializeBranch = (branch) => ({
  id: branch._id,
  name: branch.name,
  code: branch.code,
  address: branch.address || '',
  location: branch.location || '',
  phoneNumbers: branch.phoneNumbers || '',
  email: branch.email || '',
  isMain: Boolean(branch.isMain),
  isActive: branch.isActive !== false,
});

const getBranches = asyncHandler(async (req, res) => {
  const includeInactive = String(req.query.includeInactive || '').toLowerCase() === 'true';
  const filter = includeInactive ? {} : { isActive: true };
  const branches = await Branch.find(filter).sort({ isMain: -1, name: 1 });

  res.json({
    success: true,
    data: branches.map(serializeBranch),
  });
});

module.exports = {
  getBranches,
  serializeBranch,
};
