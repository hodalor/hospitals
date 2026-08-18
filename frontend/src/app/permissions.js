export const menuPermissionOptions = [
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

export const dataPermissionOptions = [
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

export const actionPermissionOptions = [
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

export const queuePermissionOptions = ['cashier', 'doctor', 'lab', 'pharmacy'];

export const modulePermissionMap = {
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

export function getTenantPermissionScope(user) {
  const enabledModules = Array.isArray(user?.enabledModules) ? user.enabledModules : [];

  if (user?.isMasterTenant || enabledModules.includes('*')) {
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

export const roleTemplates = {
  'Super Admin': {
    isSuperAdmin: true,
    menuPermissions: ['*'],
    dataPermissions: ['*'],
    actionPermissions: ['*'],
    queuePermissions: ['*'],
  },
  Admin: {
    isSuperAdmin: false,
    menuPermissions: ['dashboard', 'patients', 'visits', 'appointments', 'departments', 'settings_config', 'pharmacy_medications', 'services_conditions', 'services_diagnoses', 'services_lab', 'services_administrative', 'finance_billing', 'finance_pricing', 'finance_receipts', 'duty', 'manual', 'users'],
    dataPermissions: ['overview', 'patient_records', 'visit_records', 'appointment_records', 'department_records', 'billing_records', 'pharmacy_records', 'pricing_records', 'duty_records', 'user_records'],
    actionPermissions: ['create_patient', 'edit_patient', 'open_visit', 'edit_visit', 'create_appointment', 'edit_appointment', 'create_invoice', 'edit_invoice', 'record_payment', 'create_prescription', 'edit_prescription', 'manage_pricing', 'manage_duty', 'manage_users'],
    queuePermissions: ['cashier', 'doctor', 'lab', 'pharmacy'],
  },
  Doctor: {
    isSuperAdmin: false,
    menuPermissions: ['dashboard', 'patients', 'visits', 'appointments', 'departments', 'duty', 'manual'],
    dataPermissions: ['overview', 'patient_records', 'visit_records', 'appointment_records', 'department_records', 'duty_records'],
    actionPermissions: ['edit_patient', 'open_visit', 'edit_visit', 'edit_appointment'],
    queuePermissions: ['doctor'],
  },
  Clinician: {
    isSuperAdmin: false,
    menuPermissions: ['dashboard', 'patients', 'visits', 'appointments', 'departments', 'duty', 'manual'],
    dataPermissions: ['overview', 'patient_records', 'visit_records', 'appointment_records', 'department_records', 'duty_records'],
    actionPermissions: ['edit_patient', 'open_visit', 'edit_visit', 'edit_appointment'],
    queuePermissions: ['doctor'],
  },
  Nurse: {
    isSuperAdmin: false,
    menuPermissions: ['dashboard', 'patients', 'visits', 'appointments', 'departments', 'duty', 'manual'],
    dataPermissions: ['overview', 'patient_records', 'visit_records', 'appointment_records', 'department_records', 'duty_records'],
    actionPermissions: ['edit_patient', 'open_visit', 'edit_visit'],
    queuePermissions: ['doctor'],
  },
  Receptionist: {
    isSuperAdmin: false,
    menuPermissions: ['dashboard', 'patients', 'visits', 'appointments', 'duty', 'manual'],
    dataPermissions: ['overview', 'patient_records', 'visit_records', 'appointment_records', 'duty_records'],
    actionPermissions: ['create_patient', 'edit_patient', 'open_visit', 'create_appointment', 'edit_appointment'],
    queuePermissions: [],
  },
  'Lab Scientist': {
    isSuperAdmin: false,
    menuPermissions: ['dashboard', 'patients', 'visits', 'departments', 'duty', 'manual'],
    dataPermissions: ['overview', 'patient_records', 'visit_records', 'department_records', 'duty_records'],
    actionPermissions: ['edit_visit'],
    queuePermissions: ['lab'],
  },
  Pharmacist: {
    isSuperAdmin: false,
    menuPermissions: ['dashboard', 'patients', 'departments', 'pharmacy_medications', 'finance_billing', 'duty', 'manual'],
    dataPermissions: ['overview', 'patient_records', 'visit_records', 'department_records', 'billing_records', 'pharmacy_records', 'pricing_records', 'duty_records'],
    actionPermissions: ['edit_visit', 'create_prescription', 'edit_prescription', 'manage_pricing'],
    queuePermissions: ['pharmacy'],
  },
  Cashier: {
    isSuperAdmin: false,
    menuPermissions: ['dashboard', 'patients', 'departments', 'finance_billing', 'finance_receipts', 'duty', 'manual'],
    dataPermissions: ['overview', 'patient_records', 'department_records', 'billing_records', 'pharmacy_records', 'duty_records'],
    actionPermissions: ['create_invoice', 'edit_invoice', 'record_payment', 'edit_prescription', 'edit_visit'],
    queuePermissions: ['cashier'],
  },
};

export function hasPermission(user, permissionSet, value) {
  if (!user) {
    return false;
  }

  if (user.isSuperAdmin || permissionSet.includes('*')) {
    return true;
  }

  return permissionSet.includes(value);
}

function getResolvedPermissions(user, permissionKey) {
  if (!user) {
    return [];
  }

  const roleDefaults = roleTemplates[user.role]?.[permissionKey] || [];
  const explicitPermissions = Array.isArray(user?.[permissionKey]) ? user[permissionKey] : [];
  return Array.from(new Set([...roleDefaults, ...explicitPermissions]));
}

export function canAccessMenu(user, menuId) {
  const enabledModules = Array.isArray(user?.enabledModules) ? user.enabledModules : [];
  const moduleEnabled =
    user?.isMasterTenant ||
    enabledModules.includes('*') ||
    enabledModules.includes(menuId);

  if (!moduleEnabled) {
    return false;
  }

  if (menuId === 'hospital_management') {
    return Boolean(user?.isSuperAdmin && user?.isMasterTenant);
  }

  if (!user?.isSuperAdmin && user?.role === 'Pharmacist' && menuId === 'visits') {
    return false;
  }

  return hasPermission(user, getResolvedPermissions(user, 'menuPermissions'), menuId);
}

export function canViewData(user, dataId) {
  return hasPermission(user, getResolvedPermissions(user, 'dataPermissions'), dataId);
}

export function canDoAction(user, actionId) {
  return hasPermission(user, getResolvedPermissions(user, 'actionPermissions'), actionId);
}

export function canAccessQueue(user, queueId) {
  return hasPermission(user, getResolvedPermissions(user, 'queuePermissions'), queueId);
}
