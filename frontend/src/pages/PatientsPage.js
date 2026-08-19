import { useEffect, useMemo, useState } from 'react';
import { hospitalApi } from '../api/hospitalApi';
import { useToast } from '../app/ToastContext';
import Modal from '../components/common/Modal';
import PageHeader from '../components/common/PageHeader';
import ProDataGrid from '../components/common/ProDataGrid';
import SectionCard from '../components/common/SectionCard';
import StatCard from '../components/common/StatCard';
import TableToolbar from '../components/common/TableToolbar';
import Tabs from '../components/common/Tabs';
import DataTable from '../components/tables/DataTable';
import { isWithinDateRange } from '../utils/dateFilters';

const patientColumns = [
  { key: 'patientId', header: 'Patient ID', width: '10%' },
  { key: 'name', header: 'Patient' },
  { key: 'dob', header: 'DOB' },
  { key: 'gender', header: 'Gender' },
  { key: 'phone', header: 'Phone' },
  { key: 'createdBranchName', header: 'Created Branch' },
  { key: 'department', header: 'Department' },
  { key: 'idCardType', header: 'ID Type' },
  { key: 'status', header: 'Status', badge: true },
];

const visitHistoryColumns = [
  { key: 'visitDate', header: 'Visit Date' },
  { key: 'visitNo', header: 'Visit No' },
  { key: 'department', header: 'Department' },
  { key: 'branchName', header: 'Visit Branch' },
  { key: 'clinician', header: 'Doctor' },
  {
    key: 'medicalConditions',
    header: 'Medical History',
    render: (value, row) =>
      (value || []).length ? value.join(', ') : row.diagnosis || row.chiefComplaint || 'No conditions recorded',
  },
  {
    key: 'medicationsGiven',
    header: 'Medications',
    render: (value) => ((value || []).length ? value.join(', ') : 'No medication recorded'),
  },
  { key: 'stage', header: 'Outcome', badge: true },
];

const createEmergencyContact = () => ({
  name: '',
  phone: '',
  email: '',
  relationship: '',
});

