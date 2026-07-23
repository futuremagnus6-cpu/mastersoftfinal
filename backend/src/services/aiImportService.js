/**
 * AI Product Import Service
 * ──────────────────────────
 * Extracts product data from PDF invoices, price lists, and product images
 * using Tesseract.js (local OCR) + regex pattern matching.
 * No external API key required.
 */

const Tesseract = require('tesseract.js');
const pdfParse = require('pdf-parse');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// ─── Supported GST rates ───
const GST_RATES = [0, 5, 12, 18, 28];

// ─── Indian unit mappings ───
const UNIT_MAP = {
  pcs: 'pcs', piece: 'pcs', pieces: 'pcs', nos: 'pcs', no: 'pcs', each: 'pcs',
  kg: 'kg', kilo: 'kg', kilogram: 'kg', kilograms: 'kg',
  g: 'g', gram: 'g', grams: 'g', gm: 'g',
  l: 'l', litre: 'l', liter: 'l', litres: 'l', liters: 'l',
  ml: 'ml', millilitre: 'ml', millilitres: 'ml', milliliter: 'ml',
  m: 'm', meter: 'm', metre: 'm', metres: 'm',
  box: 'box', bx: 'box',
  pack: 'pack', pk: 'pack', pkt: 'pack', packet: 'pack',
  dozen: 'dozen', dz: 'dozen', doz: 'dozen',
  carton: 'carton', ctn: 'carton', cartoon: 'carton',
  strip: 'box', strips: 'box', tablet: 'pcs', tablets: 'pcs', capsule: 'pcs', capsules: 'pcs',
};

// ─── Common Indian pharmacy/wholesale keywords for category detection ───
const CATEGORY_KEYWORDS = {
  'Medicines': ['tablet', 'capsule', 'syrup', 'injection', 'ointment', 'cream', 'drop', 'suspension', 'inhaler', 'spray', 'lopinavir', 'paracetamol', 'amoxicillin', 'azithromycin'],
  'Vitamins & Supplements': ['vitamin', 'supplement', 'protein', 'omega', 'multivitamin', 'mineral', 'calcium', 'iron', 'zinc', 'magnesium'],
  'Surgical & Disposables': ['syringe', 'needle', 'bandage', 'glove', 'mask', 'surgical', 'disposable', 'cotton', 'gauze'],
  'Personal Care': ['soap', 'shampoo', 'lotion', 'cream', 'deodorant', 'toothpaste', 'sanitizer', 'tissue', 'diaper'],
  'Baby Care': ['baby', 'diaper', 'infant', 'baby oil', 'baby soap', 'baby lotion'],
  'Food & Beverages': ['oil', 'spice', 'rice', 'flour', 'biscuit', 'snack', 'juice', 'tea', 'coffee', 'sugar', 'salt', 'milk'],
  'General Store': ['cleaning', 'detergent', 'soap', 'towel', 'bucket', 'utensil'],
  'Medical Equipment': ['monitor', 'machine', 'device', 'apparatus', 'bp', 'glucometer', 'thermometer', 'nebulizer'],
};

/**
 * Extract text from a PDF file buffer
 */
async function extractPdfText(filePath) {
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);
  return data.text || '';
}

/**
 * Preprocess an image for better OCR: convert to grayscale, increase contrast
 */
async function preprocessImage(inputPath, outputPath) {
  await sharp(inputPath)
    .grayscale()
    .normalize()
    .sharpen()
    .toFile(outputPath);
  return outputPath;
}

/**
 * Extract text from an image using Tesseract.js OCR
 * Supports multiple languages (English + Hindi by default)
 */
async function extractImageText(filePath, lang = 'eng+hin') {
  // Preprocess image for better OCR
  const ext = path.extname(filePath);
  const preprocessedPath = filePath.replace(ext, `-processed${ext}`);
  
  try {
    await preprocessImage(filePath, preprocessedPath);
  } catch (e) {
    // If preprocessing fails, use original
    return runTesseract(filePath, lang);
  }

  try {
    return await runTesseract(preprocessedPath, lang);
  } finally {
    // Clean up preprocessed file
    try { fs.unlinkSync(preprocessedPath); } catch (e) { /* ignore */ }
  }
}

