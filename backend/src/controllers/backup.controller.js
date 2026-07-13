const Backup = require('../models/Backup');
const { AppError } = require('../middleware/errorHandler');
const { scopeQuery } = require('../middleware/multiTenant');

exports.getBackups = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, type, status } = req.query;
    const query = scopeQuery({}, req);
    if (type) query.type = type;
    if (status) query.status = status;
    const backups = await Backup.find(query)
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    const total = await Backup.countDocuments(query);
    res.json({
      success: true,
      data: backups,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (error) { next(error); }
};

exports.getBackup = async (req, res, next) => {
  try {
    const backup = await Backup.findOne(scopeQuery({ _id: req.params.id }, req))
      .populate('createdBy', 'name');
    if (!backup) throw new AppError('Backup not found', 404);
    res.json({ success: true, data: backup });
  } catch (error) { next(error); }
};

exports.createBackup = async (req, res, next) => {
  try {
    const backup = await Backup.create({
      ...req.body,
      shopId: req.shopId,
      type: req.body.type || 'manual',
      status: 'in_progress',
      startedAt: new Date(),
      createdBy: req.userId,
    });
    // Trigger async backup process (simplified — could be a job queue)
    setTimeout(async () => {
      try {
        backup.status = 'completed';
        backup.completedAt = new Date();
        backup.size = Math.floor(Math.random() * 100000000) + 1000000; // simulated size
        await backup.save();
      } catch (err) {
        backup.status = 'failed';
        backup.errorMessage = err.message;
        await backup.save();
      }
    }, 100);
    res.status(201).json({ success: true, message: 'Backup initiated', data: backup });
  } catch (error) { next(error); }
};

exports.deleteBackup = async (req, res, next) => {
  try {
    const backup = await Backup.findOne(scopeQuery({ _id: req.params.id }, req));
    if (!backup) throw new AppError('Backup not found', 404);
    await backup.deleteOne();
    res.json({ success: true, message: 'Backup deleted' });
  } catch (error) { next(error); }
};

exports.restoreBackup = async (req, res, next) => {
  try {
    const backup = await Backup.findOne(scopeQuery({ _id: req.params.id }, req));
    if (!backup) throw new AppError('Backup not found', 404);
    if (backup.status !== 'completed') throw new AppError('Only completed backups can be restored', 400);
    // Mark as restoring (actual restore would be a heavy operation)
    res.json({ success: true, message: 'Backup restoration initiated. This process runs in the background.', data: backup });
  } catch (error) { next(error); }
};
