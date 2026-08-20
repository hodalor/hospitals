const mongoose = require('mongoose');
const { createScopedModel } = require('./helpers/createScopedModel');

const brandingSchema = new mongoose.Schema(
  {
    hospitalName: {
      type: String,
      default: 'HealthNova Hospital',
      trim: true,
    },
    branchName: {
      type: String,
      default: 'Main Hospital Branch',
      trim: true,
    },
    address: {
      type: String,
      default: '',
      trim: true,
    },
    location: {
      type: String,
      default: '',
      trim: true,
    },
    phoneNumbers: {
      type: String,
      default: '',
      trim: true,
    },
    email: {
      type: String,
      default: '',
      trim: true,
    },
    logoDataUrl: {
      type: String,
      default: '',
      trim: true,
    },
    sidebarColor: {
      type: String,
      default: '#1d3348',
      trim: true,
    },
    defaultCurrency: {
      type: String,
      default: 'GHS',
      trim: true,
      uppercase: true,
    },
    currencies: {
      type: [
        {
          code: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
          },
          name: {
            type: String,
            required: true,
            trim: true,
          },
          symbol: {
            type: String,
            default: '',
            trim: true,
          },
          isDefault: {
            type: Boolean,
            default: false,
          },
          isActive: {
            type: Boolean,
            default: true,
          },
        },
      ],
      default: [],
    },
    branches: {
      type: [
        {
          name: {
            type: String,
            required: true,
            trim: true,
          },
          code: {
            type: String,
            default: '',
            trim: true,
            uppercase: true,
          },
          address: {
            type: String,
            default: '',
            trim: true,
          },
          location: {
            type: String,
            default: '',
            trim: true,
          },
          phoneNumbers: {
            type: String,
            default: '',
            trim: true,
          },
          email: {
            type: String,
            default: '',
            trim: true,
            lowercase: true,
          },
          isMain: {
            type: Boolean,
            default: false,
          },
          isActive: {
            type: Boolean,
            default: true,
          },
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = createScopedModel('Branding', brandingSchema);
