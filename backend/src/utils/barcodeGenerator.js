/**
 * Barcode & QR Code Generation Utilities
 * Generates barcodes, QR codes for UPI payments, and shelf labels.
 * v2.0 — Added GS1-128 smart barcode encoding/decoding
 */

const JsBarcode = require('jsbarcode');
const { createCanvas } = require('canvas');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

const BARCODE_DIR = path.join(__dirname, '..', '..', 'uploads', 'barcodes');

// Ensure barcode directory exists
if (!fs.existsSync(BARCODE_DIR)) {
  fs.mkdirSync(BARCODE_DIR, { recursive: true });
}

// ═══════════════════════════════════════════════════════════════
//  GS1 Application Identifier (AI) Reference
// ═══════════════════════════════════════════════════════════════
// Standard GS1 AIs for structured barcode data.
// Format: (AI)DATA — e.g. (01)08901234567890(15)260731
const GS1_AI = {
  // Product Identification
  '01': { label: 'GTIN', length: 14, description: 'Global Trade Item Number (product ID)' },
  '02': { label: 'GTIN (Content)', length: 14, description: 'GTIN of trade items inside a logistic unit' },
  
  // Dates (YYMMDD format)
  '11': { label: 'Prod Date', length: 6, description: 'Production / Manufacturing date' },
  '15': { label: 'Expiry Date', length: 6, description: 'Best Before / Expiry date' },
  '17': { label: 'Use By', length: 6, description: 'Use by / Sell by date' },
  '10': { label: 'Batch', length: null, description: 'Batch / Lot number (alphanumeric)' },
  '21': { label: 'Serial', length: null, description: 'Serial number' },
  
  // Pricing
  '8005': { label: 'Selling Price', length: 6, description: 'Selling price in paise (e.g., 25000 = ₹250)' },
  '8007': { label: 'IBV', length: null, description: 'International Bank/VAT Number' },
  
  // Measurements
  '30': { label: 'Quantity', length: null, description: 'Varaible quantity count' },
  '37': { label: 'Count', length: null, description: 'Number of units contained' },
  
  // Manufacturing
  '8004': { label: 'Mfg Unit', length: null, description: 'Manufacturing unit / plant ID' },
  
  // MRP
  '3922': { label: 'Amount', length: null, description: 'Amount payable with ISO currency code' },
};

// AI patterns for parsing — sorted by AI length (longest first for greedy matching)
const AI_PATTERNS = Object.keys(GS1_AI)
  .sort((a, b) => b.length - a.length)
  .map(ai => ({
    ai,
    ...GS1_AI[ai],
  }));

/**
 * Encode structured product data into a GS1-128 barcode string.
 * @param {Object} data - Structured data to encode
 * @param {string} data.gtin - 14-digit GTIN / product code
 * @param {string} data.batchNumber - Batch/lot number
 * @param {string|Date} data.expiryDate - Expiry date (YYMMDD or Date)
 * @param {string|Date} data.mfgDate - Manufacturing date (YYMMDD or Date)
 * @param {number} data.sellingPrice - Selling price in rupees
 * @param {number} data.mrp - MRP in rupees
 * @param {string} data.serialNumber - Serial number
 * @param {string} data.mfgUnit - Manufacturing unit ID
 * @returns {string} GS1-128 encoded barcode string
 */
