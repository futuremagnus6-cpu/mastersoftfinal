import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiBox, FiDownload, FiUpload, FiX, FiFilter, FiGlobe, FiLink, FiCheckSquare, FiSquare } from 'react-icons/fi';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';
import { getAssetUrl, getMainImageUrl } from '../../utils/assets';

const GST_RATES = [0, 5, 12, 18, 28];

function ProductModal({ isOpen, onClose, product, onSave }) {
  const [form, setForm] = useState({ name: '', sku: '', barcode: '', category: '', brand: '', unit: 'pcs', pricing: { mrp: 0, sellingPrice: 0, purchasePrice: 0, gstRate: 18 }, tax: { hsnCode: '' }, inventory: { quantity: 0, minStockLevel: 10 }, description: '', images: [] });
  const [newImageUrl, setNewImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (product) {
      setForm({ name: product.name || '', sku: product.sku || '', barcode: product.barcode || '', category: product.category || '', brand: product.brand || '', unit: product.unit || 'pcs', pricing: product.pricing || { mrp: 0, sellingPrice: 0, purchasePrice: 0, gstRate: 18 }, tax: product.tax || { hsnCode: '' }, inventory: product.inventory || { quantity: 0, minStockLevel: 10 }, description: product.description || '', images: product.images || [] });
    } else {
      setForm({ name: '', sku: `SKU-${Date.now().toString(36).toUpperCase()}`, barcode: '', category: '', brand: '', unit: 'pcs', pricing: { mrp: 0, sellingPrice: 0, purchasePrice: 0, gstRate: 18 }, tax: { hsnCode: '' }, inventory: { quantity: 0, minStockLevel: 10 }, description: '', images: [] });
    }
    setNewImageUrl('');
  }, [product, isOpen]);

  if (!isOpen) return null;

  const handleAddImageLink = () => {
    if (!newImageUrl.trim()) return;
    setForm(f => ({
      ...f,
      images: [...f.images, { url: newImageUrl.trim(), type: 'link', isMain: f.images.length === 0 }]
    }));
    setNewImageUrl('');
  };

  const handleRemoveImage = (index) => {
    setForm(f => {
      const newImages = f.images.filter((_, i) => i !== index);
      if (newImages.length > 0 && !newImages.some(img => img.isMain)) {
        newImages[0].isMain = true;
      }
      return { ...f, images: newImages };
    });
  };

  const handleSetMainImage = (index) => {
    setForm(f => ({ ...f, images: f.images.map((img, i) => ({ ...img, isMain: i === index })) }));
  };

  const uploadImageFiles = async (fileList) => {
    const files = Array.from(fileList || []).filter(f => f.type.startsWith('image/'));
    if (files.length === 0) return;
    const oversized = files.filter(f => f.size > 10 * 1024 * 1024);
    if (oversized.length > 0) { toast.error(`${oversized.length} file(s) exceed 10MB limit`); return; }
    setUploading(true);
    try {
      for (const file of files) {
        try {
          const fd = new FormData();
          fd.append('file', file);
          const res = await apiService.uploadFile(fd);
          const uploadedUrl = res.data?.data?.url || res.data?.url;
          if (uploadedUrl) {
            setForm(f => ({ ...f, images: [...f.images, { url: uploadedUrl, type: 'upload', isMain: f.images.length === 0 }] }));
          } else {
            toast.error(`Upload completed but no URL was returned for ${file.name}`);
          }
        } catch (err) {
          toast.error(err.response?.data?.message || err.message || `Failed to upload ${file.name}`);
        }
      }
    } finally {
      setUploading(false);
    }
  };

  const handleImageUpload = async (e) => {
    if (!e.target.files) return;
    await uploadImageFiles(e.target.files);
    e.target.value = '';
  };

  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); };
  const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setDragOver(false); };
  const handleDrop = async (e) => {
    e.preventDefault(); e.stopPropagation();
    setDragOver(false);
    await uploadImageFiles(e.dataTransfer?.files);
  };

  const handleChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setForm(f => ({ ...f, [parent]: { ...f[parent], [child]: value } }));
    } else setForm(f => ({ ...f, [field]: value }));
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (product) await apiService.updateProduct(product._id, form);
      else await apiService.createProduct(form);
      toast.success(product ? 'Product updated' : 'Product created');
      onSave();
      onClose();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save product'); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700"><h3 className="text-lg font-semibold">{product ? 'Edit Product' : 'New Product'}</h3><button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><FiX className="w-5 h-5" /></button></div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* ── Photos Section ── */}
          <div className="border dark:border-gray-700 rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Product Photos</h4>

            {/* Image grid */}
            {form.images.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {form.images.map((img, idx) => (
                  <div key={idx} className="relative group rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                    <img src={getAssetUrl(img.url)} alt={form.name ? `${form.name} photo` : 'Product photo'} className="w-full h-20 object-cover" />
                    {img.isMain && <span className="absolute top-1 left-1 bg-primary-500 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">Main</span>}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1">
                      {!img.isMain && (
                        <button type="button" onClick={() => handleSetMainImage(idx)} className="px-1.5 py-0.5 bg-white/90 text-gray-800 rounded text-[10px] font-medium hover:bg-white">Main</button>
                      )}
                      <button type="button" onClick={() => handleRemoveImage(idx)} className="px-1.5 py-0.5 bg-danger-500 text-white rounded text-[10px] font-medium">×</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Upload area */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById('productImageUpload')?.click()}
              className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all ${
                dragOver
                  ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20 scale-[1.01]'
                  : 'border-gray-300 dark:border-gray-600 hover:border-primary-300 dark:hover:border-primary-500'
              }`}
            >
              <input type="file" id="productImageUpload" accept="image/*" multiple className="hidden" onChange={handleImageUpload} disabled={uploading} />
              {dragOver ? (
                <p className="text-sm font-medium text-primary-600 dark:text-primary-400">Drop photos here</p>
              ) : (
                <>
                  <svg className="w-8 h-8 mx-auto text-gray-400 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <p className="text-xs text-gray-500">{uploading ? 'Uploading…' : 'Click or drag photos here'}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">PNG, JPG, WebP up to 10MB</p>
                </>
              )}
            </div>

            {/* URL import */}
            <div className="flex gap-2">
              <input type="text" value={newImageUrl} onChange={e => setNewImageUrl(e.target.value)} placeholder="Or paste image URL…" className="input-field flex-1 text-sm" onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddImageLink())} />
              <button type="button" onClick={handleAddImageLink} className="btn-secondary text-sm whitespace-nowrap">Add Link</button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className="block text-sm font-medium mb-1">Product Name *</label><input value={form.name} onChange={e => handleChange('name', e.target.value)} className="input-field" required /></div>
            <div><label className="block text-sm font-medium mb-1">SKU *</label><input value={form.sku} onChange={e => handleChange('sku', e.target.value)} className="input-field" required /></div>
            <div><label className="block text-sm font-medium mb-1">Barcode</label><input value={form.barcode} onChange={e => handleChange('barcode', e.target.value)} className="input-field" /></div>
            <div><label className="block text-sm font-medium mb-1">Category</label><input value={form.category} onChange={e => handleChange('category', e.target.value)} placeholder="Uncategorized" className="input-field" /></div>
            <div><label className="block text-sm font-medium mb-1">Brand</label><input value={form.brand} onChange={e => handleChange('brand', e.target.value)} className="input-field" /></div>
            <div><label className="block text-sm font-medium mb-1">MRP</label><input type="number" value={form.pricing.mrp} onChange={e => handleChange('pricing.mrp', parseFloat(e.target.value) || 0)} className="input-field" min="0" step="0.01" /></div>
            <div><label className="block text-sm font-medium mb-1">Selling Price *</label><input type="number" value={form.pricing.sellingPrice} onChange={e => handleChange('pricing.sellingPrice', parseFloat(e.target.value) || 0)} className="input-field" required min="0" step="0.01" /></div>
            <div><label className="block text-sm font-medium mb-1">Purchase Price</label><input type="number" value={form.pricing.purchasePrice} onChange={e => handleChange('pricing.purchasePrice', parseFloat(e.target.value) || 0)} className="input-field" min="0" step="0.01" /></div>
            <div><label className="block text-sm font-medium mb-1">GST Rate</label><select value={form.pricing.gstRate} onChange={e => handleChange('pricing.gstRate', parseInt(e.target.value))} className="input-field">{GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}</select></div>
            <div><label className="block text-sm font-medium mb-1">HSN Code</label><input value={form.tax.hsnCode} onChange={e => handleChange('tax.hsnCode', e.target.value)} className="input-field" /></div>
            <div><label className="block text-sm font-medium mb-1">Opening Stock</label><input type="number" value={form.inventory.quantity} onChange={e => handleChange('inventory.quantity', parseInt(e.target.value) || 0)} className="input-field" min="0" /></div>
            <div><label className="block text-sm font-medium mb-1">Min Stock Level</label><input type="number" value={form.inventory.minStockLevel} onChange={e => handleChange('inventory.minStockLevel', parseInt(e.target.value) || 0)} className="input-field" min="0" /></div>
            <div><label className="block text-sm font-medium mb-1">Unit</label><select value={form.unit} onChange={e => handleChange('unit', e.target.value)} className="input-field">{['pcs', 'kg', 'g', 'l', 'ml', 'm', 'box', 'pack', 'dozen', 'carton'].map(u => <option key={u} value={u}>{u}</option>)}</select></div>
          </div>
          <div><label className="block text-sm font-medium mb-1">Description</label><textarea value={form.description} onChange={e => handleChange('description', e.target.value)} className="input-field" rows={2} /></div>
          <div className="flex justify-end gap-3 pt-4 border-t"><button type="button" onClick={onClose} className="btn-secondary">Cancel</button><button type="submit" className="btn-primary">{product ? 'Update' : 'Create'} Product</button></div>
        </form>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showImportUrl, setShowImportUrl] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importingUrl, setImportingUrl] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const limit = 25;

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiService.getProducts({ page, limit, search: search || undefined });
      setProducts(res.data?.data || []);
      setTotal(res.data?.pagination?.total || 0);
    } catch (err) { toast.error('Failed to load products'); } finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product permanently?')) return;
    try { await apiService.deleteProduct(id); toast.success('Product deleted'); loadProducts(); setSelectedIds([]); }
    catch (err) { toast.error('Failed to delete product'); }
  };

  const handleExport = async () => {
    try {
      const res = await apiService.getProducts({ limit: 999999 });
      const data = res.data?.data || [];
      // Trigger CSV download
      const csv = [['Name', 'SKU', 'Barcode', 'Category', 'MRP', 'Selling Price', 'GST%', 'HSN', 'Stock', 'Status'].join(',')];
      data.forEach(p => csv.push([p.name, p.sku, p.barcode, p.category, p.pricing?.mrp, p.pricing?.sellingPrice, p.pricing?.gstRate, p.tax?.hsnCode, p.inventory?.quantity, p.isActive ? 'Active' : 'Inactive'].join(',')));
      const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `products-${Date.now()}.csv`; a.click();
      URL.revokeObjectURL(url);
      toast.success(`${data.length} products exported`);
    } catch (err) { toast.error('Export failed'); }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === products.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(products.map(p => p._id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Permanently delete ${selectedIds.length} selected product(s)? This cannot be undone.`)) return;
    setBulkDeleting(true);
    try {
      const res = await apiService.bulkDeleteProducts(selectedIds);
      toast.success(res.data?.message || `${selectedIds.length} product(s) deleted`);
      setSelectedIds([]);
      loadProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete products');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleDeleteAll = async () => {
    if (total === 0) { toast.error('No products to delete'); return; }
    if (!window.confirm(`Are you sure you want to permanently delete ALL ${total} products? This cannot be undone.`)) return;
    setBulkDeleting(true);
    try {
      const res = await apiService.deleteAllProducts();
      toast.success(res.data?.message || 'All products deleted');
      setSelectedIds([]);
      loadProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete all products');
    } finally {
      setBulkDeleting(false);
    }
  };

  const pages = Math.ceil(total / limit);
  const allSelected = products.length > 0 && selectedIds.length === products.length;

  return (
    <div className="page-container">
      <div className="page-header">
        <div><h1 className="text-2xl font-bold">Products</h1><p className="text-sm text-gray-500 mt-1">{total} total products</p></div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="btn-secondary flex items-center gap-2"><FiDownload className="w-4 h-4" />Export</button>
          <input type="file" id="importCsv" accept=".csv,.xlsx,.json" className="hidden" onChange={async (e) => {
            if (!e.target.files?.[0]) return;
            const fd = new FormData();
            fd.append('import', e.target.files[0]);
            const importToast = toast.loading('Importing products...');
            try {
              const res = await apiService.importProducts(fd);
              const msg = res.data?.message || 'Import completed';
              const imported = res.data?.data?.imported || 0;
              const skipped = res.data?.data?.skipped || 0;
              const errors = res.data?.data?.errors || [];
              if (imported > 0 && errors.length === 0) {
                toast.success(msg, { id: importToast });
              } else if (errors.length > 0) {
                toast.error(msg + ' First issue: ' + errors[0].error, { id: importToast, duration: 6000 });
              } else if (skipped > 0) {
                toast(`${imported} imported, ${skipped} skipped — SKUs may already exist in this shop.`, { id: importToast, icon: 'ℹ️', duration: 5000 });
              } else {
                toast('No products were imported. Check your file format and try again.', { id: importToast, icon: '⚠️', duration: 5000 });
              }
              if (errors.length > 0) {
                console.warn('Import errors:', errors);
              }
              loadProducts();
            } catch (err) {
              toast.error(err.response?.data?.message || 'Import failed', { id: importToast });
            } finally {
              e.target.value = '';
            }
          }} />
          <label htmlFor="importCsv" className="btn-secondary flex items-center gap-2 cursor-pointer"><FiUpload className="w-4 h-4" />Import</label>
          <button onClick={() => setShowImportUrl(true)} className="btn-secondary flex items-center gap-2"><FiGlobe className="w-4 h-4" />Import URL</button>
          <button onClick={() => { setEditingProduct(null); setModalOpen(true); }} className="btn-primary flex items-center gap-2"><FiPlus className="w-4 h-4" />Add Product</button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4 relative">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); setSelectedIds([]); }} placeholder="Search products by name, SKU, barcode..." className="input-field pl-9 pr-4 py-2.5" />
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="mb-4 px-4 py-3 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
              {selectedIds.length} product{selectedIds.length > 1 ? 's' : ''} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="px-3 py-1.5 bg-danger-500 hover:bg-danger-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5"
            >
              <FiTrash2 className="w-3.5 h-3.5" />
              {bulkDeleting ? 'Deleting...' : `Delete Selected (${selectedIds.length})`}
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="table-container">
        <table className="w-full">
          <thead><tr className="bg-gray-50 dark:bg-gray-900">
            <th className="table-header w-10">
              <button onClick={toggleSelectAll} className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                {allSelected ? <FiCheckSquare className="w-4 h-4 text-primary-600" /> : <FiSquare className="w-4 h-4 text-gray-400" />}
              </button>
            </th>
            <th className="table-header">Product</th><th className="table-header">SKU</th><th className="table-header">Category</th><th className="table-header">Price</th><th className="table-header">GST</th><th className="table-header">Stock</th><th className="table-header text-right">Actions</th>
          </tr></thead>
          <tbody className="divide-y dark:divide-gray-700">
            {loading ? Array.from({ length: 8 }).map((_, i) => (<tr key={i}>{Array.from({ length: 8 }).map((_, j) => (<td key={j} className="table-cell"><div className="h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></td>))}</tr>))
            : products.length === 0 ? <tr><td colSpan={8} className="text-center py-12 text-gray-400">
              <FiBox className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No products found</p>
            </td></tr>
            : products.map(p => {
              const isSelected = selectedIds.includes(p._id);
              const stockStatus = p.inventory?.quantity <= 0 ? 'badge-danger' : p.inventory?.quantity <= p.inventory?.minStockLevel ? 'badge-warning' : 'badge-success';
              const stockLabel = p.inventory?.quantity <= 0 ? 'Out' : p.inventory?.quantity <= p.inventory?.minStockLevel ? 'Low' : 'In Stock';
              const mainImageUrl = getMainImageUrl(p.images);
              return (<tr key={p._id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${isSelected ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''}`}>
                <td className="table-cell w-10">
                  <button onClick={() => toggleSelect(p._id)} className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                    {isSelected ? <FiCheckSquare className="w-4 h-4 text-primary-600" /> : <FiSquare className="w-4 h-4 text-gray-400" />}
                  </button>
                </td>
                <td className="table-cell">
                  <div className="flex items-center gap-3">
                    {mainImageUrl ? (
                      <img src={mainImageUrl} alt={p.name} className="w-10 h-10 rounded-lg object-cover border border-gray-200 dark:border-gray-700" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        <FiBox className="w-4 h-4 text-gray-400" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium truncate">{p.name}</p>
                      <p className="text-xs text-gray-500">{p.brand || '-'}</p>
                    </div>
                  </div>
                </td>
                <td className="table-cell text-xs font-mono">{p.sku}</td>
                <td className="table-cell">{p.category || '-'}</td>
                <td className="table-cell"><p className="font-medium">₹{p.pricing?.sellingPrice?.toFixed(2)}</p><p className="text-xs text-gray-500">MRP: ₹{p.pricing?.mrp?.toFixed(2)}</p></td>
                <td className="table-cell">{p.pricing?.gstRate}%<br /><span className="text-xs text-gray-500">{p.tax?.hsnCode || '-'}</span></td>
                <td className="table-cell"><span className={stockStatus}>{stockLabel}</span><p className="text-xs text-gray-500 mt-0.5">{p.inventory?.quantity || 0} units</p></td>
                <td className="table-cell text-right"><div className="flex justify-end gap-1">
                  <button onClick={() => { setEditingProduct(p); setModalOpen(true); }} className="p-1.5 rounded hover:bg-gray-100 text-gray-400"><FiEdit2 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(p._id)} className="p-1.5 rounded hover:bg-danger-50 text-gray-400 hover:text-danger-500"><FiTrash2 className="w-4 h-4" /></button>
                </div></td>
              </tr>);
            })}
          </tbody>
        </table>
      </div>

      {/* Bottom Bulk Actions */}
      {total > 0 && (
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={handleDeleteAll}
            disabled={bulkDeleting}
            className="text-sm text-danger-500 hover:text-danger-600 disabled:opacity-50 font-medium flex items-center gap-1.5 transition-colors"
          >
            <FiTrash2 className="w-3.5 h-3.5" />
            Delete All Products
          </button>
          <div className="flex-1" />
          {pages > 1 && (
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-sm px-3">Prev</button>
              <span className="flex items-center text-sm text-gray-500 px-3">Page {page} of {pages}</span>
              <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="btn-secondary text-sm px-3">Next</button>
            </div>
          )}
        </div>
      )}

      <ProductModal isOpen={modalOpen} onClose={() => setModalOpen(false)} product={editingProduct} onSave={loadProducts} />

      {/* Import via URL Modal */}
      {showImportUrl && (
        <div className="modal-overlay" onClick={() => setShowImportUrl(false)}>
          <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <FiGlobe className="w-5 h-5 text-primary-500" />
                Import Products from URL
              </h3>
              <button onClick={() => setShowImportUrl(false)} className="p-1 rounded hover:bg-gray-100">
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Enter a URL to a product file or a product listing webpage. Supports <strong>.json</strong>, <strong>.csv</strong>, <strong>.xlsx</strong>, or any product listing page (like <strong>myriyansh.com/site/products.php</strong>).
              </p>
              <div>
                <label className="block text-sm font-medium mb-1">File URL *</label>
                <input
                  type="url"
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  placeholder="https://example.com/products.json"
                  className="input-field"
                />
              </div>
              <div className="bg-info-50 dark:bg-info-900/20 border border-info-200 dark:border-info-800 rounded-lg p-3">
                <p className="text-xs text-info-700 dark:text-info-300">
                  <strong>Supported formats:</strong> JSON (array of products), CSV, or Excel (.xlsx).
                  The file must be publicly accessible via URL.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t dark:border-gray-700">
              <button onClick={() => { setShowImportUrl(false); setImportUrl(''); }} className="btn-secondary">Cancel</button>
              <button
                onClick={async () => {
                  if (!importUrl.trim()) { toast.error('Please enter a URL'); return; }
                  setImportingUrl(true);
                  try {
                    const res = await apiService.importProductsFromUrl({ importUrl: importUrl.trim() });
                    const msg = res.data?.message || 'Import completed';
                    const imported = res.data?.data?.imported || 0;
                    const skipped = res.data?.data?.skipped || 0;
                    const errors = res.data?.data?.errors || [];
                    if (imported > 0 && errors.length === 0) {
                      toast.success(msg);
                    } else if (errors.length > 0) {
                      toast.error(msg + ' First issue: ' + errors[0].error, { duration: 6000 });
                    } else if (skipped > 0) {
                      toast(`${imported} imported, ${skipped} skipped — SKUs may already exist in this shop.`, { icon: 'ℹ️', duration: 5000 });
                    } else {
                      toast('No products were imported. Check the URL and try again.', { icon: '⚠️', duration: 5000 });
                    }
                    if (errors.length > 0) {
                      console.warn('Import errors:', errors);
                    }
                    setShowImportUrl(false);
                    setImportUrl('');
                    loadProducts();
                  } catch (err) {
                    toast.error(err.response?.data?.message || 'Import from URL failed');
                  } finally {
                    setImportingUrl(false);
                  }
                }}
                disabled={importingUrl || !importUrl.trim()}
                className="btn-primary flex items-center gap-2"
              >
                <FiLink className="w-4 h-4" />
                {importingUrl ? 'Importing...' : 'Import from URL'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
