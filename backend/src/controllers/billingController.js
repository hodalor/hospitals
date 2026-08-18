const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const Prescription = require('../models/Prescription');
const { asyncHandler } = require('../utils/asyncHandler');
const { applyBranchScope, buildBranchFilter } = require('../utils/branchScope');
const { MAIN_BRANCH_NAME } = require('../services/branchService');

const generateInvoiceNo = () =>
  `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Date.now().toString().slice(-5)}`;

const generateReceiptNo = () =>
  `RCT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Date.now().toString().slice(-5)}`;

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeInvoiceItems = (items = [], fallbackInvoice = null) => {
  const sourceItems = Array.isArray(items) && items.length
    ? items
    : fallbackInvoice?.invoiceItems || [];

  return sourceItems
    .map((item) => {
      const itemName = String(item?.itemName || item?.service || '').trim();
      const quantity = Math.max(1, toNumber(item?.quantity) || 1);
      const unitPrice = Math.max(0, toNumber(item?.unitPrice));
      const lineTotal = Math.max(0, toNumber(item?.lineTotal) || unitPrice * quantity);

      if (!itemName) {
        return null;
      }

      return {
        itemName,
        itemType: item?.itemType === 'Medication' ? 'Medication' : 'Service',
        catalogSection: String(item?.catalogSection || '').trim(),
        category: String(item?.category || item?.serviceCategory || '').trim(),
        department: String(item?.department || '').trim(),
        unitPrice,
        quantity,
        lineTotal,
      };
    })
    .filter(Boolean);
};

const summarizeInvoiceServices = (items = [], fallbackService = '') => {
  const labels = items.map((item) => item.itemName).filter(Boolean);

  if (!labels.length) {
    return String(fallbackService || '').trim();
  }

  if (labels.length <= 2) {
    return labels.join(', ');
  }

  return `${labels.slice(0, 2).join(', ')} +${labels.length - 2} more`;
};

const summarizeInvoiceCategory = (items = [], fallbackCategory = '') => {
  if (!items.length) {
    return String(fallbackCategory || '').trim();
  }

  const uniqueTypes = Array.from(new Set(items.map((item) => item.itemType).filter(Boolean)));
  const uniqueSections = Array.from(new Set(items.map((item) => item.catalogSection).filter(Boolean)));

  if (uniqueTypes.length === 1 && uniqueTypes[0] === 'Medication') {
    return 'Medication';
  }

  if (uniqueSections.length === 1) {
    return uniqueSections[0];
  }

  return uniqueSections.length ? 'Mixed Invoice' : String(fallbackCategory || '').trim();
};

const summarizeInvoiceDepartment = (items = [], fallbackDepartment = '') => {
  if (!items.length) {
    return String(fallbackDepartment || '').trim();
  }

  const uniqueDepartments = Array.from(new Set(items.map((item) => item.department).filter(Boolean)));

  if (!uniqueDepartments.length) {
    return String(fallbackDepartment || '').trim();
  }

  return uniqueDepartments.length === 1 ? uniqueDepartments[0] : 'Multiple departments';
};

const resolveInvoiceStatus = ({ explicitStatus, invoiceType, totalAmount, paidAmount }) => {
  if (explicitStatus === 'Cancelled') {
    return 'Cancelled';
  }

  if (explicitStatus === 'Awaiting approval' || explicitStatus === 'Claim drafted') {
    return explicitStatus;
  }

  if (invoiceType === 'Proforma' && !paidAmount) {
    return explicitStatus === 'Issued' ? 'Issued' : 'Draft';
  }

  if (paidAmount >= totalAmount && totalAmount > 0) {
    return 'Paid';
  }

  if (paidAmount > 0 && paidAmount < totalAmount) {
    return 'Part paid';
  }

  return explicitStatus === 'Issued' ? 'Issued' : 'Pending';
};

