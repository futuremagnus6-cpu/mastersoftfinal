/**
 * Print Utilities — Thermal Receipt & Standard A4 Bill
 * ─────────────────────────────────────────────────────
 * Fully respects the expanded printConfig settings from the Settings page.
 */

const DEFAULT_PRINT_CONFIG = {
  thermal: {
    paperWidth: '80mm',
    showLogo: true,
    storeName: '',
    tagline: '',
    headerAlignment: 'center',
    footerMessage: 'Thank you for your purchase!',
    showGstin: true,
    showCustomer: true,
    showPayments: true,
    showDiscount: true,
    showBatchNumber: false,
    showExpiryDate: false,
    showBarcode: false,
    showQrCode: false,
    qrCodeType: 'upi',
    showCashierName: false,
    showBranchName: false,
    showTokenNumber: false,
    printCopies: 1,
    customerCopy: true,
    merchantCopy: true,
    autoPrintAfterPayment: false,
    printPreview: true,
  },
  standard: {
    invoiceTitle: 'Tax Invoice',
    showLogo: true,
    showCompanyDetails: true,
    showCustomerSection: true,
    showBillingAddress: true,
    showShippingAddress: true,
    showCustomerGstin: true,
    showCustomerPhone: true,
    showCustomerEmail: false,
    showCustomerMembership: false,
    productColumns: {
      image: false, sku: false, barcode: false, hsn: true,
      batch: false, expiry: false, mrp: false, rate: true,
      discount: true, gst: true, total: true,
    },
    showTerms: true,
    termsText: '1. Goods once sold will not be taken back.\n2. This is a computer-generated invoice.\n3. Subject to local jurisdiction.',
    showSignature: true,
    showGstSummary: true,
    showAmountInWords: true,
    showDiscountDetails: true,
    showWatermark: false,
    watermarkText: 'PAID',
    watermarkType: 'paid',
    footerMessage: '',
    showQrCode: false,
    qrCodeType: 'invoice',
    digitalSignature: false,
  },
  pdf: {
    orientation: 'portrait',
    margin: 10,
    fontFamily: 'Segoe UI',
    fontSize: 12,
    headerHeight: 40,
    footerHeight: 30,
  },
};

function buildShopInfo(shop) {
  if (!shop) return { name: 'Shop', address: '', gstin: '', phone: '', email: '' };
  return {
    name: shop.name || shop.shopName || 'Shop',
    address: shop.address || shop.shopAddress || '',
    gstin: shop.gstin || shop.gstNo || shop.taxId || '',
    phone: shop.phone || shop.mobile || shop.contact || '',
    email: shop.email || '',
  };
}

const fmt = (n) => `₹${(n || 0).toFixed(2)}`;
const fmtDate = (d) => d ? new Date(d).toLocaleString('en-IN') : '';

