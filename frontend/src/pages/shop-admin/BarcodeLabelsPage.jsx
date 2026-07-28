import React, { useState, useEffect, useCallback } from 'react';
import {
  FiPrinter, FiCheck, FiSearch, FiX, FiPackage,
  FiRefreshCw, FiGrid, FiList, FiAlertTriangle, FiTag,
  FiDownloadCloud, FiSettings, FiLayers, FiCalendar,
  FiDollarSign, FiHash, FiBox, FiSliders, FiCpu,
} from 'react-icons/fi';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';

// Available GS1 encoding fields
const GS1_FIELDS = [
  { key: 'gtin', label: 'Product ID (GTIN)', description: 'Product barcode/SKU as identifier', icon: FiHash },
  { key: 'expiry', label: 'Expiry Date', description: 'First batch expiry date (AI 15)', icon: FiCalendar },
  { key: 'batch', label: 'Batch/Lot Number', description: 'First batch number (AI 10)', icon: FiLayers },
  { key: 'mfgDate', label: 'Manufacturing Date', description: 'First batch mfg date (AI 11)', icon: FiCalendar },
  { key: 'price', label: 'Selling Price', description: 'Selling price in paise (AI 8005)', icon: FiDollarSign },
  { key: 'mrp', label: 'MRP', description: 'Maximum retail price', icon: FiDollarSign },
  { key: 'mfgUnit', label: 'Manufacturing Unit', description: 'Production plant/location ID (AI 8004)', icon: FiBox },
];

// Label templates
const LABEL_TEMPLATES = [
  { id: 'standard', label: 'Standard', description: 'Barcode + Name + Price' },
  { id: 'batch', label: 'Batch Label', description: 'Barcode + Batch + Mfg/Exp + Price' },
  { id: 'price-tag', label: 'Price Tag', description: 'Large Price + Name + Small Barcode' },
];

