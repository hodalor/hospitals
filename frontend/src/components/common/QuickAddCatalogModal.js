import { useEffect, useMemo, useState } from 'react';
import { hospitalApi } from '../../api/hospitalApi';
import { useToast } from '../../app/ToastContext';
import { buildCatalogCode, catalogModuleConfig } from '../../utils/catalogDefinitions';
import Modal from './Modal';

const sectionPrefixes = {
  pharmacy_medications: 'MED',
  services_conditions: 'CON',
  services_diagnoses: 'DIA',
  services_lab: 'LAB',
  services_administrative: 'ADM',
};

function QuickAddCatalogModal({
  sectionId,
  departments,
  isOpen,
  onClose,
  onCreated,
}) {
  const config = catalogModuleConfig[sectionId];
  const { showToast } = useToast();
  const emptyForm = useMemo(
    () => ({
      name: '',
      category: config?.categoryOptions?.[0] || '',
      brand: '',
      department: '',
    }),
    [config]
  );
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  const departmentOptions = useMemo(
    () =>
      (departments || [])
        .filter((department) => department.isActive)
        .sort((left, right) => left.name.localeCompare(right.name)),
    [departments]
  );

  useEffect(() => {
    if (isOpen) {
      setForm(emptyForm);
      setIsSaving(false);
    }
  }, [emptyForm, isOpen]);

  if (!config) {
    return null;
  }

  const resetAndClose = () => {
    setForm(emptyForm);
    setIsSaving(false);
    onClose();
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      const payload = {
        itemType: config.itemType,
        catalogSection: config.catalogSection,
        category: form.category,
        code: buildCatalogCode(sectionPrefixes[sectionId], form.name),
        name: form.name,
        brand: sectionId === 'pharmacy_medications' ? form.brand : '',
        department:
          sectionId === 'pharmacy_medications' ? 'Pharmacy' : form.department,
        unitPrice: 0,
        stockQuantity: sectionId === 'pharmacy_medications' ? 0 : 0,
        notes: 'Quick-added from visit/workflow lookup.',
        isActive: true,
      };

      const createdItem = await hospitalApi.createPricingItem(payload);
      if (onCreated) {
        onCreated(createdItem);
      }
      showToast(`${config.title} updated successfully.`, 'success');
      resetAndClose();
    } catch (error) {
      setIsSaving(false);
      showToast(error.message || 'Unable to add catalog item.', 'error');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      title={config.quickAddTitle}
      subtitle="Add the missing item once so the rest of the system can reuse it by lookup."
      onClose={resetAndClose}
    >
      <form className="entity-form" onSubmit={handleSubmit}>
        <div className="form-grid">
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
          {sectionId === 'pharmacy_medications' ? (
            <label className="form-field">
              <span>Brand</span>
              <input name="brand" value={form.brand} onChange={handleChange} />
            </label>
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
        </div>

        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={resetAndClose}>
            Cancel
          </button>
          <button type="submit" className="primary-button" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Add To Catalog'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default QuickAddCatalogModal;
