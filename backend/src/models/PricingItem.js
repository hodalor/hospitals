const mongoose = require('mongoose');
const { createScopedModel } = require('./helpers/createScopedModel');

const pricingItemSchema = new mongoose.Schema(
  {
    itemType: {
      type: String,
      enum: ['Service', 'Medication'],
      required: true,
    },
    catalogSection: {
      type: String,
      enum: ['Medication', 'Medical Condition', 'Diagnosis', 'Lab Test', 'Administrative'],
      default: undefined,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    brand: {
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
    stockQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
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

module.exports = createScopedModel('PricingItem', pricingItemSchema);
