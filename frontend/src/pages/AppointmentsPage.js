import { useEffect, useMemo, useState } from 'react';
import { hospitalApi } from '../api/hospitalApi';
import { useToast } from '../app/ToastContext';
import Modal from '../components/common/Modal';
import PageHeader from '../components/common/PageHeader';
import ProDataGrid from '../components/common/ProDataGrid';
import SectionCard from '../components/common/SectionCard';
import StatCard from '../components/common/StatCard';
import Tabs from '../components/common/Tabs';
import TableToolbar from '../components/common/TableToolbar';
import DataTable from '../components/tables/DataTable';
import { isWithinDateRange, normalizeDateValue } from '../utils/dateFilters';

const appointmentColumns = [
  {
    key: 'appointmentDate',
    header: 'Date',
    render: (value) => normalizeDateValue(value),
  },
  { key: 'time', header: 'Time' },
  { key: 'shift', header: 'Shift', badge: true },
  { key: 'patient', header: 'Patient' },
  { key: 'branchName', header: 'Branch' },
  { key: 'clinician', header: 'Clinician' },
  { key: 'department', header: 'Department' },
  { key: 'visitType', header: 'Visit Type' },
  { key: 'status', header: 'Status', badge: true },
];

const emptyAppointmentForm = {
  id: '',
  time: '',
  appointmentDate: '',
  patient: '',
  patientDbId: '',
  clinician: '',
  assignedClinicianId: '',
  department: '',
  shift: 'Day',
  visitType: 'Walk-in',
  status: 'Booked',
  notes: '',
};

const appointmentQueueTabs = [
  { id: 'booked', label: 'Booked Queue' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'completed', label: 'Completed' },
];

const appointmentQueueGroups = {
  booked: ['Booked', 'Checked in', 'With nurse', 'Waiting for doctor'],
  in_progress: ['With doctor', 'Awaiting results', 'Review ongoing', 'On treatment'],
  completed: ['Completed', 'Cancelled'],
};

const appointmentStatusOptions = [
  'Booked',
  'Checked in',
  'With nurse',
  'Waiting for doctor',
  'With doctor',
  'Awaiting results',
  'Review ongoing',
  'On treatment',
  'Completed',
  'Cancelled',
];

