import { useEffect, useMemo, useState } from 'react';
import { hospitalApi } from '../api/hospitalApi';
import { useToast } from '../app/ToastContext';
import Modal from '../components/common/Modal';
import PageHeader from '../components/common/PageHeader';
import SectionCard from '../components/common/SectionCard';
import StatCard from '../components/common/StatCard';
import TableToolbar from '../components/common/TableToolbar';
import DataTable from '../components/tables/DataTable';
import { isWithinDateRange } from '../utils/dateFilters';

const dutyColumns = [
  { key: 'dutyDate', header: 'Date' },
  { key: 'shift', header: 'Shift', badge: true },
  { key: 'staffName', header: 'Staff' },
  { key: 'role', header: 'Role' },
  { key: 'department', header: 'Department' },
  { key: 'status', header: 'Status', badge: true },
  {
    key: 'hours',
    header: 'Hours',
    render: (_, row) => `${row.startTime || '--'} - ${row.endTime || '--'}`,
  },
];

const emptyDutyForm = {
  id: '',
  staffUserId: '',
  dutyDate: new Date().toISOString().slice(0, 10),
  shift: 'Day',
  status: 'On duty',
  startTime: '08:00',
  endTime: '18:00',
  notes: '',
};

function DutyRosterPage({ data, auth, users, pageMeta }) {
  const [records, setRecords] = useState(data.records || []);
  const [form, setForm] = useState(emptyDutyForm);
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [shiftFilter, setShiftFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const { showToast } = useToast();

  useEffect(() => {
    setRecords(data.records || []);
  }, [data.records]);

  const staffOptions = useMemo(
    () => users.filter((user) => user.isActive).sort((left, right) => left.fullName.localeCompare(right.fullName)),
    [users]
  );

  const filteredRecords = useMemo(
    () =>
      records.filter((entry) => {
        const matchesSearch = [entry.staffName, entry.role, entry.department, entry.dutyDate]
          .join(' ')
          .toLowerCase()
          .includes(searchValue.toLowerCase());
        const matchesShift = shiftFilter === 'all' || entry.shift === shiftFilter;
        const matchesStatus = statusFilter === 'all' || entry.status === statusFilter;
        const matchesDate = isWithinDateRange(entry.dutyDate, startDateFilter, endDateFilter);
        return matchesSearch && matchesShift && matchesStatus && matchesDate;
      }),
    [records, searchValue, shiftFilter, statusFilter, startDateFilter, endDateFilter]
  );

  const summaryCards = useMemo(
    () => [
      { label: 'Roster Entries', value: records.length },
      { label: 'Day Shift', value: records.filter((item) => item.shift === 'Day' && item.status === 'On duty').length },
      { label: 'Night Shift', value: records.filter((item) => item.shift === 'Night' && item.status === 'On duty').length },
    ],
    [records]
  );

  if (!auth.canViewData('duty_records')) {
    return (
      <SectionCard eyebrow="Access control" title="Duty roster is restricted">
        <p className="panel-copy">The active user cannot view the duty roster.</p>
      </SectionCard>
    );
  }

  const openCreateModal = () => {
    setEditingEntryId(null);
    setForm(emptyDutyForm);
    setIsModalOpen(true);
  };

  const openEditModal = (entry) => {
    if (!auth.canDoAction('manage_duty')) {
      return;
    }

    setEditingEntryId(entry.id);
    setForm({
      ...emptyDutyForm,
      ...entry,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEntryId(null);
    setIsSaving(false);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      if (editingEntryId) {
        const savedEntry = await hospitalApi.updateDutyRosterEntry(editingEntryId, form);
        setRecords((current) =>
          current.map((item) => (item.id === editingEntryId ? savedEntry : item))
        );
        showToast('Duty roster updated successfully.', 'success');
      } else {
        const createdEntry = await hospitalApi.createDutyRosterEntry(form);
        setRecords((current) => [createdEntry, ...current]);
        showToast('Duty roster entry created successfully.', 'success');
      }

      closeModal();
    } catch (error) {
      setIsSaving(false);
      showToast(error.message || 'Unable to save duty roster entry.', 'error');
    }
  };

  return (
    <div className="page-stack">
      <PageHeader
        title={pageMeta?.label || 'Duty Roster'}
        description={pageMeta?.description || ''}
        actions={
          auth.canDoAction('manage_duty') ? (
            <button type="button" className="primary-button" onClick={openCreateModal}>
              Add Duty Entry
            </button>
          ) : null
        }
      />

      <div className="stats-grid stats-grid-compact">
        {summaryCards.map((item) => (
          <StatCard key={item.label} {...item} />
        ))}
      </div>

      <section className="panel">
        <TableToolbar
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder="Search staff, role, department, or date"
          filters={[
            {
              label: 'Shift',
              value: shiftFilter,
              onChange: setShiftFilter,
              options: [
                { label: 'All shifts', value: 'all' },
                { label: 'Day', value: 'Day' },
                { label: 'Night', value: 'Night' },
              ],
            },
            {
              label: 'Status',
              value: statusFilter,
              onChange: setStatusFilter,
              options: [
                { label: 'All statuses', value: 'all' },
                { label: 'On duty', value: 'On duty' },
                { label: 'Off duty', value: 'Off duty' },
                { label: 'On leave', value: 'On leave' },
              ],
            },
            {
              label: 'From date',
              value: startDateFilter,
              onChange: setStartDateFilter,
              type: 'date',
              max: endDateFilter || undefined,
            },
            {
              label: 'To date',
              value: endDateFilter,
              onChange: setEndDateFilter,
              type: 'date',
              min: startDateFilter || undefined,
            },
          ]}
        />

        <DataTable
          columns={dutyColumns}
          rows={filteredRecords}
          caption="Daily coverage and shift assignments"
          emptyMessage="No duty roster entries match the current filters."
          onRowClick={auth.canDoAction('manage_duty') ? openEditModal : undefined}
        />
      </section>

      <Modal
        isOpen={isModalOpen}
        title={editingEntryId ? 'Edit Duty Entry' : 'Create Duty Entry'}
        subtitle="Use the roster to control who should appear as available during appointment booking."
        onClose={closeModal}
      >
        <form className="entity-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label className="form-field">
              <span>Staff Member</span>
              <select name="staffUserId" value={form.staffUserId} onChange={handleChange} required>
                <option value="">Select staff</option>
                {staffOptions.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.fullName} - {user.role} {user.department ? `(${user.department})` : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span>Date</span>
              <input type="date" name="dutyDate" value={form.dutyDate} onChange={handleChange} required />
            </label>
            <label className="form-field">
              <span>Shift</span>
              <select name="shift" value={form.shift} onChange={handleChange}>
                <option value="Day">Day</option>
                <option value="Night">Night</option>
              </select>
            </label>
            <label className="form-field">
              <span>Status</span>
              <select name="status" value={form.status} onChange={handleChange}>
                <option value="On duty">On duty</option>
                <option value="Off duty">Off duty</option>
                <option value="On leave">On leave</option>
              </select>
            </label>
            <label className="form-field">
              <span>Start Time</span>
              <input type="time" name="startTime" value={form.startTime} onChange={handleChange} />
            </label>
            <label className="form-field">
              <span>End Time</span>
              <input type="time" name="endTime" value={form.endTime} onChange={handleChange} />
            </label>
            <label className="form-field form-field-full">
              <span>Notes</span>
              <textarea name="notes" rows="3" value={form.notes} onChange={handleChange} />
            </label>
          </div>

          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={closeModal}>
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={isSaving}>
              {isSaving ? 'Saving...' : editingEntryId ? 'Save Duty Entry' : 'Create Duty Entry'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default DutyRosterPage;
