const DEFAULT_FACILITY_PROFILE = {
  name: 'HealthNova Hospital',
  branch: 'Main',
  address: 'Hospital Road, HealthNova',
  phone: '+260 000 000 000 / +233 000 000 000',
  email: 'finance@healthnova.local',
  logoDataUrl: '',
};

const formatCurrency = (value, currencyCode = 'GHS') =>
  `${currencyCode} ${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDateTime = (value) => {
  if (!value) {
    return '';
  }

  return new Date(value).toLocaleString();
};

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const resolveFacilityProfile = (branding = {}, documentRecord = {}) => ({
  name: branding.hospitalName || DEFAULT_FACILITY_PROFILE.name,
  branch: documentRecord.branchName || branding.branchName || DEFAULT_FACILITY_PROFILE.branch,
  address: [branding.address, branding.location].filter(Boolean).join(', ') || DEFAULT_FACILITY_PROFILE.address,
  phone: branding.phoneNumbers || DEFAULT_FACILITY_PROFILE.phone,
  email: branding.email || DEFAULT_FACILITY_PROFILE.email,
  logoDataUrl: branding.logoDataUrl || '',
  currency: branding.defaultCurrency || documentRecord.currency || 'GHS',
});

const renderLogoMarkup = (facilityProfile) => {
  if (facilityProfile.logoDataUrl) {
    return `<img class="doc-logo-image" src="${escapeHtml(facilityProfile.logoDataUrl)}" alt="${escapeHtml(
      facilityProfile.name
    )}" />`;
  }

  return '<div class="doc-logo-fallback">HN</div>';
};

const splitLegacySummary = (summary = '') => {
  const labels = String(summary)
    .split(',')
    .map((label) => label.trim())
    .filter(Boolean);

  let hiddenCount = 0;

  if (labels.length) {
    const lastLabel = labels[labels.length - 1];
    const moreMatch = lastLabel.match(/^(.*?)(?:\s*\+(\d+)\s+more)$/i);

    if (moreMatch) {
      labels[labels.length - 1] = moreMatch[1].trim();
      hiddenCount = Number(moreMatch[2] || 0);
    }
  }

  return {
    labels: labels.filter(Boolean),
    hiddenCount,
  };
};

const findCatalogMatch = (label, catalog = []) =>
  (catalog || []).find((item) => String(item.name || '').trim().toLowerCase() === label.toLowerCase());

export const buildPrintableItems = (record, catalog = []) => {
  if (Array.isArray(record?.invoiceItems) && record.invoiceItems.length) {
    return {
      items: record.invoiceItems,
      recoveryNotice: '',
      usedRecovery: false,
    };
  }

  if (!record?.service) {
    return {
      items: [],
      recoveryNotice: '',
      usedRecovery: false,
    };
  }

  const totalAmount = Number(record.totalAmount || record.invoiceTotal || record.amount || 0);
  const { labels, hiddenCount } = splitLegacySummary(record.service);
  const unresolvedIndexes = [];

  const items = labels.map((label, index) => {
    const catalogMatch = findCatalogMatch(label, catalog);

    if (!catalogMatch) {
      unresolvedIndexes.push(index);
    }

    return {
      itemName: label,
      itemType:
        catalogMatch?.itemType || (record.serviceCategory === 'Medication' ? 'Medication' : 'Service'),
      category: catalogMatch?.category || record.serviceCategory || '',
      department: catalogMatch?.department || record.department || '',
      quantity: 1,
      unitPrice: Number(catalogMatch?.unitPrice || 0),
      lineTotal: Number(catalogMatch?.unitPrice || 0),
    };
  });

  for (let index = 0; index < hiddenCount; index += 1) {
    unresolvedIndexes.push(items.length);
    items.push({
      itemName: `Recovered item ${index + 1} (review)`,
      itemType: record.serviceCategory === 'Medication' ? 'Medication' : 'Service',
      category: record.serviceCategory || '',
      department: record.department || '',
      quantity: 1,
      unitPrice: 0,
      lineTotal: 0,
    });
  }

  const knownTotal = items.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0);
  const balanceToAllocate = Math.max(totalAmount - knownTotal, 0);

  if (balanceToAllocate > 0 && unresolvedIndexes.length) {
    const evenShare = Number((balanceToAllocate / unresolvedIndexes.length).toFixed(2));
    let assignedTotal = 0;

    unresolvedIndexes.forEach((itemIndex, unresolvedIndex) => {
      const item = items[itemIndex];
      const isLast = unresolvedIndex === unresolvedIndexes.length - 1;
      const lineTotal = isLast ? Number((balanceToAllocate - assignedTotal).toFixed(2)) : evenShare;
      item.unitPrice = lineTotal;
      item.lineTotal = lineTotal;
      assignedTotal += lineTotal;
    });
  }

  if (!items.length) {
    items.push({
      itemName: record.service,
      itemType: record.serviceCategory === 'Medication' ? 'Medication' : 'Service',
      category: record.serviceCategory || '',
      department: record.department || '',
      quantity: 1,
      unitPrice: totalAmount,
      lineTotal: totalAmount,
    });
  }

  const recoveryNotice =
    hiddenCount || unresolvedIndexes.length
      ? 'This document was rebuilt from an older summary record. Please review recovered item names and prices.'
      : 'This document was rebuilt from an older summary record.';

  return {
    items,
    recoveryNotice,
    usedRecovery: true,
  };
};

