const PricingItem = require('../models/PricingItem');
const { asyncHandler } = require('../utils/asyncHandler');

const resolveCatalogSection = (item) => {
  if (item.catalogSection) {
    return item.catalogSection;
  }

  return item.itemType === 'Medication' ? 'Medication' : 'Administrative';
};

const serializePricingItem = (item) => ({
  id: item._id,
  itemType: item.itemType,
  catalogSection: resolveCatalogSection(item),
  category: item.category,
  code: item.code,
  name: item.name,
  brand: item.brand || '',
  department: item.department || '',
  unitPrice: item.unitPrice,
  stockQuantity: item.stockQuantity || 0,
  notes: item.notes || '',
  isActive: item.isActive !== false,
});

const getPricingItems = asyncHandler(async (req, res) => {
  const includeInactive = String(req.query.includeInactive || '').toLowerCase() === 'true';
  const filter = includeInactive ? {} : { isActive: true };
  const items = await PricingItem.find(filter).sort({ itemType: 1, category: 1, name: 1 });

  res.json({ success: true, data: items.map(serializePricingItem) });
});

const createPricingItem = asyncHandler(async (req, res) => {
  const item = await PricingItem.create({
    itemType: req.body.itemType,
    catalogSection: req.body.catalogSection,
    category: req.body.category,
    code: req.body.code,
    name: req.body.name,
    brand: req.body.brand,
    department: req.body.department,
    unitPrice: Number(req.body.unitPrice || 0),
    stockQuantity: Number(req.body.stockQuantity || 0),
    notes: req.body.notes,
    isActive: req.body.isActive !== false,
  });

  res.status(201).json({ success: true, data: serializePricingItem(item) });
});

const updatePricingItem = asyncHandler(async (req, res) => {
  const item = await PricingItem.findByIdAndUpdate(
    req.params.id,
    {
      itemType: req.body.itemType,
      catalogSection: req.body.catalogSection,
      category: req.body.category,
      code: String(req.body.code || '').trim().toUpperCase(),
      name: req.body.name,
      brand: req.body.brand,
      department: req.body.department,
      unitPrice: Number(req.body.unitPrice || 0),
      stockQuantity: Number(req.body.stockQuantity || 0),
      notes: req.body.notes,
      isActive: req.body.isActive !== false,
    },
    { new: true, runValidators: true }
  );

  if (!item) {
    res.status(404);
    throw new Error('Pricing item not found');
  }

  res.json({ success: true, data: serializePricingItem(item) });
});

module.exports = {
  getPricingItems,
  createPricingItem,
  updatePricingItem,
};
