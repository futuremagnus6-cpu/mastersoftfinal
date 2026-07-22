/**
 * Print Utilities — Thermal Receipt & Standard A4 Bill
 * ─────────────────────────────────────────────────────
 */

/**
 * Default printer settings — used when no custom config is passed.
 */
const DEFAULT_PRINT_CONFIG = {
  thermal: {
    paperWidth: '80mm',
    showGstin: true,
    showCustomer: true,
    showPayments: true,
    showDiscount: true,
    footerMessage: 'Thank you for your purchase!',
  },
  standard: {
    invoiceTitle: 'Tax Invoice',
    showTerms: true,
    termsText: '1. Goods once sold will not be taken back.\n2. This is a computer-generated invoice.\n3. Subject to local jurisdiction.',
    showSignature: true,
    showGstSummary: true,
    showAmountInWords: true,
    showDiscountDetails: true,
    footerMessage: '',
  },
};

/**
 * Build a minimal shop-info object from the Redux store or API response.
 * Falls back to defaults when fields are missing.
 */
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

// ─── Helper: format ₹ ───
const fmt = (n) => `₹${(n || 0).toFixed(2)}`;

// ─── Helper: safe date ───
const fmtDate = (d) => d ? new Date(d).toLocaleString('en-IN') : '';

// ─── Helper: amount in words (Indian numbering) ───
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

// ─── Build GST summary from items ───
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

// ─── Merge user config with defaults ───
function mergeConfig(userConfig) {
  if (!userConfig) return { ...DEFAULT_PRINT_CONFIG };
  return {
    thermal: { ...DEFAULT_PRINT_CONFIG.thermal, ...(userConfig.thermal || {}) },
    standard: { ...DEFAULT_PRINT_CONFIG.standard, ...(userConfig.standard || {}) },
  };
}

