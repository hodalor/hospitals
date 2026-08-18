const DutyRosterEntry = require('../models/DutyRosterEntry');
const User = require('../models/User');
const { asyncHandler } = require('../utils/asyncHandler');

const serializeDutyRosterEntry = (entry) => ({
  id: entry._id,
  staffUserId: entry.staffUser?._id || entry.staffUser,
  staffName: entry.staffUser?.fullName || entry.staffName,
  role: entry.staffUser?.role || entry.role,
  department: entry.staffUser?.department || entry.department,
  dutyDate: entry.dutyDate ? new Date(entry.dutyDate).toISOString().slice(0, 10) : '',
  shift: entry.shift,
  status: entry.status,
  startTime: entry.startTime || '',
  endTime: entry.endTime || '',
  notes: entry.notes || '',
});

const getDutyRoster = asyncHandler(async (req, res) => {
  const entries = await DutyRosterEntry.find()
    .populate('staffUser', 'fullName role department')
    .sort({ dutyDate: 1, shift: 1, staffName: 1 });

  res.json({ success: true, data: entries.map(serializeDutyRosterEntry) });
});

const createDutyRosterEntry = asyncHandler(async (req, res) => {
  const user = await User.findById(req.body.staffUserId);

  if (!user) {
    res.status(400);
    throw new Error('Select a valid staff user');
  }

  const entry = await DutyRosterEntry.create({
    staffUser: user._id,
    staffName: user.fullName,
    role: user.role,
    department: user.department,
    dutyDate: req.body.dutyDate,
    shift: req.body.shift,
    status: req.body.status,
    startTime: req.body.startTime,
    endTime: req.body.endTime,
    notes: req.body.notes,
  });

  const populatedEntry = await DutyRosterEntry.findById(entry._id).populate(
    'staffUser',
    'fullName role department'
  );

  res.status(201).json({ success: true, data: serializeDutyRosterEntry(populatedEntry) });
});

const updateDutyRosterEntry = asyncHandler(async (req, res) => {
  const existingEntry = await DutyRosterEntry.findById(req.params.id);

  if (!existingEntry) {
    res.status(404);
    throw new Error('Duty roster entry not found');
  }

  const user = await User.findById(req.body.staffUserId || existingEntry.staffUser);

  if (!user) {
    res.status(400);
    throw new Error('Select a valid staff user');
  }

  existingEntry.staffUser = user._id;
  existingEntry.staffName = user.fullName;
  existingEntry.role = user.role;
  existingEntry.department = user.department;
  existingEntry.dutyDate = req.body.dutyDate;
  existingEntry.shift = req.body.shift;
  existingEntry.status = req.body.status;
  existingEntry.startTime = req.body.startTime || '';
  existingEntry.endTime = req.body.endTime || '';
  existingEntry.notes = req.body.notes || '';
  await existingEntry.save();

  const populatedEntry = await DutyRosterEntry.findById(existingEntry._id).populate(
    'staffUser',
    'fullName role department'
  );

  res.json({ success: true, data: serializeDutyRosterEntry(populatedEntry) });
});

module.exports = {
  getDutyRoster,
  createDutyRosterEntry,
  updateDutyRosterEntry,
};
