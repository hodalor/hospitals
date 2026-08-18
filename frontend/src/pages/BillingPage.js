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
import { buildPrintableItems, printInvoiceDocument } from '../utils/financePrint';

const pharmacyColumns = [
  { key: 'date', header: 'Date' },
  { key: 'prescriptionNo', header: 'Prescription No' },
  { key: 'patient', header: 'Patient' },
  { key: 'branchName', header: 'Branch' },
  { key: 'medicationCount', header: 'Medication Count' },
  { key: 'stockCheck', header: 'Stock Check', badge: true },
  { key: 'paymentState', header: 'Payment State', badge: true },
];

const emptyInvoiceForm = {
  id: '',
  invoiceNo: '',
  patient: '',
  patientId: '',
  service: '',
  serviceCategory: '',
  invoiceItems: [],
  cashier: '',
  financeOfficer: '',
  invoiceType: 'Revenue',
  channel: 'Cash',
  totalAmount: '',
  paidAmount: 0,
  paymentAmount: '',
  department: '',
  status: 'Draft',
  notes: '',
};

const createInvoiceItem = (item = {}) => ({
  itemName: item.itemName || item.service || '',
  itemType: item.itemType || 'Service',
  catalogSection: item.catalogSection || '',
  category: item.category || item.serviceCategory || '',
  department: item.department || '',
  unitPrice: item.unitPrice != null ? String(item.unitPrice) : '',
  quantity: item.quantity != null ? String(item.quantity) : '1',
  lineTotal:
    item.lineTotal != null
      ? Number(item.lineTotal)
      : Number(item.unitPrice || 0) * Number(item.quantity || 1),
});

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const calculateLineTotal = (item) => {
  const quantity = Math.max(1, toNumber(item.quantity) || 1);
  const unitPrice = Math.max(0, toNumber(item.unitPrice));
  return quantity * unitPrice;
};

const normalizeInvoiceItems = (items = []) =>
  (Array.isArray(items) ? items : [])
    .map((item) => ({
      ...item,
      itemName: String(item.itemName || '').trim(),
      quantity: String(Math.max(1, toNumber(item.quantity) || 1)),
      unitPrice: String(Math.max(0, toNumber(item.unitPrice))),
      lineTotal: calculateLineTotal(item),
    }))
    .filter((item) => item.itemName || toNumber(item.unitPrice) > 0);

const summarizeInvoiceServices = (items = []) => {
  const labels = items.map((item) => item.itemName).filter(Boolean);

  if (!labels.length) {
    return '';
  }

  if (labels.length <= 2) {
    return labels.join(', ');
  }

  return `${labels.slice(0, 2).join(', ')} +${labels.length - 2} more`;
};

const summarizeInvoiceCategory = (items = []) => {
  if (!items.length) {
    return '';
  }

  const uniqueTypes = Array.from(new Set(items.map((item) => item.itemType).filter(Boolean)));
  const uniqueSections = Array.from(new Set(items.map((item) => item.catalogSection).filter(Boolean)));

  if (uniqueTypes.length === 1 && uniqueTypes[0] === 'Medication') {
    return 'Medication';
  }

  if (uniqueSections.length === 1) {
    return uniqueSections[0];
  }

  return uniqueSections.length ? 'Mixed Invoice' : '';
};

const summarizeInvoiceDepartment = (items = []) => {
  const uniqueDepartments = Array.from(new Set(items.map((item) => item.department).filter(Boolean)));

  if (!uniqueDepartments.length) {
    return '';
  }

  return uniqueDepartments.length === 1 ? uniqueDepartments[0] : 'Multiple departments';
};

const calculateInvoiceTotal = (items = []) =>
  normalizeInvoiceItems(items).reduce((sum, item) => sum + Number(item.lineTotal || 0), 0);

const emptyPrescriptionForm = {
  id: '',
  prescriptionNo: '',
  patient: '',
  medicationCount: '',
  stockCheck: 'Available',
  paymentState: 'Pending',
};

