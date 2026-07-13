/**
 * GST-Compliant Invoice Generator
 * Generates professional PDF invoices with business branding and full GST compliance.
 */

const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

const INVOICE_DIR = path.join(__dirname, '..', '..', 'uploads', 'invoices');
if (!fs.existsSync(INVOICE_DIR)) {
  fs.mkdirSync(INVOICE_DIR, { recursive: true });
}

/**
 * Generate a GST-compliant invoice PDF
 * @param {Object} data - Invoice data
 * @param {Object} data.shop - Shop/business details
 * @param {Object} data.order - Order details
 * @param {Object} data.customer - Customer details
 * @returns {Promise<Object>} Generated invoice info
 */
async function generateInvoice(data) {
  const { shop, order, customer = {} } = data;
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const fileName = `invoice-${order.orderNumber || order.invoiceNumber}-${Date.now()}.pdf`;
  const filePath = path.join(INVOICE_DIR, fileName);
  const stream = fs.createWriteStream(filePath);

  doc.pipe(stream);

  const pageWidth = doc.page.width - 80; // A4 width minus margins
  const rightMargin = 40;
  const topMargin = 40;

  // ─── Header ───
  // Business name
  doc.fontSize(22).font('Helvetica-Bold').fillColor('#1a1a2e')
    .text(shop.name || 'Business Name', rightMargin, topMargin, { width: pageWidth / 2 });

  // Invoice type label
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#e94560')
    .text(order.gstInvoiceType === 'b2b' ? 'TAX INVOICE (B2B)' : 'TAX INVOICE (B2C)', rightMargin, topMargin + 30, { align: 'right' });

  // Horizontal line
  doc.moveTo(rightMargin, topMargin + 55).lineTo(pageWidth + rightMargin, topMargin + 55)
    .strokeColor('#e94560').lineWidth(1.5).stroke();

  let yPos = topMargin + 70;

  // ─── Business Details ───
  doc.fontSize(9).font('Helvetica').fillColor('#333333');

  // Left column - Business info
  const businessInfo = [
    shop.address?.line1,
    shop.address?.line2,
    `${shop.address?.city || ''}${shop.address?.city && shop.address?.pincode ? ' - ' : ''}${shop.address?.pincode || ''}`,
    shop.address?.state,
    `Phone: ${shop.contact?.phone || ''}`,
    `Email: ${shop.contact?.email || ''}`,
  ].filter(Boolean);

  businessInfo.forEach((line, i) => {
    doc.text(line, rightMargin, yPos + (i * 14));
  });

  // Right column - Invoice meta
  const invoiceMeta = [
    `Invoice No: ${order.invoiceNumber || order.orderNumber || ''}`,
    `Order No: ${order.orderNumber || ''}`,
    `Date: ${order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN') : ''}`,
    `GSTIN: ${shop.gstin || 'N/A'}`,
    `PAN: ${shop.pan || 'N/A'}`,
    `HSN/SAC: As per items`,
  ];

  const metaX = pageWidth - 180;
  invoiceMeta.forEach((line, i) => {
    doc.text(line, metaX, yPos + (i * 14), { width: 180, align: 'right' });
  });

  yPos += 110;

  // ─── Bill To Section ───
  doc.moveTo(rightMargin, yPos).lineTo(pageWidth + rightMargin, yPos).strokeColor('#cccccc').lineWidth(0.5).stroke();
  yPos += 10;

  doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a1a2e').text('Bill To:', rightMargin, yPos);
  yPos += 18;

  doc.fontSize(9).font('Helvetica').fillColor('#333333');
  const customerInfo = [
    customer.name || order.customerName || 'Walk-in Customer',
    customer.mobile || order.customerMobile ? `Mobile: ${customer.mobile || order.customerMobile}` : null,
    customer.email ? `Email: ${customer.email}` : null,
    customer.gstin || order.customerGstin ? `GSTIN: ${customer.gstin || order.customerGstin}` : null,
    customer.address?.city ? `${customer.address.city}${customer.address.state ? ', ' + customer.address.state : ''}` : null,
    customer.customerId ? `Customer ID: ${customer.customerId || order.customerId}` : null,
  ].filter(Boolean);

  customerInfo.forEach((line) => {
    doc.text(line, rightMargin, yPos);
    yPos += 14;
  });

  yPos += 10;

  // ─── Items Table ───
  // Table Header
  doc.moveTo(rightMargin, yPos).lineTo(pageWidth + rightMargin, yPos).strokeColor('#1a1a2e').lineWidth(1).stroke();
  yPos += 8;

  doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff');
  const tableTop = yPos;
  const colWidths = { sno: 25, product: 150, hsn: 55, qty: 30, mrp: 45, rate: 50, disc: 35, taxable: 55, gst: 40, total: 55 };
  const startX = rightMargin;

  // Draw table header background
  doc.rect(startX, tableTop - 5, pageWidth, 16).fill('#1a1a2e');

  doc.fillColor('#ffffff');
  let colX = startX;
  doc.text('#', colX, tableTop, { width: colWidths.sno, align: 'center' }); colX += colWidths.sno;
  doc.text('Product', colX, tableTop, { width: colWidths.product }); colX += colWidths.product;
  doc.text('HSN/SAC', colX, tableTop, { width: colWidths.hsn, align: 'center' }); colX += colWidths.hsn;
  doc.text('Qty', colX, tableTop, { width: colWidths.qty, align: 'center' }); colX += colWidths.qty;
  doc.text('MRP', colX, tableTop, { width: colWidths.mrp, align: 'right' }); colX += colWidths.mrp;
  doc.text('Rate', colX, tableTop, { width: colWidths.rate, align: 'right' }); colX += colWidths.rate;
  doc.text('Disc%', colX, tableTop, { width: colWidths.disc, align: 'center' }); colX += colWidths.disc;
  doc.text('Taxable', colX, tableTop, { width: colWidths.taxable, align: 'right' }); colX += colWidths.taxable;
  doc.text('GST%', colX, tableTop, { width: colWidths.gst, align: 'center' }); colX += colWidths.gst;
  doc.text('Total', colX, tableTop, { width: colWidths.total, align: 'right' });

  yPos = tableTop + 20;
  doc.fillColor('#333333').fontSize(8).font('Helvetica');

  // Table Rows
  const items = order.items || [];
  items.forEach((item, idx) => {
    if (yPos > 650) {
      doc.addPage();
      yPos = 40;
    }

    // Alternate row background
    if (idx % 2 === 0) {
      doc.rect(startX, yPos - 4, pageWidth, 16).fill('#f8f8f8');
      doc.fillColor('#333333');
    }

    colX = startX;
    doc.text(String(idx + 1), colX, yPos, { width: colWidths.sno, align: 'center' }); colX += colWidths.sno;

    // Product name (truncated if too long)
    const productName = item.productName || 'Product';
    doc.text(productName.length > 30 ? productName.substring(0, 28) + '..' : productName, colX, yPos, { width: colWidths.product }); colX += colWidths.product;

    doc.text(item.hsnCode || '-', colX, yPos, { width: colWidths.hsn, align: 'center' }); colX += colWidths.hsn;
    doc.text(String(item.quantity || 0), colX, yPos, { width: colWidths.qty, align: 'center' }); colX += colWidths.qty;
    doc.text(`₹${(item.mrp || 0).toFixed(2)}`, colX, yPos, { width: colWidths.mrp, align: 'right' }); colX += colWidths.mrp;
    doc.text(`₹${(item.sellingPrice || 0).toFixed(2)}`, colX, yPos, { width: colWidths.rate, align: 'right' }); colX += colWidths.rate;
    doc.text(`${item.discountPercent || 0}%`, colX, yPos, { width: colWidths.disc, align: 'center' }); colX += colWidths.disc;
    doc.text(`₹${(item.taxableAmount || 0).toFixed(2)}`, colX, yPos, { width: colWidths.taxable, align: 'right' }); colX += colWidths.taxable;
    doc.text(`${item.gstRate || 0}%`, colX, yPos, { width: colWidths.gst, align: 'center' }); colX += colWidths.gst;
    doc.text(`₹${(item.total || 0).toFixed(2)}`, colX, yPos, { width: colWidths.total, align: 'right' });

    yPos += 18;
  });

  // ─── Totals Section ───
  yPos += 5;
  doc.moveTo(startX, yPos).lineTo(pageWidth + startX, yPos).strokeColor('#cccccc').lineWidth(0.5).stroke();
  yPos += 10;

  const totalsX = pageWidth - 200;
  doc.fontSize(9).font('Helvetica');

  const totalLines = [
    { label: 'Subtotal:', value: `₹${(order.subtotal || 0).toFixed(2)}`, bold: false },
    { label: 'Discount:', value: `-₹${(order.totalDiscount || 0).toFixed(2)}`, bold: false },
    { label: 'Taxable Amount:', value: `₹${((order.subtotal || 0) - (order.totalDiscount || 0)).toFixed(2)}`, bold: false },
  ];

  if (order.totalCgst > 0) totalLines.push({ label: 'CGST:', value: `₹${(order.totalCgst || 0).toFixed(2)}`, bold: false });
  if (order.totalSgst > 0) totalLines.push({ label: 'SGST:', value: `₹${(order.totalSgst || 0).toFixed(2)}`, bold: false });
  if (order.totalIgst > 0) totalLines.push({ label: 'IGST:', value: `₹${(order.totalIgst || 0).toFixed(2)}`, bold: false });

  totalLines.push({ label: 'Total GST:', value: `₹${(order.totalGst || 0).toFixed(2)}`, bold: false });

  if (order.roundOff) {
    totalLines.push({ label: 'Round Off:', value: `₹${(order.roundOff || 0).toFixed(2)}`, bold: false });
  }

  totalLines.push({ label: 'Grand Total:', value: `₹${(order.grandTotal || 0).toFixed(2)}`, bold: true });

  totalLines.forEach((line) => {
    doc.font(line.bold ? 'Helvetica-Bold' : 'Helvetica');
    doc.fillColor(line.bold ? '#1a1a2e' : '#333333');
    doc.text(line.label, totalsX, yPos, { width: 100 });
    doc.text(line.value, totalsX + 100, yPos, { width: 100, align: 'right' });
    yPos += 16;
  });

  // ─── Amount in Words ───
  yPos += 10;
  doc.moveTo(startX, yPos).lineTo(pageWidth + startX, yPos).strokeColor('#cccccc').lineWidth(0.5).stroke();
  yPos += 10;

  doc.fontSize(9).font('Helvetica-Bold').fillColor('#1a1a2e')
    .text(`Amount in Words: ${numberToWords(order.grandTotal || 0)}`, startX, yPos, { width: pageWidth });
  yPos += 20;

  // ─── GST Breakup Footer ───
  const gstSummary = summarizeGSTBreakup(order.items);
  if (gstSummary.length > 0) {
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#1a1a2e').text('GST Breakup:', startX, yPos);
    yPos += 14;

    doc.fontSize(7).font('Helvetica').fillColor('#333333');
    const gstTableX = startX;
    doc.text('GST%', gstTableX, yPos, { width: 40 }); doc.text('Taxable', gstTableX + 40, yPos, { width: 60, align: 'right' });
    doc.text('CGST', gstTableX + 100, yPos, { width: 60, align: 'right' }); doc.text('SGST', gstTableX + 160, yPos, { width: 60, align: 'right' });
    yPos += 12;

    gstSummary.forEach((g) => {
      doc.text(`${g.rate}%`, gstTableX, yPos, { width: 40 });
      doc.text(`₹${g.taxable.toFixed(2)}`, gstTableX + 40, yPos, { width: 60, align: 'right' });
      doc.text(`₹${g.cgst.toFixed(2)}`, gstTableX + 100, yPos, { width: 60, align: 'right' });
      doc.text(`₹${g.sgst.toFixed(2)}`, gstTableX + 160, yPos, { width: 60, align: 'right' });
      yPos += 10;
    });
  }

  // ─── Terms & Notes ───
  yPos += 20;
  doc.fontSize(8).font('Helvetica').fillColor('#666666');
  const notes = [
    order.notes ? `Notes: ${order.notes}` : null,
    'This is a computer-generated invoice.',
    `Invoice Type: ${order.gstInvoiceType === 'b2b' ? 'B2B (Business to Business)' : 'B2C (Business to Consumer)'}`,
    order.irn ? `IRN: ${order.irn}` : null,
    order.ewayBillNumber ? `E-Way Bill: ${order.ewayBillNumber}` : null,
  ].filter(Boolean);

  notes.forEach((note) => {
    doc.text(note, startX, yPos, { width: pageWidth });
    yPos += 12;
  });

  // ─── Footer ───
  doc.fontSize(7).fillColor('#999999');
  doc.text(`Generated by Future Magnus Business OS | ${new Date().toLocaleString('en-IN')}`, startX, doc.page.height - 40, { width: pageWidth, align: 'center' });

  doc.end();

  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve({ fileName, filePath, url: `/uploads/invoices/${fileName}` }));
    stream.on('error', reject);
  });
}

