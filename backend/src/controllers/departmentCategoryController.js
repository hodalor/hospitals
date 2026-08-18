const Department = require('../models/Department');
const DepartmentCategory = require('../models/DepartmentCategory');
const { asyncHandler } = require('../utils/asyncHandler');

const serializeCategory = (category, departmentCount = 0) => ({
  id: category._id,
  name: category.name,
  description: category.description || '',
  isActive: category.isActive !== false,
  departmentCount,
});

const syncDepartmentCategories = async () => {
  const distinctCategories = (
    await Department.distinct('category', { category: { $nin: [null, ''] } })
  )
    .map((item) => String(item || '').trim())
    .filter(Boolean);

  await Promise.all(
    distinctCategories.map((name) =>
      DepartmentCategory.findOneAndUpdate(
        { name },
        {
          $setOnInsert: {
            name,
            description: '',
            isActive: true,
          },
        },
        { upsert: true, new: true }
      )
    )
  );
};

const getDepartmentCategories = asyncHandler(async (req, res) => {
  await syncDepartmentCategories();

  const includeInactive = String(req.query.includeInactive || '').toLowerCase() === 'true';
  const filter = includeInactive ? {} : { isActive: true };

  const [categories, departmentCounts] = await Promise.all([
    DepartmentCategory.find(filter).sort({ name: 1 }),
    Department.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const countMap = departmentCounts.reduce((accumulator, item) => {
    if (item._id) {
      accumulator[item._id] = item.count;
    }
    return accumulator;
  }, {});

  res.json({
    success: true,
    data: categories.map((category) => serializeCategory(category, countMap[category.name] || 0)),
  });
});

const createDepartmentCategory = asyncHandler(async (req, res) => {
  const category = await DepartmentCategory.create({
    name: req.body.name,
    description: req.body.description || '',
    isActive: req.body.isActive !== false,
  });

  res.status(201).json({ success: true, data: serializeCategory(category, 0) });
});

const updateDepartmentCategory = asyncHandler(async (req, res) => {
  const category = await DepartmentCategory.findById(req.params.id);

  if (!category) {
    res.status(404);
    throw new Error('Department category not found');
  }

  const previousName = category.name;
  category.name = String(req.body.name || '').trim();
  category.description = req.body.description || '';
  category.isActive = req.body.isActive !== false;
  await category.save();

  if (previousName !== category.name) {
    await Department.updateMany({ category: previousName }, { category: category.name });
  }

  const departmentCount = await Department.countDocuments({ category: category.name });

  res.json({ success: true, data: serializeCategory(category, departmentCount) });
});

module.exports = {
  getDepartmentCategories,
  createDepartmentCategory,
  updateDepartmentCategory,
  syncDepartmentCategories,
};