const serializeInvoice = (invoice) => ({
  id: invoice._id,
  invoiceNo: invoice.invoiceNo,
  patient: invoice.patientName,
  patientId: invoice.patientId || '',
  service: summarizeInvoiceServices(invoice.invoiceItems, invoice.service),
  serviceCategory: summarizeInvoiceCategory(invoice.invoiceItems, invoice.serviceCategory),
  invoiceItems: normalizeInvoiceItems(invoice.invoiceItems).map((item) => ({
    ...item,
    unitPrice: toNumber(item.unitPrice),
    quantity: toNumber(item.quantity),
    lineTotal: toNumber(item.lineTotal),
  })),
  itemCount: normalizeInvoiceItems(invoice.invoiceItems).length,
  invoiceType: invoice.invoiceType || 'Revenue',
  cashier: invoice.cashierName || '',
  financeOfficer: invoice.financeOfficer || '',
  channel: invoice.channel,
  amount: toNumber(invoice.totalAmount || invoice.amount),
  totalAmount: toNumber(invoice.totalAmount || invoice.amount),
  paidAmount: toNumber(invoice.paidAmount),
  balance: Math.max(toNumber(invoice.totalAmount || invoice.amount) - toNumber(invoice.paidAmount), 0),
  department: invoice.department,
  status: invoice.status,
  notes: invoice.notes || '',
  isRevenue: invoice.invoiceType !== 'Proforma' && toNumber(invoice.paidAmount) > 0,
  date: invoice.createdAt ? new Date(invoice.createdAt).toISOString().slice(0, 10) : '',
  createdAt: invoice.createdAt,
});

const serializeReceipt = (payment) => ({
  id: payment._id,
  receiptNo: payment.receiptNo,
  invoiceNo: payment.invoiceNo,
  patient: payment.patientName,
  patientId: payment.patientId || payment.invoice?.patientId || '',
  branchName: payment.branchName || payment.invoice?.branchName || '',
  service: payment.service,
  serviceCategory: payment.serviceCategory || '',
  invoiceItems: normalizeInvoiceItems(payment.invoiceItems, payment.invoice),
  invoiceType: payment.invoiceType || payment.invoice?.invoiceType || 'Revenue',
  department: payment.department || payment.invoice?.department || '',
  invoiceTotal: toNumber(payment.invoiceTotal || payment.invoice?.totalAmount || payment.amount),
  balanceAfterPayment: toNumber(
    payment.balanceAfterPayment
    ?? Math.max(
      toNumber(payment.invoiceTotal || payment.invoice?.totalAmount || payment.amount) - toNumber(payment.amount),
      0
    )
  ),
  amount: toNumber(payment.amount),
  channel: payment.channel,
  cashier: payment.cashierName || '',
  financeOfficer: payment.financeOfficer || '',
  status: payment.status,
  date: payment.postedAt ? new Date(payment.postedAt).toISOString().slice(0, 10) : '',
  createdAt: payment.postedAt || payment.createdAt,
});

const serializePrescription = (prescription) => ({
  id: prescription._id,
  prescriptionNo: prescription.prescriptionNo,
  patient: prescription.patientName,
  branchName: prescription.branchName || '',
  medicationCount: prescription.medicationCount,
  stockCheck: prescription.stockCheck,
  paymentState: prescription.paymentState,
  date: prescription.createdAt ? new Date(prescription.createdAt).toISOString().slice(0, 10) : '',
  createdAt: prescription.createdAt,
});

const getBillingOverview = asyncHandler(async (req, res) => {
  const [transactions, pharmacyQueue, receipts] = await Promise.all([
    Invoice.find(buildBranchFilter(req)).sort({ createdAt: -1 }),
    Prescription.find(buildBranchFilter(req)).sort({ createdAt: -1 }),
    Payment.find(buildBranchFilter(req)).populate('invoice').sort({ postedAt: -1 }),
  ]);

  res.json({
    success: true,
    data: {
      transactions: transactions.map(serializeInvoice),
      pharmacyQueue: pharmacyQueue.map(serializePrescription),
      receipts: receipts.map(serializeReceipt),
    },
  });
});

const getInvoiceById = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({
    _id: req.params.id,
    ...buildBranchFilter(req, 'branchName', ''),
  });

  if (!invoice) {
    res.status(404);
    throw new Error('Invoice not found');
  }

  res.json({
    success: true,
    data: serializeInvoice(invoice),
  });
});