/**
 * Summarize GST breakup by rate from order items
 */
function summarizeGSTBreakup(items) {
  const summary = {};
  (items || []).forEach((item) => {
    const rate = item.gstRate || 0;
    if (!summary[rate]) summary[rate] = { rate, taxable: 0, cgst: 0, sgst: 0, igst: 0 };
    summary[rate].taxable += item.taxableAmount || 0;
    summary[rate].cgst += item.cgst || 0;
    summary[rate].sgst += item.sgst || 0;
    summary[rate].igst += item.igst || 0;
  });
  return Object.values(summary);
}

/**
 * Convert number to Indian English words (e.g., 1520 -> "One Thousand Five Hundred Twenty Only")
 */
function numberToWords(num) {
  if (num === 0) return 'Zero Only';

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertBelow1000 = (n) => {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    if (n < 100) return `${tens[Math.floor(n / 10)]}${n % 10 ? ' ' + ones[n % 10] : ''}`;
    return `${ones[Math.floor(n / 100)]} Hundred${n % 100 ? ' ' + convertBelow1000(n % 100) : ''}`;
  };

  const numStr = Math.round(num).toString();
  const numInt = parseInt(numStr);
  let result = '';
  const crore = Math.floor(numInt / 10000000);
  const lakh = Math.floor((numInt % 10000000) / 100000);
  const thousand = Math.floor((numInt % 100000) / 1000);
  const hundred = Math.floor((numInt % 1000) / 100);
  const remainder = numInt % 100;

  if (crore) result += `${convertBelow1000(crore)} Crore `;
  if (lakh) result += `${convertBelow1000(lakh)} Lakh `;
  if (thousand) result += `${convertBelow1000(thousand)} Thousand `;
  if (hundred) result += `${convertBelow1000(hundred)} Hundred `;
  if (remainder) result += ((crore || lakh || thousand || hundred) && remainder ? 'and ' : '') + convertBelow1000(remainder);

  const paise = Math.round((num % 1) * 100);
  if (paise > 0) result += ` and ${convertBelow1000(paise)} Paise`;

  return result.trim() + ' Only';
}

module.exports = { generateInvoice, numberToWords };
