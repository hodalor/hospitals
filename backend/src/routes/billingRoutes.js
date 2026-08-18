const express = require('express');
const {
  createInvoice,
  createPrescription,
  getBillingOverview,
  getInvoiceById,
  getReceiptById,
  updateInvoice,
  updatePrescription,
} = require('../controllers/billingController');
const { attachActiveUser, requireAccess } = require('../middleware/authContext');

const router = express.Router();

router.get('/', attachActiveUser, requireAccess({ moduleId: 'finance_billing', dataPermission: 'billing_records' }), getBillingOverview);
router.get('/invoices/:id', attachActiveUser, requireAccess({ moduleId: 'finance_billing', dataPermission: 'billing_records' }), getInvoiceById);
router.post('/invoices', attachActiveUser, requireAccess({ moduleId: 'finance_billing', actionPermission: 'create_invoice' }), createInvoice);
router.patch('/invoices/:id', attachActiveUser, requireAccess({ moduleId: 'finance_billing', actionPermission: 'edit_invoice' }), updateInvoice);
router.get('/receipts/:id', attachActiveUser, requireAccess({ moduleId: 'finance_receipts', dataPermission: 'billing_records' }), getReceiptById);
router.post('/prescriptions', attachActiveUser, requireAccess({ moduleId: 'finance_billing', actionPermission: 'create_prescription' }), createPrescription);
router.patch('/prescriptions/:id', attachActiveUser, requireAccess({ moduleId: 'finance_billing', actionPermission: 'edit_prescription' }), updatePrescription);

module.exports = router;
