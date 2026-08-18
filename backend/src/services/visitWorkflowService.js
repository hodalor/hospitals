const normalizeArray = (items) => (Array.isArray(items) ? items.filter(Boolean) : []);

const hasPendingCashierStatus = (status) =>
  ['Pending', 'Part paid', 'Insurance pending'].includes(status);

const hasSettledCashierStatus = (status) => ['Paid', 'Waived'].includes(status);

const isLabOrderReadyForProcessing = (item) =>
  hasSettledCashierStatus(item.paymentStatus) &&
  (
    item.labStatus !== 'Completed' ||
    ['Pending', 'Ready'].includes(item.resultStatus)
  );

const hasReviewableLabResult = (item) =>
  item.labStatus === 'Completed' && ['Ready', 'Collected'].includes(item.resultStatus);

const hasDoctorTrackedLabWork = (labOrders) =>
  normalizeArray(labOrders).some(
    (item) => hasSettledCashierStatus(item.paymentStatus) && item.resultStatus !== 'Reviewed'
  );

const hasPendingCashierWork = (visit) =>
  hasPendingCashierStatus(visit.consultationFeeStatus) ||
  visit.cashierItems.some((item) => hasPendingCashierStatus(item.status)) ||
  visit.labOrders.some((item) => hasPendingCashierStatus(item.paymentStatus)) ||
  visit.pharmacyItems.some(
    (item) =>
      ['Issued', 'Part invoiced', 'Invoiced'].includes(item.invoiceStatus) &&
      hasPendingCashierStatus(item.paymentStatus)
  );

const hasActivePharmacyWork = (pharmacyItems) =>
  normalizeArray(pharmacyItems).some(
    (item) =>
      item.medicationName &&
      (
        ['Pending', 'Available', 'Partial', 'Unavailable'].includes(item.availabilityStatus) ||
        ['Not issued', 'Issued', 'Part invoiced', 'Invoiced'].includes(item.invoiceStatus) ||
        ['Pending', 'Part paid', 'Insurance pending'].includes(item.paymentStatus) ||
        ['Pending', 'Ready', 'Part dispensed'].includes(item.dispenseStatus)
      )
  );

const getQueueEntryState = (visit, queueKey) => {
  if (queueKey === 'cashier') {
    const hasOnlyFrontDeskBilling =
      hasPendingCashierStatus(visit.consultationFeeStatus) &&
      !visit.cashierItems.some((item) => hasPendingCashierStatus(item.status)) &&
      !visit.labOrders.some((item) => hasPendingCashierStatus(item.paymentStatus)) &&
      !visit.pharmacyItems.some((item) => hasPendingCashierStatus(item.paymentStatus));

    return hasOnlyFrontDeskBilling ? 'new' : 'followup';
  }

  if (queueKey === 'doctor') {
    const hasDoctorStartedWork =
      visit.consultationStatus !== 'Pending' ||
      visit.doctorReviewStatus !== 'Pending' ||
      Boolean(visit.diagnosis) ||
      Boolean(visit.diagnosisDetail) ||
      Boolean(visit.doctorNote) ||
      normalizeArray(visit.medicalConditions).length > 0 ||
      normalizeArray(visit.labOrders).length > 0 ||
      normalizeArray(visit.pharmacyItems).length > 0;

    return hasDoctorStartedWork ? 'followup' : 'new';
  }

  if (queueKey === 'lab') {
    const hasStartedLabProcessing = visit.labOrders.some(
      (item) => ['In progress', 'Completed'].includes(item.labStatus) || item.resultStatus !== 'Pending'
    );

    return hasStartedLabProcessing ? 'followup' : 'new';
  }

  if (queueKey === 'pharmacy') {
    const hasStartedPharmacyWork = visit.pharmacyItems.some(
      (item) =>
        item.availabilityStatus !== 'Pending' ||
        item.invoiceStatus !== 'Not issued' ||
        item.dispenseStatus !== 'Pending'
    );

    return hasStartedPharmacyWork ? 'followup' : 'new';
  }

  return 'followup';
};