const getReceiptById = asyncHandler(async (req, res) => {
  const receipt = await Payment.findOne({
    _id: req.params.id,
    ...buildBranchFilter(req, 'branchName', ''),
  }).populate('invoice');

  if (!receipt) {
    res.status(404);
    throw new Error('Receipt not found');
  }

  res.json({
    success: true,
    data: serializeReceipt(receipt),
  });
});

const buildInvoicePayload = (body, existingInvoice = null) => {
  const invoiceItems = normalizeInvoiceItems(body.invoiceItems, existingInvoice);
  const totalFromItems = invoiceItems.reduce((sum, item) => sum + toNumber(item.lineTotal), 0);
  const totalAmount = invoiceItems.length
    ? totalFromItems
    : toNumber(body.totalAmount ?? body.amount ?? existingInvoice?.totalAmount ?? 0);
  const incomingPaidAmount = toNumber(body.paymentAmount);
  const currentPaidAmount = toNumber(existingInvoice?.paidAmount);
  const paidAmount = currentPaidAmount + incomingPaidAmount;
  const invoiceType = body.invoiceType || existingInvoice?.invoiceType || 'Revenue';
  const explicitStatus = body.status || existingInvoice?.status || 'Draft';
  const service = summarizeInvoiceServices(invoiceItems, body.service || existingInvoice?.service || '');
  const serviceCategory = summarizeInvoiceCategory(
    invoiceItems,
    body.serviceCategory || existingInvoice?.serviceCategory || ''
  );
  const department = body.department || summarizeInvoiceDepartment(invoiceItems, existingInvoice?.department || '');

  return {
    invoiceNo: body.invoiceNo || existingInvoice?.invoiceNo || generateInvoiceNo(),
    patientName: body.patient || existingInvoice?.patientName || '',
    branchName: body.branchName || existingInvoice?.branchName || MAIN_BRANCH_NAME,
    patientId: body.patientId || existingInvoice?.patientId || '',
    service,
    serviceCategory,
    invoiceItems,
    invoiceType,
    cashierName: body.cashier || existingInvoice?.cashierName || '',
    financeOfficer: body.financeOfficer || existingInvoice?.financeOfficer || '',
    channel: body.channel || existingInvoice?.channel || 'Cash',
    totalAmount,
    paidAmount,
    amount: String(totalAmount),
    department,
    notes: body.notes || existingInvoice?.notes || '',
    status: resolveInvoiceStatus({
      explicitStatus,
      invoiceType,
      totalAmount,
      paidAmount,
    }),
    paymentAmount: incomingPaidAmount,
  };
};

const createPaymentIfNeeded = async (invoice, payload) => {
  if (payload.paymentAmount <= 0 || payload.invoiceType === 'Proforma') {
    return null;
  }

  const payment = await Payment.create({
    receiptNo: generateReceiptNo(),
    invoice: invoice._id,
    invoiceNo: invoice.invoiceNo,
    patientName: invoice.patientName,
    branchName: invoice.branchName || MAIN_BRANCH_NAME,
    patientId: invoice.patientId || '',
    service: invoice.service,
    serviceCategory: invoice.serviceCategory,
    invoiceItems: normalizeInvoiceItems(invoice.invoiceItems),
    invoiceType: invoice.invoiceType,
    department: invoice.department || '',
    invoiceTotal: toNumber(invoice.totalAmount || invoice.amount),
    balanceAfterPayment: Math.max(
      toNumber(invoice.totalAmount || invoice.amount) - toNumber(invoice.paidAmount),
      0
    ),
    amount: payload.paymentAmount,
    channel: invoice.channel,
    cashierName: invoice.cashierName,
    financeOfficer: invoice.financeOfficer,
    postedAt: new Date(),
  });

  return payment;
};

