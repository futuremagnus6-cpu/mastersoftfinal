import React, { useState, useRef, useCallback } from 'react';
import {
  FiUpload, FiX, FiCheck, FiAlertCircle, FiFileText,
  FiImage, FiDownload, FiTrash2, FiRefreshCw,
  FiEdit2, FiSearch, FiChevronDown, FiChevronUp,
} from 'react-icons/fi';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';

const GST_RATES = [0, 5, 12, 18, 28];
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/bmp', 'image/tiff'];

const STATUS = {
  IDLE: 'idle',
  UPLOADING: 'uploading',
  PROCESSING: 'processing',
  PREVIEW: 'preview',
  SAVING: 'saving',
  DONE: 'done',
  ERROR: 'error',
};

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function parseQty(val) {
  const n = parseInt(val, 10);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function parsePrice(val) {
  const n = parseFloat(val);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

export default function AiImportModal({ isOpen, onClose, onImported }) {
  const [status, setStatus] = useState(STATUS.IDLE);
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [products, setProducts] = useState([]);
  const [totalExtracted, setTotalExtracted] = useState(0);
  const [existingCount, setExistingCount] = useState(0);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [updateExisting, setUpdateExisting] = useState(true);
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState('asc');
  const [editingIndex, setEditingIndex] = useState(-1);
  const [editForm, setEditForm] = useState(null);
  const fileInputRef = useRef(null);

  const reset = useCallback(() => {
    setStatus(STATUS.IDLE);
    setFile(null);
    setProducts([]);
    setTotalExtracted(0);
    setExistingCount(0);
    setProgress(0);
    setProgressText('');
    setEditingIndex(-1);
    setEditForm(null);
  }, []);

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFileSelect = useCallback((selectedFile) => {
    if (!selectedFile) return;

    if (!ALLOWED_TYPES.includes(selectedFile.type)) {
      const ext = selectedFile.name.split('.').pop().toLowerCase();
      if (!['pdf', 'jpg', 'jpeg', 'png', 'webp', 'bmp', 'tiff', 'tif'].includes(ext)) {
        toast.error('Please upload a PDF invoice, price list, or product image (JPG, PNG, WebP)');
        return;
      }
    }

    if (selectedFile.size > 20 * 1024 * 1024) {
      toast.error('File size must be under 20MB');
      return;
    }

    setFile(selectedFile);
    uploadAndExtract(selectedFile);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) handleFileSelect(droppedFile);
  }, [handleFileSelect]);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const uploadAndExtract = async (file) => {
    setStatus(STATUS.UPLOADING);
    setProgress(20);
    setProgressText('Uploading file...');

    try {
      const formData = new FormData();
      formData.append('file', file);

      setProgress(40);
      setProgressText('Running OCR and extracting product data...');

      const aiRes = await apiService.aiImport(formData, {
        onUploadProgress: (e) => {
          const pct = Math.round((e.loaded / e.total) * 50) + 20;
          setProgress(Math.min(95, pct));
        },
      });

      setProgress(100);
      setProgressText('Extraction complete!');

      const data = aiRes.data?.data || aiRes.data || {};
      const extractedProducts = data.products || [];

      setProducts(extractedProducts);
      setTotalExtracted(data.totalExtracted || extractedProducts.length);
      setExistingCount(data.existingCount || 0);
      setStatus(STATUS.PREVIEW);

      if (extractedProducts.length === 0) {
        toast.error('No products could be extracted from this file. Try a clearer image or different file format.');
      } else {
        toast.success(`Extracted ${extractedProducts.length} products`);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to process file';
      toast.error(msg);
      setStatus(STATUS.ERROR);
    }
  };

  const toggleProduct = (index) => {
    setProducts(prev => prev.map((p, i) =>
      i === index ? { ...p, _selected: !p._selected } : p
    ));
  };

  const selectAll = () => {
    setProducts(prev => prev.map(p => ({ ...p, _selected: true })));
  };

  const deselectAll = () => {
    setProducts(prev => prev.map(p => ({ ...p, _selected: false })));
  };

  const removeProduct = (index) => {
    setProducts(prev => prev.filter((_, i) => i !== index));
  };

  const startEdit = (index) => {
    setEditingIndex(index);
    setEditForm({ ...products[index] });
  };

  const cancelEdit = () => {
    setEditingIndex(-1);
    setEditForm(null);
  };

  const saveEdit = () => {
    if (!editForm) return;
    setProducts(prev => prev.map((p, i) =>
      i === editingIndex ? { ...editForm } : p
    ));
    setEditingIndex(-1);
    setEditForm(null);
  };

  const handleEditChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleEditNested = (parent, field, value) => {
    setEditForm(prev => ({
      ...prev,
      [parent]: { ...(prev[parent] || {}), [field]: value },
    }));
  };

  const sortProducts = (key) => {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortedProducts = [...products].sort((a, b) => {
    if (!sortKey) return 0;
    let va = a[sortKey], vb = b[sortKey];
    if (sortKey === 'mrp' || sortKey === 'sellingPrice' || sortKey === 'quantity') {
      va = Number(va) || 0;
      vb = Number(vb) || 0;
    } else {
      va = String(va || '').toLowerCase();
      vb = String(vb || '').toLowerCase();
    }
    if (va < vb) return sortDir === 'asc' ? -1 : 1;
    if (va > vb) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const selectedCount = products.filter(p => p._selected).length;

  const handleConfirmImport = async () => {
    const selected = products.filter(p => p._selected);
    if (selected.length === 0) {
      toast.error('No products selected for import');
      return;
    }

    setStatus(STATUS.SAVING);
    setProgressText(`Importing ${selected.length} products...`);

    try {
      const res = await apiService.aiImportConfirm({
        products: selected,
        updateExisting,
      });

      const data = res.data?.data || res.data || {};
      const msg = res.data?.message || 'Import completed';
      toast.success(msg);
      reset();
      if (onImported) onImported(data);
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Import failed';
      toast.error(msg);
      setStatus(STATUS.PREVIEW);
    }
  };

  const SortHeader = ({ label, field }) => (
    <th
      className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none whitespace-nowrap"
      onClick={() => sortProducts(field)}
    >
      <span className="flex items-center gap-1">
        {label}
        {sortKey === field && (
          <span className="text-gray-400">{sortDir === 'asc' ? '↑' : '↓'}</span>
        )}
      </span>
    </th>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 pb-8 bg-black/50 backdrop-blur-sm overflow-y-auto" onClick={handleClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-5xl mx-4 animate-slide-up max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <FiUpload className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">AI Product Import</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Extract products from PDF invoices, price lists, and images using OCR
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <FiX className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {status === STATUS.IDLE || status === STATUS.ERROR ? (
            /* ─── Upload Zone ─── */
            <div className="space-y-4">
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                  dragOver
                    ? 'border-violet-400 bg-violet-50 dark:bg-violet-900/20 scale-[1.02]'
                    : 'border-gray-300 dark:border-gray-600 hover:border-violet-300 dark:hover:border-violet-500 hover:bg-gray-50 dark:hover:bg-gray-750'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.bmp,.tiff"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
                    e.target.value = '';
                  }}
                />
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                  <FiUpload className="w-7 h-7 text-violet-600 dark:text-violet-400" />
                </div>
                <p className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                  Drop your file here or click to browse
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  PDF invoices, price lists, catalogs, product images
                </p>
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  <span className="px-2.5 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs text-gray-600 dark:text-gray-300">📄 PDF</span>
                  <span className="px-2.5 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs text-gray-600 dark:text-gray-300">🖼️ JPG / PNG</span>
                  <span className="px-2.5 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs text-gray-600 dark:text-gray-300">📋 Price List</span>
                  <span className="px-2.5 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs text-gray-600 dark:text-gray-300">🧾 Invoice</span>
                </div>
              </div>

              {status === STATUS.ERROR && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300 flex items-start gap-3">
                  <FiAlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Processing failed</p>
                    <p>Try a clearer image, different file format, or check that the file isn't corrupted.</p>
                  </div>
                </div>
              )}
            </div>
          ) : status === STATUS.UPLOADING || status === STATUS.PROCESSING ? (
            /* ─── Progress ─── */
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-20 h-20 mb-6 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center animate-pulse shadow-xl">
                <FiFileText className="w-8 h-8 text-white" />
              </div>
              <div className="w-full max-w-md">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">{progressText}</span>
                  <span className="text-gray-500">{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-violet-500 to-indigo-600 h-full rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-2">This may take a moment for large files...</p>
              </div>
            </div>
          ) : status === STATUS.PREVIEW ? (
            /* ─── Preview Table ─── */
            <div className="space-y-4">
              {/* Summary */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-xl">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-violet-500" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {totalExtracted} products found
                    </span>
                  </div>
                  {existingCount > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <span className="text-sm text-amber-700 dark:text-amber-400">
                        {existingCount} duplicates detected
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-sm text-emerald-700 dark:text-emerald-400">
                      {selectedCount} selected
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={selectAll} className="text-xs px-2.5 py-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium transition-colors">
                    Select All
                  </button>
                  <button onClick={deselectAll} className="text-xs px-2.5 py-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium transition-colors">
                    Deselect All
                  </button>
                </div>
              </div>

              {/* Duplicate handling toggle */}
              {existingCount > 0 && (
                <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                  <FiAlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                      Duplicate products detected
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      Products with existing barcodes will be updated with new stock and pricing
                    </p>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs text-gray-600 dark:text-gray-300">Update existing</span>
                    <button
                      onClick={() => setUpdateExisting(!updateExisting)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${updateExisting ? 'bg-violet-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${updateExisting ? 'translate-x-4.5' : 'translate-x-1'}`} />
                    </button>
                  </label>
                </div>
              )}

              {/* Product Table */}
              {products.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <FiFileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No products could be extracted</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border dark:border-gray-700">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th className="px-2 py-2 w-8 bg-gray-50 dark:bg-gray-900">
                          <input
                            type="checkbox"
                            checked={selectedCount === products.length}
                            onChange={() => selectedCount === products.length ? deselectAll() : selectAll()}
                            className="rounded border-gray-300"
                          />
                        </th>
                        <SortHeader label="Name" field="name" />
                        <SortHeader label="Barcode" field="barcode" />
                        <SortHeader label="HSN" field="hsnCode" />
                        <SortHeader label="Qty" field="quantity" />
                        <SortHeader label="MRP" field="mrp" />
                        <SortHeader label="Price" field="sellingPrice" />
                        <SortHeader label="GST" field="gstRate" />
                        <SortHeader label="Batch" field="batchNumber" />
                        <SortHeader label="Category" field="category" />
                        <th className="px-2 py-2 text-[10px] font-semibold text-gray-500 bg-gray-50 dark:bg-gray-900 w-16">Status</th>
                        <th className="px-2 py-2 text-[10px] font-semibold text-gray-500 bg-gray-50 dark:bg-gray-900 w-12">Edit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-gray-700">
                      {sortedProducts.map((product, idx) => {
                        const originalIndex = products.indexOf(product);
                        const isEditing = editingIndex === originalIndex;

                        if (isEditing && editForm) {
                          return (
                            <tr key={idx} className="bg-violet-50/50 dark:bg-violet-900/10">
                              <td className="px-2 py-1.5">
                                <input
                                  type="checkbox"
                                  checked={editForm._selected}
                                  onChange={() => setEditForm(prev => ({ ...prev, _selected: !prev._selected }))}
                                  className="rounded border-gray-300"
                                />
                              </td>
                              <td className="px-2 py-1.5">
                                <input
                                  value={editForm.name}
                                  onChange={e => handleEditChange('name', e.target.value)}
                                  className="input-field text-xs py-1 w-36"
                                  placeholder="Product name"
                                />
                              </td>
                              <td className="px-2 py-1.5">
                                <input
                                  value={editForm.barcode || ''}
                                  onChange={e => handleEditChange('barcode', e.target.value)}
                                  className="input-field text-xs py-1 w-24"
                                  placeholder="Barcode"
                                />
                              </td>
                              <td className="px-2 py-1.5">
                                <input
                                  value={editForm.hsnCode || ''}
                                  onChange={e => handleEditChange('hsnCode', e.target.value)}
                                  className="input-field text-xs py-1 w-20"
                                  placeholder="HSN"
                                />
                              </td>
                              <td className="px-2 py-1.5">
                                <input
                                  type="number"
                                  value={editForm.quantity || 0}
                                  onChange={e => handleEditChange('quantity', parseQty(e.target.value))}
                                  className="input-field text-xs py-1 w-16 text-center"
                                  min="0"
                                />
                              </td>
                              <td className="px-2 py-1.5">
                                <input
                                  type="number"
                                  value={editForm.mrp || 0}
                                  onChange={e => handleEditChange('mrp', parsePrice(e.target.value))}
                                  className="input-field text-xs py-1 w-20 text-right"
                                  min="0"
                                  step="0.01"
                                />
                              </td>
                              <td className="px-2 py-1.5">
                                <input
                                  type="number"
                                  value={editForm.sellingPrice || 0}
                                  onChange={e => handleEditChange('sellingPrice', parsePrice(e.target.value))}
                                  className="input-field text-xs py-1 w-20 text-right"
                                  min="0"
                                  step="0.01"
                                />
                              </td>
                              <td className="px-2 py-1.5">
                                <select
                                  value={editForm.gstRate || 18}
                                  onChange={e => handleEditChange('gstRate', parseInt(e.target.value))}
                                  className="input-field text-xs py-1 w-16"
                                >
                                  {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                                </select>
                              </td>
                              <td className="px-2 py-1.5">
                                <input
                                  value={editForm.batchNumber || ''}
                                  onChange={e => handleEditChange('batchNumber', e.target.value)}
                                  className="input-field text-xs py-1 w-20"
                                  placeholder="Batch"
                                />
                              </td>
                              <td className="px-2 py-1.5">
                                <input
                                  value={editForm.category || ''}
                                  onChange={e => handleEditChange('category', e.target.value)}
                                  className="input-field text-xs py-1 w-24"
                                  placeholder="Category"
                                />
                              </td>
                              <td className="px-2 py-1.5" colSpan={2}>
                                <div className="flex gap-1">
                                  <button onClick={saveEdit} className="p-1 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 hover:bg-emerald-200">
                                    <FiCheck className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={cancelEdit} className="p-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200">
                                    <FiX className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        }

                        return (
                          <tr
                            key={idx}
                            className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${!product._selected ? 'opacity-50' : ''} ${product._duplicate ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}`}
                          >
                            <td className="px-2 py-2">
                              <input
                                type="checkbox"
                                checked={product._selected}
                                onChange={() => toggleProduct(originalIndex)}
                                className="rounded border-gray-300"
                              />
                            </td>
                            <td className="px-2 py-2 text-xs font-medium text-gray-900 dark:text-white max-w-[150px] truncate">
                              {product.name || '—'}
                            </td>
                            <td className="px-2 py-2 text-xs font-mono text-gray-600 dark:text-gray-400">
                              {product.barcode || '—'}
                            </td>
                            <td className="px-2 py-2 text-xs font-mono text-gray-500">
                              {product.hsnCode || '—'}
                            </td>
                            <td className="px-2 py-2 text-xs text-center font-medium text-gray-900 dark:text-white">
                              {product.quantity || 0}
                            </td>
                            <td className="px-2 py-2 text-xs text-right text-gray-600 dark:text-gray-400">
                              {product.mrp ? `₹${Number(product.mrp).toFixed(2)}` : '—'}
                            </td>
                            <td className="px-2 py-2 text-xs text-right font-medium text-gray-900 dark:text-white">
                              {product.sellingPrice ? `₹${Number(product.sellingPrice).toFixed(2)}` : '—'}
                            </td>
                            <td className="px-2 py-2 text-xs text-center">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                [0, 5, 12, 18, 28].includes(Number(product.gstRate))
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                  : 'bg-gray-100 text-gray-500'
                              }`}>
                                {product.gstRate || 0}%
                              </span>
                            </td>
                            <td className="px-2 py-2 text-xs text-gray-500 font-mono">
                              {product.batchNumber || '—'}
                            </td>
                            <td className="px-2 py-2 text-xs text-gray-600 dark:text-gray-400">
                              <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px]">
                                {product.category || 'Uncategorized'}
                              </span>
                            </td>
                            <td className="px-2 py-2">
                              {product._duplicate ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded text-[10px] font-medium">
                                  <FiAlertCircle className="w-3 h-3" />
                                  Duplicate
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded text-[10px] font-medium">
                                  <FiCheck className="w-3 h-3" />
                                  New
                                </span>
                              )}
                            </td>
                            <td className="px-2 py-2">
                              <button
                                onClick={() => startEdit(originalIndex)}
                                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-violet-600 transition-colors"
                                title="Edit"
                              >
                                <FiEdit2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : status === STATUS.SAVING ? (
            /* ─── Saving ─── */
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-20 h-20 mb-6 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center animate-pulse shadow-xl">
                <FiCheck className="w-8 h-8 text-white" />
              </div>
              <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Saving products...</p>
              <p className="text-sm text-gray-500">{progressText}</p>
              <div className="w-full max-w-md mt-4">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full animate-pulse" style={{ width: '60%' }} />
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-4 border-t dark:border-gray-700 flex-shrink-0 bg-gray-50 dark:bg-gray-900 rounded-b-2xl">
          <div className="text-xs text-gray-500">
            {status === STATUS.PREVIEW && (
              <span>{selectedCount} of {products.length} products selected</span>
            )}
            {file && status !== STATUS.IDLE && (
              <span className="ml-3">{file.name} ({formatFileSize(file.size)})</span>
            )}
          </div>
          <div className="flex gap-2">
            {status === STATUS.PREVIEW && (
              <>
                <button onClick={reset} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2">
                  <FiRefreshCw className="w-4 h-4" /> New File
                </button>
                <button
                  onClick={handleConfirmImport}
                  disabled={selectedCount === 0}
                  className="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-lg hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-lg shadow-violet-200 dark:shadow-violet-900/30"
                >
                  <FiDownload className="w-4 h-4" /> Import {selectedCount} Product{selectedCount !== 1 ? 's' : ''}
                </button>
              </>
            )}
            {status === STATUS.IDLE || status === STATUS.ERROR ? (
              <button onClick={handleClose} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                Cancel
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}