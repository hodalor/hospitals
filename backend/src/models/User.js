const mongoose = require('mongoose');
const { createScopedModel } = require('./helpers/createScopedModel');

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      required: true,
      trim: true,
    },
    department: {
      type: String,
      default: '',
      trim: true,
    },
    branchName: {
      type: String,
      default: 'Main',
      trim: true,
    },
    menuPermissions: {
      type: [String],
      default: [],
    },
    dataPermissions: {
      type: [String],
      default: [],
    },
    actionPermissions: {
      type: [String],
      default: [],
    },
    queuePermissions: {
      type: [String],
      default: [],
    },
    isSuperAdmin: {
      type: Boolean,
      default: false,
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

module.exports = createScopedModel('User', userSchema);
