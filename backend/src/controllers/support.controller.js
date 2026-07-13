const SupportTicket = require('../models/SupportTicket');
const Notification = require('../models/Notification');
const { AppError } = require('../middleware/errorHandler');
const { scopeQuery } = require('../middleware/multiTenant');

exports.getTickets = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, status, priority, category, search } = req.query;
    const query = scopeQuery({}, req);
    if (status) query.status = status; if (priority) query.priority = priority; if (category) query.category = category;
    if (search) query.$or = [{ subject: { $regex: search, $options: 'i' } }, { ticketNumber: { $regex: search, $options: 'i' } }, { customerName: { $regex: search, $options: 'i' } }];
    const tickets = await SupportTicket.find(query).populate('assignedTo', 'name').populate('customer', 'name mobile').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit));
    const total = await SupportTicket.countDocuments(query);
    res.json({ success: true, data: tickets, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
};
exports.getTicket = async (req, res, next) => {
  try {
    const ticket = await SupportTicket.findOne(scopeQuery({ _id: req.params.id }, req)).populate('assignedTo', 'name').populate('messages.sender', 'name');
    if (!ticket) throw new AppError('Ticket not found', 404);
    res.json({ success: true, data: ticket });
  } catch (error) { next(error); }
};
exports.createTicket = async (req, res, next) => {
  try {
    const ticketNumber = `SUP-${Date.now().toString(36).toUpperCase()}`;
    const ticket = await SupportTicket.create({ ...req.body, ticketNumber, shopId: req.shopId, branchId: req.branchId, createdBy: req.userId });
    res.status(201).json({ success: true, message: 'Ticket created', data: ticket });
  } catch (error) { next(error); }
};
exports.updateTicket = async (req, res, next) => {
  try {
    const ticket = await SupportTicket.findOne(scopeQuery({ _id: req.params.id }, req));
    if (!ticket) throw new AppError('Ticket not found', 404);
    ['status', 'priority', 'assignedTo', 'category'].forEach(f => { if (req.body[f] !== undefined) ticket[f] = req.body[f]; });
    ticket.updatedBy = req.userId;
    if (req.body.status === 'resolved') ticket.sla.resolvedAt = new Date();
    await ticket.save();
    res.json({ success: true, message: 'Ticket updated', data: ticket });
  } catch (error) { next(error); }
};
exports.addMessage = async (req, res, next) => {
  try {
    const ticket = await SupportTicket.findOne(scopeQuery({ _id: req.params.id }, req));
    if (!ticket) throw new AppError('Ticket not found', 404);
    ticket.messages.push({ sender: req.userId, senderName: req.user?.name, senderRole: req.user?.role, message: req.body.message, attachments: req.body.attachments || [], isInternal: req.body.isInternal || false });
    ticket.updatedBy = req.userId;
    if (!ticket.sla.firstResponseAt) ticket.sla.firstResponseAt = new Date();
    await ticket.save();
    res.json({ success: true, message: 'Message added', data: ticket });
  } catch (error) { next(error); }
};
exports.getStats = async (req, res, next) => {
  try {
    const query = scopeQuery({}, req);
    const [open, inProgress, resolved, urgent, avgResolution] = await Promise.all([
      SupportTicket.countDocuments({ ...query, status: 'open' }),
      SupportTicket.countDocuments({ ...query, status: 'in_progress' }),
      SupportTicket.countDocuments({ ...query, status: 'resolved' }),
      SupportTicket.countDocuments({ ...query, priority: 'urgent', status: { $ne: 'resolved' } }),
      SupportTicket.aggregate([{ $match: { ...query, 'sla.resolvedAt': { $exists: true } } }, { $project: { resolutionTime: { $subtract: ['$sla.resolvedAt', '$createdAt'] } } }, { $group: { _id: null, avgTime: { $avg: '$resolutionTime' } } }]),
    ]);
    res.json({ success: true, data: { open, inProgress, resolved, urgent, total: open + inProgress + resolved + urgent, avgResolutionHours: avgResolution[0] ? (avgResolution[0].avgTime / (1000 * 60 * 60)).toFixed(1) : 0 } });
  } catch (error) { next(error); }
};