const getQueueEntryLabel = (queueEntryState) =>
  queueEntryState === 'new' ? 'New arrival' : 'Follow-up / return';

const deriveBillingStatus = ({ consultationFeeStatus, cashierItems, labOrders, pharmacyItems }) => {
  const paymentStatuses = [
    consultationFeeStatus,
    ...cashierItems.map((item) => item.status),
    ...labOrders.map((item) => item.paymentStatus),
    ...pharmacyItems.map((item) => item.paymentStatus),
  ].filter(Boolean);

  if (!paymentStatuses.length) {
    return 'Pending';
  }

  if (paymentStatuses.some((status) => status === 'Part paid')) {
    return 'Part paid';
  }

  if (paymentStatuses.every((status) => hasSettledCashierStatus(status))) {
    return 'Paid';
  }

  return 'Pending';
};

const deriveVisitStage = ({
  triageStatus,
  consultationFeeStatus,
  consultationStatus,
  doctorReviewStatus,
  cashierItems,
  labOrders,
  pharmacyItems,
  closeVisit,
}) => {
  if (closeVisit) {
    return 'Closed';
  }

  if (hasPendingCashierStatus(consultationFeeStatus)) {
    return 'At cashier';
  }

  if (cashierItems.some((item) => hasPendingCashierStatus(item.status))) {
    return 'At cashier';
  }

  if (labOrders.some((item) => hasPendingCashierStatus(item.paymentStatus))) {
    return 'At cashier';
  }

  if (
    pharmacyItems.some(
      (item) =>
        ['Issued', 'Part invoiced', 'Invoiced'].includes(item.invoiceStatus) &&
        hasPendingCashierStatus(item.paymentStatus)
    )
  ) {
    return 'At cashier';
  }

  if (triageStatus === 'Pending') {
    return 'In triage';
  }

  if (labOrders.some((item) => isLabOrderReadyForProcessing(item))) {
    return 'At lab';
  }

  if (
    labOrders.some((item) => ['Completed'].includes(item.labStatus)) &&
    labOrders.some((item) => ['Collected', 'Reviewed'].includes(item.resultStatus))
  ) {
    return 'With doctor';
  }

  if (
    pharmacyItems.some((item) =>
      ['Available', 'Partial'].includes(item.availabilityStatus) &&
      ['Paid'].includes(item.paymentStatus) &&
      ['Pending', 'Ready', 'Part dispensed'].includes(item.dispenseStatus)
    )
  ) {
    return 'At pharmacy';
  }

  if (
    doctorReviewStatus === 'Review required' ||
    doctorReviewStatus === 'Awaiting results' ||
    consultationStatus !== 'Completed'
  ) {
    return 'With doctor';
  }

  if (
    consultationStatus === 'Completed' &&
    doctorReviewStatus === 'Completed' &&
    !cashierItems.some((item) => hasPendingCashierStatus(item.status)) &&
    !labOrders.some((item) => hasPendingCashierStatus(item.paymentStatus)) &&
    !pharmacyItems.some((item) => hasPendingCashierStatus(item.paymentStatus)) &&
    !pharmacyItems.some((item) => ['Pending', 'Ready', 'Part dispensed'].includes(item.dispenseStatus))
  ) {
    return 'Closed';
  }

  return 'Checked in';
};

const getQueueKeys = (visit) => {
  const queueKeys = [];

  if (hasPendingCashierWork(visit)) {
    queueKeys.push('cashier');
  }

  if (hasActivePharmacyWork(visit.pharmacyItems)) {
    queueKeys.push('pharmacy');
  }

  if (visit.labOrders.some((item) => isLabOrderReadyForProcessing(item))) {
    queueKeys.push('lab');
  }

  if (
    visit.visitStatus === 'With doctor' ||
    visit.consultationStatus !== 'Completed' ||
    visit.doctorReviewStatus === 'Awaiting results' ||
    visit.doctorReviewStatus === 'Review required' ||
    visit.labOrders.some((item) => hasReviewableLabResult(item)) ||
    hasDoctorTrackedLabWork(visit.labOrders)
  ) {
    queueKeys.push('doctor');
  }

  return Array.from(new Set(queueKeys));
};

