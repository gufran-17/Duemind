/* tasks.js — All Tasks page */

requireAuth();
loadUserInfo();

let allTasks = [];
let editingId = null;

function escHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

async function loadTasks() {
  const params = {
    status:   document.getElementById('filterStatus').value,
    category: document.getElementById('filterCategory').value,
    priority: document.getElementById('filterPriority').value,
    search:   document.getElementById('searchInput').value,
    sort:     document.getElementById('sortBy').value
  };

  // Remove ALL params
  Object.keys(params).forEach(k => { if (params[k] === 'ALL') params[k] = ''; });

  const res = await TaskAPI.getAll(params);
  if (!res.ok) return;

  // FIX: ensure completed tasks are removed correctly
  allTasks = res.data.tasks.filter(t => Number(t.is_completed) === 0);

  renderTasks(allTasks);
}

function filterTasks() { loadTasks(); }

function renderTasks(tasks) {
  const container = document.getElementById('tasksList');

  if (!tasks.length) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-clipboard-list"></i>
        <p>No tasks found. Try adjusting your filters.</p>
      </div>`;
    return;
  }

  container.innerHTML = tasks.map(t => `
    <div class="task-item" id="ti-${t.id}">
      <div class="task-check" onclick="completeTask(${t.id})">
        <i class="fa-solid fa-check" style="display:none;color:#fff;font-size:.7rem"></i>
      </div>

      <div class="task-info">
        <div class="task-title">${escHtml(t.title)}</div>

        ${t.description ? `
        <div style="font-size:.8rem;color:var(--text-muted);margin:3px 0">
          ${escHtml(t.description)}
        </div>` : ''}

        <div class="task-meta">
          <span class="badge badge-status-${t.status}">
            ${t.status.replace('_',' ')}
          </span>

          <span class="badge badge-priority-${t.priority}">
            ${t.priority}
          </span>

          <span class="badge badge-category">
            ${t.category}
          </span>

          ${t.recurring_type !== 'None'
            ? `<span class="badge" style="background:rgba(20,184,166,.15);color:#14b8a6">
                 <i class="fa-solid fa-rotate"></i> ${t.recurring_type}
               </span>`
            : ''}

          <span class="due-date ${isOverdue(t.due_datetime) ? 'overdue' : ''}">
            <i class="fa-regular fa-clock"></i>
            ${formatDateTime(t.due_datetime)}
          </span>
        </div>
      </div>

      <div class="task-actions" style="position:relative">
        <button class="btn-complete"
                onclick="completeTask(${t.id})"
                title="Complete">
          <i class="fa-solid fa-check"></i>
        </button>

        <button class="btn-edit"
                onclick="editTask(${t.id})"
                title="Edit">
          <i class="fa-solid fa-pen"></i>
        </button>

        <button onclick="toggleSnooze(${t.id}, this)"
                title="Snooze">
          <i class="fa-solid fa-clock"></i>
        </button>

        <button class="btn-delete"
                onclick="deleteTask(${t.id})"
                title="Delete">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    </div>
  `).join('');
}

// ── Snooze ─────────────────────────────────────────────────

function toggleSnooze(id, btn) {

  const existing = document.querySelector('.snooze-menu');
  if (existing) { existing.remove(); return; }

  const menu = document.createElement('div');
  menu.className = 'snooze-menu';

  menu.innerHTML = [5,10,30,60].map(m =>
    `<button onclick="doSnooze(${id},${m})">
      Snooze ${m >= 60 ? '1 hr' : m + ' min'}
    </button>`
  ).join('');

  btn.parentElement.style.position = 'relative';
  btn.parentElement.appendChild(menu);

  document.addEventListener('click', (e) => {
    if (!menu.contains(e.target) && e.target !== btn) menu.remove();
  }, { once: true });
}

async function doSnooze(id, minutes) {

  const res = await TaskAPI.snooze(id, minutes);

  document.querySelector('.snooze-menu')?.remove();

  if (res.ok) {
    showToast(`Snoozed for ${minutes} min`, 'info');
    loadTasks();
  }
}

// ── Modal ──────────────────────────────────────────────────

function openTaskModal(task = null) {

  editingId = task?.id || null;

  document.getElementById('modalTitle').textContent =
    task ? 'Edit Task' : 'New Task';

  document.getElementById('taskId').value    = task?.id || '';
  document.getElementById('taskTitle').value = task?.title || '';
  document.getElementById('taskDesc').value  = task?.description || '';

  document.getElementById('taskCategory').value =
    task?.category || 'General';

  document.getElementById('taskPriority').value =
    task?.priority || 'Medium';

  document.getElementById('taskRecurring').value =
    task?.recurring_type || 'None';

  if (task?.due_datetime) {

    const d = new Date(task.due_datetime);

    document.getElementById('taskDate').value =
      d.toISOString().split('T')[0];

    document.getElementById('taskTime').value =
      d.toTimeString().slice(0,5);

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

  if (!title)   return showToast('Title required', 'error');
  if (!dateVal) return showToast('Date required', 'error');

  const body = {
    title,
    description: document.getElementById('taskDesc').value,
    category: document.getElementById('taskCategory').value,
    priority: document.getElementById('taskPriority').value,
    recurring_type: document.getElementById('taskRecurring').value,
    due_datetime: `${dateVal}T${timeVal}:00`
  };

  const res = editingId
    ? await TaskAPI.update(editingId, body)
    : await TaskAPI.create(body);

  if (res.ok) {
    showToast(editingId ? 'Updated!' : 'Created!', 'success');
    closeTaskModal();
    loadTasks();
  } else {
    showToast(res.data.message || 'Error', 'error');
  }
}

async function editTask(id) {

  const res = await apiFetch(`/tasks/${id}`);

  if (res.ok) openTaskModal(res.data.task);
}

async function deleteTask(id) {

  if (!confirm('Delete this task?')) return;

  const res = await TaskAPI.delete(id);

  if (res.ok) {
    showToast('Deleted', 'success');
    loadTasks();
  }
}

async function completeTask(id) {

  const res = await TaskAPI.complete(id);

  if (res.ok) {

    showToast('Completed! 🎉', 'success');

    const el = document.getElementById(`ti-${id}`);
    if (el) el.remove();

    loadTasks();
  }
}

document.getElementById('taskModal').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeTaskModal();
});

loadTasks();

if (typeof initNotifications === 'function')
  initNotifications();

// Auto refresh tasks every 30 seconds
setInterval(() => {
  loadTasks();
}, 30000);