export default function BarcodeLabelsPage() {
  const [products, setProducts] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatedBarcodes, setGeneratedBarcodes] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectAll, setSelectAll] = useState(false);
  const [viewMode, setViewMode] = useState('list');

  // GS1 Smart Barcode Options
  const [useSmartBarcode, setUseSmartBarcode] = useState(false);
  const [encodeFields, setEncodeFields] = useState(['gtin', 'expiry', 'batch']);
  const [selectedTemplate, setSelectedTemplate] = useState('standard');

  // Load products
  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 200, active: 'all' };
      if (searchQuery.trim()) params.search = searchQuery;
      const res = await apiService.getProducts(params);
      setProducts(res.data?.data || []);
    } catch (err) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    const timer = setTimeout(loadProducts, 300);
    return () => clearTimeout(timer);
  }, [loadProducts]);

  // Toggle GS1 encoding field
  const toggleEncodeField = (key) => {
    setEncodeFields(prev => {
      // Always keep at least one field
      if (prev.includes(key)) {
        if (prev.length <= 1) return prev;
        return prev.filter(f => f !== key);
      }
      return [...prev, key];
    });
  };

  // Selection handlers
  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setGeneratedBarcodes(null);
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedIds(new Set());
      setSelectAll(false);
    } else {
      setSelectedIds(new Set(products.map(p => p._id)));
      setSelectAll(true);
    }
    setGeneratedBarcodes(null);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setSelectAll(false);
    setGeneratedBarcodes(null);
  };

  // Generate barcodes
  const generateBarcodes = async () => {
    if (selectedIds.size === 0) {
      toast.error('Select at least one product');
      return;
    }

    setGenerating(true);
    setGeneratedBarcodes(null);
    try {
      const payload = {
        productIds: Array.from(selectedIds),
        type: 'code128',
      };

      // Add smart barcode options if enabled
      if (useSmartBarcode && encodeFields.length > 0) {
        payload.encodeFields = encodeFields;
        payload.template = selectedTemplate;
      }

      const res = await apiService.generateBarcodes(payload);
      setGeneratedBarcodes(res.data?.data || res.data);
      const result = res.data?.data || res.data;
      const genCount = result?.generated || 0;
      const smartLabel = result?.isSmart ? ' (GS1 Smart Barcodes)' : '';
      toast.success(`Generated ${genCount} barcode(s)${smartLabel}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate barcodes');
    } finally {
      setGenerating(false);
    }
  };

  // Print barcode labels
  const printLabels = () => {
    if (!generatedBarcodes?.barcodes?.length) {
      toast.error('No barcodes to print');
      return;
    }

    const printable = generatedBarcodes.barcodes.filter(b => b.imageUrl);
    if (printable.length === 0) {
      toast.error('No barcode images available to print');
      return;
    }

    const baseUrl = window.location.origin;

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Barcode Labels - ${selectedTemplate}</title>
  <style>
    @page { margin: 8mm; size: A4 portrait; }
    body { margin: 0; padding: 8mm; font-family: 'Segoe UI', Arial, sans-serif; }
    .label-grid {
      display: flex;
      flex-wrap: wrap;
      gap: ${selectedTemplate === 'batch' ? '6mm' : '8mm'};
      justify-content: flex-start;
    }
    .label {
      width: ${selectedTemplate === 'price-tag' ? '70mm' : '85mm'};
      ${selectedTemplate === 'batch' ? 'min-height: 50mm;' : ''}
      border: 1px dashed #ccc;
      padding: ${selectedTemplate === 'price-tag' ? '3mm' : '4mm'};
      text-align: center;
      page-break-inside: avoid;
      box-sizing: border-box;
      ${selectedTemplate === 'batch' ? 'display: flex; flex-direction: column; justify-content: space-between;' : ''}
    }
    .label img { max-width: 100%; height: auto; max-height: ${selectedTemplate === 'price-tag' ? '25mm' : '35mm'}; }
    .label .name { font-size: 10px; font-weight: 600; margin: 3px 0 2px; color: #222; }
    .label .sku { font-size: 8px; color: #666; }
    .label .price { font-size: ${selectedTemplate === 'price-tag' ? '18px' : '12px'}; font-weight: bold; color: #dc2626; margin-top: 2px; }
    .label .barcode-text { font-size: 9px; font-family: 'Courier New', monospace; margin-top: 1px; color: #333; word-break: break-all; }
    .label .gs1-field { display: inline-block; font-size: 7px; padding: 1px 4px; margin: 1px; background: #f0f5ff; border-radius: 3px; color: #1d4ed8; font-family: monospace; }
    .label .batch-info { font-size: 8px; color: #555; margin-top: 2px; }
    .label .gs1-tag { font-size: 6px; background: #059669; color: white; padding: 1px 4px; border-radius: 2px; display: inline-block; margin-bottom: 2px; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .label { border: 1px solid #ddd; }
    }
  </style>
</head>
<body>
  <div class="label-grid">
    ${printable.map(b => {
      const gs1Tags = b.gs1Data ? Object.entries(b.gs1Data)
        .filter(([k, v]) => v && !['gtin'].includes(k))
        .map(([k, v]) => {
          let display = v;
          if (k === 'sellingPrice') display = `₹${parseFloat(v).toFixed(2)}`;
          if (k === 'expiryDate') display = `Exp: ${new Date(v).toLocaleDateString('en-IN')}`;
          if (k === 'mfgDate') display = `Mfg: ${new Date(v).toLocaleDateString('en-IN')}`;
          if (k === 'batchNumber') display = `Batch: ${v}`;
          if (k === 'mfgUnit') display = `Unit: ${v}`;
          return display;
        })
        : [];

      return `
      <div class="label">
        ${b.isSmart ? '<span class="gs1-tag">Smart Barcode</span>' : ''}
        <img src="${baseUrl}${b.imageUrl}" alt="${b.name}" />
        <div class="name">${b.name}</div>
        <div class="sku">${b.sku}</div>
        ${b.isSmart && b.displayCode ? `<div class="barcode-text">${b.displayCode}</div>` : `<div class="barcode-text">${b.barcode}</div>`}
        ${gs1Tags.length > 0 ? `<div class="batch-info">${gs1Tags.map(t => `<span class="gs1-field">${t}</span>`).join(' ')}</div>` : ''}
      </div>
      `;
    }).join('')}
  </div>
</body>
</html>`;

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    } else {
      toast.error('Please allow pop-ups to print labels');
    }
  };

  // Download combined PDF
  const downloadPdf = () => {
    if (generatedBarcodes?.pdfUrl) {
      window.open(generatedBarcodes.pdfUrl, '_blank');
      toast.success('Downloading PDF...');
    } else {
      toast.error('No PDF available. Generate barcodes first.');
    }
  };

  return (
    <div className="page-container max-w-7xl mx-auto">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FiTag className="text-primary-500" />
            Barcode Labels
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Generate and print barcode labels — supports GS1 smart barcodes with batch, expiry & price data
          </p>
        </div>
        <div className="flex items-center gap-2">
          {generatedBarcodes?.barcodes?.length > 0 && (
            <>
              <button onClick={printLabels} className="btn-primary flex items-center gap-2">
                <FiPrinter className="w-4 h-4" /> Print Labels
              </button>
              {generatedBarcodes.pdfUrl && (
                <button onClick={downloadPdf} className="btn-secondary flex items-center gap-2">
                  <FiDownloadCloud className="w-4 h-4" /> Download PDF
                </button>
              )}
            </>
          )}
          <button onClick={loadProducts} disabled={loading} className="btn-secondary flex items-center gap-2">
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product Selection */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search & Filter */}
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products by name, SKU, or barcode..."
                  className="input-field pl-9 pr-4 py-2"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <FiX className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')} className="p-2 rounded-lg border dark:border-gray-600 text-gray-500 hover:bg-gray-100">
                {viewMode === 'grid' ? <FiList className="w-4 h-4" /> : <FiGrid className="w-4 h-4" />}
              </button>
            </div>

            {/* Selection Controls */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t dark:border-gray-700">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectAll && products.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 text-primary-600 rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Select All ({products.length})
                  </span>
                </label>
                {selectedIds.size > 0 && (
                  <>
                    <span className="text-sm text-primary-600 font-medium">
                      {selectedIds.size} selected
                    </span>
                    <button onClick={clearSelection} className="text-xs text-danger-500 hover:text-danger-600">
                      Clear
                    </button>
                  </>
                )}
              </div>
              <button
                onClick={generateBarcodes}
                disabled={selectedIds.size === 0 || generating}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                {generating ? (
                  <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> Generating...</>
                ) : (
                  <><FiTag className="w-4 h-4" /> Generate ({selectedIds.size})</>
                )}
              </button>
            </div>
          </div>

          {/* Products */}
          {loading ? (
            <div className="card p-6">
              <div className="space-y-3">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
                ))}
              </div>
            </div>
          ) : products.length === 0 ? (
            <div className="card p-12 text-center">
              <FiPackage className="w-16 h-16 mx-auto mb-4 text-gray-200 dark:text-gray-600" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Products Found</h3>
              <p className="text-sm text-gray-500">
                {searchQuery ? 'Try a different search term' : 'Add products first to generate barcodes'}
              </p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              {viewMode === 'list' ? (
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-900">
                      <th className="table-header w-10">
                        <input
                          type="checkbox"
                          checked={selectAll}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 text-primary-600 rounded"
                        />
                      </th>
                      <th className="table-header">Product</th>
                      <th className="table-header">SKU</th>
                      <th className="table-header">Barcode</th>
                      <th className="table-header">Stock</th>
                      <th className="table-header">Price</th>
                      {useSmartBarcode && <th className="table-header">Batch/Exp</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-gray-700">
                    {products.map((product) => (
                      <tr
                        key={product._id}
                        onClick={() => toggleSelect(product._id)}
                        className={`cursor-pointer transition-colors ${
                          selectedIds.has(product._id)
                            ? 'bg-primary-50 dark:bg-primary-900/20'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                        }`}
                      >
                        <td className="table-cell" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(product._id)}
                            onChange={() => toggleSelect(product._id)}
                            className="w-4 h-4 text-primary-600 rounded"
                          />
                        </td>
                        <td className="table-cell">
                          <div className="flex items-center gap-2">
                            {selectedIds.has(product._id) && (
                              <FiCheck className="w-3.5 h-3.5 text-primary-500 flex-shrink-0" />
                            )}
                            <span className="font-medium text-gray-900 dark:text-white">
                              {product.name}
                            </span>
                          </div>
                        </td>
                        <td className="table-cell font-mono text-xs">{product.sku}</td>
                        <td className="table-cell font-mono text-xs">
                          {product.barcode ? (
                            <span className="text-primary-600 dark:text-primary-400">{product.barcode}</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="table-cell">
                          <span className={`${
                            (product.inventory?.quantity || 0) <= 0 ? 'text-danger-500 font-medium' :
                            (product.inventory?.quantity || 0) <= (product.inventory?.minStockLevel || 10) ? 'text-warning-500' :
                            ''
                          }`}>
                            {product.inventory?.quantity || 0}
                          </span>
                        </td>
                        <td className="table-cell font-medium">₹{(product.pricing?.sellingPrice || 0).toFixed(2)}</td>
                        {useSmartBarcode && (
                          <td className="table-cell text-xs text-gray-500">
                            {product.batchTracking && product.batches?.[0] ? (
                              <span className="flex items-center gap-1">
                                <FiLayers className="w-3 h-3" />
                                {product.batches[0].batchNumber}
                                {product.batches[0].expDate && (
                                  <span className="text-[10px]">
                                    | Exp: {new Date(product.batches[0].expDate).toLocaleDateString('en-IN')}
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-4">
                  {products.map((product) => (
                    <button
                      key={product._id}
                      onClick={() => toggleSelect(product._id)}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        selectedIds.has(product._id)
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        {selectedIds.has(product._id) ? (
                          <div className="w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
                            <FiCheck className="w-3 h-3 text-white" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 rounded-full" />
                        )}
                        {useSmartBarcode && product.batchTracking && (
                          <FiCpu className="w-3 h-3 text-info-500" title="Batch tracking enabled" />
                        )}
                      </div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{product.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{product.sku}</p>
                      {product.barcode && (
                        <p className="text-[10px] text-primary-500 font-mono mt-1 truncate">{product.barcode}</p>
                      )}
                      {useSmartBarcode && product.batches?.[0]?.batchNumber && (
                        <p className="text-[9px] text-info-500 mt-0.5 font-mono truncate">
                          Batch: {product.batches[0].batchNumber}
                        </p>
                      )}
                      <p className="text-xs font-bold text-gray-900 dark:text-white mt-1">
                        ₹{(product.pricing?.sellingPrice || 0).toFixed(2)}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Panel: Options + Generated Barcodes */}
        <div className="space-y-4">
          {/* GS1 Smart Barcode Options */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <FiCpu className="w-4 h-4 text-primary-500" />
                Barcode Options
              </h3>
              <button
                onClick={() => setUseSmartBarcode(!useSmartBarcode)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  useSmartBarcode ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  useSmartBarcode ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {/* Template Selection */}
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
                <FiSliders className="w-3 h-3" />
                Label Template
              </p>
              <div className="grid grid-cols-1 gap-2">
                {LABEL_TEMPLATES.map(tpl => (
                  <button
                    key={tpl.id}
                    onClick={() => setSelectedTemplate(tpl.id)}
                    className={`p-2 rounded-lg border-2 text-left transition-all ${
                      selectedTemplate === tpl.id
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <p className="text-xs font-semibold text-gray-900 dark:text-white">{tpl.label}</p>
                    <p className="text-[10px] text-gray-500">{tpl.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* GS1 Encoding Fields */}
            {useSmartBarcode && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
                  <FiSettings className="w-3 h-3" />
                  Encode in Barcode
                </p>
                <p className="text-[10px] text-info-600 dark:text-info-400 mb-2">
                  Select the data fields to encode into GS1-128 smart barcodes
                </p>
                <div className="space-y-1.5">
                  {GS1_FIELDS.map(field => {
                    const Icon = field.icon;
                    const isSelected = encodeFields.includes(field.key);
                    return (
                      <button
                        key={field.key}
                        onClick={() => toggleEncodeField(field.key)}
                        title={field.description}
                        className={`w-full flex items-center gap-2 p-2 rounded-lg text-xs transition-all ${
                          isSelected
                            ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800'
                            : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/50 border border-transparent'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                          isSelected
                            ? 'bg-primary-500 border-primary-500 text-white'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {isSelected && <FiCheck className="w-3 h-3" />}
                        </div>
                        <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                        <div className="text-left">
                          <p className="font-medium">{field.label}</p>
                          <p className="text-[9px] opacity-70">{field.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* GS1 Preview */}
                <div className="mt-3 p-3 bg-info-50 dark:bg-info-900/10 rounded-lg border border-info-200 dark:border-info-800">
                  <p className="text-[10px] font-semibold text-info-700 dark:text-info-300 mb-1">
                    GS1 Barcode Preview
                  </p>
                  <p className="text-[9px] text-info-600 dark:text-info-400 font-mono break-all">
                    (01)08901234567890
                    {encodeFields.includes('expiry') && '(15)260731'}
                    {encodeFields.includes('batch') && '(10)BATCH-001'}
                    {encodeFields.includes('mfgDate') && '(11)260115'}
                    {encodeFields.includes('price') && '(8005)0000025000'}
                    {encodeFields.includes('mrp') && '(3922)0000030000'}
                    {encodeFields.includes('mfgUnit') && '(8004)MAIN-PLANT'}
                  </p>
                  <p className="text-[8px] text-info-500 mt-1">
                    When scanned, barcode scanner decodes all embedded fields automatically
                  </p>
                </div>
              </div>
            )}

            {/* Generate Button */}
            <button
              onClick={generateBarcodes}
              disabled={selectedIds.size === 0 || generating}
              className="btn-primary w-full mt-4 flex items-center justify-center gap-2"
            >
              {generating ? (
                <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> Generating {selectedIds.size} Barcodes...</>
              ) : (
                <><FiTag className="w-4 h-4" /> {useSmartBarcode ? 'Generate GS1 Smart Barcodes' : 'Generate Barcodes'}
                  {selectedIds.size > 0 && ` (${selectedIds.size})`}</>
              )}
            </button>
          </div>

          {/* Generated Barcodes Preview */}
          <div className="card p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <FiTag className="w-4 h-4 text-primary-500" />
              Generated Barcodes
              {generatedBarcodes?.isSmart && (
                <span className="text-[10px] bg-info-100 dark:bg-info-900/20 text-info-600 dark:text-info-400 px-2 py-0.5 rounded-full ml-auto">
                  GS1 Smart
                </span>
              )}
            </h3>

            {!generatedBarcodes ? (
              <div className="text-center py-8 text-gray-400">
                <FiTag className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">
                  {selectedIds.size === 0
                    ? 'Select products and configure options above'
                    : `Ready to generate for ${selectedIds.size} product(s)`}
                </p>
                {selectedIds.size > 0 && !generating && (
                  <button
                    onClick={generateBarcodes}
                    className="btn-primary mt-4 text-sm"
                  >
                    Generate Now
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2 text-center">
                    <p className="text-xs text-gray-500">Total</p>
                    <p className="text-lg font-bold text-gray-900">{generatedBarcodes.total || 0}</p>
                  </div>
                  <div className="bg-success-50 dark:bg-success-900/20 rounded-lg p-2 text-center">
                    <p className="text-xs text-success-600">Generated</p>
                    <p className="text-lg font-bold text-success-600">{generatedBarcodes.generated || 0}</p>
                  </div>
                  <div className="bg-danger-50 dark:bg-danger-900/20 rounded-lg p-2 text-center">
                    <p className="text-xs text-danger-600">Failed</p>
                    <p className="text-lg font-bold text-danger-600">{generatedBarcodes.failed || 0}</p>
                  </div>
                </div>

                {/* Template Badge */}
                {generatedBarcodes.template && (
                  <div className="text-center">
                    <span className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">
                      Template: {generatedBarcodes.template}
                    </span>
                  </div>
                )}

                {/* Generated Barcode Images */}
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {generatedBarcodes.barcodes?.filter(b => b.imageUrl).map((b, i) => (
                    <div key={i} className={`p-3 rounded-lg text-center ${
                      b.isSmart ? 'bg-info-50 dark:bg-info-900/10 border border-info-200 dark:border-info-800' : 'bg-gray-50 dark:bg-gray-800/50'
                    }`}>
                      {b.isSmart && (
                        <span className="text-[9px] bg-info-500 text-white px-2 py-0.5 rounded-full mb-2 inline-block">
                          GS1 Smart
                        </span>
                      )}
                      <img
                        src={b.imageUrl}
                        alt={b.name}
                        className="mx-auto max-h-16 mb-2"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                      <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{b.name}</p>
                      <p className="text-[10px] text-gray-500 font-mono">{b.barcode}</p>

                      {/* GS1 Data Fields Display */}
                      {b.gs1Data && Object.keys(b.gs1Data).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2 justify-center">
                          {Object.entries(b.gs1Data).filter(([k, v]) => v && !['gtin'].includes(k)).map(([k, v]) => {
                            let display = v;
                            if (k === 'sellingPrice') display = `₹${parseFloat(v).toFixed(2)}`;
                            if (k === 'expiryDate') display = `Exp: ${new Date(v).toLocaleDateString('en-IN')}`;
                            if (k === 'mfgDate') display = `Mfg: ${new Date(v).toLocaleDateString('en-IN')}`;
                            if (k === 'batchNumber') display = `Batch: ${v}`;
                            if (k === 'mfgUnit') display = `Unit: ${v}`;
                            return (
                              <span key={k} className="text-[9px] px-1.5 py-0.5 bg-info-100 dark:bg-info-900/20 text-info-700 dark:text-info-300 rounded font-mono">
                                {display}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Failed items */}
                  {generatedBarcodes.barcodes?.filter(b => b.error).length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-medium text-danger-500 mb-2">Failed ({generatedBarcodes.failed}):</p>
                      {generatedBarcodes.barcodes.filter(b => b.error).map((b, i) => (
                        <div key={i} className="flex items-start gap-2 p-2 mb-1 bg-danger-50 dark:bg-danger-900/20 rounded text-xs">
                          <FiAlertTriangle className="w-3 h-3 text-danger-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-gray-900 dark:text-white">{b.name}</p>
                            <p className="text-danger-500">{b.error}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                {generatedBarcodes.barcodes?.filter(b => b.imageUrl).length > 0 && (
                  <div className="flex gap-2 pt-3 border-t dark:border-gray-700">
                    <button onClick={printLabels} className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm">
                      <FiPrinter className="w-4 h-4" /> Print
                    </button>
                    {generatedBarcodes.pdfUrl && (
                      <button onClick={downloadPdf} className="btn-secondary flex items-center justify-center gap-2 text-sm">
                        <FiDownloadCloud className="w-4 h-4" /> PDF
                      </button>
                    )}
                  </div>
                )}

                <button
                  onClick={clearSelection}
                  className="w-full text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 py-2"
                >
                  Clear & Start Over
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
