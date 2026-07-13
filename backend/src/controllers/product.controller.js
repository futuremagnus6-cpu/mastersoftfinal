const Product = require('../models/Product');
const InventoryLog = require('../models/InventoryLog');
const { AppError } = require('../middleware/errorHandler');
const { scopeQuery } = require('../middleware/multiTenant');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const uploadRoot = path.join(__dirname, '..', '..', 'uploads');

const parseMaybeJson = (value) => {
  if (typeof value !== 'string') return value;

  const trimmed = value.trim();
  if (!trimmed || !['{', '['].includes(trimmed[0])) return value;

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
};

const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

const normalizeImages = (images) => {
  let list = images;
  if (typeof list === 'string' && list.trim()) {
    const parts = list.split(/[,;\n|]+/).map((s) => s.trim()).filter(Boolean);
    list = parts.map((url) => ({ url, type: 'link' }));
  }
  if (list && !Array.isArray(list)) {
    list = [list];
  }
  if (!Array.isArray(list)) return [];

  const cleaned = list
    .map((image) => {
      if (typeof image === 'string' && image.trim()) {
        return { url: image.trim(), type: 'link' };
      }
      if (image && typeof image === 'object' && image.url) {
        return {
          url: String(image.url).trim(),
          type: image.type === 'link' ? 'link' : 'upload',
          isMain: image.isMain,
        };
      }
      return null;
    })
    .filter(Boolean);

  const hasMain = cleaned.some((image) => image.isMain === true || image.isMain === 'true');

  return cleaned.map((image, index) => ({
    ...image,
    isMain: image.isMain === true || image.isMain === 'true' || (!hasMain && index === 0),
  }));
};

const normalizeProductData = (body = {}, { defaultCategory = false } = {}) => {
  const data = {};

  Object.entries(body).forEach(([key, value]) => {
    const parsedValue = parseMaybeJson(value);

    if (key.includes('.')) {
      const [parent, child] = key.split('.');
      data[parent] = data[parent] && typeof data[parent] === 'object' && !Array.isArray(data[parent])
        ? data[parent]
        : {};
      data[parent][child] = parsedValue;
      return;
    }

    data[key] = parsedValue;
  });

  if (data.images !== undefined) {
    data.images = normalizeImages(data.images);
  }

  if (defaultCategory || hasOwn(data, 'category')) {
    data.category = data.category && String(data.category).trim()
      ? String(data.category).trim()
      : 'Uncategorized';
  }

  return data;
};

const uploadedImageFromFile = (file, isMain = false) => {
  if (!file) return null;

  const subDir = path.relative(uploadRoot, file.destination).replace(/\\/g, '/');
  const url = subDir ? `/uploads/${subDir}/${file.filename}` : `/uploads/${file.filename}`;

  return {
    url,
    type: 'upload',
    isMain,
  };
};

const addUploadedImage = (images = [], file) => {
  const existingImages = normalizeImages(images);
  const image = uploadedImageFromFile(file, !existingImages.some((item) => item.isMain));
  return image ? [...existingImages, image] : existingImages;
};

// @desc    Get all products for a shop
// @route   GET /api/products
exports.getProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, category, search, stockStatus, sort, active } = req.query;
    const query = scopeQuery({}, req);

    // By default, only show active (non-deleted) products
    if (active !== 'all') {
      query.isActive = true;
    }

    if (category) query.category = category;
    if (stockStatus === 'low') {
      query.$expr = {
        $and: [
          { $lte: ['$inventory.quantity', '$inventory.minStockLevel'] },
          { $gt: ['$inventory.quantity', 0] }
        ]
      };
    }
    if (stockStatus === 'out') query['inventory.quantity'] = { $lte: 0 };
    if (stockStatus === 'in_stock') query['inventory.quantity'] = { $gt: 0 };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
      ];
    }

    let sortOption = { createdAt: -1 };
    if (sort === 'name') sortOption = { name: 1 };
    if (sort === 'price_asc') sortOption = { 'pricing.sellingPrice': 1 };
    if (sort === 'price_desc') sortOption = { 'pricing.sellingPrice': -1 };
    if (sort === 'stock') sortOption = { 'inventory.quantity': 1 };

    const products = await Product.find(query)
      .sort(sortOption)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      data: products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
