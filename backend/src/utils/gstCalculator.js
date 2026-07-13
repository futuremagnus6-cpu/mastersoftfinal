/**
 * GST Calculation Utilities
 * Handles all GST-related calculations for Indian tax compliance.
 */

const GST_RATES = [0, 5, 12, 18, 28];
const CESS_RATES = { tobacco: 5, luxury: 3 }; // example cess rates

/**
 * Calculate GST components for a given taxable amount and GST rate
 * @param {number} taxableAmount - The taxable amount (before GST)
 * @param {number} gstRate - GST rate percentage (0, 5, 12, 18, 28)
 * @param {string} transactionType - 'intra_state' or 'inter_state'
 * @returns {Object} { cgst, sgst, igst, totalGst }
 */
function calculateGST(taxableAmount, gstRate, transactionType = 'intra_state') {
  if (!GST_RATES.includes(gstRate)) {
    throw new Error(`Invalid GST rate: ${gstRate}. Allowed rates: ${GST_RATES.join(', ')}`);
  }

  const totalGst = (taxableAmount * gstRate) / 100;

  if (transactionType === 'inter_state') {
    return { cgst: 0, sgst: 0, igst: Math.round(totalGst * 100) / 100, totalGst: Math.round(totalGst * 100) / 100 };
  }

  // Intra-state: CGST + SGST (each half of total GST)
  const halfGst = totalGst / 2;
  return {
    cgst: Math.round(halfGst * 100) / 100,
    sgst: Math.round(halfGst * 100) / 100,
    igst: 0,
    totalGst: Math.round(totalGst * 100) / 100,
  };
}

/**
 * Calculate price with GST inclusive/exclusive
 * @param {number} price - The base price
 * @param {number} gstRate - GST rate percentage
 * @param {boolean} isGstInclusive - Whether price already includes GST
 * @returns {Object} { sellingPrice, taxableAmount, gstAmount, gstBreakup }
 */
function calculatePriceWithGST(price, gstRate, isGstInclusive = true) {
  if (!GST_RATES.includes(gstRate)) {
    throw new Error(`Invalid GST rate: ${gstRate}`);
  }

  let sellingPrice, taxableAmount, gstAmount;

  if (isGstInclusive) {
    // Price includes GST: Price = Taxable + GST
    taxableAmount = Math.round((price * 100) / (100 + gstRate) * 100) / 100;
    gstAmount = price - taxableAmount;
    sellingPrice = price;
  } else {
    // Price excludes GST: Price + GST
    taxableAmount = price;
    gstAmount = Math.round((price * gstRate) / 100 * 100) / 100;
    sellingPrice = price + gstAmount;
  }

  const gstBreakup = calculateGST(taxableAmount, gstRate);

  return { sellingPrice: Math.round(sellingPrice * 100) / 100, taxableAmount, gstAmount, gstBreakup };
}

/**
 * Validate HSN code format
 * @param {string} hsnCode - HSN code to validate
 * @returns {boolean}
 */
function validateHSN(hsnCode) {
  if (!hsnCode) return false;
  const hsn = hsnCode.toString().trim();
  // HSN should be 4, 6, or 8 digits
  return /^\d{4,8}$/.test(hsn);
}

/**
 * Validate GSTIN format
 * @param {string} gstin - GSTIN to validate
 * @returns {boolean}
 */
function validateGSTIN(gstin) {
  if (!gstin) return false;
  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstRegex.test(gstin.toUpperCase());
}

/**
 * Determine transaction type based on seller and buyer states
 * @param {string} sellerState - Seller's state code
 * @param {string} buyerState - Buyer's state code
 * @returns {string} 'intra_state' or 'inter_state'
 */
function getTransactionType(sellerState, buyerState) {
  return sellerState === buyerState ? 'intra_state' : 'inter_state';
}

/**
 * Generate e-Invoice JSON format (as per NIC API schema)
 * @param {Object} invoiceData - Invoice data
 * @returns {Object} Formatted e-invoice payload
 */
