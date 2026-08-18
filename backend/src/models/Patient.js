const mongoose = require('mongoose');
const { createScopedModel } = require('./helpers/createScopedModel');

const emergencyContactSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
    },
    relationship: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const contactSchema = new mongoose.Schema(
  {
    phone: String,
    email: String,
    address: String,
    emergencyContactName: String,
    emergencyContactPhone: String,
  },
  { _id: false }
);

const patientSchema = new mongoose.Schema(
  {
    patientNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
      required: true,
    },
    age: String,
    dateOfBirth: Date,
    idCardType: String,
    idNumber: String,
    idFrontImage: String,
    idBackImage: String,
    profilePhoto: String,
    bloodGroup: String,
    maritalStatus: String,
    occupation: String,
    contact: contactSchema,
    emergencyContacts: [emergencyContactSchema],
    currentDepartment: String,
    createdBranchName: {
      type: String,
      default: 'Main',
      trim: true,
    },
    lastVisit: Date,
    visitReason: String,
    currentStatus: {
      type: String,
      default: 'Checked in',
    },
    insuranceProvider: String,
    insuranceNumber: String,
    allergies: [String],
    chronicConditions: [String],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

patientSchema.virtual('fullName').get(function fullName() {
  return `${this.firstName} ${this.lastName}`.trim();
});

module.exports = createScopedModel('Patient', patientSchema);