exports.getProduct = async (req, res, next) => {
  try {
    const query = scopeQuery({ _id: req.params.id }, req);
    const product = await Product.findOne(query);

    if (!product) throw new AppError('Product not found', 404);
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

// @desc    Create product
// @route   POST /api/products
exports.createProduct = async (req, res, next) => {
  try {
    const productData = {
      ...normalizeProductData(req.body, { defaultCategory: true }),
      shopId: req.shopId,
      branchId: req.branchId,
      createdBy: req.userId,
    };
    productData.images = addUploadedImage(productData.images, req.file);

    const existingProduct = await Product.findOne({ shopId: req.shopId, sku: productData.sku });
    if (existingProduct) {
      throw new AppError(`Product with SKU "${productData.sku}" already exists`, 409);
    }

    const product = new Product(productData);
    await product.save();

    // Create inventory log
    if (product.inventory.quantity > 0) {
      await InventoryLog.create({
        shopId: req.shopId,
        branchId: req.branchId,
        product: product._id,
        type: 'opening_stock',
        quantity: product.inventory.quantity,
        previousStock: 0,
        newStock: product.inventory.quantity,
        reason: 'Opening stock',
        createdBy: req.userId,
      });
    }

    res.status(201).json({ success: true, message: 'Product created', data: product });
  } catch (error) {
    next(error);
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
exports.updateProduct = async (req, res, next) => {
  try {
    const query = scopeQuery({ _id: req.params.id }, req);
    const product = await Product.findOne(query);

    if (!product) throw new AppError('Product not found', 404);

    const productData = normalizeProductData(req.body);

    const allowedFields = [
      'name', 'nameLocal', 'description', 'category', 'subcategory', 'brand',
      'unit', 'pricing', 'tax', 'inventory', 'batchTracking', 'batches',
      'images', 'isActive', 'isService', 'tags', 'barcode',
    ];

    allowedFields.forEach(field => {
      if (productData[field] !== undefined) {
        product[field] = productData[field];
      }
    });

    if (req.file) {
      product.images = addUploadedImage(product.images, req.file);
    }

    product.updatedBy = req.userId;
    await product.save();

    res.json({ success: true, message: 'Product updated', data: product });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete product (permanent)
// @route   DELETE /api/products/:id
exports.deleteProduct = async (req, res, next) => {
  try {
    const query = scopeQuery({ _id: req.params.id }, req);
    const product = await Product.findOne(query);

    if (!product) throw new AppError('Product not found', 404);

    await Product.deleteOne({ _id: product._id });

    res.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk delete products (permanent) by IDs
// @route   POST /api/products/bulk-delete
exports.bulkDeleteProducts = async (req, res, next) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new AppError('Please provide an array of product IDs to delete', 400);
    }

    const query = scopeQuery({ _id: { $in: ids } }, req);

    const result = await Product.deleteMany(query);

    res.json({
      success: true,
      message: `${result.deletedCount} product(s) deleted`,
      data: { deletedCount: result.deletedCount },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete all products (permanent) for the current shop
// @route   DELETE /api/products/all
exports.deleteAllProducts = async (req, res, next) => {
  try {
    const query = scopeQuery({ isActive: true }, req);

    const result = await Product.deleteMany(query);

    res.json({
      success: true,
      message: `${result.deletedCount} product(s) deleted`,
      data: { deletedCount: result.deletedCount },
    });
  } catch (error) {
    next(error);
  }
};



// @desc    Search products by barcode
// @route   GET /api/products/barcode/:barcode
exports.getByBarcode = async (req, res, next) => {
  try {
    const query = scopeQuery({ barcode: req.params.barcode }, req);
    const product = await Product.findOne(query);

    if (!product) throw new AppError('Product not found with this barcode', 404);
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

// @desc    Search products (for POS)
// @route   GET /api/products/search
exports.searchProducts = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.json({ success: true, data: [] });
    }

    const query = scopeQuery({
      isActive: true,
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { sku: { $regex: q, $options: 'i' } },
        { barcode: { $regex: q, $options: 'i' } },
      ],
    }, req);

    const products = await Product.find(query).limit(20);
    res.json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
};

// @desc    Update stock
// @route   PUT /api/products/:id/stock
exports.updateStock = async (req, res, next) => {
  try {
    const { quantity, type, reason, batchNumber } = req.body;
    const query = scopeQuery({ _id: req.params.id }, req);
    const product = await Product.findOne(query);

    if (!product) throw new AppError('Product not found', 404);

    const previousStock = product.inventory.quantity;
    const adjustment = type === 'add' ? quantity : -quantity;
    product.inventory.quantity = Math.max(0, previousStock + adjustment);
    product.updatedBy = req.userId;
    await product.save();

    await InventoryLog.create({
      shopId: req.shopId,
      branchId: req.branchId,
      product: product._id,
      type: 'stock_adjustment',
      quantity: adjustment,
      previousStock,
      newStock: product.inventory.quantity,
      reason: reason || 'Manual adjustment',
      batchNumber,
      createdBy: req.userId,
    });

    res.json({ success: true, message: 'Stock updated', data: product });
  } catch (error) {
    next(error);
  }
};

// @desc    Get categories
// @route   GET /api/products/categories/list
exports.getCategories = async (req, res, next) => {
  try {
    const query = scopeQuery({}, req);
    const categories = await Product.distinct('category', query);
    res.json({ success: true, data: categories.sort() });
  } catch (error) {
    next(error);
  }
};

/**
 * Parse JSON import file content.
 * Supports:
 * - Standard JSON array: [{...}, {...}]
 * - NDJSON (newline-delimited JSON): {\n}\n{...}  — MongoDB export format
 * - Wrapped: { "products": [...] }, { "data": [...] }, { "items": [...] }
 * - Single object: { name: "...", ... }
 */
function parseJsonImport(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8').trim();

  // Try standard JSON.parse first
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    // If standard parse fails, try NDJSON (newline-delimited JSON / MongoDB export)
    const lines = raw.split('\n').filter(function(line) {
      var trimmed = line.trim();
      return trimmed && (trimmed.startsWith('{') || trimmed.startsWith('['));
    });
    if (lines.length > 0) {
      try {
        parsed = lines.map(function(line) { return JSON.parse(line.trim()); });
      } catch (e2) {
        throw new AppError('Could not parse JSON file. Expected a JSON array, an array of products, or newline-delimited JSON (MongoDB export).', 400);
      }
    } else {
      throw new AppError('Could not parse JSON file. Expected a JSON array, an array of products, or newline-delimited JSON (MongoDB export).', 400);
    }
  }

  // Handle wrapped formats: { products: [...] }, { data: [...] }, { items: [...] }
  if (parsed && !Array.isArray(parsed) && typeof parsed === 'object') {
    var wrapperKeys = ['products', 'data', 'items', 'results', 'records', 'productList', 'Product'];
    for (var i = 0; i < wrapperKeys.length; i++) {
      if (Array.isArray(parsed[wrapperKeys[i]])) {
        parsed = parsed[wrapperKeys[i]];
        break;
      }
    }
  }

  // Single object → wrap in array
  if (parsed && !Array.isArray(parsed) && typeof parsed === 'object') {
    parsed = [parsed];
  }

  if (!Array.isArray(parsed)) {
    throw new AppError('JSON file must contain an array of products, a wrapped object like { "products": [...] }, or newline-delimited JSON (MongoDB export).', 400);
  }

  return parsed;
}

/**
 * Parse a single row (from CSV/Excel) or object (from JSON) into product creation data.
 * Supports both snake_case (CSV) and camelCase (JSON) field names.
 */
function getVal(...values) {
  for (const v of values) {
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return undefined;
}

const unwrapMongoValue = (value) => {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object') return value;
  if (value.$oid) return value.$oid;
  if (value.$numberInt !== undefined) return parseInt(value.$numberInt, 10);
  if (value.$numberDouble !== undefined) return parseFloat(value.$numberDouble);
  if (value.$numberLong !== undefined) return parseInt(value.$numberLong, 10);
  return value;
};

const toNumber = (value, fallback = 0) => {
  const unwrapped = unwrapMongoValue(value);
  if (unwrapped === undefined || unwrapped === null || unwrapped === '') return fallback;
  const num = Number(unwrapped);
  return Number.isFinite(num) ? num : fallback;
};

const toInt = (value, fallback = 0) => Math.round(toNumber(value, fallback));

const normalizeCategory = (category) => {
  let resolved = unwrapMongoValue(category);
  if (resolved && typeof resolved === 'object') {
    resolved = resolved.name || resolved.title || resolved.label || 'Uncategorized';
  }
  resolved = resolved ? String(resolved).trim() : 'Uncategorized';
  if (!resolved || /^[0-9a-fA-F]{24}$/.test(resolved)) {
    return 'Uncategorized';
  }
  return resolved;
};

function parseImportRow(row, index) {
  const pricing = row.pricing && typeof row.pricing === 'object' ? row.pricing : {};
  const inventory = row.inventory && typeof row.inventory === 'object' ? row.inventory : {};
  const tax = row.tax && typeof row.tax === 'object' ? row.tax : {};

  const sku = getVal(
    row.sku, row.SKU, row.batchNumber, row.slug,
    pricing.sku, `IMP-${Date.now()}-${index}`
  );

  let images = [];
  if (row.images !== undefined) {
    images = normalizeImages(row.images);
  }
  const imgUrl = getVal(row.image_url, row.imageUrl, row.image, row['images[0]'], row.thumbnail);
  if (images.length === 0 && imgUrl) {
    images = normalizeImages(imgUrl);
  }

  const gstRateRaw = getVal(
    row.gst, row.Gst, row.gst_rate, row.GstRate, row.gstRate,
    pricing.gstRate, pricing.gst, 18
  );
  const gstRate = [0, 5, 12, 18, 28].includes(toInt(gstRateRaw, 18)) ? toInt(gstRateRaw, 18) : 18;

  const unitRaw = getVal(row.unit, row.Unit, 'pcs');
  const allowedUnits = ['pcs', 'kg', 'g', 'l', 'ml', 'm', 'box', 'pack', 'dozen', 'carton'];
  const unit = allowedUnits.includes(String(unitRaw).toLowerCase()) ? String(unitRaw).toLowerCase() : 'pcs';

  return {
    name: getVal(row.name, row.Name, row.product_name, row.ProductName, row.title, row.productName),
    sku: String(sku).trim(),
    barcode: getVal(row.barcode, row.Barcode, row.bar_code),
    category: normalizeCategory(getVal(row.category, row.Category, row.category_name)),
    brand: getVal(row.brand, row.Brand),
    unit,
    description: getVal(row.description, row.Description, row.desc),
    pricing: {
      mrp: toNumber(getVal(row.mrp, row.MRP, pricing.mrp, pricing.MRP), 0),
      sellingPrice: toNumber(getVal(
        row.selling_price, row.SellingPrice, row.sellingPrice, row.price, row.Price,
        pricing.sellingPrice, pricing.selling_price, pricing.price, row.mrp, row.MRP, pricing.mrp
      ), 0),
      purchasePrice: toNumber(getVal(
        row.purchase_price, row.PurchasePrice, row.purchasePrice,
        pricing.purchasePrice, pricing.purchase_price
      ), 0),
      gstRate,
    },
    tax: {
      hsnCode: getVal(row.hsn_code, row.HSNCode, row.hsnCode, tax.hsnCode, tax.hsn_code) || '',
    },
    inventory: {
      quantity: toInt(getVal(
        row.quantity, row.Quantity, row.stockQuantity, row.StockQuantity, row.stock,
        inventory.quantity, inventory.stockQuantity
      ), 0),
      minStockLevel: toInt(getVal(
        row.min_stock, row.MinStock, row.minStockLevel, row.lowStockThreshold,
        inventory.minStockLevel, inventory.min_stock
      ), 10),
    },
    images,
    updateExisting: row.update_existing === 'yes'
      || row.updateExisting === true
      || row.update_existing === true
      || String(row.update_existing).toLowerCase() === 'true',
  };
}

// @desc    Import products from Excel/CSV/JSON, URL, or HTML page
// @route   POST /api/products/import
exports.importProducts = async (req, res, next) => {
  try {
    let data;
    let sourcePath = null;

    // Case 1: Import via URL
    if (req.body.importUrl && typeof req.body.importUrl === 'string' && req.body.importUrl.trim()) {
      const url = req.body.importUrl.trim();
      try {
        const axios = require('axios');
        const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
        const buffer = Buffer.from(response.data);
        const tempPath = path.join(uploadRoot, 'temp', `url-import-${Date.now()}.tmp`);
        if (!fs.existsSync(path.dirname(tempPath))) {
          fs.mkdirSync(path.dirname(tempPath), { recursive: true });
        }
        fs.writeFileSync(tempPath, buffer);
        sourcePath = tempPath;

        const contentType = response.headers['content-type'] || '';
        const urlPathname = new URL(url).pathname;
        const ext = path.extname(urlPathname).toLowerCase();

        // Detect content type
        const isJson = ext === '.json' || contentType.includes('json');
        const isExcel = ext === '.xlsx' || ext === '.xls' || ext === '.csv' || contentType.includes('spreadsheet') || contentType.includes('csv') || contentType.includes('excel');
        const isHtml = contentType.includes('html') || ext === '.php' || ext === '.asp' || ext === '.aspx' || ext === '.jsp';

        if (isJson) {
          data = parseJsonImport(sourcePath);
        } else if (isExcel) {
          const workbook = XLSX.read(sourcePath, { type: 'buffer' });
          const sheetName = workbook.SheetNames[0];
          if (!sheetName) throw new AppError('No worksheets found in imported file', 400);
          data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
        } else if (isHtml) {
          // HTML page - try to scrape product data
          const { scrapeProductsFromHtml } = require('../utils/htmlProductScraper');
          const html = buffer.toString('utf-8');
          const scraped = scrapeProductsFromHtml(html, url);
          if (scraped && scraped.length > 0) {
            data = scraped;
            fs.unlink(sourcePath, function() {});
            sourcePath = null;
          } else {
            throw new AppError('Could not extract any products from this URL. The page format may not be supported yet.', 400);
          }
        } else {
          // Unknown extension - try Excel/CSV first, then JSON, then HTML scraping
          try {
            const workbook = XLSX.read(sourcePath, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            if (sheetName) {
              data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
            }
          } catch (e) {
            // Not Excel, try JSON
            try {
              data = parseJsonImport(sourcePath);
            } catch (e2) {
              // Not JSON either, try HTML scraping as last resort
              const { scrapeProductsFromHtml } = require('../utils/htmlProductScraper');
              const html = buffer.toString('utf-8');
              const scraped = scrapeProductsFromHtml(html, url);
              if (scraped && scraped.length > 0) {
                data = scraped;
                fs.unlink(sourcePath, function() {});
                sourcePath = null;
              } else {
                throw new AppError('Could not parse this URL. Supported formats: JSON, CSV, Excel, or a product listing webpage.', 400);
              }
            }
          }
        }
      } catch (urlErr) {
        // Clean up temp file on error
        if (sourcePath) {
          try { fs.unlinkSync(sourcePath); } catch (e) {}
          sourcePath = null;
        }
        // Wrap non-operational errors so the actual message shows instead of 'Something went wrong'
        if (!urlErr.isOperational) {
          throw new AppError(urlErr.message || 'Failed to process the URL. Please check the URL and try again.', 400);
        }
        throw urlErr;
      }
    }
    // Case 2: Upload file
    else if (req.file) {
      sourcePath = req.file.path;
      const ext = path.extname(req.file.originalname).toLowerCase();

      if (ext === '.json') {
        data = parseJsonImport(sourcePath);
      } else {
        const workbook = XLSX.readFile(sourcePath);
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) throw new AppError('Import file has no worksheets', 400);
        data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
      }
    } else {
      throw new AppError('Please upload a file or provide an import URL', 400);
    }

    if (!Array.isArray(data) || data.length === 0) {
      throw new AppError('No product data found in import source', 400);
    }

    let imported = 0, skipped = 0, errors = [];

    for (const [index, row] of data.entries()) {
      try {
        const productData = parseImportRow(row, index);

        if (!productData.name || !String(productData.name).trim()) {
          throw new Error('Product name is required');
        }
        productData.name = String(productData.name).trim();

        if (productData.pricing.sellingPrice <= 0 && productData.pricing.mrp > 0) {
          productData.pricing.sellingPrice = productData.pricing.mrp;
        }
        if (productData.pricing.mrp <= 0 && productData.pricing.sellingPrice > 0) {
          productData.pricing.mrp = productData.pricing.sellingPrice;
        }

        const existing = await Product.findOne({ shopId: req.shopId, sku: productData.sku });

        if (existing && productData.updateExisting) {
          Object.assign(existing, {
            name: productData.name || existing.name,
            category: productData.category || existing.category,
            brand: productData.brand || existing.brand,
            unit: productData.unit || existing.unit,
            description: productData.description || existing.description,
            pricing: { ...existing.pricing.toObject?.() || existing.pricing, ...productData.pricing },
            tax: { ...existing.tax.toObject?.() || existing.tax, ...productData.tax },
            inventory: { ...existing.inventory.toObject?.() || existing.inventory, ...productData.inventory },
            images: productData.images.length > 0 ? productData.images : existing.images,
            updatedBy: req.userId,
          });
          await existing.save();
          imported++;
        } else if (!existing) {
          await Product.create({
            ...productData,
            shopId: req.shopId,
            createdBy: req.userId,
          });
          imported++;
        } else {
          skipped++;
        }
      } catch (err) {
        errors.push({ row: index + 1, sku: row.sku || row.SKU, error: err.message });
        skipped++;
      }
    }

    // Clean up temp files
    if (sourcePath) {
      fs.unlink(sourcePath, () => {});
    }

    res.json({
      success: true,
      message: `Imported ${imported} products. ${skipped} skipped.`,
      data: { imported, skipped, errors: errors.slice(0, 10) },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export products to Excel
// @route   GET /api/products/export
exports.exportProducts = async (req, res, next) => {
  try {
    const query = scopeQuery({}, req);
    const products = await Product.find(query).lean();

    const exportData = products.map(p => ({
      Name: p.name,
      SKU: p.sku,
      Barcode: p.barcode,
      Category: p.category,
      Brand: p.brand,
      MRP: p.pricing.mrp,
      Selling_Price: p.pricing.sellingPrice,
      Purchase_Price: p.pricing.purchasePrice,
      GST_Rate: p.pricing.gstRate,
      HSN_Code: p.tax.hsnCode,
      Quantity: p.inventory.quantity,
      Min_Stock: p.inventory.minStockLevel,
      Unit: p.unit,
      Description: p.description,
      Status: p.isActive ? 'Active' : 'Inactive',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, 'Products');

    const fileName = `products-${Date.now()}.xlsx`;
    const filePath = path.join(__dirname, '..', '..', 'uploads', 'exports', fileName);
    XLSX.writeFile(wb, filePath);

    res.json({ success: true, data: { fileName, url: `/uploads/exports/${fileName}` } });
  } catch (error) {
    next(error);
  }
};