function encodeGS1Barcode(data = {}) {
  const parts = [];

  // Helper to format date as YYMMDD
  const formatDate = (d) => {
    if (!d) return null;
    const date = new Date(d);
    if (isNaN(date.getTime())) return null;
    const yy = date.getFullYear().toString().slice(-2);
    const mm = (date.getMonth() + 1).toString().padStart(2, '0');
    const dd = date.getDate().toString().padStart(2, '0');
    return `${yy}${mm}${dd}`;
  };

  // GTIN (01) — pad/trim to 14 digits
  if (data.gtin) {
    const gtin = data.gtin.replace(/\D/g, '').padStart(14, '0').slice(0, 14);
    parts.push(`(01)${gtin}`);
  } else if (data.barcode) {
    // Use existing barcode as GTIN
    const gtin = data.barcode.replace(/\D/g, '').padStart(14, '0').slice(0, 14);
    parts.push(`(01)${gtin}`);
  }

  // Manufacturing date (11)
  const mfgStr = formatDate(data.mfgDate || data.manufacturingDate);
  if (mfgStr) parts.push(`(11)${mfgStr}`);

  // Expiry date (15)
  const expStr = formatDate(data.expiryDate || data.expDate);
  if (expStr) parts.push(`(15)${expStr}`);

  // Batch number (10)
  if (data.batchNumber) {
    // Max 20 chars alphanumeric
    const batch = String(data.batchNumber).replace(/[^a-zA-Z0-9\-_]/g, '').slice(0, 20);
    if (batch) parts.push(`(10)${batch}`);
  }

  // Manufacturing unit (8004)
  if (data.mfgUnit) {
    const unit = String(data.mfgUnit).replace(/[^a-zA-Z0-9\-_]/g, '').slice(0, 20);
    if (unit) parts.push(`(8004)${unit}`);
  }

  // Selling price (8005) — in paise, 6 digits
  if (data.sellingPrice) {
    const paise = Math.round(parseFloat(data.sellingPrice) * 100);
    const priceStr = String(paise).padStart(6, '0').slice(0, 6);
    parts.push(`(8005)${priceStr}`);
  }

  // Serial number (21)
  if (data.serialNumber) {
    const serial = String(data.serialNumber).replace(/[^a-zA-Z0-9\-_]/g, '').slice(0, 20);
    if (serial) parts.push(`(21)${serial}`);
  }

  return parts.join('');
}

/**
 * Parse a GS1-128 barcode string into structured data.
 * @param {string} barcodeStr - The full barcode string with (AI)data format
 * @returns {Object} Parsed data with decoded fields
 */
function parseGS1Barcode(barcodeStr) {
  if (!barcodeStr || typeof barcodeStr !== 'string') return null;

  const result = {
    raw: barcodeStr,
    isValidGS1: false,
    gtin: null,
    batchNumber: null,
    expiryDate: null,
    mfgDate: null,
    sellingPrice: null,
    serialNumber: null,
    mfgUnit: null,
    parsedFields: [],
  };

  // Check if this looks like a GS1 barcode (has (AI) patterns)
  const hasAIPattern = /\(\d{2,4}\)/.test(barcodeStr);
  if (!hasAIPattern) return { ...result, isValidGS1: false };

  result.isValidGS1 = true;

  // Extract all (AI)data segments
  const aiRegex = /\((\d{2,4})\)([^()]*)/g;
  let match;

  while ((match = aiRegex.exec(barcodeStr)) !== null) {
    const ai = match[1];
    const value = match[2].trim();
    const aiInfo = GS1_AI[ai];

    result.parsedFields.push({
      ai,
      label: aiInfo?.label || 'Unknown',
      value,
      description: aiInfo?.description || '',
    });

    switch (ai) {
      case '01': // GTIN
        result.gtin = value.replace(/^0+/, '') || value; // Remove leading zeros
        break;
      case '10': // Batch
        result.batchNumber = value;
        break;
      case '11': // Manufacturing date
        result.mfgDate = parseGS1Date(value);
        result.mfgDateRaw = value;
        break;
      case '15': // Expiry date
        result.expiryDate = parseGS1Date(value);
        result.expiryDateRaw = value;
        break;
      case '17': // Use by
        result.useByDate = parseGS1Date(value);
        break;
      case '21': // Serial
        result.serialNumber = value;
        break;
      case '30': // Quantity
        result.quantity = parseInt(value, 10) || null;
        break;
      case '8004': // Manufacturing unit
        result.mfgUnit = value;
        break;
      case '8005': // Selling price (paise → rupees)
        result.sellingPrice = parseFloat(value) / 100;
        result.sellingPriceRaw = value;
        break;
      case '8007': // IBV
        result.ibv = value;
        break;
      case '3922': // Amount
        result.amountPayable = value;
        break;
    }
  }

  return result;
}

/**
 * Parse a GS1 date string (YYMMDD) into a Date object.
 * Handles past/future century wrapping (50+ years = 1900s).
 */