function BillingPage({ data, auth, pricingItems, pageMeta }) {
  const [transactions, setTransactions] = useState(data.transactions);
  const [pharmacyQueue, setPharmacyQueue] = useState(data.pharmacyQueue);
  const [invoiceForm, setInvoiceForm] = useState(emptyInvoiceForm);
  const [prescriptionForm, setPrescriptionForm] = useState(emptyPrescriptionForm);
  const [editingInvoiceId, setEditingInvoiceId] = useState(null);
  const [editingPrescriptionId, setEditingPrescriptionId] = useState(null);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [prescriptionModalOpen, setPrescriptionModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('invoices');
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [patientLookup, setPatientLookup] = useState('');
  const [patientMatches, setPatientMatches] = useState([]);
  const [isSearchingPatients, setIsSearchingPatients] = useState(false);
  const { showToast } = useToast();
  const currentUserName = auth.currentUser?.fullName || auth.currentUser?.role || 'Finance';
  const branding = useMemo(() => data.branding || {}, [data.branding]);

  useEffect(() => {
    setTransactions(data.transactions);
    setPharmacyQueue(data.pharmacyQueue);
  }, [data.transactions, data.pharmacyQueue]);

  useEffect(() => {
    if (!invoiceModalOpen || editingInvoiceId || !patientLookup.trim()) {
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
  }, [editingInvoiceId, invoiceModalOpen, patientLookup]);

  const serviceCatalog = useMemo(
    () =>
      (pricingItems || []).filter(
        (item) => item.isActive && !(item.itemType === 'Service' && item.catalogSection === 'Diagnosis')
      ),
    [pricingItems]
  );

  const transactionColumns = useMemo(
    () => [
      { key: 'date', header: 'Date' },
      { key: 'invoiceNo', header: 'Invoice No' },
      { key: 'patient', header: 'Patient' },
      { key: 'branchName', header: 'Branch' },
      { key: 'service', header: 'Items' },
      { key: 'cashier', header: 'Cashier' },
      { key: 'amount', header: 'Amount' },
      { key: 'status', header: 'Status', badge: true },
      {
        key: 'document',
        header: 'Document',
        render: (_value, row) => (
          <button
            type="button"
            className="text-button"
            onClick={async (event) => {
              event.stopPropagation();
              try {
                const printableInvoice = row.id ? await hospitalApi.getInvoiceDocument(row.id) : row;
                printInvoiceDocument(printableInvoice, branding, serviceCatalog);
              } catch (error) {
                showToast(error.message || 'Unable to load the full invoice for printing.', 'error');
              }
            }}
          >
            Print
          </button>
        ),
      },
    ],
    [branding, serviceCatalog, showToast]
  );

  const syncInvoiceSummary = (draft, previousDraft = null) => {
    const normalizedItems = normalizeInvoiceItems(draft.invoiceItems);
    const derivedDepartment = summarizeInvoiceDepartment(normalizedItems);
    const previousDerivedDepartment = previousDraft
      ? summarizeInvoiceDepartment(normalizeInvoiceItems(previousDraft.invoiceItems))
      : '';
    const shouldAutoFillDepartment =
      !draft.department ||
      (previousDraft &&
        (previousDraft.department === previousDerivedDepartment ||
          previousDraft.department === 'Multiple departments'));

    return {
      ...draft,
      invoiceItems: normalizedItems.length ? normalizedItems : draft.invoiceItems,
      service: summarizeInvoiceServices(normalizedItems),
      serviceCategory: summarizeInvoiceCategory(normalizedItems),
      totalAmount: String(calculateInvoiceTotal(normalizedItems)),
      department: shouldAutoFillDepartment ? derivedDepartment : draft.department,
    };
  };

  const summaryCards = useMemo(
    () => [
      { label: 'Invoices', value: transactions.length },
      { label: 'Pending Payments', value: transactions.filter((item) => item.status !== 'Paid').length },
      {
        label: 'Revenue Posted',
        value: transactions
          .filter((item) => item.isRevenue)
          .reduce((sum, item) => sum + Number(item.paidAmount || 0), 0)
          .toLocaleString(),
      },
      { label: 'Active Scripts', value: pharmacyQueue.length },
    ],
    [transactions, pharmacyQueue]
  );

  const filteredInvoices = useMemo(
    () =>
      transactions.filter((invoice) => {
        const matchesSearch = [
          invoice.invoiceNo,
          invoice.patient,
          invoice.branchName,
          invoice.service,
          invoice.serviceCategory,
          ...(invoice.invoiceItems || []).map((item) => item.itemName),
          invoice.cashier,
          invoice.amount,
        ]
          .join(' ')
          .toLowerCase()
          .includes(searchValue.toLowerCase());
        const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
        const matchesDate = isWithinDateRange(invoice.createdAt || invoice.date, startDateFilter, endDateFilter);
        return matchesSearch && matchesStatus && matchesDate;
      }),
    [transactions, searchValue, statusFilter, startDateFilter, endDateFilter]
  );

  const filteredPrescriptions = useMemo(
    () =>
      pharmacyQueue.filter((prescription) => {
        const matchesSearch = [prescription.prescriptionNo, prescription.patient, prescription.medicationCount]
          .join(' ')
          .toLowerCase()
          .includes(searchValue.toLowerCase());
        const matchesStatus =
          statusFilter === 'all' ||
          prescription.paymentState === statusFilter ||
          prescription.stockCheck === statusFilter;
        const matchesDate = isWithinDateRange(
          prescription.createdAt || prescription.date,
          startDateFilter,
          endDateFilter
        );
        return matchesSearch && matchesStatus && matchesDate;
      }),
    [pharmacyQueue, searchValue, statusFilter, startDateFilter, endDateFilter]
  );

  if (!auth.canViewData('billing_records')) {
    return (
      <SectionCard eyebrow="Access control" title="Billing access is restricted">
        <p className="panel-copy">The active user cannot view billing data.</p>
      </SectionCard>
    );
  }

  const openCreateInvoiceModal = () => {
    setEditingInvoiceId(null);
    setInvoiceForm({
      ...emptyInvoiceForm,
      invoiceItems: [createInvoiceItem()],
      cashier: currentUserName,
      financeOfficer: currentUserName,
    });
    setPatientLookup('');
    setPatientMatches([]);
    setInvoiceModalOpen(true);
  };

  const openEditInvoiceModal = (invoice) => {
    if (!auth.canDoAction('edit_invoice')) {
      return;
    }

    setEditingInvoiceId(invoice.id);
    const recoveredItems = buildPrintableItems(invoice, serviceCatalog).items;
    const invoiceItems = recoveredItems.length
      ? recoveredItems.map((item) => createInvoiceItem(item))
      : [createInvoiceItem()];
    setInvoiceForm({
      ...invoice,
      service: invoice.service || '',
      cashier: invoice.cashier || currentUserName,
      financeOfficer: invoice.financeOfficer || currentUserName,
      totalAmount: String(invoice.totalAmount ?? invoice.amount ?? ''),
      paymentAmount: '',
      invoiceItems,
    });
    setPatientLookup(invoice.patient || '');
    setPatientMatches([]);
    setInvoiceModalOpen(true);
  };

  const openCreatePrescriptionModal = () => {
    setEditingPrescriptionId(null);
    setPrescriptionForm({
      ...emptyPrescriptionForm,
      prescriptionNo: `RX-${Math.floor(Math.random() * 9000) + 1000}`,
    });
    setPrescriptionModalOpen(true);
  };

  const openEditPrescriptionModal = (prescription) => {
    if (!auth.canDoAction('edit_prescription')) {
      return;
    }

    setEditingPrescriptionId(prescription.id);
    setPrescriptionForm(prescription);
    setPrescriptionModalOpen(true);
  };

  const closeInvoiceModal = () => {
    setInvoiceModalOpen(false);
    setEditingInvoiceId(null);
    setIsSaving(false);
    setPatientLookup('');
    setPatientMatches([]);
    setInvoiceForm(emptyInvoiceForm);
  };

  const closePrescriptionModal = () => {
    setPrescriptionModalOpen(false);
    setEditingPrescriptionId(null);
    setIsSaving(false);
  };

  const handleInvoiceChange = (event) => {
    const { name, value } = event.target;
    setInvoiceForm((current) => ({ ...current, [name]: value }));
  };

  const handleInvoiceItemChange = (index, key, value) => {
    setInvoiceForm((current) => {
      const next = {
        ...current,
        invoiceItems: current.invoiceItems.map((item, itemIndex) => {
          if (itemIndex !== index) {
            return item;
          }

          const updatedItem = {
            ...item,
            [key]: value,
          };

          if (key === 'itemName') {
            const matchedItem = serviceCatalog.find((catalogItem) => catalogItem.name === value);

            if (matchedItem) {
              updatedItem.itemType = matchedItem.itemType;
              updatedItem.catalogSection = matchedItem.catalogSection || '';
              updatedItem.category = matchedItem.category || '';
              updatedItem.department = matchedItem.department || '';
              updatedItem.unitPrice = String(matchedItem.unitPrice || 0);
            }
          }

          if (key === 'quantity') {
            updatedItem.quantity = String(Math.max(1, toNumber(value) || 1));
          }

          if (key === 'unitPrice') {
            updatedItem.unitPrice = String(Math.max(0, toNumber(value)));
          }

          updatedItem.lineTotal = calculateLineTotal(updatedItem);
          return updatedItem;
        }),
      };

      return syncInvoiceSummary(next, current);
    });
  };

  const addInvoiceItem = () => {
    setInvoiceForm((current) => ({
      ...current,
      invoiceItems: [...current.invoiceItems, createInvoiceItem()],
    }));
  };

  const removeInvoiceItem = (index) => {
    setInvoiceForm((current) => {
      const next = {
        ...current,
        invoiceItems: current.invoiceItems.filter((_, itemIndex) => itemIndex !== index),
      };

      return syncInvoiceSummary(next, current);
    });
  };

  const handlePickPatient = (patient) => {
    setInvoiceForm((current) => ({
      ...current,
      patient: patient.name,
      patientId: patient.patientId,
    }));
    setPatientLookup(`${patient.name} | ${patient.patientId}`);
    setPatientMatches([]);
  };

  const handlePrescriptionChange = (event) => {
    const { name, value } = event.target;
    setPrescriptionForm((current) => ({ ...current, [name]: value }));
  };

  const handleInvoiceSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);

    const normalizedItems = normalizeInvoiceItems(invoiceForm.invoiceItems);

    if (!normalizedItems.length) {
      setIsSaving(false);
      showToast('Add at least one service or medication line to the invoice.', 'error');
      return;
    }

    const payload = {
      ...invoiceForm,
      invoiceItems: normalizedItems.map((item) => ({
        ...item,
        quantity: Number(item.quantity || 1),
        unitPrice: Number(item.unitPrice || 0),
        lineTotal: Number(item.lineTotal || 0),
      })),
      service: summarizeInvoiceServices(normalizedItems),
      serviceCategory: summarizeInvoiceCategory(normalizedItems),
      totalAmount: String(calculateInvoiceTotal(normalizedItems)),
      department: invoiceForm.department || summarizeInvoiceDepartment(normalizedItems),
    };

    try {
      if (editingInvoiceId) {
        const savedInvoice = await hospitalApi.updateInvoice(editingInvoiceId, payload);
        setTransactions((current) =>
          current.map((item) => (item.id === editingInvoiceId ? savedInvoice : item))
        );
        showToast('Invoice updated successfully.', 'success');
      } else {
        const createdInvoice = await hospitalApi.createInvoice(payload);
        setTransactions((current) => [createdInvoice, ...current]);
        showToast('Invoice created successfully.', 'success');
      }
      closeInvoiceModal();
    } catch (error) {
      setIsSaving(false);
      showToast(error.message || 'Unable to save invoice.', 'error');
    }
  };

  const handlePrescriptionSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      if (editingPrescriptionId) {
        const savedPrescription = await hospitalApi.updatePrescription(
          editingPrescriptionId,
          prescriptionForm
        );
        setPharmacyQueue((current) =>
          current.map((item) => (item.id === editingPrescriptionId ? savedPrescription : item))
        );
        showToast('Prescription updated successfully.', 'success');
      } else {
        const createdPrescription = await hospitalApi.createPrescription(prescriptionForm);
        setPharmacyQueue((current) => [createdPrescription, ...current]);
        showToast('Prescription created successfully.', 'success');
      }
      closePrescriptionModal();
    } catch (error) {
      setIsSaving(false);
      showToast(error.message || 'Unable to save prescription.', 'error');
    }
  };

  const filterOptions =
    activeTab === 'invoices'
      ? [
          { label: 'All statuses', value: 'all' },
          { label: 'Draft', value: 'Draft' },
          { label: 'Issued', value: 'Issued' },
          { label: 'Pending', value: 'Pending' },
          { label: 'Paid', value: 'Paid' },
          { label: 'Awaiting approval', value: 'Awaiting approval' },
          { label: 'Claim drafted', value: 'Claim drafted' },
          { label: 'Part paid', value: 'Part paid' },
          { label: 'Cancelled', value: 'Cancelled' },
        ]
      : [
          { label: 'All states', value: 'all' },
          { label: 'Pending', value: 'Pending' },
          { label: 'Verified', value: 'Verified' },
          { label: 'Awaiting cashier', value: 'Awaiting cashier' },
          { label: 'Emergency override', value: 'Emergency override' },
          { label: 'Available', value: 'Available' },
          { label: '1 substitute needed', value: '1 substitute needed' },
          { label: 'Unavailable', value: 'Unavailable' },
        ];

  return (
    <div className="page-stack">
      <datalist id="finance-service-options">
        {serviceCatalog.map((item) => (
          <option key={item.id} value={item.name}>
            {item.category}
          </option>
        ))}
      </datalist>
      <PageHeader
        title={pageMeta?.label || 'Billing'}
        description={pageMeta?.description || ''}
        actions={
          auth.canDoAction('create_prescription') || auth.canDoAction('create_invoice') ? (
            <>
              {auth.canDoAction('create_prescription') ? (
                <button type="button" className="secondary-button" onClick={openCreatePrescriptionModal}>
                  Add Prescription
                </button>
              ) : null}
              {auth.canDoAction('create_invoice') ? (
                <button type="button" className="primary-button" onClick={openCreateInvoiceModal}>
                  Add Invoice
                </button>
              ) : null}
            </>
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
            { id: 'invoices', label: 'Invoices' },
            { id: 'prescriptions', label: 'Prescriptions' },
          ]}
          activeTab={activeTab}
          onChange={(tabId) => {
            setActiveTab(tabId);
            setSearchValue('');
            setStatusFilter('all');
            setStartDateFilter('');
            setEndDateFilter('');
          }}
        />

        <TableToolbar
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder={
            activeTab === 'invoices'
              ? 'Search invoice, patient, service, cashier, or amount'
              : 'Search prescription, patient, or quantity'
          }
          filters={[
            {
              label: 'Status',
              value: statusFilter,
              onChange: setStatusFilter,
              options: filterOptions,
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

        {activeTab === 'invoices' ? (
          <DataTable
            columns={transactionColumns}
            rows={filteredInvoices}
            caption="Cashier, sponsor, and insurance transaction status"
            onRowClick={auth.canDoAction('edit_invoice') ? openEditInvoiceModal : undefined}
          />
        ) : (
          <DataTable
            columns={pharmacyColumns}
            rows={filteredPrescriptions}
            caption="Prescription payment and stock readiness"
            onRowClick={auth.canDoAction('edit_prescription') ? openEditPrescriptionModal : undefined}
          />
        )}
      </section>

      <Modal
        isOpen={invoiceModalOpen}
        title={editingInvoiceId ? 'Edit Invoice' : 'Create Invoice'}
        subtitle="Finance staff can update payment status directly from the billing list."
        onClose={closeInvoiceModal}
      >
        <form className="entity-form" onSubmit={handleInvoiceSubmit}>
          <div className="line-item-card form-section">
            <ProDataGrid
              items={[
                { label: 'Invoice No', value: invoiceForm.invoiceNo || 'Auto-generated on save' },
                { label: 'Patient', value: invoiceForm.patient || 'Select patient' },
                { label: 'Patient ID', value: invoiceForm.patientId },
                { label: 'Branch', value: auth.currentUser?.selectedBranchName || auth.currentUser?.branchName || 'Main' },
                { label: 'Invoice Type', value: invoiceForm.invoiceType },
                { label: 'Status', value: invoiceForm.status },
                { label: 'Department', value: invoiceForm.department || 'Auto from items' },
              ]}
            />
          </div>
          <div className="form-grid">
            <label className="form-field">
              <span>Invoice No</span>
              <input
                name="invoiceNo"
                value={invoiceForm.invoiceNo}
                onChange={handleInvoiceChange}
                placeholder="Auto-generated if left blank"
              />
            </label>
            {!editingInvoiceId ? (
              <label className="form-field form-field-full patient-search-field">
                <span>Find Patient</span>
                <input
                  value={patientLookup}
                  onChange={(event) => setPatientLookup(event.target.value)}
                  placeholder="Search patient by name, ID number, or phone"
                />
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
            ) : null}
            <label className="form-field">
              <span>Patient</span>
              <input name="patient" value={invoiceForm.patient} onChange={handleInvoiceChange} required />
            </label>
            <label className="form-field">
              <span>Patient ID</span>
              <input name="patientId" value={invoiceForm.patientId} onChange={handleInvoiceChange} />
            </label>
            <div className="form-field form-field-full form-section">
              <div className="form-section-header">
                <div>
                  <h4 className="form-section-title">Invoice Items</h4>
                </div>
                <button
                  type="button"
                  className="secondary-button small-button"
                  onClick={addInvoiceItem}
                >
                  Add Item
                </button>
              </div>

              {invoiceForm.invoiceItems.length ? (
                <div className="line-item-stack">
                  {invoiceForm.invoiceItems.map((item, index) => (
                    <div className="line-item-card" key={`invoice-item-${index}`}>
                      <div className="form-grid">
                        <label className="form-field form-field-full">
                          <span>Service / Medication</span>
                          <input
                            list="finance-service-options"
                            value={item.itemName}
                            onChange={(event) =>
                              handleInvoiceItemChange(index, 'itemName', event.target.value)
                            }
                            placeholder="Search service or medication"
                            required
                          />
                        </label>
                        <label className="form-field">
                          <span>Type</span>
                          <input value={item.itemType || 'Service'} disabled />
                        </label>
                        <label className="form-field">
                          <span>Category</span>
                          <input value={item.category || ''} disabled />
                        </label>
                        <label className="form-field">
                          <span>Department</span>
                          <input value={item.department || ''} disabled />
                        </label>
                        <label className="form-field">
                          <span>Quantity</span>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={item.quantity}
                            onChange={(event) =>
                              handleInvoiceItemChange(index, 'quantity', event.target.value)
                            }
                            required
                          />
                        </label>
                        <label className="form-field">
                          <span>Unit Price</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(event) =>
                              handleInvoiceItemChange(index, 'unitPrice', event.target.value)
                            }
                            required
                          />
                        </label>
                        <label className="form-field">
                          <span>Line Total</span>
                          <input value={Number(item.lineTotal || 0).toLocaleString()} disabled />
                        </label>
                      </div>
                      {invoiceForm.invoiceItems.length > 1 ? (
                        <button
                          type="button"
                          className="text-button"
                          onClick={() => removeInvoiceItem(index)}
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            <label className="form-field">
              <span>Invoice Summary</span>
              <input value={invoiceForm.service || 'Auto-generated from items'} disabled />
            </label>
            <label className="form-field">
              <span>Billing Source</span>
              <input value={invoiceForm.serviceCategory || 'Auto-generated from items'} disabled />
            </label>
            <label className="form-field">
              <span>Invoice Type</span>
              <select name="invoiceType" value={invoiceForm.invoiceType} onChange={handleInvoiceChange}>
                <option value="Revenue">Revenue Invoice</option>
                <option value="Proforma">Proforma / Quote</option>
              </select>
            </label>
            <label className="form-field">
              <span>Cashier</span>
              <input name="cashier" value={invoiceForm.cashier} onChange={handleInvoiceChange} required />
            </label>
            <label className="form-field">
              <span>Finance Officer</span>
              <input name="financeOfficer" value={invoiceForm.financeOfficer} onChange={handleInvoiceChange} />
            </label>
            <label className="form-field">
              <span>Channel</span>
              <select name="channel" value={invoiceForm.channel} onChange={handleInvoiceChange}>
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="Insurance">Insurance</option>
                <option value="Transfer">Transfer</option>
                <option value="Mobile Money">Mobile Money</option>
              </select>
            </label>
            <label className="form-field">
              <span>Total Amount</span>
              <input value={Number(invoiceForm.totalAmount || 0).toLocaleString()} disabled />
            </label>
            <label className="form-field">
              <span>Department</span>
              <input name="department" value={invoiceForm.department} onChange={handleInvoiceChange} required />
            </label>
            <label className="form-field">
              <span>Status</span>
              <select name="status" value={invoiceForm.status} onChange={handleInvoiceChange}>
                <option value="Draft">Draft</option>
                <option value="Issued">Issued</option>
                <option value="Pending">Pending</option>
                <option value="Part paid">Part paid</option>
                <option value="Paid">Paid</option>
                <option value="Awaiting approval">Awaiting approval</option>
                <option value="Claim drafted">Claim drafted</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </label>
            <label className="form-field">
              <span>Already Paid</span>
              <input value={invoiceForm.paidAmount || 0} disabled />
            </label>
            <label className="form-field">
              <span>Post Payment</span>
              <input
                name="paymentAmount"
                value={invoiceForm.paymentAmount}
                onChange={handleInvoiceChange}
                placeholder={invoiceForm.invoiceType === 'Proforma' ? 'No payments on proforma' : '0.00'}
                disabled={invoiceForm.invoiceType === 'Proforma'}
              />
            </label>
            <label className="form-field form-field-full">
              <span>Notes</span>
              <textarea name="notes" rows="3" value={invoiceForm.notes} onChange={handleInvoiceChange} />
            </label>
          </div>

          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={closeInvoiceModal}>
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={isSaving}>
              {isSaving ? 'Saving...' : editingInvoiceId ? 'Save Invoice' : 'Create Invoice'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={prescriptionModalOpen}
        title={editingPrescriptionId ? 'Edit Prescription' : 'Create Prescription'}
        subtitle="Pharmacy staff can update medication readiness and cashier verification here."
        onClose={closePrescriptionModal}
      >
        <form className="entity-form" onSubmit={handlePrescriptionSubmit}>
          <div className="line-item-card form-section">
            <ProDataGrid
              items={[
                { label: 'Prescription No', value: prescriptionForm.prescriptionNo || 'Auto-generated' },
                { label: 'Patient', value: prescriptionForm.patient || 'Not selected' },
                { label: 'Medication Count', value: prescriptionForm.medicationCount },
                { label: 'Stock Check', value: prescriptionForm.stockCheck },
                { label: 'Payment State', value: prescriptionForm.paymentState },
              ]}
            />
          </div>
          <div className="form-grid">
            <label className="form-field">
              <span>Prescription No</span>
              <input
                name="prescriptionNo"
                value={prescriptionForm.prescriptionNo}
                onChange={handlePrescriptionChange}
                required
              />
            </label>
            <label className="form-field">
              <span>Patient</span>
              <input name="patient" value={prescriptionForm.patient} onChange={handlePrescriptionChange} required />
            </label>
            <label className="form-field">
              <span>Medication Count</span>
              <input
                name="medicationCount"
                value={prescriptionForm.medicationCount}
                onChange={handlePrescriptionChange}
                required
              />
            </label>
            <label className="form-field">
              <span>Stock Check</span>
              <select
                name="stockCheck"
                value={prescriptionForm.stockCheck}
                onChange={handlePrescriptionChange}
              >
                <option value="Available">Available</option>
                <option value="1 substitute needed">1 substitute needed</option>
                <option value="Unavailable">Unavailable</option>
              </select>
            </label>
            <label className="form-field">
              <span>Payment State</span>
              <select
                name="paymentState"
                value={prescriptionForm.paymentState}
                onChange={handlePrescriptionChange}
              >
                <option value="Pending">Pending</option>
                <option value="Verified">Verified</option>
                <option value="Awaiting cashier">Awaiting cashier</option>
                <option value="Emergency override">Emergency override</option>
              </select>
            </label>
          </div>

          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={closePrescriptionModal}>
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={isSaving}>
              {isSaving
                ? 'Saving...'
                : editingPrescriptionId
                  ? 'Save Prescription'
                  : 'Create Prescription'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default BillingPage;