const emptyPatientForm = {
  id: '',
  name: '',
  dob: '',
  age: '',
  gender: 'Female',
  phone: '',
  department: '',
  lastVisit: '',
  visitReason: '',
  status: 'Checked in',
  idCardType: '',
  idNumber: '',
  idFrontImage: '',
  idBackImage: '',
  profilePhoto: '',
  createdBranchName: 'Main',
  emergencyContacts: [createEmergencyContact()],
};

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function PatientsPage({ data, auth, branches, pageMeta }) {
  const [records, setRecords] = useState(data.records || []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPatientId, setEditingPatientId] = useState(null);
  const [form, setForm] = useState(emptyPatientForm);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditEnabled, setIsEditEnabled] = useState(true);
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [profileTab, setProfileTab] = useState('profile');
  const [patientProfile, setPatientProfile] = useState({ patient: null, visitHistory: [] });
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    setRecords(data.records || []);
  }, [data.records]);

  const activeBranches = useMemo(
    () => (branches || []).filter((branch) => branch.isActive !== false),
    [branches]
  );

  const defaultCreatedBranchName =
    auth.currentUser?.selectedBranchName ||
    auth.currentUser?.branchName ||
    activeBranches[0]?.name ||
    'Main';

  const canChoosePatientBranch = Boolean(auth.currentUser?.canAccessAllBranches && activeBranches.length > 1);

  useEffect(() => {
    if (!editingPatientId || !isModalOpen) {
      return undefined;
    }

    let isMounted = true;

    async function loadPatientProfile() {
      setIsLoadingProfile(true);

      try {
        const profile = await hospitalApi.getPatientProfile(editingPatientId);
        if (isMounted) {
          setPatientProfile(profile);
        }
      } catch (error) {
        if (isMounted) {
          setPatientProfile({ patient: null, visitHistory: [] });
          showToast(error.message || 'Unable to load patient history.', 'error');
        }
      } finally {
        if (isMounted) {
          setIsLoadingProfile(false);
        }
      }
    }

    loadPatientProfile();

    return () => {
      isMounted = false;
    };
  }, [editingPatientId, isModalOpen, showToast]);

  const filteredRecords = useMemo(() => {
    return records.filter((patient) => {
      const matchesSearch = [
        patient.patientId,
        patient.name,
        patient.phone,
        patient.department,
        patient.idNumber,
      ]
        .join(' ')
        .toLowerCase()
        .includes(searchValue.toLowerCase());
      const matchesStatus = statusFilter === 'all' || patient.status === statusFilter;
      const matchesGender = genderFilter === 'all' || patient.gender === genderFilter;
      const matchesBranch = branchFilter === 'all' || patient.createdBranchName === branchFilter;
      const matchesDate = isWithinDateRange(patient.lastVisit, startDateFilter, endDateFilter);
      return matchesSearch && matchesStatus && matchesGender && matchesBranch && matchesDate;
    });
  }, [records, searchValue, statusFilter, genderFilter, branchFilter, startDateFilter, endDateFilter]);

  const summaryCards = useMemo(
    () => [
      { label: 'Patients', value: records.length },
      { label: 'Active Cases', value: records.filter((item) => item.status !== 'Completed').length },
      { label: 'With ID Data', value: records.filter((item) => item.idNumber || item.idCardType).length },
    ],
    [records]
  );

  if (!auth.canViewData('patient_records')) {
    return (
      <SectionCard eyebrow="Access control" title="Patient records are restricted">
        <p className="panel-copy">The active user cannot view patient records.</p>
      </SectionCard>
    );
  }

  const openCreateModal = () => {
    setEditingPatientId(null);
    setIsEditEnabled(true);
    setProfileTab('profile');
    setPatientProfile({ patient: null, visitHistory: [] });
    setForm({
      ...emptyPatientForm,
      lastVisit: new Date().toISOString().slice(0, 10),
      createdBranchName: defaultCreatedBranchName,
      emergencyContacts: [createEmergencyContact()],
    });
    setIsModalOpen(true);
  };

  const openEditModal = (patient) => {
    if (!auth.canDoAction('edit_patient')) {
      return;
    }

    setEditingPatientId(patient.id);
    setIsEditEnabled(false);
    setProfileTab('profile');
    setPatientProfile({ patient: null, visitHistory: [] });
    setForm({
      ...patient,
      emergencyContacts:
        patient.emergencyContacts && patient.emergencyContacts.length
          ? patient.emergencyContacts
          : [createEmergencyContact()],
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPatientId(null);
    setIsSaving(false);
    setIsEditEnabled(true);
    setProfileTab('profile');
    setPatientProfile({ patient: null, visitHistory: [] });
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleFileChange = async (event) => {
    const { name, files } = event.target;
    const file = files?.[0];

    if (!file) {
      return;
    }

    const dataUrl = await fileToDataUrl(file);
    setForm((current) => ({ ...current, [name]: dataUrl }));
  };

  const handleEmergencyContactChange = (index, field, value) => {
    setForm((current) => ({
      ...current,
      emergencyContacts: current.emergencyContacts.map((contact, contactIndex) =>
        contactIndex === index ? { ...contact, [field]: value } : contact
      ),
    }));
  };

  const addEmergencyContact = () => {
    setForm((current) => ({
      ...current,
      emergencyContacts: [...current.emergencyContacts, createEmergencyContact()],
    }));
  };

  const removeEmergencyContact = (index) => {
    setForm((current) => ({
      ...current,
      emergencyContacts:
        current.emergencyContacts.length > 1
          ? current.emergencyContacts.filter((_, contactIndex) => contactIndex !== index)
          : current.emergencyContacts,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (editingPatientId && !isEditEnabled) {
      setIsEditEnabled(true);
      return;
    }

    setIsSaving(true);

    const payload = {
      ...form,
      age: form.dob
        ? String(new Date().getFullYear() - new Date(form.dob).getFullYear())
        : form.age,
      emergencyContacts: form.emergencyContacts,
    };

    try {
      if (editingPatientId) {
        const savedPatient = await hospitalApi.updatePatient(editingPatientId, payload);
        setRecords((current) =>
          current.map((patient) => (patient.id === editingPatientId ? savedPatient : patient))
        );
        setForm(savedPatient);
        showToast('Patient record updated successfully.', 'success');
      } else {
        const createdPatient = await hospitalApi.createPatient(payload);
        setRecords((current) => [createdPatient, ...current]);
        showToast('Patient created successfully.', 'success');
      }

      closeModal();
    } catch (error) {
      setIsSaving(false);
      showToast(error.message || 'Unable to save patient.', 'error');
    }
  };

  const fieldsDisabled = Boolean(editingPatientId) && !isEditEnabled;
  const visitHistory = patientProfile.visitHistory || [];

  return (
    <div className="page-stack">
      <PageHeader
        title={pageMeta?.label || 'Patients'}
        description={pageMeta?.description || ''}
        actions={
          auth.canDoAction('create_patient') ? (
            <button type="button" className="primary-button" onClick={openCreateModal}>
              Register Patient
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
          searchPlaceholder="Search patient, phone, ID, or department"
          filters={[
            {
              label: 'Status',
              value: statusFilter,
              onChange: setStatusFilter,
              options: [
                { label: 'All statuses', value: 'all' },
                { label: 'Checked in', value: 'Checked in' },
                { label: 'In triage', value: 'In triage' },
                { label: 'With doctor', value: 'With doctor' },
                { label: 'At lab', value: 'At lab' },
                { label: 'At pharmacy', value: 'At pharmacy' },
                { label: 'At cashier', value: 'At cashier' },
                { label: 'Completed', value: 'Completed' },
              ],
            },
            {
              label: 'Gender',
              value: genderFilter,
              onChange: setGenderFilter,
              options: [
                { label: 'All genders', value: 'all' },
                { label: 'Female', value: 'Female' },
                { label: 'Male', value: 'Male' },
                { label: 'Other', value: 'Other' },
              ],
            },
            ...(activeBranches.length > 1
              ? [
                  {
                    label: 'Branch',
                    value: branchFilter,
                    onChange: setBranchFilter,
                    options: [
                      { label: 'All branches', value: 'all' },
                      ...activeBranches.map((branch) => ({ label: branch.name, value: branch.name })),
                    ],
                  },
                ]
              : []),
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
          columns={patientColumns}
          rows={filteredRecords}
          caption="Patient registry and current visit status"
          emptyMessage="No patient records match the current filters."
          onRowClick={auth.canDoAction('edit_patient') ? openEditModal : undefined}
        />
      </section>

      <Modal
        isOpen={isModalOpen}
        title={editingPatientId ? 'Patient Profile' : 'Register New Patient'}
        subtitle="Patient ID is auto-generated after creation. Department is assigned during the visit flow, not during first-time patient registration."
        onClose={closeModal}
      >
        <form className="entity-form" onSubmit={handleSubmit}>
          {editingPatientId ? (
            <Tabs
              tabs={[
                { id: 'profile', label: 'Profile' },
                { id: 'history', label: 'Visit History' },
              ]}
              activeTab={profileTab}
              onChange={setProfileTab}
            />
          ) : null}

          {profileTab === 'profile' ? (
            <>
              {editingPatientId ? (
                <div className="line-item-card form-section">
                  <ProDataGrid
                    variant="expanded"
                    items={[
                      { label: 'Patient ID', value: form.patientId },
                      { label: 'Current Status', value: form.status },
                      { label: 'Phone', value: form.phone },
                      { label: 'DOB', value: form.dob },
                      { label: 'Gender', value: form.gender },
                      { label: 'Created Branch', value: form.createdBranchName || 'Main' },
                      { label: 'Department', value: form.department || 'Not currently assigned' },
                    ]}
                  />
                </div>
              ) : null}
              {editingPatientId && !isEditEnabled ? (
                <div className="line-item-stack">
                  <div className="line-item-card form-section">
                    <div className="form-section-header">
                      <div>
                        <h4 className="form-section-title">Personal Details</h4>
                      </div>
                    </div>
                    <ProDataGrid
                      variant="expanded"
                      items={[
                        { label: 'Full Name', value: form.name },
                        { label: 'Date of Birth', value: form.dob },
                        { label: 'Gender', value: form.gender },
                        { label: 'Phone', value: form.phone },
                        { label: 'Current Status', value: form.status },
                        { label: 'Reason For Visit', value: form.visitReason },
                      ]}
                    />
                  </div>

                  <div className="line-item-card form-section">
                    <div className="form-section-header">
                      <div>
                        <h4 className="form-section-title">Emergency Contacts</h4>
                      </div>
                    </div>
                    {form.emergencyContacts.length ? (
                      <div className="line-item-stack">
                        {form.emergencyContacts.map((contact, index) => (
                          <div key={`emergency-contact-view-${index}`} className="line-item-card">
                            <ProDataGrid
                              variant="expanded"
                              items={[
                                { label: 'Contact Name', value: contact.name },
                                { label: 'Phone', value: contact.phone },
                                { label: 'Email', value: contact.email },
                                { label: 'Relationship', value: contact.relationship },
                              ]}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="panel-copy">No emergency contacts recorded yet.</p>
                    )}
                  </div>

                  <div className="line-item-card form-section">
                    <div className="form-section-header">
                      <div>
                        <h4 className="form-section-title">Identification And Files</h4>
                      </div>
                    </div>
                    <ProDataGrid
                      variant="expanded"
                      items={[
                        { label: 'ID Card Type', value: form.idCardType },
                        { label: 'ID Number', value: form.idNumber },
                        { label: 'Current Department', value: form.department || 'Not currently assigned' },
                        { label: 'Front Of ID', value: form.idFrontImage ? 'Uploaded' : 'Not uploaded' },
                        { label: 'Back Of ID', value: form.idBackImage ? 'Uploaded' : 'Not uploaded' },
                        { label: 'Client Photo', value: form.profilePhoto ? 'Uploaded' : 'Not uploaded' },
                      ]}
                    />
                  </div>
                </div>
              ) : (
              <div className="form-grid">
                <label className="form-field">
                <span>Full Name</span>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  disabled={fieldsDisabled}
                />
              </label>
                <label className="form-field">
                  <span>Date of Birth</span>
                  <input
                    type="date"
                    name="dob"
                    value={form.dob}
                    onChange={handleChange}
                    required
                    disabled={fieldsDisabled}
                  />
                </label>
                <label className="form-field">
                  <span>Gender</span>
                  <select name="gender" value={form.gender} onChange={handleChange} disabled={fieldsDisabled}>
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </label>
                {canChoosePatientBranch && !editingPatientId ? (
                  <label className="form-field">
                    <span>Patient Branch</span>
                    <select
                      name="createdBranchName"
                      value={form.createdBranchName || defaultCreatedBranchName}
                      onChange={handleChange}
                      disabled={fieldsDisabled}
                    >
                      {activeBranches.map((branch) => (
                        <option key={branch.id || branch.name} value={branch.name}>
                          {branch.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <label className="form-field">
                  <span>Phone</span>
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    required
                    disabled={fieldsDisabled}
                  />
                </label>
                <div className="form-field form-field-full">
                <div className="section-header-inline">
                  <span>Emergency Contacts</span>
                  {!fieldsDisabled ? (
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={addEmergencyContact}
                    >
                      Add Contact
                    </button>
                  ) : null}
                </div>
                <div className="line-item-stack">
                  {form.emergencyContacts.map((contact, index) => (
                    <div key={`emergency-contact-${index}`} className="line-item-card">
                      <div className="form-grid">
                        <label className="form-field">
                          <span>Contact Name</span>
                          <input
                            value={contact.name}
                            onChange={(event) =>
                              handleEmergencyContactChange(index, 'name', event.target.value)
                            }
                            required
                            disabled={fieldsDisabled}
                          />
                        </label>
                        <label className="form-field">
                          <span>Phone</span>
                          <input
                            value={contact.phone}
                            onChange={(event) =>
                              handleEmergencyContactChange(index, 'phone', event.target.value)
                            }
                            required
                            disabled={fieldsDisabled}
                          />
                        </label>
                        <label className="form-field">
                          <span>Email</span>
                          <input
                            type="email"
                            value={contact.email}
                            onChange={(event) =>
                              handleEmergencyContactChange(index, 'email', event.target.value)
                            }
                            disabled={fieldsDisabled}
                          />
                        </label>
                        <label className="form-field">
                          <span>Relationship</span>
                          <input
                            value={contact.relationship}
                            onChange={(event) =>
                              handleEmergencyContactChange(index, 'relationship', event.target.value)
                            }
                            required
                            disabled={fieldsDisabled}
                          />
                        </label>
                      </div>
                      {!fieldsDisabled && form.emergencyContacts.length > 1 ? (
                        <div className="line-item-actions">
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => removeEmergencyContact(index)}
                          >
                            Remove
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
                </div>
                <label className="form-field">
                  <span>Status</span>
                  <select name="status" value={form.status} onChange={handleChange} disabled={fieldsDisabled}>
                    <option value="Checked in">Checked in</option>
                    <option value="In triage">In triage</option>
                    <option value="With doctor">With doctor</option>
                    <option value="At lab">At lab</option>
                    <option value="At pharmacy">At pharmacy</option>
                    <option value="At cashier">At cashier</option>
                    <option value="Completed">Completed</option>
                  </select>
                </label>
                <label className="form-field">
                  <span>ID Card Type</span>
                  <select
                    name="idCardType"
                    value={form.idCardType}
                    onChange={handleChange}
                    disabled={fieldsDisabled}
                  >
                    <option value="">Select type</option>
                    <option value="National ID">National ID</option>
                    <option value="Voter Card">Voter Card</option>
                    <option value="Passport">Passport</option>
                    <option value="Driver License">Driver License</option>
                  </select>
                </label>
                <label className="form-field">
                  <span>ID Number</span>
                  <input name="idNumber" value={form.idNumber} onChange={handleChange} disabled={fieldsDisabled} />
                </label>
                <label className="form-field">
                  <span>Front of ID</span>
                  <input
                    type="file"
                    accept="image/*"
                    name="idFrontImage"
                    onChange={handleFileChange}
                    disabled={fieldsDisabled}
                  />
                </label>
                <label className="form-field">
                  <span>Back of ID</span>
                  <input
                    type="file"
                    accept="image/*"
                    name="idBackImage"
                    onChange={handleFileChange}
                    disabled={fieldsDisabled}
                  />
                </label>
                <label className="form-field">
                  <span>Client Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    name="profilePhoto"
                    onChange={handleFileChange}
                    disabled={fieldsDisabled}
                  />
                </label>
                <label className="form-field form-field-full">
                  <span>Reason for Visit</span>
                  <textarea
                    name="visitReason"
                    rows="4"
                    value={form.visitReason}
                    onChange={handleChange}
                    required
                    disabled={fieldsDisabled}
                  />
                </label>
              </div>
              )}
            </>
          ) : (
            <div className="line-item-stack">
              {isLoadingProfile ? <p className="panel-copy">Loading visit history...</p> : null}

              {!isLoadingProfile ? (
                <>
                  <div className="line-item-card form-section">
                    <ProDataGrid
                      variant="expanded"
                      items={[
                        { label: 'Patient ID', value: form.patientId },
                        { label: 'Current Status', value: form.status },
                        { label: 'Phone', value: form.phone },
                        { label: 'DOB', value: form.dob },
                        { label: 'Gender', value: form.gender },
                        { label: 'Created Branch', value: form.createdBranchName || 'Main' },
                        { label: 'Department', value: form.department || 'Not currently assigned' },
                        { label: 'Department', value: form.department || 'Not currently assigned' },
                      ]}
                    />
                  </div>
                  <div className="stats-grid stats-grid-compact">
                    <StatCard label="Total Visits" value={visitHistory.length} />
                    <StatCard
                      label="Open Visits"
                      value={visitHistory.filter((visit) => visit.stage !== 'Closed').length}
                    />
                    <StatCard
                      label="Recorded Conditions"
                      value={visitHistory.filter((visit) => (visit.medicalConditions || []).length).length}
                    />
                  </div>

                  <DataTable
                    columns={visitHistoryColumns}
                    rows={visitHistory}
                    caption="Visit-by-visit medical history for this patient"
                    emptyMessage="No visit history has been recorded for this patient yet."
                  />
                </>
              ) : null}
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={closeModal}>
              {profileTab === 'history' ? 'Close' : 'Cancel'}
            </button>
            {profileTab === 'profile' ? (
              <button type="submit" className="primary-button" disabled={isSaving}>
                {isSaving
                  ? 'Saving...'
                  : editingPatientId
                    ? isEditEnabled
                      ? 'Save'
                      : 'Edit'
                    : 'Create Patient'}
              </button>
            ) : (
              <button type="button" className="primary-button" onClick={() => setProfileTab('profile')}>
                Back to Profile
              </button>
            )}
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default PatientsPage;