const numberToWordsBelow1000 = (value) => {
  const units = [
    'zero',
    'one',
    'two',
    'three',
    'four',
    'five',
    'six',
    'seven',
    'eight',
    'nine',
    'ten',
    'eleven',
    'twelve',
    'thirteen',
    'fourteen',
    'fifteen',
    'sixteen',
    'seventeen',
    'eighteen',
    'nineteen',
  ];
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

  if (value < 20) {
    return units[value];
  }

  if (value < 100) {
    return `${tens[Math.floor(value / 10)]}${value % 10 ? ` ${units[value % 10]}` : ''}`;
  }

  return `${units[Math.floor(value / 100)]} hundred${
    value % 100 ? ` ${numberToWordsBelow1000(value % 100)}` : ''
  }`;
};

const numberToWords = (value) => {
  const wholeValue = Math.floor(Number(value || 0));
  const decimalValue = Math.round((Number(value || 0) - wholeValue) * 100);

  if (!wholeValue) {
    return `zero ${decimalValue.toString().padStart(2, '0')}/100`;
  }

  const scales = [
    { size: 1000000, label: 'million' },
    { size: 1000, label: 'thousand' },
  ];

  let remaining = wholeValue;
  const parts = [];

  scales.forEach((scale) => {
    if (remaining >= scale.size) {
      const scaled = Math.floor(remaining / scale.size);
      parts.push(`${numberToWordsBelow1000(scaled)} ${scale.label}`);
      remaining %= scale.size;
    }
  });

  if (remaining) {
    parts.push(numberToWordsBelow1000(remaining));
  }

  return `${parts.join(' ')} ${decimalValue.toString().padStart(2, '0')}/100 only`;
};

