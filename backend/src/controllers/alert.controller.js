const AlertConfig = require('../models/AlertConfig');
const { scopeQuery } = require('../middleware/multiTenant');

exports.getAlerts = async (req, res, next) => {
  try {
    const alerts = await AlertConfig.find(scopeQuery({}, req));
    res.json({ success: true, data: alerts });
  } catch (error) { next(error); }
};

exports.getAlert = async (req, res, next) => {
  try {
    const alert = await AlertConfig.findOne(scopeQuery({ type: req.params.type }, req));
    if (!alert) {
      // Return defaults if no config exists yet
      return res.json({ success: true, data: { type: req.params.type, enabled: true, channels: { email: true, dashboard: true, whatsapp: false, sms: false }, recipients: { shopAdmin: true, manager: false, staff: false }, thresholds: {}, schedule: {} } });
    }
    res.json({ success: true, data: alert });
  } catch (error) { next(error); }
};

exports.updateAlert = async (req, res, next) => {
  try {
    const updateData = { ...req.body, updatedBy: req.userId };
    // Ensure shopId is set for upsert (new document creation)
    const query = scopeQuery({ type: req.params.type }, req);

    const alert = await AlertConfig.findOneAndUpdate(
      query,
      { $set: updateData, $setOnInsert: { shopId: req.shopId, type: req.params.type, createdBy: req.userId } },
      { new: true, upsert: true, runValidators: true }
    );
    res.json({ success: true, message: 'Alert config updated', data: alert });
  } catch (error) { next(error); }
};

exports.toggleAlert = async (req, res, next) => {
  try {
    const query = scopeQuery({ type: req.params.type }, req);
    let alert = await AlertConfig.findOne(query);

    if (alert) {
      // Toggle existing alert
      alert.enabled = !alert.enabled;
      alert.updatedBy = req.userId;
      await alert.save();
    } else {
      // Create new alert config with enabled = false (toggling from default "enabled" state)
      alert = await AlertConfig.create({
        shopId: req.shopId,
        type: req.params.type,
        enabled: false,
        channels: { email: true, dashboard: true, whatsapp: false, sms: false },
        recipients: { shopAdmin: true, manager: false, staff: false },
        createdBy: req.userId,
        updatedBy: req.userId,
      });
    }

    res.json({ success: true, message: `Alert ${alert.enabled ? 'enabled' : 'disabled'}`, data: alert });
  } catch (error) { next(error); }
};