function parseGS1Date(yymmdd) {
  if (!yymmdd || yymmdd.length !== 6) return null;
  const yy = parseInt(yymmdd.slice(0, 2), 10);
  const mm = parseInt(yymmdd.slice(2, 4), 10) - 1;
  const dd = parseInt(yymmdd.slice(4, 6), 10);
  // Assume 2000s if yy < 50, else 1900s
  const fullYear = yy < 50 ? 2000 + yy : 1900 + yy;
  const date = new Date(fullYear, mm, dd);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Check if a barcode string is a GS1-128 formatted barcode.
 */
function isGS1Barcode(barcodeStr) {
  if (!barcodeStr) return false;
  return /\(\d{2,4}\)/.test(barcodeStr);
}

/**
 * Generate a CODE128 barcode for a product
 * @param {string} code - The barcode value
 * @param {Object} options - Barcode options
 * @returns {Promise<Object>} Generated barcode info
 */
async function generateBarcode(code, options = {}) {
  const {
    width = 200,
    height = 60,
    format = 'CODE128',
    displayValue = true,
    fontSize = 14,
    margin = 10,
  } = options;

  try {
    const canvas = createCanvas(width, height);
    JsBarcode(canvas, code, {
      format,
      width: 1.5,
      height: 40,
      displayValue,
      fontSize,
      margin,
      background: '#ffffff',
      lineColor: '#000000',
    });

    const safeCode = code.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 50);
    const fileName = `barcode-${safeCode}-${Date.now()}.png`;
    const filePath = path.join(BARCODE_DIR, fileName);
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(filePath, buffer);

    return { fileName, filePath, url: `/uploads/barcodes/${fileName}` };
  } catch (error) {
    throw new Error(`Barcode generation failed for code "${code}": ${error.message}`);
  }
}

/**
 * Generate EAN-13 barcode (for retail products)
 */
async function generateEAN13(ean) {
  if (!/^\d{13}$/.test(ean)) {
    throw new Error('EAN-13 must be exactly 13 digits');
  }
  return generateBarcode(ean, { format: 'EAN13', width: 250, height: 80 });
}

/**
 * Generate a QR code
 */
async function generateQRCode(data, options = {}) {
  const { width = 300, margin = 4, color = { dark: '#000000', light: '#ffffff' } } = options;

  try {
    const fileName = `qr-${Date.now()}.png`;
    const filePath = path.join(BARCODE_DIR, fileName);

    await QRCode.toFile(filePath, data, {
      type: 'png',
      width,
      margin,
      color,
      errorCorrectionLevel: 'M',
    });

    return { fileName, filePath, url: `/uploads/barcodes/${fileName}` };
  } catch (error) {
    throw new Error(`QR code generation failed: ${error.message}`);
  }
}

/**
 * Generate UPI QR code for payment
 */
async function generateUPIQRCode(paymentInfo) {
  const {
    vpa,
    name = 'Payment',
    amount = 0,
    note = 'Bill Payment',
    merchantCode,
    transactionId,
  } = paymentInfo;

  if (!vpa) {
    throw new Error('UPI VPA (Virtual Payment Address) is required');
  }

  let upiUrl = `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(name)}&am=${amount}&tn=${encodeURIComponent(note)}&cu=INR`;
  if (merchantCode) upiUrl += `&mc=${merchantCode}`;
  if (transactionId) upiUrl += `&tr=${transactionId}`;

  return generateQRCode(upiUrl, { width: 400 });
}

/**
 * Generate shelf label PDF with barcode, price, and product name
 * Supports different label templates.
 */