// ═══════════════════════════════════════════════════════════
//  1. THERMAL PRINT — compact receipt for thermal printers
//     Accepts optional `printConfig` to customize output.
// ═══════════════════════════════════════════════════════════
export function thermalPrint(order, shop, printConfig) {
  const cfg = mergeConfig(printConfig);
  const shopInfo = buildShopInfo(shop);
  const items = Array.isArray(order?.items) ? order.items : [];
  const payments = Array.isArray(order?.payments) ? order.payments : [];
  const gstSummary = buildGstSummary(items);

  // Compute paper width in CSS — strip 'mm' suffix
  const paperWidth = cfg.thermal.paperWidth || '80mm';
  const paperWidthNum = parseInt(paperWidth, 10);
  const bodyWidth = Math.max(58, paperWidthNum - 8); // content width = paper - margin

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt — ${order?.orderNumber || ''}</title>
  <style>
    @page { margin: 0; size: ${paperWidth} auto; }
    body {
      margin: 0; padding: 4px 4px;
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      line-height: 1.4;
      color: #000;
      width: ${bodyWidth}mm;
      max-width: ${bodyWidth}mm;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .line { border-top: 1px dashed #333; margin: 6px 0; }
    .thick-line { border-top: 2px solid #333; margin: 6px 0; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 1px 0; vertical-align: top; font-size: 10px; }
    .ttl { text-align: right; }
    .item-name { font-size: 11px; }
    .total-row td { padding-top: 3px; font-weight: bold; }
    .footer { margin-top: 6px; text-align: center; font-size: 10px; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="center">
    <div class="bold" style="font-size: 14px;">${shopInfo.name || 'Shop'}</div>
    ${shopInfo.address ? `<div style="font-size: 10px;">${shopInfo.address}</div>` : ''}
    ${shopInfo.gstin && cfg.thermal.showGstin ? `<div style="font-size: 10px;">GSTIN: ${shopInfo.gstin}</div>` : ''}
    ${shopInfo.phone ? `<div style="font-size: 10px;">${shopInfo.phone}</div>` : ''}
  </div>

  <div class="line"></div>

  <div class="center bold" style="font-size: 12px;">SALE RECEIPT</div>
  <div class="center" style="font-size: 10px;">
    ${order?.orderNumber || 'N/A'}<br>
    ${fmtDate(order?.createdAt)}
  </div>

  ${order?.customerName && cfg.thermal.showCustomer ? `
  <div class="line"></div>
  <div style="font-size: 10px;">
    Customer: ${order.customerName}${order.customerMobile ? ' — ' + order.customerMobile : ''}
    ${order.customerGstin ? '<br>GST: ' + order.customerGstin : ''}
  </div>` : ''}

  <div class="line"></div>

  <table>
    <tr style="font-weight: bold;">
      <td style="width: 50%;">Item</td>
      <td style="width: 20%; text-align: center;">Qty</td>
      <td style="width: 30%; text-align: right;">Amount</td>
    </tr>
    ${items.map(item => `
    <tr>
      <td class="item-name">${item.productName || 'Item'}</td>
      <td style="text-align: center;">${item.quantity || 0}</td>
      <td class="ttl">${fmt(item.total)}</td>
    </tr>
    ${item.hsnCode ? `<tr><td colspan="3" style="font-size: 9px; color: #555;">HSN: ${item.hsnCode} | ${item.gstRate || 0}% GST</td></tr>` : ''}
    `).join('')}
  </table>

  <div class="thick-line"></div>

  <table>
    <tr><td>Subtotal</td><td class="ttl">${fmt(order?.subtotal)}</td></tr>
    ${(order?.totalDiscount || 0) > 0 && cfg.thermal.showDiscount ? `<tr><td>Discount</td><td class="ttl">-${fmt(order.totalDiscount)}</td></tr>` : ''}
    ${gstSummary.map(g => `
    <tr>
      <td style="font-size: 9px;">GST @ ${g.rate}%</td>
      <td class="ttl" style="font-size: 9px;">
        CGST: ${fmt(g.cgst)} | SGST: ${fmt(g.sgst)}
      </td>
    </tr>`).join('')}
    <tr class="total-row"><td style="font-size: 14px;">TOTAL</td><td class="ttl" style="font-size: 14px;">${fmt(order?.grandTotal)}</td></tr>
  </table>

  <div class="line"></div>

  ${payments.length > 0 && cfg.thermal.showPayments ? `
  <div style="font-size: 10px; font-weight: bold;">Payments</div>
  ${payments.map(p => `<div style="font-size: 10px; display: flex; justify-content: space-between;"><span>${(p.method || '').toUpperCase()}</span><span>${fmt(p.amount)}</span></div>`).join('')}
  <div class="line"></div>` : ''}

  ${(order?.balanceDue || 0) > 0 ? `<div style="font-size: 10px;">Balance Due: ${fmt(order.balanceDue)}</div>` : ''}

  <div class="footer">
    ${cfg.thermal.footerMessage ? `${cfg.thermal.footerMessage}<br>` : ''}
    Future Magnus Business OS
  </div>
</body>
</html>`;

  openPrintWindow(html, paperWidth, 'auto', 'Thermal Receipt');
}

// ═══════════════════════════════════════════════════════════
//  2. STANDARD BILL — A4 professional tax invoice
//     Accepts optional `printConfig` to customize output.
// ═══════════════════════════════════════════════════════════
export function standardBillPrint(order, shop, printConfig) {
  const cfg = mergeConfig(printConfig);
  const shopInfo = buildShopInfo(shop);
  const items = Array.isArray(order?.items) ? order.items : [];
  const payments = Array.isArray(order?.payments) ? order.payments : [];
  const gstSummary = buildGstSummary(items);

  // Calculate column totals
  const totalTaxable = items.reduce((s, i) => s + ((i.taxableAmount || 0) * (i.quantity || 1)), 0);
  const totalCgst = items.reduce((s, i) => s + ((i.gstAmount || 0) / 2) * (i.quantity || 1), 0);
  const totalSgst = items.reduce((s, i) => s + ((i.gstAmount || 0) / 2) * (i.quantity || 1), 0);

  const showTerms = cfg.standard.showTerms !== false;
  const showSignature = cfg.standard.showSignature !== false;
  const showGstSummary = cfg.standard.showGstSummary !== false;
  const showAmountInWords = cfg.standard.showAmountInWords !== false;
  const showDiscountDetails = cfg.standard.showDiscountDetails !== false;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice — ${order?.orderNumber || ''}</title>
  <style>
    @page { margin: 15mm; size: A4; }
    body {
      margin: 0; padding: 0;
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 12px;
      color: #222;
      line-height: 1.5;
    }
    .page { max-width: 190mm; margin: 0 auto; padding: 10mm 0; }

    /* Header */
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #374151; padding-bottom: 12px; margin-bottom: 16px; }
    .shop-details h1 { margin: 0; font-size: 24px; color: #374151; }
    .shop-details p { margin: 2px 0; font-size: 11px; color: #6b7280; }
    .invoice-title { text-align: right; }
    .invoice-title .store-label { margin: 0; font-size: 13px; font-weight: 600; color: #374151; }
    .invoice-title h2 { margin: 0; font-size: 20px; color: #374151; text-transform: uppercase; letter-spacing: 1px; }
    .invoice-title p { margin: 2px 0; font-size: 11px; color: #6b7280; }

    /* Info sections */
    .info-section { display: flex; justify-content: space-between; gap: 20px; margin-bottom: 16px; }
    .info-box { flex: 1; border: 1px solid #ddd; border-radius: 4px; padding: 8px 10px; }
    .info-box h3 { margin: 0 0 6px 0; font-size: 11px; color: #374151; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
    .info-box p { margin: 2px 0; font-size: 11px; color: #333; }

    /* Table */
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    th { background: #374151; color: #fff; font-size: 10px; padding: 7px 5px; text-align: left; text-transform: uppercase; letter-spacing: 0.5px; }
    th.right { text-align: right; }
    th.center { text-align: center; }
    td { padding: 6px 5px; border-bottom: 1px solid #e5e7eb; font-size: 11px; vertical-align: top; }
    td.right { text-align: right; }
    td.center { text-align: center; }

    /* Summary */
    .summary { display: flex; justify-content: flex-end; }
    .summary-table { width: 320px; }
    .summary-table td { padding: 3px 8px; border: none; font-size: 11px; }
    .summary-table .label { color: #555; }
    .summary-table .value { text-align: right; font-weight: 500; }
    .summary-table .grand-total td { font-size: 14px; font-weight: bold; border-top: 2px solid #374151; padding-top: 6px; color: #374151; }

    /* GST Breakup */
    .gst-table { width: 100%; margin-top: 8px; }
    .gst-table th { background: #f3f4f6; color: #333; font-size: 10px; padding: 5px; border-bottom: 1px solid #ddd; }
    .gst-table td { font-size: 10px; padding: 4px 5px; }

    /* Payment */
    .payment-section { margin-top: 12px; padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
    .payment-section h3 { margin: 0 0 6px 0; font-size: 11px; color: #374151; text-transform: uppercase; letter-spacing: 0.5px; }

    /* Footer */
    .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #ddd; display: flex; justify-content: space-between; font-size: 10px; color: #666; }
    .footer .terms { max-width: 60%; }
    .footer .signature { text-align: right; }
    .amount-words { font-size: 11px; color: #374151; font-weight: 500; margin-top: 8px; padding: 6px 10px; border: 1px solid #e5e7eb; border-radius: 4px; background: #f9fafb; }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="page">

    <!-- HEADER -->
    <div class="header">
      <div class="shop-details">
        <h1>${shopInfo.name || 'Shop'}</h1>
        ${shopInfo.address ? `<p>${shopInfo.address}</p>` : ''}
        ${shopInfo.phone ? `<p>📞 ${shopInfo.phone}</p>` : ''}
        ${shopInfo.email ? `<p>✉ ${shopInfo.email}</p>` : ''}
        ${shopInfo.gstin ? `<p><strong>GSTIN:</strong> ${shopInfo.gstin}</p>` : ''}
      </div>
      <div class="invoice-title">
        <div class="store-label">${shopInfo.name || 'Shop'}</div>
        <h2>${cfg.standard.invoiceTitle || 'Tax Invoice'}</h2>
        <p><strong>Invoice #:</strong> ${order?.invoiceNumber || order?.orderNumber || 'N/A'}</p>
        <p><strong>Order #:</strong> ${order?.orderNumber || 'N/A'}</p>
        <p><strong>Date:</strong> ${fmtDate(order?.createdAt)}</p>
      </div>
    </div>

    <!-- BUYER / SHIP TO -->
    <div class="info-section">
      <div class="info-box">
        <h3>Bill To</h3>
        <p><strong>${order?.customerName || 'Walk-in Customer'}</strong></p>
        ${order?.customerMobile ? `<p>📞 ${order.customerMobile}</p>` : ''}
        ${order?.customerGstin ? `<p>GSTIN: ${order.customerGstin}</p>` : ''}
        ${order?.customerId ? `<p>Customer ID: ${order.customerId}</p>` : ''}
      </div>
      <div class="info-box">
        <h3>Shipping / Delivery</h3>
        <p><strong>${order?.customerName || 'Walk-in Customer'}</strong></p>
        ${order?.customerMobile ? `<p>📞 ${order.customerMobile}</p>` : ''}
        ${order?.customerGstin ? `<p>GSTIN: ${order.customerGstin}</p>` : ''}
      </div>
    </div>

    <!-- ITEMS TABLE -->
    <table>
      <thead>
        <tr>
          <th style="width: 30px;">#</th>
          <th style="width: 80px;">HSN/SAC</th>
          <th>Product / Service</th>
          <th class="center" style="width: 40px;">Qty</th>
          <th class="right" style="width: 70px;">Rate</th>
          <th class="right" style="width: 70px;">Taxable</th>
          <th class="right" style="width: 60px;">CGST</th>
          <th class="right" style="width: 60px;">SGST</th>
          <th class="right" style="width: 80px;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((item, i) => {
          const qty = item.quantity || 1;
          const taxable = (item.taxableAmount || 0) * qty;
          const cgst = ((item.gstAmount || 0) / 2) * qty;
          const sgst = ((item.gstAmount || 0) / 2) * qty;
          return `
        <tr>
          <td>${i + 1}</td>
          <td style="font-size: 10px;">${item.hsnCode || '-'}</td>
          <td>
            ${item.productName || 'Item'}
            ${item.discountPercent > 0 && showDiscountDetails ? `<br><span style="font-size:10px;color:#d97706;">Discount: ${item.discountPercent}%</span>` : ''}
          </td>
          <td class="center">${qty}</td>
          <td class="right">${fmt(item.sellingPrice)}</td>
          <td class="right">${fmt(taxable)}</td>
          <td class="right">${fmt(cgst)}</td>
          <td class="right">${fmt(sgst)}</td>
          <td class="right">${fmt(item.total || (taxable + cgst + sgst))}</td>
        </tr>`;
        }).join('')}
      </tbody>
    </table>

    <!-- TOTALS -->
    <div class="summary">
      <table class="summary-table">
        <tr><td class="label">Subtotal</td><td class="value">${fmt(order?.subtotal)}</td></tr>
        ${(order?.totalDiscount || 0) > 0 && showDiscountDetails ? `<tr><td class="label">Discount</td><td class="value" style="color:#d97706;">-${fmt(order.totalDiscount)}</td></tr>` : ''}
        <tr><td class="label">Total Taxable</td><td class="value">${fmt(totalTaxable)}</td></tr>
        <tr><td class="label">Total CGST</td><td class="value">${fmt(totalCgst)}</td></tr>
        <tr><td class="label">Total SGST</td><td class="value">${fmt(totalSgst)}</td></tr>
        ${(order?.totalCgst || 0) !== totalCgst ? `<tr><td class="label">CGST (from order)</td><td class="value">${fmt(order?.totalCgst)}</td></tr><tr><td class="label">SGST (from order)</td><td class="value">${fmt(order?.totalSgst)}</td></tr>` : ''}
        <tr class="grand-total"><td class="label">Grand Total</td><td class="value">${fmt(order?.grandTotal)}</td></tr>
      </table>
    </div>

    <!-- Amount in Words -->
    ${showAmountInWords ? `
    <div class="amount-words">
      <strong>Amount in Words:</strong> ${numberToWords(Math.round(order?.grandTotal || 0))}
    </div>` : ''}

    <!-- GST Breakup Summary -->
    ${gstSummary.length > 0 && showGstSummary ? `
    <h3 style="font-size: 11px; color: #374151; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 16px; margin-bottom: 6px;">GST Summary</h3>
    <table class="gst-table">
      <thead>
        <tr><th>GST Rate</th><th>Taxable Value</th><th>CGST</th><th>SGST</th><th>Total Tax</th></tr>
      </thead>
      <tbody>
        ${gstSummary.map(g => `
        <tr>
          <td>${g.rate}%</td>
          <td class="right">${fmt(g.taxable)}</td>
          <td class="right">${fmt(g.cgst)}</td>
          <td class="right">${fmt(g.sgst)}</td>
          <td class="right">${fmt(g.cgst + g.sgst)}</td>
        </tr>`).join('')}
      </tbody>
    </table>` : ''}

    <!-- Payments -->
    ${payments.length > 0 ? `
    <div class="payment-section">
      <h3>Payment Details</h3>
      ${payments.map(p => `
      <div style="display: flex; justify-content: space-between; font-size: 11px; padding: 2px 0;">
        <span><strong>${(p.method || '').toUpperCase()}</strong>
          ${p.transactionId ? ` — ${p.transactionMethod || ''}: ${p.transactionId}` : ''}
          ${p.companyOrderNumber ? ` — PO: ${p.companyOrderNumber}` : ''}
        </span>
        <span>${fmt(p.amount)}</span>
      </div>`).join('')}
      ${(order?.balanceDue || 0) > 0 ? `<div style="display: flex; justify-content: space-between; font-size: 11px; padding: 2px 0; color: #dc2626;"><span><strong>Balance Due</strong></span><span>${fmt(order.balanceDue)}</span></div>` : ''}
    </div>` : ''}

    <!-- Terms & Signature -->
    <div class="footer">
      ${showTerms ? `
      <div class="terms">
        <strong>Terms & Conditions:</strong><br>
        ${(cfg.standard.termsText || '').replace(/\n/g, '<br>')}
      </div>` : '<div></div>'}
      ${showSignature ? `
      <div class="signature">
        <br><br><br>
        <strong>Authorized Signature</strong><br>
        <span style="font-size: 11px;">${shopInfo.name || 'Shop'}</span>
      </div>` : ''}
    </div>

    ${cfg.standard.footerMessage ? `<div style="text-align: center; margin-top: 12px; font-size: 11px; color: #666;">${cfg.standard.footerMessage}</div>` : ''}

  </div>
</body>
</html>`;

  openPrintWindow(html, 'A4', 'portrait', 'Standard Invoice');
}

// ═══════════════════════════════════════════════════════════
//  Helper — open print window
// ═══════════════════════════════════════════════════════════
function openPrintWindow(html, width, height, title) {
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
    </head>
    <body>${html}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => { printWindow.print(); }, 500);
}