const getQueueTask = (visit, queueKey) => {
  if (queueKey === 'cashier') {
    if (hasPendingCashierStatus(visit.consultationFeeStatus)) {
      return 'Collect consultation payment';
    }

    if (visit.cashierItems.some((item) => hasPendingCashierStatus(item.status))) {
      return 'Clear requested service charges';
    }

    if (visit.labOrders.some((item) => hasPendingCashierStatus(item.paymentStatus))) {
      return 'Receive lab payment';
    }

    if (
      visit.pharmacyItems.some(
        (item) =>
          ['Issued', 'Part invoiced', 'Invoiced'].includes(item.invoiceStatus) &&
          hasPendingCashierStatus(item.paymentStatus)
      )
    ) {
      return 'Receive medication payment';
    }

    return 'Review outstanding billing';
  }

  if (queueKey === 'doctor') {
    if (visit.labOrders.some((item) => ['Ready', 'Collected'].includes(item.resultStatus))) {
      return 'Review available lab results';
    }

    if (visit.consultationStatus !== 'Completed') {
      return 'Complete consultation';
    }

    if (visit.doctorReviewStatus === 'Awaiting results') {
      return 'Track pending lab results';
    }

    if (hasDoctorTrackedLabWork(visit.labOrders)) {
      return 'Track pending lab results';
    }

    if (visit.doctorReviewStatus === 'Review required') {
      return 'Review returned results';
    }

    if (!visit.labOrders.length && !visit.pharmacyItems.length) {
      return 'Decide on tests or medication';
    }

    return 'Finalize doctor plan';
  }

  if (queueKey === 'lab') {
    if (
      visit.labOrders.some(
        (item) =>
          hasSettledCashierStatus(item.paymentStatus) &&
          ['Not started', 'Awaiting sample'].includes(item.labStatus)
      )
    ) {
      return 'Collect sample';
    }

    if (visit.labOrders.some((item) => item.labStatus === 'In progress')) {
      return 'Process requested tests';
    }

    if (visit.labOrders.some((item) => item.resultStatus === 'Pending')) {
      return 'Prepare results';
    }

    return 'Release results to doctor';
  }

  if (queueKey === 'pharmacy') {
    if (visit.pharmacyItems.some((item) => item.availabilityStatus === 'Pending')) {
      return 'Confirm stock availability';
    }

    if (visit.pharmacyItems.some((item) => ['Not issued', 'Part invoiced'].includes(item.invoiceStatus))) {
      return 'Issue medication invoice';
    }

    if (
      visit.pharmacyItems.some(
        (item) =>
          ['Issued', 'Invoiced'].includes(item.invoiceStatus) &&
          hasPendingCashierStatus(item.paymentStatus)
      )
    ) {
      return 'Await cashier payment';
    }

    if (visit.pharmacyItems.some((item) => ['Pending', 'Ready', 'Part dispensed'].includes(item.dispenseStatus))) {
      return 'Dispense cleared medication';
    }

    return 'Complete pharmacy handoff';
  }

  return 'Monitor visit';
};

