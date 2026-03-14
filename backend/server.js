require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const cron    = require('node-cron');
require("./services/reminderService");

const authRoutes  = require('./routes/authRoutes');
const taskRoutes  = require('./routes/taskRoutes');
const { errorHandler } = require('./middleware/errorMiddleware');
const { updateTaskStatuses } = require('./models/taskModel');
const sendReminderEmail = require('./services/emailService');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ──────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ──────────────────────────────────────────────────
app.use('/api/auth',  authRoutes);
app.use('/api/tasks', taskRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ── Error Handler ───────────────────────────────────────────
app.use(errorHandler);

// ── CRON: update task statuses every minute ─────────────────
cron.schedule('* * * * *', async () => {
  try {
    await updateTaskStatuses();
  } catch (err) {
    console.error('Cron error:', err.message);
  }
});

// ── Start ────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ DueMind Pro server running on http://localhost:${PORT}`);
});

setTimeout(() => {
  sendReminderEmail("gufranansari1717@gmail.com", "DueMind Test Email");
}, 5000);