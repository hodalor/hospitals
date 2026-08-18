const menuPermissionOptions = [
  'dashboard',
  'hospital_management',
  'patients',
  'visits',
  'appointments',
  'departments',
  'settings_config',
  'pharmacy_medications',
  'services_conditions',
  'services_diagnoses',
  'services_lab',
  'services_administrative',
  'finance_billing',
  'finance_pricing',
  'finance_receipts',
  'duty',
  'manual',
  'users',
];

const dataPermissionOptions = [
  'overview',
  'hospital_records',
  'patient_records',
  'visit_records',
  'appointment_records',
  'department_records',
  'billing_records',
  'pharmacy_records',
  'pricing_records',
  'duty_records',
  'user_records',
];

const actionPermissionOptions = [
  'manage_hospitals',
  'create_patient',
  'edit_patient',
  'open_visit',
  'edit_visit',
  'create_appointment',
  'edit_appointment',
  'create_invoice',
  'edit_invoice',
  'record_payment',
  'create_prescription',
  'edit_prescription',
  'manage_pricing',
  'manage_duty',
  'manage_users',
];

const queuePermissionOptions = ['cashier', 'doctor', 'lab', 'pharmacy'];

const modulePermissionMap = {
  dashboard: {
    data: ['overview'],
    actions: [],
    queues: [],
  },
  hospital_management: {
    data: ['hospital_records'],
    actions: ['manage_hospitals'],
    queues: [],
  },
  patients: {
    data: ['patient_records'],
    actions: ['create_patient', 'edit_patient'],
    queues: [],
  },
  visits: {
    data: ['visit_records'],
    actions: ['open_visit', 'edit_visit'],
    queues: [],
  },
  appointments: {
    data: ['appointment_records'],
    actions: ['create_appointment', 'edit_appointment'],
    queues: [],
  },
  departments: {
    data: ['department_records'],
    actions: ['edit_visit'],
    queues: ['cashier', 'doctor', 'lab', 'pharmacy'],
  },
  settings_config: {
    data: ['department_records'],
    actions: ['manage_users'],
    queues: [],
  },
  pharmacy_medications: {
    data: ['pricing_records', 'pharmacy_records'],
    actions: ['manage_pricing'],
    queues: ['pharmacy'],
  },
  services_conditions: {
    data: ['pricing_records'],
    actions: ['manage_pricing'],
    queues: [],
  },
  services_diagnoses: {
    data: ['pricing_records'],
    actions: ['manage_pricing'],
    queues: [],
  },
  services_lab: {
    data: ['pricing_records'],
    actions: ['manage_pricing'],
    queues: ['lab'],
  },
  services_administrative: {
    data: ['pricing_records'],
    actions: ['manage_pricing'],
    queues: [],
  },
  finance_billing: {
    data: ['billing_records', 'pharmacy_records'],
    actions: ['create_invoice', 'edit_invoice', 'record_payment', 'create_prescription', 'edit_prescription'],
    queues: ['cashier'],
  },
  finance_pricing: {
    data: ['pricing_records'],
    actions: ['manage_pricing'],
    queues: [],
  },
  finance_receipts: {
    data: ['billing_records'],
    actions: ['record_payment'],
    queues: ['cashier'],
  },
  duty: {
    data: ['duty_records'],
    actions: ['manage_duty'],
    queues: [],
  },
  manual: {
    data: [],
    actions: [],
    queues: [],
  },
  users: {
    data: ['user_records'],
    actions: ['manage_users'],
    queues: [],
  },
};

function uniqueList(values) {
  return Array.from(new Set(values));
}

function getTenantPermissionScope(enabledModules = [], isMasterTenant = false) {
  if (isMasterTenant || enabledModules.includes('*')) {
    return {
      menuPermissions: [...menuPermissionOptions],
      dataPermissions: [...dataPermissionOptions],
      actionPermissions: [...actionPermissionOptions],
      queuePermissions: [...queuePermissionOptions],
    };
  }

  const allowedMenus = menuPermissionOptions.filter((menuId) => enabledModules.includes(menuId));

  return {
    menuPermissions: allowedMenus,
    dataPermissions: uniqueList(allowedMenus.flatMap((menuId) => modulePermissionMap[menuId]?.data || [])),
    actionPermissions: uniqueList(
      allowedMenus.flatMap((menuId) => modulePermissionMap[menuId]?.actions || [])
    ),
    queuePermissions: uniqueList(allowedMenus.flatMap((menuId) => modulePermissionMap[menuId]?.queues || [])),
  };
}

module.exports = {
  actionPermissionOptions,
  dataPermissionOptions,
  menuPermissionOptions,
  modulePermissionMap,
  queuePermissionOptions,
  getTenantPermissionScope,
};
