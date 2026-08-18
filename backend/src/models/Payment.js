const mongoose = require('mongoose');
const { createScopedModel } = require('./helpers/createScopedModel');

const paymentInvoiceItemSchema = new mongoose.Schema(
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
      default: 0,
      min: 0,
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },
    lineTotal: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

const paymentSchema = new mongoose.Schema(
  {
    receiptNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    invoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      required: true,
    },
    invoiceNo: {
      type: String,
      required: true,
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
    service: {
      type: String,
      required: true,
      trim: true,
    },
    serviceCategory: {
      type: String,
      default: '',
      trim: true,
    },
    patientId: {
      type: String,
      default: '',
      trim: true,
    },
    invoiceItems: {
      type: [paymentInvoiceItemSchema],
      default: [],
    },
    invoiceType: {
      type: String,
      enum: ['Revenue', 'Proforma'],
      default: 'Revenue',
    },
    department: {
      type: String,
      default: '',
      trim: true,
    },
    invoiceTotal: {
      type: Number,
      default: 0,
      min: 0,
    },
    balanceAfterPayment: {
      type: Number,
      default: 0,
      min: 0,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    channel: {
      type: String,
      enum: ['Cash', 'Card', 'Insurance', 'Transfer', 'Mobile Money'],
      default: 'Cash',
    },
    cashierName: {
      type: String,
      default: '',
      trim: true,
    },
    financeOfficer: {
      type: String,
      default: '',
      trim: true,
    },
    postedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['Posted', 'Voided'],
      default: 'Posted',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = createScopedModel('Payment', paymentSchema);
