export const navigationModules = [
  { id: 'dashboard', label: 'Overview', description: 'Hospital-wide snapshot' },
  { id: 'hospital_management', label: 'Hospital Management', description: 'Master tenant hospital accounts' },
  { id: 'patients', label: 'Patients', description: 'Master patient records and profiles' },
  { id: 'visits', label: 'Daily Visits', description: 'Check-in to discharge workflow' },
  { id: 'appointments', label: 'Appointments', description: 'Booking, arrivals, and queue flow' },
  { id: 'departments', label: 'Workflow', description: 'Clinical units and care handoffs' },
  {
    id: 'settings',
    label: 'Setting',
    description: 'Configuration and setup',
    children: [{ id: 'settings_config', label: 'Config', description: 'Departments, categories, and branding' }],
  },
  {
    id: 'pharmacy',
    label: 'Pharmacy',
    description: 'Medication catalog',
    children: [{ id: 'pharmacy_medications', label: 'Medications', description: 'Available medicines and stock' }],
  },
  {
    id: 'services',
    label: 'Services',
    description: 'Price lists and service catalogs',
    children: [
      { id: 'services_conditions', label: 'Medi-Conditions', description: 'Condition pricing and packages' },
      { id: 'services_diagnoses', label: 'Diagnoses', description: 'Diagnosis lookup catalog for clinicians' },
      { id: 'services_lab', label: 'Lab', description: 'Lab test catalog and pricing' },
      { id: 'services_administrative', label: 'Administrative', description: 'Consultation and admin fees' },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    description: 'Billing, pricing, and receipts',
    children: [
      { id: 'finance_billing', label: 'Billing', description: 'Invoices, payments, and pharmacy clearance' },
      { id: 'finance_pricing', label: 'Pricing', description: 'Medication, diagnosis, lab, condition, and service pricing' },
      { id: 'finance_receipts', label: 'Receipts', description: 'Every posted payment receipt' },
    ],
  },
  { id: 'duty', label: 'Duty Roster', description: 'Daily staff coverage and shifts' },
  { id: 'manual', label: 'Manual', description: 'Layman-friendly guide for using the system' },
  { id: 'users', label: 'Users', description: 'Accounts, menus, and permissions' },
];

export const dashboardData = {
  kpis: [],
  stageChart: [],
  departmentChart: [],
  queueChart: [],
  billingChart: [],
  revenueChart: [],
  trendChart: [],
};

export const patientModuleData = {
  summaryCards: [],
  records: [],
};

export const visitFlowModuleData = {
  summaryCards: [],
  stages: [
    'Checked in',
    'In triage',
    'With doctor',
    'At lab',
    'At radiology',
    'At pharmacy',
    'At cashier',
    'Closed',
  ],
  records: [],
};

export const appointmentModuleData = {
  summaryCards: [],
  queue: [],
};

export const departmentModuleData = {
  summaryCards: [
    { label: 'Cashier Queue', value: 0 },
    { label: 'Doctor Queue', value: 0 },
    { label: 'Laboratory Queue', value: 0 },
    { label: 'Pharmacy Queue', value: 0 },
  ],
  queueChart: [],
  registry: [],
  categories: [],
  branding: {
    hospitalName: 'HealthNova Hospital',
    branchName: 'Main',
    address: 'Hospital Road',
    location: 'HealthNova',
    phoneNumbers: '+260 000 000 000 / +233 000 000 000',
    email: 'finance@healthnova.local',
    logoDataUrl: '',
    defaultCurrency: 'GHS',
    currencies: [
      {
        id: 'currency-ghs',
        code: 'GHS',
        name: 'Ghana Cedi',
        symbol: 'GHS',
        isDefault: true,
        isActive: true,
      },
    ],
    branches: [
      {
        id: 'default-main',
        name: 'Main',
        code: 'MAIN',
        address: '',
        location: '',
        phoneNumbers: '',
        email: '',
        isMain: true,
        isActive: true,
      },
    ],
  },
  queues: {
    cashier: [],
    doctor: [],
    lab: [],
    pharmacy: [],
  },
};

export const billingModuleData = {
  summaryCards: [],
  transactions: [],
  pharmacyQueue: [],
  receipts: [],
  branding: {
    hospitalName: 'HealthNova Hospital',
    branchName: 'Main',
    address: 'Hospital Road',
    location: 'HealthNova',
    phoneNumbers: '+260 000 000 000 / +233 000 000 000',
    email: 'finance@healthnova.local',
    logoDataUrl: '',
    defaultCurrency: 'GHS',
    currencies: [
      {
        id: 'currency-ghs',
        code: 'GHS',
        name: 'Ghana Cedi',
        symbol: 'GHS',
        isDefault: true,
        isActive: true,
      },
    ],
    branches: [
      {
        id: 'default-main',
        name: 'Main',
        code: 'MAIN',
        address: '',
        location: '',
        phoneNumbers: '',
        email: '',
        isMain: true,
        isActive: true,
      },
    ],
  },
};

export const pricingModuleData = {
  records: [],
};

export const dutyRosterModuleData = {
  records: [],
};

export const manualModuleData = {};

export const userModuleData = {
  records: [],
};

export const hospitalManagementData = {
  records: [],
};
