const Department = require('../models/Department');
const DepartmentCategory = require('../models/DepartmentCategory');
const Appointment = require('../models/Appointment');
const Invoice = require('../models/Invoice');
const Patient = require('../models/Patient');
const User = require('../models/User');
const Visit = require('../models/Visit');
const { asyncHandler } = require('../utils/asyncHandler');
const { syncDepartmentCategories } = require('./departmentCategoryController');

const serializeDepartment = (department, staffCount = 0) => ({
  id: department._id,
  name: department.name,
  code: department.code,
  category: department.category,
  description: department.description || '',
  supportsQueue: Boolean(department.supportsQueue),
  isActive: department.isActive !== false,
  staffCount,
});

const getDepartments = asyncHandler(async (req, res) => {
  const includeInactive = String(req.query.includeInactive || '').toLowerCase() === 'true';
  const filter = includeInactive ? {} : { isActive: true };

  const [departments, staffCounts] = await Promise.all([
    Department.find(filter).sort({ name: 1 }),
    User.aggregate([
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const countMap = staffCounts.reduce((accumulator, item) => {
    if (item._id) {
      accumulator[item._id] = item.count;
    }
    return accumulator;
  }, {});

  res.json({
    success: true,
    data: departments.map((department) =>
      serializeDepartment(department, countMap[department.name] || 0)
    ),
  });
});

const createDepartment = asyncHandler(async (req, res) => {
  const categoryName = String(req.body.category || '').trim();
  if (!categoryName) {
    res.status(400);
    throw new Error('Department category is required');
  }

  await DepartmentCategory.findOneAndUpdate(
    { name: categoryName },
    {
      $setOnInsert: {
        name: categoryName,
        description: '',
        isActive: true,
      },
    },
    { upsert: true, new: true }
  );

  const department = await Department.create({
    name: req.body.name,
    code: req.body.code,
    category: categoryName,
    description: req.body.description,
    supportsQueue: Boolean(req.body.supportsQueue),
    isActive: req.body.isActive !== false,
  });

  res.status(201).json({ success: true, data: serializeDepartment(department, 0) });
});

const updateDepartment = asyncHandler(async (req, res) => {
  const department = await Department.findById(req.params.id);

  if (!department) {
    res.status(404);
    throw new Error('Department not found');
  }

  const previousName = department.name;
  const previousCategory = department.category;
  const categoryName = String(req.body.category || '').trim();
  if (!categoryName) {
    res.status(400);
    throw new Error('Department category is required');
  }

  await DepartmentCategory.findOneAndUpdate(
    { name: categoryName },
    {
      $setOnInsert: {
        name: categoryName,
        description: '',
        isActive: true,
      },
    },
    { upsert: true, new: true }
  );

  department.name = req.body.name;
  department.code = String(req.body.code || '').trim().toUpperCase();
  department.category = categoryName;
  department.description = req.body.description || '';
  department.supportsQueue = Boolean(req.body.supportsQueue);
  department.isActive = req.body.isActive !== false;
  await department.save();

  if (previousName !== department.name) {
    await Promise.all([
      User.updateMany({ department: previousName }, { department: department.name }),
      Appointment.updateMany({ department: previousName }, { department: department.name }),
      Visit.updateMany({ department: previousName }, { department: department.name }),
      Invoice.updateMany({ department: previousName }, { department: department.name }),
      Patient.updateMany({ currentDepartment: previousName }, { currentDepartment: department.name }),
    ]);
  }

  const staffCount = await User.countDocuments({ department: department.name });
  if (previousCategory !== department.category) {
    await syncDepartmentCategories();
  }

  res.json({ success: true, data: serializeDepartment(department, staffCount) });
});

module.exports = {
  getDepartments,
  createDepartment,
  updateDepartment,
};
