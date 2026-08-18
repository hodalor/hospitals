const mongoose = require('mongoose');
const { createScopedModel } = require('./helpers/createScopedModel');

const appointmentSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
    },
    patientName: {
      type: String,
      required: true,
      trim: true,
    },
    branchName: {
      type: String,
      default: 'Main',
      trim: true,
    },
    department: {
      type: String,
      required: true,
      trim: true,
    },
    clinician: {
      type: String,
      trim: true,
    },
    assignedClinicianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    appointmentDate: {
      type: Date,
      required: true,
    },
    shift: {
      type: String,
      enum: ['Day', 'Night'],
      default: 'Day',
    },
    visitType: {
      type: String,
      enum: ['New patient', 'Follow-up', 'Walk-in', 'Review', 'Urgent'],
      default: 'Walk-in',
    },
    status: {
      type: String,
      enum: [
        'Booked',
        'Checked in',
        'With nurse',
        'Waiting for doctor',
        'With doctor',
        'Awaiting results',
        'Review ongoing',
        'On treatment',
        'Completed',
        'Cancelled',
      ],
      default: 'Booked',
    },
    notes: String,
  },
  {
    timestamps: true,
  }
);

module.exports = createScopedModel('Appointment', appointmentSchema);
