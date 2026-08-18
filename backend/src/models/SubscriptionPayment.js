const mongoose = require('mongoose');
const { createScopedModel } = require('./helpers/createScopedModel');

const subscriptionPaymentSchema = new mongoose.Schema(
  {
    hospitalId: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    hospitalName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    months: {
      type: Number,
      required: true,
      min: 1,
    },
    monthlyAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'NGN',
      trim: true,
      uppercase: true,
    },
    reference: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    status: {
      type: String,
      default: 'initialized',
      enum: ['initialized', 'success', 'failed', 'abandoned'],
    },
    expiresBefore: {
      type: Date,
      default: null,
    },
    expiresAfter: {
      type: Date,
      default: null,
    },
    gatewayResponse: {
      type: String,
      default: '',
      trim: true,
    },
    paystackTransactionId: {
      type: String,
      default: '',
      trim: true,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

module.exports = createScopedModel('SubscriptionPayment', subscriptionPaymentSchema, { masterOnly: true });
