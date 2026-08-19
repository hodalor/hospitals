import { useEffect, useMemo, useState } from 'react';
import { useToast } from '../app/ToastContext';
import { hospitalApi } from '../api/hospitalApi';
import SectionCard from '../components/common/SectionCard';
import StatCard from '../components/common/StatCard';
import TableToolbar from '../components/common/TableToolbar';
import DataTable from '../components/tables/DataTable';
import { isWithinDateRange } from '../utils/dateFilters';
import { printReceiptDocument } from '../utils/financePrint';

function ReceiptsPage({ data, auth, pricingItems, branches }) {
  const [records, setRecords] = useState(data.receipts || []);
  const [searchValue, setSearchValue] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const { showToast } = useToast();
  const branding = useMemo(() => data.branding || {}, [data.branding]);

  const activeBranches = useMemo(
    () =>
      (branches || [])
        .filter((branch) => branch.isActive !== false)
        .sort((left, right) => left.name.localeCompare(right.name)),
    [branches]
  );

  useEffect(() => {
    setRecords(data.receipts || []);
  }, [data.receipts]);

  const receiptColumns = useMemo(
    () => [
      { key: 'date', header: 'Date' },
      { key: 'receiptNo', header: 'Receipt No' },
      { key: 'invoiceNo', header: 'Invoice No' },
      { key: 'patient', header: 'Patient' },
      { key: 'branchName', header: 'Branch' },
      { key: 'service', header: 'Service' },
      { key: 'amount', header: 'Amount' },
      { key: 'cashier', header: 'Cashier' },
      { key: 'channel', header: 'Channel', badge: true },
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
                const printableReceipt = row.id ? await hospitalApi.getReceiptDocument(row.id) : row;
                printReceiptDocument(printableReceipt, branding, pricingItems);
              } catch (error) {
                showToast(error.message || 'Unable to load the full receipt for printing.', 'error');
              }
            }}
          >
            Print
          </button>
        ),
      },
    ],
    [branding, pricingItems, showToast]
  );

  const filteredRecords = useMemo(
    () =>
      records.filter((item) => {
        const matchesSearch = [
          item.receiptNo,
          item.invoiceNo,
          item.patient,
          item.branchName,
          item.service,
          item.cashier,
          item.channel,
        ]
          .join(' ')
          .toLowerCase()
          .includes(searchValue.toLowerCase());

        const matchesBranch = branchFilter === 'all' || item.branchName === branchFilter;
        const matchesDate = isWithinDateRange(item.createdAt || item.date, startDateFilter, endDateFilter);
        return matchesSearch && matchesBranch && matchesDate;
      }),
    [records, searchValue, branchFilter, startDateFilter, endDateFilter]
  );

  if (!auth.canViewData('billing_records')) {
    return (
      <SectionCard eyebrow="Access control" title="Receipt access is restricted">
        <p className="panel-copy">The active user cannot view receipt records.</p>
      </SectionCard>
    );
  }

  return (
    <div className="page-stack">
      <div className="stats-grid stats-grid-compact">
        <StatCard label="Receipts" value={records.length} />
        <StatCard label="Posted Value" value={records.reduce((sum, item) => sum + Number(item.amount || 0), 0).toLocaleString()} />
      </div>

      <section className="panel">
        <TableToolbar
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder="Search receipt, invoice, patient, service, cashier, or channel"
          filters={[
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
          columns={receiptColumns}
          rows={filteredRecords}
          caption="Finance receipt register"
          emptyMessage="No receipts match the current filters."
        />
      </section>
    </div>
  );
}

export default ReceiptsPage;