async function runTesseract(imagePath, lang) {
  try {
    const result = await Tesseract.recognize(imagePath, lang, {
      logger: () => {}, // suppress verbose logging
    });
    return result.data.text || '';
  } catch (err) {
    // If multi-language fails, try English only
    if (lang !== 'eng') {
      const result = await Tesseract.recognize(imagePath, 'eng', {
        logger: () => {},
      });
      return result.data.text || '';
    }
    throw err;
  }
}

/**
 * Extract text from a file based on its type
 */
async function extractText(filePath, mimeType) {
  const ext = path.extname(filePath).toLowerCase();
  
  // PDF files
  if (ext === '.pdf' || mimeType?.includes('pdf')) {
    try {
      return await extractPdfText(filePath);
    } catch (e) {
      // If PDF text extraction fails, treat as image-based PDF
      // by converting first page to image
      throw new Error('PDF text extraction failed. Try converting to images first.');
    }
  }
  
  // Image files
  if (['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tiff', '.tif'].includes(ext)) {
    return await extractImageText(filePath);
  }
  
  // Text-based files (CSV, JSON, XML already handled by existing import)
  if (ext === '.txt') {
    return fs.readFileSync(filePath, 'utf-8');
  }
  
  throw new Error(`Unsupported file type: ${ext}. Supported: PDF, JPG, PNG, WebP, BMP, TIFF`);
}

/**
 * Normalize extracted price value to number
 */
function toPrice(val) {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return Math.max(0, val);
  // Remove currency symbols, commas, and whitespace
  const cleaned = String(val).replace(/[₹$,€£¥,\s]/g, '').trim();
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? Math.max(0, num) : 0;
}

/**
 * Normalize extracted integer
 */
function toInt(val) {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return Math.max(0, Math.round(val));
  const cleaned = String(val).replace(/[,\s]/g, '').trim();
  const num = parseInt(cleaned, 10);
  return Number.isFinite(num) ? Math.max(0, num) : 0;
}

/**
 * Clean extracted product name
 */
