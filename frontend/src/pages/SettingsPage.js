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

const departmentColumns = [
  { key: 'name', header: 'Department' },
  { key: 'code', header: 'Code' },
  { key: 'category', header: 'Category' },
  {
    key: 'supportsQueue',
    header: 'Queue',
    render: (value) => (value ? 'Enabled' : 'No'),
  },
  {
    key: 'staffCount',
    header: 'Staff',
    render: (value) => String(value || 0),
  },
  {
    key: 'isActive',
    header: 'Status',
    render: (value) => (value ? 'Active' : 'Inactive'),
    badge: true,
  },
];

const categoryColumns = [
  { key: 'name', header: 'Category' },
  {
    key: 'departmentCount',
    header: 'Departments',
    render: (value) => String(value || 0),
  },
  { key: 'description', header: 'Description' },
  {
    key: 'isActive',
    header: 'Status',
    render: (value) => (value ? 'Active' : 'Inactive'),
    badge: true,
  },
];

const branchColumns = [
  { key: 'name', header: 'Branch' },
  { key: 'code', header: 'Code' },
  { key: 'location', header: 'Location' },
  { key: 'phoneNumbers', header: 'Phone' },
  {
    key: 'isMain',
    header: 'Main',
    render: (value) => (value ? 'Main' : 'No'),
    badge: true,
  },
  {
    key: 'isActive',
    header: 'Status',
    render: (value) => (value ? 'Active' : 'Inactive'),
    badge: true,
  },
];

const currencyColumns = [
  { key: 'code', header: 'Code' },
  { key: 'name', header: 'Currency' },
  { key: 'symbol', header: 'Symbol' },
  {
    key: 'isDefault',
    header: 'Default',
    render: (value) => (value ? 'Default' : 'No'),
    badge: true,
  },
  {
    key: 'isActive',
    header: 'Status',
    render: (value) => (value ? 'Active' : 'Inactive'),
    badge: true,
  },
];

const emptyDepartmentForm = {
  id: '',
  name: '',
  code: '',
  category: '',
  description: '',
  supportsQueue: false,
  isActive: true,
};

const emptyCategoryForm = {
  id: '',
  name: '',
  description: '',
  isActive: true,
};

const emptyBrandingForm = {
  hospitalName: '',
  branchName: 'Main',
  address: '',
  location: '',
  phoneNumbers: '',
  email: '',
  logoDataUrl: '',
  sidebarColor: '#1d3348',
  defaultCurrency: 'GHS',
  currencies: [
    {
      id: 'currency-ghs',
      code: 'GHS',
      name: 'Ghana Cedi',
      symbol: 'GHS',
      isDefault: true,
      isActive: true,
    },
  ],
  branches: [
    {
      id: 'branch-main',
      name: 'Main',
      code: 'MAIN',
      address: '',
      location: '',
      phoneNumbers: '',
      email: '',
      isMain: true,
      isActive: true,
    },
  ],
};

const emptyBranchForm = {
  id: '',
  name: '',
  code: '',
  address: '',
  location: '',
  phoneNumbers: '',
  email: '',
  isMain: false,
  isActive: true,
};

const emptyCurrencyForm = {
  id: '',
  code: '',
  name: '',
  symbol: '',
  isDefault: false,
  isActive: true,
};

function isLightHexColor(color = '#1d3348') {
  const normalized = /^#[0-9a-fA-F]{6}$/.test(String(color || '').trim())
    ? String(color || '').trim()
    : '#1d3348';
  const red = Number.parseInt(normalized.slice(1, 3), 16);
  const green = Number.parseInt(normalized.slice(3, 5), 16);
  const blue = Number.parseInt(normalized.slice(5, 7), 16);
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;

  return luminance > 0.62;
}

