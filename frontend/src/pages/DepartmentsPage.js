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

const queueTabs = [
  { id: 'cashier', label: 'Cashier' },
  { id: 'doctor', label: 'Doctor' },
  { id: 'lab', label: 'Laboratory' },
  { id: 'pharmacy', label: 'Pharmacy' },
];

const queueWorkTabs = [
  { id: 'all', label: 'All Open' },
  { id: 'new', label: 'New Arrivals' },
  { id: 'followup', label: 'Returns / Follow-up' },
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
  { key: 'destinationDepartment', header: 'Next Department' },
];

const medicationColumns = [
  { key: 'medicationName', header: 'Medication' },
  { key: 'availabilityStatus', header: 'Availability', badge: true },
  { key: 'invoiceStatus', header: 'Invoice', badge: true },
  { key: 'paymentStatus', header: 'Payment', badge: true },
  { key: 'dispenseStatus', header: 'Dispense', badge: true },
];

const treatmentPlanColumns = [
  { key: 'itemName', header: 'Treatment Item' },
  { key: 'route', header: 'Route' },
  { key: 'dose', header: 'Dose' },
  { key: 'instructions', header: 'Instructions' },
];

const createEmptyQueueData = () => ({
  summaryCards: queueTabs.map((tab) => ({ label: `${tab.label} Queue`, value: 0 })),
  queueChart: [],
  registry: [],
  queues: {
    cashier: [],
    doctor: [],
    lab: [],
    pharmacy: [],
  },
});

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

function canDoctorMarkResultReviewed(item) {
  return ['Collected', 'Reviewed'].includes(item.resultStatus);
}

function normalizeQueueData(data) {
  return {
    ...createEmptyQueueData(),
    ...data,
    queues: {
      ...createEmptyQueueData().queues,
      ...(data?.queues || {}),
    },
  };
}

function getDefaultTab(role) {
  switch (role) {
    case 'Cashier':
      return 'cashier';
    case 'Doctor':
    case 'Clinician':
      return 'doctor';
    case 'Lab Scientist':
      return 'lab';
    case 'Pharmacist':
      return 'pharmacy';
    default:
      return 'cashier';
  }
}

function getAllowedQueueTabs(auth) {
  return queueTabs.filter((tab) => auth.canAccessQueue(tab.id));
}

function createEditableVisit(visit) {
  return {
    ...visit,
    medicalConditions: Array.isArray(visit.medicalConditions) ? visit.medicalConditions : [],
    cashierItems: Array.isArray(visit.cashierItems) ? visit.cashierItems : [],
    labOrders: Array.isArray(visit.labOrders) ? visit.labOrders : [],
    pharmacyItems: Array.isArray(visit.pharmacyItems) ? visit.pharmacyItems : [],
    treatmentPlans: Array.isArray(visit.treatmentPlans) ? visit.treatmentPlans : [],
    timeline: Array.isArray(visit.timeline) ? visit.timeline : [],
  };
}

function formatLineItems(items, key, emptyLabel) {
  const labels = items.map((item) => item[key]).filter(Boolean);
  return labels.length ? labels.join(', ') : emptyLabel;
}

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

function formatLabStatusSummary(labOrders) {
  const items = (labOrders || [])
    .filter((item) => item.testName)
    .map((item) => `${item.testName}: ${getLabProgressLabel(item)}`);

  return items.length ? items.join(', ') : 'No tests';
}

function formatPharmacyStatusSummary(pharmacyItems) {
  const items = (pharmacyItems || [])
    .filter((item) => item.medicationName)
    .map((item) => {
      const availability = item.availabilityStatus || 'Pending';
      const invoice = item.invoiceStatus || 'Not issued';
      const payment = item.paymentStatus || 'Pending';
      const dispense = item.dispenseStatus || 'Pending';
      return `${item.medicationName} (${availability} / ${invoice} / ${payment} / ${dispense})`;
    });

  return items.length ? items.join(', ') : 'No medication';
}

function getOutstandingPayments(visit) {
  const consultationPending = ['Pending', 'Part paid', 'Insurance pending'].includes(
    visit.consultationFeeStatus
  )
    ? 1
    : 0;
  const cashierPending = visit.cashierItems.filter((item) =>
    ['Pending', 'Part paid', 'Insurance pending'].includes(item.status)
  ).length;
  const labPending = visit.labOrders.filter((item) =>
    ['Pending', 'Part paid', 'Insurance pending'].includes(item.paymentStatus)
  ).length;
  const pharmacyPending = visit.pharmacyItems.filter((item) =>
    ['Pending', 'Part paid', 'Insurance pending'].includes(item.paymentStatus)
  ).length;

  return consultationPending + cashierPending + labPending + pharmacyPending;
}

