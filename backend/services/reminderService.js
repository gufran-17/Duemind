const cron = require("node-cron");
const db = require("../config/db");
const sendReminderEmail = require("./emailService");

cron.schedule("* * * * *", async () => {

  console.log("Checking reminders...");

  try {

    const [tasks] = await db.query(`
      SELECT tasks.*, users.email, users.name
      FROM tasks
      JOIN users ON tasks.user_id = users.id
      WHERE tasks.is_completed = 0
    `);

    const now = new Date();

    for (let task of tasks) {

      const due = new Date(task.due_datetime);
      const diff = due - now;

      const minutes = Math.floor(diff / 60000);
      
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      // update status automatically
      if (minutes < 0 && task.status !== "OVERDUE") {
        await db.query(
          "UPDATE tasks SET status = 'OVERDUE' WHERE id = ?",
          [task.id]
        );
      }

      // 1 day before
      if (minutes > 1435 && minutes <= 1440 && !task.reminder_1day_sent) {

        await sendReminderEmail(
          task.email,
          `Reminder: ${task.title} is due tomorrow`,
          `Hello ${task.name},

Task: ${task.title}
Due Time: ${task.due_datetime}

Your task is scheduled for tomorrow.

DueMind Reminder`
        );

        await db.query(
          "UPDATE tasks SET reminder_1day_sent = 1 WHERE id = ?",
          [task.id]
        );
      }

      // same day morning
      if (days === 0 && hours >= 8 && hours <= 9 && !task.reminder_today_sent) {

        await sendReminderEmail(
          task.email,
          `Reminder: ${task.title} is due today`,
          `Hello ${task.name},

Task: ${task.title}
Due Time: ${task.due_datetime}

Please complete it today.

DueMind Reminder`
        );

        await db.query(
          "UPDATE tasks SET reminder_today_sent = 1 WHERE id = ?",
          [task.id]
        );
      }

      // 1 hour before
      if (minutes > 55 && minutes <= 60 && !task.reminder_1hour_sent) {

        await sendReminderEmail(
          task.email,
          `Reminder: ${task.title} is due in 1 hour`,
          `Hello ${task.name},

Task: ${task.title}

Your task is due in 1 hour.

DueMind Reminder`
        );

        await db.query(
          "UPDATE tasks SET reminder_1hour_sent = 1 WHERE id = ?",
          [task.id]
        );
      }

      // 5 minutes before
      if (minutes > 0 && minutes <= 5 && !task.reminder_5min_sent) {

        await sendReminderEmail(
          task.email,
          `Reminder: ${task.title} due in 5 minutes`,
          `Hello ${task.name},

Task: ${task.title}

Your task due in 5 minutes.

DueMind Reminder`
        );

        await db.query(
          "UPDATE tasks SET reminder_5min_sent = 1 WHERE id = ?",
          [task.id]
        );
      }

      // due now
      if (minutes === 0 && !task.reminder_due_sent) {

        await sendReminderEmail(
          task.email,
          `Task Due Now: ${task.title}`,
          `Hello ${task.name},

Task: ${task.title}

Your task is due now.

DueMind Reminder`
        );

        await db.query(
          "UPDATE tasks SET reminder_due_sent = 1 WHERE id = ?",
          [task.id]
        );
      }

      // overdue
      if (minutes < -5 && !task.reminder_overdue_sent) {

        await sendReminderEmail(
          task.email,
          `⚠ Overdue Task: ${task.title}`,
          `Hello ${task.name},

Task: ${task.title}
Due Time: ${task.due_datetime}

Your task is overdue.

Please complete it.

DueMind Reminder`
        );

        await db.query(
          "UPDATE tasks SET reminder_overdue_sent = 1 WHERE id = ?",
          [task.id]
        );
      }

    }

  } catch (error) {

    console.log("Reminder error:", error);

  }

});