const openPrintWindow = ({ title, body }) => {
  const printWindow = window.open('about:blank', '_blank', 'width=980,height=900');

  if (!printWindow) {
    window.alert('Allow pop-ups to open the printable document.');
    return;
  }

  const documentMarkup = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      :root {
        color-scheme: light;
        font-family: Arial, Helvetica, sans-serif;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 18px;
        background: #f3f4f8;
        color: #111827;
      }
      .print-page {
        width: 210mm;
        min-height: 297mm;
        margin: 0 auto;
        background: #ffffff;
        padding: 18mm 16mm;
        position: relative;
        box-shadow: 0 8px 28px rgba(15, 23, 42, 0.12);
      }
      .doc-topline,
      .doc-footerline {
        display: flex;
        justify-content: space-between;
        font-size: 11px;
        margin-bottom: 12px;
      }
      .doc-title {
        text-align: center;
        font-size: 30px;
        font-weight: 700;
        margin: 8px 0 18px;
        letter-spacing: 0.02em;
      }
      .doc-brand {
        display: grid;
        grid-template-columns: 90px 1fr;
        gap: 14px;
        align-items: center;
        margin-bottom: 14px;
      }
      .doc-logo {
        width: 76px;
        height: 76px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        background: radial-gradient(circle at 30% 30%, #274c77, #0f172a 70%);
        color: #ffffff;
        font-size: 23px;
        font-weight: 800;
        letter-spacing: 0.06em;
        overflow: hidden;
      }
      .doc-logo-image {
        width: 100%;
        height: 100%;
        object-fit: contain;
        background: #ffffff;
      }
      .doc-logo-fallback {
        display: grid;
        place-items: center;
        width: 100%;
        height: 100%;
      }
      .doc-brand h1,
      .doc-brand h2,
      .doc-brand p {
        margin: 0;
      }
      .doc-brand-name {
        font-size: 28px;
        font-weight: 800;
        letter-spacing: 0.02em;
      }
      .doc-subtle {
        color: #475569;
        font-size: 12px;
      }
      .doc-watermark {
        position: absolute;
        top: 48mm;
        right: 14mm;
        width: 140px;
        height: 140px;
        border: 5px solid rgba(34, 197, 94, 0.16);
        color: rgba(34, 197, 94, 0.26);
        border-radius: 50%;
        display: grid;
        place-items: center;
        text-align: center;
        transform: rotate(-10deg);
        font-weight: 800;
        pointer-events: none;
      }
      .doc-watermark strong {
        display: block;
        font-size: 34px;
      }
      .doc-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 18px;
        margin: 16px 0;
      }
      .doc-card,
      .doc-box {
        border: 1px solid #111827;
      }
      .doc-card {
        padding: 10px 12px;
      }
      .doc-card h3 {
        margin: 0 0 6px;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }
      .doc-card p {
        margin: 2px 0;
        font-size: 12px;
      }
      .doc-box table,
      .doc-table {
        width: 100%;
        border-collapse: collapse;
      }
      .doc-box td,
      .doc-box th,
      .doc-table td,
      .doc-table th {
        border: 1px solid #111827;
        padding: 7px 8px;
        font-size: 12px;
        vertical-align: top;
      }
      .doc-box th,
      .doc-table th {
        background: #f8fafc;
        text-align: left;
      }
      .doc-table td.numeric,
      .doc-table th.numeric {
        text-align: right;
      }
      .doc-table tfoot td {
        font-weight: 700;
      }
      .doc-section-title {
        margin: 18px 0 8px;
        font-size: 13px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }
      .doc-note {
        margin-top: 16px;
        font-size: 12px;
        line-height: 1.5;
      }
      .signature-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 30px;
        margin-top: 44px;
      }
      .signature-line {
        border-top: 1px solid #111827;
        padding-top: 8px;
        font-size: 12px;
      }
      .center {
        text-align: center;
      }
      .receipt-mini td {
        border: 0;
        border-bottom: 1px dashed #cbd5e1;
        padding: 4px 0;
      }
      .receipt-mini td:last-child {
        text-align: right;
      }
      .receipt-qr {
        width: 110px;
        height: 110px;
        margin: 10px auto 8px;
        border: 2px solid #111827;
        display: grid;
        place-items: center;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      @media print {
        body {
          padding: 0;
          background: #ffffff;
        }
        .print-page {
          box-shadow: none;
          margin: 0;
          width: auto;
          min-height: auto;
        }
      }
    </style>
  </head>
  <body>${body}</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(documentMarkup);
  printWindow.document.close();

  let hasPrinted = false;
  const triggerPrint = () => {
    if (hasPrinted || printWindow.closed) {
      return;
    }

    hasPrinted = true;

    try {
      printWindow.focus();
      printWindow.print();
    } catch (error) {
      window.alert('Unable to open the print preview. Please try again.');
    }
  };

  // Some browsers need a small render delay after document.write before printing.
  printWindow.onload = () => {
    printWindow.setTimeout(triggerPrint, 250);
  };

  window.setTimeout(() => {
    if (printWindow && !printWindow.closed) {
      triggerPrint();
    }
  }, 600);
};