function cleanName(raw) {
  if (!raw) return '';
  return String(raw)
    .replace(/^[\d\s.]+/, '') // Remove leading numbers
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Regex-based extraction of product data from OCR text
 */
function extractProductsFromText(text) {
  if (!text || !text.trim()) return [];
  
  const lines = text.split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);
  
  const products = [];
  let currentSection = 'unknown';
  
  // Detect document type
  const textLower = text.toLowerCase();
  const isInvoice = /tax invoice|invoice|gstin|gst|bill to|ship to|supplier/i.test(textLower);
  const isPriceList = /price list|rate list|pricelist|catalogue|catalog|price/i.test(textLower);
  const isPrescription = /rx|prescription|dr\.|doctor|dose/i.test(textLower);
  
  // Extract common header info
  let headerInfo = {};
  
  // Extract GSTIN
  const gstinMatch = text.match(/\b\d{2}[A-Z]{5}\d{4}[A-Z]{1}\d[Z]{1}[A-Z\d]{1}\b/i);
  if (gstinMatch) headerInfo.supplierGstin = gstinMatch[0];
  
  // Extract supplier name (lines before GSTIN)
  for (let i = 0; i < Math.min(20, lines.length); i++) {
    if (/gstin|gst|invoice/i.test(lines[i])) {
      if (i > 0) headerInfo.supplierName = cleanName(lines[i - 1]);
      break;
    }
  }
  
  // Extract invoice/date info
  const invMatch = text.match(/invoice\s*(?:no|#|number|num)[:\s]*([\w/-]+)/i);
  if (invMatch) headerInfo.invoiceNumber = invMatch[1].trim();
  
  const dateMatch = text.match(/(?:date|dated)[:\s]*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i);
  if (dateMatch) headerInfo.invoiceDate = dateMatch[1];
  
  // Parse each line to find product entries
  let inTable = false;
  let headers = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();
    
    // Detect table header row
    if (/(?:sr|#|no|item|product|description|particulars|name).*(?:qty|quantity|pcs|rate|price|amount|total|mrp|gst)/i.test(line)) {
      inTable = true;
      headers = line.split(/\s{2,}|\t|(?<=\d)\s+(?=\d)/).filter(h => h.trim());
      continue;
    }
    
    // Detect table end
    if (inTable && /^(?:total|subtotal|grand|summary|tax|amount|thank|terms|conditions?)$/i.test(line.replace(/[:\s₹,]/g, ''))) {
      inTable = false;
      continue;
    }
    
    // Skip non-product lines
    if (!inTable && !/^\d+[.)\s]/.test(line)) continue;
    if (/^[\d\s,.-]+$/.test(line)) continue; // numbers only
    if (line.length < 5) continue;
    if (/^(?:page|total|subtotal|gst|cgst|sgst|igst|round|net|gross)/i.test(line)) continue;
    
    // Try to extract product data from this line
    const product = parseProductLine(line, text, i, lines);
    if (product && product.name) {
      // Deduplicate by name similarity
      const exists = products.some(p => 
        p.name.toLowerCase() === product.name.toLowerCase() ||
        (p.barcode && product.barcode && p.barcode === product.barcode)
      );
      if (!exists) {
        // Auto-detect category
        if (!product.category) {
          product.category = detectCategory(product.name);
        }
        products.push(product);
      }
    }
  }
  
  // If table parsing found nothing, try line-by-line extraction
  if (products.length === 0) {
    for (const line of lines) {
      const product = parseProductLine(line, text, 0, lines);
      if (product && product.name && product.name.length > 2) {
        const exists = products.some(p => 
          p.name.toLowerCase() === product.name.toLowerCase()
        );
        if (!exists) {
          if (!product.category) product.category = detectCategory(product.name);
          products.push(product);
        }
      }
    }
  }
  
  return products;
}

/**
 * Parse a single line to extract product data
 */
function parseProductLine(line, fullText, lineIndex, allLines) {
  // Patterns for different product line formats:
  
  // Format 1: "1  Paracetamol 500mg  10  25.00  250.00"
  // Format 2: "8901234567890  Paracetamol  300490  10  25.00  5%  250.00"
  // Format 3: "Paracetamol 500mg  B2025A  12/2027  10  25.00  250.00"
  // Format 4: "* Paracetamol 500mg @ 25.00 x 10 = 250.00"
  
  const result = { name: '', barcode: '', hsnCode: '', batchNumber: '', expiryDate: '', quantity: 0, mrp: 0, sellingPrice: 0, purchasePrice: 0, gstRate: 18, unit: 'pcs', brand: '', category: '' };
  
  // Extract barcode (EAN-13, UPC-A, CODE-128 patterns)
  const barcodeMatch = line.match(/\b(\d{12,13}|\d{8})\b/);
  if (barcodeMatch && barcodeMatch.index < 15) {
    result.barcode = barcodeMatch[1];
  }
  
  // Extract HSN code (6 or 8 digit code)
  const hsnMatch = line.match(/\b(\d{6,8})\b/);
  if (hsnMatch && !result.barcode) {
    result.hsnCode = hsnMatch[1];
  } else if (hsnMatch && hsnMatch[1] !== result.barcode) {
    result.hsnCode = hsnMatch[1];
  }
  
  // Extract batch number
  const batchMatch = line.match(/\b([A-Z0-9]{5,10})\b/);
  if (batchMatch) {
    result.batchNumber = batchMatch[1];
  }
  
  // Extract expiry date
  const expiryMatch = line.match(/\b(\d{2}[/-]\d{2,4})\b/);
  if (expiryMatch) {
    result.expiryDate = expiryMatch[1];
  }
  
  // Extract GST rate
  const gstMatch = line.match(/(\d{1,2})%\s*(?:gst|igst|vat)?/i);
  if (gstMatch) {
    const rate = parseInt(gstMatch[1], 10);
    result.gstRate = GST_RATES.includes(rate) ? rate : 18;
  }
  
  // Extract prices - look for decimal numbers that could be prices
  const priceMatches = [...line.matchAll(/\b(\d+\.\d{2})\b/g)];
  const intPriceMatches = [...line.matchAll(/\b(₹?\s*(\d+))\b/g)];
  
  // Try to identify which number is qty, rate, total
  // Pattern: name + qty + rate + total (3 numbers)
  // Pattern: name + qty + rate + gst + total (4 numbers)
  // Pattern: name + barcode + hsn + qty + rate + gst + total
  
  const numbers = [...line.matchAll(/\b(\d+(?:\.\d{1,2})?)\b/g)]
    .map(m => parseFloat(m[1]))
    .filter(n => n > 0);
  
  if (numbers.length >= 3) {
    // Usually: qty (small int), rate (medium), total (largest)
    const sorted = [...numbers].sort((a, b) => a - b);
    const possibleQty = numbers.filter(n => Number.isInteger(n) && n <= 999);
    const possibleRates = numbers.filter(n => !Number.isInteger(n) || n > 10);
    
    if (possibleQty.length > 0) {
      result.quantity = Math.max(...possibleQty.filter(q => q <= 9999));
    } else if (numbers[0] <= 999 && Number.isInteger(numbers[0])) {
      result.quantity = numbers[0];
    }
    
    // The smallest non-qty number is likely the rate
    const nonQty = numbers.filter(n => n !== result.quantity);
    if (nonQty.length > 0) {
      if (nonQty.length >= 2) {
        // If there's a small rate and a larger total
        const small = Math.min(...nonQty);
        const large = Math.max(...nonQty);
        // If the large one is approximately small * qty, it's the total
        if (result.quantity > 0 && Math.abs(large - (small * result.quantity)) < 1) {
          result.sellingPrice = small;
          result.mrp = small;
        } else {
          // Two different prices - try to identify MRP vs selling
          const sortedNonQty = [...nonQty].sort((a, b) => a - b);
          result.mrp = sortedNonQty[sortedNonQty.length - 1];
          result.sellingPrice = sortedNonQty[0];
        }
      } else {
        result.sellingPrice = nonQty[0];
        result.mrp = nonQty[0];
      }
    }
  } else if (numbers.length === 2) {
    result.quantity = Math.floor(Math.min(...numbers));
    result.sellingPrice = Math.max(...numbers);
    result.mrp = Math.max(...numbers);
  } else if (numbers.length === 1) {
    result.sellingPrice = numbers[0];
    result.mrp = numbers[0];
  }
  
  // Extract product name - remove known patterns
  let namePart = line
    .replace(/^\d+[.)\s]*/, '') // leading number
    .replace(/\d{12,14}/g, '') // barcode
    .replace(/\d{6,8}/g, '') // HSN
    .replace(/[A-Z0-9]{5,10}/g, '') // batch
    .replace(/\d{2}[/-]\d{2,4}/g, '') // expiry
    .replace(/\d+\.\d{2}/g, '') // prices
    .replace(/\d+%/g, '') // percentages
    .replace(/₹/g, '')
    .replace(/[*@#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Remove common prefixes
  namePart = namePart.replace(/^(?:sr|no|#|item)\s*/i, '');
  
  if (namePart.length >= 3) {
    result.name = cleanName(namePart);
  }
  
  return result;
}

/**
 * Detect product category based on name keywords
 */
function detectCategory(productName) {
  if (!productName) return 'Uncategorized';
  const lower = productName.toLowerCase();
  
  let bestCategory = 'Uncategorized';
  let bestScore = 0;
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const score = keywords.reduce((s, kw) => s + (lower.includes(kw) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }
  
  return bestCategory;
}

/**
 * Merge duplicate products based on name similarity
 */
function mergeDuplicates(products) {
  const merged = [];
  const seen = new Set();
  
  for (const product of products) {
    const key = product.barcode || product.name.toLowerCase().replace(/\s+/g, '');
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(product);
    }
  }
  
  return merged;
}

/**
 * Main function: Process uploaded file and extract products
 */
async function processImportFile(filePath, mimeType) {
  // Step 1: Extract raw text from file
  const text = await extractText(filePath, mimeType);
  
  if (!text || text.trim().length < 10) {
    throw new Error('Could not extract any text from the file. The file may be empty, corrupted, or in an unsupported format.');
  }
  
  // Step 2: Parse products from text
  let products = extractProductsFromText(text);
  
  // Step 3: Merge duplicates
  products = mergeDuplicates(products);
  
  // Step 4: Filter out low-quality results
  products = products.filter(p => p.name && p.name.length >= 3);
  
  return {
    products,
    rawText: text.substring(0, 5000), // truncated preview
    totalExtracted: products.length,
  };
}

module.exports = {
  processImportFile,
  extractText,
  extractProductsFromText,
  detectCategory,
  mergeDuplicates,
};