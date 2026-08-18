import { useEffect, useMemo, useState } from 'react';
import { hospitalApi } from '../api/hospitalApi';
import { useToast } from '../app/ToastContext';
import Modal from '../components/common/Modal';
import PageHeader from '../components/common/PageHeader';
import ProDataGrid from '../components/common/ProDataGrid';
import QuickAddCatalogModal from '../components/common/QuickAddCatalogModal';
import SectionCard from '../components/common/SectionCard';
import StatCard from '../components/common/StatCard';
import Tabs from '../components/common/Tabs';
import TableToolbar from '../components/common/TableToolbar';
import DataTable from '../components/tables/DataTable';
import { isWithinDateRange, normalizeDateValue } from '../utils/dateFilters';

const visitColumns = [
  {
    key: 'createdAt',
    header: 'Visit Date',
    render: (value) => normalizeDateValue(value),
  },
  { key: 'visitNo', header: 'Visit No' },
  { key: 'patient', header: 'Patient' },
  { key: 'branchName', header: 'Branch' },
  { key: 'department', header: 'Department' },
  { key: 'clinician', header: 'Clinician' },
  { key: 'stage', header: 'Current Stage', badge: true },
  { key: 'triage', header: 'Triage', badge: true },
  {
    key: 'medicalConditions',
    header: 'Medical Conditions',
    render: (value, row) =>
      (value || []).length ? value.join(', ') : row.diagnosis || row.chiefComplaint || 'Not recorded',
  },
  { key: 'medication', header: 'Medication' },
  { key: 'billing', header: 'Billing', badge: true },
];

const conditionColumns = [{ key: 'value', header: 'Condition' }];

const diagnosisColumns = [
  { key: 'diagnosis', header: 'Primary Diagnosis' },
  { key: 'diagnosisDetail', header: 'Detail / Impression' },
  { key: 'doctorNote', header: 'Doctor Note' },
];

const labOrderColumns = [
  { key: 'testName', header: 'Test Name' },
  { key: 'paymentStatus', header: 'Payment', badge: true },
  { key: 'labStatus', header: 'Lab Status', badge: true },
  { key: 'resultStatus', header: 'Result', badge: true },
  { key: 'progress', header: 'Current Progress' },
];

const cashierChargeColumns = [
  { key: 'label', header: 'Charge' },
  { key: 'amount', header: 'Amount' },
  { key: 'status', header: 'Status', badge: true },
  { key: 'destinationDepartment', header: 'After Payment Send To' },
];

const medicationColumns = [
  { key: 'medicationName', header: 'Medication' },
  { key: 'availabilityStatus', header: 'Availability', badge: true },
  { key: 'invoiceStatus', header: 'Invoice', badge: true },
  { key: 'paymentStatus', header: 'Payment', badge: true },
  { key: 'dispenseStatus', header: 'Dispense', badge: true },
];

const emptyVisitForm = {
  id: '',
  visitNo: '',
  patient: '',
  patientDbId: '',
  patientPhone: '',
  patientIdNumber: '',
  department: '',
  clinician: '',
  assignedClinicianId: '',
  chiefComplaint: '',
  diagnosis: '',
  diagnosisDetail: '',
  doctorNote: '',
  medicalConditions: [],
  triage: 'Skipped',
  consultationFeeStatus: 'Pending',
  consultationStatus: 'Pending',
  doctorReviewStatus: 'Pending',
  investigations: '',
  medication: '',
  billing: 'Pending',
  cashierItems: [],
  labOrders: [],
  pharmacyItems: [],
  treatmentPlans: [],
  timeline: [],
  closeVisit: false,
};

const emptyCashierItem = {
  label: '',
  amount: '',
  status: 'Pending',
  destinationDepartment: '',
};

const emptyLabOrder = {
  testName: '',
  paymentStatus: 'Pending',
  labStatus: 'Not started',
  resultStatus: 'Pending',
};

const emptyPharmacyItem = {
  medicationName: '',
  availabilityStatus: 'Pending',
  invoiceStatus: 'Not issued',
  paymentStatus: 'Pending',
  dispenseStatus: 'Pending',
};

const emptyTreatmentPlan = {
  itemName: '',
  itemType: 'Medication',
  route: '',
  dose: '',
  frequency: '',
  duration: '',
  instructions: '',
  startDay: 1,
  endDay: 1,
  morning: false,
  afternoon: false,
  evening: false,
  night: false,
  pharmacyNote: '',
};

const emptyDetailModalState = {
  type: '',
  index: null,
  mode: 'view',
  draft: null,
};

function getLabProgressLabel(item) {
  if (['Pending', 'Part paid', 'Insurance pending'].includes(item.paymentStatus)) {
    return 'Waiting for payment clearance';
  }

  if (item.resultStatus === 'Reviewed') {
    return 'Reviewed by doctor';
  }

  if (item.resultStatus === 'Collected') {
    return 'Result collected and visible to doctor';
  }

  if (item.resultStatus === 'Ready') {
    return 'Result ready for doctor review';
  }

  if (item.labStatus === 'Completed') {
    return 'Analysis completed, result being finalized';
  }

  if (item.labStatus === 'In progress') {
    return 'Under analysis in laboratory';
  }

  if (item.labStatus === 'Sample collected') {
    return 'Sample collected, waiting for analysis';
  }

  if (item.labStatus === 'Awaiting sample') {
    return 'Awaiting sample collection';
  }

  if (item.labStatus === 'Not started') {
    return 'Paid and waiting for lab pickup';
  }

  return 'Waiting for lab update';
}

function formatTreatmentPlan(item) {
  const schedule = ['morning', 'afternoon', 'evening', 'night']
    .filter((slot) => item[slot])
    .map((slot) => slot.charAt(0).toUpperCase() + slot.slice(1))
    .join(', ');

  return [
    item.itemType || 'Treatment',
    item.route || 'No route',
    item.dose || 'No dose',
    item.frequency || 'No frequency',
    item.duration || `Day ${item.startDay || 1}-${item.endDay || 1}`,
    schedule || 'No schedule',
  ].join(' | ');
}

function normalizeVisitForForm(visit) {
  return {
    ...emptyVisitForm,
    ...visit,
    medicalConditions: visit.medicalConditions || [],
    cashierItems: visit.cashierItems || [],
    labOrders: visit.labOrders || [],
    pharmacyItems: visit.pharmacyItems || [],
    treatmentPlans: visit.treatmentPlans || [],
    timeline: visit.timeline || [],
    closeVisit: visit.stage === 'Closed',
  };
}

