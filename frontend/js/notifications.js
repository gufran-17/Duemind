/* notifications.js — Smart Browser Notification System
   Handles: 1-day, same-day, 5-min countdown, exact time, overdue
   Prevents duplicates via localStorage keys
*/

const NOTIF_PREFIX = 'dm_notif_';

function notifKey(taskId, type) {
  return `${NOTIF_PREFIX}${taskId}_${type}`;
}

function hasNotified(taskId, type) {
  return !!localStorage.getItem(notifKey(taskId, type));
}

function markNotified(taskId, type) {
  localStorage.setItem(notifKey(taskId, type), '1');
}

function clearOldNotifs(tasks) {
  const activeIds = new Set(tasks.map(t => String(t.id)));
  for (const key of Object.keys(localStorage)) {
    if (!key.startsWith(NOTIF_PREFIX)) continue;
    const taskId = key.split('_')[2];
    if (!activeIds.has(taskId)) localStorage.removeItem(key);
  }
}

function sendNotification(title, body, taskId, type) {
  if (hasNotified(taskId, type)) return;
  markNotified(taskId, type);

  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon.ico', tag: `${taskId}-${type}` });
  } else {
    showToast(`🔔 ${title}: ${body}`, 'info');
  }
}

function checkTaskNotifications(task) {
  if (task.is_completed) return;

  const now    = Date.now();
  const due    = new Date(task.due_datetime).getTime();
  const diffMs = due - now;
  const diffMin = diffMs / 60000;

  // 1 day before (between 24h and 25h remaining)
  if (diffMin >= 1380 && diffMin <= 1500) {
    sendNotification('Due Tomorrow', `"${task.title}" is due tomorrow!`, task.id, '1day');
  }

  // Same day (< 8 hours remaining, > 5 min)
  if (diffMin > 5 && diffMin <= 480) {
    sendNotification('Due Today', `"${task.title}" is due today!`, task.id, 'sameday');
  }

  // Last 5 minutes (send every check, so use time-bucket key to avoid spam)
  if (diffMin > 0 && diffMin <= 5) {
    const bucket = Math.floor(diffMin); // changes each minute
    sendNotification('Due Very Soon!', `"${task.title}" is due in ${Math.ceil(diffMin)} minute(s)!`, task.id, `5min_${bucket}`);
  }

  // Exact time (within 1 minute window of due)
  if (diffMin >= -1 && diffMin <= 1) {
    sendNotification('Task Due Now!', `"${task.title}" is due right now!`, task.id, 'exact');
  }

  // Overdue (past due, not yet notified)
  if (diffMs < 0 && diffMin > -60) {
    sendNotification('Task Overdue!', `"${task.title}" is overdue!`, task.id, 'overdue');
  }
}

async function runNotificationCheck() {
  const res = await TaskAPI.getAll();
  if (!res.ok) return;
  const tasks = res.data.tasks.filter(t => !t.is_completed);
  clearOldNotifs(tasks);
  tasks.forEach(checkTaskNotifications);
}

function initNotifications() {
  if (!('Notification' in window)) return;

  if (Notification.permission === 'default') {
    Notification.requestPermission();
  }

  // Check every 60 seconds
  runNotificationCheck();
  setInterval(runNotificationCheck, 60 * 1000);
}