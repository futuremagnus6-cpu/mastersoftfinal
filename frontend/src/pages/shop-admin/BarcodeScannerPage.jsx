import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FiCamera, FiMinusCircle, FiCheck, FiX, FiRefreshCw,
  FiPackage, FiSearch, FiAlertTriangle, FiClock,
  FiLayers, FiCalendar, FiDollarSign, FiHash, FiZap,
} from 'react-icons/fi';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';

export default function BarcodeScannerPage() {
  const scanInputRef = useRef(null);
  const [scanInput, setScanInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scannedProduct, setScannedProduct] = useState(null);
  const [gs1Data, setGs1Data] = useState(null);
  const [deductQty, setDeductQty] = useState(1);
  const [deductReason, setDeductReason] = useState('');
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [deducting, setDeducting] = useState(false);
  const [scanHistory, setScanHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [continuousMode, setContinuousMode] = useState(false);
  const [batchDeduction, setBatchDeduction] = useState(null);

  // Auto-focus the scan input on mount
  useEffect(() => {
    scanInputRef.current?.focus();
  }, []);

  // Re-focus after deduction completes
  useEffect(() => {
    if (!deducting && !scannedProduct) {
      scanInputRef.current?.focus();
    }
  }, [deducting, scannedProduct]);

  const resetScan = useCallback(() => {
    setScannedProduct(null);
    setGs1Data(null);
    setDeductQty(1);
    setDeductReason('');
    setSelectedBatch(null);
    setBatchDeduction(null);
    setScanInput('');
    if (!continuousMode) {
      scanInputRef.current?.focus();
    }
  }, [continuousMode]);

  // Parse GS1 barcode to extract readable data fields
  const parseGs1Display = useCallback((rawBarcode) => {
    // Client-side GS1 detection
    if (!rawBarcode || !/\(\d{2,4}\)/.test(rawBarcode)) return null;
    
    const GS1_LABELS = {
      '01': 'GTIN', '10': 'Batch', '11': 'Mfg Date',
      '15': 'Expiry', '17': 'Use By', '21': 'Serial',
      '30': 'Qty', '37': 'Count', '8004': 'Unit',
      '8005': 'Price', '8007': 'IBV',
    };

    const fields = [];
    const regex = /\((\d{2,4})\)([^()]*)/g;
    let match;
    while ((match = regex.exec(rawBarcode)) !== null) {
      const ai = match[1];
      const val = match[2].trim();
      fields.push({ ai, label: GS1_LABELS[ai] || `AI-${ai}`, value: val });
    }

    return fields.length > 0 ? fields : null;
  }, []);

  // Handle barcode scan (Enter key on the input)
  const handleScan = async (e) => {
    if (e.key === 'Enter' && scanInput.trim()) {
      const rawBarcode = scanInput.trim();
      setScanning(true);

      // Check if it's a GS1 smart barcode
      const gs1Fields = parseGs1Display(rawBarcode);
      if (gs1Fields) {
        setGs1Data(gs1Fields);
      }

      try {
        const res = await apiService.getByBarcode(rawBarcode);
        if (res.data?.data) {
          const product = res.data.data;
          setScannedProduct(product);
          
          // Auto-select batch from GS1 data if available
          const batchField = gs1Fields?.find(f => f.ai === '10');
          if (batchField && product.batches?.length > 0) {
            const found = product.batches.find(b => b.batchNumber === batchField.value);
            if (found) setSelectedBatch(found);
          }

          // Auto-set expiry from GS1 data
          const expiryField = gs1Fields?.find(f => f.ai === '15' || f.ai === '17');
          if (expiryField && !deductReason) {
            // Save expiry info for display but don't auto-set reason
          }

          setDeductQty(1);
          toast.success(`Found: ${product.name}`);
        }
      } catch (err) {
        if (err.response?.status === 404) {
          toast.error(`No product found with barcode`);
        } else {
          toast.error('Error looking up barcode');
        }
        setScanInput('');
        if (continuousMode) {
          setTimeout(() => scanInputRef.current?.focus(), 100);
        }
      } finally {
        setScanning(false);
        
        // In continuous mode, keep focus on scan input
        if (continuousMode) {
          setTimeout(() => scanInputRef.current?.focus(), 100);
        }
      }
    }
  };

  // Deduct stock
  const handleDeduct = async () => {
    if (!scannedProduct) return;
    if (deductQty < 1) {
      toast.error('Quantity must be at least 1');
      return;
    }
    if (deductQty > (scannedProduct.inventory?.quantity || 0)) {
      toast.error(`Insufficient stock! Available: ${scannedProduct.inventory?.quantity || 0}`);
      return;
    }

    setDeducting(true);
    try {
      const payload = {
        barcode: scannedProduct.barcode,
        quantity: deductQty,
        reason: deductReason || (gs1Data ? `Smart scan: ${gs1Data.map(f => `${f.label}:${f.value}`).join(', ')}` : 'Quick scan deduction'),
      };

      // Include batch info if batch tracking is enabled
      if (scannedProduct.batchTracking) {
        if (selectedBatch?.batchNumber) {
          payload.batchNumber = selectedBatch.batchNumber;
        }
      }

      const res = await apiService.scanAndDeduct(payload);
      const result = res.data?.data?.product || res.data?.data;
      const gs1Parsed = res.data?.data?.gs1Parsed;
      const batchDeductionResult = res.data?.data?.batchDeduction;

      toast.success(res.data?.message || `Deducted ${deductQty} successfully`);

      // Add to history with GS1 info
      setScanHistory(prev => [{
        id: Date.now(),
        productName: scannedProduct.name,
        barcode: scannedProduct.barcode,
        quantity: deductQty,
        previousStock: result.previousStock || scannedProduct.inventory?.quantity,
        newStock: result.quantity,
        reason: deductReason || 'Quick scan deduction',
        time: new Date().toLocaleString('en-IN'),
        isSmartScan: !!gs1Parsed,
        gs1Fields: gs1Data || (gs1Parsed?.parsedFields),
        batchInfo: batchDeductionResult || null,
      }, ...prev].slice(0, 50));

      if (batchDeductionResult) {
        setBatchDeduction(batchDeductionResult);
      }

      if (continuousMode) {
        // In continuous mode, reset and refocus immediately
        resetScan();
        setTimeout(() => scanInputRef.current?.focus(), 50);
      } else {
        // Normal mode: reset and show success
        resetScan();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to deduct stock');
    } finally {
      setDeducting(false);
    }
  };

  // Quick deduct with Enter key
  const handleDeductKeyDown = (e) => {
    if (e.key === 'Enter' && scannedProduct) {
      handleDeduct();
    }
  };

  // Toggle continuous scan mode
  const toggleContinuousMode = () => {
    setContinuousMode(!continuousMode);
    toast.success(!continuousMode ? 'Continuous mode ON — scan and deduct without stopping' : 'Continuous mode OFF');
  };

  return (
    <div className="page-container max-w-4xl mx-auto">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FiCamera className="text-primary-500" />
            Barcode Scanner
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Scan barcodes to quickly deduct stock — supports GS1 smart barcodes with batch & expiry
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleContinuousMode}
            className={`btn-secondary flex items-center gap-2 ${
              continuousMode ? 'bg-success-500 text-white border-success-500 hover:bg-success-600' : ''
            }`}
          >
            <FiZap className={`w-4 h-4 ${continuousMode ? 'animate-pulse' : ''}`} />
            {continuousMode ? 'Continuous: ON' : 'Continuous'}
          </button>
          <button
            onClick={() => { resetScan(); setShowHistory(!showHistory); }}
            className={`btn-secondary flex items-center gap-2 ${showHistory ? 'bg-primary-50 text-primary-700 border-primary-300' : ''}`}
          >
            <FiClock className="w-4 h-4" />
            History ({scanHistory.length})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Scanner Area */}
        <div className="lg:col-span-2 space-y-4">
          {/* Barcode Input */}
          <div className="card p-6">
            <div className="text-center mb-6">
              <div className="w-20 h-20 mx-auto mb-4 bg-primary-50 dark:bg-primary-900/20 rounded-2xl flex items-center justify-center">
                <FiCamera className="w-10 h-10 text-primary-500" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                Scan a Barcode
              </h2>
              <p className="text-sm text-gray-500">
                Point your barcode scanner or type the barcode manually
              </p>
            </div>

            <div className="relative max-w-md mx-auto">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                ref={scanInputRef}
                type="text"
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                onKeyDown={handleScan}
                placeholder="Scan or type barcode here..."
                className="input-field pl-12 pr-4 py-4 text-lg text-center font-mono tracking-widest"
                autoFocus
                disabled={deducting}
              />
              {scanning && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary-500 border-t-transparent" />
                </div>
              )}
              {scanInput && !scanning && (
                <button
                  onClick={() => { setScanInput(''); setScannedProduct(null); setGs1Data(null); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <FiX className="w-4 h-4" />
                </button>
              )}
            </div>

            <p className="text-xs text-center text-gray-400 mt-3">
              {continuousMode
                ? '⚡ Continuous mode: scan → auto-deduct → ready for next scan'
                : 'Most barcode scanners act as keyboard input — just scan and the product will be found automatically'}
            </p>
          </div>

          {/* GS1 Smart Barcode Data Display */}
          {gs1Data && gs1Data.length > 0 && (
            <div className="card p-4 border-l-4 border-l-info-500">
              <p className="text-xs font-semibold text-info-600 dark:text-info-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <FiHash className="w-3 h-3" />
                GS1 Smart Barcode Decoded
              </p>
              <div className="flex flex-wrap gap-2">
                {gs1Data.map((field, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 dark:bg-gray-700 rounded-full text-xs">
                    <span className="font-medium text-gray-900 dark:text-white">{field.label}:</span>
                    <span className="text-primary-600 dark:text-primary-400 font-mono">{field.value}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Scanned Product Details */}
          {scannedProduct && (
            <div className="card p-6 border-2 border-primary-200 dark:border-primary-800 animate-slide-up">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <FiPackage className="text-primary-500" />
                    {scannedProduct.name}
                  </h3>
                  <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                    <span>SKU: {scannedProduct.sku}</span>
                    <span>Barcode: {scannedProduct.barcode}</span>
                  </div>
                </div>
                <button
                  onClick={resetScan}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              {/* Batch Info from GS1 */}
              {gs1Data && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                  {gs1Data.filter(f => ['11','15','17','10','8004','8005'].includes(f.ai)).map((field, i) => (
                    <div key={i} className="bg-info-50 dark:bg-info-900/10 rounded-lg p-2 text-center">
                      <p className="text-[10px] text-info-600 dark:text-info-400 font-medium">{field.label}</p>
                      <p className="text-xs font-bold text-gray-900 dark:text-white mt-0.5 font-mono">
                        {field.ai === '8005' ? `₹${(parseFloat(field.value) / 100).toFixed(2)}` : field.value}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Stock Info */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">Current Stock</p>
                  <p className={`text-2xl font-bold ${
                    (scannedProduct.inventory?.quantity || 0) <= 0 ? 'text-danger-500' :
                    (scannedProduct.inventory?.quantity || 0) <= (scannedProduct.inventory?.minStockLevel || 10) ? 'text-warning-500' :
                    'text-success-500'
                  }`}>
                    {scannedProduct.inventory?.quantity || 0}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">Selling Price</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    ₹{scannedProduct.pricing?.sellingPrice?.toFixed(2)}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">Batch Tracking</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {scannedProduct.batchTracking ? (scannedProduct.batches?.length || 0) : 'OFF'}
                  </p>
                </div>
              </div>

              {/* Batch Selection (if batch tracking enabled) */}
              {scannedProduct.batchTracking && scannedProduct.batches?.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                    <FiLayers className="w-3 h-3" />
                    Select Batch to Deduct From:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {scannedProduct.batches.map((batch, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedBatch(selectedBatch?.batchNumber === batch.batchNumber ? null : batch)}
                        className={`p-3 rounded-lg border-2 text-left transition-all ${
                          selectedBatch?.batchNumber === batch.batchNumber
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-gray-900 dark:text-white font-mono">
                            {batch.batchNumber || `Batch ${i + 1}`}
                          </span>
                          <span className="text-xs font-bold text-gray-900 dark:text-white">
                            {batch.quantity} left
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-gray-500">
                          {batch.expDate && (
                            <span className="flex items-center gap-1">
                              <FiCalendar className="w-2.5 h-2.5" />
                              Exp: {new Date(batch.expDate).toLocaleDateString('en-IN')}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Batch Deduction Result */}
              {batchDeduction && (
                <div className="flex items-center gap-2 p-3 mb-4 bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 rounded-lg">
                  <FiCheck className="w-5 h-5 text-success-500 flex-shrink-0" />
                  <p className="text-sm text-success-700 dark:text-success-300">
                    Batch <strong>{batchDeduction.batchNumber}</strong> updated 
                    {batchDeduction.batchExpiry && ` (Exp: ${new Date(batchDeduction.batchExpiry).toLocaleDateString('en-IN')})`}
                  </p>
                </div>
              )}

              {/* Stock Warning */}
              {(scannedProduct.inventory?.quantity || 0) <= 0 && (
                <div className="flex items-center gap-2 p-3 mb-4 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg">
                  <FiAlertTriangle className="w-5 h-5 text-danger-500 flex-shrink-0" />
                  <p className="text-sm text-danger-700 dark:text-danger-300">
                    This product is out of stock! You cannot deduct further.
                  </p>
                </div>
              )}

              {(scannedProduct.inventory?.quantity || 0) > 0 &&
               (scannedProduct.inventory?.quantity || 0) <= (scannedProduct.inventory?.minStockLevel || 10) && (
                <div className="flex items-center gap-2 p-3 mb-4 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-lg">
                  <FiAlertTriangle className="w-5 h-5 text-warning-500 flex-shrink-0" />
                  <p className="text-sm text-warning-700 dark:text-warning-300">
                    Low stock alert! Only {scannedProduct.inventory?.quantity} remaining.
                  </p>
                </div>
              )}

              {/* Deduction Form */}
              {scannedProduct.inventory?.quantity > 0 && (
                <div className="border-t dark:border-gray-700 pt-4 space-y-3">
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Quantity to Deduct
                      </label>
                      <input
                        type="number"
                        value={deductQty}
                        onChange={(e) => setDeductQty(Math.max(1, parseInt(e.target.value) || 1))}
                        onKeyDown={handleDeductKeyDown}
                        min="1"
                        max={scannedProduct.inventory?.quantity || 0}
                        className="input-field text-lg font-bold py-3"
                        disabled={deducting}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Reason (optional)
                      </label>
                      <input
                        type="text"
                        value={deductReason}
                        onChange={(e) => setDeductReason(e.target.value)}
                        onKeyDown={handleDeductKeyDown}
                        placeholder="e.g. Damaged, Sold, Expired"
                        className="input-field py-3"
                        disabled={deducting}
                      />
                    </div>
                    <button
                      onClick={handleDeduct}
                      disabled={deducting || deductQty < 1 || deductQty > (scannedProduct.inventory?.quantity || 0)}
                      className="btn-danger flex items-center gap-2 py-3 px-6 h-[48px] whitespace-nowrap"
                    >
                      {deducting ? (
                        <><div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" /> Deducting...</>
                      ) : (
                        <><FiMinusCircle className="w-5 h-5" /> Deduct {deductQty}</>
                      )}
                    </button>
                  </div>

                  <p className="text-xs text-gray-400">
                    After deduction: <strong className="text-gray-700 dark:text-gray-300">
                      {Math.max(0, (scannedProduct.inventory?.quantity || 0) - deductQty)} units remaining
                    </strong>
                    {selectedBatch && (
                      <span className="ml-2">| Batch: <span className="font-mono">{selectedBatch.batchNumber}</span></span>
                    )}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {!scannedProduct && (
            <div className="card p-12 text-center">
              <FiCamera className="w-16 h-16 mx-auto mb-4 text-gray-200 dark:text-gray-600" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {continuousMode ? '⚡ Continuous Scan Mode' : 'Ready to Scan'}
              </h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                {continuousMode
                  ? 'Scan barcodes one after another. Each scan deducts 1 unit automatically. Press Enter to confirm deduction manually.'
                  : 'Scan a product barcode to see its details and deduct stock.'}
              </p>
              <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400">
                <FiRefreshCw className="w-3 h-3" />
                <span>
                  {continuousMode
                    ? 'Barcodes with GS1 data (batch, expiry, price) auto-parse on scan'
                    : 'Supports GS1 smart barcodes with embedded batch, expiry & price data'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Scan History Sidebar */}
        <div className="space-y-4">
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <FiClock className="w-4 h-4 text-gray-400" />
                Recent Scans
              </h3>
              {scanHistory.length > 0 && (
                <button
                  onClick={() => setScanHistory([])}
                  className="text-xs text-danger-500 hover:text-danger-600"
                >
                  Clear All
                </button>
              )}
            </div>

            {scanHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <FiClock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">No scans yet</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {scanHistory.map((entry) => (
                  <div
                    key={entry.id}
                    className={`p-3 rounded-lg text-sm ${
                      entry.isSmartScan
                        ? 'bg-info-50 dark:bg-info-900/10 border border-info-200 dark:border-info-800'
                        : 'bg-gray-50 dark:bg-gray-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900 dark:text-white truncate flex items-center gap-1.5">
                        {entry.isSmartScan && <FiHash className="w-3 h-3 text-info-500" />}
                        {entry.productName}
                      </p>
                      <span className="text-xs font-bold text-danger-600 dark:text-danger-400 ml-2 flex-shrink-0">
                        -{entry.quantity}
                      </span>
                    </div>

                    {entry.gs1Fields && entry.gs1Fields.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {entry.gs1Fields.slice(0, 3).map((f, i) => (
                          <span key={i} className="text-[9px] px-1 py-0.5 bg-info-100 dark:bg-info-900/20 text-info-700 dark:text-info-300 rounded font-mono">
                            {f.label}:{f.value?.substring(0, 12)}
                          </span>
                        ))}
                      </div>
                    )}

                    {entry.batchInfo && (
                      <div className="text-[10px] text-success-600 mt-0.5 flex items-center gap-1">
                        <FiLayers className="w-2.5 h-2.5" />
                        Batch: {entry.batchInfo.batchNumber}
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-500 font-medium">
                        {entry.previousStock} → {entry.newStock}
                      </span>
                      <span className="text-[10px] text-gray-400">{entry.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="card p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Today's Summary</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Total Scans</span>
                <span className="font-bold text-gray-900 dark:text-white">{scanHistory.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Total Deducted</span>
                <span className="font-bold text-danger-600 dark:text-danger-400">
                  {scanHistory.reduce((s, e) => s + e.quantity, 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Smart Scans</span>
                <span className="font-bold text-info-600 dark:text-info-400">
                  {scanHistory.filter(e => e.isSmartScan).length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