async function generateShelfLabels(products, template = 'standard') {
  const PDFDocument = require('pdfkit');

  let labelWidth = 200, labelHeight = 100;
  if (template === 'price-tag') { labelWidth = 150; labelHeight = 80; }
  if (template === 'batch') { labelWidth = 250; labelHeight = 120; }

  const doc = new PDFDocument({ size: [labelWidth, labelHeight], margin: 5 });

  const fileName = `labels-${template}-${Date.now()}.pdf`;
  const filePath = path.join(BARCODE_DIR, fileName);
  const stream = fs.createWriteStream(filePath);

  doc.pipe(stream);

  for (const product of products) {
    const codeToEncode = product.gs1Barcode || product.barcode || product.sku;
    const displayCode = product.barcode || product.sku || '';

    // Generate barcode image
    const canvas = createCanvas(labelWidth - 20, 40);
    JsBarcode(canvas, codeToEncode, {
      format: 'CODE128',
      width: 1,
      height: 30,
      displayValue: template !== 'price-tag',
      fontSize: 8,
      margin: 0,
    });

    const barcodeBuffer = canvas.toBuffer('image/png');
    const yOffset = template === 'price-tag' ? 5 : 5;

    if (template === 'batch') {
      // ─── Batch Label Template ───
      doc.image(barcodeBuffer, 10, yOffset, { width: labelWidth - 20 });
      doc.fontSize(10).text(product.name, 10, 48, { width: labelWidth - 20, align: 'center' });
      doc.fontSize(8).text(`Batch: ${product.batchNumber || '-'}`, 10, 62, { width: labelWidth - 20, align: 'center' });
      doc.fontSize(8).text(`Mfg: ${product.mfgDate ? new Date(product.mfgDate).toLocaleDateString('en-IN') : '-'}`, 10, 74, { width: labelWidth - 20, align: 'center' });
      doc.fontSize(8).text(`Exp: ${product.expiryDate ? new Date(product.expiryDate).toLocaleDateString('en-IN') : '-'}`, 10, 82, { width: labelWidth - 20, align: 'center' });
      doc.fontSize(10).text(`₹${product.pricing?.sellingPrice || product.sellingPrice || 0}`, 10, 92, { width: labelWidth - 20, align: 'center' });
    } else if (template === 'price-tag') {
      // ─── Price Tag Template ───
      doc.fontSize(18).text(`₹${product.pricing?.sellingPrice || product.sellingPrice || 0}`, 10, yOffset + 5, { width: labelWidth - 20, align: 'center' });
      doc.fontSize(8).text(product.name.substring(0, 25), 10, yOffset + 28, { width: labelWidth - 20, align: 'center' });
      doc.image(barcodeBuffer, 10, yOffset + 38, { width: Math.min(labelWidth - 20, 130) });
      doc.fontSize(6).text(`MRP: ₹${product.pricing?.mrp || product.mrp || 0}`, 10, yOffset + 72, { width: labelWidth - 20, align: 'center' });
    } else {
      // ─── Standard Shelf Label Template ───
      doc.image(barcodeBuffer, 10, yOffset, { width: labelWidth - 20 });
      doc.fontSize(10).text(product.name, 10, 48, { width: labelWidth - 20, align: 'center' });
      doc.fontSize(12).text(`₹${product.pricing?.sellingPrice || product.sellingPrice || 0}`, 10, 64, { width: labelWidth - 20, align: 'center' });
      doc.fontSize(7).text(`MRP: ₹${product.pricing?.mrp || product.mrp || 0}`, 10, 82, { width: labelWidth - 20, align: 'center' });
    }

    if (products.indexOf(product) < products.length - 1) {
      doc.addPage();
    }
  }

  doc.end();

  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve({ fileName, filePath, url: `/uploads/barcodes/${fileName}` }));
    stream.on('error', reject);
  });
}

/**
 * Generate bulk barcodes PDF for multiple products
 */
async function generateBulkBarcodes(products) {
  return generateShelfLabels(products, 'standard');
}

/**
 * Validate a barcode using checksum (for EAN-13)
 */
function validateBarcode(barcode) {
  if (!barcode || barcode.length < 8) return false;

  if (barcode.length === 13 && /^\d{13}$/.test(barcode)) {
    const digits = barcode.split('').map(Number);
    const checkDigit = digits[12];
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += digits[i] * (i % 2 === 0 ? 1 : 3);
    }
    const calculatedCheck = (10 - (sum % 10)) % 10;
    return checkDigit === calculatedCheck;
  }

  return true;
}

module.exports = {
  generateBarcode,
  generateEAN13,
  generateQRCode,
  generateUPIQRCode,
  generateShelfLabels,
  generateBulkBarcodes,
  validateBarcode,
  encodeGS1Barcode,
  parseGS1Barcode,
  isGS1Barcode,
  GS1_AI,
};
