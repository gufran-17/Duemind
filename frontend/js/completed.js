/* completed.js */

requireAuth();
loadUserInfo();

function escHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

async function loadCompleted() {
  const res = await TaskAPI.getCompleted();
  if (!res.ok) return showToast('Error loading tasks', 'error');

  const tasks = res.data.tasks;
  const el    = document.getElementById('completedList');
  const count = document.getElementById('completedCount');
  count.textContent = `${tasks.length} task${tasks.length !== 1 ? 's' : ''}`;

  if (!tasks.length) {
    el.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-trophy"></i>
        <p>No completed tasks yet. Go crush some goals!</p>
        <a href="tasks.html" class="btn-save">View Tasks</a>
      </div>`;
    return;
  }

  el.innerHTML = tasks.map(t => `
    <div class="task-item" id="ti-${t.id}">
      <div class="task-check checked">
        <i class="fa-solid fa-check" style="color:#fff;font-size:.7rem"></i>
      </div>
      <div class="task-info">
        <div class="task-title done">${escHtml(t.title)}</div>
        <div class="task-meta">
          <span class="badge badge-priority-${t.priority}">${t.priority}</span>
          <span class="badge badge-category">${t.category}</span>
          <span class="due-date"><i class="fa-solid fa-circle-check" style="color:var(--green)"></i> Completed: ${formatDateTime(t.completed_at)}</span>
        </div>
      </div>
      <div class="task-actions">
        <button class="btn-delete" onclick="deleteTask(${t.id})" title="Delete">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    </div>`).join('');
}

async function restoreTask(id) {
  const res = await TaskAPI.restore(id);
  if (res.ok) { showToast('Task restored!', 'success'); loadCompleted(); }
}

async function deleteTask(id) {
  if (!confirm('Permanently delete this task?')) return;
  const res = await TaskAPI.delete(id);
  if (res.ok) { showToast('Deleted', 'success'); loadCompleted(); }
}

loadCompleted();