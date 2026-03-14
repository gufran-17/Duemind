/* dashboard.js */

requireAuth();
loadUserInfo();

// Greeting
const hour = new Date().getHours();
const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
const greetEl = document.getElementById('greeting');
if (greetEl) greetEl.textContent = `${greet}, ${getUser()?.name?.split(' ')[0]} 👋`;

// ── Load Stats ─────────────────────────────────────────────
async function loadStats() {
  const res = await TaskAPI.getStats();
  if (!res.ok) return;
  const { stats, recent } = res.data;

  document.getElementById('statTotal').textContent     = stats.total     || 0;
  document.getElementById('statOverdue').textContent   = stats.overdue   || 0;
  document.getElementById('statDueToday').textContent  = stats.due_today || 0;
  document.getElementById('statCompleted').textContent = stats.completed || 0;

  renderRecentTasks(recent || []);
}

function renderRecentTasks(tasks) {
  const container = document.getElementById('recentTasks');
  if (!tasks.length) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-clipboard-list"></i>
        <p>No tasks yet. Create your first task!</p>
        <button class="btn-save" onclick="openTaskModal()">+ New Task</button>
      </div>`;
    return;
  }

  container.innerHTML = tasks.map(t => `
    <div class="task-item" id="ti-${t.id}">
      <div class="task-check ${t.is_completed ? 'checked' : ''}" onclick="completeTask(${t.id})">
        ${t.is_completed ? '<i class="fa-solid fa-check"></i>' : ''}
      </div>
      <div class="task-info">
        <div class="task-title ${t.is_completed ? 'done' : ''}">${escHtml(t.title)}</div>
        <div class="task-meta">
          <span class="badge badge-status-${t.status}">${t.status.replace('_',' ')}</span>
          <span class="badge badge-priority-${t.priority}">${t.priority}</span>
          <span class="badge badge-category">${t.category}</span>
          <span class="due-date ${isOverdue(t.due_datetime) && !t.is_completed ? 'overdue' : ''}">
            <i class="fa-regular fa-clock"></i> ${formatDateTime(t.due_datetime)}
          </span>
        </div>
      </div>
      <div class="task-actions">
        <button class="btn-edit" onclick="editTask(${t.id})" title="Edit"><i class="fa-solid fa-pen"></i></button>
        <button class="btn-delete" onclick="deleteTask(${t.id})" title="Delete"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>`).join('');
}

// ── Task Modal ─────────────────────────────────────────────
let editingId = null;

function openTaskModal(task = null) {
  editingId = task?.id || null;
  document.getElementById('modalTitle').textContent = task ? 'Edit Task' : 'New Task';
  document.getElementById('taskId').value          = task?.id || '';
  document.getElementById('taskTitle').value       = task?.title || '';
  document.getElementById('taskDesc').value        = task?.description || '';
  document.getElementById('taskCategory').value   = task?.category || 'General';
  document.getElementById('taskPriority').value   = task?.priority || 'Medium';
  document.getElementById('taskRecurring').value  = task?.recurring_type || 'None';

  if (task?.due_datetime) {
    const d = new Date(task.due_datetime);
    document.getElementById('taskDate').value = d.toISOString().split('T')[0];
    document.getElementById('taskTime').value = d.toTimeString().slice(0,5);
  } else {
    document.getElementById('taskDate').value = '';
    document.getElementById('taskTime').value = '';
  }

  document.getElementById('taskModal').classList.add('open');
}

function closeTaskModal() {
  document.getElementById('taskModal').classList.remove('open');
  editingId = null;
}

async function saveTask() {
  const title   = document.getElementById('taskTitle').value.trim();
  const dateVal = document.getElementById('taskDate').value;
  const timeVal = document.getElementById('taskTime').value || '09:00';

  if (!title)   return showToast('Title is required', 'error');
  if (!dateVal) return showToast('Due date is required', 'error');

  const due_datetime = `${dateVal}T${timeVal}:00`;

  const body = {
    title,
    description:    document.getElementById('taskDesc').value,
    category:       document.getElementById('taskCategory').value,
    priority:       document.getElementById('taskPriority').value,
    recurring_type: document.getElementById('taskRecurring').value,
    due_datetime
  };

  const res = editingId
    ? await TaskAPI.update(editingId, body)
    : await TaskAPI.create(body);

  if (res.ok) {
    showToast(editingId ? 'Task updated!' : 'Task created!', 'success');
    closeTaskModal();
    loadStats();
  } else {
    showToast(res.data.message || 'Error saving task', 'error');
  }
}

async function editTask(id) {
  const res = await apiFetch(`/tasks/${id}`);
  if (res.ok) openTaskModal(res.data.task);
}

async function deleteTask(id) {
  if (!confirm('Delete this task?')) return;
  const res = await TaskAPI.delete(id);
  if (res.ok) { showToast('Task deleted', 'success'); loadStats(); }
}

async function completeTask(id) {
  const res = await TaskAPI.complete(id);

  if (res.ok) {

    showToast('Task completed! 🎉', 'success');

    const el = document.getElementById(`ti-${id}`);
    if (el) el.remove();

    loadStats();
  }
}


// ── Escape HTML helper ─────────────────────────────────────
function escHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

// Close modal on overlay click
document.getElementById('taskModal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeTaskModal();
});

// ── Init ───────────────────────────────────────────────────
loadStats();
if (typeof initNotifications === 'function') initNotifications();

// Auto refresh dashboard every 30 seconds
setInterval(() => {
  loadStats();
}, 30000);