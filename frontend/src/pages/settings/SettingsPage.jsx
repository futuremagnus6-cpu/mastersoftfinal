import React, { useState, useEffect, useCallback } from 'react';
import {
  FiSave, FiSettings, FiBell, FiShield,
  FiGlobe, FiTrash2, FiPlus,
  FiRefreshCw, FiAlertCircle, FiCheckCircle,
  FiMail, FiSmartphone, FiClock,
  FiPercent, FiMapPin, FiPrinter, FiFileText,
  FiTag, FiEye, FiEyeOff, FiDownload,
} from 'react-icons/fi';
import { apiService } from '../../services/api';
import { thermalPrint, standardBillPrint } from '../../utils/printUtils';

const SETTINGS_TABS = [
  { id: 'general', label: 'General', icon: FiSettings },
  { id: 'notifications', label: 'Notifications', icon: FiBell },
  { id: 'printing', label: 'Printing', icon: FiPrinter },
  { id: 'security', label: 'Security', icon: FiShield },
  { id: 'localization', label: 'Localization', icon: FiGlobe },
];

function Toggle({ enabled, onChange, label, description }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <div className="flex-1 min-w-0 pr-4">
        <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
        {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
          enabled ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
        }`}
      >
        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-4.5' : 'translate-x-1'
        }`} />
      </button>
    </div>
  );
}

function InputField({ label, value, onChange, type = 'text', placeholder, helpText, icon: Icon, required }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className="w-4 h-4 text-gray-400" />
          </div>
        )}
        {type === 'textarea' ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={`w-full px-3 py-2 ${Icon ? 'pl-10' : ''} border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder-gray-400`}
            rows={3}
          />
        ) : (
          <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={`w-full px-3 py-2 ${Icon ? 'pl-10' : ''} border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder-gray-400`}
          />
        )}
      </div>
      {helpText && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{helpText}</p>}
    </div>
  );
}

function SelectField({ label, value, onChange, options, helpText }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {helpText && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{helpText}</p>}
    </div>
  );
}

function NumberField({ label, value, onChange, min, max, helpText }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
      />
      {helpText && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{helpText}</p>}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, subtitle, color = 'indigo' }) {
  const colorMap = {
    indigo: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
  };
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className={`w-10 h-10 rounded-xl ${colorMap[color] || colorMap.indigo} flex items-center justify-center`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>}
      </div>
    </div>
  );
}

// ─── Thermal Preview Component ───
function ThermalPreview({ config, shop }) {
  const width = config.paperWidth === '80mm' ? 'w-[320px]' : 'w-[240px]';
  const align = config.headerAlignment === 'center' ? 'text-center' : config.headerAlignment === 'right' ? 'text-right' : 'text-left';
  const items = [
    { name: 'Paracetamol 500mg', qty: 2, price: 25.00, total: 50.00, batch: 'B2025A', expiry: '12/2027' },
    { name: 'Vitamin C Tablets', qty: 1, price: 120.00, total: 120.00, batch: 'VC2409', expiry: '06/2026' },
    { name: 'Cough Syrup', qty: 1, price: 85.00, total: 85.00 },
  ];

  return (
    <div className={`${width} mx-auto bg-white dark:bg-gray-900 shadow-lg rounded-lg overflow-hidden border dark:border-gray-700`}>
      <div className={`${align} p-3 font-mono text-[10px] leading-tight text-gray-900 dark:text-white`}>
        <div className="font-bold text-xs">{shop?.shopName || 'Future Magnus Store'}</div>
        {config.tagline && <div className="text-[9px] text-gray-500">{config.tagline}</div>}
        <div className="border-t border-dashed border-gray-300 my-1.5" />
        <div className="font-bold">SALE RECEIPT</div>
        <div className="text-gray-500">#INV-202607-001</div>
        <div className="text-gray-500">23 Jul 2026, 11:30 AM</div>
        {config.showGstin && shop?.gstin && (
          <div className="text-gray-500">GSTIN: {shop.gstin}</div>
        )}
        {config.showCustomer && (
          <>
            <div className="border-t border-dashed border-gray-300 my-1.5" />
            <div>Customer: Rahul Sharma — +91 98765 43210</div>
          </>
        )}
        {config.showCashierName && <div className="text-gray-500">Cashier: Admin</div>}
        {config.showBranchName && <div className="text-gray-500">Branch: Main Store</div>}
        {config.showTokenNumber && <div className="text-gray-500">Token: A102</div>}

        <div className="border-t border-dashed border-gray-300 my-1.5" />
        <table className="w-full text-[9px]">
          <thead>
            <tr className="font-bold">
              <td className="text-left w-[45%]">Item</td>
              {config.showBatchNumber && <td className="text-left w-[18%]">Batch</td>}
              {config.showExpiryDate && <td className="text-left w-[12%]">Exp</td>}
              <td className="text-center w-[15%]">Qty</td>
              <td className="text-right w-[22%]">Total</td>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i}>
                <td className="text-left">{item.name}</td>
                {config.showBatchNumber && <td className="text-left text-gray-500">{item.batch || '-'}</td>}
                {config.showExpiryDate && <td className="text-left text-gray-500">{item.expiry || '-'}</td>}
                <td className="text-center">{item.qty}</td>
                <td className="text-right">₹{item.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="border-t border-dashed border-gray-300 my-1.5" />
        <table className="w-full text-[9px]">
          <tbody>
            <tr><td className="text-left">Subtotal</td><td className="text-right">₹255.00</td></tr>
            {config.showDiscount && <tr><td className="text-left text-green-600">Discount</td><td className="text-right text-green-600">-₹25.50</td></tr>}
            <tr><td className="text-left">CGST (2.5%)</td><td className="text-right">₹3.19</td></tr>
            <tr><td className="text-left">SGST (2.5%)</td><td className="text-right">₹3.19</td></tr>
            <tr className="font-bold text-xs"><td className="text-left">TOTAL</td><td className="text-right">₹235.88</td></tr>
          </tbody>
        </table>
        {config.showPayments && (
          <>
            <div className="border-t border-dashed border-gray-300 my-1.5" />
            <div className="text-[9px] font-bold">Payments</div>
            <div className="flex justify-between text-[9px]"><span>CASH</span><span>₹235.88</span></div>
          </>
        )}
        {config.showBarcode && (
          <div className="mt-1.5 text-center text-gray-400 text-[6px] font-mono tracking-[4px]">||||||||||||||||||||||||||||||||||||</div>
        )}
        {config.showQrCode && (
          <div className="mt-1 text-center">
            <div className="inline-block w-12 h-12 border-2 border-gray-400 rounded">
              <div className="grid grid-cols-3 gap-0.5 p-1">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className={`${[0,1,3,5,7,8].includes(i) ? 'bg-black' : 'bg-white'} w-3 h-3`} />
                ))}
              </div>
            </div>
          </div>
        )}
        {config.footerMessage && (
          <div className="border-t border-dashed border-gray-300 my-1.5" />
        )}
        <div className="text-gray-500 text-[9px]">{config.footerMessage || 'Thank you for your purchase!'}</div>
        <div className="text-gray-400 text-[8px] mt-0.5">Future Magnus Business OS</div>
      </div>
    </div>
  );
}