const serializeVisit = (visit) => {
  const derivedStage = deriveVisitStage({
    triageStatus: visit.triageStatus || visit.triage,
    consultationFeeStatus: visit.consultationFeeStatus || 'Pending',
    consultationStatus: visit.consultationStatus || 'Pending',
    doctorReviewStatus: visit.doctorReviewStatus || 'Pending',
    cashierItems: normalizeArray(visit.cashierItems),
    labOrders: normalizeArray(visit.labOrders),
    pharmacyItems: normalizeArray(visit.pharmacyItems),
    closeVisit: visit.visitStatus === 'Closed' || visit.stage === 'Closed' || Boolean(visit.closedAt),
  });

  const normalizedVisit = {
    id: visit._id || visit.id,
    visitNo: visit.visitNumber || visit.visitNo,
    patient: visit.patient?.firstName
      ? `${visit.patient.firstName} ${visit.patient.lastName}`.trim()
      : visit.patientName || visit.patient,
    patientDbId: visit.patient?._id || visit.patientDbId || visit.patient || '',
    branchName: visit.branchName || '',
    department: visit.department,
    clinician: visit.assignedClinicianId?.fullName || visit.clinician || '',
    assignedClinicianId: visit.assignedClinicianId?._id || visit.assignedClinicianId || '',
    stage: derivedStage,
    triage: visit.triageStatus || visit.triage,
    chiefComplaint: visit.chiefComplaint || '',
    doctorNote: visit.doctorNote || '',
    diagnosis: visit.diagnosis || '',
    diagnosisDetail: visit.diagnosisDetail || '',
    medicalConditions: normalizeArray(visit.medicalConditions),
    investigations: visit.investigations || visit.labStatus || '',
    medication: visit.medicationSummary || visit.pharmacyStatus || '',
    billing: visit.billingStatus || visit.billing || 'Pending',
    consultationFeeStatus: visit.consultationFeeStatus || 'Pending',
    consultationStatus: visit.consultationStatus || 'Pending',
    doctorReviewStatus: visit.doctorReviewStatus || 'Pending',
    cashierItems: normalizeArray(visit.cashierItems),
    labOrders: normalizeArray(visit.labOrders),
    pharmacyItems: normalizeArray(visit.pharmacyItems),
    treatmentPlans: normalizeArray(visit.treatmentPlans),
    createdAt: visit.createdAt,
    closedAt: visit.closedAt,
    timeline: normalizeArray(visit.timeline).map((entry) => ({
      department: entry.stage || entry.department,
      status: entry.status,
      note: entry.note || '',
      recordedAt: entry.recordedAt,
    })),
  };

  return {
    ...normalizedVisit,
    queue: null,
    queueTask: '',
  };
};

const buildQueueSnapshot = (visits) => {
  const queueOrder = ['cashier', 'doctor', 'lab', 'pharmacy'];
  const queueLabels = {
    cashier: 'Cashier',
    doctor: 'Doctor',
    lab: 'Laboratory',
    pharmacy: 'Pharmacy',
  };

  const queues = {
    cashier: [],
    doctor: [],
    lab: [],
    pharmacy: [],
  };

  visits.map(serializeVisit).forEach((visit) => {
    getQueueKeys({
      visitStatus: visit.stage,
      consultationFeeStatus: visit.consultationFeeStatus,
      consultationStatus: visit.consultationStatus,
      doctorReviewStatus: visit.doctorReviewStatus,
      cashierItems: visit.cashierItems,
      labOrders: visit.labOrders,
      pharmacyItems: visit.pharmacyItems,
    }).forEach((queueKey) => {
      const queueEntryState = getQueueEntryState(visit, queueKey);
      queues[queueKey].push({
        ...visit,
        queue: queueKey,
        queueEntryState,
        queueEntryLabel: getQueueEntryLabel(queueEntryState),
        queueTask: getQueueTask(visit, queueKey),
      });
    });
  });

  const summaryCards = queueOrder.map((queueKey) => ({
    label: `${queueLabels[queueKey]} Queue`,
    value: queues[queueKey].length,
  }));

  const queueChart = queueOrder.map((queueKey) => ({
    name: queueLabels[queueKey],
    value: queues[queueKey].length,
  }));

  return {
    summaryCards,
    queueChart,
    queues,
  };
};

module.exports = {
  normalizeArray,
  hasPendingCashierStatus,
  hasSettledCashierStatus,
  isLabOrderReadyForProcessing,
  hasPendingCashierWork,
  hasActivePharmacyWork,
  deriveBillingStatus,
  deriveVisitStage,
  serializeVisit,
  buildQueueSnapshot,
};
