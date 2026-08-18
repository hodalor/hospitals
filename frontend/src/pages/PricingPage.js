import { useEffect, useMemo, useState } from 'react';
import { hospitalApi } from '../api/hospitalApi';
import { useToast } from '../app/ToastContext';
import Modal from '../components/common/Modal';
import SectionCard from '../components/common/SectionCard';
import StatCard from '../components/common/StatCard';
import TableToolbar from '../components/common/TableToolbar';
import DataTable from '../components/tables/DataTable';

const pricingColumns = [
  { key: 'code', header: 'Code' },
  { key: 'name', header: 'Item' },
  { key: 'itemType', header: 'Type', badge: true },
  { key: 'category', header: 'Category' },
  { key: 'department', header: 'Department' },
  {
    key: 'unitPrice',
    header: 'Price',
    render: (value) => Number(value || 0).toLocaleString(),
  },
  {
    key: 'isActive',
    header: 'Status',
    render: (value) => (value ? 'Active' : 'Inactive'),
    badge: true,
  },
];

const emptyPricingForm = {
  id: '',
  itemType: 'Service',
  category: 'Consultation',
  code: '',
  name: '',
  department: '',
  unitPrice: '',
  notes: '',
  isActive: true,
};

function PricingPage({ data, auth, departments }) {
  const [records, setRecords] = useState(data.records || []);
  const [form, setForm] = useState(emptyPricingForm);
  const [editingItemId, setEditingItemId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const { showToast } = useToast();

  useEffect(() => {
    setRecords(data.records || []);
  }, [data.records]);

  const departmentOptions = useMemo(
    () =>
      (departments || [])
        .filter((department) => department.isActive)
        .sort((left, right) => left.name.localeCompare(right.name)),
    [departments]
  );

  const filteredRecords = useMemo(
    () =>
      records.filter((item) => {
        const matchesSearch = [item.code, item.name, item.category, item.department]
          .join(' ')
          .toLowerCase()
          .includes(searchValue.toLowerCase());
        const matchesType = typeFilter === 'all' || item.itemType === typeFilter;
        const matchesStatus =
          statusFilter === 'all' || (statusFilter === 'active' ? item.isActive : !item.isActive);
        return matchesSearch && matchesType && matchesStatus;
      }),
    [records, searchValue, typeFilter, statusFilter]
  );

  const summaryCards = useMemo(
    () => [
      { label: 'Catalog Items', value: records.length },
      { label: 'Services', value: records.filter((item) => item.itemType === 'Service').length },
      { label: 'Medications', value: records.filter((item) => item.itemType === 'Medication').length },
    ],
    [records]
  );

  if (!auth.canViewData('pricing_records')) {
    return (
      <SectionCard eyebrow="Access control" title="Pricing is restricted">
        <p className="panel-copy">The active user cannot view the pricing catalog.</p>
      </SectionCard>
    );
  }

  const openCreateModal = () => {
    setEditingItemId(null);
    setForm(emptyPricingForm);
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    if (!auth.canDoAction('manage_pricing')) {
      return;
    }

    setEditingItemId(item.id);
    setForm({
      ...emptyPricingForm,
      ...item,
      unitPrice: String(item.unitPrice ?? ''),
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItemId(null);
    setIsSaving(false);
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      if (editingItemId) {
        const savedItem = await hospitalApi.updatePricingItem(editingItemId, form);
        setRecords((current) =>
          current.map((item) => (item.id === editingItemId ? savedItem : item))
        );
        showToast('Pricing item updated successfully.', 'success');
      } else {
        const createdItem = await hospitalApi.createPricingItem(form);
        setRecords((current) => [createdItem, ...current]);
        showToast('Pricing item created successfully.', 'success');
      }

      closeModal();
    } catch (error) {
      setIsSaving(false);
      showToast(error.message || 'Unable to save pricing item.', 'error');
    }
  };

  return (
    <div className="page-stack">
      {auth.canDoAction('manage_pricing') ? (
        <div className="page-header-actions">
          <button type="button" className="primary-button" onClick={openCreateModal}>
            Add Price Item
          </button>
        </div>
      ) : null}

      <div className="stats-grid stats-grid-compact">
        {summaryCards.map((item) => (
          <StatCard key={item.label} {...item} />
        ))}
      </div>

      <section className="panel">
        <TableToolbar
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder="Search code, item, category, or department"
          filters={[
            {
              label: 'Type',
              value: typeFilter,
              onChange: setTypeFilter,
              options: [
                { label: 'All types', value: 'all' },
                { label: 'Service', value: 'Service' },
                { label: 'Medication', value: 'Medication' },
              ],
            },
            {
              label: 'Status',
              value: statusFilter,
              onChange: setStatusFilter,
              options: [
                { label: 'All statuses', value: 'all' },
                { label: 'Active', value: 'active' },
                { label: 'Inactive', value: 'inactive' },
              ],
            },
          ]}
        />

        <DataTable
          columns={pricingColumns}
          rows={filteredRecords}
          caption="Pricing catalog for services and medications"
          emptyMessage="No pricing items match the current filters."
          onRowClick={auth.canDoAction('manage_pricing') ? openEditModal : undefined}
        />
      </section>

      <Modal
        isOpen={isModalOpen}
        title={editingItemId ? 'Edit Price Item' : 'Create Price Item'}
        subtitle="These items can be reused across billing, cashier, pharmacy, and workflow pricing."
        onClose={closeModal}
      >
        <form className="entity-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label className="form-field">
              <span>Type</span>
              <select name="itemType" value={form.itemType} onChange={handleChange}>
                <option value="Service">Service</option>
                <option value="Medication">Medication</option>
              </select>
            </label>
            <label className="form-field">
              <span>Category</span>
              <input name="category" value={form.category} onChange={handleChange} required />
            </label>
            <label className="form-field">
              <span>Code</span>
              <input name="code" value={form.code} onChange={handleChange} required />
            </label>
            <label className="form-field">
              <span>Name</span>
              <input name="name" value={form.name} onChange={handleChange} required />
            </label>
            <label className="form-field">
              <span>Department</span>
              <select name="department" value={form.department} onChange={handleChange}>
                <option value="">General</option>
                {departmentOptions.map((department) => (
                  <option key={department.id} value={department.name}>
                    {department.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span>Unit Price</span>
              <input
                type="number"
                min="0"
                step="0.01"
                name="unitPrice"
                value={form.unitPrice}
                onChange={handleChange}
                required
              />
            </label>
            <label className="form-field">
              <span>Active</span>
              <input type="checkbox" name="isActive" checked={form.isActive} onChange={handleChange} />
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
              {isSaving ? 'Saving...' : editingItemId ? 'Save Price Item' : 'Create Price Item'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default PricingPage;
