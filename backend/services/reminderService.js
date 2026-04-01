const cron = require("node-cron");
const db = require("../config/db");
const sendReminderEmail = require("./emailService");

const formatDateTime = (date) => {
  const d = new Date(date);
  const day = d.toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
  const time = d.toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
  return `${day} at ${time}`;
};

const isSameDay = (d1, d2) => {
  return d1.toDateString() === d2.toDateString();
};

cron.schedule("* * * * *", async () => {
  console.log("Checking reminders...");

  try {
    // ✅ FIX: convert due_datetime from IST (+05:30) to UTC (+00:00) in MySQL
    // so that Node's new Date() comparison is apples-to-apples
    const [tasks] = await db.query(`
      SELECT tasks.*,
             users.email,
             users.name,
             CONVERT_TZ(tasks.due_datetime, '+05:30', '+00:00') AS due_datetime_utc
      FROM tasks
      JOIN users ON tasks.user_id = users.id
      WHERE tasks.is_completed = 0
      AND tasks.due_datetime IS NOT NULL
    `);

    const now = new Date();

    for (let task of tasks) {
      try {
        // ✅ FIX: parse the UTC-converted value; append "Z" so JS treats it as UTC
        const dueDate = new Date(task.due_datetime_utc.replace(" ", "T") + "Z");
        const diffMs = dueDate - now;

        let subject = "";
        let messageText = "";

        // 🔴 OVERDUE
        if (diffMs < 0 && task.reminder_overdue_sent == 0) {
          subject = `🚨 Overdue: ${task.title}`;
          messageText = "Your task is now overdue.";
          await db.query(`UPDATE tasks SET reminder_overdue_sent = 1 WHERE id=?`, [task.id]);
          console.log("OVERDUE:", task.title);
          await sendReminderEmail(task.email, subject, generateHTML(task, messageText));
        }

        // 🔵 1 DAY BEFORE
        if (
          diffMs <= 24 * 60 * 60 * 1000 &&
          diffMs >= 23 * 60 * 60 * 1000 &&
          task.reminder_1day_sent == 0
        ) {
          subject = `📅 Tomorrow: ${task.title}`;
          messageText = "Your task is scheduled for tomorrow.";
          await db.query(`UPDATE tasks SET reminder_1day_sent = 1 WHERE id=?`, [task.id]);
          console.log("1 DAY:", task.title);
          await sendReminderEmail(task.email, subject, generateHTML(task, messageText));
        }

        // 🔵 SAME DAY MORNING (9:00–9:10 in IST = 3:30–3:40 UTC)
        // ✅ FIX: compare against UTC hours (3 = 9 AM IST)
        if (
          isSameDay(now, dueDate) &&
          now.getUTCHours() === 3 &&
          now.getUTCMinutes() <= 10 &&
          task.reminder_today_sent == 0
        ) {
          subject = `📌 Today: ${task.title}`;
          messageText = "Don't forget to complete your task today.";
          await db.query(`UPDATE tasks SET reminder_today_sent = 1 WHERE id=?`, [task.id]);
          console.log("TODAY:", task.title);
          await sendReminderEmail(task.email, subject, generateHTML(task, messageText));
        }

        // 🟢 1 HOUR BEFORE
        if (
          diffMs <= 60 * 60 * 1000 &&
          diffMs >= 40 * 60 * 1000 &&
          task.reminder_1hour_sent == 0
        ) {
          subject = `⏳ Due in 1 hour: ${task.title}`;
          messageText = "Your task is due in 1 hour.";
          await db.query(`UPDATE tasks SET reminder_1hour_sent = 1 WHERE id=?`, [task.id]);
          console.log("1 HOUR:", task.title);
          await sendReminderEmail(task.email, subject, generateHTML(task, messageText));
        }

        // 🟡 5 MIN BEFORE
        if (
          diffMs <= 10 * 60 * 1000 &&
          diffMs > -2 * 60 * 1000 &&
          task.reminder_5min_sent == 0
        ) {
          subject = `⚠ Due in 5 minutes: ${task.title}`;
          messageText = "Your task is due in 5 minutes.";
          await db.query(`UPDATE tasks SET reminder_5min_sent = 1 WHERE id=?`, [task.id]);
          console.log("5 MIN:", task.title);
          await sendReminderEmail(task.email, subject, generateHTML(task, messageText));
        }

      } catch (taskErr) {
        console.log("Task error:", taskErr);
        continue;
      }
    }

  } catch (err) {
    console.error("Reminder error:", err);
  }
});

function generateHTML(task, messageText) {
  return `
  <div style="font-family: Arial; padding:20px; max-width:500px; margin:auto; border:1px solid #ddd; border-radius:10px;">
    <h2 style="text-align:center;">Hello ${task.name || "User"},</h2>
    <p style="text-align:center;">${messageText}</p>
    <div style="background:#f9f9f9; padding:15px; border-radius:8px;">
      <p><strong>📌 Task:</strong> ${task.title}</p>
      <p><strong>📅 Due:</strong> ${formatDateTime(task.due_datetime)}</p>
    </div>
    <div style="text-align:center; margin-top:20px;">
      <a href="http://localhost:3000"
        style="background:#4CAF50;color:white;padding:10px 20px;border-radius:5px;text-decoration:none;">
        Open DueMind
      </a>
    </div>
    <p style="text-align:center; margin-top:20px; color:#777;">– DueMind</p>
  </div>
  `;
}