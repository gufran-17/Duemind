const db = require('../config/db');
const sendReminderEmail = require('../services/emailService');

// Helper: compute status from due_datetime
function computeStatus(dueDatetime, isCompleted, snoozedUntil) {
  if (isCompleted) return 'COMPLETED';

  const now = new Date();
  const due = new Date(dueDatetime);
  const snooze = snoozedUntil ? new Date(snoozedUntil) : null;

  if (snooze && snooze > now) return 'UPCOMING';

  const diffMs = due - now;
  const diffMin = diffMs / 60000;

  if (diffMs < 0) return 'OVERDUE';
  if (diffMin <= 1440) return 'DUE_SOON';
  return 'UPCOMING';
}

// Helper: next recurring date
function nextRecurringDate(due, type) {
  const d = new Date(due);
  if (type === 'Daily') d.setDate(d.getDate() + 1);
  if (type === 'Weekly') d.setDate(d.getDate() + 7);
  if (type === 'Monthly') d.setMonth(d.getMonth() + 1);
  return d;
}

const TaskModel = {

  // ── Get all tasks for user (with filters) ─────────────────
  async getAllByUser(userId, { status, category, priority, search, sort } = {}) {

    // FIX: exclude completed tasks
    let sql = 'SELECT * FROM tasks WHERE user_id = ? AND is_completed = 0';
    const params = [userId];

    if (status && status !== 'ALL') {
      sql += ' AND status = ?';
      params.push(status);
    }

    if (category && category !== 'ALL') {
      sql += ' AND category = ?';
      params.push(category);
    }

    if (priority && priority !== 'ALL') {
      sql += ' AND priority = ?';
      params.push(priority);
    }

    if (search) {
      sql += ' AND title LIKE ?';
      params.push(`%${search}%`);
    }

    const order = sort === 'priority'
      ? " ORDER BY FIELD(priority,'High','Medium','Low')"
      : ' ORDER BY due_datetime ASC';

    sql += order;

    const [rows] = await db.execute(sql, params);
    return rows;
  },

  // ── Get completed tasks ────────────────────────────────────
  async getCompleted(userId) {
    const [rows] = await db.execute(
      'SELECT * FROM tasks WHERE user_id = ? AND is_completed = 1 ORDER BY completed_at DESC',
      [userId]
    );
    return rows;
  },

  // ── Get single task ────────────────────────────────────────
  async getById(id, userId) {
    const [rows] = await db.execute(
      'SELECT * FROM tasks WHERE id = ? AND user_id = ?', [id, userId]
    );
    return rows[0] || null;
  },

  // ── Create task ────────────────────────────────────────────
  async create({ userId, title, description, category, priority, due_datetime, recurring_type }) {

    const status = computeStatus(due_datetime, false, null);

    const [result] = await db.execute(
      `INSERT INTO tasks
      (user_id, title, description, category, priority, due_datetime, recurring_type, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, title, description, category, priority, due_datetime, recurring_type, status]
    );

    return result.insertId;
  },

  // ── Update task ────────────────────────────────────────────
  async update(id, userId, fields) {

    const { title, description, category, priority, due_datetime, recurring_type } = fields;

    const status = computeStatus(due_datetime, false, null);

    await db.execute(
    `UPDATE tasks
     SET title=?,
         description=?,
         category=?,
         priority=?,
         due_datetime=?,
         recurring_type=?,
         status=?,

         reminder_1day_sent = 0,
         reminder_today_sent = 0,
         reminder_1hour_sent = 0,
         reminder_5min_sent = 0,
         reminder_due_sent = 0,
         reminder_overdue_sent = 0

     WHERE id=? AND user_id=?`,
    [title, description, category, priority, due_datetime, recurring_type, status, id, userId]
  );

},

  // ── Delete task ────────────────────────────────────────────
  async delete(id, userId) {
    await db.execute(
      'DELETE FROM tasks WHERE id = ? AND user_id = ?',
      [id, userId]
    );
  },

  // ── Mark complete ──────────────────────────────────────────
async markComplete(id, userId) {

  const task = await this.getById(id, userId);
  if (!task) return null;

  // prevent completing again
  if (task.is_completed === 1) {
    return task;
  }

  // mark task completed
  await db.execute(
    `UPDATE tasks
     SET is_completed = 1,
         status = 'COMPLETED',
         completed_at = NOW()
     WHERE id = ? AND user_id = ?`,
    [id, userId]
  );

  return true;
},

  // ── Restore task ───────────────────────────────────────────
  async restore(id, userId) {

    const task = await this.getById(id, userId);
    if (!task) return null;

    const status = computeStatus(task.due_datetime, false, null);

    await db.execute(
      `UPDATE tasks
       SET is_completed = 0,
           status = ?,
           completed_at = NULL
       WHERE id = ? AND user_id = ?`,
      [status, id, userId]
    );
  },

  // ── Snooze task ────────────────────────────────────────────
  async snooze(id, userId, minutes) {

  const task = await this.getById(id, userId);
  if (!task) return null;

  // Let MySQL add minutes directly to the existing due time
  await db.execute(
    `UPDATE tasks
     SET due_datetime = DATE_ADD(due_datetime, INTERVAL ? MINUTE)
     WHERE id = ? AND user_id = ?`,
    [minutes, id, userId]
  );

  const updated = await this.getById(id, userId);
  return updated;
}, 
  // ── Dashboard stats ────────────────────────────────────────
  async getStats(userId) {

    const [rows] = await db.execute(
      `SELECT
        COUNT(*) AS total,
        SUM(status = 'OVERDUE' AND is_completed = 0) AS overdue,
        SUM(status = 'DUE_SOON' AND is_completed = 0) AS due_today,
        SUM(is_completed = 1) AS completed
       FROM tasks
       WHERE user_id = ?`,
      [userId]
    );

    return rows[0];
  },

  // ── Recent tasks (last 5) ──────────────────────────────────
  async getRecent(userId) {

    const [rows] = await db.execute(
      `SELECT *
       FROM tasks
       WHERE user_id = ? AND is_completed = 0
       ORDER BY created_at DESC
       LIMIT 5`,
      [userId]
    );

    return rows;
  },

  // ── Analytics data ─────────────────────────────────────────
  async getAnalytics(userId) {

    const [monthly] = await db.execute(
      `SELECT DATE_FORMAT(created_at,'%Y-%m') AS month, COUNT(*) AS count
       FROM tasks
       WHERE user_id = ?
       AND created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
       GROUP BY month
       ORDER BY month ASC`,
      [userId]
    );

    const [byCategory] = await db.execute(
      `SELECT category, COUNT(*) AS count
       FROM tasks
       WHERE user_id = ?
       GROUP BY category`,
      [userId]
    );

    const [rate] = await db.execute(
      `SELECT
        COUNT(*) AS total,
        SUM(is_completed = 1) AS completed
       FROM tasks
       WHERE user_id = ?`,
      [userId]
    );

    const [byPriority] = await db.execute(
      `SELECT priority, COUNT(*) AS count
       FROM tasks
       WHERE user_id = ?
       GROUP BY priority`,
      [userId]
    );

    return {
      monthly,
      byCategory,
      completionRate: rate[0],
      byPriority
    };
  },

  // ── CRON: update statuses ──────────────────────────────────
    // ── CRON: update statuses ──────────────────────────────────
  async updateTaskStatuses() {

    const now = new Date();

    // find tasks that are due
    const [tasks] = await db.execute(
      `SELECT t.*, u.email
       FROM tasks t
       JOIN users u ON t.user_id = u.id
       WHERE t.is_completed = 0
       AND t.due_datetime <= ?
       AND t.status != 'OVERDUE'`,
      [now]
    );

    // send email reminders
    for (const task of tasks) {
      await sendReminderEmail(task.email, task.title);
    }

    const soonThreshold = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    await db.execute(
      `UPDATE tasks
       SET status='OVERDUE'
       WHERE is_completed=0
       AND due_datetime < ?
       AND status != 'OVERDUE'`,
      [now]
    );

    await db.execute(
      `UPDATE tasks
       SET status='DUE_SOON'
       WHERE is_completed=0
       AND due_datetime BETWEEN ? AND ?
       AND status='UPCOMING'`,
      [now, soonThreshold]
    );

  }

};

module.exports = TaskModel;
module.exports.updateTaskStatuses = TaskModel.updateTaskStatuses;