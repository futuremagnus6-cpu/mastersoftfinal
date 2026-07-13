/**
 * Barcode & QR Code Generation Utilities
 * Generates barcodes, QR codes for UPI payments, and shelf labels.
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

/**
 * Generate a CODE128 barcode for a product
 * @param {string} code - The barcode value (typically SKU or product code)
 * @param {Object} options - Barcode options
 * @returns {Promise<string>} Path to generated barcode image
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

    const fileName = `barcode-${code.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.png`;
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
 * @param {string} ean - 13-digit EAN code
 * @returns {Promise<Object>} Generated barcode info
 */
async function generateEAN13(ean) {
  if (!/^\d{13}$/.test(ean)) {
    throw new Error('EAN-13 must be exactly 13 digits');
  }
  return generateBarcode(ean, { format: 'EAN13', width: 250, height: 80 });
}

/**
 * Generate a QR code for a value (can be URL, text, etc.)
 * @param {string} data - Data to encode in QR
 * @param {Object} options - QR code options
 * @returns {Promise<Object>} Generated QR code info
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
 * UPI format: upi://pay?pa=<vpa>&pn=<name>&am=<amount>&tn=<note>&cu=INR
 * @param {Object} paymentInfo - Payment details
 * @returns {Promise<Object>} Generated QR code info
 */
async function generateUPIQRCode(paymentInfo) {
  const {
    vpa, // UPI VPA/ID (e.g., shopname@upi)
    name = 'Payment',
    amount = 0,
    note = 'Bill Payment',
    merchantCode,
    transactionId,
  } = paymentInfo;

  if (!vpa) {
    throw new Error('UPI VPA (Virtual Payment Address) is required');
  }

  // Build UPI deep link
  let upiUrl = `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(name)}&am=${amount}&tn=${encodeURIComponent(note)}&cu=INR`;

  if (merchantCode) upiUrl += `&mc=${merchantCode}`;
  if (transactionId) upiUrl += `&tr=${transactionId}`;

  return generateQRCode(upiUrl, { width: 400 });
}

/**
 * Generate shelf label PDF with barcode, price, and product name
 * @param {Array} products - Array of products to print labels for
 * @returns {Promise<Object>} Generated PDF info
 */
async function generateShelfLabels(products) {
  const PDFDocument = require('pdfkit');
  const doc = new PDFDocument({ size: [200, 100], margin: 5 });

  const fileName = `shelf-labels-${Date.now()}.pdf`;
  const filePath = path.join(BARCODE_DIR, fileName);
  const stream = fs.createWriteStream(filePath);

  doc.pipe(stream);

  for (const product of products) {
    // Generate barcode for this product
    const canvas = createCanvas(180, 40);
    JsBarcode(canvas, product.barcode || product.sku, {
      format: 'CODE128',
      width: 1,
      height: 30,
      displayValue: true,
      fontSize: 8,
      margin: 0,
    });

    const barcodeBuffer = canvas.toBuffer('image/png');

    doc.image(barcodeBuffer, 10, 5, { width: 180 });
    doc.fontSize(10).text(product.name, 10, 50, { width: 180, align: 'center' });
    doc.fontSize(12).text(`₹${product.pricing?.sellingPrice || product.sellingPrice || 0}`, 10, 68, { width: 180, align: 'center' });
    doc.fontSize(7).text(`MRP: ₹${product.pricing?.mrp || product.mrp || 0}`, 10, 85, { width: 180, align: 'center' });

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
 * Generate bulk barcodes for multiple products and return as PDF
 * @param {Array} products - Products to generate barcodes for
 * @returns {Promise<Object>} Generated PDF info
 */
async function generateBulkBarcodes(products) {
  return generateShelfLabels(products);
}

/**
 * Validate a barcode using checksum (for EAN-13)
 * @param {string} barcode - Barcode to validate
 * @returns {boolean}
 */
function validateBarcode(barcode) {
  if (!barcode || barcode.length < 8) return false;

  // For EAN-13, validate checksum
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

  return true; // Non-EAN barcodes pass basic validation
}

module.exports = {
  generateBarcode,
  generateEAN13,
  generateQRCode,
  generateUPIQRCode,
  generateShelfLabels,
  generateBulkBarcodes,
  validateBarcode,
};
