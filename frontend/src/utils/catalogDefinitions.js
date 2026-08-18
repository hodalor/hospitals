export const medicationCategories = [
  'Antibiotic',
  'Analgesic',
  'Antimalarial',
  'Antiparasitic',
  'Antihypertensive',
  'Antidiabetic',
  'Anti-inflammatory',
  'Antifungal',
  'Antiviral',
  'Antiallergic',
  'Cardiovascular',
  'Emergency/Anaphylaxis',
  'Electrolyte/Fluid',
  'Gastrointestinal',
  'Obstetric',
  'Respiratory',
  'Vitamin/Supplement',
  'Dermatology',
  'Injection/Infusion',
  'Other',
];

export const labCategories = [
  'Hematology',
  'Chemistry',
  'Microbiology',
  'Serology',
  'Urinalysis',
  'Parasitology',
  'Blood Bank',
  'Molecular',
  'Other',
];

export const administrativeCategories = [
  'Consultation',
  'Admission',
  'Bed Charge',
  'Procedure',
  'Nursing',
  'Theatre',
  'Other',
];

export const diagnosisCategories = [
  'General Medicine',
  'Infectious Disease',
  'Respiratory',
  'Gastrointestinal',
  'Cardiovascular',
  'Endocrine',
  'Neurology',
  'Pediatrics',
  'Obstetrics',
  'Gynecology',
  'Surgery',
  'Orthopedics',
  'ENT',
  'Dermatology',
  'Mental Health',
  'Emergency',
  'Other',
];

export const conditionCategories = [
  'General Medicine',
  'Pediatrics',
  'Obstetrics',
  'Gynecology',
  'Cardiology',
  'Surgery',
  'Orthopedics',
  'ENT',
  'Dermatology',
  'Other',
];

export const catalogModuleConfig = {
  pharmacy_medications: {
    eyebrow: 'Pharmacy',
    title: 'Medication stock and pricing',
    description:
      'Maintain the medicines available for dispensing, including price, stock, brand, and medication class.',
    actionLabel: 'Add Medication',
    itemType: 'Medication',
    catalogSection: 'Medication',
    quickAddTitle: 'Add Medication To Catalog',
    categoryOptions: medicationCategories,
  },
  services_conditions: {
    eyebrow: 'Services',
    title: 'Medical condition pricing',
    description:
      'List medical conditions or care packages that have a standard service price.',
    actionLabel: 'Add Condition',
    itemType: 'Service',
    catalogSection: 'Medical Condition',
    quickAddTitle: 'Add Medical Condition',
    categoryOptions: conditionCategories,
  },
  services_diagnoses: {
    eyebrow: 'Services',
    title: 'Diagnosis catalog',
    description:
      'Maintain a reusable diagnosis list doctors can look up during consultations and add to when something is missing.',
    actionLabel: 'Add Diagnosis',
    itemType: 'Service',
    catalogSection: 'Diagnosis',
    quickAddTitle: 'Add Diagnosis',
    categoryOptions: diagnosisCategories,
  },
  services_lab: {
    eyebrow: 'Services',
    title: 'Lab test price list',
    description:
      'Keep a clean list of tests the facility runs and the price staff should charge for each one.',
    actionLabel: 'Add Lab Test',
    itemType: 'Service',
    catalogSection: 'Lab Test',
    quickAddTitle: 'Add Lab Test',
    categoryOptions: labCategories,
  },
  services_administrative: {
    eyebrow: 'Services',
    title: 'Administrative service pricing',
    description:
      'Manage consultation, admission, bed charges, and other administrative fees in one place.',
    actionLabel: 'Add Administrative Service',
    itemType: 'Service',
    catalogSection: 'Administrative',
    quickAddTitle: 'Add Administrative Service',
    categoryOptions: administrativeCategories,
  },
};

export const financePricingSections = [
  { id: 'pharmacy_medications', label: 'Medications' },
  { id: 'services_conditions', label: 'Medi-Conditions' },
  { id: 'services_diagnoses', label: 'Diagnoses' },
  { id: 'services_lab', label: 'Lab' },
  { id: 'services_administrative', label: 'Administrative' },
];

export function buildCatalogCode(prefix, name) {
  const compactName = String(name || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 10);

  return `${prefix}-${compactName || 'ITEM'}-${Date.now().toString().slice(-4)}`;
}