function AppointmentsPage({ data, auth, users, departments, dutyRoster, onRefreshData, pageMeta }) {
  const [records, setRecords] = useState(data.queue);
  const [form, setForm] = useState(emptyAppointmentForm);
  const [editingAppointmentId, setEditingAppointmentId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [activeQueueTab, setActiveQueueTab] = useState('booked');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [patientLookup, setPatientLookup] = useState('');
  const [patientMatches, setPatientMatches] = useState([]);
  const [isSearchingPatients, setIsSearchingPatients] = useState(false);
  const { showToast } = useToast();

  const clinicianOptions = useMemo(
    () =>
      users.filter(
        (user) => user.isActive && ['Doctor', 'Clinician'].includes(user.role)
      ),
    [users]
  );

  const availableClinicianOptions = useMemo(() => {
    const selectedDate = form.appointmentDate ? form.appointmentDate.slice(0, 10) : '';

    if (!selectedDate) {
      return clinicianOptions;
    }

    const activeDutyEntries = (dutyRoster || []).filter(
      (entry) =>
        entry.dutyDate === selectedDate &&
        entry.shift === form.shift &&
        entry.status === 'On duty'
    );

    if (!activeDutyEntries.length) {
      return clinicianOptions;
    }

    const onDutyIds = new Set(activeDutyEntries.map((entry) => entry.staffUserId));
    const filtered = clinicianOptions.filter((user) => onDutyIds.has(user.id));

    return filtered.length ? filtered : clinicianOptions;
  }, [clinicianOptions, dutyRoster, form.appointmentDate, form.shift]);

  const departmentOptions = useMemo(
    () =>
      (departments || [])
        .filter((department) => department.isActive)
        .sort((left, right) => left.name.localeCompare(right.name)),
    [departments]
  );

  useEffect(() => {
    setRecords(data.queue);
  }, [data.queue]);

  useEffect(() => {
    if (!patientLookup.trim()) {
      setPatientMatches([]);
      return undefined;
    }

    const timer = window.setTimeout(async () => {
      setIsSearchingPatients(true);
      try {
        const matches = await hospitalApi.searchPatients(patientLookup);
        setPatientMatches(matches);
      } catch (error) {
        setPatientMatches([]);
      } finally {
        setIsSearchingPatients(false);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [patientLookup]);

  const filteredRecords = useMemo(
    () =>
      records.filter((appointment) => {
        const matchesQueueTab =
          (appointmentQueueGroups[activeQueueTab] || []).includes(appointment.status);
        const matchesSearch = [
          appointment.patient,
          appointment.clinician,
          appointment.department,
          appointment.visitType,
        ]
          .join(' ')
          .toLowerCase()
          .includes(searchValue.toLowerCase());
        const matchesStatus =
          statusFilter === 'all' || appointment.status === statusFilter;
        const matchesDate = isWithinDateRange(
          appointment.appointmentDate,
          startDateFilter,
          endDateFilter
        );
        return matchesQueueTab && matchesSearch && matchesStatus && matchesDate;
      }),
    [activeQueueTab, records, searchValue, statusFilter, startDateFilter, endDateFilter]
  );

  const summaryCards = useMemo(
    () => [
      { label: 'Booked Queue', value: records.filter((item) => appointmentQueueGroups.booked.includes(item.status)).length },
      {
        label: 'Doctor Started',
        value: records.filter((item) => appointmentQueueGroups.in_progress.includes(item.status)).length,
      },
      { label: 'Completed', value: records.filter((item) => appointmentQueueGroups.completed.includes(item.status)).length },
    ],
    [records]
  );

  const appointmentTabCounts = useMemo(
    () => ({
      booked: records.filter((item) => appointmentQueueGroups.booked.includes(item.status)).length,
      in_progress: records.filter((item) => appointmentQueueGroups.in_progress.includes(item.status)).length,
    }),
    [records]
  );

  const appointmentTabsWithBadges = useMemo(
    () =>
      appointmentQueueTabs.map((tab) => ({
        ...tab,
        badgeCount: tab.id === 'completed' ? 0 : appointmentTabCounts[tab.id] || 0,
      })),
    [appointmentTabCounts]
  );

  if (!auth.canViewData('appointment_records')) {
    return (
      <SectionCard eyebrow="Access control" title="Appointments are restricted">
        <p className="panel-copy">The active user cannot view appointment data.</p>
      </SectionCard>
    );
  }

  const openCreateModal = () => {
    const defaultDate = new Date();
    defaultDate.setHours(9, 0, 0, 0);

    setEditingAppointmentId(null);
    setPatientLookup('');
    setPatientMatches([]);
    setForm({
      ...emptyAppointmentForm,
      appointmentDate: defaultDate.toISOString().slice(0, 16),
    });
    setIsModalOpen(true);
  };

  const openEditModal = (appointment) => {
    if (!auth.canDoAction('edit_appointment')) {
      return;
    }

    setEditingAppointmentId(appointment.id);
    setPatientLookup(
      appointment.patientId ? `${appointment.patient} | ${appointment.patientId}` : appointment.patient || ''
    );
    setPatientMatches([]);
    setForm({
      ...emptyAppointmentForm,
      ...appointment,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAppointmentId(null);
    setIsSaving(false);
    setPatientLookup('');
    setPatientMatches([]);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleClinicianChange = (event) => {
    const selected = clinicianOptions.find((item) => item.id === event.target.value);
    setForm((current) => ({
      ...current,
      clinician: selected?.fullName || '',
      assignedClinicianId: selected?.id || '',
      department: current.department || selected?.department || '',
    }));
  };

  const handlePatientLookupChange = (event) => {
    const nextValue = event.target.value;

    setPatientLookup(nextValue);
    setForm((current) => ({
      ...current,
      patient: current.patientDbId ? '' : current.patient,
      patientDbId: '',
    }));
  };

  const handlePickPatient = (patient) => {
    setForm((current) => ({
      ...current,
      patient: patient.name,
      patientDbId: patient.id,
    }));
    setPatientLookup(`${patient.name} | ${patient.patientId}`);
    setPatientMatches([]);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.patientDbId) {
      showToast('Look up and select a registered client before booking the appointment.', 'error');
      return;
    }

    setIsSaving(true);

    try {
      if (editingAppointmentId) {
        const savedAppointment = await hospitalApi.updateAppointment(editingAppointmentId, form);
        setRecords((current) =>
          current.map((item) => (item.id === editingAppointmentId ? savedAppointment : item))
        );
        showToast('Appointment updated successfully.', 'success');
      } else {
        const createdAppointment = await hospitalApi.createAppointment(form);
        setRecords((current) => [...current, createdAppointment].sort((a, b) => a.time.localeCompare(b.time)));
        showToast('Appointment created successfully.', 'success');
      }

      if (onRefreshData) {
        await onRefreshData();
      }

      closeModal();
    } catch (error) {
      setIsSaving(false);
      showToast(error.message || 'Unable to save appointment.', 'error');
    }
  };

  return (
    <div className="page-stack">
      <PageHeader
        title={pageMeta?.label || 'Appointments'}
        description={pageMeta?.description || ''}
        actions={
          auth.canDoAction('create_appointment') ? (
            <button type="button" className="primary-button" onClick={openCreateModal}>
              Book Appointment
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
        <Tabs
          tabs={appointmentTabsWithBadges}
          activeTab={activeQueueTab}
          onChange={(tabId) => {
            setActiveQueueTab(tabId);
            setStatusFilter('all');
          }}
        />

        <TableToolbar
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder="Search patient, clinician, department, or type"
          filters={[
            {
              label: 'Status',
              value: statusFilter,
              onChange: setStatusFilter,
              options: [
                { label: 'All statuses', value: 'all' },
                ...appointmentStatusOptions
                  .filter((option) => (appointmentQueueGroups[activeQueueTab] || []).includes(option))
                  .map((option) => ({ label: option, value: option })),
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
          columns={appointmentColumns}
          rows={filteredRecords}
          caption={
            activeQueueTab === 'booked'
              ? 'Booked appointments that have not yet been seen by the doctor'
              : activeQueueTab === 'in_progress'
                ? 'Appointments already seen by the doctor and still in progress'
                : 'Completed or closed appointments'
          }
          onRowClick={auth.canDoAction('edit_appointment') ? openEditModal : undefined}
        />
      </section>

      <Modal
        isOpen={isModalOpen}
        title={editingAppointmentId ? 'Edit Appointment' : 'Create Appointment'}
        subtitle="Appointments are handled in a modal so reception staff can stay in the queue view."
        onClose={closeModal}
      >
        <form className="entity-form" onSubmit={handleSubmit}>
          {editingAppointmentId ? (
            <div className="line-item-card form-section">
              <ProDataGrid
                items={[
                  { label: 'Patient', value: form.patient },
                  { label: 'Department', value: form.department },
                  { label: 'Clinician', value: form.clinician || 'Not assigned' },
                  { label: 'Visit Type', value: form.visitType },
                  { label: 'Status', value: form.status },
                  { label: 'Shift', value: form.shift },
                ]}
              />
            </div>
          ) : null}
          <div className="form-grid">
            <label className="form-field patient-search-field">
              <span>Patient Lookup</span>
              <input
                value={patientLookup}
                onChange={handlePatientLookupChange}
                placeholder="Search by name, patient ID, ID number, or phone number"
                required
              />
              <small className="helper-text">
                Search and select the registered client before creating the appointment.
              </small>
              {isSearchingPatients ? <small className="helper-text">Searching...</small> : null}
              {patientMatches.length ? (
                <div className="patient-match-list">
                  {patientMatches.map((patient) => (
                    <button
                      key={patient.id}
                      type="button"
                      className="patient-match-item"
                      onClick={() => handlePickPatient(patient)}
                    >
                      <strong>{patient.name}</strong>
                      <span>
                        {patient.patientId} | {patient.phone || 'No phone'} | {patient.idNumber || 'No ID'}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </label>
            <label className="form-field">
              <span>Selected Client</span>
              <input name="patient" value={form.patient} onChange={handleChange} required disabled />
            </label>
            <label className="form-field">
              <span>Clinician</span>
              <select value={form.assignedClinicianId} onChange={handleClinicianChange} required>
                <option value="">Select clinician</option>
                {availableClinicianOptions.map((clinician) => (
                  <option key={clinician.id} value={clinician.id}>
                    {clinician.fullName} {clinician.department ? `- ${clinician.department}` : ''}
                  </option>
                ))}
              </select>
              <small className="helper-text">
                Showing clinicians available for the selected date and {form.shift.toLowerCase()} shift.
              </small>
            </label>
            <label className="form-field">
              <span>Department</span>
              <select name="department" value={form.department} onChange={handleChange} required>
                <option value="">Select department</option>
                {departmentOptions.map((department) => (
                  <option key={department.id} value={department.name}>
                    {department.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span>Date and Time</span>
              <input
                type="datetime-local"
                name="appointmentDate"
                value={form.appointmentDate}
                onChange={handleChange}
                required
              />
            </label>
            <label className="form-field">
              <span>Shift</span>
              <select name="shift" value={form.shift} onChange={handleChange}>
                <option value="Day">Day</option>
                <option value="Night">Night</option>
              </select>
            </label>
            <label className="form-field">
              <span>Visit Type</span>
              <select name="visitType" value={form.visitType} onChange={handleChange}>
                <option value="New patient">New patient</option>
                <option value="Follow-up">Follow-up</option>
                <option value="Walk-in">Walk-in</option>
                <option value="Review">Review</option>
                <option value="Urgent">Urgent</option>
              </select>
            </label>
            <label className="form-field">
              <span>Status</span>
              <select name="status" value={form.status} onChange={handleChange}>
                <option value="Booked">Booked</option>
                <option value="Checked in">Checked in</option>
                <option value="With nurse">With nurse</option>
                <option value="Waiting for doctor">Waiting for doctor</option>
                <option value="With doctor">With doctor</option>
                <option value="Awaiting results">Awaiting results</option>
                <option value="Review ongoing">Review ongoing</option>
                <option value="On treatment">On treatment</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </label>
            <label className="form-field form-field-full">
              <span>Notes</span>
              <textarea name="notes" rows="4" value={form.notes} onChange={handleChange} />
            </label>
          </div>

          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={closeModal}>
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={isSaving}>
              {isSaving ? 'Saving...' : editingAppointmentId ? 'Save Appointment' : 'Create Appointment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default AppointmentsPage;