function getQueueColumns(activeTab) {
  const baseColumns = [
    {
      key: 'createdAt',
      header: 'Date',
      render: (value) => normalizeDateValue(value),
    },
    { key: 'visitNo', header: 'Visit No' },
    { key: 'patient', header: 'Patient' },
    { key: 'department', header: 'Department' },
    { key: 'clinician', header: 'Clinician' },
    { key: 'queueEntryLabel', header: 'Queue State', badge: true },
  ];

  if (activeTab === 'cashier') {
    return [
      ...baseColumns,
      {
        key: 'outstanding',
        header: 'Outstanding',
        render: (_, row) => `${getOutstandingPayments(row)} items`,
      },
      { key: 'queueTask', header: 'Next Action' },
      { key: 'billing', header: 'Billing', badge: true },
    ];
  }

  if (activeTab === 'doctor') {
    return [
      ...baseColumns,
      {
        key: 'tests',
        header: 'Lab Tracking',
        render: (_, row) => formatLabStatusSummary(row.labOrders),
      },
      {
        key: 'medications',
        header: 'Pharmacy Tracking',
        render: (_, row) => formatPharmacyStatusSummary(row.pharmacyItems),
      },
      { key: 'consultationStatus', header: 'Consultation', badge: true },
      { key: 'doctorReviewStatus', header: 'Review', badge: true },
      { key: 'queueTask', header: 'Next Action' },
    ];
  }

  if (activeTab === 'lab') {
    return [
      ...baseColumns,
      {
        key: 'tests',
        header: 'Tests',
        render: (_, row) => formatLineItems(row.labOrders, 'testName', 'No tests'),
      },
      { key: 'queueTask', header: 'Next Action' },
      { key: 'stage', header: 'Stage', badge: true },
    ];
  }

  return [
    ...baseColumns,
    {
      key: 'medications',
      header: 'Medications',
      render: (_, row) => formatLineItems(row.pharmacyItems, 'medicationName', 'No medication'),
    },
    { key: 'queueTask', header: 'Next Action' },
    { key: 'stage', header: 'Stage', badge: true },
  ];
}

