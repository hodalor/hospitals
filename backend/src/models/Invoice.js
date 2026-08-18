const mongoose = require('mongoose');
const { createScopedModel } = require('./helpers/createScopedModel');

const invoiceItemSchema = new mongoose.Schema(
  {
    itemName: {
      type: String,
      required: true,
      trim: true,
    },
    itemType: {
      type: String,
      enum: ['Service', 'Medication'],
      default: 'Service',
    },
    catalogSection: {
      type: String,
      default: '',
      trim: true,
    },
    category: {
      type: String,
      default: '',
      trim: true,
    },
    department: {
      type: String,
      default: '',
      trim: true,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },
    lineTotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNo: {
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
    patientId: {
      type: String,
      default: '',
      trim: true,
    },
    service: {
      type: String,
      trim: true,
      default: '',
    },
    serviceCategory: {
      type: String,
      default: '',
      trim: true,
    },
    invoiceItems: {
      type: [invoiceItemSchema],
      default: [],
    },
    invoiceType: {
      type: String,
      enum: ['Revenue', 'Proforma'],
      default: 'Revenue',
    },
    cashierName: {
      type: String,
      trim: true,
      default: '',
    },
    financeOfficer: {
      type: String,
      trim: true,
      default: '',
    },
    channel: {
      type: String,
      enum: ['Cash', 'Card', 'Insurance', 'Transfer', 'Mobile Money'],
      default: 'Cash',
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    amount: {
      type: String,
      default: '0',
    },
    department: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['Draft', 'Issued', 'Pending', 'Paid', 'Awaiting approval', 'Claim drafted', 'Part paid', 'Cancelled'],
      default: 'Draft',
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = createScopedModel('Invoice', invoiceSchema);
