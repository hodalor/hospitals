import { useEffect, useMemo, useState } from 'react';
import { hospitalApi } from '../api/hospitalApi';
import { useToast } from '../app/ToastContext';
import {
  getTenantPermissionScope,
  roleTemplates,
} from '../app/permissions';
import Modal from '../components/common/Modal';
import PageHeader from '../components/common/PageHeader';
import SectionCard from '../components/common/SectionCard';
import StatCard from '../components/common/StatCard';
import TableToolbar from '../components/common/TableToolbar';
import DataTable from '../components/tables/DataTable';

const userColumns = [
  { key: 'fullName', header: 'Full Name' },
  { key: 'username', header: 'Username' },
  { key: 'role', header: 'Role' },
  { key: 'branchName', header: 'Branch' },
  { key: 'department', header: 'Department' },
  {
    key: 'menuPermissions',
    header: 'Menus',
    render: (value, row) => (row.isSuperAdmin ? 'All' : String(value.length)),
  },
  {
    key: 'dataPermissions',
    header: 'Data',
    render: (value, row) => (row.isSuperAdmin ? 'All' : String(value.length)),
  },
  {
    key: 'actionPermissions',
    header: 'Actions',
    render: (value, row) => (row.isSuperAdmin ? 'All' : String(value.length)),
  },
  {
    key: 'queuePermissions',
    header: 'Queues',
    render: (value, row) => (row.isSuperAdmin ? 'All' : String((value || []).length)),
  },
  {
    key: 'isActive',
    header: 'Status',
    render: (value) => (value ? 'Active' : 'Inactive'),
  },
];

const emptyUserForm = {
  id: '',
  fullName: '',
  username: '',
  password: '',
  role: 'Admin',
  department: '',
  branchName: 'Main',
  menuPermissions: [],
  dataPermissions: [],
  actionPermissions: [],
  queuePermissions: [],
  isSuperAdmin: false,
  isActive: true,
};

const queuePermissionLabels = {
  cashier: 'Cashier desk',
  doctor: 'Doctor desk',
  lab: 'Laboratory desk',
  pharmacy: 'Pharmacy desk',
};