function DepartmentsPage({ data, auth, onRefreshData, pricingItems, departments, pageMeta }) {
  const [queueData, setQueueData] = useState(() => normalizeQueueData(data));
  const [catalogRecords, setCatalogRecords] = useState(pricingItems || []);
  const [activeTab, setActiveTab] = useState(() => getDefaultTab(auth.currentUser?.role));
  const [activeWorkTab, setActiveWorkTab] = useState('all');
  const [searchValue, setSearchValue] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [form, setForm] = useState(null);
  const [isReadOnlyVisit, setIsReadOnlyVisit] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [quickAddSection, setQuickAddSection] = useState('');
  const [detailModal, setDetailModal] = useState(emptyDetailModalState);
  const { showToast } = useToast();
  const canSeeLiveLabProgress = auth.canAccessQueue('doctor');
  const canEditWorkflowLists = !isReadOnlyVisit;

  useEffect(() => {
    setQueueData(normalizeQueueData(data));
  }, [data]);

  useEffect(() => {
    setCatalogRecords(pricingItems || []);
  }, [pricingItems]);

  useEffect(() => {
    setActiveTab(getDefaultTab(auth.currentUser?.role));
  }, [auth.currentUser?.role]);

  const allowedQueueTabs = useMemo(() => getAllowedQueueTabs(auth), [auth]);

  const allowedQueueTabsWithBadges = useMemo(
    () =>
      allowedQueueTabs.map((tab) => ({
        ...tab,
        badgeCount: (queueData.queues[tab.id] || []).length,
      })),
    [allowedQueueTabs, queueData.queues]
  );

  useEffect(() => {
    if (!allowedQueueTabs.length) {
      return;
    }

    if (!allowedQueueTabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(allowedQueueTabs[0].id);
    }
  }, [activeTab, allowedQueueTabs]);

  useEffect(() => {
    setDepartmentFilter('all');
    setActiveWorkTab('all');
  }, [activeTab]);

  useEffect(() => {
    if (!canSeeLiveLabProgress) {
      return undefined;
    }

    const intervalId = window.setInterval(async () => {
      try {
        const latestQueueData = await hospitalApi.getDepartmentModuleData();
        const normalized = normalizeQueueData(latestQueueData);
        setQueueData(normalized);

        if (form?.id) {
          const latestVisit = Object.values(normalized.queues)
            .flat()
            .find((visit) => visit.id === form.id);

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
        // Keep the screen stable if background refresh fails.
      }
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, [canSeeLiveLabProgress, form?.id]);

  const rows = useMemo(
    () => queueData.queues[activeTab] || [],
    [activeTab, queueData.queues]
  );

  const queueWorkTabCounts = useMemo(
    () => ({
      new: rows.filter((row) => row.queueEntryState === 'new').length,
      followup: rows.filter((row) => row.queueEntryState === 'followup').length,
    }),
    [rows]
  );

  const queueWorkTabsWithBadges = useMemo(
    () =>
      queueWorkTabs.map((tab) => ({
        ...tab,
        badgeCount: tab.id === 'all' ? 0 : queueWorkTabCounts[tab.id] || 0,
      })),
    [queueWorkTabCounts]
  );

  const serviceCatalog = useMemo(
    () => (catalogRecords || []).filter((item) => item.itemType === 'Service' && item.isActive),
    [catalogRecords]
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

  const departmentOptions = useMemo(
    () =>
      Array.from(new Set(rows.map((row) => row.department).filter(Boolean))).sort((left, right) =>
        left.localeCompare(right)
      ),
    [rows]
  );

  const filteredRows = useMemo(
    () =>
      rows
        .filter((row) => {
          const matchesWorkTab =
            activeWorkTab === 'all' || row.queueEntryState === activeWorkTab;
          const matchesSearch = [
            row.visitNo,
            row.patient,
            row.department,
            row.clinician,
            row.queueTask,
            row.queueEntryLabel,
            row.diagnosis,
            row.diagnosisDetail,
          ]
            .join(' ')
            .toLowerCase()
            .includes(searchValue.toLowerCase());

          const matchesDepartment =
            departmentFilter === 'all' || row.department === departmentFilter;
          const matchesDate = isWithinDateRange(row.createdAt, startDateFilter, endDateFilter);

          return matchesWorkTab && matchesSearch && matchesDepartment && matchesDate;
        })
        .sort((left, right) => {
          if (activeWorkTab !== 'all') {
            return 0;
          }

          if (left.queueEntryState === right.queueEntryState) {
            return 0;
          }

          return left.queueEntryState === 'new' ? -1 : 1;
        }),
    [activeWorkTab, departmentFilter, rows, searchValue, startDateFilter, endDateFilter]
  );

  const visibleSummaryCards = useMemo(
    () =>
      queueData.summaryCards.filter((card, index) => {
        const queueKey = queueTabs[index]?.id;
        return queueKey ? allowedQueueTabs.some((tab) => tab.id === queueKey) : false;
      }),
    [allowedQueueTabs, queueData.summaryCards]
  );

  const conditionRows = useMemo(
    () =>
      (form?.medicalConditions || []).map((condition, index) => ({
        id: `condition-${index}`,
        value: condition,
      })),
    [form?.medicalConditions]
  );

  const diagnosisRows = useMemo(
    () =>
      form?.diagnosis || form?.diagnosisDetail || form?.doctorNote
        ? [
            {
              id: 'diagnosis-entry',
              diagnosis: form?.diagnosis || 'Not recorded',
              diagnosisDetail: form?.diagnosisDetail || '—',
              doctorNote: form?.doctorNote || '—',
            },
          ]
        : [],
    [form?.diagnosis, form?.diagnosisDetail, form?.doctorNote]
  );

  const labRows = useMemo(
    () =>
      (form?.labOrders || []).map((item, index) => ({
        id: `lab-${index}`,
        ...item,
        progress: getLabProgressLabel(item),
      })),
    [form?.labOrders]
  );

  const cashierChargeRows = useMemo(
    () =>
      (form?.cashierItems || []).map((item, index) => ({
        id: `cashier-${index}`,
        ...item,
      })),
    [form?.cashierItems]
  );

  const medicationRows = useMemo(
    () =>
      (form?.pharmacyItems || []).map((item, index) => ({
        id: `medication-${index}`,
        ...item,
      })),
    [form?.pharmacyItems]
  );

  const treatmentPlanRows = useMemo(
    () =>
      (form?.treatmentPlans || []).map((item, index) => ({
        id: `treatment-${index}`,
        ...item,
      })),
    [form?.treatmentPlans]
  );

  if (!auth.canViewData('department_records')) {
    return (
      <SectionCard eyebrow="Access control" title="Department queues are restricted">
        <p className="panel-copy">The active user cannot view operational department queues.</p>
      </SectionCard>
    );
  }

  const openQueueModal = (visit) => {
    if (!auth.canDoAction('edit_visit')) {
      return;
    }

    setSelectedVisit(visit);
    setForm(createEditableVisit(visit));
    setIsReadOnlyVisit(visit.stage === 'Closed');
  };

  const closeModal = () => {
    setSelectedVisit(null);
    setForm(null);
    setIsReadOnlyVisit(false);
    setIsSaving(false);
    setDetailModal(emptyDetailModalState);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
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
        return { value: index === null ? '' : form?.medicalConditions?.[index] || '' };
      case 'diagnosis':
        return {
          diagnosis: form?.diagnosis || '',
          diagnosisDetail: form?.diagnosisDetail || '',
          doctorNote: form?.doctorNote || '',
        };
      case 'cashier_charge':
        return { ...(index === null ? {} : form?.cashierItems?.[index] || {}) };
      case 'cashier_lab_payment':
      case 'lab':
      case 'doctor_lab':
        return { ...emptyLabOrder, ...(index === null ? {} : form?.labOrders?.[index] || {}) };
      case 'cashier_medication':
      case 'doctor_medication':
      case 'pharmacy_medication':
        return { ...emptyPharmacyItem, ...(index === null ? {} : form?.pharmacyItems?.[index] || {}) };
      case 'treatment':
        return { ...emptyTreatmentPlan, ...(index === null ? {} : form?.treatmentPlans?.[index] || {}) };
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
            ? [...(current.medicalConditions || []), draft.value]
            : current.medicalConditions.map((item, itemIndex) => (itemIndex === index ? draft.value : item));

        return { ...current, medicalConditions: nextConditions };
      }

      if (type === 'diagnosis') {
        return {
          ...current,
          diagnosis: draft.diagnosis || '',
          diagnosisDetail: draft.diagnosisDetail || '',
          doctorNote: draft.doctorNote || '',
        };
      }

      if (type === 'cashier_charge') {
        const nextCashierItems =
          index === null
            ? [...(current.cashierItems || []), draft]
            : current.cashierItems.map((item, itemIndex) => (itemIndex === index ? draft : item));

        return { ...current, cashierItems: nextCashierItems };
      }

      if (type === 'cashier_lab_payment' || type === 'lab' || type === 'doctor_lab') {
        const nextLabOrders =
          index === null
            ? [...(current.labOrders || []), draft]
            : current.labOrders.map((item, itemIndex) => (itemIndex === index ? draft : item));

        return { ...current, labOrders: nextLabOrders };
      }

      if (
        type === 'cashier_medication' ||
        type === 'doctor_medication' ||
        type === 'pharmacy_medication'
      ) {
        const nextPharmacyItems =
          index === null
            ? [...(current.pharmacyItems || []), draft]
            : current.pharmacyItems.map((item, itemIndex) => (itemIndex === index ? draft : item));

        return { ...current, pharmacyItems: nextPharmacyItems };
      }

      if (type === 'treatment') {
        const nextTreatmentPlans =
          index === null
            ? [...(current.treatmentPlans || []), draft]
            : current.treatmentPlans.map((item, itemIndex) => (itemIndex === index ? draft : item));

        return { ...current, treatmentPlans: nextTreatmentPlans };
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

    if (type === 'cashier_charge') {
      removeArrayItem('cashierItems', index);
    }

    if (type === 'cashier_lab_payment' || type === 'lab' || type === 'doctor_lab') {
      removeArrayItem('labOrders', index);
    }

    if (
      type === 'cashier_medication' ||
      type === 'doctor_medication' ||
      type === 'pharmacy_medication'
    ) {
      removeArrayItem('pharmacyItems', index);
    }

    if (type === 'treatment') {
      removeArrayItem('treatmentPlans', index);
    }

    closeDetailModal();
  };

  const refreshQueues = async () => {
    const latestQueueData = await hospitalApi.getDepartmentModuleData();
    setQueueData(normalizeQueueData(latestQueueData));
  };

  const handleCatalogCreated = async (item) => {
    setCatalogRecords((current) => [item, ...current]);
    await refreshQueues();
    if (onRefreshData) {
      await onRefreshData();
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form?.id) {
      return;
    }

    if (isReadOnlyVisit) {
      showToast('Closed visits are read-only and cannot be edited.', 'error');
      return;
    }

    setIsSaving(true);

    try {
      await hospitalApi.updateVisit(form.id, {
        ...form,
        medicalConditions: form.medicalConditions.filter(Boolean),
        treatmentPlans: form.treatmentPlans,
        investigations:
          form.labOrders.map((item) => item.testName).filter(Boolean).join(', ') ||
          form.investigations ||
          '',
        medication:
          form.pharmacyItems.map((item) => item.medicationName).filter(Boolean).join(', ') ||
          form.medication ||
          '',
      });

      await refreshQueues();

      if (onRefreshData) {
        await onRefreshData();
      }

      showToast(`${queueTabs.find((tab) => tab.id === activeTab)?.label} queue updated.`, 'success');
      closeModal();
    } catch (error) {
      setIsSaving(false);
      showToast(error.message || 'Unable to update department queue.', 'error');
    }
  };

  const queueTitle = queueTabs.find((tab) => tab.id === activeTab)?.label || 'Queue';

  return (
    <div className="page-stack">
      <PageHeader
        title={pageMeta?.label || 'Workflow'}
        description={pageMeta?.description || ''}
      />

      <datalist id="queue-condition-catalog-options">
        {conditionCatalog.map((item) => (
          <option key={item.id} value={item.name}>
            {item.category}
          </option>
        ))}
      </datalist>
      <datalist id="queue-diagnosis-catalog-options">
        {diagnosisCatalog.map((item) => (
          <option key={item.id} value={item.name}>
            {item.category}
          </option>
        ))}
      </datalist>
      <datalist id="queue-lab-catalog-options">
        {labCatalog.map((item) => (
          <option key={item.id} value={item.name}>
            {item.unitPrice}
          </option>
        ))}
      </datalist>
      <datalist id="queue-medication-catalog-options">
        {medicationCatalog.map((item) => (
          <option key={item.id} value={item.name}>
            {item.unitPrice}
          </option>
        ))}
      </datalist>
      <div className="stats-grid stats-grid-compact">
        {visibleSummaryCards.map((item) => (
          <StatCard key={item.label} {...item} />
        ))}
      </div>

      <section className="panel">
        {allowedQueueTabs.length ? (
          <Tabs tabs={allowedQueueTabsWithBadges} activeTab={activeTab} onChange={setActiveTab} />
        ) : (
          <p className="panel-copy">
            No operational queue has been assigned to this account yet. An admin can add queue
            access from the user permissions screen.
          </p>
        )}

        {allowedQueueTabs.length ? (
          <>
            <TableToolbar
              searchValue={searchValue}
              onSearchChange={setSearchValue}
              searchPlaceholder="Search visit, patient, department, clinician, or next action"
              filters={[
                {
                  label: 'Department',
                  value: departmentFilter,
                  onChange: setDepartmentFilter,
                  options: [
                    { label: 'All departments', value: 'all' },
                    ...departmentOptions.map((option) => ({ label: option, value: option })),
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

            <Tabs tabs={queueWorkTabsWithBadges} activeTab={activeWorkTab} onChange={setActiveWorkTab} />

            <DataTable
              columns={getQueueColumns(activeTab)}
              rows={filteredRows}
              caption={
                activeWorkTab === 'new'
                  ? `${queueTitle} queue items that have not been attended to at this desk yet`
                  : activeWorkTab === 'followup'
                    ? `${queueTitle} queue items that have already started and came back for follow-up`
                    : `${queueTitle} operational queue`
              }
              emptyMessage={`No visits are waiting in the ${queueTitle.toLowerCase()} queue.`}
              onRowClick={auth.canDoAction('edit_visit') ? openQueueModal : undefined}
            />
          </>
        ) : null}
      </section>

      <Modal
        isOpen={Boolean(selectedVisit && form)}
        title={`${queueTitle} action`}
        subtitle={
          isReadOnlyVisit
            ? 'This visit has already been closed and is now read-only.'
            : selectedVisit?.queueTask || 'Update the current department task for this visit.'
        }
        onClose={closeModal}
      >
        {form ? (
          <form className="entity-form" onSubmit={handleSubmit}>
            <fieldset disabled={isReadOnlyVisit} className="form-fieldset-reset">
              <div className="line-item-card form-section">
                <ProDataGrid
                  items={[
                    { label: 'Visit Number', value: form.visitNo },
                    { label: 'Patient', value: form.patient },
                    { label: 'Department', value: form.department },
                    { label: 'Clinician', value: form.clinician || 'Unassigned' },
                    { label: 'Stage', value: form.stage },
                    { label: 'Billing', value: form.billing },
                  ]}
                />
              </div>

              {activeTab === 'cashier' ? (
                <div className="line-item-stack">
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

                  <div className="form-section form-field form-field-full">
                    <div className="form-section-header">
                      <div>
                        <h4 className="form-section-title">Cashier Charges</h4>
                      </div>
                    </div>
                    <DataTable
                      columns={cashierChargeColumns}
                      rows={cashierChargeRows}
                     emptyMessage="No cashier charges on this visit."
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
                        <h4 className="form-section-title">Lab Payments</h4>
                      </div>
                    </div>
                    <DataTable
                      columns={labOrderColumns}
                      rows={labRows}
                      emptyMessage="No lab orders on this visit."
                      onRowClick={
                        canEditWorkflowLists
                          ? (row) =>
                              openDetailModal({
                                type: 'cashier_lab_payment',
                                index: labRows.findIndex((item) => item.id === row.id),
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
                      rows={medicationRows}
                     emptyMessage="No medication items on this visit."
                      onRowClick={
                        canEditWorkflowLists
                          ? (row) =>
                              openDetailModal({
                                type: 'cashier_medication',
                                index: medicationRows.findIndex((item) => item.id === row.id),
                                mode: 'view',
                              })
                          : undefined
                      }
                    />
                  </div>
                </div>
              ) : null}

              {activeTab === 'doctor' ? (
                <div className="line-item-stack">
                <div className="form-grid">
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
                  <label className="form-field form-field-full">
                    <span>Chief Complaint</span>
                    <textarea
                      name="chiefComplaint"
                      rows="2"
                      value={form.chiefComplaint || ''}
                      onChange={handleChange}
                    />
                  </label>
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
                          onClick={() =>
                            openDetailModal({
                              type: 'diagnosis',
                              mode: diagnosisRows.length ? 'view' : 'edit',
                            })
                          }
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
                </div>

                <div className="form-section">
                  <div className="form-section-header">
                    <div>
                      <h4 className="form-section-title">Requested Tests</h4>
                    </div>
                    <div className="button-row">
                      <button
                        type="button"
                        className="secondary-button small-button"
                        onClick={() => openDetailModal({ type: 'doctor_lab', mode: 'edit' })}
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
                    rows={labRows}
                    emptyMessage="No tests requested yet."
                    onRowClick={
                      canEditWorkflowLists
                        ? (row) =>
                            openDetailModal({
                              type: 'doctor_lab',
                              index: labRows.findIndex((item) => item.id === row.id),
                              mode: 'view',
                            })
                        : undefined
                    }
                  />
                </div>
                <div className="form-section">
                  <div className="form-section-header">
                    <div>
                      <h4 className="form-section-title">Medication Plan</h4>
                    </div>
                    <div className="button-row">
                      <button
                        type="button"
                        className="secondary-button small-button"
                        onClick={() => openDetailModal({ type: 'doctor_medication', mode: 'edit' })}
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
                    rows={medicationRows}
                  mptyMessage="No medication added yet."
                    onRowClick={
                      canEditWorkflowLists
                        ? (row) =>
                            openDetailModal({
                              type: 'doctor_medication',
                              index: medicationRows.findIndex((item) => item.id === row.id),
                              mode: 'view',
                            })
                        : undefined
                    }
                  />
                </div>
                </div>
              ) : null}

              {activeTab === 'lab' ? (
                <div className="line-item-stack">
                  <DataTable
                    columns={labOrderColumns}
                    rows={labRows}
                   emptyMessage="No lab orders have been raised for this visit yet."
                    onRowClick={
                      canEditWorkflowLists
                        ? (row) =>
                            openDetailModal({
                              type: 'lab',
                              index: labRows.findIndex((item) => item.id === row.id),
                              mode: 'view',
                            })
                        : undefined
                    }
                  />
                </div>
              ) : null}

              {activeTab === 'pharmacy' ? (
                <div className="line-item-stack">
                  <div className="form-section form-field form-field-full">
                    <div className="form-section-header">
                      <div>
                        <h4 className="form-section-title">Medication Workflow</h4>
                      </div>
                    </div>
                    <DataTable
                      columns={medicationColumns}
                      rows={medicationRows}
                     emptyMessage="No medication has been raised for this visit yet."
                      onRowClick={
                        canEditWorkflowLists
                          ? (row) =>
                              openDetailModal({
                                type: 'pharmacy_medication',
                                index: medicationRows.findIndex((item) => item.id === row.id),
                                mode: 'view',
                              })
                          : undefined
                      }
                    />
                  </div>

                  <div className="form-section form-field form-field-full">
                    <div className="form-section-header">
                      <div>
                        <h4 className="form-section-title">Treatment Plan</h4>
                      </div>
                      <button
                        type="button"
                        className="secondary-button small-button"
                        onClick={() => openDetailModal({ type: 'treatment', mode: 'edit' })}
                      >
                        Add Treatment
                      </button>
                    </div>
                    <DataTable
                      columns={treatmentPlanColumns}
                      rows={treatmentPlanRows}
                     emptyMessage="No treatment plan has been added yet."
                      onRowClick={
                        canEditWorkflowLists
                          ? (row) =>
                              openDetailModal({
                                type: 'treatment',
                                index: treatmentPlanRows.findIndex((item) => item.id === row.id),
                                mode: 'view',
                              })
                          : undefined
                      }
                    />
                  </div>
                </div>
              ) : null}
            </fieldset>

            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={closeModal}>
                Cancel
              </button>
              <button type="submit" className="primary-button" disabled={isSaving || isReadOnlyVisit}>
                {isReadOnlyVisit ? 'Visit Closed' : isSaving ? 'Saving...' : `Update ${queueTitle}`}
              </button>
            </div>
          </form>
        ) : null}
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
                ? 'Charge Details'
                : detailModal.type === 'cashier_lab_payment' ||
                    detailModal.type === 'lab' ||
                    detailModal.type === 'doctor_lab'
                  ? detailModal.index === null
                    ? 'Add Test'
                    : 'Test Details'
                  : detailModal.type === 'treatment'
                    ? detailModal.index === null
                      ? 'Add Treatment'
                      : 'Treatment Details'
                    : detailModal.index === null
                      ? 'Add Medication'
                      : 'Medication Details'
        }
        subtitle="This detail opens separately so the workflow modal stays clean."
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
                            { label: 'Amount', value: detailModal.draft.amount || '—' },
                            { label: 'Status', value: detailModal.draft.status || 'Pending' },
                            {
                              label: 'Next Department',
                              value: detailModal.draft.destinationDepartment || 'Auto route',
                            },
                          ]
                        : detailModal.type === 'cashier_lab_payment' ||
                            detailModal.type === 'lab' ||
                            detailModal.type === 'doctor_lab'
                          ? [
                              { label: 'Test Name', value: detailModal.draft.testName || '—' },
                              { label: 'Payment', value: detailModal.draft.paymentStatus || 'Pending' },
                              { label: 'Lab Status', value: detailModal.draft.labStatus || 'Not started' },
                              { label: 'Result Status', value: detailModal.draft.resultStatus || 'Pending' },
                              { label: 'Current Progress', value: getLabProgressLabel(detailModal.draft) },
                            ]
                          : detailModal.type === 'treatment'
                            ? [
                                { label: 'Treatment Item', value: detailModal.draft.itemName || '—' },
                                { label: 'Route', value: detailModal.draft.route || '—' },
                                { label: 'Dose', value: detailModal.draft.dose || '—' },
                                { label: 'Instructions', value: detailModal.draft.instructions || '—' },
                                { label: 'Pharmacy Note', value: detailModal.draft.pharmacyNote || '—' },
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
                      list="queue-condition-catalog-options"
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
                        list="queue-diagnosis-catalog-options"
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
                      <input name="label" value={detailModal.draft.label || ''} onChange={handleDetailDraftChange} disabled />
                    </label>
                    <label className="form-field">
                      <span>Amount</span>
                      <input name="amount" value={detailModal.draft.amount || ''} onChange={handleDetailDraftChange} disabled />
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
                      <span>Next Department</span>
                      <input
                        name="destinationDepartment"
                        value={detailModal.draft.destinationDepartment || ''}
                        onChange={handleDetailDraftChange}
                        disabled
                      />
                    </label>
                  </>
                ) : null}

                {detailModal.type === 'cashier_lab_payment' ||
                detailModal.type === 'lab' ||
                detailModal.type === 'doctor_lab' ? (
                  <>
                    <label className="form-field">
                      <span>Test Name</span>
                      <input
                        list="queue-lab-catalog-options"
                        name="testName"
                        value={detailModal.draft.testName || ''}
                        onChange={handleDetailDraftChange}
                        disabled={detailModal.type !== 'doctor_lab'}
                        required
                      />
                    </label>
                    <label className="form-field">
                      <span>Payment</span>
                      {detailModal.type === 'cashier_lab_payment' ? (
                        <select
                          name="paymentStatus"
                          value={detailModal.draft.paymentStatus || 'Pending'}
                          onChange={handleDetailDraftChange}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Part paid">Part paid</option>
                          <option value="Paid">Paid</option>
                          <option value="Insurance pending">Insurance pending</option>
                        </select>
                      ) : (
                        <input name="paymentStatus" value={detailModal.draft.paymentStatus || 'Pending'} disabled />
                      )}
                    </label>
                    <label className="form-field">
                      <span>Lab Status</span>
                      {detailModal.type === 'lab' ? (
                        <select
                          name="labStatus"
                          value={detailModal.draft.labStatus || 'Not started'}
                          onChange={handleDetailDraftChange}
                        >
                          <option value="Not started">Not started</option>
                          <option value="Awaiting sample">Awaiting sample</option>
                          <option value="Sample collected">Sample collected</option>
                          <option value="In progress">In progress</option>
                          <option value="Completed">Completed</option>
                        </select>
                      ) : (
                        <input name="labStatus" value={detailModal.draft.labStatus || 'Not started'} disabled />
                      )}
                    </label>
                    <label className="form-field">
                      <span>Result Status</span>
                      {detailModal.type === 'lab' ? (
                        detailModal.draft.resultStatus === 'Reviewed' ? (
                          <input name="resultStatus" value={detailModal.draft.resultStatus} disabled />
                        ) : (
                          <select
                            name="resultStatus"
                            value={detailModal.draft.resultStatus || 'Pending'}
                            onChange={handleDetailDraftChange}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Ready">Ready</option>
                            <option value="Collected">Collected</option>
                          </select>
                        )
                      ) : detailModal.type === 'doctor_lab' && canDoctorMarkResultReviewed(detailModal.draft) ? (
                        <select
                          name="resultStatus"
                          value={detailModal.draft.resultStatus || 'Collected'}
                          onChange={handleDetailDraftChange}
                        >
                          <option value="Collected">Collected</option>
                          <option value="Reviewed">Reviewed</option>
                        </select>
                      ) : (
                        <input name="resultStatus" value={detailModal.draft.resultStatus || 'Pending'} disabled />
                      )}
                    </label>
                  </>
                ) : null}

                {detailModal.type === 'cashier_medication' ||
                detailModal.type === 'doctor_medication' ||
                detailModal.type === 'pharmacy_medication' ? (
                  <>
                    <label className="form-field">
                      <span>Medication</span>
                      <input
                        list="queue-medication-catalog-options"
                        name="medicationName"
                        value={detailModal.draft.medicationName || ''}
                        onChange={handleDetailDraftChange}
                        disabled={detailModal.type !== 'doctor_medication'}
                        required
                      />
                    </label>
                    <label className="form-field">
                      <span>Availability</span>
                      {detailModal.type === 'pharmacy_medication' ? (
                        <select
                          name="availabilityStatus"
                          value={detailModal.draft.availabilityStatus || 'Pending'}
                          onChange={handleDetailDraftChange}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Available">Available</option>
                          <option value="Partial">Partial</option>
                          <option value="Unavailable">Unavailable</option>
                        </select>
                      ) : (
                        <input name="availabilityStatus" value={detailModal.draft.availabilityStatus || 'Pending'} disabled />
                      )}
                    </label>
                    <label className="form-field">
                      <span>Invoice</span>
                      {detailModal.type === 'pharmacy_medication' ? (
                        <select
                          name="invoiceStatus"
                          value={detailModal.draft.invoiceStatus || 'Not issued'}
                          onChange={handleDetailDraftChange}
                        >
                          <option value="Not issued">Not issued</option>
                          <option value="Issued">Issued</option>
                          <option value="Part invoiced">Part invoiced</option>
                          <option value="Invoiced">Invoiced</option>
                        </select>
                      ) : (
                        <input name="invoiceStatus" value={detailModal.draft.invoiceStatus || 'Not issued'} disabled />
                      )}
                    </label>
                    <label className="form-field">
                      <span>Payment</span>
                      {detailModal.type === 'cashier_medication' ? (
                        <select
                          name="paymentStatus"
                          value={detailModal.draft.paymentStatus || 'Pending'}
                          onChange={handleDetailDraftChange}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Part paid">Part paid</option>
                          <option value="Paid">Paid</option>
                          <option value="Insurance pending">Insurance pending</option>
                        </select>
                      ) : (
                        <input name="paymentStatus" value={detailModal.draft.paymentStatus || 'Pending'} disabled />
                      )}
                    </label>
                    <label className="form-field">
                      <span>Dispense</span>
                      {detailModal.type === 'pharmacy_medication' ? (
                        <select
                          name="dispenseStatus"
                          value={detailModal.draft.dispenseStatus || 'Pending'}
                          onChange={handleDetailDraftChange}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Ready">Ready</option>
                          <option value="Part dispensed">Part dispensed</option>
                          <option value="Dispensed">Dispensed</option>
                        </select>
                      ) : (
                        <input name="dispenseStatus" value={detailModal.draft.dispenseStatus || 'Pending'} disabled />
                      )}
                    </label>
                  </>
                ) : null}

                {detailModal.type === 'treatment' ? (
                  <>
                    <label className="form-field">
                      <span>Treatment Item</span>
                      <input
                        list="queue-medication-catalog-options"
                        name="itemName"
                        value={detailModal.draft.itemName || ''}
                        onChange={handleDetailDraftChange}
                        required
                      />
                    </label>
                    <label className="form-field">
                      <span>Route</span>
                      <input name="route" value={detailModal.draft.route || ''} onChange={handleDetailDraftChange} />
                    </label>
                    <label className="form-field">
                      <span>Dose</span>
                      <input name="dose" value={detailModal.draft.dose || ''} onChange={handleDetailDraftChange} />
                    </label>
                    <label className="form-field form-field-full">
                      <span>Instructions</span>
                      <textarea
                        name="instructions"
                        rows="3"
                        value={detailModal.draft.instructions || ''}
                        onChange={handleDetailDraftChange}
                      />
                    </label>
                    <label className="form-field form-field-full">
                      <span>Pharmacy Note</span>
                      <textarea
                        name="pharmacyNote"
                        rows="3"
                        value={detailModal.draft.pharmacyNote || ''}
                        onChange={handleDetailDraftChange}
                      />
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

export default DepartmentsPage;