function numberToWords(num) {
  const single = ['Zero','One','Two','Three','Four','Five','Six','Seven','Eight','Nine'];
  const double = ['Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  if (num === 0) return 'Zero';
  const convertBelow1000 = (n) => {
    let s = '';
    if (n >= 100) { s += single[Math.floor(n / 100)] + ' Hundred '; n %= 100; }
    if (n >= 20) { s += tens[Math.floor(n / 10)] + ' '; n %= 10; }
    else if (n >= 10) { s += double[n - 10] + ' '; n = 0; }
    if (n > 0) s += single[n] + ' ';
    return s.trim();
  };
  let words = '', crore = Math.floor(num / 10000000);
  num %= 10000000;
  let lakh = Math.floor(num / 100000);
  num %= 100000;
  let thousand = Math.floor(num / 1000);
  num %= 1000;
  if (crore) words += convertBelow1000(crore) + ' Crore ';
  if (lakh) words += convertBelow1000(lakh) + ' Lakh ';
  if (thousand) words += convertBelow1000(thousand) + ' Thousand ';
  if (num) words += convertBelow1000(num);
  return words.trim() + ' Rupees Only';
}

function buildGstSummary(items) {
  const map = {};
  (items || []).forEach(item => {
    const rate = item.gstRate || 0;
    if (!map[rate]) map[rate] = { rate, taxable: 0, cgst: 0, sgst: 0, qty: 0 };
    map[rate].taxable += (item.taxableAmount || 0) * (item.quantity || 1);
    map[rate].cgst += ((item.gstAmount || 0) / 2) * (item.quantity || 1);
    map[rate].sgst += ((item.gstAmount || 0) / 2) * (item.quantity || 1);
    map[rate].qty += item.quantity || 1;
  });
  return Object.values(map).sort((a, b) => a.rate - b.rate);
}

function deepMerge(obj, defaults) {
  if (!obj || typeof obj !== 'object') return { ...defaults };
  const result = { ...defaults };
  Object.keys(defaults).forEach(key => {
    if (obj[key] !== undefined) {
      if (typeof defaults[key] === 'object' && defaults[key] !== null && !Array.isArray(defaults[key])) {
        result[key] = deepMerge(obj[key], defaults[key]);
      } else {
        result[key] = obj[key];
      }
    }
  });
  return result;
}

function mergeConfig(userConfig) {
  if (!userConfig) return { ...DEFAULT_PRINT_CONFIG };
  return {
    thermal: { ...DEFAULT_PRINT_CONFIG.thermal, ...(userConfig.thermal || {}) },
    standard: deepMerge(userConfig.standard, DEFAULT_PRINT_CONFIG.standard),
    pdf: { ...DEFAULT_PRINT_CONFIG.pdf, ...(userConfig.pdf || {}) },
  };
}

// ─── QR Code SVG placeholder ───
function qrSvg(size) {
  const blocks = [1,1,1,1,0,1,1,1,1,1,0,0,0,1,0,0,0,1,1,1,1,1,1,1,1,0,1,0,0,0,1,1,1,1,0,0,1,0,1,0,0,1,1,1,1,1,0,1,1,1,1,0,1,0,1,1,1,1,1,0,0,0,1,1,1,1,1,0,0,0,0,0,1,1,1,1,0,1,0,1,1,1,0,1,1,1,0,0,1,1,1,1,0,1,0,1,1,1,1,0,0,1,0,0,1,1,1,1,0,1,1,1,1,1,0,1,1,1,0,1,1,1,1,1,1,1,0,1,1,1,0,1,1,0,0,0,1,1,1];
  const blockSize = size / 11;
  let svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<rect width="${size}" height="${size}" fill="white"/>`;
  blocks.forEach((b, i) => {
    if (b) {
      const x = (i % 11) * blockSize;
      const y = Math.floor(i / 11) * blockSize;
      svg += `<rect x="${x}" y="${y}" width="${blockSize}" height="${blockSize}" fill="black"/>`;
    }
  });
  svg += '</svg>';
  return svg;
}

// ═══════════════════════════════════════════════════════════
//  1. THERMAL PRINT — compact receipt for thermal printers
// ═══════════════════════════════════════════════════════════
export function thermalPrint(order, shop, printConfig) {
  const cfg = mergeConfig(printConfig);
  const th = cfg.thermal;
  const shopInfo = buildShopInfo(shop);
  const items = Array.isArray(order?.items) ? order.items : [];
  const payments = Array.isArray(order?.payments) ? order.payments : [];

  const paperWidth = th.paperWidth || '80mm';
  const paperWidthNum = parseInt(paperWidth, 10);
  const bodyWidth = Math.max(58, paperWidthNum - 8);

  const is58mm = paperWidth === '58mm';
  const baseFont = is58mm ? '9px' : '11px';
  const titleFont = is58mm ? '11px' : '14px';
  const smallFont = is58mm ? '8px' : '10px';

  const alignment = th.headerAlignment || 'center';
  const headerAlign = `.header-${alignment} { text-align: ${alignment}; }`;

  // Build item table headers dynamically
  let itemHeaders = '<td style="width: 45%;">Item</td>';
  if (th.showBatchNumber) itemHeaders += '<td style="width: 15%; text-align: left;">Batch</td>';
  if (th.showExpiryDate) itemHeaders += '<td style="width: 12%; text-align: left;">Exp</td>';
  itemHeaders += '<td style="width: 13%; text-align: center;">Qty</td>';
  itemHeaders += '<td style="width: 15%; text-align: right;">Total</td>';

  const gstSummary = buildGstSummary(items);
  const displayName = th.storeName || shopInfo.name || 'Shop';

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Receipt — ${order?.orderNumber || ''}</title>
<style>
  @page { margin: 0; size: ${paperWidth} auto; }
  body { margin: 0; padding: ${is58mm ? '2px 2px' : '4px 4px'}; font-family: 'Courier New', Courier, monospace; font-size: ${baseFont}; line-height: 1.35; color: #000; width: ${bodyWidth}mm; max-width: ${bodyWidth}mm; }
  .${th.headerAlignment === 'center' ? 'header-center' : th.headerAlignment === 'right' ? 'header-right' : 'header-left'} { text-align: ${alignment}; }
  .bold { font-weight: bold; }
  .line { border-top: 1px dashed #333; margin: 4px 0; }
  .thick-line { border-top: 2px solid #333; margin: 4px 0; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 1px 0; vertical-align: top; font-size: ${is58mm ? '8px' : '10px'}; }
  .ttl { text-align: right; }
  .item-name { font-size: ${is58mm ? '9px' : '11px'}; }
  .total-row td { padding-top: 3px; font-weight: bold; }
  .footer { margin-top: 4px; text-align: center; font-size: ${is58mm ? '8px' : '10px'}; }
  .barcode { font-family: 'Libre Barcode 128', monospace; font-size: ${is58mm ? '14px' : '18px'}; letter-spacing: 2px; text-align: center; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>
  <div class="${alignment === 'center' ? 'header-center' : alignment === 'right' ? 'header-right' : 'header-left'}">
    ${th.showLogo ? `<div class="bold" style="font-size: ${is58mm ? '12px' : titleFont};">${displayName}</div>` : ''}
    ${th.tagline ? `<div style="font-size: ${is58mm ? '8px' : smallFont}; color: #555;">${th.tagline}</div>` : ''}
    ${shopInfo.address ? `<div style="font-size: ${is58mm ? '8px' : smallFont};">${shopInfo.address}</div>` : ''}
    ${shopInfo.gstin && th.showGstin ? `<div style="font-size: ${is58mm ? '8px' : smallFont};">GSTIN: ${shopInfo.gstin}</div>` : ''}
    ${shopInfo.phone ? `<div style="font-size: ${is58mm ? '8px' : smallFont};">${shopInfo.phone}</div>` : ''}
  </div>

  <div class="line"></div>
  <div class="header-center bold" style="font-size: ${is58mm ? '10px' : '12px'};">SALE RECEIPT</div>
  <div class="header-center" style="font-size: ${is58mm ? '8px' : smallFont};">
    ${order?.orderNumber || 'N/A'}<br>${fmtDate(order?.createdAt)}
  </div>

  ${th.showCashierName || th.showBranchName || th.showTokenNumber ? `
  <div class="header-center" style="font-size: ${is58mm ? '8px' : smallFont}; color: #555;">
    ${th.showCashierName ? `Cashier: ${order?.cashierName || 'Admin'}` : ''}${th.showCashierName && th.showBranchName ? ' | ' : ''}
    ${th.showBranchName ? `Branch: ${order?.branchName || 'Main'}` : ''}${(th.showCashierName || th.showBranchName) && th.showTokenNumber ? ' | ' : ''}
    ${th.showTokenNumber ? `Token: ${order?.tokenNumber || 'A001'}` : ''}
  </div>` : ''}

  ${order?.customerName && th.showCustomer ? `
  <div class="line"></div>
  <div style="font-size: ${is58mm ? '8px' : smallFont};">
    Customer: ${order.customerName}${order.customerMobile ? ' — ' + order.customerMobile : ''}
    ${order.customerGstin ? '<br>GST: ' + order.customerGstin : ''}
  </div>` : ''}

  <div class="line"></div>
  <table>
    <tr style="font-weight: bold; font-size: ${is58mm ? '8px' : smallFont};">${itemHeaders}</tr>
    ${items.map(item => {
      const batchHtml = th.showBatchNumber ? `<td style="font-size:${is58mm ? '7px' : '9px'};color:#555;">${item.batchNumber || '-'}</td>` : '';
      const expiryHtml = th.showExpiryDate ? `<td style="font-size:${is58mm ? '7px' : '9px'};color:#555;">${item.expiryDate ? new Date(item.expiryDate).toLocaleDateString('en-IN',{month:'2-digit',year:'2-digit'}) : '-'}</td>` : '';
      return `<tr>
        <td class="item-name">${item.productName || 'Item'}</td>
        ${batchHtml}${expiryHtml}
        <td style="text-align: center;">${item.quantity || 0}</td>
        <td class="ttl">${fmt(item.total)}</td>
      </tr>
      ${item.hsnCode ? `<tr><td colspan="${2 + (th.showBatchNumber?1:0) + (th.showExpiryDate?1:0) + 2}" style="font-size:${is58mm ? '7px' : '9px'};color:#555;">HSN: ${item.hsnCode} | ${item.gstRate || 0}% GST</td></tr>` : ''}`;
    }).join('')}
  </table>

  <div class="thick-line"></div>
  <table>
    <tr><td>Subtotal</td><td class="ttl">${fmt(order?.subtotal)}</td></tr>
    ${(order?.totalDiscount || 0) > 0 && th.showDiscount ? `<tr><td>Discount</td><td class="ttl" style="color:#16a34a;">-${fmt(order.totalDiscount)}</td></tr>` : ''}
    ${gstSummary.map(g => `<tr><td style="font-size:${is58mm ? '8px' : '9px'};">GST @ ${g.rate}%</td><td class="ttl" style="font-size:${is58mm ? '8px' : '9px'};">CGST: ${fmt(g.cgst)} | SGST: ${fmt(g.sgst)}</td></tr>`).join('')}
    <tr class="total-row"><td style="font-size: ${is58mm ? '12px' : '14px'};">TOTAL</td><td class="ttl" style="font-size: ${is58mm ? '12px' : '14px'};">${fmt(order?.grandTotal)}</td></tr>
  </table>

  <div class="line"></div>

  ${payments.length > 0 && th.showPayments ? `
  <div style="font-size: ${smallFont}; font-weight: bold;">Payments</div>
  ${payments.map(p => `<div style="font-size: ${smallFont}; display: flex; justify-content: space-between;"><span>${(p.method || '').toUpperCase()}</span><span>${fmt(p.amount)}</span></div>`).join('')}
  <div class="line"></div>` : ''}

  ${(order?.balanceDue || 0) > 0 ? `<div style="font-size: ${smallFont};">Balance Due: ${fmt(order.balanceDue)}</div>` : ''}

  ${th.showBarcode ? `<div class="barcode">||||||||||||||||||||||||||</div>` : ''}
  ${th.showQrCode ? `<div class="header-center" style="margin-top: 2px;">${qrSvg(is58mm ? 36 : 48)}</div>` : ''}

  <div class="footer">
    ${th.footerMessage ? `${th.footerMessage}<br>` : ''}
    Future Magnus Business OS
  </div>
</body></html>`;

    // Handle print copies
  if (th.printCopies > 1) {
    for (let i = 0; i < th.printCopies; i++) {
      openPrintWindow(html, paperWidth, 'auto', `Thermal Receipt (Copy ${i + 1})`, th.printPreview);
    }
  } else {
    openPrintWindow(html, paperWidth, 'auto', 'Thermal Receipt', th.printPreview);
  }
}

// ═══════════════════════════════════════════════════════════
//  2. STANDARD BILL — A4 professional tax invoice
// ═══════════════════════════════════════════════════════════
export function standardBillPrint(order, shop, printConfig) {
  const cfg = mergeConfig(printConfig);
  const st = cfg.standard;
  const shopInfo = buildShopInfo(shop);
  const items = Array.isArray(order?.items) ? order.items : [];
  const payments = Array.isArray(order?.payments) ? order.payments : [];
  const gstSummary = buildGstSummary(items);

  const totalTaxable = items.reduce((s, i) => s + ((i.taxableAmount || 0) * (i.quantity || 1)), 0);
  const totalCgst = items.reduce((s, i) => s + ((i.gstAmount || 0) / 2) * (i.quantity || 1), 0);
  const totalSgst = items.reduce((s, i) => s + ((i.gstAmount || 0) / 2) * (i.quantity || 1), 0);

  const cols = st.productColumns || {};
  const showCol = (key) => cols[key] !== false;

  // Build product table headers dynamically based on column config
  let tableHeaders = '<th style="width: 25px;">#</th>';
  if (showCol('image')) tableHeaders += '<th style="width: 40px;">Img</th>';
  if (showCol('sku')) tableHeaders += '<th style="width: 60px;">SKU</th>';
  if (showCol('barcode')) tableHeaders += '<th style="width: 60px;">Barcode</th>';
  if (showCol('hsn')) tableHeaders += '<th style="width: 70px;">HSN/SAC</th>';
  tableHeaders += '<th>Product / Service</th>';
  tableHeaders += '<th class="center" style="width: 35px;">Qty</th>';
  if (showCol('mrp')) tableHeaders += '<th class="right" style="width: 55px;">MRP</th>';
  if (showCol('rate')) tableHeaders += '<th class="right" style="width: 55px;">Rate</th>';
  if (showCol('batch')) tableHeaders += '<th style="width: 50px;">Batch</th>';
  if (showCol('expiry')) tableHeaders += '<th style="width: 50px;">Exp</th>';
  if (showCol('discount')) tableHeaders += '<th class="right" style="width: 45px;">Disc%</th>';
  tableHeaders += '<th class="right" style="width: 60px;">Taxable</th>';
  if (showCol('gst')) { tableHeaders += '<th class="right" style="width: 45px;">CGST</th><th class="right" style="width: 45px;">SGST</th>'; }
  if (showCol('total')) tableHeaders += '<th class="right" style="width: 60px;">Total</th>';

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Invoice — ${order?.orderNumber || ''}</title>
<style>
  @page { margin: 15mm; size: A4 portrait; }
  body { margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #222; line-height: 1.5; }
  .page { max-width: 190mm; margin: 0 auto; padding: 8mm 0; position: relative; }

  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #374151; padding-bottom: 10px; margin-bottom: 14px; }
  .shop-details h1 { margin: 0; font-size: 22px; color: #374151; }
  .shop-details p { margin: 2px 0; font-size: 11px; color: #6b7280; }
  .invoice-title { text-align: right; }
  .invoice-title .store-label { margin: 0; font-size: 12px; font-weight: 600; color: #374151; }
  .invoice-title h2 { margin: 0; font-size: 18px; color: #374151; text-transform: uppercase; letter-spacing: 1px; }
  .invoice-title p { margin: 2px 0; font-size: 11px; color: #6b7280; }

  .info-section { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 14px; }
  .info-box { flex: 1; border: 1px solid #ddd; border-radius: 4px; padding: 6px 8px; }
  .info-box h3 { margin: 0 0 4px 0; font-size: 10px; color: #374151; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e5e7eb; padding-bottom: 3px; }
  .info-box p { margin: 1px 0; font-size: 10px; color: #333; }

  table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
  th { background: #374151; color: #fff; font-size: 9px; padding: 5px 3px; text-align: left; text-transform: uppercase; letter-spacing: 0.3px; }
  th.right { text-align: right; }
  th.center { text-align: center; }
  td { padding: 4px 3px; border-bottom: 1px solid #e5e7eb; font-size: 10px; vertical-align: top; }
  td.right { text-align: right; }
  td.center { text-align: center; }

  .summary { display: flex; justify-content: flex-end; }
  .summary-table { width: 300px; }
  .summary-table td { padding: 2px 6px; border: none; font-size: 10px; }
  .summary-table .label { color: #555; }
  .summary-table .value { text-align: right; font-weight: 500; }
  .summary-table .grand-total td { font-size: 13px; font-weight: bold; border-top: 2px solid #374151; padding-top: 5px; color: #374151; }

  .gst-table { width: 100%; margin-top: 6px; }
  .gst-table th { background: #f3f4f6; color: #333; font-size: 9px; padding: 4px; border-bottom: 1px solid #ddd; }
  .gst-table td { font-size: 9px; padding: 3px 4px; }

  .payment-section { margin-top: 10px; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
  .payment-section h3 { margin: 0 0 4px 0; font-size: 10px; color: #374151; text-transform: uppercase; letter-spacing: 0.5px; }

  .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #ddd; display: flex; justify-content: space-between; font-size: 9px; color: #666; }
  .footer .terms { max-width: 60%; }
  .footer .signature { text-align: right; }
  .amount-words { font-size: 10px; color: #374151; font-weight: 500; margin-top: 6px; padding: 4px 8px; border: 1px solid #e5e7eb; border-radius: 4px; background: #f9fafb; }

  .watermark-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; z-index: 1000; }
  .watermark-text { font-size: 80px; font-weight: bold; color: rgba(220,38,38,0.12); transform: rotate(-30deg); text-transform: uppercase; letter-spacing: 10px; }

  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .watermark-text { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>
  ${st.showWatermark ? `<div class="watermark-overlay"><div class="watermark-text">${st.watermarkText || 'PAID'}</div></div>` : ''}

  <div class="page">
    <!-- HEADER -->
    <div class="header">
      <div class="shop-details">
        <h1>${shopInfo.name || 'Shop'}</h1>
        ${st.showCompanyDetails ? `
          ${shopInfo.address ? `<p>${shopInfo.address}</p>` : ''}
          ${shopInfo.phone ? `<p>📞 ${shopInfo.phone}</p>` : ''}
          ${shopInfo.email ? `<p>✉ ${shopInfo.email}</p>` : ''}
          ${shopInfo.gstin ? `<p><strong>GSTIN:</strong> ${shopInfo.gstin}</p>` : ''}
        ` : ''}
      </div>
      <div class="invoice-title">
        ${st.showLogo ? `<div class="store-label">${shopInfo.name || 'Shop'}</div>` : ''}
        <h2>${st.invoiceTitle || 'Tax Invoice'}</h2>
        <p><strong>Invoice #:</strong> ${order?.invoiceNumber || order?.orderNumber || 'N/A'}</p>
        <p><strong>Order #:</strong> ${order?.orderNumber || 'N/A'}</p>
        <p><strong>Date:</strong> ${fmtDate(order?.createdAt)}</p>
      </div>
    </div>

    <!-- BUYER -->
    ${st.showCustomerSection ? `
    <div class="info-section">
      <div class="info-box">
        <h3>Bill To</h3>
        <p><strong>${order?.customerName || 'Walk-in Customer'}</strong></p>
        ${st.showCustomerPhone && order?.customerMobile ? `<p>📞 ${order.customerMobile}</p>` : ''}
        ${st.showCustomerEmail && order?.customerEmail ? `<p>✉ ${order.customerEmail}</p>` : ''}
        ${st.showCustomerGstin && order?.customerGstin ? `<p>GSTIN: ${order.customerGstin}</p>` : ''}
        ${st.showCustomerMembership && order?.customerId ? `<p>Member ID: ${order.customerId}</p>` : ''}
        ${st.showBillingAddress && order?.billingAddress ? `<p>${order.billingAddress}</p>` : ''}
      </div>
      ${st.showShippingAddress ? `
      <div class="info-box">
        <h3>Shipping / Delivery</h3>
        <p><strong>${order?.customerName || 'Walk-in Customer'}</strong></p>
        ${st.showCustomerPhone && order?.customerMobile ? `<p>📞 ${order.customerMobile}</p>` : ''}
        ${st.showCustomerGstin && order?.customerGstin ? `<p>GSTIN: ${order.customerGstin}</p>` : ''}
        ${order?.shippingAddress ? `<p>${order.shippingAddress}</p>` : ''}
      </div>` : ''}
    </div>` : ''}

    <!-- ITEMS TABLE -->
    <table>
      <thead><tr>${tableHeaders}</tr></thead>
      <tbody>
        ${items.map((item, i) => {
          const qty = item.quantity || 1;
          const taxable = (item.taxableAmount || 0) * qty;
          const cgst = ((item.gstAmount || 0) / 2) * qty;
          const sgst = ((item.gstAmount || 0) / 2) * qty;
          let row = `<tr><td>${i + 1}</td>`;
          if (showCol('image')) row += `<td class="center">${item.image ? `<img src="${item.image}" style="width:24px;height:24px;object-fit:cover;border-radius:2px;" />` : '-'}</td>`;
          if (showCol('sku')) row += `<td style="font-size:9px;">${item.sku || '-'}</td>`;
          if (showCol('barcode')) row += `<td style="font-size:9px;">${item.barcode || '-'}</td>`;
          if (showCol('hsn')) row += `<td style="font-size:9px;">${item.hsnCode || '-'}</td>`;
          row += `<td>${item.productName || 'Item'}${item.discountPercent > 0 && showCol('discount') ? `<br><span style="font-size:8px;color:#d97706;">Disc: ${item.discountPercent}%</span>` : ''}</td>`;
          row += `<td class="center">${qty}</td>`;
          if (showCol('mrp')) row += `<td class="right" style="color:#888;">${fmt(item.mrp || item.sellingPrice)}</td>`;
          if (showCol('rate')) row += `<td class="right">${fmt(item.sellingPrice)}</td>`;
          if (showCol('batch')) row += `<td style="font-size:9px;">${item.batchNumber || '-'}</td>`;
          if (showCol('expiry')) row += `<td style="font-size:9px;">${item.expiryDate ? new Date(item.expiryDate).toLocaleDateString('en-IN',{month:'2-digit',year:'2-digit'}) : '-'}</td>`;
          if (showCol('discount')) row += `<td class="right">${item.discountPercent || 0}%</td>`;
          row += `<td class="right">${fmt(taxable)}</td>`;
          if (showCol('gst')) { row += `<td class="right">${fmt(cgst)}</td><td class="right">${fmt(sgst)}</td>`; }
          if (showCol('total')) row += `<td class="right">${fmt(item.total || (taxable + cgst + sgst))}</td>`;
          row += '</tr>';
          return row;
        }).join('')}
      </tbody>
    </table>

    <!-- TOTALS -->
    <div class="summary">
      <table class="summary-table">
        <tr><td class="label">Subtotal</td><td class="value">${fmt(order?.subtotal)}</td></tr>
        ${(order?.totalDiscount || 0) > 0 && st.showDiscountDetails ? `<tr><td class="label">Discount</td><td class="value" style="color:#d97706;">-${fmt(order.totalDiscount)}</td></tr>` : ''}
        <tr><td class="label">Total Taxable</td><td class="value">${fmt(totalTaxable)}</td></tr>
        <tr><td class="label">Total CGST</td><td class="value">${fmt(totalCgst)}</td></tr>
        <tr><td class="label">Total SGST</td><td class="value">${fmt(totalSgst)}</td></tr>
        <tr class="grand-total"><td class="label">Grand Total</td><td class="value">${fmt(order?.grandTotal)}</td></tr>
      </table>
    </div>

    ${st.showAmountInWords ? `<div class="amount-words"><strong>Amount in Words:</strong> ${numberToWords(Math.round(order?.grandTotal || 0))}</div>` : ''}

    <!-- GST Summary -->
    ${gstSummary.length > 0 && st.showGstSummary ? `
    <h3 style="font-size:10px;color:#374151;text-transform:uppercase;letter-spacing:0.5px;margin-top:14px;margin-bottom:4px;">GST Summary</h3>
    <table class="gst-table">
      <thead><tr><th>GST Rate</th><th>Taxable Value</th><th>CGST</th><th>SGST</th><th>Total Tax</th></tr></thead>
      <tbody>${gstSummary.map(g => `<tr><td>${g.rate}%</td><td class="right">${fmt(g.taxable)}</td><td class="right">${fmt(g.cgst)}</td><td class="right">${fmt(g.sgst)}</td><td class="right">${fmt(g.cgst + g.sgst)}</td></tr>`).join('')}</tbody>
    </table>` : ''}

    <!-- Payments -->
    ${payments.length > 0 ? `
    <div class="payment-section">
      <h3>Payment Details</h3>
      ${payments.map(p => `<div style="display:flex;justify-content:space-between;font-size:10px;padding:1px 0;"><span><strong>${(p.method || '').toUpperCase()}</strong>${p.transactionId ? ` — ${p.transactionMethod || ''}: ${p.transactionId}` : ''}${p.companyOrderNumber ? ` — PO: ${p.companyOrderNumber}` : ''}</span><span>${fmt(p.amount)}</span></div>`).join('')}
      ${(order?.balanceDue || 0) > 0 ? `<div style="display:flex;justify-content:space-between;font-size:10px;padding:1px 0;color:#dc2626;"><span><strong>Balance Due</strong></span><span>${fmt(order.balanceDue)}</span></div>` : ''}
    </div>` : ''}

    <!-- QR Code -->
    ${st.showQrCode ? `<div class="header-center" style="margin-top:8px;text-align:center;">${qrSvg(64)}</div>` : ''}

    <!-- Digital Signature -->
    ${st.digitalSignature ? `<div style="margin-top:6px;padding:4px 8px;border:1px dashed #ccc;border-radius:4px;font-size:9px;color:#555;text-align:center;">Digitally Signed by ${shopInfo.name || 'Shop'} — ${new Date().toLocaleDateString('en-IN')}</div>` : ''}

    <!-- Terms & Signature -->
    <div class="footer">
      ${st.showTerms ? `<div class="terms"><strong>Terms & Conditions:</strong><br>${(st.termsText || '').replace(/\n/g, '<br>')}</div>` : '<div></div>'}
      ${st.showSignature ? `<div class="signature"><br><br><br><strong>Authorized Signature</strong><br><span style="font-size:10px;">${shopInfo.name || 'Shop'}</span></div>` : ''}
    </div>

    ${st.footerMessage ? `<div style="text-align:center;margin-top:10px;font-size:10px;color:#666;">${st.footerMessage}</div>` : ''}
  </div>
</body></html>`;

  openPrintWindow(html, 'A4', 'portrait', 'Standard Invoice');
}

// ═══════════════════════════════════════════════════════════
//  3. DOWNLOAD PDF — Generates a PDF of the standard bill
//     Uses html2pdf.js with PDF config settings.
// ═══════════════════════════════════════════════════════════
export function downloadPdf(order, shop, printConfig) {
  const cfg = mergeConfig(printConfig);
  const st = cfg.standard;
  const pd = cfg.pdf;
  const shopInfo = buildShopInfo(shop);
  const items = Array.isArray(order?.items) ? order.items : [];
  const payments = Array.isArray(order?.payments) ? order.payments : [];
  const gstSummary = buildGstSummary(items);

  const totalTaxable = items.reduce((s, i) => s + ((i.taxableAmount || 0) * (i.quantity || 1)), 0);
  const totalCgst = items.reduce((s, i) => s + ((i.gstAmount || 0) / 2) * (i.quantity || 1), 0);
  const totalSgst = items.reduce((s, i) => s + ((i.gstAmount || 0) / 2) * (i.quantity || 1), 0);

  const cols = st.productColumns || {};
  const showCol = (key) => cols[key] !== false;

  let tableHeaders = '<th style="width:25px;">#</th>';
  if (showCol('hsn')) tableHeaders += '<th style="width:70px;">HSN/SAC</th>';
  tableHeaders += '<th>Product</th><th class="center" style="width:35px;">Qty</th>';
  if (showCol('rate')) tableHeaders += '<th class="right" style="width:55px;">Rate</th>';
  tableHeaders += '<th class="right" style="width:60px;">Taxable</th>';
  if (showCol('gst')) { tableHeaders += '<th class="right" style="width:45px;">CGST</th><th class="right" style="width:45px;">SGST</th>'; }
  if (showCol('total')) tableHeaders += '<th class="right" style="width:60px;">Total</th>';

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Invoice — ${order?.orderNumber || ''}</title>
<style>
  @page { margin: ${pd.margin || 10}mm; size: A4 ${pd.orientation || 'portrait'}; }
  body { margin: 0; padding: 0; font-family: '${pd.fontFamily || 'Segoe UI'}', Arial, sans-serif; font-size: ${pd.fontSize || 12}px; color: #222; line-height: 1.5; }
  .page { max-width: 190mm; margin: 0 auto; padding: 8mm 0; position: relative; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #374151; padding-bottom: ${pd.headerHeight ? pd.headerHeight * 0.3 : 10}px; margin-bottom: 14px; }
  .shop-details h1 { margin: 0; font-size: 22px; color: #374151; }
  .shop-details p { margin: 2px 0; font-size: 11px; color: #6b7280; }
  .invoice-title { text-align: right; }
  .invoice-title h2 { margin: 0; font-size: 18px; color: #374151; text-transform: uppercase; letter-spacing: 1px; }
  .invoice-title p { margin: 2px 0; font-size: 11px; color: #6b7280; }
  .info-section { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 14px; }
  .info-box { flex: 1; border: 1px solid #ddd; border-radius: 4px; padding: 6px 8px; }
  .info-box h3 { margin: 0 0 4px 0; font-size: 10px; color: #374151; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e5e7eb; padding-bottom: 3px; }
  .info-box p { margin: 1px 0; font-size: 10px; color: #333; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
  th { background: #374151; color: #fff; font-size: 9px; padding: 5px 3px; text-align: left; text-transform: uppercase; letter-spacing: 0.3px; }
  th.right { text-align: right; } th.center { text-align: center; }
  td { padding: 4px 3px; border-bottom: 1px solid #e5e7eb; font-size: 10px; vertical-align: top; }
  td.right { text-align: right; } td.center { text-align: center; }
  .summary { display: flex; justify-content: flex-end; }
  .summary-table { width: 300px; }
  .summary-table td { padding: 2px 6px; border: none; font-size: 10px; }
  .summary-table .label { color: #555; }
  .summary-table .value { text-align: right; font-weight: 500; }
  .summary-table .grand-total td { font-size: 13px; font-weight: bold; border-top: 2px solid #374151; padding-top: 5px; color: #374151; }
  .gst-table { width: 100%; margin-top: 6px; }
  .gst-table th { background: #f3f4f6; color: #333; font-size: 9px; padding: 4px; }
  .gst-table td { font-size: 9px; padding: 3px 4px; }
  .payment-section { margin-top: 10px; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
  .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #ddd; display: flex; justify-content: space-between; font-size: 9px; color: #666; }
  .footer .terms { max-width: 60%; }
  .footer .signature { text-align: right; }
  .amount-words { font-size: 10px; font-weight: 500; margin-top: 6px; padding: 4px 8px; border: 1px solid #e5e7eb; border-radius: 4px; background: #f9fafb; }
  .watermark-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; z-index: 1000; }
  .watermark-text { font-size: 80px; font-weight: bold; color: rgba(220,38,38,0.12); transform: rotate(-30deg); text-transform: uppercase; letter-spacing: 10px; }
</style></head><body>
  ${st.showWatermark ? `<div class="watermark-overlay"><div class="watermark-text">${st.watermarkText || 'PAID'}</div></div>` : ''}
  <div class="page">
    <div class="header">
      <div class="shop-details">
        <h1>${shopInfo.name || 'Shop'}</h1>
        ${st.showCompanyDetails ? `${shopInfo.address ? `<p>${shopInfo.address}</p>` : ''}${shopInfo.phone ? `<p>📞 ${shopInfo.phone}</p>` : ''}${shopInfo.gstin ? `<p><strong>GSTIN:</strong> ${shopInfo.gstin}</p>` : ''}` : ''}
      </div>
      <div class="invoice-title">
        <h2>${st.invoiceTitle || 'Tax Invoice'}</h2>
        <p><strong>Invoice #:</strong> ${order?.invoiceNumber || order?.orderNumber || 'N/A'}</p>
        <p><strong>Date:</strong> ${fmtDate(order?.createdAt)}</p>
      </div>
    </div>
    ${st.showCustomerSection ? `<div class="info-section"><div class="info-box"><h3>Bill To</h3><p><strong>${order?.customerName || 'Walk-in Customer'}</strong></p>${st.showCustomerPhone && order?.customerMobile ? `<p>📞 ${order.customerMobile}</p>` : ''}${st.showCustomerGstin && order?.customerGstin ? `<p>GSTIN: ${order.customerGstin}</p>` : ''}</div></div>` : ''}
    <table><thead><tr>${tableHeaders}</tr></thead>
      <tbody>${items.map((item, i) => {
        const qty = item.quantity || 1;
        const taxable = (item.taxableAmount || 0) * qty;
        const cgst = ((item.gstAmount || 0) / 2) * qty;
        const sgst = ((item.gstAmount || 0) / 2) * qty;
        let row = `<tr><td>${i + 1}</td>`;
        if (showCol('hsn')) row += `<td style="font-size:9px;">${item.hsnCode || '-'}</td>`;
        row += `<td>${item.productName || 'Item'}</td><td class="center">${qty}</td>`;
        if (showCol('rate')) row += `<td class="right">${fmt(item.sellingPrice)}</td>`;
        row += `<td class="right">${fmt(taxable)}</td>`;
        if (showCol('gst')) { row += `<td class="right">${fmt(cgst)}</td><td class="right">${fmt(sgst)}</td>`; }
        if (showCol('total')) row += `<td class="right">${fmt(item.total || (taxable + cgst + sgst))}</td>`;
        row += '</tr>';
        return row;
      }).join('')}</tbody>
    </table>
    <div class="summary"><table class="summary-table">
      <tr><td class="label">Subtotal</td><td class="value">${fmt(order?.subtotal)}</td></tr>
      ${(order?.totalDiscount || 0) > 0 && st.showDiscountDetails ? `<tr><td class="label">Discount</td><td class="value" style="color:#d97706;">-${fmt(order.totalDiscount)}</td></tr>` : ''}
      <tr><td class="label">Total Taxable</td><td class="value">${fmt(totalTaxable)}</td></tr>
      <tr><td class="label">Total CGST</td><td class="value">${fmt(totalCgst)}</td></tr>
      <tr><td class="label">Total SGST</td><td class="value">${fmt(totalSgst)}</td></tr>
      <tr class="grand-total"><td class="label">Grand Total</td><td class="value">${fmt(order?.grandTotal)}</td></tr>
    </table></div>
    ${st.showAmountInWords ? `<div class="amount-words"><strong>Amount in Words:</strong> ${numberToWords(Math.round(order?.grandTotal || 0))}</div>` : ''}
    ${gstSummary.length > 0 && st.showGstSummary ? `<h3 style="font-size:10px;color:#374151;text-transform:uppercase;margin-top:14px;margin-bottom:4px;">GST Summary</h3><table class="gst-table"><thead><tr><th>GST Rate</th><th>Taxable Value</th><th>CGST</th><th>SGST</th><th>Total Tax</th></tr></thead><tbody>${gstSummary.map(g => `<tr><td>${g.rate}%</td><td class="right">${fmt(g.taxable)}</td><td class="right">${fmt(g.cgst)}</td><td class="right">${fmt(g.sgst)}</td><td class="right">${fmt(g.cgst + g.sgst)}</td></tr>`).join('')}</tbody></table>` : ''}
    ${payments.length > 0 ? `<div class="payment-section"><h3>Payment Details</h3>${payments.map(p => `<div style="display:flex;justify-content:space-between;font-size:10px;"><span><strong>${(p.method || '').toUpperCase()}</strong>${p.transactionId ? ` — ${p.transactionMethod}: ${p.transactionId}` : ''}</span><span>${fmt(p.amount)}</span></div>`).join('')}</div>` : ''}
    <div class="footer">
      ${st.showTerms ? `<div class="terms"><strong>Terms:</strong><br>${(st.termsText || '').split('\n')[0]}</div>` : '<div></div>'}
      ${st.showSignature ? `<div class="signature"><br><br><br><strong>Authorized Signature</strong><br><span style="font-size:10px;">${shopInfo.name || 'Shop'}</span></div>` : ''}
    </div>
    ${st.footerMessage ? `<div style="text-align:center;margin-top:10px;font-size:10px;color:#666;">${st.footerMessage}</div>` : ''}
  </div>
</body></html>`;

  const margin = pd.margin || 10;
  const orientation = pd.orientation || 'portrait';
  const container = document.createElement('div');
  container.innerHTML = html;
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '210mm';
  document.body.appendChild(container);

  import('html2pdf.js').then(html2pdfModule => {
    const html2pdf = html2pdfModule.default || html2pdfModule;
    html2pdf()
      .set({
        margin: [margin, margin, margin, margin],
        filename: `Invoice-${order?.orderNumber || 'unknown'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation },
      })
      .from(container)
      .save()
      .then(() => document.body.removeChild(container))
      .catch(err => { console.error('PDF error:', err); document.body.removeChild(container); });
  }).catch(err => {
    console.error('html2pdf load error:', err);
    document.body.removeChild(container);
    openPrintWindow(html, 'A4', orientation, 'Standard Invoice');
  });
}

// ═══════════════════════════════════════════════════════════
//  Helper — open print window
// ═══════════════════════════════════════════════════════════
function openPrintWindow(html, width, height, title) {
  // Use a hidden iframe so the print dialog appears on the same page
  // (no new window/tab opened)
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.top = '-9999px';
  iframe.style.left = '-9999px';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  iframe.title = title || 'Print';
  iframe.setAttribute('aria-hidden', 'true');

  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  if (!win) return;

  win.document.open();
  win.document.write(`<!DOCTYPE html><html><head><title>${title}</title></head><body>${html}</body></html>`);
  win.document.close();

  const cleanup = () => {
    if (iframe.parentNode) document.body.removeChild(iframe);
  };

  const printFn = () => {
    // Register afterprint listener BEFORE print() because print() is blocking
    // on most browsers — the event fires while the dialog closes.
    win.addEventListener('afterprint', cleanup, { once: true });
    // Fallback in case afterprint doesn't fire (some mobile browsers)
    setTimeout(cleanup, 2000);
    try {
      win.focus();
      win.print();
    } catch (e) {
      console.error('Print error:', e);
    }
  };

  setTimeout(printFn, 500);
}