function VisitsPage({ data, auth, users, departments, pricingItems, onRefreshData, pageMeta }) {
  const [records, setRecords] = useState(data.records || []);
  const [catalogRecords, setCatalogRecords] = useState(pricingItems || []);
  const [form, setForm] = useState(emptyVisitForm);
  const [editingVisitId, setEditingVisitId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReadOnlyVisit, setIsReadOnlyVisit] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [patientLookup, setPatientLookup] = useState('');
  const [patientMatches, setPatientMatches] = useState([]);
  const [isSearchingPatients, setIsSearchingPatients] = useState(false);
  const [activeTab, setActiveTab] = useState('journey');
  const [quickAddSection, setQuickAddSection] = useState('');
  const [detailModal, setDetailModal] = useState(emptyDetailModalState);
  const { showToast } = useToast();
  const currentRole = auth.currentUser?.role || '';
  const isAdminUser = Boolean(auth.currentUser?.isSuperAdmin) || ['Admin', 'Super Admin'].includes(currentRole);
  const isPharmacistUser = !isAdminUser && currentRole === 'Pharmacist';
  const canManageClinicalFields = isAdminUser || auth.canAccessQueue('doctor');
  const canManageCashierFields = isAdminUser || auth.canAccessQueue('cashier');
  const canManageLabFields = isAdminUser || auth.canAccessQueue('lab');
  const canManagePharmacyFields = isAdminUser || auth.canAccessQueue('pharmacy');
  const canManageTriage =
    isAdminUser || ['Receptionist', 'Nurse'].includes(currentRole) || canManageClinicalFields;
  const canAssignClinician = isAdminUser || ['Receptionist', 'Nurse'].includes(currentRole);
  const canManageJourneyDepartment = canAssignClinician;
  const canEditChiefComplaint = canAssignClinician || canManageClinicalFields;
  const canCloseVisit = isAdminUser || canManageClinicalFields;
  const canEditWorkflowLists = !isReadOnlyVisit;

  useEffect(() => {
    setRecords(data.records || []);
  }, [data.records]);

  useEffect(() => {
    setCatalogRecords(pricingItems || []);
  }, [pricingItems]);

  const clinicianOptions = useMemo(
    () =>
      users.filter(
        (user) => user.isActive && ['Doctor', 'Clinician'].includes(user.role)
      ),
    [users]
  );

  const departmentOptions = useMemo(
    () =>
      (departments || [])
        .filter((department) => department.isActive)
        .sort((left, right) => left.name.localeCompare(right.name)),
    [departments]
  );

  const serviceCatalog = useMemo(
    () => (catalogRecords || []).filter((item) => item.itemType === 'Service' && item.isActive),
    [catalogRecords]
  );

  const chargeableServiceCatalog = useMemo(
    () => serviceCatalog.filter((item) => item.catalogSection !== 'Diagnosis'),
    [serviceCatalog]
  );

  const medicationCatalog = useMemo(
    () => (catalogRecords || []).filter((item) => item.itemType === 'Medication' && item.isActive),
    [catalogRecords]
  );

  const conditionCatalog = useMemo(
    () => serviceCatalog.filter((item) => item.catalogSection === 'Medical Condition'),
    [serviceCatalog]
  );

  const diagnosisCatalog = useMemo(
    () => serviceCatalog.filter((item) => item.catalogSection === 'Diagnosis'),
    [serviceCatalog]
  );

  const labCatalog = useMemo(
    () => serviceCatalog.filter((item) => item.catalogSection === 'Lab Test'),
    [serviceCatalog]
  );

  useEffect(() => {
    if (editingVisitId || !patientLookup.trim()) {
      setPatientMatches([]);
      return undefined;
    }

    const timer = window.setTimeout(async () => {
      setIsSearchingPatients(true);
      try {
        const matches = await hospitalApi.searchPatients(patientLookup);
        setPatientMatches(matches);
      } catch (error) {
        setPatientMatches([]);
      } finally {
        setIsSearchingPatients(false);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [editingVisitId, patientLookup]);

  const filteredRecords = useMemo(
    () =>
      records.filter((visit) => {
        const matchesSearch = [
          visit.visitNo,
          visit.patient,
          visit.branchName,
          visit.department,
          visit.clinician,
          visit.diagnosis,
          visit.diagnosisDetail,
          ...(visit.medicalConditions || []),
        ]
          .join(' ')
          .toLowerCase()
          .includes(searchValue.toLowerCase());
        const matchesStage = stageFilter === 'all' || visit.stage === stageFilter;
        const matchesDate = isWithinDateRange(visit.createdAt, startDateFilter, endDateFilter);
        return matchesSearch && matchesStage && matchesDate;
      }),
    [records, searchValue, stageFilter, startDateFilter, endDateFilter]
  );

  const summaryCards = useMemo(
    () => [
      { label: 'Visits', value: records.length },
      { label: 'At Cashier', value: records.filter((item) => item.stage === 'At cashier').length },
      { label: 'At Lab', value: records.filter((item) => item.stage === 'At lab').length },
      { label: 'At Pharmacy', value: records.filter((item) => item.stage === 'At pharmacy').length },
    ],
    [records]
  );

  const conditionRows = useMemo(
    () =>
      (form.medicalConditions || []).map((condition, index) => ({
        id: `condition-${index}`,
        value: condition,
      })),
    [form.medicalConditions]
  );

  const diagnosisRows = useMemo(
    () =>
      form.diagnosis || form.diagnosisDetail || form.doctorNote
        ? [
            {
              id: 'diagnosis-entry',
              diagnosis: form.diagnosis || 'Not recorded',
              diagnosisDetail: form.diagnosisDetail || '—',
              doctorNote: form.doctorNote || '—',
            },
          ]
        : [],
    [form.diagnosis, form.diagnosisDetail, form.doctorNote]
  );

  const journeyLabRows = useMemo(
    () =>
      (form.labOrders || []).map((item, index) => ({
        id: `journey-lab-${index}`,
        ...item,
        progress: getLabProgressLabel(item),
      })),
    [form.labOrders]
  );

  const cashierChargeRows = useMemo(
    () =>
      (form.cashierItems || []).map((item, index) => ({
        id: `cashier-charge-${index}`,
        ...item,
        amount: item.amount || '0',
      })),
    [form.cashierItems]
  );

  const journeyMedicationRows = useMemo(
    () =>
      (form.pharmacyItems || []).map((item, index) => ({
        id: `journey-medication-${index}`,
        ...item,
      })),
    [form.pharmacyItems]
  );

  const availableTabs = useMemo(
    () =>
      [
        { id: 'journey', label: 'Journey' },
        canManageCashierFields ? { id: 'cashier', label: 'Cashier' } : null,
        canManageLabFields ? { id: 'lab', label: 'Lab' } : null,
        canManagePharmacyFields ? { id: 'pharmacy', label: 'Pharmacy' } : null,
        { id: 'treatment', label: 'Treatment' },
        { id: 'timeline', label: 'Timeline' },
      ].filter(Boolean),
    [canManageCashierFields, canManageLabFields, canManagePharmacyFields]
  );

  useEffect(() => {
    if (!availableTabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(availableTabs[0]?.id || 'journey');
    }
  }, [activeTab, availableTabs]);

  useEffect(() => {
    if (!canManageClinicalFields) {
      return undefined;
    }

    const intervalId = window.setInterval(async () => {
      try {
        const latestVisits = await hospitalApi.getVisitFlowModuleData();
        setRecords(latestVisits.records || []);

        if (form?.id) {
          const latestVisit = (latestVisits.records || []).find((visit) => visit.id === form.id);

          if (latestVisit) {
            setForm((current) =>
              current && current.id === latestVisit.id
                ? {
                    ...current,
                    stage: latestVisit.stage,
                    billing: latestVisit.billing,
                    labOrders: latestVisit.labOrders || current.labOrders,
                    timeline: latestVisit.timeline || current.timeline,
                  }
                : current
            );
          }
        }
      } catch (error) {
        // Keep the current screen stable if background refresh fails.
      }
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, [canManageClinicalFields, form?.id]);

  const derivedStage = useMemo(() => {
    if (form.closeVisit) {
      return 'Closed';
    }

    if (['Pending', 'Part paid', 'Insurance pending'].includes(form.consultationFeeStatus)) {
      return 'At cashier';
    }

    if (form.cashierItems.some((item) => ['Pending', 'Part paid', 'Insurance pending'].includes(item.status))) {
      return 'At cashier';
    }

    if (form.labOrders.some((item) => ['Pending', 'Part paid', 'Insurance pending'].includes(item.paymentStatus))) {
      return 'At cashier';
    }

    if (
      form.pharmacyItems.some(
        (item) =>
          ['Issued', 'Part invoiced', 'Invoiced'].includes(item.invoiceStatus) &&
          ['Pending', 'Part paid', 'Insurance pending'].includes(item.paymentStatus)
      )
    ) {
      return 'At cashier';
    }

    if (form.triage === 'Pending') {
      return 'In triage';
    }

    if (
      form.labOrders.some(
        (item) =>
          ['Paid', 'Waived'].includes(item.paymentStatus) &&
          (item.labStatus !== 'Completed' || ['Pending', 'Ready'].includes(item.resultStatus))
      )
    ) {
      return 'At lab';
    }

    if (
      form.labOrders.some((item) => item.labStatus === 'Completed') &&
      form.labOrders.some((item) => ['Collected', 'Reviewed'].includes(item.resultStatus))
    ) {
      return 'With doctor';
    }

    if (
      form.pharmacyItems.some(
        (item) =>
          ['Available', 'Partial'].includes(item.availabilityStatus) &&
          item.paymentStatus === 'Paid' &&
          ['Pending', 'Ready', 'Part dispensed'].includes(item.dispenseStatus)
      )
    ) {
      return 'At pharmacy';
    }

    if (
      form.consultationStatus !== 'Completed' ||
      ['Awaiting results', 'Review required'].includes(form.doctorReviewStatus)
    ) {
      return 'With doctor';
    }

    if (
      form.consultationStatus === 'Completed' &&
      form.doctorReviewStatus === 'Completed' &&
      !form.pharmacyItems.some((item) => ['Pending', 'Ready', 'Part dispensed'].includes(item.dispenseStatus))
    ) {
      return 'Closed';
    }

    return 'Checked in';
  }, [form]);

  if (!auth.canViewData('visit_records')) {
    return (
      <SectionCard eyebrow="Access control" title="Visit flow is restricted">
        <p className="panel-copy">The active user cannot view day-visit records.</p>
      </SectionCard>
    );
  }

  if (isPharmacistUser) {
    return (
      <SectionCard eyebrow="Workflow routing" title="Use the pharmacy department queue">
        <p className="panel-copy">
          Pharmacists should work from the Departments page so stock, invoicing, and dispensing stay
          in the pharmacy queue only.
        </p>
      </SectionCard>
    );
  }

  const openCreateModal = () => {
    setEditingVisitId(null);
    setIsReadOnlyVisit(false);
    setPatientLookup('');
    setPatientMatches([]);
    setActiveTab('journey');
    setForm(emptyVisitForm);
    setIsModalOpen(true);
  };

  const openEditModal = (visit) => {
    if (!auth.canDoAction('edit_visit')) {
      return;
    }

    setEditingVisitId(visit.id);
    setIsReadOnlyVisit(visit.stage === 'Closed');
    setPatientLookup('');
    setPatientMatches([]);
    setActiveTab('journey');
    setForm(normalizeVisitForForm(visit));
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingVisitId(null);
    setIsReadOnlyVisit(false);
    setIsSaving(false);
    setPatientLookup('');
    setPatientMatches([]);
    setActiveTab('journey');
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleClinicianChange = (event) => {
    const selected = clinicianOptions.find((item) => item.id === event.target.value);
    setForm((current) => ({
      ...current,
      assignedClinicianId: selected?.id || '',
      clinician: selected?.fullName || '',
      department: current.department || selected?.department || '',
    }));
  };

  const handlePickPatient = (patient) => {
    setForm((current) => ({
      ...current,
      patient: patient.name,
      patientDbId: patient.id,
      patientPhone: patient.phone || '',
      patientIdNumber: patient.idNumber || '',
      department: current.department || patient.department || '',
    }));
    setPatientLookup(`${patient.name} | ${patient.patientId}`);
    setPatientMatches([]);
  };

  const updateArrayItem = (field, index, key, value) => {
    setForm((current) => ({
      ...current,
      [field]: current[field].map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item
      ),
    }));
  };

  const addArrayItem = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: [...current[field], value],
    }));
  };

  const removeArrayItem = (field, index) => {
    setForm((current) => ({
      ...current,
      [field]: current[field].filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const buildDetailDraft = (type, index = null) => {
    switch (type) {
      case 'condition':
        return { value: index === null ? '' : form.medicalConditions[index] || '' };
      case 'diagnosis':
        return {
          diagnosis: form.diagnosis || '',
          diagnosisDetail: form.diagnosisDetail || '',
          doctorNote: form.doctorNote || '',
        };
      case 'journey_lab':
      case 'lab':
        return { ...emptyLabOrder, ...(index === null ? {} : form.labOrders[index] || {}) };
      case 'journey_medication':
      case 'cashier_medication':
      case 'pharmacy_medication':
        return { ...emptyPharmacyItem, ...(index === null ? {} : form.pharmacyItems[index] || {}) };
      case 'cashier_charge':
        return { ...emptyCashierItem, ...(index === null ? {} : form.cashierItems[index] || {}) };
      default:
        return null;
    }
  };

  const openDetailModal = ({ type, index = null, mode = 'view' }) => {
    setDetailModal({
      type,
      index,
      mode,
      draft: buildDetailDraft(type, index),
    });
  };

  const closeDetailModal = () => {
    setDetailModal(emptyDetailModalState);
  };

  const handleDetailDraftChange = (event) => {
    const { name, value, type, checked } = event.target;
    setDetailModal((current) => ({
      ...current,
      draft: {
        ...current.draft,
        [name]: type === 'checkbox' ? checked : value,
      },
    }));
  };

  const handleSaveDetail = () => {
    if (!detailModal.draft) {
      return;
    }

    const { type, index, draft } = detailModal;

    setForm((current) => {
      if (type === 'condition') {
        const nextConditions =
          index === null
            ? [...current.medicalConditions, draft.value]
            : current.medicalConditions.map((item, itemIndex) => (itemIndex === index ? draft.value : item));

        return {
          ...current,
          medicalConditions: nextConditions,
        };
      }

      if (type === 'diagnosis') {
        return {
          ...current,
          diagnosis: draft.diagnosis || '',
          diagnosisDetail: draft.diagnosisDetail || '',
          doctorNote: draft.doctorNote || '',
        };
      }

      if (type === 'journey_lab' || type === 'lab') {
        const nextLabOrders =
          index === null
            ? [...current.labOrders, draft]
            : current.labOrders.map((item, itemIndex) => (itemIndex === index ? draft : item));

        return {
          ...current,
          labOrders: nextLabOrders,
        };
      }

      if (type === 'journey_medication' || type === 'cashier_medication' || type === 'pharmacy_medication') {
        const nextPharmacyItems =
          index === null
            ? [...current.pharmacyItems, draft]
            : current.pharmacyItems.map((item, itemIndex) => (itemIndex === index ? draft : item));

        return {
          ...current,
          pharmacyItems: nextPharmacyItems,
        };
      }

      if (type === 'cashier_charge') {
        const matchedPrice = chargeableServiceCatalog.find((item) => item.name === draft.label);
        const normalizedDraft = matchedPrice
          ? { ...draft, amount: draft.amount || String(matchedPrice.unitPrice) }
          : draft;
        const nextCashierItems =
          index === null
            ? [...current.cashierItems, normalizedDraft]
            : current.cashierItems.map((item, itemIndex) => (itemIndex === index ? normalizedDraft : item));

        return {
          ...current,
          cashierItems: nextCashierItems,
        };
      }

      return current;
    });

    closeDetailModal();
  };

  const handleDeleteDetail = () => {
    const { type, index } = detailModal;

    if (index === null) {
      closeDetailModal();
      return;
    }

    if (type === 'condition') {
      removeArrayItem('medicalConditions', index);
    }

    if (type === 'journey_lab' || type === 'lab') {
      removeArrayItem('labOrders', index);
    }

    if (type === 'journey_medication' || type === 'cashier_medication' || type === 'pharmacy_medication') {
      removeArrayItem('pharmacyItems', index);
    }

    if (type === 'cashier_charge') {
      removeArrayItem('cashierItems', index);
    }

    closeDetailModal();
  };

  const handleCatalogCreated = async (item) => {
    setCatalogRecords((current) => [item, ...current]);
    if (onRefreshData) {
      await onRefreshData();
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isReadOnlyVisit) {
      showToast('Closed visits are read-only and cannot be edited.', 'error');
      return;
    }

    if (!editingVisitId && !form.patientDbId) {
      showToast('Select an existing patient before opening a visit.', 'error');
      return;
    }

    setIsSaving(true);

    const payload = {
      ...form,
      stage: derivedStage,
      medicalConditions: form.medicalConditions.filter(Boolean),
      treatmentPlans: form.treatmentPlans,
      investigations: form.labOrders.map((item) => item.testName).filter(Boolean).join(', ') || form.investigations,
      medication:
        form.pharmacyItems.map((item) => item.medicationName).filter(Boolean).join(', ') || form.medication,
    };

    try {
      if (editingVisitId) {
        const savedVisit = await hospitalApi.updateVisit(editingVisitId, payload);
        setRecords((current) =>
          current.map((visit) => (visit.id === editingVisitId ? savedVisit : visit))
        );
        showToast('Visit workflow updated successfully.', 'success');
      } else {
        const createdVisit = await hospitalApi.createVisit(payload);
        setRecords((current) => [createdVisit, ...current]);
        showToast('Daily visit opened successfully.', 'success');
      }

      if (onRefreshData) {
        await onRefreshData();
      }

      closeModal();
    } catch (error) {
      setIsSaving(false);
      showToast(error.message || 'Unable to save visit.', 'error');
    }
  };

  return (
    <div className="page-stack">
      <datalist id="service-catalog-options">
        {chargeableServiceCatalog.map((item) => (
          <option key={item.id} value={item.name}>
            {item.department ? `${item.department} - ${item.unitPrice}` : item.unitPrice}
          </option>
        ))}
      </datalist>
      <datalist id="diagnosis-catalog-options">
        {diagnosisCatalog.map((item) => (
          <option key={item.id} value={item.name}>
            {item.category}
          </option>
        ))}
      </datalist>
      <datalist id="lab-catalog-options">
        {labCatalog.map((item) => (
          <option key={item.id} value={item.name}>
            {item.unitPrice}
          </option>
        ))}
      </datalist>
      <datalist id="medication-catalog-options">
        {medicationCatalog.map((item) => (
          <option key={item.id} value={item.name}>
            {item.unitPrice}
          </option>
        ))}
      </datalist>
      <datalist id="condition-catalog-options">
        {conditionCatalog.map((item) => (
          <option key={item.id} value={item.name}>
            {item.category}
          </option>
        ))}
      </datalist>

      <PageHeader
        title={pageMeta?.label || 'Daily Visits'}
        description={pageMeta?.description || ''}
        actions={
          auth.canDoAction('open_visit') ? (
            <button type="button" className="primary-button" onClick={openCreateModal}>
              Open Visit
            </button>
          ) : null
        }
      />

      <div className="stats-grid stats-grid-compact">
        {summaryCards.map((item) => (
          <StatCard key={item.label} {...item} />
        ))}
      </div>

      <section className="panel">
        <TableToolbar
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder="Search visit, patient, clinician, condition, or department"
          filters={[
            {
              label: 'Stage',
              value: stageFilter,
              onChange: setStageFilter,
              options: [
                { label: 'All stages', value: 'all' },
                ...data.stages.map((stage) => ({ label: stage, value: stage })),
              ],
            },
            {
              label: 'From date',
              value: startDateFilter,
              onChange: setStartDateFilter,
              type: 'date',
              max: endDateFilter || undefined,
            },
            {
              label: 'To date',
              value: endDateFilter,
              onChange: setEndDateFilter,
              type: 'date',
              min: startDateFilter || undefined,
            },
          ]}
        />

        <DataTable
          columns={visitColumns}
          rows={filteredRecords}
       
          emptyMessage="No visit records match the current filters."
          onRowClick={auth.canDoAction('edit_visit') ? openEditModal : undefined}
        />
      </section>

      <Modal
        isOpen={isModalOpen}
        title={editingVisitId ? 'Edit Visit Workflow' : 'Open Daily Visit'}
        subtitle={
          isReadOnlyVisit
            ? 'This visit has already been closed and is now read-only.'
            : 'A patient must finish or close the current visit before another one can be opened.'
        }
        onClose={closeModal}
      >
        <form className="entity-form" onSubmit={handleSubmit}>
          <fieldset disabled={isReadOnlyVisit} className="form-fieldset-reset">
            <Tabs tabs={availableTabs} activeTab={activeTab} onChange={setActiveTab} />

            {activeTab === 'journey' ? (
              <>
                {!editingVisitId ? (
                  <label className="form-field form-field-full patient-search-field">
                    <span>Find Patient</span>
                    <input
                      value={patientLookup}
                      onChange={(event) => setPatientLookup(event.target.value)}
                      placeholder="Search by name, ID number, or phone number"
                    />
                    <small className="helper-text">
                      Visits can only be opened for registered patients, and only one active visit is allowed at a time.
                    </small>
                    {isSearchingPatients ? <small className="helper-text">Searching...</small> : null}
                    {patientMatches.length ? (
                      <div className="patient-match-list">
                        {patientMatches.map((patient) => (
                          <button
                            key={patient.id}
                            type="button"
                            className="patient-match-item"
                            onClick={() => handlePickPatient(patient)}
                          >
                            <strong>{patient.name}</strong>
                            <span>
                              {patient.patientId} | {patient.phone || 'No phone'} | {patient.idNumber || 'No ID'}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </label>
                ) : null}

                <div className="form-section form-section-emphasis">
                  <div className="form-section-header">
                    <div>
                      <h4 className="form-section-title">Visit Overview</h4>
                    </div>
                  </div>
                  <ProDataGrid
                    items={[
                      { label: 'Visit Number', value: form.visitNo || 'Auto-generated on save' },
                      { label: 'Patient', value: form.patient },
                      { label: 'Current Stage', value: derivedStage },
                      { label: 'Branch', value: auth.currentUser?.selectedBranchName || auth.currentUser?.branchName || 'Main' },
                      { label: 'Billing', value: form.billing || 'Pending' },
                      { label: 'Department', value: form.department || 'Not assigned' },
                      { label: 'Clinician', value: form.clinician || 'Not assigned' },
                      { label: 'Phone', value: form.patientPhone },
                      { label: 'ID Number', value: form.patientIdNumber },
                    ]}
                  />
                </div>

                <div className="form-section form-section-emphasis">
                  <div className="form-section-header">
                    <div>
                      <h4 className="form-section-title">Routing And Clinical Status</h4>
                    </div>
                  </div>
                  <div className="form-grid">
                    <label className="form-field">
                      <span>Department</span>
                      {canManageJourneyDepartment ? (
                        <select name="department" value={form.department} onChange={handleChange} required>
                          <option value="">Select department</option>
                          {departmentOptions.map((department) => (
                            <option key={department.id} value={department.name}>
                              {department.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input value={form.department || 'Not assigned'} disabled />
                      )}
                    </label>
                    <label className="form-field">
                      <span>Assign Clinician</span>
                      {canAssignClinician ? (
                        <select value={form.assignedClinicianId} onChange={handleClinicianChange} required>
                          <option value="">Select clinician</option>
                          {clinicianOptions.map((clinician) => (
                            <option key={clinician.id} value={clinician.id}>
                              {clinician.fullName} {clinician.department ? `- ${clinician.department}` : ''}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input value={form.clinician || 'Not assigned'} disabled />
                      )}
                    </label>
                    {canManageTriage ? (
                      <label className="form-field">
                        <span>Triage</span>
                        <select name="triage" value={form.triage} onChange={handleChange}>
                          <option value="Pending">Pending</option>
                          <option value="Completed">Completed</option>
                          <option value="Skipped">Skipped</option>
                        </select>
                      </label>
                    ) : null}
                    {canManageClinicalFields ? (
                      <>
                        <label className="form-field">
                          <span>Consultation Status</span>
                          <select
                            name="consultationStatus"
                            value={form.consultationStatus}
                            onChange={handleChange}
                          >
                            <option value="Pending">Pending</option>
                            <option value="In progress">In progress</option>
                            <option value="Completed">Completed</option>
                          </select>
                        </label>
                        <label className="form-field">
                          <span>Doctor Review</span>
                          <select
                            name="doctorReviewStatus"
                            value={form.doctorReviewStatus}
                            onChange={handleChange}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Awaiting results">Awaiting results</option>
                            <option value="Review required">Review required</option>
                            <option value="Completed">Completed</option>
                          </select>
                        </label>
                      </>
                    ) : null}
                    <label className="form-field form-field-full">
                      <span>Chief Complaint</span>
                      <textarea
                        name="chiefComplaint"
                        rows="2"
                        value={form.chiefComplaint}
                        onChange={handleChange}
                        placeholder="Reason the patient came in today"
                        disabled={!canEditChiefComplaint}
                      />
                    </label>
                  </div>
                </div>
              {canManageClinicalFields ? (
                <>
                  <div className="form-field form-field-full form-section">
                    <div className="form-section-header">
                      <div>
                        <h4 className="form-section-title">Medical Conditions</h4>
                      </div>
                      <div className="button-row">
                        <button
                          type="button"
                          className="secondary-button small-button"
                          onClick={() => openDetailModal({ type: 'condition', mode: 'edit' })}
                        >
                          Add Condition
                        </button>
                        <button
                          type="button"
                          className="secondary-button small-button"
                          onClick={() => setQuickAddSection('services_conditions')}
                        >
                          Add To List
                        </button>
                      </div>
                    </div>
                    <DataTable
                      columns={conditionColumns}
                      rows={conditionRows}
                      
                      emptyMessage="No medical conditions added yet."
                    onRowClick={
                      canEditWorkflowLists
                        ? (row) =>
                            openDetailModal({
                              type: 'condition',
                              index: conditionRows.findIndex((item) => item.id === row.id),
                              mode: 'view',
                            })
                        : undefined
                    }
                    />
                  </div>
                  <div className="form-field form-field-full form-section">
                    <div className="form-section-header">
                      <div>
                        <h4 className="form-section-title">Diagnosis</h4>
                      </div>
                      <div className="button-row">
                        <button
                          type="button"
                          className="secondary-button small-button"
                          onClick={() => openDetailModal({ type: 'diagnosis', mode: diagnosisRows.length ? 'view' : 'edit' })}
                        >
                          {diagnosisRows.length ? 'Open Diagnosis' : 'Add Diagnosis'}
                        </button>
                        <button
                          type="button"
                          className="secondary-button small-button"
                          onClick={() => setQuickAddSection('services_diagnoses')}
                        >
                          Add To List
                        </button>
                      </div>
                    </div>
                    <DataTable
                      columns={diagnosisColumns}
                      rows={diagnosisRows}
                      emptyMessage="No diagnosis recorded yet."
                      onRowClick={canEditWorkflowLists ? () => openDetailModal({ type: 'diagnosis', mode: 'view' }) : undefined}
                    />
                  </div>
                </>
              ) : null}
              {canManageClinicalFields ? (
                <div className="form-field form-field-full form-section">
                  <div className="form-section-header">
                    <div>
                      <h4 className="form-section-title">Requested Tests</h4>
                    </div>
                    <div className="button-row">
                      <button
                        type="button"
                        className="secondary-button small-button"
                        onClick={() => openDetailModal({ type: 'journey_lab', mode: 'edit' })}
                      >
                        Add Test
                      </button>
                      <button
                        type="button"
                        className="secondary-button small-button"
                        onClick={() => setQuickAddSection('services_lab')}
                      >
                        Add To List
                      </button>
                    </div>
                  </div>
                  <DataTable
                    columns={labOrderColumns}
                    rows={journeyLabRows}
                  
                    emptyMessage="No requested tests added yet."
                      onRowClick={
                        canEditWorkflowLists
                          ? (row) =>
                              openDetailModal({
                                type: 'journey_lab',
                                index: journeyLabRows.findIndex((item) => item.id === row.id),
                                mode: 'view',
                              })
                          : undefined
                      }
                  />
                </div>
              ) : null}
              {canCloseVisit ? (
                <label className="form-field form-field-full">
                  <span>Close Visit</span>
                  <input
                    type="checkbox"
                    name="closeVisit"
                    checked={form.closeVisit}
                    onChange={handleChange}
                  />
                </label>
              ) : null}
              {canManageClinicalFields ? (
                <div className="form-field form-field-full form-section">
                  <div className="form-section-header">
                    <div>
                      <h4 className="form-section-title">Medication Plan</h4>
                    </div>
                    <div className="button-row">
                      <button
                        type="button"
                        className="secondary-button small-button"
                        onClick={() => openDetailModal({ type: 'journey_medication', mode: 'edit' })}
                      >
                        Add Medication
                      </button>
                      <button
                        type="button"
                        className="secondary-button small-button"
                        onClick={() => setQuickAddSection('pharmacy_medications')}
                      >
                        Add To List
                      </button>
                    </div>
                  </div>
                  <DataTable
                    columns={medicationColumns}
                    rows={journeyMedicationRows}
                   
                    emptyMessage="No medication added yet."
                    onRowClick={
                      canEditWorkflowLists
                        ? (row) =>
                            openDetailModal({
                              type: 'journey_medication',
                              index: journeyMedicationRows.findIndex((item) => item.id === row.id),
                              mode: 'view',
                            })
                        : undefined
                    }
                  />
                </div>
              ) : null}
              {!canManageClinicalFields && !canManageCashierFields ? (
                <p className="panel-copy form-field-full">
                  Reception can open the visit, assign the doctor, and capture the chief complaint. Cashier and doctor details will be completed later by their own desks.
                </p>
              ) : null}
              </>
            ) : null}

            {activeTab === 'cashier' && canManageCashierFields ? (
              <div className="line-item-stack">
                <div className="form-grid">
                  <label className="form-field">
                    <span>Consultation Fee</span>
                    <select
                      name="consultationFeeStatus"
                      value={form.consultationFeeStatus}
                      onChange={handleChange}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Part paid">Part paid</option>
                      <option value="Paid">Paid</option>
                      <option value="Insurance pending">Insurance pending</option>
                      <option value="Waived">Waived</option>
                    </select>
                  </label>
                </div>
                <div className="form-section form-field form-field-full">
                  <div className="form-section-header">
                    <div>
                      <h4 className="form-section-title">Cashier Charges</h4>
                    </div>
                    <button
                      type="button"
                      className="secondary-button small-button"
                      onClick={() => openDetailModal({ type: 'cashier_charge', mode: 'edit' })}
                    >
                      Add Charge
                    </button>
                  </div>
                  <DataTable
                    columns={cashierChargeColumns}
                    rows={cashierChargeRows}
                    
                    emptyMessage="No cashier charges added yet."
                    onRowClick={
                      canEditWorkflowLists
                        ? (row) =>
                            openDetailModal({
                              type: 'cashier_charge',
                              index: cashierChargeRows.findIndex((item) => item.id === row.id),
                              mode: 'view',
                            })
                        : undefined
                    }
                  />
                </div>
                <div className="form-section form-field form-field-full">
                  <div className="form-section-header">
                    <div>
                      <h4 className="form-section-title">Medication Payments</h4>
                    </div>
                  </div>
                  <DataTable
                    columns={medicationColumns}
                    rows={journeyMedicationRows}
                    
                    emptyMessage="No medication payments pending."
                    onRowClick={
                      canEditWorkflowLists
                        ? (row) =>
                            openDetailModal({
                              type: 'cashier_medication',
                              index: journeyMedicationRows.findIndex((item) => item.id === row.id),
                              mode: 'view',
                            })
                        : undefined
                    }
                  />
                </div>
              </div>
            ) : null}

            {activeTab === 'lab' && canManageLabFields ? (
              <div className="line-item-stack">
                <div className="form-section form-field form-field-full">
                  <div className="form-section-header">
                    <div>
                      <h4 className="form-section-title">Lab Orders</h4>
                    </div>
                    <button
                      type="button"
                      className="secondary-button small-button"
                      onClick={() => openDetailModal({ type: 'lab', mode: 'edit' })}
                    >
                      Add Test
                    </button>
                  </div>
                  <DataTable
                    columns={labOrderColumns}
                    rows={journeyLabRows}
                   
                    emptyMessage="No lab orders added yet."
                    onRowClick={
                      canEditWorkflowLists
                        ? (row) =>
                            openDetailModal({
                              type: 'lab',
                              index: journeyLabRows.findIndex((item) => item.id === row.id),
                              mode: 'view',
                            })
                        : undefined
                    }
                  />
                </div>
              </div>
            ) : null}

            {activeTab === 'pharmacy' && canManagePharmacyFields ? (
              <div className="line-item-stack">
                <div className="form-section form-field form-field-full">
                  <div className="form-section-header">
                    <div>
                      <h4 className="form-section-title">Medication Workflow</h4>
                    </div>
                  </div>
                  <DataTable
                    columns={medicationColumns}
                    rows={journeyMedicationRows}
                   
                    emptyMessage="No medication workflow items yet."
                    onRowClick={
                      canEditWorkflowLists
                        ? (row) =>
                            openDetailModal({
                              type: 'pharmacy_medication',
                              index: journeyMedicationRows.findIndex((item) => item.id === row.id),
                              mode: 'view',
                            })
                        : undefined
                    }
                  />
                </div>
              </div>
            ) : null}

            {activeTab === 'treatment' ? (
              <div className="line-item-stack form-section">
                <div className="form-section-header">
                  <div>
                    <h4 className="form-section-title">Treatment Plan</h4>
                  </div>
                  {(canManageClinicalFields || canManagePharmacyFields) ? (
                    <button
                      type="button"
                      className="secondary-button small-button"
                      onClick={() => addArrayItem('treatmentPlans', emptyTreatmentPlan)}
                    >
                      Add Treatment
                    </button>
                  ) : null}
                </div>
                {form.treatmentPlans.length ? (
                  form.treatmentPlans.map((item, index) => (
                    <div className="line-item-card" key={`treatment-${index}`}>
                      <div className="form-grid">
                        <label className="form-field">
                          <span>Treatment Item</span>
                          <input
                            list="medication-catalog-options"
                            value={item.itemName}
                            disabled={!canManageClinicalFields && !canManagePharmacyFields}
                            onChange={(event) =>
                              updateArrayItem('treatmentPlans', index, 'itemName', event.target.value)
                            }
                          />
                        </label>
                        <label className="form-field">
                          <span>Type</span>
                          <select
                            value={item.itemType}
                            onChange={(event) =>
                              updateArrayItem('treatmentPlans', index, 'itemType', event.target.value)
                            }
                            disabled={!canManageClinicalFields && !canManagePharmacyFields}
                          >
                            <option value="Medication">Medication</option>
                            <option value="Infusion">Infusion</option>
                            <option value="Procedure">Procedure</option>
                            <option value="Other">Other</option>
                          </select>
                        </label>
                        <label className="form-field">
                          <span>Route</span>
                          <input
                            value={item.route}
                            onChange={(event) =>
                              updateArrayItem('treatmentPlans', index, 'route', event.target.value)
                            }
                            disabled={!canManageClinicalFields && !canManagePharmacyFields}
                          />
                        </label>
                        <label className="form-field">
                          <span>Dose</span>
                          <input
                            value={item.dose}
                            onChange={(event) =>
                              updateArrayItem('treatmentPlans', index, 'dose', event.target.value)
                            }
                            disabled={!canManageClinicalFields && !canManagePharmacyFields}
                          />
                        </label>
                        <label className="form-field">
                          <span>Frequency</span>
                          <input
                            value={item.frequency}
                            onChange={(event) =>
                              updateArrayItem('treatmentPlans', index, 'frequency', event.target.value)
                            }
                            disabled={!canManageClinicalFields && !canManagePharmacyFields}
                          />
                        </label>
                        <label className="form-field">
                          <span>Duration</span>
                          <input
                            value={item.duration}
                            onChange={(event) =>
                              updateArrayItem('treatmentPlans', index, 'duration', event.target.value)
                            }
                            disabled={!canManageClinicalFields && !canManagePharmacyFields}
                          />
                        </label>
                        <label className="form-field">
                          <span>Start Day</span>
                          <input
                            type="number"
                            min="1"
                            value={item.startDay}
                            onChange={(event) =>
                              updateArrayItem('treatmentPlans', index, 'startDay', Number(event.target.value) || 1)
                            }
                            disabled={!canManageClinicalFields && !canManagePharmacyFields}
                          />
                        </label>
                        <label className="form-field">
                          <span>End Day</span>
                          <input
                            type="number"
                            min="1"
                            value={item.endDay}
                            onChange={(event) =>
                              updateArrayItem('treatmentPlans', index, 'endDay', Number(event.target.value) || 1)
                            }
                            disabled={!canManageClinicalFields && !canManagePharmacyFields}
                          />
                        </label>
                        <label className="form-field form-field-full">
                          <span>Instructions</span>
                          <textarea
                            rows="2"
                            value={item.instructions}
                            onChange={(event) =>
                              updateArrayItem('treatmentPlans', index, 'instructions', event.target.value)
                            }
                            placeholder="Example: Take two in the morning and at night after meals."
                            disabled={!canManageClinicalFields && !canManagePharmacyFields}
                          />
                        </label>
                        <label className="form-field">
                          <span>Morning</span>
                          <input
                            type="checkbox"
                            checked={Boolean(item.morning)}
                            onChange={(event) =>
                              updateArrayItem('treatmentPlans', index, 'morning', event.target.checked)
                            }
                            disabled={!canManageClinicalFields && !canManagePharmacyFields}
                          />
                        </label>
                        <label className="form-field">
                          <span>Afternoon</span>
                          <input
                            type="checkbox"
                            checked={Boolean(item.afternoon)}
                            onChange={(event) =>
                              updateArrayItem('treatmentPlans', index, 'afternoon', event.target.checked)
                            }
                            disabled={!canManageClinicalFields && !canManagePharmacyFields}
                          />
                        </label>
                        <label className="form-field">
                          <span>Evening</span>
                          <input
                            type="checkbox"
                            checked={Boolean(item.evening)}
                            onChange={(event) =>
                              updateArrayItem('treatmentPlans', index, 'evening', event.target.checked)
                            }
                            disabled={!canManageClinicalFields && !canManagePharmacyFields}
                          />
                        </label>
                        <label className="form-field">
                          <span>Night</span>
                          <input
                            type="checkbox"
                            checked={Boolean(item.night)}
                            onChange={(event) =>
                              updateArrayItem('treatmentPlans', index, 'night', event.target.checked)
                            }
                            disabled={!canManageClinicalFields && !canManagePharmacyFields}
                          />
                        </label>
                        <label className="form-field form-field-full">
                          <span>Pharmacy Note</span>
                          <textarea
                            rows="2"
                            value={item.pharmacyNote}
                            onChange={(event) =>
                              updateArrayItem('treatmentPlans', index, 'pharmacyNote', event.target.value)
                            }
                            placeholder="Pharmacy can add preparation or dispensing notes here."
                            disabled={!canManagePharmacyFields && !isAdminUser}
                          />
                        </label>
                      </div>
                      <small>{formatTreatmentPlan(item)}</small>
                      {(canManageClinicalFields || canManagePharmacyFields) ? (
                        <button
                          type="button"
                          className="text-button"
                          onClick={() => removeArrayItem('treatmentPlans', index)}
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                  ))
                ) : null}
              </div>
            ) : null}

            {activeTab === 'timeline' ? (
              <div className="line-item-stack">
              <strong>Movement History</strong>
              {form.timeline?.length ? (
                <div className="timeline-list">
                  {form.timeline.map((entry, index) => (
                    <div key={`${entry.department}-${index}`} className="timeline-item">
                      <strong>{entry.department}</strong>
                      <span>{entry.status}</span>
                      <small>{entry.note}</small>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="panel-copy">Movement history will appear after the visit is saved and routed.</p>
              )}
              </div>
            ) : null}
          </fieldset>

          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={closeModal}>
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={isSaving || isReadOnlyVisit}>
              {isReadOnlyVisit
                ? 'Visit Closed'
                : isSaving
                  ? 'Saving...'
                  : editingVisitId
                    ? 'Update Visit'
                    : 'Create Visit'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(detailModal.type)}
        title={
          detailModal.type === 'condition'
            ? detailModal.index === null
              ? 'Add Condition'
              : 'Condition Details'
            : detailModal.type === 'diagnosis'
              ? 'Diagnosis Details'
              : detailModal.type === 'cashier_charge'
                ? detailModal.index === null
                  ? 'Add Charge'
                  : 'Charge Details'
                : detailModal.type === 'lab' || detailModal.type === 'journey_lab'
                  ? detailModal.index === null
                    ? 'Add Test'
                    : 'Test Details'
                  : detailModal.index === null
                    ? 'Add Medication'
                    : 'Medication Details'
        }
        subtitle="This detail opens separately so the main workflow modal stays clean."
        onClose={closeDetailModal}
      >
        {detailModal.draft ? (
          detailModal.mode === 'view' ? (
            <div className="page-stack">
              <ProDataGrid
                items={
                  detailModal.type === 'condition'
                    ? [{ label: 'Condition', value: detailModal.draft.value || '—' }]
                    : detailModal.type === 'diagnosis'
                      ? [
                          { label: 'Primary Diagnosis', value: detailModal.draft.diagnosis || '—' },
                          { label: 'Detail / Impression', value: detailModal.draft.diagnosisDetail || '—' },
                          { label: 'Doctor Note', value: detailModal.draft.doctorNote || '—' },
                        ]
                      : detailModal.type === 'cashier_charge'
                        ? [
                            { label: 'Charge', value: detailModal.draft.label || '—' },
                            { label: 'Amount', value: detailModal.draft.amount || '0' },
                            { label: 'Status', value: detailModal.draft.status || 'Pending' },
                            { label: 'After Payment Send To', value: detailModal.draft.destinationDepartment || '—' },
                          ]
                        : detailModal.type === 'lab' || detailModal.type === 'journey_lab'
                          ? [
                              { label: 'Test Name', value: detailModal.draft.testName || '—' },
                              { label: 'Payment', value: detailModal.draft.paymentStatus || 'Pending' },
                              { label: 'Lab Status', value: detailModal.draft.labStatus || 'Not started' },
                              { label: 'Result Status', value: detailModal.draft.resultStatus || 'Pending' },
                              { label: 'Current Progress', value: getLabProgressLabel(detailModal.draft) },
                            ]
                          : [
                              { label: 'Medication', value: detailModal.draft.medicationName || '—' },
                              { label: 'Availability', value: detailModal.draft.availabilityStatus || 'Pending' },
                              { label: 'Invoice', value: detailModal.draft.invoiceStatus || 'Not issued' },
                              { label: 'Payment', value: detailModal.draft.paymentStatus || 'Pending' },
                              { label: 'Dispense', value: detailModal.draft.dispenseStatus || 'Pending' },
                            ]
                }
                variant="expanded"
              />
              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={closeDetailModal}>
                  Close
                </button>
                {canEditWorkflowLists ? (
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => setDetailModal((current) => ({ ...current, mode: 'edit' }))}
                  >
                    Edit
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <form
              className="entity-form"
              onSubmit={(event) => {
                event.preventDefault();
                handleSaveDetail();
              }}
            >
              <div className="form-grid">
                {detailModal.type === 'condition' ? (
                  <label className="form-field form-field-full">
                    <span>Condition</span>
                    <input
                      list="condition-catalog-options"
                      name="value"
                      value={detailModal.draft.value || ''}
                      onChange={handleDetailDraftChange}
                      required
                    />
                  </label>
                ) : null}
                {detailModal.type === 'diagnosis' ? (
                  <>
                    <label className="form-field">
                      <span>Primary Diagnosis</span>
                      <input
                        list="diagnosis-catalog-options"
                        name="diagnosis"
                        value={detailModal.draft.diagnosis || ''}
                        onChange={handleDetailDraftChange}
                      />
                    </label>
                    <label className="form-field form-field-full">
                      <span>Diagnosis Detail / Impression</span>
                      <textarea
                        name="diagnosisDetail"
                        rows="3"
                        value={detailModal.draft.diagnosisDetail || ''}
                        onChange={handleDetailDraftChange}
                      />
                    </label>
                    <label className="form-field form-field-full">
                      <span>Doctor Note</span>
                      <textarea
                        name="doctorNote"
                        rows="3"
                        value={detailModal.draft.doctorNote || ''}
                        onChange={handleDetailDraftChange}
                      />
                    </label>
                  </>
                ) : null}
                {detailModal.type === 'cashier_charge' ? (
                  <>
                    <label className="form-field">
                      <span>Charge</span>
                      <input
                        list="service-catalog-options"
                        name="label"
                        value={detailModal.draft.label || ''}
                        onChange={handleDetailDraftChange}
                        required
                      />
                    </label>
                    <label className="form-field">
                      <span>Amount</span>
                      <input name="amount" value={detailModal.draft.amount || ''} onChange={handleDetailDraftChange} />
                    </label>
                    <label className="form-field">
                      <span>Status</span>
                      <select name="status" value={detailModal.draft.status || 'Pending'} onChange={handleDetailDraftChange}>
                        <option value="Pending">Pending</option>
                        <option value="Part paid">Part paid</option>
                        <option value="Paid">Paid</option>
                        <option value="Insurance pending">Insurance pending</option>
                        <option value="Waived">Waived</option>
                      </select>
                    </label>
                    <label className="form-field">
                      <span>After Payment Send To</span>
                      <select
                        name="destinationDepartment"
                        value={detailModal.draft.destinationDepartment || ''}
                        onChange={handleDetailDraftChange}
                      >
                        <option value="">Select destination</option>
                        <option value="With doctor">Doctor</option>
                        <option value="At lab">Laboratory</option>
                        <option value="At pharmacy">Pharmacy</option>
                      </select>
                    </label>
                  </>
                ) : null}
                {detailModal.type === 'journey_lab' || detailModal.type === 'lab' ? (
                  <>
                    <label className="form-field">
                      <span>Test Name</span>
                      <input
                        list="lab-catalog-options"
                        name="testName"
                        value={detailModal.draft.testName || ''}
                        onChange={handleDetailDraftChange}
                        required
                      />
                    </label>
                    <label className="form-field">
                      <span>Payment</span>
                      <select
                        name="paymentStatus"
                        value={detailModal.draft.paymentStatus || 'Pending'}
                        onChange={handleDetailDraftChange}
                        disabled={detailModal.type === 'journey_lab'}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Part paid">Part paid</option>
                        <option value="Paid">Paid</option>
                        <option value="Insurance pending">Insurance pending</option>
                      </select>
                    </label>
                    <label className="form-field">
                      <span>Lab Status</span>
                      <select
                        name="labStatus"
                        value={detailModal.draft.labStatus || 'Not started'}
                        onChange={handleDetailDraftChange}
                        disabled={detailModal.type === 'journey_lab'}
                      >
                        <option value="Not started">Not started</option>
                        <option value="Awaiting sample">Awaiting sample</option>
                        <option value="Sample collected">Sample collected</option>
                        <option value="In progress">In progress</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </label>
                    <label className="form-field">
                      <span>Result Status</span>
                      <select
                        name="resultStatus"
                        value={detailModal.draft.resultStatus || 'Pending'}
                        onChange={handleDetailDraftChange}
                        disabled={detailModal.type === 'journey_lab'}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Ready">Ready</option>
                        <option value="Collected">Collected</option>
                        <option value="Reviewed">Reviewed</option>
                      </select>
                    </label>
                  </>
                ) : null}
                {detailModal.type === 'journey_medication' ||
                detailModal.type === 'cashier_medication' ||
                detailModal.type === 'pharmacy_medication' ? (
                  <>
                    <label className="form-field">
                      <span>Medication</span>
                      <input
                        list="medication-catalog-options"
                        name="medicationName"
                        value={detailModal.draft.medicationName || ''}
                        onChange={handleDetailDraftChange}
                        disabled={detailModal.type !== 'journey_medication'}
                        required
                      />
                    </label>
                    <label className="form-field">
                      <span>Availability</span>
                      <select
                        name="availabilityStatus"
                        value={detailModal.draft.availabilityStatus || 'Pending'}
                        onChange={handleDetailDraftChange}
                        disabled={detailModal.type !== 'pharmacy_medication'}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Available">Available</option>
                        <option value="Partial">Partial</option>
                        <option value="Unavailable">Unavailable</option>
                      </select>
                    </label>
                    <label className="form-field">
                      <span>Invoice</span>
                      <select
                        name="invoiceStatus"
                        value={detailModal.draft.invoiceStatus || 'Not issued'}
                        onChange={handleDetailDraftChange}
                        disabled={detailModal.type !== 'pharmacy_medication'}
                      >
                        <option value="Not issued">Not issued</option>
                        <option value="Issued">Issued</option>
                        <option value="Part invoiced">Part invoiced</option>
                        <option value="Invoiced">Invoiced</option>
                      </select>
                    </label>
                    <label className="form-field">
                      <span>Payment</span>
                      <select
                        name="paymentStatus"
                        value={detailModal.draft.paymentStatus || 'Pending'}
                        onChange={handleDetailDraftChange}
                        disabled={detailModal.type !== 'cashier_medication'}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Part paid">Part paid</option>
                        <option value="Paid">Paid</option>
                        <option value="Insurance pending">Insurance pending</option>
                      </select>
                    </label>
                    <label className="form-field">
                      <span>Dispense</span>
                      <select
                        name="dispenseStatus"
                        value={detailModal.draft.dispenseStatus || 'Pending'}
                        onChange={handleDetailDraftChange}
                        disabled={detailModal.type !== 'pharmacy_medication'}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Ready">Ready</option>
                        <option value="Part dispensed">Part dispensed</option>
                        <option value="Dispensed">Dispensed</option>
                      </select>
                    </label>
                  </>
                ) : null}
              </div>

              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={closeDetailModal}>
                  Cancel
                </button>
                {detailModal.index !== null ? (
                  <button type="button" className="secondary-button" onClick={handleDeleteDetail}>
                    Remove
                  </button>
                ) : null}
                <button type="submit" className="primary-button">
                  {detailModal.index === null ? 'Add Item' : 'Save Changes'}
                </button>
              </div>
            </form>
          )
        ) : null}
      </Modal>

      <QuickAddCatalogModal
        sectionId={quickAddSection}
        departments={departments}
        isOpen={Boolean(quickAddSection)}
        onClose={() => setQuickAddSection('')}
        onCreated={handleCatalogCreated}
      />
    </div>
  );
}

export default VisitsPage;
