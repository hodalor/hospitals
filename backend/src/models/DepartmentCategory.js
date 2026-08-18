const mongoose = require('mongoose');
const { createScopedModel } = require('./helpers/createScopedModel');

const departmentCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
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

module.exports = createScopedModel('DepartmentCategory', departmentCategorySchema);
