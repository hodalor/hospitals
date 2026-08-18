const mongoose = require('mongoose');
const { createScopedModel } = require('./helpers/createScopedModel');

const hospitalSchema = new mongoose.Schema(
  {
    hospitalId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    hospitalName: {
      type: String,
      required: true,
      trim: true,
    },
    dbName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    adminFullName: {
      type: String,
      default: '',
      trim: true,
    },
    adminUsername: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
    },
    contactEmail: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
    },
    contactPhone: {
      type: String,
      default: '',
      trim: true,
    },
    enabledModules: {
      type: [String],
      default: [],
    },
    seedSharedCatalogs: {
      type: Boolean,
      default: false,
    },
    sharedCatalogsSeededAt: {
      type: Date,
      default: null,
    },
    subscriptionMonthlyAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    subscriptionCurrency: {
      type: String,
      default: 'GHS',
      trim: true,
      uppercase: true,
    },
    subscriptionExpiresAt: {
      type: Date,
      default: null,
    },
    subscriptionActivationCode: {
      type: String,
      default: '',
      trim: true,
      uppercase: true,
    },
    subscriptionActivationCodeIssuedAt: {
      type: Date,
      default: null,
    },
    subscriptionActivationCodeUsedAt: {
      type: Date,
      default: null,
    },
    subscriptionLastActivatedAt: {
      type: Date,
      default: null,
    },
    subscriptionLastPaymentAt: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = createScopedModel('Hospital', hospitalSchema, { masterOnly: true });
