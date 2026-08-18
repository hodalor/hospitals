const mongoose = require('mongoose');
const { createScopedModel } = require('./helpers/createScopedModel');

const prescriptionSchema = new mongoose.Schema(
  {
    prescriptionNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
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
    medicationCount: {
      type: String,
      required: true,
    },
    stockCheck: {
      type: String,
      enum: ['Available', '1 substitute needed', 'Unavailable'],
      default: 'Available',
    },
    paymentState: {
      type: String,
      enum: ['Verified', 'Awaiting cashier', 'Emergency override', 'Pending'],
      default: 'Pending',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = createScopedModel('Prescription', prescriptionSchema);
