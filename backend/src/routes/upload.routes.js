const express = require('express');
const path = require('path');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { multiTenant } = require('../middleware/multiTenant');
const { uploadSingle, uploadMultiple } = require('../middleware/upload');
const Shop = require('../models/Shop');
const User = require('../models/User');

const uploadDir = path.join(__dirname, '..', '..', 'uploads');

router.use(authenticate);
router.use(multiTenant);

/**
 * Update shop storage usage after a file upload and auto-suspend if over limit.
 * @param {Object} shopId - The shop ID
 * @param {number} fileSizeBytes - Size of uploaded file in bytes
 * @param {Object} userId - The user who triggered the upload
 */
async function trackStorageAndCheckLimit(shopId, fileSizeBytes, userId) {
  if (!shopId || !fileSizeBytes) return;

  const shop = await Shop.findById(shopId);
  if (!shop) return;

  // currentStorage is stored in MB, fileSizeBytes is in bytes
  const sizeMB = fileSizeBytes / (1024 * 1024);
  const maxStorageMB = (shop.limits?.maxStorage || 5) * 1024; // Convert GB to MB

  shop.usage.currentStorage = (shop.usage.currentStorage || 0) + sizeMB;

  // Auto-suspend if storage exceeds the limit
  if (shop.usage.currentStorage >= maxStorageMB && shop.status === 'active') {
    shop.status = 'suspended';
    shop.subscription.status = 'suspended';
    shop.suspendedAt = new Date();
    shop.updatedBy = userId;

    // Deactivate all users for this shop
    await User.updateMany({ shopId: shop._id }, { isActive: false });
  }

  await shop.save();
}

// Single file upload
router.post('/', uploadSingle('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }
  // Determine subdirectory from where the file was stored
  const subDir = path.relative(uploadDir, req.file.destination).replace(/\\/g, '/');
  const url = subDir ? `/uploads/${subDir}/${req.file.filename}` : `/uploads/${req.file.filename}`;

  // Track storage usage and auto-suspend if over limit
  await trackStorageAndCheckLimit(req.shopId, req.file.size, req.userId);

  res.json({
    success: true,
    message: 'File uploaded successfully',
    data: {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      url,
    },
  });
});

// Multiple file upload
router.post('/multiple', uploadMultiple('files', 10), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ success: false, message: 'No files uploaded' });
  }

  // Calculate total bytes from all uploaded files
  const totalBytes = req.files.reduce((sum, f) => sum + f.size, 0);

  // Track storage usage and auto-suspend if over limit
  await trackStorageAndCheckLimit(req.shopId, totalBytes, req.userId);

  const files = req.files.map(f => {
    const subDir = path.relative(uploadDir, f.destination).replace(/\\/g, '/');
    const url = subDir ? `/uploads/${subDir}/${f.filename}` : `/uploads/${f.filename}`;
    return {
      filename: f.filename,
      originalName: f.originalname,
      mimeType: f.mimetype,
      size: f.size,
      url,
    };
  });
  res.json({ success: true, message: 'Files uploaded successfully', data: files });
});

module.exports = router;
