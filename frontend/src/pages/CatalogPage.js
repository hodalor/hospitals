import { useEffect, useMemo, useState } from 'react';
import { hospitalApi } from '../api/hospitalApi';
import { useToast } from '../app/ToastContext';
import Modal from '../components/common/Modal';
import PageHeader from '../components/common/PageHeader';
import SectionCard from '../components/common/SectionCard';
import StatCard from '../components/common/StatCard';
import TableToolbar from '../components/common/TableToolbar';
import DataTable from '../components/tables/DataTable';
import Tabs from '../components/common/Tabs';
import {
  administrativeCategories,
  conditionCategories,
  diagnosisCategories,
  financePricingSections,
  labCategories,
  medicationCategories,
} from '../utils/catalogDefinitions';
const catalogConfig = {
  pharmacy_medications: {
    eyebrow: 'Pharmacy',
    title: 'Medication stock and pricing',
    description: 'Maintain the medicines available for dispensing, including price, stock, brand, and medication class.',
    actionLabel: 'Add Medication',
    itemType: 'Medication',
    catalogSection: 'Medication',
    categoryOptions: medicationCategories,
    columns: [
      { key: 'code', header: 'Code' },
      { key: 'name', header: 'Medication' },
      { key: 'brand', header: 'Brand' },
      { key: 'category', header: 'Category' },
      { key: 'stockQuantity', header: 'Stock' },
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
    ],
  },
  services_conditions: {
    eyebrow: 'Services',
    title: 'Medical condition pricing',
    description: 'List medical conditions or care packages that have a standard service price.',
    actionLabel: 'Add Condition',
    itemType: 'Service',
    catalogSection: 'Medical Condition',
    categoryOptions: conditionCategories,
    columns: [
      { key: 'code', header: 'Code' },
      { key: 'name', header: 'Condition / Service' },
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
    ],
  },
  services_diagnoses: {
    eyebrow: 'Services',
    title: 'Diagnosis catalog',
    description: 'Maintain a reusable diagnosis list doctors can search during consultations and add to when needed.',
    actionLabel: 'Add Diagnosis',
    itemType: 'Service',
    catalogSection: 'Diagnosis',
    categoryOptions: diagnosisCategories,
    columns: [
      { key: 'code', header: 'Code' },
      { key: 'name', header: 'Diagnosis' },
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
    ],
  },
  services_lab: {
    eyebrow: 'Services',
    title: 'Lab test price list',
    description: 'Keep a clean list of tests the facility runs and the price staff should charge for each one.',
    actionLabel: 'Add Lab Test',
    itemType: 'Service',
    catalogSection: 'Lab Test',
    categoryOptions: labCategories,
    columns: [
      { key: 'code', header: 'Code' },
      { key: 'name', header: 'Lab Test' },
      { key: 'category', header: 'Category' },
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
    ],
  },
  services_administrative: {
    eyebrow: 'Services',
    title: 'Administrative service pricing',
    description: 'Manage consultation, admission, bed charges, and other administrative fees in one place.',
    actionLabel: 'Add Administrative Service',
    itemType: 'Service',
    catalogSection: 'Administrative',
    categoryOptions: administrativeCategories,
    columns: [
      { key: 'code', header: 'Code' },
      { key: 'name', header: 'Service' },
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
    ],
  },
};

const emptyForm = {
  id: '',
  itemType: 'Service',
  catalogSection: 'Administrative',
  category: '',
  code: '',
  name: '',
  brand: '',
  department: '',
  unitPrice: '',
  stockQuantity: 0,
  notes: '',
  isActive: true,
};