const createInvoice = asyncHandler(async (req, res) => {
  const payload = buildInvoicePayload(req.body);

  if (!payload.invoiceItems.length && !payload.service) {
    res.status(400);
    throw new Error('Add at least one service or medication before creating the invoice.');
  }

  const invoice = await Invoice.create(
    applyBranchScope(req, {
      invoiceNo: payload.invoiceNo,
      patientName: payload.patientName,
      branchName: payload.branchName || req.activeUser?.branchName || MAIN_BRANCH_NAME,
      patientId: payload.patientId,
      service: payload.service,
      serviceCategory: payload.serviceCategory,
      invoiceItems: payload.invoiceItems,
      invoiceType: payload.invoiceType,
      cashierName: payload.cashierName,
      financeOfficer: payload.financeOfficer,
      channel: payload.channel,
      totalAmount: payload.totalAmount,
      paidAmount: payload.paidAmount,
      amount: payload.amount,
      department: payload.department,
      status: payload.status,
      notes: payload.notes,
    })
  );
  await createPaymentIfNeeded(invoice, payload);

  res.status(201).json({
    success: true,
    data: serializeInvoice(invoice),
  });
});

const updateInvoice = asyncHandler(async (req, res) => {
  const existingInvoice = await Invoice.findOne({
    _id: req.params.id,
    ...buildBranchFilter(req, 'branchName', ''),
  });

  if (!existingInvoice) {
    res.status(404);
    throw new Error('Invoice not found');
  }

  const payload = buildInvoicePayload(req.body, existingInvoice);

  if (!payload.invoiceItems.length && !payload.service) {
    res.status(400);
    throw new Error('Add at least one service or medication before saving the invoice.');
  }

  existingInvoice.invoiceNo = payload.invoiceNo;
  existingInvoice.patientName = payload.patientName;
  existingInvoice.patientId = payload.patientId;
  existingInvoice.service = payload.service;
  existingInvoice.serviceCategory = payload.serviceCategory;
  existingInvoice.invoiceItems = payload.invoiceItems;
  existingInvoice.invoiceType = payload.invoiceType;
  existingInvoice.cashierName = payload.cashierName;
  existingInvoice.financeOfficer = payload.financeOfficer;
  existingInvoice.channel = payload.channel;
  existingInvoice.totalAmount = payload.totalAmount;
  existingInvoice.paidAmount = payload.paidAmount;
  existingInvoice.amount = payload.amount;
  existingInvoice.department = payload.department;
  existingInvoice.status = payload.status;
  existingInvoice.notes = payload.notes;

  await existingInvoice.save();
  await createPaymentIfNeeded(existingInvoice, payload);

  res.json({
    success: true,
    data: serializeInvoice(existingInvoice),
  });
});

const createPrescription = asyncHandler(async (req, res) => {
  const prescription = await Prescription.create({
    prescriptionNo: req.body.prescriptionNo,
    patientName: req.body.patient,
    branchName: req.body.branchName || req.activeUser?.branchName || MAIN_BRANCH_NAME,
    medicationCount: req.body.medicationCount,
    stockCheck: req.body.stockCheck,
    paymentState: req.body.paymentState,
  });

  res.status(201).json({
    success: true,
    data: serializePrescription(prescription),
  });
});

const updatePrescription = asyncHandler(async (req, res) => {
  const prescription = await Prescription.findOneAndUpdate(
    {
      _id: req.params.id,
      ...buildBranchFilter(req, 'branchName', ''),
    },
    {
      prescriptionNo: req.body.prescriptionNo,
      patientName: req.body.patient,
      branchName: req.body.branchName || req.activeUser?.branchName || MAIN_BRANCH_NAME,
      medicationCount: req.body.medicationCount,
      stockCheck: req.body.stockCheck,
      paymentState: req.body.paymentState,
    },
    { new: true, runValidators: true }
  );

  if (!prescription) {
    res.status(404);
    throw new Error('Prescription not found');
  }

  res.json({
    success: true,
    data: serializePrescription(prescription),
  });
});

module.exports = {
  getBillingOverview,
  getInvoiceById,
  getReceiptById,
  createInvoice,
  updateInvoice,
  createPrescription,
  updatePrescription,
};