export const printInvoiceDocument = (invoice, branding = {}, catalog = []) => {
  const facilityProfile = resolveFacilityProfile(branding, invoice);
  const printableItems = buildPrintableItems(invoice, catalog);
  const items = printableItems.items;
  const grandTotal = Number(invoice.totalAmount || invoice.amount || 0);
  const subtotal = items.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0);
  const balance = Number(invoice.balance || Math.max(grandTotal - Number(invoice.paidAmount || 0), 0));

  const itemRows = items
    .map(
      (item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(item.itemName)}</td>
          <td class="numeric">${escapeHtml(item.quantity)}</td>
          <td class="numeric">${formatCurrency(item.unitPrice, facilityProfile.currency)}</td>
          <td>${escapeHtml(item.itemType || item.catalogSection || '')}</td>
          <td class="numeric">${formatCurrency(item.lineTotal, facilityProfile.currency)}</td>
        </tr>`
    )
    .join('');

  openPrintWindow({
    title: `Invoice ${invoice.invoiceNo}`,
    body: `
      <div class="print-page">
        <div class="doc-topline">
          <span>${escapeHtml(formatDateTime(invoice.createdAt || invoice.date))}</span>
          <span>Invoice</span>
        </div>
        <div class="doc-title">Invoice</div>
        <div class="doc-watermark"><div><strong>${invoice.status === 'Paid' ? 'PAID' : 'HN'}</strong>${escapeHtml(invoice.status || invoice.invoiceType || '')}</div></div>
        <div class="doc-grid">
          <div class="doc-brand">
            <div class="doc-logo">${renderLogoMarkup(facilityProfile)}</div>
            <div>
              <p class="doc-brand-name">${escapeHtml(facilityProfile.name)}</p>
              <p class="doc-subtle">${escapeHtml(facilityProfile.branch)}</p>
              <p class="doc-subtle">${escapeHtml(facilityProfile.address)}</p>
              <p class="doc-subtle">Phone: ${escapeHtml(facilityProfile.phone)}</p>
              <p class="doc-subtle">${escapeHtml(facilityProfile.email)}</p>
            </div>
          </div>
          <div class="doc-box">
            <table>
              <tbody>
                <tr><th>Invoice No.</th><td>${escapeHtml(invoice.invoiceNo || '')}</td><th>Dated</th><td>${escapeHtml(invoice.date || '')}</td></tr>
                <tr><th>Invoice Type</th><td>${escapeHtml(invoice.invoiceType || '')}</td><th>Mode/Terms</th><td>${escapeHtml(invoice.channel || '')}</td></tr>
                <tr><th>Department</th><td>${escapeHtml(invoice.department || '')}</td><th>Status</th><td>${escapeHtml(invoice.status || '')}</td></tr>
                <tr><th>Cashier</th><td>${escapeHtml(invoice.cashier || '')}</td><th>Finance Officer</th><td>${escapeHtml(invoice.financeOfficer || '')}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="doc-box">
          <table>
            <tbody>
              <tr><th>Buyer</th><td>${escapeHtml(invoice.patient || '')}</td><th>Patient ID</th><td>${escapeHtml(invoice.patientId || '')}</td></tr>
              <tr><th>Phone</th><td>-</td><th>Destination</th><td>${escapeHtml(invoice.department || '')}</td></tr>
              <tr><th>Terms of Delivery</th><td>${escapeHtml(invoice.channel || '')}</td><th>Reference</th><td>${escapeHtml(invoice.serviceCategory || '')}</td></tr>
            </tbody>
          </table>
        </div>

        <div class="doc-section-title">Items</div>
        <table class="doc-table">
          <thead>
            <tr>
              <th>Sl No.</th>
              <th>Description of Goods</th>
              <th class="numeric">Quantity</th>
              <th class="numeric">Rate</th>
              <th>Per</th>
              <th class="numeric">Amount</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
          <tfoot>
            <tr><td colspan="5" class="numeric">Total</td><td class="numeric">${formatCurrency(subtotal, facilityProfile.currency)}</td></tr>
            <tr><td colspan="5" class="numeric">Paid</td><td class="numeric">${formatCurrency(invoice.paidAmount || 0, facilityProfile.currency)}</td></tr>
            <tr><td colspan="5" class="numeric">Balance</td><td class="numeric">${formatCurrency(balance, facilityProfile.currency)}</td></tr>
            <tr><td colspan="5" class="numeric">Grand Total</td><td class="numeric">${formatCurrency(grandTotal, facilityProfile.currency)}</td></tr>
          </tfoot>
        </table>

        <div class="doc-note">
          <strong>Amount Chargeable (in words)</strong><br />
          ${escapeHtml(numberToWords(grandTotal))}
        </div>
        <div class="doc-note">
          <strong>Declaration</strong><br />
          We declare that this invoice shows the actual charges for the listed services and medications and that all particulars are true and correct.
        </div>
        ${
          printableItems.recoveryNotice
            ? `<div class="doc-note"><strong>Review Note</strong><br />${escapeHtml(printableItems.recoveryNotice)}</div>`
            : ''
        }

        <div class="signature-grid">
          <div class="signature-line">Customer Signature</div>
          <div class="signature-line center">Authorized Signatory</div>
        </div>

        <div class="doc-footerline" style="margin-top: 26px;">
          <span>This is a computer generated invoice.</span>
          <span>${escapeHtml(facilityProfile.name)}</span>
        </div>
      </div>`,
  });
};

export const printReceiptDocument = (receipt, branding = {}, catalog = []) => {
  const facilityProfile = resolveFacilityProfile(branding, receipt);
  const printableItems = buildPrintableItems(receipt, catalog);
  const items = printableItems.items;
  const subtotal = items.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0);
  const totalItems = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  const itemRows = items
    .map(
      (item) => `
        <tr>
          <td>
            <strong>${escapeHtml(item.itemName)}</strong><br />
            <span class="doc-subtle">${escapeHtml(item.quantity)} x ${formatCurrency(item.unitPrice, facilityProfile.currency)}</span>
          </td>
          <td>${formatCurrency(item.lineTotal, facilityProfile.currency)}</td>
        </tr>`
    )
    .join('');

  openPrintWindow({
    title: `Receipt ${receipt.receiptNo}`,
    body: `
      <div class="print-page">
        <div class="doc-topline">
          <span>${escapeHtml(formatDateTime(receipt.createdAt || receipt.date))}</span>
          <span>Receipt</span>
        </div>
        <div class="center">
          <div class="doc-logo" style="margin: 0 auto 10px;">${renderLogoMarkup(facilityProfile)}</div>
          <div style="font-size: 18px; font-weight: 800;">${escapeHtml(facilityProfile.name)}</div>
          <div class="doc-subtle">${escapeHtml(facilityProfile.branch)}</div>
          <div class="doc-subtle">${escapeHtml(facilityProfile.address)}</div>
          <div class="doc-subtle">${escapeHtml(facilityProfile.phone)}</div>
        </div>
        <div class="doc-watermark"><div><strong>PAID</strong>${escapeHtml(receipt.date || '')}</div></div>

        <div class="doc-section-title">Sale Info</div>
        <div class="doc-card">
          <p><strong>Cashier:</strong> ${escapeHtml(receipt.cashier || '')}</p>
          <p><strong>Patient:</strong> ${escapeHtml(receipt.patient || '')}</p>
          <p><strong>Patient ID:</strong> ${escapeHtml(receipt.patientId || '')}</p>
          <p><strong>Channel:</strong> ${escapeHtml(receipt.channel || '')}</p>
        </div>

        <div class="doc-section-title">Items</div>
        <table class="doc-table receipt-mini">
          <tbody>${itemRows}</tbody>
        </table>

        <div class="doc-section-title">Payments</div>
        <table class="doc-table receipt-mini">
          <tbody>
            <tr><td>Total Sale</td><td>${formatCurrency(receipt.invoiceTotal || subtotal, facilityProfile.currency)}</td></tr>
            <tr><td>Subtotal</td><td>${formatCurrency(subtotal, facilityProfile.currency)}</td></tr>
            <tr><td>Amount Paid</td><td>${formatCurrency(receipt.amount || 0, facilityProfile.currency)}</td></tr>
            <tr><td>Balance</td><td>${formatCurrency(receipt.balanceAfterPayment || 0, facilityProfile.currency)}</td></tr>
            <tr><td><strong>Total Items</strong></td><td><strong>${escapeHtml(totalItems)}</strong></td></tr>
          </tbody>
        </table>

        <div class="doc-section-title">Tax Invoice</div>
        <table class="doc-table receipt-mini">
          <tbody>
            <tr><td>Receipt</td><td>${escapeHtml(receipt.receiptNo || '')}</td></tr>
            <tr><td>Invoice</td><td>${escapeHtml(receipt.invoiceNo || '')}</td></tr>
            <tr><td>Invoice Type</td><td>${escapeHtml(receipt.invoiceType || '')}</td></tr>
            <tr><td>Category</td><td>${escapeHtml(receipt.serviceCategory || '')}</td></tr>
          </tbody>
        </table>

        <div class="center" style="margin-top: 18px;">
          <div>Scan to view online</div>
          <div class="receipt-qr">HealthNova</div>
          <div class="doc-subtle">${escapeHtml(facilityProfile.email)}</div>
          <div style="margin-top: 6px;">Thank you for choosing us.</div>
        </div>
        ${
          printableItems.recoveryNotice
            ? `<div class="doc-note"><strong>Review Note</strong><br />${escapeHtml(printableItems.recoveryNotice)}</div>`
            : ''
        }

        <div class="doc-footerline" style="margin-top: 28px;">
          <span>No refunds without receipt.</span>
          <span>Posted by ${escapeHtml(receipt.financeOfficer || receipt.cashier || '')}</span>
        </div>
      </div>`,
  });
};
