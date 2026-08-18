const Department = require('../models/Department');
const DepartmentCategory = require('../models/DepartmentCategory');

const defaultDepartmentCategories = [
  {
    name: 'Administrative',
    description: 'Front desk, registration, records, and internal system administration.',
    isActive: true,
  },
  {
    name: 'Clinical',
    description: 'Direct patient consultation, review, diagnosis, and treatment units.',
    isActive: true,
  },
  {
    name: 'Diagnostic',
    description: 'Testing, imaging, and result-producing departments that support care decisions.',
    isActive: true,
  },
  {
    name: 'Support',
    description: 'Medication and other operational support services used during treatment.',
    isActive: true,
  },
  {
    name: 'Finance',
    description: 'Cash collection, billing, insurance, and payment follow-up services.',
    isActive: true,
  },
  {
    name: 'Inpatient',
    description: 'Admission, bed management, and ward-based care services.',
    isActive: true,
  },
  {
    name: 'Surgical',
    description: 'Procedure and theatre-related services for operative care.',
    isActive: true,
  },
];

const defaultDepartments = [
  {
    name: 'Reception',
    code: 'RECP',
    category: 'Administrative',
    description: 'Patient registration, arrivals, and check-in handling.',
    supportsQueue: false,
  },
  {
    name: 'General OPD',
    code: 'GOPD',
    category: 'Clinical',
    description: 'General outpatient consultation and routing.',
    supportsQueue: false,
  },
  {
    name: 'Pediatrics',
    code: 'PED',
    category: 'Clinical',
    description: 'Children outpatient and review care.',
    supportsQueue: false,
  },
  {
    name: 'Cardiology',
    code: 'CARD',
    category: 'Clinical',
    description: 'Cardiology review and specialist consultation.',
    supportsQueue: false,
  },
  {
    name: 'Laboratory',
    code: 'LAB',
    category: 'Diagnostic',
    description: 'Sample collection, processing, and result release.',
    supportsQueue: true,
  },
  {
    name: 'Radiology',
    code: 'RAD',
    category: 'Diagnostic',
    description: 'Imaging, reporting, and scan coordination.',
    supportsQueue: false,
  },
  {
    name: 'Pharmacy',
    code: 'PHARM',
    category: 'Support',
    description: 'Medication validation, invoicing, and dispensing.',
    supportsQueue: true,
  },
  {
    name: 'Cashier and Insurance',
    code: 'CASH',
    category: 'Finance',
    description: 'Cash collection, insurer follow-up, and receipts.',
    supportsQueue: true,
  },
  {
    name: 'Emergency',
    code: 'ER',
    category: 'Clinical',
    description: 'Emergency assessment and urgent treatment.',
    supportsQueue: false,
  },
  {
    name: 'Ward and Admissions',
    code: 'WARD',
    category: 'Inpatient',
    description: 'Bed allocation, admission records, and inpatient monitoring.',
    supportsQueue: false,
  },
  {
    name: 'Theatre',
    code: 'THR',
    category: 'Surgical',
    description: 'Procedure scheduling and operative care.',
    supportsQueue: false,
  },
  {
    name: 'System',
    code: 'SYS',
    category: 'Administrative',
    description: 'Internal system ownership for platform administrators.',
    supportsQueue: false,
    isActive: false,
  },
];

async function seedDepartments() {
  await Promise.all(
    defaultDepartmentCategories.map(async (category) => {
      const existingCategory = await DepartmentCategory.findOne({ name: category.name });

      if (existingCategory) {
        existingCategory.description = category.description;
        existingCategory.isActive =
          typeof category.isActive === 'boolean' ? category.isActive : true;
        await existingCategory.save();
        return existingCategory;
      }

      return DepartmentCategory.create({
        ...category,
        isActive: typeof category.isActive === 'boolean' ? category.isActive : true,
      });
    })
  );

  await Promise.all(
    defaultDepartments.map(async (department) => {
      const existingDepartment = await Department.findOne({ code: department.code });

      if (existingDepartment) {
        existingDepartment.name = department.name;
        existingDepartment.category = department.category;
        existingDepartment.description = department.description;
        existingDepartment.supportsQueue = department.supportsQueue;
        existingDepartment.isActive =
          typeof department.isActive === 'boolean' ? department.isActive : true;
        await existingDepartment.save();
        return existingDepartment;
      }

      return Department.create({
        ...department,
        isActive: typeof department.isActive === 'boolean' ? department.isActive : true,
      });
    })
  );
}

module.exports = { seedDepartments };