// ─── A4 Invoice Preview Component ───
function A4Preview({ config, shop }) {
  const items = [
    { name: 'Paracetamol 500mg', hsn: '300490', qty: 2, rate: 25.00, taxable: 21.74, cgst: 1.63, sgst: 1.63, total: 50.00, discount: 0 },
    { name: 'Vitamin C Tablets', hsn: '293629', qty: 1, rate: 120.00, taxable: 104.35, cgst: 7.83, sgst: 7.83, total: 120.00, discount: 10 },
    { name: 'Cough Syrup', hsn: '300490', qty: 1, rate: 85.00, taxable: 73.91, cgst: 5.54, sgst: 5.54, total: 85.00, discount: 0 },
  ];

  const cols = config.productColumns || {};
  const showCol = (key) => cols[key] !== false;

  return (
    <div className="w-full bg-white dark:bg-gray-900 shadow-lg rounded-lg overflow-hidden border dark:border-gray-700 relative">
      <div className="p-4 text-[10px] leading-relaxed text-gray-900 dark:text-white relative">
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-gray-700 pb-2 mb-2">
          <div>
            <div className="text-sm font-bold">{shop?.shopName || 'Future Magnus Store'}</div>
            <div className="text-[9px] text-gray-500">123, Business Hub, MG Road, Mumbai - 400001</div>
            <div className="text-[9px] text-gray-500">📞 +91 98765 43210 | ✉ store@futuremagnus.com</div>
            {config.showCustomerGstin && <div className="text-[9px] font-semibold mt-0.5">GSTIN: {shop?.gstin || '27ABCDE1234F1Z5'}</div>}
          </div>
          <div className="text-right">
            <div className="text-[8px] font-semibold text-gray-600">{shop?.shopName || 'Shop'}</div>
            <div className="text-xs font-bold uppercase tracking-wider">{config.invoiceTitle || 'Tax Invoice'}</div>
            <div className="text-[9px] text-gray-500">Invoice #: INV-202607-001</div>
            <div className="text-[9px] text-gray-500">Date: 23 Jul 2026</div>
          </div>
        </div>

        {/* Customer */}
        {config.showCustomerSection && (
          <div className="flex gap-3 mb-2">
            <div className="flex-1 border border-gray-200 dark:border-gray-700 rounded p-2">
              <div className="text-[8px] font-bold uppercase text-gray-600 border-b border-gray-200 pb-1 mb-1">Bill To</div>
              <div className="font-semibold">Rahul Sharma</div>
              {config.showCustomerPhone && <div className="text-[9px]">📞 +91 98765 43210</div>}
              {config.showCustomerEmail && <div className="text-[9px]">✉ rahul@email.com</div>}
              {config.showCustomerGstin && <div className="text-[9px]">GSTIN: 27ABCDE1234F1Z5</div>}
              {config.showBillingAddress && <div className="text-[9px] text-gray-500">#42, Sunshine Apartments, Andheri West</div>}
            </div>
            {config.showShippingAddress && (
              <div className="flex-1 border border-gray-200 dark:border-gray-700 rounded p-2">
                <div className="text-[8px] font-bold uppercase text-gray-600 border-b border-gray-200 pb-1 mb-1">Ship To</div>
                <div className="font-semibold">Rahul Sharma</div>
                <div className="text-[9px] text-gray-500">#42, Sunshine Apartments, Andheri West</div>
              </div>
            )}
          </div>
        )}

        {/* Items Table */}
        <table className="w-full border-collapse mb-2">
          <thead>
            <tr className="bg-gray-800 text-white text-[8px]">
              <th className="p-1.5 text-left" style={{width: '20px'}}>#</th>
              {showCol('hsn') && <th className="p-1.5 text-left" style={{width: '55px'}}>HSN</th>}
              <th className="p-1.5 text-left">Product</th>
              <th className="p-1.5 text-center" style={{width: '28px'}}>Qty</th>
              {showCol('rate') && <th className="p-1.5 text-right" style={{width: '45px'}}>Rate</th>}
              <th className="p-1.5 text-right" style={{width: '50px'}}>Taxable</th>
              {showCol('gst') && <th className="p-1.5 text-right" style={{width: '40px'}}>CGST</th>}
              {showCol('gst') && <th className="p-1.5 text-right" style={{width: '40px'}}>SGST</th>}
              {showCol('total') && <th className="p-1.5 text-right" style={{width: '50px'}}>Total</th>}
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="border-b border-gray-200 dark:border-gray-700 text-[9px]">
                <td className="p-1.5">{i + 1}</td>
                {showCol('hsn') && <td className="p-1.5 text-gray-500">{item.hsn}</td>}
                <td className="p-1.5">
                  {item.name}
                  {item.discount > 0 && config.showDiscountDetails && (
                    <span className="text-amber-600 text-[7px] ml-1">(-{item.discount}%)</span>
                  )}
                </td>
                <td className="p-1.5 text-center">{item.qty}</td>
                {showCol('rate') && <td className="p-1.5 text-right">₹{item.rate.toFixed(2)}</td>}
                <td className="p-1.5 text-right">₹{item.taxable.toFixed(2)}</td>
                {showCol('gst') && <td className="p-1.5 text-right">₹{item.cgst.toFixed(2)}</td>}
                {showCol('gst') && <td className="p-1.5 text-right">₹{item.sgst.toFixed(2)}</td>}
                {showCol('total') && <td className="p-1.5 text-right font-medium">₹{item.total.toFixed(2)}</td>}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-2">
          <table className="w-[200px] text-[9px]">
            <tbody>
              <tr><td className="text-gray-500 p-0.5">Subtotal</td><td className="text-right p-0.5 font-medium">₹255.00</td></tr>
              {config.showDiscountDetails && <tr><td className="text-gray-500 p-0.5">Discount</td><td className="text-right p-0.5 text-amber-600">-₹10.00</td></tr>}
              <tr><td className="text-gray-500 p-0.5">Total Taxable</td><td className="text-right p-0.5">₹200.00</td></tr>
              <tr><td className="text-gray-500 p-0.5">Total CGST</td><td className="text-right p-0.5">₹15.00</td></tr>
              <tr><td className="text-gray-500 p-0.5">Total SGST</td><td className="text-right p-0.5">₹15.00</td></tr>
              <tr className="border-t-2 border-gray-700 font-bold text-xs"><td className="p-0.5">Grand Total</td><td className="text-right p-0.5">₹245.00</td></tr>
            </tbody>
          </table>
        </div>

        {config.showAmountInWords && (
          <div className="border border-gray-200 dark:border-gray-700 rounded p-1.5 text-[8px] bg-gray-50 dark:bg-gray-800 mb-2">
            <strong>Amount in Words:</strong> Two Hundred Forty Five Rupees Only
          </div>
        )}

        {config.showGstSummary && (
          <>
            <div className="text-[9px] font-bold uppercase text-gray-600 mb-1">GST Summary</div>
            <table className="w-full border-collapse mb-2 text-[8px]">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-800 text-gray-600">
                  <th className="p-1 text-left border border-gray-200 dark:border-gray-700">GST Rate</th>
                  <th className="p-1 text-right border border-gray-200 dark:border-gray-700">Taxable Value</th>
                  <th className="p-1 text-right border border-gray-200 dark:border-gray-700">CGST</th>
                  <th className="p-1 text-right border border-gray-200 dark:border-gray-700">SGST</th>
                  <th className="p-1 text-right border border-gray-200 dark:border-gray-700">Total Tax</th>
                </tr>
              </thead>
              <tbody>
                {['5%', '12%', '18%'].map((rate, i) => (
                  <tr key={i}>
                    <td className="p-1 border border-gray-200 dark:border-gray-700">{rate}</td>
                    <td className="p-1 text-right border border-gray-200 dark:border-gray-700">₹{(100 - i * 20).toFixed(2)}</td>
                    <td className="p-1 text-right border border-gray-200 dark:border-gray-700">₹{(5 - i).toFixed(2)}</td>
                    <td className="p-1 text-right border border-gray-200 dark:border-gray-700">₹{(5 - i).toFixed(2)}</td>
                    <td className="p-1 text-right border border-gray-200 dark:border-gray-700">₹{(10 - i * 2).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* Watermark */}
        {config.showWatermark && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-30 text-6xl font-bold text-red-200 dark:text-red-900/30 pointer-events-none select-none z-10">
            {config.watermarkText || 'PAID'}
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2 flex justify-between text-[8px] text-gray-500">
          {config.showTerms && (
            <div className="max-w-[60%]">
              <strong>Terms & Conditions:</strong><br />
              {config.termsText?.split('\n')[0]}
            </div>
          )}
          {config.showSignature && (
            <div className="text-right">
              <br /><br />
              <strong>Authorized Signature</strong><br />
              <span>{shop?.shopName || 'Shop'}</span>
            </div>
          )}
        </div>
        {config.footerMessage && (
          <div className="text-center text-[9px] text-gray-500 mt-1">{config.footerMessage}</div>
        )}
        {config.showQrCode && (
          <div className="text-center mt-1">
            <div className="inline-block w-8 h-8 border border-gray-400 rounded">
              <div className="grid grid-cols-3 gap-0.5 p-0.5">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className={`${[0,1,3,5,7,8].includes(i) ? 'bg-black' : 'bg-white'} w-2 h-2`} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-[8px] font-bold text-gray-300 dark:text-gray-600 tracking-[4px] uppercase">
        PREVIEW
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// ─── MAIN SETTINGS PAGE ───
// ═══════════════════════════════════════════════════
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [settings, setSettings] = useState(null);
  const [previewMode, setPreviewMode] = useState('thermal'); // 'thermal' | 'a4'

  // General settings form
  const [generalForm, setGeneralForm] = useState({
    shopName: '', gstin: '', phone: '', email: '', address: '', city: '', state: '', pincode: '',
    currency: 'INR', timezone: 'Asia/Kolkata', dateFormat: 'DD/MM/YYYY', taxMode: 'inclusive', defaultDiscount: 0,
  });

  // Features
  const [features, setFeatures] = useState({
    pos: true, onlineStore: true, loyaltyProgram: false, multiBranch: false,
    autoBackup: true, emailNotifications: true, smsAlerts: false, whatsappMessaging: false,
    gstEInvoicing: true, barcodePrinting: true, expenseTracking: true, employeeManagement: false,
  });

  // Alert config
  const [alertConfig, setAlertConfig] = useState({
    lowStockThreshold: 10, expiryWarningDays: 30,
    dailySalesReport: true, weeklyReport: true, monthlyReport: false,
    paymentReminders: false, backupReminders: true,
  });

  // ─── Print Config State ───
  const [printConfig, setPrintConfig] = useState({
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
  });

  // ─── Update helpers ───
  const updateThermal = (key, value) => {
    setPrintConfig(prev => ({ ...prev, thermal: { ...prev.thermal, [key]: value } }));
  };
  const updateStandard = (key, value) => {
    setPrintConfig(prev => ({ ...prev, standard: { ...prev.standard, [key]: value } }));
  };
  const updatePdf = (key, value) => {
    setPrintConfig(prev => ({ ...prev, pdf: { ...prev.pdf, [key]: value } }));
  };
  const updateProductColumn = (key, value) => {
    setPrintConfig(prev => ({
      ...prev,
      standard: {
        ...prev.standard,
        productColumns: { ...prev.standard.productColumns, [key]: value },
      },
    }));
  };

  // ─── Fetch data ───
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const settingsRes = await apiService.getShopSettings();
      const raw = settingsRes.data;
      const s = raw?.data || raw || {};
      setSettings(s);
      setGeneralForm({
        shopName: s.shopName || '',
        gstin: s.gstin || '',
        phone: s.phone || '',
        email: s.email || '',
        address: s.address || '',
        city: s.city || '',
        state: s.state || '',
        pincode: s.pincode || '',
        currency: s.currency || 'INR',
        timezone: s.timezone || 'Asia/Kolkata',
        dateFormat: s.dateFormat || 'DD/MM/YYYY',
        taxMode: s.taxMode || 'inclusive',
        defaultDiscount: s.defaultDiscount ?? 0,
      });
      if (s.features) setFeatures(s.features);
      if (s.alertConfig) setAlertConfig(s.alertConfig);
      if (s.printConfig) {
        setPrintConfig(prev => {
          const merge = (obj, defaults) => {
            if (!obj || typeof obj !== 'object') return defaults;
            const result = { ...defaults };
            Object.keys(defaults).forEach(key => {
              if (obj[key] !== undefined) {
                if (typeof defaults[key] === 'object' && defaults[key] !== null && !Array.isArray(defaults[key])) {
                  result[key] = merge(obj[key], defaults[key]);
                } else {
                  result[key] = obj[key];
                }
              }
            });
            return result;
          };
          return {
            thermal: merge(s.printConfig.thermal, prev.thermal),
            standard: merge(s.printConfig.standard, prev.standard),
            pdf: merge(s.printConfig.pdf, prev.pdf),
          };
        });
      }
    } catch (err) {
      setError('Failed to load settings. Using demo data.');
      setGeneralForm(prev => ({
        ...prev,
        shopName: 'Future Magnus Store', gstin: '27ABCDE1234F1Z5',
        phone: '+91 98765 43210', email: 'store@futuremagnus.com',
        address: '123, Business Hub, MG Road', city: 'Mumbai',
        state: 'Maharashtra', pincode: '400001',
      }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const showSuccess = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleSaveGeneral = async () => {
    setSaving(true);
    try { await apiService.updateShopSettings(generalForm); showSuccess('Settings saved successfully'); }
    catch (err) { setError('Failed to save settings'); }
    finally { setSaving(false); }
  };

  const handleSavePrint = async () => {
    setSaving(true);
    try { await apiService.updateShopSettings({ printConfig }); showSuccess('Printer settings saved'); }
    catch (err) { setError('Failed to save printer settings'); }
    finally { setSaving(false); }
  };

  const handleSaveAlerts = async () => {
    setSaving(true);
    try { await apiService.updateShopSettings({ alertConfig }); showSuccess('Alert configuration saved'); }
    catch (err) { setError('Failed to save alerts'); }
    finally { setSaving(false); }
  };

  // ─── Demo order for test printing ───
  const createDemoOrder = useCallback(() => {
    const now = new Date();
    return {
      orderNumber: 'TEST-202607-001',
      invoiceNumber: 'INV-TEST-001',
      createdAt: now.toISOString(),
      customerName: 'Rahul Sharma',
      customerMobile: '+91 98765 43210',
      customerGstin: '27ABCDE1234F1Z5',
      customerId: 'CUST-001',
      cashierName: 'Admin',
      branchName: 'Main Store',
      tokenNumber: 'A102',
      billingAddress: '#42, Sunshine Apartments, Andheri West, Mumbai',
      shippingAddress: '#42, Sunshine Apartments, Andheri West, Mumbai',
      subtotal: 255.00,
      totalDiscount: 25.50,
      totalCgst: 3.19,
      totalSgst: 3.19,
      grandTotal: 235.88,
      customerEmail: 'rahul@email.com',
      items: [
        {
          productName: 'Paracetamol 500mg',
          hsnCode: '300490',
          sku: 'PARA-500',
          barcode: '890123456789',
          quantity: 2,
          sellingPrice: 25.00,
          mrp: 28.00,
          total: 50.00,
          gstRate: 5,
          gstAmount: 2.38,
          taxableAmount: 21.74,
          discountPercent: 0,
          batchNumber: 'B2025A',
          expiryDate: '2027-12-01',
        },
        {
          productName: 'Vitamin C Tablets',
          hsnCode: '293629',
          sku: 'VITC-100',
          barcode: '890987654321',
          quantity: 1,
          sellingPrice: 120.00,
          mrp: 135.00,
          total: 120.00,
          gstRate: 12,
          gstAmount: 12.86,
          taxableAmount: 104.35,
          discountPercent: 10,
          batchNumber: 'VC2409',
          expiryDate: '2026-06-01',
        },
        {
          productName: 'Cough Syrup',
          hsnCode: '300490',
          sku: 'COUGH-200',
          barcode: '890555123456',
          quantity: 1,
          sellingPrice: 85.00,
          mrp: 95.00,
          total: 85.00,
          gstRate: 18,
          gstAmount: 12.97,
          taxableAmount: 73.91,
          discountPercent: 0,
        },
      ],
      payments: [
        { method: 'cash', amount: 200.00 },
        { method: 'upi', amount: 35.88, transactionMethod: 'UPI', transactionId: 'UPI-REF-123456' },
      ],
      balanceDue: 0,
    };
  }, []);

  const handleTestThermalPrint = useCallback(() => {
    const shop = {
      name: generalForm.shopName || 'Future Magnus Store',
      address: `${generalForm.address || ''}, ${generalForm.city || ''}, ${generalForm.state || ''} - ${generalForm.pincode || ''}`,
      gstin: generalForm.gstin || '27ABCDE1234F1Z5',
      phone: generalForm.phone || '+91 98765 43210',
      email: generalForm.email || 'store@futuremagnus.com',
    };
    thermalPrint(createDemoOrder(), shop, printConfig);
  }, [generalForm, printConfig, createDemoOrder]);

  const handleTestStandardBill = useCallback(() => {
    const shop = {
      name: generalForm.shopName || 'Future Magnus Store',
      address: `${generalForm.address || ''}, ${generalForm.city || ''}, ${generalForm.state || ''} - ${generalForm.pincode || ''}`,
      gstin: generalForm.gstin || '27ABCDE1234F1Z5',
      phone: generalForm.phone || '+91 98765 43210',
      email: generalForm.email || 'store@futuremagnus.com',
    };
    standardBillPrint(createDemoOrder(), shop, printConfig);
  }, [generalForm, printConfig, createDemoOrder]);

  const handleResetToDefaults = () => {
    setPrintConfig({
      thermal: {
        paperWidth: '80mm', showLogo: true, storeName: '', tagline: '', headerAlignment: 'center',
        footerMessage: 'Thank you for your purchase!', showGstin: true, showCustomer: true,
        showPayments: true, showDiscount: true, showBatchNumber: false, showExpiryDate: false,
        showBarcode: false, showQrCode: false, qrCodeType: 'upi', showCashierName: false,
        showBranchName: false, showTokenNumber: false, printCopies: 1, customerCopy: true,
        merchantCopy: true, autoPrintAfterPayment: false, printPreview: true,
      },
      standard: {
        invoiceTitle: 'Tax Invoice', showLogo: true, showCompanyDetails: true,
        showCustomerSection: true, showBillingAddress: true, showShippingAddress: true,
        showCustomerGstin: true, showCustomerPhone: true, showCustomerEmail: false,
        showCustomerMembership: false,
        productColumns: { image: false, sku: false, barcode: false, hsn: true, batch: false, expiry: false, mrp: false, rate: true, discount: true, gst: true, total: true },
        showTerms: true, termsText: '1. Goods once sold will not be taken back.\n2. This is a computer-generated invoice.\n3. Subject to local jurisdiction.',
        showSignature: true, showGstSummary: true, showAmountInWords: true,
        showDiscountDetails: true, showWatermark: false, watermarkText: 'PAID',
        watermarkType: 'paid', footerMessage: '', showQrCode: false, qrCodeType: 'invoice',
        digitalSignature: false,
      },
      pdf: { orientation: 'portrait', margin: 10, fontFamily: 'Segoe UI', fontSize: 12, headerHeight: 40, footerHeight: 30 },
    });
    showSuccess('Reset to defaults');
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-10 w-96 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // ═══ General Tab ═══
  const renderGeneralTab = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Shop Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField label="Shop Name" value={generalForm.shopName} onChange={(v) => setGeneralForm(p => ({ ...p, shopName: v }))} required icon={FiSettings} />
          <InputField label="GSTIN" value={generalForm.gstin} onChange={(v) => setGeneralForm(p => ({ ...p, gstin: v }))} placeholder="27ABCDE1234F1Z5" icon={FiShield} />
          <InputField label="Phone" value={generalForm.phone} onChange={(v) => setGeneralForm(p => ({ ...p, phone: v }))} type="tel" icon={FiSmartphone} />
          <InputField label="Email" value={generalForm.email} onChange={(v) => setGeneralForm(p => ({ ...p, email: v }))} type="email" icon={FiMail} />
          <div className="md:col-span-2">
            <InputField label="Address" value={generalForm.address} onChange={(v) => setGeneralForm(p => ({ ...p, address: v }))} type="textarea" icon={FiMapPin} />
          </div>
          <InputField label="City" value={generalForm.city} onChange={(v) => setGeneralForm(p => ({ ...p, city: v }))} />
          <InputField label="State" value={generalForm.state} onChange={(v) => setGeneralForm(p => ({ ...p, state: v }))} />
          <InputField label="Pincode" value={generalForm.pincode} onChange={(v) => setGeneralForm(p => ({ ...p, pincode: v }))} placeholder="400001" />
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Regional Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SelectField label="Currency" value={generalForm.currency} onChange={(v) => setGeneralForm(p => ({ ...p, currency: v }))}
            options={[{ value: 'INR', label: 'INR (₹)' }, { value: 'USD', label: 'USD ($)' }, { value: 'EUR', label: 'EUR (€)' }, { value: 'GBP', label: 'GBP (£)' }]} />
          <SelectField label="Timezone" value={generalForm.timezone} onChange={(v) => setGeneralForm(p => ({ ...p, timezone: v }))}
            options={[{ value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' }, { value: 'UTC', label: 'UTC' }, { value: 'Asia/Dubai', label: 'Asia/Dubai (GST)' }]} />
          <SelectField label="Date Format" value={generalForm.dateFormat} onChange={(v) => setGeneralForm(p => ({ ...p, dateFormat: v }))}
            options={[{ value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' }, { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' }, { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' }]} />
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Tax & Pricing</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectField label="Tax Mode" value={generalForm.taxMode} onChange={(v) => setGeneralForm(p => ({ ...p, taxMode: v }))}
            options={[{ value: 'inclusive', label: 'Tax Inclusive' }, { value: 'exclusive', label: 'Tax Exclusive' }]} />
          <InputField label="Default Discount (%)" value={generalForm.defaultDiscount} onChange={(v) => setGeneralForm(p => ({ ...p, defaultDiscount: v }))} type="number" icon={FiPercent} />
        </div>
      </div>
      <div className="flex justify-end gap-3">
        <button onClick={handleSaveGeneral} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
          <FiSave className="w-4 h-4" />{saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );

  // ═══ Notifications Tab ═══
  const renderNotificationsTab = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Alert Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <InputField label="Low Stock Threshold" value={alertConfig.lowStockThreshold} onChange={(v) => setAlertConfig(p => ({ ...p, lowStockThreshold: Number(v) }))} type="number" icon={FiAlertCircle} helpText="Notify when stock falls below this level" />
          <InputField label="Expiry Warning (Days)" value={alertConfig.expiryWarningDays} onChange={(v) => setAlertConfig(p => ({ ...p, expiryWarningDays: Number(v) }))} type="number" icon={FiClock} helpText="Warn before product expiry" />
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Report Schedules</h4>
          <Toggle label="Daily Sales Report" enabled={alertConfig.dailySalesReport} onChange={(v) => setAlertConfig(p => ({ ...p, dailySalesReport: v }))} />
          <Toggle label="Weekly Report" enabled={alertConfig.weeklyReport} onChange={(v) => setAlertConfig(p => ({ ...p, weeklyReport: v }))} />
          <Toggle label="Monthly Report" enabled={alertConfig.monthlyReport} onChange={(v) => setAlertConfig(p => ({ ...p, monthlyReport: v }))} />
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-2">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Reminders</h4>
          <Toggle label="Payment Reminders" enabled={alertConfig.paymentReminders} onChange={(v) => setAlertConfig(p => ({ ...p, paymentReminders: v }))} />
          <Toggle label="Backup Reminders" enabled={alertConfig.backupReminders} onChange={(v) => setAlertConfig(p => ({ ...p, backupReminders: v }))} />
        </div>
      </div>
      <div className="flex justify-end">
        <button onClick={handleSaveAlerts} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
          <FiSave className="w-4 h-4" />{saving ? 'Saving...' : 'Save Alert Config'}
        </button>
      </div>
    </div>
  );

  // ═══ Security Tab ═══
  const renderSecurityTab = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Security Settings</h3>
        <Toggle label="Two-Factor Authentication" description="Require OTP for login" enabled={false} onChange={() => {}} />
        <Toggle label="Session Timeout" description="Auto-logout after 30 minutes of inactivity" enabled={true} onChange={() => {}} />
        <Toggle label="Login Notifications" enabled={true} onChange={() => {}} />
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">API Keys</h3>
        {[{ name: 'Production API Key', key: 'fm_sk_prod_••••••••••' }, { name: 'Test API Key', key: 'fm_sk_test_••••••••••' }].map((api, i) => (
          <div key={i} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg mb-2">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{api.name}</p>
              <p className="text-xs text-gray-500">{api.key}</p>
            </div>
            <button className="p-2 text-gray-400 hover:text-red-600 transition-colors"><FiTrash2 className="w-4 h-4" /></button>
          </div>
        ))}
        <button className="flex items-center gap-2 text-sm font-medium text-indigo-600 dark:text-indigo-400"><FiPlus className="w-4 h-4" /> Generate New Key</button>
      </div>
    </div>
  );

  // ═══ Localization Tab ═══
  const renderLocalizationTab = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Language & Region</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectField label="Store Language" value="en" onChange={() => {}} helpText="Display language for the POS and dashboard"
            options={[{ value: 'en', label: 'English (EN)' }, { value: 'hi', label: 'Hindi (HI)' }, { value: 'mr', label: 'Marathi (MR)' }]} />
          <SelectField label="Invoice Language" value="en" onChange={() => {}} helpText="Language used on printed invoices"
            options={[{ value: 'en', label: 'English (EN)' }, { value: 'hi', label: 'Hindi (HI)' }, { value: 'mr', label: 'Marathi (MR)' }]} />
        </div>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════
  // ─── PRINTING TAB (The main feature) ───
  // ═══════════════════════════════════════════════
  const renderPrintingTab = () => {
    const th = printConfig.thermal;
    const st = printConfig.standard;
    const pc = st.productColumns;
    const pd = printConfig.pdf;

    return (
      <div className="flex flex-col lg:flex-row gap-6">
        {/* ─── LEFT: Settings Panel ─── */}
        <div className="flex-1 space-y-6 max-w-2xl">
          {/* ═══ THERMAL PRINTER ═══ */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-5">
            <SectionHeader icon={FiPrinter} title="Thermal Printer" subtitle="Compact receipt printer settings (e.g. Epson TM-T20, Star SP700)" color="indigo" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SelectField label="Paper Width" value={th.paperWidth} onChange={(v) => updateThermal('paperWidth', v)} helpText="Select the paper width of your thermal printer"
                options={[{ value: '58mm', label: '58 mm (2.25")' }, { value: '80mm', label: '80 mm (3.125")' }]} />
              <SelectField label="Header Alignment" value={th.headerAlignment} onChange={(v) => updateThermal('headerAlignment', v)} helpText="Align the receipt header text"
                options={[{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' }]} />
              <InputField label="Store Name" value={th.storeName} onChange={(v) => updateThermal('storeName', v)} placeholder="Future Magnus Medical Store" icon={FiTag} />
              <InputField label="Tagline" value={th.tagline} onChange={(v) => updateThermal('tagline', v)} placeholder="Your Trusted Healthcare Partner" icon={FiFileText} />
              <InputField label="Footer Message" value={th.footerMessage} onChange={(v) => updateThermal('footerMessage', v)} placeholder="Thank you for your purchase!" className="md:col-span-2" />
            </div>

            <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Display Options</h4>
              <p className="text-xs text-gray-500 mb-3">Toggle what appears on the thermal receipt</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                <div>
                  <Toggle label="Show Logo" enabled={th.showLogo} onChange={(v) => updateThermal('showLogo', v)} />
                  <Toggle label="Show GSTIN" enabled={th.showGstin} onChange={(v) => updateThermal('showGstin', v)} />
                  <Toggle label="Show Customer Details" enabled={th.showCustomer} onChange={(v) => updateThermal('showCustomer', v)} />
                  <Toggle label="Show Payment Details" enabled={th.showPayments} onChange={(v) => updateThermal('showPayments', v)} />
                  <Toggle label="Show Discount Details" enabled={th.showDiscount} onChange={(v) => updateThermal('showDiscount', v)} />
                  <Toggle label="Show Batch Number" enabled={th.showBatchNumber} onChange={(v) => updateThermal('showBatchNumber', v)} />
                  <Toggle label="Show Expiry Date" enabled={th.showExpiryDate} onChange={(v) => updateThermal('showExpiryDate', v)} />
                </div>
                <div>
                  <Toggle label="Show Barcode" enabled={th.showBarcode} onChange={(v) => updateThermal('showBarcode', v)} />
                  <Toggle label="Show QR Code" enabled={th.showQrCode} onChange={(v) => updateThermal('showQrCode', v)} />
                  {th.showQrCode && (
                    <div className="pl-6 mb-2">
                      <SelectField label="QR Code Type" value={th.qrCodeType} onChange={(v) => updateThermal('qrCodeType', v)}
                        options={[{ value: 'upi', label: 'UPI QR' }, { value: 'invoice', label: 'Invoice QR' }, { value: 'review', label: 'Review QR' }, { value: 'whatsapp', label: 'WhatsApp QR' }]} />
                    </div>
                  )}
                  <Toggle label="Show Cashier Name" enabled={th.showCashierName} onChange={(v) => updateThermal('showCashierName', v)} />
                  <Toggle label="Show Branch Name" enabled={th.showBranchName} onChange={(v) => updateThermal('showBranchName', v)} />
                  <Toggle label="Show Token Number" enabled={th.showTokenNumber} onChange={(v) => updateThermal('showTokenNumber', v)} />
                </div>
              </div>
            </div>

            <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Print Copies & Automation</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                <div>
                  <Toggle label="Customer Copy" enabled={th.customerCopy} onChange={(v) => updateThermal('customerCopy', v)} />
                  <Toggle label="Merchant Copy" enabled={th.merchantCopy} onChange={(v) => updateThermal('merchantCopy', v)} />
                </div>
                <div>
                  <NumberField label="Print Copies" value={th.printCopies} onChange={(v) => updateThermal('printCopies', Math.max(1, Math.min(10, v)))} min={1} max={10} helpText="Number of copies (1-10)" />
                  <Toggle label="Auto Print After Payment" enabled={th.autoPrintAfterPayment} onChange={(v) => updateThermal('autoPrintAfterPayment', v)} />
                  <Toggle label="Print Preview" description="Show preview before printing" enabled={th.printPreview} onChange={(v) => updateThermal('printPreview', v)} />
                </div>
              </div>
            </div>
          </div>

          {/* ═══ STANDARD A4 BILL ═══ */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-5">
            <SectionHeader icon={FiFileText} title="Standard A4 Bill" subtitle="Full-page invoice/standard bill settings" color="blue" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField label="Invoice Title" value={st.invoiceTitle} onChange={(v) => updateStandard('invoiceTitle', v)} placeholder="Tax Invoice" helpText="Appears at the top of the bill" />
              <InputField label="Footer Message" value={st.footerMessage} onChange={(v) => updateStandard('footerMessage', v)} placeholder="Optional footer text..." />
            </div>

            <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Company & Customer</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                <div>
                  <Toggle label="Show Logo" enabled={st.showLogo} onChange={(v) => updateStandard('showLogo', v)} />
                  <Toggle label="Show Company Details" enabled={st.showCompanyDetails} onChange={(v) => updateStandard('showCompanyDetails', v)} />
                  <Toggle label="Show Customer Section" enabled={st.showCustomerSection} onChange={(v) => updateStandard('showCustomerSection', v)} />
                </div>
                <div>
                  <Toggle label="Show Billing Address" enabled={st.showBillingAddress} onChange={(v) => updateStandard('showBillingAddress', v)} />
                  <Toggle label="Show Shipping Address" enabled={st.showShippingAddress} onChange={(v) => updateStandard('showShippingAddress', v)} />
                  <Toggle label="Show Customer GSTIN" enabled={st.showCustomerGstin} onChange={(v) => updateStandard('showCustomerGstin', v)} />
                  <Toggle label="Show Customer Phone" enabled={st.showCustomerPhone} onChange={(v) => updateStandard('showCustomerPhone', v)} />
                  <Toggle label="Show Customer Email" enabled={st.showCustomerEmail} onChange={(v) => updateStandard('showCustomerEmail', v)} />
                  <Toggle label="Show Membership ID" enabled={st.showCustomerMembership} onChange={(v) => updateStandard('showCustomerMembership', v)} />
                </div>
              </div>
            </div>

            <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Product Table Columns</h4>
              <p className="text-xs text-gray-500 mb-3">Enable or disable columns in the product table</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4">
                <Toggle label="Image" enabled={pc.image} onChange={(v) => updateProductColumn('image', v)} />
                <Toggle label="SKU" enabled={pc.sku} onChange={(v) => updateProductColumn('sku', v)} />
                <Toggle label="Barcode" enabled={pc.barcode} onChange={(v) => updateProductColumn('barcode', v)} />
                <Toggle label="HSN/SAC" enabled={pc.hsn} onChange={(v) => updateProductColumn('hsn', v)} />
                <Toggle label="Batch" enabled={pc.batch} onChange={(v) => updateProductColumn('batch', v)} />
                <Toggle label="Expiry" enabled={pc.expiry} onChange={(v) => updateProductColumn('expiry', v)} />
                <Toggle label="MRP" enabled={pc.mrp} onChange={(v) => updateProductColumn('mrp', v)} />
                <Toggle label="Rate" enabled={pc.rate} onChange={(v) => updateProductColumn('rate', v)} />
                <Toggle label="Discount" enabled={pc.discount} onChange={(v) => updateProductColumn('discount', v)} />
                <Toggle label="GST" enabled={pc.gst} onChange={(v) => updateProductColumn('gst', v)} />
                <Toggle label="Total" enabled={pc.total} onChange={(v) => updateProductColumn('total', v)} />
              </div>
            </div>

            <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Invoice Sections</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                <div>
                  <Toggle label="Show GST Summary" enabled={st.showGstSummary} onChange={(v) => updateStandard('showGstSummary', v)} />
                  <Toggle label="Show Amount in Words" enabled={st.showAmountInWords} onChange={(v) => updateStandard('showAmountInWords', v)} />
                  <Toggle label="Show Discount Details" enabled={st.showDiscountDetails} onChange={(v) => updateStandard('showDiscountDetails', v)} />
                  <Toggle label="Show Terms & Conditions" enabled={st.showTerms} onChange={(v) => updateStandard('showTerms', v)} />
                </div>
                <div>
                  <Toggle label="Show Authorized Signature" enabled={st.showSignature} onChange={(v) => updateStandard('showSignature', v)} />
                  <Toggle label="Show Watermark" enabled={st.showWatermark} onChange={(v) => updateStandard('showWatermark', v)} />
                  {st.showWatermark && (
                    <div className="pl-6 space-y-2">
                      <SelectField label="Watermark Type" value={st.watermarkType} onChange={(v) => updateStandard('watermarkType', v)}
                        options={[{ value: 'paid', label: 'PAID' }, { value: 'duplicate', label: 'DUPLICATE' }, { value: 'cancelled', label: 'CANCELLED' }, { value: 'draft', label: 'DRAFT' }]} />
                      <InputField label="Watermark Text" value={st.watermarkText} onChange={(v) => updateStandard('watermarkText', v)} />
                    </div>
                  )}
                  <Toggle label="Show QR Code" enabled={st.showQrCode} onChange={(v) => updateStandard('showQrCode', v)} />
                  {st.showQrCode && (
                    <div className="pl-6 mb-2">
                      <SelectField label="QR Code Type" value={st.qrCodeType} onChange={(v) => updateStandard('qrCodeType', v)}
                        options={[{ value: 'invoice', label: 'Invoice Verification' }, { value: 'upi', label: 'UPI' }, { value: 'review', label: 'Google Review' }, { value: 'whatsapp', label: 'WhatsApp' }, { value: 'website', label: 'Website' }]} />
                    </div>
                  )}
                  <Toggle label="Digital Signature" enabled={st.digitalSignature} onChange={(v) => updateStandard('digitalSignature', v)} />
                </div>
              </div>
            </div>

            <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Terms & Conditions</h4>
              <textarea
                value={st.termsText}
                onChange={(e) => updateStandard('termsText', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              />
            </div>
          </div>

          {/* ═══ PDF SETTINGS ═══ */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-5">
            <SectionHeader icon={FiDownload} title="PDF Settings" subtitle="Configure PDF export options" color="green" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <SelectField label="Orientation" value={pd.orientation} onChange={(v) => updatePdf('orientation', v)}
                options={[{ value: 'portrait', label: 'A4 Portrait' }, { value: 'landscape', label: 'A4 Landscape' }]} helpText="Page orientation" />
              <NumberField label="Margin (mm)" value={pd.margin} onChange={(v) => updatePdf('margin', Math.max(5, Math.min(50, v)))} min={5} max={50} helpText="Page margins in mm" />
              <SelectField label="Font Family" value={pd.fontFamily} onChange={(v) => updatePdf('fontFamily', v)}
                options={[{ value: 'Segoe UI', label: 'Segoe UI' }, { value: 'Arial', label: 'Arial' }, { value: 'Times New Roman', label: 'Times New Roman' }]} />
              <NumberField label="Font Size" value={pd.fontSize} onChange={(v) => updatePdf('fontSize', Math.max(8, Math.min(24, v)))} min={8} max={24} helpText="Base font size" />
              <NumberField label="Header Height (mm)" value={pd.headerHeight} onChange={(v) => updatePdf('headerHeight', Math.max(20, Math.min(80, v)))} min={20} max={80} />
              <NumberField label="Footer Height (mm)" value={pd.footerHeight} onChange={(v) => updatePdf('footerHeight', Math.max(15, Math.min(60, v)))} min={15} max={60} />
            </div>
          </div>

          {/* Save & Reset Buttons */}
          <div className="flex items-center justify-between gap-3">
            <button onClick={handleResetToDefaults} className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <FiRefreshCw className="w-4 h-4" /> Reset to Defaults
            </button>
            <button onClick={handleSavePrint} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              <FiSave className="w-4 h-4" />{saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>

        {/* ─── RIGHT: Live Preview Panel ─── */}
        <div className="w-full lg:w-[400px] xl:w-[450px] flex-shrink-0">
          <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-hidden sticky top-6">
            <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <FiEye className="w-4 h-4 text-indigo-500" /> Live Preview
              </h3>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleTestThermalPrint}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all"
                  title="Print test thermal slip with current settings"
                >
                  <FiPrinter className="w-4 h-4" />
                </button>
                <button
                  onClick={handleTestStandardBill}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                  title="Print test A4 invoice with current settings"
                >
                  <FiFileText className="w-4 h-4" />
                </button>
                <div className="w-px h-5 bg-gray-200 dark:bg-gray-600 mx-1" />
                <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
                  <button
                    onClick={() => setPreviewMode('thermal')}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-all ${
                      previewMode === 'thermal'
                        ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                    }`}
                  >
                    <FiPrinter className="w-3 h-3 inline mr-1" />Thermal
                  </button>
                  <button
                    onClick={() => setPreviewMode('a4')}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-all ${
                      previewMode === 'a4'
                        ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                    }`}
                  >
                    <FiFileText className="w-3 h-3 inline mr-1" />A4 Invoice
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 overflow-y-auto max-h-[calc(100vh-12rem)]">
              <div className="text-center text-xs text-gray-400 mb-2">
                <FiEyeOff className="w-3 h-3 inline mr-1" />
                Preview updates instantly as you change settings
              </div>

              {previewMode === 'thermal' ? (
                <div className="flex justify-center">
                  <ThermalPreview config={th} shop={generalForm} />
                </div>
              ) : (
                <div className="relative">
                  <A4Preview config={st} shop={generalForm} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════
  // ─── MAIN RENDER ───
  // ═══════════════════════════════════════════════
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Configure your shop, team, and preferences</p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          <FiRefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {successMessage && (
        <div className="flex items-center gap-2 px-4 py-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl text-sm text-green-700 dark:text-green-400 animate-fade-in">
          <FiCheckCircle className="w-4 h-4 flex-shrink-0" /> {successMessage}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl text-sm text-red-700 dark:text-red-400">
          <FiAlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {SETTINGS_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
              activeTab === tab.id
                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'general' && renderGeneralTab()}
      {activeTab === 'notifications' && renderNotificationsTab()}
      {activeTab === 'printing' && renderPrintingTab()}
      {activeTab === 'security' && renderSecurityTab()}
      {activeTab === 'localization' && renderLocalizationTab()}
    </div>
  );
}
