const mongoose = require('mongoose');
const { createScopedModel } = require('./helpers/createScopedModel');

const timelineEventSchema = new mongoose.Schema(
  {
    stage: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
    },
    note: String,
    recordedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const prescriptionSchema = new mongoose.Schema(
  {
    medicationName: String,
    dosage: String,
    frequency: String,
    duration: String,
    status: {
      type: String,
      enum: ['Pending', 'Dispensed', 'Unavailable'],
      default: 'Pending',
    },
  },
  { _id: false }
);

const cashierItemSchema = new mongoose.Schema(
  {
    label: String,
    amount: String,
    status: {
      type: String,
      enum: ['Pending', 'Part paid', 'Paid', 'Insurance pending', 'Waived'],
      default: 'Pending',
    },
    destinationDepartment: String,
  },
  { _id: false }
);

const labOrderSchema = new mongoose.Schema(
  {
    testName: String,
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Part paid', 'Paid', 'Insurance pending'],
      default: 'Pending',
    },
    labStatus: {
      type: String,
      enum: ['Not started', 'Awaiting sample', 'Sample collected', 'In progress', 'Completed'],
      default: 'Not started',
    },
    resultStatus: {
      type: String,
      enum: ['Pending', 'Ready', 'Collected', 'Reviewed'],
      default: 'Pending',
    },
  },
  { _id: false }
);

const pharmacyItemSchema = new mongoose.Schema(
  {
    medicationName: String,
    availabilityStatus: {
      type: String,
      enum: ['Pending', 'Available', 'Partial', 'Unavailable'],
      default: 'Pending',
    },
    invoiceStatus: {
      type: String,
      enum: ['Not issued', 'Issued', 'Part invoiced', 'Invoiced'],
      default: 'Not issued',
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Part paid', 'Paid', 'Insurance pending'],
      default: 'Pending',
    },
    dispenseStatus: {
      type: String,
      enum: ['Pending', 'Ready', 'Part dispensed', 'Dispensed'],
      default: 'Pending',
    },
  },
  { _id: false }
);

const treatmentPlanSchema = new mongoose.Schema(
  {
    itemName: String,
    itemType: {
      type: String,
      enum: ['Medication', 'Infusion', 'Procedure', 'Other'],
      default: 'Medication',
    },
    route: String,
    dose: String,
    frequency: String,
    duration: String,
    instructions: String,
    startDay: {
      type: Number,
      default: 1,
    },
    endDay: {
      type: Number,
      default: 1,
    },
    morning: {
      type: Boolean,
      default: false,
    },
    afternoon: {
      type: Boolean,
      default: false,
    },
    evening: {
      type: Boolean,
      default: false,
    },
    night: {
      type: Boolean,
      default: false,
    },
    pharmacyNote: String,
  },
  { _id: false }
);

const visitSchema = new mongoose.Schema(
  {
    visitNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
    },
    patientName: {
      type: String,
      trim: true,
      required: true,
    },
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
    },
    branchName: {
      type: String,
      default: 'Main',
      trim: true,
    },
    department: {
      type: String,
      required: true,
    },
    clinician: String,
    assignedClinicianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    chiefComplaint: String,
    doctorNote: String,
    medicalConditions: {
      type: [String],
      default: [],
    },
    investigations: String,
    medicationSummary: String,
    diagnosis: String,
    diagnosisDetail: String,
    consultationFeeStatus: {
      type: String,
      enum: ['Pending', 'Part paid', 'Paid', 'Insurance pending', 'Waived'],
      default: 'Pending',
    },
    triageStatus: {
      type: String,
      enum: ['Pending', 'Completed', 'Skipped'],
      default: 'Pending',
    },
    consultationStatus: {
      type: String,
      enum: ['Pending', 'In progress', 'Completed'],
      default: 'Pending',
    },
    labStatus: {
      type: String,
      enum: ['Not requested', 'Requested', 'In progress', 'Completed'],
      default: 'Not requested',
    },
    radiologyStatus: {
      type: String,
      enum: ['Not requested', 'Requested', 'In progress', 'Completed'],
      default: 'Not requested',
    },
    pharmacyStatus: {
      type: String,
      enum: ['Pending', 'Ready', 'Dispensed'],
      default: 'Pending',
    },
    doctorReviewStatus: {
      type: String,
      enum: ['Pending', 'Awaiting results', 'Review required', 'Completed'],
      default: 'Pending',
    },
    billingStatus: {
      type: String,
      enum: ['Pending', 'Part paid', 'Paid', 'Waived'],
      default: 'Pending',
    },
    visitStatus: {
      type: String,
      enum: ['Checked in', 'In triage', 'With doctor', 'At lab', 'At radiology', 'At pharmacy', 'At cashier', 'Closed'],
      default: 'Checked in',
    },
    cashierItems: [cashierItemSchema],
    labOrders: [labOrderSchema],
    pharmacyItems: [pharmacyItemSchema],
    treatmentPlans: [treatmentPlanSchema],
    timeline: [timelineEventSchema],
    prescriptions: [prescriptionSchema],
    closedAt: Date,
  },
  {
    timestamps: true,
  }
);

module.exports = createScopedModel('Visit', visitSchema);
