const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { AppError } = require('./errorHandler');

const uploadDir = path.join(__dirname, '..', '..', 'uploads');

// Ensure upload directories exist
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

ensureDir(uploadDir);
ensureDir(path.join(uploadDir, 'images'));
ensureDir(path.join(uploadDir, 'documents'));
ensureDir(path.join(uploadDir, 'receipts'));
ensureDir(path.join(uploadDir, 'logos'));
ensureDir(path.join(uploadDir, 'backups'));
ensureDir(path.join(uploadDir, 'imports'));
ensureDir(path.join(uploadDir, 'exports'));
ensureDir(path.join(uploadDir, 'temp'));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let dest = path.join(uploadDir, 'temp');

    if (file.fieldname === 'logo') {
      dest = path.join(uploadDir, 'logos');
    } else if (file.fieldname === 'productImage' || file.fieldname === 'images' || file.fieldname === 'file') {
      dest = path.join(uploadDir, 'images');
    } else if (file.fieldname === 'receipt') {
      dest = path.join(uploadDir, 'receipts');
    } else if (file.fieldname === 'document') {
      dest = path.join(uploadDir, 'documents');
    } else if (file.fieldname === 'backup') {
      dest = path.join(uploadDir, 'backups');
    } else if (file.fieldname === 'import') {
      dest = path.join(uploadDir, 'imports');
    }

    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedImages = /\.(jpg|jpeg|png|gif|webp|svg)$/i;
  const allowedDocs = /\.(pdf|doc|docx|xls|xlsx|csv|json|xml)$/i;
  const allowedAll = /\.(jpg|jpeg|png|gif|webp|svg|pdf|doc|docx|xls|xlsx|csv|json|xml)$/i;

  if (file.fieldname === 'import') {
    if (file.originalname.match(/\.(xlsx|xls|csv|json|xml)$/i)) {
      cb(null, true);
    } else {
      cb(new AppError('Import files must be xlsx, xls, csv, json, or xml', 400), false);
    }
  } else if (file.fieldname === 'productImage' || file.fieldname === 'images' || file.fieldname === 'logo') {
    if (file.originalname.match(allowedImages)) {
      cb(null, true);
    } else {
      cb(new AppError('Only image files (jpg, jpeg, png, gif, webp, svg) are allowed', 400), false);
    }
  } else {
    if (file.originalname.match(allowedAll)) {
      cb(null, true);
    } else {
      cb(new AppError('Invalid file type', 400), false);
    }
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
    files: 10,
  },
});

const uploadSingle = (fieldName) => upload.single(fieldName);
const uploadMultiple = (fieldName, maxCount = 5) => upload.array(fieldName, maxCount);
const uploadFields = (fields) => upload.fields(fields);

module.exports = { upload, uploadSingle, uploadMultiple, uploadFields };
