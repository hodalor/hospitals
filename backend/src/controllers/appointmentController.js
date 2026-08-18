const Appointment = require('../models/Appointment');
const { asyncHandler } = require('../utils/asyncHandler');
const { applyBranchScope, buildBranchFilter } = require('../utils/branchScope');
const { MAIN_BRANCH_NAME } = require('../services/branchService');

const serializeAppointment = (appointment) => ({
  id: appointment._id,
  time: appointment.appointmentDate
    ? new Date(appointment.appointmentDate).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    : '',
  appointmentDate: appointment.appointmentDate
    ? new Date(appointment.appointmentDate).toISOString().slice(0, 16)
    : '',
  patient: appointment.patient?.firstName
    ? `${appointment.patient.firstName} ${appointment.patient.lastName}`.trim()
    : appointment.patientName,
  patientDbId: appointment.patient?._id || '',
  patientId: appointment.patient?.patientNumber || '',
  clinician: appointment.assignedClinicianId?.fullName || appointment.clinician || '',
  assignedClinicianId: appointment.assignedClinicianId?._id || '',
  department: appointment.department,
  shift: appointment.shift || 'Day',
  visitType: appointment.visitType,
  status: appointment.status,
  notes: appointment.notes || '',
  branchName: appointment.branchName || '',
});

const toAppointmentPayload = (payload) => ({
  patient: payload.patientDbId || undefined,
  patientName: payload.patient,
  branchName: payload.branchName || MAIN_BRANCH_NAME,
  department: payload.department,
  clinician: payload.clinician,
  assignedClinicianId: payload.assignedClinicianId || undefined,
  appointmentDate: payload.appointmentDate || new Date().toISOString(),
  shift: payload.shift || 'Day',
  visitType: payload.visitType,
  status: payload.status,
  notes: payload.notes,
});

const getAppointments = asyncHandler(async (req, res) => {
  const appointments = await Appointment.find(buildBranchFilter(req))
    .populate('patient', 'patientNumber firstName lastName')
    .populate('assignedClinicianId', 'fullName role department')
    .sort({ appointmentDate: 1 });

  res.json({ success: true, data: appointments.map(serializeAppointment) });
});

const createAppointment = asyncHandler(async (req, res) => {
  const appointment = await Appointment.create(
    toAppointmentPayload(
      applyBranchScope(req, {
        ...req.body,
        branchName: req.body.branchName || req.activeUser?.branchName || MAIN_BRANCH_NAME,
      })
    )
  );
  const populatedAppointment = await Appointment.findById(appointment._id)
    .populate('patient', 'patientNumber firstName lastName')
    .populate('assignedClinicianId', 'fullName role department');
  res.status(201).json({ success: true, data: serializeAppointment(populatedAppointment) });
});

const updateAppointment = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findOneAndUpdate(
    {
      _id: req.params.id,
      ...buildBranchFilter(req, 'branchName', ''),
    },
    toAppointmentPayload(
      applyBranchScope(req, {
        ...req.body,
        branchName: req.body.branchName || req.activeUser?.branchName || MAIN_BRANCH_NAME,
      })
    ),
    {
      new: true,
      runValidators: true,
    }
  )
    .populate('patient', 'patientNumber firstName lastName')
    .populate('assignedClinicianId', 'fullName role department');

  if (!appointment) {
    res.status(404);
    throw new Error('Appointment not found');
  }

  res.json({ success: true, data: serializeAppointment(appointment) });
});

module.exports = {
  getAppointments,
  createAppointment,
  updateAppointment,
};