function CatalogPage({ data, auth, departments, activeModuleId, pageMeta }) {
  const [selectedSectionId, setSelectedSectionId] = useState(
    activeModuleId === 'finance_pricing' ? financePricingSections[0].id : activeModuleId
  );
  const resolvedModuleId = activeModuleId === 'finance_pricing' ? selectedSectionId : activeModuleId;
  const config = catalogConfig[resolvedModuleId] || catalogConfig.services_administrative;
  const [records, setRecords] = useState(data.records || []);
  const [form, setForm] = useState({
    ...emptyForm,
    itemType: config.itemType,
    catalogSection: config.catalogSection,
    category: config.categoryOptions[0] || '',
  });
  const [editingItemId, setEditingItemId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { showToast } = useToast();

  useEffect(() => {
    if (activeModuleId === 'finance_pricing') {
      setSelectedSectionId((current) =>
        financePricingSections.some((section) => section.id === current)
          ? current
          : financePricingSections[0].id
      );
      return;
    }

    setSelectedSectionId(activeModuleId);
  }, [activeModuleId]);

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

  const scopedRecords = useMemo(
    () =>
      records.filter((item) => {
        if (config.itemType === 'Medication') {
          return item.itemType === 'Medication';
        }

        return item.itemType === 'Service' && item.catalogSection === config.catalogSection;
      }),
    [config.catalogSection, config.itemType, records]
  );

  const filteredRecords = useMemo(
    () =>
      scopedRecords.filter((item) => {
        const matchesSearch = [item.code, item.name, item.category, item.brand, item.department]
          .join(' ')
          .toLowerCase()
          .includes(searchValue.toLowerCase());
        const matchesStatus =
          statusFilter === 'all' || (statusFilter === 'active' ? item.isActive : !item.isActive);
        return matchesSearch && matchesStatus;
      }),
    [scopedRecords, searchValue, statusFilter]
  );

  const summaryCards = useMemo(
    () => [
      { label: 'Items', value: scopedRecords.length },
      { label: 'Active', value: scopedRecords.filter((item) => item.isActive).length },
      {
        label: config.itemType === 'Medication' ? 'Total Stock' : 'Categories',
        value:
          config.itemType === 'Medication'
            ? scopedRecords.reduce((sum, item) => sum + Number(item.stockQuantity || 0), 0)
            : new Set(scopedRecords.map((item) => item.category).filter(Boolean)).size,
      },
    ],
    [config.itemType, scopedRecords]
  );

  if (!auth.canViewData('pricing_records')) {
    return (
      <SectionCard eyebrow="Access control" title="Catalog access is restricted">
        <p className="panel-copy">The active user cannot view this catalog.</p>
      </SectionCard>
    );
  }

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItemId(null);
    setIsSaving(false);
    setForm({
      ...emptyForm,
      itemType: config.itemType,
      catalogSection: config.catalogSection,
      category: config.categoryOptions[0] || '',
    });
  };

  const openCreateModal = () => {
    setEditingItemId(null);
    setForm({
      ...emptyForm,
      itemType: config.itemType,
      catalogSection: config.catalogSection,
      category: config.categoryOptions[0] || '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    if (!auth.canDoAction('manage_pricing')) {
      return;
    }

    setEditingItemId(item.id);
    setForm({
      ...emptyForm,
      ...item,
      itemType: config.itemType,
      catalogSection: config.catalogSection,
      unitPrice: String(item.unitPrice ?? ''),
      stockQuantity: Number(item.stockQuantity || 0),
    });
    setIsModalOpen(true);
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
      const payload = {
        ...form,
        itemType: config.itemType,
        catalogSection: config.catalogSection,
      };

      if (editingItemId) {
        const savedItem = await hospitalApi.updatePricingItem(editingItemId, payload);
        setRecords((current) => current.map((item) => (item.id === editingItemId ? savedItem : item)));
        showToast('Catalog item updated successfully.', 'success');
      } else {
        const createdItem = await hospitalApi.createPricingItem(payload);
        setRecords((current) => [createdItem, ...current]);
        showToast('Catalog item created successfully.', 'success');
      }

      closeModal();
    } catch (error) {
      setIsSaving(false);
      showToast(error.message || 'Unable to save catalog item.', 'error');
    }
  };

  return (
    <div className="page-stack">
      <PageHeader
        title={pageMeta?.label || config.title}
        description={pageMeta?.description || ''}
        actions={
          auth.canDoAction('manage_pricing') ? (
            <button type="button" className="primary-button" onClick={openCreateModal}>
              {config.actionLabel}
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
        {activeModuleId === 'finance_pricing' ? (
          <Tabs tabs={financePricingSections} activeTab={selectedSectionId} onChange={setSelectedSectionId} />
        ) : null}
        <TableToolbar
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder="Search code, item, category, brand, or department"
          filters={[
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
          columns={config.columns}
          rows={filteredRecords}
          caption={config.description}
          emptyMessage="No catalog items match the current filters."
          onRowClick={auth.canDoAction('manage_pricing') ? openEditModal : undefined}
        />
      </section>

      <Modal
        isOpen={isModalOpen}
        title={editingItemId ? `Edit ${config.title}` : config.actionLabel}
        subtitle="Keep this catalog current so the rest of the system can reuse the same live pricing."
        onClose={closeModal}
      >
        <form className="entity-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label className="form-field">
              <span>Code</span>
              <input name="code" value={form.code} onChange={handleChange} required />
            </label>
            <label className="form-field">
              <span>Name</span>
              <input name="name" value={form.name} onChange={handleChange} required />
            </label>
            <label className="form-field">
              <span>Category</span>
              <select name="category" value={form.category} onChange={handleChange} required>
                {config.categoryOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            {config.itemType === 'Medication' ? (
              <>
                <label className="form-field">
                  <span>Brand</span>
                  <input name="brand" value={form.brand} onChange={handleChange} />
                </label>
                <label className="form-field">
                  <span>Stock</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    name="stockQuantity"
                    value={form.stockQuantity}
                    onChange={handleChange}
                    required
                  />
                </label>
              </>
            ) : (
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
            )}
            <label className="form-field">
              <span>Price</span>
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
              {isSaving ? 'Saving...' : editingItemId ? 'Save Item' : 'Create Item'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default CatalogPage;
