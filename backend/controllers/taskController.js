const { validationResult } = require('express-validator');
const TaskModel = require('../models/taskModel');

// ── GET /api/tasks ───────────────────────────────────────────
exports.getTasks = async (req, res, next) => {
  try {
    const { status, category, priority, search, sort } = req.query;
    const tasks = await TaskModel.getAllByUser(req.userId, { status, category, priority, search, sort });
    res.json({ success: true, count: tasks.length, tasks });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/tasks/stats ─────────────────────────────────────
exports.getStats = async (req, res, next) => {
  try {
    const stats  = await TaskModel.getStats(req.userId);
    const recent = await TaskModel.getRecent(req.userId);
    res.json({ success: true, stats, recent });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/tasks/analytics ─────────────────────────────────
exports.getAnalytics = async (req, res, next) => {
  try {
    const data = await TaskModel.getAnalytics(req.userId);
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/tasks/completed ─────────────────────────────────
exports.getCompleted = async (req, res, next) => {
  try {
    const tasks = await TaskModel.getCompleted(req.userId);
    res.json({ success: true, tasks });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/tasks/:id ───────────────────────────────────────
exports.getTask = async (req, res, next) => {
  try {
    const task = await TaskModel.getById(req.params.id, req.userId);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, task });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/tasks ──────────────────────────────────────────
exports.createTask = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });

    const { title, description, category, priority, due_datetime, recurring_type } = req.body;

    const id = await TaskModel.create({
      userId: req.userId, title, description,
      category: category || 'General',
      priority:  priority  || 'Medium',
      due_datetime,
      recurring_type: recurring_type || 'None'
    });

    const task = await TaskModel.getById(id, req.userId);
    res.status(201).json({ success: true, message: 'Task created', task });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/tasks/:id ───────────────────────────────────────
exports.updateTask = async (req, res, next) => {
  try {
    const task = await TaskModel.getById(req.params.id, req.userId);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    await TaskModel.update(req.params.id, req.userId, req.body);
    const updated = await TaskModel.getById(req.params.id, req.userId);
    res.json({ success: true, message: 'Task updated', task: updated });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/tasks/:id ────────────────────────────────────
exports.deleteTask = async (req, res, next) => {
  try {
    const task = await TaskModel.getById(req.params.id, req.userId);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    await TaskModel.delete(req.params.id, req.userId);
    res.json({ success: true, message: 'Task deleted' });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/tasks/:id/complete ────────────────────────────
exports.completeTask = async (req, res, next) => {
  try {

    const task = await TaskModel.getById(req.params.id, req.userId);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found"
      });
    }

    // STOP duplicate completion
    if (task.is_completed === 1) {
      return res.json({
        success: true,
        message: "Task already completed"
      });
    }

    await TaskModel.markComplete(req.params.id, req.userId);

    res.json({
      success: true,
      message: "Task completed"
    });

  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/tasks/:id/restore ─────────────────────────────
exports.restoreTask = async (req, res, next) => {
  try {
    const task = await TaskModel.restore(req.params.id, req.userId);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, message: 'Task restored' });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/tasks/:id/snooze ──────────────────────────────
exports.snoozeTask = async (req, res, next) => {
  try {
    const { minutes } = req.body;
    const allowed = [5, 10, 30, 60];
    if (!allowed.includes(Number(minutes)))
      return res.status(400).json({ success: false, message: 'Invalid snooze duration' });

    await TaskModel.snooze(req.params.id, req.userId, minutes);
    res.json({ success: true, message: `Task snoozed for ${minutes} minutes` });
  } catch (err) {
    next(err);
  }
};