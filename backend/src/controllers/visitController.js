const Patient = require('../models/Patient');
const Visit = require('../models/Visit');
const {
  buildQueueSnapshot,
  deriveBillingStatus,
  deriveVisitStage,
  normalizeArray,
  serializeVisit,
} = require('../services/visitWorkflowService');
const { asyncHandler } = require('../utils/asyncHandler');
const { applyBranchScope, buildBranchFilter } = require('../utils/branchScope');
const { MAIN_BRANCH_NAME } = require('../services/branchService');

const generateVisitNumber = () =>
  `VS-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;

const normalizeMedicalConditions = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const syncPatientFromVisit = async (visit) => {
  if (!visit.patient) {
    return;
  }

  await Patient.findByIdAndUpdate(visit.patient, {
    currentDepartment: visit.visitStatus === 'Closed' ? '' : visit.department,
    lastVisit: visit.updatedAt || new Date(),
    visitReason: visit.chiefComplaint || visit.diagnosis || '',
    currentStatus: visit.visitStatus === 'Closed' ? 'Completed' : visit.visitStatus,
  });
};

const toVisitPayload = (payload, existingVisit) => {
  const cashierItems = normalizeArray(payload.cashierItems);
  const labOrders = normalizeArray(payload.labOrders);
  const pharmacyItems = normalizeArray(payload.pharmacyItems);
  const treatmentPlans = normalizeArray(payload.treatmentPlans);

  const derivedStage = deriveVisitStage({
    triageStatus: payload.triage,
    consultationFeeStatus: payload.consultationFeeStatus,
    consultationStatus: payload.consultationStatus,
    doctorReviewStatus: payload.doctorReviewStatus,
    cashierItems,
    labOrders,
    pharmacyItems,
    closeVisit: payload.closeVisit,
  });

  const timeline = normalizeArray(existingVisit?.timeline);

  if (!timeline.length) {
    timeline.push({
      stage: 'Reception',
      status: 'Checked in',
      note: 'Patient visit opened at reception',
      recordedAt: new Date(),
    });
  }

  const previousStage = existingVisit?.visitStatus;

  if (previousStage !== derivedStage) {
    timeline.push({
      stage: derivedStage,
      status: 'Moved',
      note: `Visit routed to ${derivedStage}`,
      recordedAt: new Date(),
    });
  }

  return {
    visitNumber: payload.visitNo || existingVisit?.visitNumber || generateVisitNumber(),
    patient: payload.patientDbId || undefined,
    patientName: payload.patient,
    department: payload.department,
    branchName: payload.branchName || existingVisit?.branchName || MAIN_BRANCH_NAME,
    clinician: payload.clinician,
    assignedClinicianId: payload.assignedClinicianId || undefined,
    chiefComplaint: payload.chiefComplaint || '',
    doctorNote: payload.doctorNote || '',
    diagnosis: payload.diagnosis || '',
    diagnosisDetail: payload.diagnosisDetail || '',
    medicalConditions: normalizeMedicalConditions(payload.medicalConditions),
    visitStatus: derivedStage,
    triageStatus: payload.triage,
    consultationFeeStatus: payload.consultationFeeStatus,
    consultationStatus: payload.consultationStatus,
    doctorReviewStatus: payload.doctorReviewStatus,
    investigations: payload.investigations,
    medicationSummary: payload.medication,
    cashierItems,
    labOrders,
    pharmacyItems,
    treatmentPlans,
    billingStatus: deriveBillingStatus({
      consultationFeeStatus: payload.consultationFeeStatus,
      cashierItems,
      labOrders,
      pharmacyItems,
    }),
    timeline,
    closedAt: derivedStage === 'Closed' ? new Date() : undefined,
  };
};

const getVisits = asyncHandler(async (req, res) => {
  const visits = await Visit.find(buildBranchFilter(req))
    .populate('patient', 'patientNumber firstName lastName')
    .populate('assignedClinicianId', 'fullName role department')
    .populate('appointment', 'appointmentDate status')
    .sort({ createdAt: -1 });

  res.json({ success: true, data: visits.map(serializeVisit) });
});

const getVisitQueues = asyncHandler(async (req, res) => {
  const visits = await Visit.find({
    visitStatus: { $ne: 'Closed' },
    ...buildBranchFilter(req),
  })
    .populate('patient', 'patientNumber firstName lastName')
    .populate('assignedClinicianId', 'fullName role department')
    .sort({ updatedAt: -1 });

  res.json({ success: true, data: buildQueueSnapshot(visits) });
});

const createVisit = asyncHandler(async (req, res) => {
  if (!req.body.patientDbId) {
    res.status(400);
    throw new Error('Select an existing patient before opening a visit');
  }

  const activeVisit = await Visit.findOne({
    patient: req.body.patientDbId,
    visitStatus: { $ne: 'Closed' },
  });

  if (activeVisit) {
    res.status(400);
    throw new Error('This patient already has an active visit. Close it before opening another visit.');
  }

  const visit = await Visit.create(
    toVisitPayload(
      applyBranchScope(req, {
        ...req.body,
        branchName: req.body.branchName || req.activeUser?.branchName || MAIN_BRANCH_NAME,
      })
    )
  );
  await syncPatientFromVisit(visit);
  const populatedVisit = await Visit.findById(visit._id)
    .populate('patient', 'patientNumber firstName lastName')
    .populate('assignedClinicianId', 'fullName role department');

  res.status(201).json({ success: true, data: serializeVisit(populatedVisit) });
});

const updateVisit = asyncHandler(async (req, res) => {
  const visit = await Visit.findOne({
    _id: req.params.id,
    ...buildBranchFilter(req, 'branchName', ''),
  });

  if (!visit) {
    res.status(404);
    throw new Error('Visit not found');
  }

  Object.assign(visit, toVisitPayload(req.body, visit));
  await visit.save();
  await syncPatientFromVisit(visit);

  const populatedVisit = await Visit.findById(req.params.id)
    .populate('patient', 'patientNumber firstName lastName')
    .populate('assignedClinicianId', 'fullName role department');

  res.json({ success: true, data: serializeVisit(populatedVisit) });
});

module.exports = {
  getVisits,
  getVisitQueues,
  createVisit,
  updateVisit,
};
