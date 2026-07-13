const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const productController = require('../controllers/product.controller');
const { authenticate } = require('../middleware/auth');
const { authorize, authorizePermission } = require('../middleware/rbac');
const { multiTenant } = require('../middleware/multiTenant');
const { uploadSingle } = require('../middleware/upload');
const {
  createProductValidator,
  updateProductValidator,
  updateStockValidator,
  bulkDeleteValidator,
} = require('../validators/product.validators');

router.use(authenticate);
router.use(multiTenant);

router.param('id', (req, res, next, val) => {
  if (!mongoose.Types.ObjectId.isValid(val)) {
    return res.status(400).json({ success: false, message: 'Invalid ID format', code: 'INVALID_ID' });
  }
  next();
});

// Public POS search (no permission check needed for search)
router.get('/search', productController.searchProducts);
router.get('/barcode/:barcode', productController.getByBarcode);
router.get('/categories/list', productController.getCategories);

router.get('/export', authorizePermission('products', 'read'), productController.exportProducts);

router.post('/import', authorizePermission('products', 'create'), uploadSingle('import'), productController.importProducts);

router.post('/bulk-delete', authorizePermission('products', 'delete'), bulkDeleteValidator, productController.bulkDeleteProducts);
router.delete('/all', authorizePermission('products', 'delete'), productController.deleteAllProducts);

router.route('/')
  .get(authorizePermission('products', 'read'), productController.getProducts)
  .post(authorizePermission('products', 'create'), createProductValidator, uploadSingle('productImage'), productController.createProduct);

router.route('/:id')
  .get(authorizePermission('products', 'read'), productController.getProduct)
  .put(authorizePermission('products', 'update'), updateProductValidator, uploadSingle('productImage'), productController.updateProduct)
  .delete(authorizePermission('products', 'delete'), productController.deleteProduct);

router.put('/:id/stock', authorizePermission('products', 'update'), updateStockValidator, productController.updateStock);

module.exports = router;