function SettingsPage({ data, auth, users, onRefreshData, pageMeta }) {
  const brandingSnapshotKey = JSON.stringify(data.branding || {});
  const incomingBranding = useMemo(
    () => ({
      ...emptyBrandingForm,
      ...(brandingSnapshotKey ? JSON.parse(brandingSnapshotKey) : {}),
    }),
    [brandingSnapshotKey]
  );
  const [activeTab, setActiveTab] = useState('departments');
  const [departments, setDepartments] = useState(data.registry || []);
  const [categories, setCategories] = useState(data.categories || []);
  const [brandingForm, setBrandingForm] = useState(incomingBranding);
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentForm, setDepartmentForm] = useState(emptyDepartmentForm);
  const [categoryForm, setCategoryForm] = useState(emptyCategoryForm);
  const [editingDepartmentId, setEditingDepartmentId] = useState(null);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [selectedBranchIndex, setSelectedBranchIndex] = useState(null);
  const [branchForm, setBranchForm] = useState(emptyBranchForm);
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [isBranchEditing, setIsBranchEditing] = useState(false);
  const [selectedCurrencyIndex, setSelectedCurrencyIndex] = useState(null);
  const [currencyForm, setCurrencyForm] = useState(emptyCurrencyForm);
  const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false);
  const [isCurrencyEditing, setIsCurrencyEditing] = useState(false);
  const [isDepartmentModalOpen, setIsDepartmentModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    setDepartments(data.registry || []);
    setCategories(data.categories || []);
  }, [data.categories, data.registry]);

  useEffect(() => {
    setBrandingForm(incomingBranding);
  }, [incomingBranding]);

  const departmentRows = useMemo(
    () =>
      (departments || [])
        .map((department) => ({
          ...department,
          staffCount:
            users.filter((user) => user.department === department.name && user.isActive).length ||
            department.staffCount ||
            0,
        }))
        .filter((department) => {
          const matchesSearch = [
            department.name,
            department.code,
            department.category,
            department.description,
          ]
            .join(' ')
            .toLowerCase()
            .includes(searchValue.toLowerCase());
          const matchesStatus =
            statusFilter === 'all' || (statusFilter === 'active' ? department.isActive : !department.isActive);
          return matchesSearch && matchesStatus;
        }),
    [departments, searchValue, statusFilter, users]
  );

  const categoryRows = useMemo(
    () =>
      (categories || []).filter((category) => {
        const matchesSearch = [category.name, category.description]
          .join(' ')
          .toLowerCase()
          .includes(searchValue.toLowerCase());
        const matchesStatus =
          statusFilter === 'all' || (statusFilter === 'active' ? category.isActive : !category.isActive);
        return matchesSearch && matchesStatus;
      }),
    [categories, searchValue, statusFilter]
  );

  const categoryOptions = useMemo(
    () =>
      (categories || [])
        .filter((category) => category.isActive || category.name === departmentForm.category)
        .sort((left, right) => left.name.localeCompare(right.name)),
    [categories, departmentForm.category]
  );

  const summaryCards = useMemo(
    () => [
      { label: 'Departments', value: departments.length },
      { label: 'Active Departments', value: departments.filter((item) => item.isActive).length },
      { label: 'Categories', value: categories.length },
      { label: 'Branches', value: (brandingForm.branches || []).filter((branch) => branch.isActive !== false).length },
      { label: 'Currencies', value: (brandingForm.currencies || []).filter((currency) => currency.isActive !== false).length },
    ],
    [brandingForm.branches, brandingForm.currencies, categories, departments]
  );

  const branchRows = useMemo(
    () =>
      (brandingForm.branches || [])
        .map((branch, index) => ({
          ...branch,
          id: branch.id || `branch-${index}`,
        }))
        .filter((branch) => {
          const matchesSearch = [branch.name, branch.code, branch.location, branch.phoneNumbers, branch.email]
            .join(' ')
            .toLowerCase()
            .includes(searchValue.toLowerCase());
          const matchesStatus =
            statusFilter === 'all' || (statusFilter === 'active' ? branch.isActive : !branch.isActive);
          return matchesSearch && matchesStatus;
        }),
    [brandingForm.branches, searchValue, statusFilter]
  );

  const currencyRows = useMemo(
    () =>
      (brandingForm.currencies || [])
        .map((currency, index) => ({
          ...currency,
          id: currency.id || `currency-${index}`,
        }))
        .filter((currency) => {
          const matchesSearch = [currency.code, currency.name, currency.symbol]
            .join(' ')
            .toLowerCase()
            .includes(searchValue.toLowerCase());
          const matchesStatus =
            statusFilter === 'all' || (statusFilter === 'active' ? currency.isActive : !currency.isActive);
          return matchesSearch && matchesStatus;
        }),
    [brandingForm.currencies, searchValue, statusFilter]
  );

  const canManageCurrencies = Boolean(auth.currentUser?.isMasterTenant && auth.canDoAction('manage_users'));
  const isLightSidebarPreview = isLightHexColor(brandingForm.sidebarColor);

  if (!auth.canViewData('department_records')) {
    return (
      <SectionCard eyebrow="Access control" title="Configuration is restricted">
        <p className="panel-copy">The active user cannot view department configuration.</p>
      </SectionCard>
    );
  }

  const closeDepartmentModal = () => {
    setIsDepartmentModalOpen(false);
    setEditingDepartmentId(null);
    setDepartmentForm(emptyDepartmentForm);
    setIsSaving(false);
  };

  const closeCategoryModal = () => {
    setIsCategoryModalOpen(false);
    setEditingCategoryId(null);
    setCategoryForm(emptyCategoryForm);
    setIsSaving(false);
  };

  const openCreateDepartmentModal = () => {
    setEditingDepartmentId(null);
    setDepartmentForm({
      ...emptyDepartmentForm,
      category: categoryOptions[0]?.name || '',
    });
    setIsDepartmentModalOpen(true);
  };

  const openEditDepartmentModal = (department) => {
    if (!auth.canDoAction('manage_users')) {
      return;
    }

    setEditingDepartmentId(department.id);
    setDepartmentForm({
      ...emptyDepartmentForm,
      ...department,
    });
    setIsDepartmentModalOpen(true);
  };

  const openCreateCategoryModal = () => {
    setEditingCategoryId(null);
    setCategoryForm(emptyCategoryForm);
    setIsCategoryModalOpen(true);
  };

  const openEditCategoryModal = (category) => {
    if (!auth.canDoAction('manage_users')) {
      return;
    }

    setEditingCategoryId(category.id);
    setCategoryForm({
      ...emptyCategoryForm,
      ...category,
    });
    setIsCategoryModalOpen(true);
  };

  const handleDepartmentFormChange = (event) => {
    const { name, value, type, checked } = event.target;
    setDepartmentForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleCategoryFormChange = (event) => {
    const { name, value, type, checked } = event.target;
    setCategoryForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleBrandingFormChange = (event) => {
    const { name, value } = event.target;
    setBrandingForm((current) => ({
      ...current,
      [name]:
        name === 'sidebarColor'
          ? /^#[0-9a-fA-F]{0,6}$/.test(String(value || '').trim())
            ? String(value || '').trim()
            : current.sidebarColor
          : value,
    }));
  };

  const handleBrandingLogoChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setBrandingForm((current) => ({
        ...current,
        logoDataUrl: String(reader.result || ''),
      }));
    };
    reader.readAsDataURL(file);
  };

  const closeBranchModal = () => {
    setIsBranchModalOpen(false);
    setSelectedBranchIndex(null);
    setBranchForm(emptyBranchForm);
    setIsBranchEditing(false);
    setIsSaving(false);
  };

  const closeCurrencyModal = () => {
    setIsCurrencyModalOpen(false);
    setSelectedCurrencyIndex(null);
    setCurrencyForm(emptyCurrencyForm);
    setIsCurrencyEditing(false);
    setIsSaving(false);
  };

  const openCreateBranchModal = () => {
    setSelectedBranchIndex(null);
    setBranchForm({
      ...emptyBranchForm,
      id: `branch-${Date.now()}`,
      isMain: !(brandingForm.branches || []).length,
    });
    setIsBranchEditing(true);
    setIsBranchModalOpen(true);
  };

  const openCreateCurrencyModal = () => {
    if (!canManageCurrencies) {
      return;
    }

    setSelectedCurrencyIndex(null);
    setCurrencyForm({
      ...emptyCurrencyForm,
      id: `currency-${Date.now()}`,
      isDefault: !(brandingForm.currencies || []).length,
    });
    setIsCurrencyEditing(true);
    setIsCurrencyModalOpen(true);
  };

  const openBranchDetailsModal = (branch) => {
    const branchIndex = (brandingForm.branches || []).findIndex(
      (item, index) => (item.id || `branch-${index}`) === branch.id
    );

    if (branchIndex < 0) {
      return;
    }

    setSelectedBranchIndex(branchIndex);
    setBranchForm({
      ...emptyBranchForm,
      ...brandingForm.branches[branchIndex],
      id: brandingForm.branches[branchIndex].id || branch.id,
    });
    setIsBranchEditing(false);
    setIsBranchModalOpen(true);
  };

  const openCurrencyDetailsModal = (currency) => {
    const currencyIndex = (brandingForm.currencies || []).findIndex(
      (item, index) => (item.id || `currency-${index}`) === currency.id
    );

    if (currencyIndex < 0) {
      return;
    }

    setSelectedCurrencyIndex(currencyIndex);
    setCurrencyForm({
      ...emptyCurrencyForm,
      ...brandingForm.currencies[currencyIndex],
      id: brandingForm.currencies[currencyIndex].id || currency.id,
    });
    setIsCurrencyEditing(false);
    setIsCurrencyModalOpen(true);
  };

  const handleBranchFormChange = (event) => {
    const { name, value, type, checked } = event.target;
    setBranchForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleCurrencyFormChange = (event) => {
    const { name, value, type, checked } = event.target;
    setCurrencyForm((current) => ({
      ...current,
      [name]:
        name === 'code'
          ? String(value || '').toUpperCase().slice(0, 3)
          : type === 'checkbox'
            ? checked
            : value,
    }));
  };

  const buildBrandingPayloadWithBranch = () => {
    const nextBranchesBase =
      selectedBranchIndex === null
        ? [...(brandingForm.branches || []), branchForm]
        : (brandingForm.branches || []).map((branch, index) =>
            index === selectedBranchIndex ? { ...branch, ...branchForm } : branch
          );

    const nextBranches = nextBranchesBase.map((branch, index) => ({
      ...branch,
      id: branch.id || `branch-${index}`,
      isMain: branchForm.isMain ? branch.id === branchForm.id : branch.isMain,
    }));

    const ensuredMainBranches = nextBranches.some((branch) => branch.isMain)
      ? nextBranches
      : nextBranches.map((branch, index) => ({
          ...branch,
          isMain: index === 0,
        }));

    const mainBranch = ensuredMainBranches.find((branch) => branch.isMain) || ensuredMainBranches[0];

    return {
      ...brandingForm,
      branchName: mainBranch?.name || brandingForm.branchName,
      branches: ensuredMainBranches,
    };
  };

  const handleBranchSave = async () => {
    if (!branchForm.name.trim()) {
      showToast('Branch name is required.', 'error');
      return;
    }

    setIsSaving(true);

    try {
      const nextBrandingPayload = buildBrandingPayloadWithBranch();
      await hospitalApi.updateBranding(nextBrandingPayload);
      setBrandingForm(nextBrandingPayload);

      if (onRefreshData) {
        await onRefreshData();
      }

      showToast(selectedBranchIndex === null ? 'Branch created successfully.' : 'Branch updated successfully.', 'success');
      closeBranchModal();
    } catch (error) {
      setIsSaving(false);
      showToast(error.message || 'Unable to save branch.', 'error');
    }
  };

  const handleBranchDelete = async () => {
    if (selectedBranchIndex === null || (brandingForm.branches || []).length <= 1) {
      return;
    }

    setIsSaving(true);

    try {
      const nextBranches = (brandingForm.branches || []).filter((_, index) => index !== selectedBranchIndex);
      const normalizedBranches = nextBranches.map((branch, index) => ({
        ...branch,
        isMain: index === 0 ? true : Boolean(branch.isMain),
      }));
      const mainBranch = normalizedBranches.find((branch) => branch.isMain) || normalizedBranches[0];
      const nextBrandingPayload = {
        ...brandingForm,
        branchName: mainBranch?.name || brandingForm.branchName,
        branches: normalizedBranches,
      };

      await hospitalApi.updateBranding(nextBrandingPayload);
      setBrandingForm(nextBrandingPayload);

      if (onRefreshData) {
        await onRefreshData();
      }

      showToast('Branch removed successfully.', 'success');
      closeBranchModal();
    } catch (error) {
      setIsSaving(false);
      showToast(error.message || 'Unable to remove branch.', 'error');
    }
  };

  const buildBrandingPayloadWithCurrency = () => {
    const nextCurrenciesBase =
      selectedCurrencyIndex === null
        ? [...(brandingForm.currencies || []), currencyForm]
        : (brandingForm.currencies || []).map((currency, index) =>
            index === selectedCurrencyIndex ? { ...currency, ...currencyForm } : currency
          );

    const nextCurrencies = nextCurrenciesBase.map((currency, index) => ({
      ...currency,
      id: currency.id || `currency-${index}`,
      code: String(currency.code || '').toUpperCase().slice(0, 3),
      isDefault: currencyForm.isDefault ? currency.id === currencyForm.id : currency.isDefault,
    }));

    const ensuredDefaultCurrencies = nextCurrencies.some((currency) => currency.isDefault)
      ? nextCurrencies
      : nextCurrencies.map((currency, index) => ({
          ...currency,
          isDefault: index === 0,
        }));

    const defaultCurrency = ensuredDefaultCurrencies.find((currency) => currency.isDefault) || ensuredDefaultCurrencies[0];

    return {
      ...brandingForm,
      defaultCurrency: defaultCurrency?.code || brandingForm.defaultCurrency || 'GHS',
      currencies: ensuredDefaultCurrencies,
    };
  };

  const handleCurrencySave = async () => {
    if (!canManageCurrencies) {
      return;
    }

    if (!/^[A-Z]{3}$/.test(String(currencyForm.code || '').trim())) {
      showToast('Currency code must be a 3-letter value like GHS or ZMW.', 'error');
      return;
    }

    if (!String(currencyForm.name || '').trim()) {
      showToast('Currency name is required.', 'error');
      return;
    }

    setIsSaving(true);

    try {
      const nextBrandingPayload = buildBrandingPayloadWithCurrency();
      await hospitalApi.updateBranding(nextBrandingPayload);
      setBrandingForm(nextBrandingPayload);

      if (onRefreshData) {
        await onRefreshData();
      }

      showToast(selectedCurrencyIndex === null ? 'Currency created successfully.' : 'Currency updated successfully.', 'success');
      closeCurrencyModal();
    } catch (error) {
      setIsSaving(false);
      showToast(error.message || 'Unable to save currency.', 'error');
    }
  };

  const handleCurrencyDelete = async () => {
    if (!canManageCurrencies) {
      return;
    }

    if (selectedCurrencyIndex === null || (brandingForm.currencies || []).length <= 1) {
      return;
    }

    setIsSaving(true);

    try {
      const nextCurrencies = (brandingForm.currencies || []).filter((_, index) => index !== selectedCurrencyIndex);
      const normalizedCurrencies = nextCurrencies.map((currency, index) => ({
        ...currency,
        isDefault: index === 0 ? true : Boolean(currency.isDefault),
      }));
      const defaultCurrency = normalizedCurrencies.find((currency) => currency.isDefault) || normalizedCurrencies[0];
      const nextBrandingPayload = {
        ...brandingForm,
        defaultCurrency: defaultCurrency?.code || 'GHS',
        currencies: normalizedCurrencies,
      };

      await hospitalApi.updateBranding(nextBrandingPayload);
      setBrandingForm(nextBrandingPayload);

      if (onRefreshData) {
        await onRefreshData();
      }

      showToast('Currency removed successfully.', 'success');
      closeCurrencyModal();
    } catch (error) {
      setIsSaving(false);
      showToast(error.message || 'Unable to remove currency.', 'error');
    }
  };

  const handleDepartmentSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      let savedDepartment;

      if (editingDepartmentId) {
        savedDepartment = await hospitalApi.updateDepartment(editingDepartmentId, departmentForm);
        setDepartments((current) => current.map((item) => (item.id === editingDepartmentId ? savedDepartment : item)));
        showToast('Department updated successfully.', 'success');
      } else {
        savedDepartment = await hospitalApi.createDepartment(departmentForm);
        setDepartments((current) => [savedDepartment, ...current]);
        showToast('Department created successfully.', 'success');
      }

      if (onRefreshData) {
        await onRefreshData();
      }

      closeDepartmentModal();
    } catch (error) {
      setIsSaving(false);
      showToast(error.message || 'Unable to save department.', 'error');
    }
  };

  const handleCategorySubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      let savedCategory;

      if (editingCategoryId) {
        savedCategory = await hospitalApi.updateDepartmentCategory(editingCategoryId, categoryForm);
        setCategories((current) => current.map((item) => (item.id === editingCategoryId ? savedCategory : item)));
        showToast('Category updated successfully.', 'success');
      } else {
        savedCategory = await hospitalApi.createDepartmentCategory(categoryForm);
        setCategories((current) => [savedCategory, ...current]);
        showToast('Category created successfully.', 'success');
      }

      if (onRefreshData) {
        await onRefreshData();
      }

      closeCategoryModal();
    } catch (error) {
      setIsSaving(false);
      showToast(error.message || 'Unable to save category.', 'error');
    }
  };

  const handleBrandingSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      await hospitalApi.updateBranding(brandingForm);

      if (onRefreshData) {
        await onRefreshData();
      }

      showToast('Branding updated successfully.', 'success');
      setIsSaving(false);
    } catch (error) {
      setIsSaving(false);
      showToast(error.message || 'Unable to save branding.', 'error');
    }
  };

  const activeRows =
    activeTab === 'departments'
      ? departmentRows
      : activeTab === 'categories'
        ? categoryRows
          : [];
  const activeColumns =
    activeTab === 'departments'
      ? departmentColumns
      : activeTab === 'categories'
        ? categoryColumns
        : [];

  return (
    <div className="page-stack">
      <PageHeader
        title={pageMeta?.label || 'Config'}
        description={pageMeta?.description || ''}
        actions={
          auth.canDoAction('manage_users') && activeTab !== 'branding' ? (
            <button
              type="button"
              className="primary-button"
              onClick={
                activeTab === 'departments'
                  ? openCreateDepartmentModal
                  : activeTab === 'categories'
                    ? openCreateCategoryModal
                    : openCreateBranchModal
              }
            >
              {activeTab === 'departments'
                ? 'Add Department'
                : activeTab === 'categories'
                  ? 'Add Category'
                  : 'Add Branch'}
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
          tabs={[
            { id: 'departments', label: 'Departments' },
            { id: 'categories', label: 'Categories' },
            { id: 'branding', label: 'Branding' },
          ]}
          activeTab={activeTab}
          onChange={(tabId) => {
            setActiveTab(tabId);
            setSearchValue('');
            setStatusFilter('all');
          }}
        />

        {activeTab === 'branding' ? (
          <div className="page-stack">
            <form className="entity-form" onSubmit={handleBrandingSubmit}>
              <div className="form-grid">
                <label className="form-field">
                  <span>Hospital Name</span>
                  <input
                    name="hospitalName"
                    value={brandingForm.hospitalName}
                    onChange={handleBrandingFormChange}
                    required
                  />
                </label>
                <label className="form-field">
                  <span>Main Branch</span>
                  <input
                    name="branchName"
                    value={brandingForm.branchName}
                    onChange={handleBrandingFormChange}
                    disabled
                  />
                </label>
                <label className="form-field">
                  <span>Phone Numbers</span>
                  <input
                    name="phoneNumbers"
                    value={brandingForm.phoneNumbers}
                    onChange={handleBrandingFormChange}
                    placeholder="+260 ... / +233 ..."
                  />
                </label>
                <label className="form-field">
                  <span>Email Address</span>
                  <input
                    type="email"
                    name="email"
                    value={brandingForm.email}
                    onChange={handleBrandingFormChange}
                  />
                </label>
                <label className="form-field">
                  <span>Address</span>
                  <input
                    name="address"
                    value={brandingForm.address}
                    onChange={handleBrandingFormChange}
                  />
                </label>
                <label className="form-field">
                  <span>Location</span>
                  <input
                    name="location"
                    value={brandingForm.location}
                    onChange={handleBrandingFormChange}
                  />
                </label>
                <label className="form-field">
                  <span>Default Currency</span>
                  <input value={brandingForm.defaultCurrency || 'GHS'} disabled />
                </label>
                <label className="form-field">
                  <span>Sidebar Color</span>
                  <div className="branding-color-control">
                    <input
                      type="color"
                      name="sidebarColor"
                      value={brandingForm.sidebarColor || '#1d3348'}
                      onChange={handleBrandingFormChange}
                      className="branding-color-picker"
                    />
                    <input
                      name="sidebarColor"
                      value={brandingForm.sidebarColor || '#1d3348'}
                      onChange={handleBrandingFormChange}
                      placeholder="#1d3348"
                      maxLength={7}
                    />
                  </div>
                </label>
                <label className="form-field">
                  <span>Hospital Logo</span>
                  <input type="file" accept="image/*" onChange={handleBrandingLogoChange} />
                </label>
                <div className="form-field">
                  <span>Preview</span>
                  <div className="branding-preview-stack">
                    {brandingForm.logoDataUrl ? (
                      <img
                        src={brandingForm.logoDataUrl}
                        alt="Hospital branding"
                        className="branding-preview"
                      />
                    ) : (
                      <div className="branding-preview branding-preview-empty">No logo uploaded</div>
                    )}
                    <div
                      className="branding-color-preview"
                      style={{
                        background: brandingForm.sidebarColor || '#1d3348',
                        color: isLightSidebarPreview ? '#10233f' : '#ffffff',
                        boxShadow: isLightSidebarPreview
                          ? 'inset 0 0 0 1px rgba(16, 35, 63, 0.14)'
                          : 'inset 0 0 0 1px rgba(255, 255, 255, 0.14)',
                      }}
                    >
                      Sidebar Color Preview
                    </div>
                  </div>
                </div>
              </div>

              {auth.canDoAction('manage_users') ? (
                <div className="modal-actions">
                  <button type="button" className="secondary-button" onClick={() => setBrandingForm(incomingBranding)}>
                    Reset
                  </button>
                  <button type="submit" className="primary-button" disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Branding'}
                  </button>
                </div>
              ) : null}
            </form>

            <TableToolbar
              searchValue={searchValue}
              onSearchChange={setSearchValue}
              searchPlaceholder="Search currency or branch details"
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

            <SectionCard
              title="Currencies"
              actions={
                canManageCurrencies ? (
                  <button type="button" className="primary-button" onClick={openCreateCurrencyModal}>
                    Add Currency
                  </button>
                ) : null
              }
            >
              <DataTable
                columns={currencyColumns}
                rows={currencyRows}
                caption={
                  canManageCurrencies
                    ? 'Currencies are reusable across the tenant. Click any row to open details.'
                    : 'Currencies assigned by the super admin are shown here for reference.'
                }
                emptyMessage="No currencies match the current filters."
                onRowClick={openCurrencyDetailsModal}
              />
            </SectionCard>

            <SectionCard
              title="Branches"
              actions={
                auth.canDoAction('manage_users') ? (
                  <button type="button" className="primary-button" onClick={openCreateBranchModal}>
                    Add Branch
                  </button>
                ) : null
              }
            >
              <DataTable
                columns={branchColumns}
                rows={branchRows}
                caption="Branches stay in a clean list here. Click any row to open its details."
                emptyMessage="No branches match the current filters."
                onRowClick={openBranchDetailsModal}
              />
            </SectionCard>
          </div>
        ) : (
          <>
            <TableToolbar
              searchValue={searchValue}
              onSearchChange={setSearchValue}
              searchPlaceholder={
                activeTab === 'departments'
                  ? 'Search department name, code, category, or description'
                  : 'Search category name or description'
              }
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
              columns={activeColumns}
              rows={activeRows}
              caption={
                activeTab === 'departments'
                  ? 'Create departments once, then use them across staffing, visits, and routing.'
                  : 'Categories help keep departments organized for layman-friendly setup.'
              }
              emptyMessage={
                activeTab === 'departments'
                  ? 'No departments match the current filters.'
                  : 'No categories match the current filters.'
              }
              onRowClick={
                auth.canDoAction('manage_users')
                  ? activeTab === 'departments'
                    ? openEditDepartmentModal
                    : openEditCategoryModal
                  : undefined
              }
            />
          </>
        )}
      </section>

      <Modal
        isOpen={isBranchModalOpen}
        title={selectedBranchIndex === null ? 'Create Branch' : 'Branch Details'}
        subtitle={selectedBranchIndex === null ? 'Set up a branch for this tenant.' : 'Branch details open in view mode first.'}
        onClose={closeBranchModal}
      >
        {selectedBranchIndex !== null && !isBranchEditing ? (
          <div className="page-stack">
            <ProDataGrid
              items={[
                { label: 'Branch Name', value: branchForm.name },
                { label: 'Code', value: branchForm.code || '—' },
                { label: 'Phone', value: branchForm.phoneNumbers || '—' },
                { label: 'Email', value: branchForm.email || '—' },
                { label: 'Address', value: branchForm.address || '—' },
                { label: 'Location', value: branchForm.location || '—' },
                { label: 'Main Branch', value: branchForm.isMain ? 'Yes' : 'No' },
                { label: 'Status', value: branchForm.isActive ? 'Active' : 'Inactive' },
              ]}
              variant="expanded"
            />
            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={closeBranchModal}>
                Close
              </button>
              {auth.canDoAction('manage_users') ? (
                <button type="button" className="primary-button" onClick={() => setIsBranchEditing(true)}>
                  Edit Branch
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <form
            className="entity-form"
            onSubmit={(event) => {
              event.preventDefault();
              handleBranchSave();
            }}
          >
            <div className="form-grid">
              <label className="form-field">
                <span>Branch Name</span>
                <input name="name" value={branchForm.name} onChange={handleBranchFormChange} required />
              </label>
              <label className="form-field">
                <span>Code</span>
                <input name="code" value={branchForm.code} onChange={handleBranchFormChange} />
              </label>
              <label className="form-field">
                <span>Phone</span>
                <input name="phoneNumbers" value={branchForm.phoneNumbers} onChange={handleBranchFormChange} />
              </label>
              <label className="form-field">
                <span>Email</span>
                <input type="email" name="email" value={branchForm.email} onChange={handleBranchFormChange} />
              </label>
              <label className="form-field">
                <span>Address</span>
                <input name="address" value={branchForm.address} onChange={handleBranchFormChange} />
              </label>
              <label className="form-field">
                <span>Location</span>
                <input name="location" value={branchForm.location} onChange={handleBranchFormChange} />
              </label>
              <label className="form-field">
                <span>Main Branch</span>
                <input type="checkbox" name="isMain" checked={branchForm.isMain} onChange={handleBranchFormChange} />
              </label>
              <label className="form-field">
                <span>Active</span>
                <input type="checkbox" name="isActive" checked={branchForm.isActive} onChange={handleBranchFormChange} />
              </label>
            </div>

            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={closeBranchModal}>
                Cancel
              </button>
              {selectedBranchIndex !== null && (brandingForm.branches || []).length > 1 ? (
                <button type="button" className="secondary-button" onClick={handleBranchDelete} disabled={isSaving}>
                  Remove Branch
                </button>
              ) : null}
              <button type="submit" className="primary-button" disabled={isSaving}>
                {isSaving ? 'Saving...' : selectedBranchIndex === null ? 'Create Branch' : 'Save Branch'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        isOpen={isCurrencyModalOpen}
        title={selectedCurrencyIndex === null ? 'Create Currency' : 'Currency Details'}
        subtitle={selectedCurrencyIndex === null ? 'Add a reusable currency for this tenant.' : 'Currency details open in view mode first.'}
        onClose={closeCurrencyModal}
      >
        {selectedCurrencyIndex !== null && !isCurrencyEditing ? (
          <div className="page-stack">
            <ProDataGrid
              items={[
                { label: 'Currency Code', value: currencyForm.code || '—' },
                { label: 'Currency Name', value: currencyForm.name || '—' },
                { label: 'Symbol', value: currencyForm.symbol || '—' },
                { label: 'Default Currency', value: currencyForm.isDefault ? 'Yes' : 'No' },
                { label: 'Status', value: currencyForm.isActive ? 'Active' : 'Inactive' },
              ]}
              variant="expanded"
            />
            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={closeCurrencyModal}>
                Close
              </button>
              {canManageCurrencies ? (
                <button type="button" className="primary-button" onClick={() => setIsCurrencyEditing(true)}>
                  Edit Currency
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <form
            className="entity-form"
            onSubmit={(event) => {
              event.preventDefault();
              handleCurrencySave();
            }}
          >
            <div className="form-grid">
              <label className="form-field">
                <span>Currency Code</span>
                <input name="code" value={currencyForm.code} onChange={handleCurrencyFormChange} maxLength={3} required />
              </label>
              <label className="form-field">
                <span>Currency Name</span>
                <input name="name" value={currencyForm.name} onChange={handleCurrencyFormChange} required />
              </label>
              <label className="form-field">
                <span>Symbol</span>
                <input name="symbol" value={currencyForm.symbol} onChange={handleCurrencyFormChange} />
              </label>
              <label className="form-field">
                <span>Default Currency</span>
                <input type="checkbox" name="isDefault" checked={currencyForm.isDefault} onChange={handleCurrencyFormChange} />
              </label>
              <label className="form-field">
                <span>Active</span>
                <input type="checkbox" name="isActive" checked={currencyForm.isActive} onChange={handleCurrencyFormChange} />
              </label>
            </div>

            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={closeCurrencyModal}>
                Cancel
              </button>
              {selectedCurrencyIndex !== null && (brandingForm.currencies || []).length > 1 ? (
                <button type="button" className="secondary-button" onClick={handleCurrencyDelete} disabled={isSaving}>
                  Remove Currency
                </button>
              ) : null}
              <button type="submit" className="primary-button" disabled={isSaving}>
                {isSaving ? 'Saving...' : selectedCurrencyIndex === null ? 'Create Currency' : 'Save Currency'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        isOpen={isDepartmentModalOpen}
        title={editingDepartmentId ? 'Edit Department' : 'Create Department'}
        subtitle="Departments are used for user assignment, appointments, and patient routing."
        onClose={closeDepartmentModal}
      >
        <form className="entity-form" onSubmit={handleDepartmentSubmit}>
          <div className="form-grid">
            <label className="form-field">
              <span>Department Name</span>
              <input name="name" value={departmentForm.name} onChange={handleDepartmentFormChange} required />
            </label>
            <label className="form-field">
              <span>Code</span>
              <input name="code" value={departmentForm.code} onChange={handleDepartmentFormChange} required />
            </label>
            <label className="form-field">
              <span>Category</span>
              <select name="category" value={departmentForm.category} onChange={handleDepartmentFormChange} required>
                <option value="">Select category</option>
                {categoryOptions.map((category) => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span>Queue Enabled</span>
              <input
                type="checkbox"
                name="supportsQueue"
                checked={departmentForm.supportsQueue}
                onChange={handleDepartmentFormChange}
              />
            </label>
            <label className="form-field">
              <span>Active</span>
              <input
                type="checkbox"
                name="isActive"
                checked={departmentForm.isActive}
                onChange={handleDepartmentFormChange}
              />
            </label>
            <label className="form-field form-field-full">
              <span>Description</span>
              <textarea
                name="description"
                rows="3"
                value={departmentForm.description}
                onChange={handleDepartmentFormChange}
              />
            </label>
          </div>

          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={closeDepartmentModal}>
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={isSaving}>
              {isSaving ? 'Saving...' : editingDepartmentId ? 'Save Department' : 'Create Department'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isCategoryModalOpen}
        title={editingCategoryId ? 'Edit Category' : 'Create Category'}
        subtitle="Department categories make configuration easier for non-technical staff."
        onClose={closeCategoryModal}
      >
        <form className="entity-form" onSubmit={handleCategorySubmit}>
          <div className="form-grid">
            <label className="form-field">
              <span>Category Name</span>
              <input name="name" value={categoryForm.name} onChange={handleCategoryFormChange} required />
            </label>
            <label className="form-field">
              <span>Active</span>
              <input
                type="checkbox"
                name="isActive"
                checked={categoryForm.isActive}
                onChange={handleCategoryFormChange}
              />
            </label>
            <label className="form-field form-field-full">
              <span>Description</span>
              <textarea
                name="description"
                rows="3"
                value={categoryForm.description}
                onChange={handleCategoryFormChange}
              />
            </label>
          </div>

          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={closeCategoryModal}>
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={isSaving}>
              {isSaving ? 'Saving...' : editingCategoryId ? 'Save Category' : 'Create Category'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default SettingsPage;
