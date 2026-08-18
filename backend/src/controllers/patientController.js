const Patient = require('../models/Patient');
const Visit = require('../models/Visit');
const { asyncHandler } = require('../utils/asyncHandler');
const { resolveBranchAccess } = require('../utils/branchScope');
const { MAIN_BRANCH_NAME } = require('../services/branchService');

const generatePatientNumber = () => `PT-${Date.now().toString().slice(-8)}`;

const serializeEmergencyContacts = (patient) => {
  const contacts = Array.isArray(patient.emergencyContacts)
    ? patient.emergencyContacts
        .map((contact) => ({
          name: contact.name || '',
          phone: contact.phone || '',
          email: contact.email || '',
          relationship: contact.relationship || '',
        }))
        .filter((contact) => contact.name || contact.phone || contact.email || contact.relationship)
    : [];

  if (contacts.length) {
    return contacts;
  }

  const legacyName = patient.contact?.emergencyContactName || '';
  const legacyPhone = patient.contact?.emergencyContactPhone || '';

  return legacyName || legacyPhone
    ? [
        {
          name: legacyName,
          phone: legacyPhone,
          email: '',
          relationship: '',
        },
      ]
    : [];
};

const normalizeEmergencyContacts = (contacts = []) =>
  (Array.isArray(contacts) ? contacts : [])
    .map((contact) => ({
      name: String(contact?.name || '').trim(),
      phone: String(contact?.phone || '').trim(),
      email: String(contact?.email || '').trim(),
      relationship: String(contact?.relationship || '').trim(),
    }))
    .filter((contact) => contact.name || contact.phone || contact.email || contact.relationship);

const validateEmergencyContacts = (contacts) => {
  if (!contacts.length) {
    throw new Error('At least one emergency contact is required.');
  }

  contacts.forEach((contact, index) => {
    if (!contact.name || !contact.phone || !contact.relationship) {
      throw new Error(
        `Emergency contact ${index + 1} must include name, phone, and relationship.`
      );
    }
  });
};

const serializePatient = (patient) => ({
  id: patient._id,
  patientId: patient.patientNumber,
  name: `${patient.firstName || ''} ${patient.lastName || ''}`.trim(),
  age: patient.age || '',
  gender: patient.gender,
  phone: patient.contact?.phone || '',
  department: patient.currentDepartment || '',
  createdBranchName: patient.createdBranchName || MAIN_BRANCH_NAME,
  lastVisit: patient.lastVisit ? new Date(patient.lastVisit).toISOString().slice(0, 10) : '',
  dob: patient.dateOfBirth ? new Date(patient.dateOfBirth).toISOString().slice(0, 10) : '',
  idCardType: patient.idCardType || '',
  idNumber: patient.idNumber || '',
  idFrontImage: patient.idFrontImage || '',
  idBackImage: patient.idBackImage || '',
  profilePhoto: patient.profilePhoto || '',
  visitReason: patient.visitReason || '',
  status: patient.currentStatus || 'Checked in',
  emergencyContacts: serializeEmergencyContacts(patient),
});

const serializeVisitHistoryItem = (visit) => ({
  id: visit._id,
  visitNo: visit.visitNumber,
  visitDate: visit.createdAt ? new Date(visit.createdAt).toISOString().slice(0, 10) : '',
  closedAt: visit.closedAt ? new Date(visit.closedAt).toISOString().slice(0, 10) : '',
  department: visit.department || '',
  clinician:
    visit.assignedClinicianId?.fullName || visit.clinician || '',
  stage: visit.visitStatus || '',
  chiefComplaint: visit.chiefComplaint || '',
  diagnosis: [visit.diagnosis || '', visit.diagnosisDetail || ''].filter(Boolean).join(' - '),
  diagnosisDetail: visit.diagnosisDetail || '',
  doctorNote: visit.doctorNote || '',
  medicalConditions: Array.isArray(visit.medicalConditions) ? visit.medicalConditions : [],
  investigations: visit.investigations || '',
  medicationsGiven: Array.isArray(visit.pharmacyItems)
    ? visit.pharmacyItems
        .map((item) => item.medicationName)
        .filter(Boolean)
    : [],
  branchName: visit.branchName || '',
});

const toPatientPayload = (payload) => {
  const [firstName = '', ...restName] = (payload.name || '').trim().split(/\s+/);
  const lastName = restName.join(' ') || 'Patient';
  const emergencyContacts = normalizeEmergencyContacts(payload.emergencyContacts);

  validateEmergencyContacts(emergencyContacts);

  return {
    patientNumber: payload.patientId || generatePatientNumber(),
    firstName,
    lastName,
    age: payload.age,
    gender: payload.gender,
    dateOfBirth: payload.dob || undefined,
    idCardType: payload.idCardType,
    idNumber: payload.idNumber,
    idFrontImage: payload.idFrontImage,
    idBackImage: payload.idBackImage,
    profilePhoto: payload.profilePhoto,
    contact: {
      phone: payload.phone,
    },
    emergencyContacts,
    currentDepartment: payload.department,
    createdBranchName: payload.createdBranchName || MAIN_BRANCH_NAME,
    lastVisit: payload.lastVisit || undefined,
    visitReason: payload.visitReason,
    currentStatus: payload.status,
  };
};

const getPatients = asyncHandler(async (req, res) => {
  const patients = await Patient.find().sort({ createdAt: -1 });
  res.json({ success: true, data: patients.map(serializePatient) });
});

const getPatientProfile = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.params.id);

  if (!patient) {
    res.status(404);
    throw new Error('Patient not found');
  }

  const visits = await Visit.find({ patient: patient._id })
    .populate('assignedClinicianId', 'fullName role department')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: {
      patient: serializePatient(patient),
      visitHistory: visits.map(serializeVisitHistoryItem),
    },
  });
});

const searchPatients = asyncHandler(async (req, res) => {
  const query = String(req.query.q || '').trim();

  if (!query) {
    return res.json({ success: true, data: [] });
  }

  const patients = await Patient.find({
    $or: [
      { patientNumber: { $regex: query, $options: 'i' } },
      { idNumber: { $regex: query, $options: 'i' } },
      { 'contact.phone': { $regex: query, $options: 'i' } },
      { firstName: { $regex: query, $options: 'i' } },
      { lastName: { $regex: query, $options: 'i' } },
    ],
  })
    .sort({ createdAt: -1 })
    .limit(8);

  res.json({ success: true, data: patients.map(serializePatient) });
});

const createPatient = asyncHandler(async (req, res) => {
  const branchAccess = resolveBranchAccess(req, req.body?.createdBranchName || '');

  const patient = await Patient.create(
    toPatientPayload({
      ...req.body,
      createdBranchName: branchAccess.branchName || req.activeUser?.branchName || MAIN_BRANCH_NAME,
    })
  );
  res.status(201).json({ success: true, data: serializePatient(patient) });
});

const updatePatient = asyncHandler(async (req, res) => {
  const patient = await Patient.findByIdAndUpdate(req.params.id, toPatientPayload(req.body), {
    new: true,
    runValidators: true,
  });

  if (!patient) {
    res.status(404);
    throw new Error('Patient not found');
  }

  res.json({ success: true, data: serializePatient(patient) });
});

module.exports = {
  getPatients,
  getPatientProfile,
  searchPatients,
  createPatient,
  updatePatient,
};
