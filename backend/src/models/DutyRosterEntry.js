const mongoose = require('mongoose');
const { createScopedModel } = require('./helpers/createScopedModel');

const dutyRosterEntrySchema = new mongoose.Schema(
  {
    staffUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    staffName: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      required: true,
      trim: true,
    },
    department: {
      type: String,
      required: true,
      trim: true,
    },
    dutyDate: {
      type: Date,
      required: true,
    },
    shift: {
      type: String,
      enum: ['Day', 'Night'],
      required: true,
    },
    status: {
      type: String,
      enum: ['On duty', 'Off duty', 'On leave'],
      default: 'On duty',
    },
    startTime: {
      type: String,
      default: '',
      trim: true,
    },
    endTime: {
      type: String,
      default: '',
      trim: true,
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

dutyRosterEntrySchema.index({ staffUser: 1, dutyDate: 1, shift: 1 }, { unique: true });

module.exports = createScopedModel('DutyRosterEntry', dutyRosterEntrySchema);