function generateEInvoicePayload(invoiceData) {
  const {
    sellerGstin, buyerGstin, invoiceNumber, invoiceDate,
    invoiceType = 'INV', placeOfSupply, items, totalValue,
    cgst, sgst, igst, totalGst, grandTotal, irn,
  } = invoiceData;

  return {
    Version: '1.1',
    TranDtls: {
      TaxSch: 'GST',
      SupTyp: 'B2B',
      RegRev: 'N',
      EcmGstin: null,
      IgstOnIntra: 'N',
    },
    DocDtls: {
      Typ: invoiceType,
      No: invoiceNumber,
      Dt: invoiceDate,
    },
    SellerDtls: {
      Gstin: sellerGstin,
      LglNm: invoiceData.sellerName || '',
      TrdNm: invoiceData.sellerTradeName || '',
      Addr1: invoiceData.sellerAddress || '',
      Loc: invoiceData.sellerCity || '',
      Pin: invoiceData.sellerPincode || '',
      Stcd: invoiceData.sellerStateCode || '',
      Ph: invoiceData.sellerPhone || '',
      Em: invoiceData.sellerEmail || '',
    },
    BuyerDtls: {
      Gstin: buyerGstin,
      LglNm: invoiceData.buyerName || '',
      TrdNm: invoiceData.buyerTradeName || '',
      Addr1: invoiceData.buyerAddress || '',
      Loc: invoiceData.buyerCity || '',
      Pin: invoiceData.buyerPincode || '',
      Stcd: invoiceData.buyerStateCode || '',
      Ph: invoiceData.buyerPhone || '',
      Em: invoiceData.buyerEmail || '',
    },
    ItemList: items.map((item, index) => ({
      SlNo: index + 1,
      PrdDesc: item.productName,
      HsnCd: item.hsnCode || '',
      Qty: item.quantity,
      Unit: item.unit || 'NOS',
      UnitPrice: item.taxableAmount / item.quantity,
      TotAmt: item.taxableAmount,
      Discount: item.discountAmount || 0,
      AssAmt: item.taxableAmount,
      GstRt: item.gstRate,
      CgstAmt: item.cgst || 0,
      SgstAmt: item.sgst || 0,
      IgstAmt: item.igst || 0,
      TotItemVal: item.total,
    })),
    ValDtls: {
      AssVal: totalValue,
      CgstVal: cgst,
      SgstVal: sgst,
      IgstVal: igst,
      TotVal: grandTotal,
    },
    Irn: irn || '',
  };
}

/**
 * Generate GSTR-1 format (outward supplies)
 * @param {Array} invoices - Array of invoice data
 * @returns {Object} GSTR-1 formatted data
 */
function generateGSTR1(invoices) {
  const b2bInvoices = invoices.filter((inv) => inv.gstInvoiceType === 'b2b');
  const b2cInvoices = invoices.filter((inv) => inv.gstInvoiceType === 'b2c');

  return {
    gstin: invoices[0]?.sellerGstin || '',
    fp: '', // Filing period: MMYYYY
    b2b: b2bInvoices.map((inv) => ({
      ctin: inv.buyerGstin,
      inv: [{
        inum: inv.invoiceNumber,
        idt: inv.invoiceDate,
        val: inv.grandTotal,
        pos: inv.placeOfSupply || '',
        itms: inv.items.map((item, idx) => ({
          num: idx + 1,
          itm_det: {
            ty: item.taxableAmount,
            rt: item.gstRate,
            txval: item.taxableAmount,
            camt: item.cgst || 0,
            samt: item.sgst || 0,
            iamt: item.igst || 0,
          },
        })),
      },
    }])),
    b2cs: b2cInvoices.map((inv) => ({
      sply_ty: 'INTRA' || 'INTER',
      pos: inv.placeOfSupply || '',
      typ: 'OE',
      etin: inv.buyerGstin || '',
      val: inv.grandTotal,
      rt: 0,
      txval: inv.items.reduce((s, i) => s + i.taxableAmount, 0),
      camt: inv.items.reduce((s, i) => s + (i.cgst || 0), 0),
      samt: inv.items.reduce((s, i) => s + (i.sgst || 0), 0),
    })),
  };
}

/**
 * Calculate reverse charge GST
 * @param {number} amount - Transaction amount
 * @param {number} gstRate - GST rate
 * @param {string} type - 'intra_state' or 'inter_state'
 * @returns {Object} RCM GST details
 */
function calculateRCM(amount, gstRate, type = 'intra_state') {
  return calculateGST(amount, gstRate, type);
}

module.exports = {
  GST_RATES,
  calculateGST,
  calculatePriceWithGST,
  validateHSN,
  validateGSTIN,
  getTransactionType,
  generateEInvoicePayload,
  generateGSTR1,
  calculateRCM,
};
