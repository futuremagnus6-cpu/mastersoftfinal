const Notification = require('../models/Notification');
const { scopeQuery } = require('../middleware/multiTenant');

exports.getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, isRead, type } = req.query;
    const query = scopeQuery({}, req);
    if (req.user.role !== 'super_admin') query.recipient = req.userId;
    if (isRead !== undefined) query.isRead = isRead === 'true';
    if (type) query.type = type;
    const notifications = await Notification.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit));
    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ ...scopeQuery({}, req), recipient: req.userId, isRead: false });
    res.json({ success: true, data: notifications, unreadCount, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
};
exports.markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.userId },
      { isRead: true, readAt: new Date() },
      { new: true }
    );
    res.json({ success: true, data: notification });
  } catch (error) { next(error); }
};
exports.markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { recipient: req.userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) { next(error); }
};
exports.deleteNotification = async (req, res, next) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, recipient: req.userId });
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) { next(error); }
};