function UsersPage({ data, auth, users, departments, branches, onUsersChange, pageMeta }) {
  const [records, setRecords] = useState(data.records || []);
  const [searchValue, setSearchValue] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [form, setForm] = useState(emptyUserForm);
  const [editingUserId, setEditingUserId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    setRecords(users);
  }, [users]);

  const activeDepartments = useMemo(
    () =>
      (departments || [])
        .filter((department) => department.isActive)
        .sort((left, right) => left.name.localeCompare(right.name)),
    [departments]
  );

  const defaultDepartmentName = activeDepartments[0]?.name || '';
  const activeBranches = useMemo(
    () =>
      (branches || [])
        .filter((branch) => branch.isActive !== false)
        .sort((left, right) => left.name.localeCompare(right.name)),
    [branches]
  );
  const defaultBranchName = auth.currentUser?.canAccessAllBranches
    ? activeBranches[0]?.name || auth.currentUser?.branchName || 'Main'
    : auth.currentUser?.branchName || 'Main';
  const tenantPermissionScope = useMemo(
    () => getTenantPermissionScope(auth.currentUser),
    [auth.currentUser]
  );
  const canCreateSuperAdmin = Boolean(auth.currentUser?.isMasterTenant && auth.currentUser?.isSuperAdmin);
  const visibleRoleOptions = useMemo(
    () => Object.keys(roleTemplates).filter((role) => canCreateSuperAdmin || role !== 'Super Admin'),
    [canCreateSuperAdmin]
  );
  const allowedMenuOptions = tenantPermissionScope.menuPermissions;
  const allowedDataOptions = tenantPermissionScope.dataPermissions;
  const allowedActionOptions = tenantPermissionScope.actionPermissions;
  const allowedQueueOptions = tenantPermissionScope.queuePermissions;

  const clampFormPermissionsToScope = (nextForm) => ({
    ...nextForm,
    isSuperAdmin: canCreateSuperAdmin ? nextForm.isSuperAdmin : false,
    menuPermissions: (nextForm.menuPermissions || []).filter((permission) =>
      allowedMenuOptions.includes(permission)
    ),
    dataPermissions: (nextForm.dataPermissions || []).filter((permission) =>
      allowedDataOptions.includes(permission)
    ),
    actionPermissions: (nextForm.actionPermissions || []).filter((permission) =>
      allowedActionOptions.includes(permission)
    ),
    queuePermissions: (nextForm.queuePermissions || []).filter((permission) =>
      allowedQueueOptions.includes(permission)
    ),
  });

  const filteredRecords = useMemo(
    () =>
      records.filter((user) => {
        const matchesSearch = [user.fullName, user.username, user.role, user.branchName]
          .concat(user.department || '')
          .join(' ')
          .toLowerCase()
          .includes(searchValue.toLowerCase());
        const matchesRole = roleFilter === 'all' || user.role === roleFilter;
        return matchesSearch && matchesRole;
      }),
    [records, searchValue, roleFilter]
  );

  const summaryCards = useMemo(
    () => [
      { label: 'Users', value: records.length },
      { label: 'Super Admins', value: records.filter((item) => item.isSuperAdmin).length },
      { label: 'Active', value: records.filter((item) => item.isActive).length },
    ],
    [records]
  );

  if (!auth.canDoAction('manage_users')) {
    return (
      <SectionCard eyebrow="Access control" title="User management is restricted">
        <p className="panel-copy">Only authorized accounts can manage users and permissions.</p>
      </SectionCard>
    );
  }

  const applyRoleTemplate = (role) => {
    const template = roleTemplates[role] || roleTemplates.Admin;
    setForm((current) =>
      clampFormPermissionsToScope({
        ...current,
        role,
        department:
          template.isSuperAdmin && canCreateSuperAdmin
            ? 'System'
            : current.department && activeDepartments.some((item) => item.name === current.department)
              ? current.department
              : defaultDepartmentName,
        branchName:
          template.isSuperAdmin && canCreateSuperAdmin
            ? 'Main'
            : current.branchName && activeBranches.some((item) => item.name === current.branchName)
              ? current.branchName
              : defaultBranchName,
        isSuperAdmin: canCreateSuperAdmin && template.isSuperAdmin,
        menuPermissions: template.menuPermissions[0] === '*' ? [] : template.menuPermissions,
        dataPermissions: template.dataPermissions[0] === '*' ? [] : template.dataPermissions,
        actionPermissions: template.actionPermissions[0] === '*' ? [] : template.actionPermissions,
        queuePermissions: template.queuePermissions?.[0] === '*' ? [] : template.queuePermissions || [],
      })
    );
  };

  const openCreateModal = () => {
    setEditingUserId(null);
    setForm(
      clampFormPermissionsToScope({
        ...emptyUserForm,
        role: 'Admin',
        department: defaultDepartmentName,
        branchName: defaultBranchName,
        ...roleTemplates.Admin,
        password: '0903',
      })
    );
    setIsModalOpen(true);
  };

  const openEditModal = (user) => {
    setEditingUserId(user.id);
    setForm(
      clampFormPermissionsToScope({
        ...user,
        password: '',
        menuPermissions: user.menuPermissions[0] === '*' ? [] : user.menuPermissions,
        dataPermissions: user.dataPermissions[0] === '*' ? [] : user.dataPermissions,
        actionPermissions: user.actionPermissions[0] === '*' ? [] : user.actionPermissions,
        queuePermissions: user.queuePermissions?.[0] === '*' ? [] : user.queuePermissions || [],
      })
    );
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setEditingUserId(null);
    setIsModalOpen(false);
    setIsSaving(false);
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    const nextValue = type === 'checkbox' ? checked : value;
    setForm((current) =>
      clampFormPermissionsToScope({
        ...current,
        [name]: nextValue,
        ...(name === 'isSuperAdmin'
          ? {
              department:
                checked && canCreateSuperAdmin ? 'System' : current.department || defaultDepartmentName,
            }
          : {}),
      })
    );
  };

  const handlePermissionToggle = (field, permission) => {
    setForm((current) =>
      clampFormPermissionsToScope({
        ...current,
        [field]: current[field].includes(permission)
          ? current[field].filter((item) => item !== permission)
          : [...current[field], permission],
      })
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);

    const payload = {
      ...form,
      menuPermissions: form.isSuperAdmin ? ['*'] : form.menuPermissions,
      dataPermissions: form.isSuperAdmin ? ['*'] : form.dataPermissions,
      actionPermissions: form.isSuperAdmin ? ['*'] : form.actionPermissions,
      queuePermissions: form.isSuperAdmin ? ['*'] : form.queuePermissions,
    };

    try {
      let updatedUsers;

      if (editingUserId) {
        const savedUser = await hospitalApi.updateUser(editingUserId, payload);
        updatedUsers = records.map((item) => (item.id === editingUserId ? savedUser : item));
        showToast('User updated successfully.', 'success');
      } else {
        const createdUser = await hospitalApi.createUser(payload);
        updatedUsers = [createdUser, ...records];
        showToast('User created successfully.', 'success');
      }

      setRecords(updatedUsers);
      onUsersChange(updatedUsers);
      closeModal();
    } catch (error) {
      setIsSaving(false);
      showToast(error.message || 'Unable to save user.', 'error');
    }
  };

  return (
    <div className="page-stack">
      <PageHeader
        title={pageMeta?.label || 'Users'}
        description={pageMeta?.description || ''}
        actions={
          <button type="button" className="primary-button" onClick={openCreateModal}>
            Create User
          </button>
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
          searchPlaceholder="Search full name, username, or role"
          filters={[
            {
              label: 'Role',
              value: roleFilter,
              onChange: setRoleFilter,
              options: [
                { label: 'All roles', value: 'all' },
                ...visibleRoleOptions.map((role) => ({ label: role, value: role })),
              ],
            },
          ]}
        />

        <DataTable
          columns={userColumns}
          rows={filteredRecords}
          caption="Click a user row to update menus, data access, and actions."
          onRowClick={openEditModal}
        />
      </section>

      <Modal
        isOpen={isModalOpen}
        title={editingUserId ? 'Edit User Account' : 'Create User Account'}
        subtitle="Permissions stay granular, but tenant accounts can assign only from the modules enabled for their hospital."
        onClose={closeModal}
      >
        <form className="entity-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label className="form-field">
              <span>Full Name</span>
              <input name="fullName" value={form.fullName} onChange={handleChange} required />
            </label>
            <label className="form-field">
              <span>Username</span>
              <input name="username" value={form.username} onChange={handleChange} required />
            </label>
            <label className="form-field">
              <span>Password</span>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder={editingUserId ? 'Leave blank to keep current password' : ''}
                required={!editingUserId}
              />
            </label>
            <label className="form-field">
              <span>Role</span>
              <select
                name="role"
                value={form.role}
                onChange={(event) => applyRoleTemplate(event.target.value)}
              >
                {visibleRoleOptions.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span>Branch</span>
              <select
                name="branchName"
                value={form.branchName}
                onChange={handleChange}
                disabled={!auth.currentUser?.canAccessAllBranches}
                required
              >
                {activeBranches.map((branch) => (
                  <option key={branch.id || branch.name} value={branch.name}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span>Department</span>
              <select
                name="department"
                value={form.isSuperAdmin ? 'System' : form.department}
                onChange={handleChange}
                disabled={form.isSuperAdmin}
                required={!form.isSuperAdmin}
              >
                {form.isSuperAdmin ? <option value="System">System</option> : null}
                {!form.isSuperAdmin ? <option value="">Select department</option> : null}
                {!form.isSuperAdmin
                  ? activeDepartments.map((department) => (
                      <option key={department.id} value={department.name}>
                        {department.name}
                      </option>
                    ))
                  : null}
              </select>
            </label>
            <label className="form-field">
              <span>Super Admin</span>
              <input
                type="checkbox"
                name="isSuperAdmin"
                checked={form.isSuperAdmin}
                onChange={handleChange}
                disabled={!canCreateSuperAdmin}
              />
            </label>
            <label className="form-field">
              <span>Active</span>
              <input type="checkbox" name="isActive" checked={form.isActive} onChange={handleChange} />
            </label>
          </div>

          {!form.isSuperAdmin ? (
            activeDepartments.length ? (
              <div className="permission-grid">
                <div className="permission-group">
                  <strong>Sidebar Menus</strong>
                  {allowedMenuOptions.map((permission) => (
                    <label key={permission} className="permission-item">
                      <input
                        type="checkbox"
                        checked={form.menuPermissions.includes(permission)}
                        onChange={() => handlePermissionToggle('menuPermissions', permission)}
                      />
                      <span>{permission}</span>
                    </label>
                  ))}
                </div>

                <div className="permission-group">
                  <strong>Data Access</strong>
                  {allowedDataOptions.map((permission) => (
                    <label key={permission} className="permission-item">
                      <input
                        type="checkbox"
                        checked={form.dataPermissions.includes(permission)}
                        onChange={() => handlePermissionToggle('dataPermissions', permission)}
                      />
                      <span>{permission}</span>
                    </label>
                  ))}
                </div>

                <div className="permission-group">
                  <strong>Actions</strong>
                  {allowedActionOptions.map((permission) => (
                    <label key={permission} className="permission-item">
                      <input
                        type="checkbox"
                        checked={form.actionPermissions.includes(permission)}
                        onChange={() => handlePermissionToggle('actionPermissions', permission)}
                      />
                      <span>{permission}</span>
                    </label>
                  ))}
                </div>

                <div className="permission-group">
                  <strong>Operational Queues</strong>
                  {allowedQueueOptions.map((permission) => (
                    <label key={permission} className="permission-item">
                      <input
                        type="checkbox"
                        checked={form.queuePermissions.includes(permission)}
                        onChange={() => handlePermissionToggle('queuePermissions', permission)}
                      />
                      <span>{queuePermissionLabels[permission] || permission}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <SectionCard eyebrow="Department setup" title="Create departments first">
                <p className="panel-copy">
                  Pre-create active departments before assigning non-superadmin staff accounts.
                </p>
              </SectionCard>
            )
          ) : (
            <SectionCard eyebrow="God mode" title="Super admin has full access">
              <p className="panel-copy">
                This account can access all present and future menus, data scopes, and actions.
              </p>
            </SectionCard>
          )}

          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={closeModal}>
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={isSaving}>
              {isSaving ? 'Saving...' : editingUserId ? 'Save User' : 'Create User'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default UsersPage;
