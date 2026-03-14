/* ========================================================
   api.js — Centralised API layer + auth helpers
   ======================================================== */

const API_BASE = 'http://localhost:5000/api';

// ── Token helpers ──────────────────────────────────────────
const getToken  = ()      => localStorage.getItem('dm_token');
const getUser   = ()      => JSON.parse(localStorage.getItem('dm_user') || 'null');
const setAuth   = (token, user) => {
  localStorage.setItem('dm_token', token);
  localStorage.setItem('dm_user', JSON.stringify(user));
};
const clearAuth = ()      => {
  localStorage.removeItem('dm_token');
  localStorage.removeItem('dm_user');
};

// ── Guard: redirect if not logged in ──────────────────────
function requireAuth() {
  if (!getToken()) {
    window.location.href = '../login.html';
  }
}

// ── Logout ─────────────────────────────────────────────────
function logout() {
  clearAuth();
  window.location.href = '../index.html';
}

// ── Toast notifications ────────────────────────────────────
function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i> ${message}`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// ── Sidebar toggle ─────────────────────────────────────────
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ── Password show/hide ─────────────────────────────────────
function togglePw(inputId, btn) {
  const input = document.getElementById(inputId);
  const icon = btn.querySelector("i");

  if (input.type === "password") {
    input.type = "text";
    icon.className = "fa-solid fa-eye-slash";
  } else {
    input.type = "password";
    icon.className = "fa-solid fa-eye";
  }
}

// ── Core fetch wrapper ─────────────────────────────────────
async function apiFetch(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    },
    ...options
  });

  const data = await res.json();

  if (res.status === 401) {
    clearAuth();
    window.location.href = '../login.html';
    return;
  }

  return { ok: res.ok, status: res.status, data };
}

// ── Auth API ───────────────────────────────────────────────
const AuthAPI = {
  register: (body) => apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login:    (body) => apiFetch('/auth/login',    { method: 'POST', body: JSON.stringify(body) }),
  me:       ()     => apiFetch('/auth/me'),
  changePassword: (body) => apiFetch('/auth/change-password', { method: 'PUT', body: JSON.stringify(body) })
};

// ── Tasks API ──────────────────────────────────────────────
const TaskAPI = {
  getAll:    (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiFetch(`/tasks${q ? '?' + q : ''}`);
  },
  getStats:     ()          => apiFetch('/tasks/stats'),
  getAnalytics: ()          => apiFetch('/tasks/analytics'),
  getCompleted: ()          => apiFetch('/tasks/completed'),
  create:    (body)         => apiFetch('/tasks',            { method: 'POST',  body: JSON.stringify(body) }),
  update:    (id, body)     => apiFetch(`/tasks/${id}`,      { method: 'PUT',   body: JSON.stringify(body) }),
  delete:    (id)           => apiFetch(`/tasks/${id}`,      { method: 'DELETE' }),
  complete:  (id)           => apiFetch(`/tasks/${id}/complete`, { method: 'PATCH' }),
  restore:   (id)           => apiFetch(`/tasks/${id}/restore`,  { method: 'PATCH' }),
  snooze:    (id, minutes)  => apiFetch(`/tasks/${id}/snooze`,   { method: 'PATCH', body: JSON.stringify({ minutes }) })
};

// ── Format date/time ───────────────────────────────────────
function formatDateTime(dt) {
  if (!dt) return '';
  const d = new Date(dt);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function isOverdue(dt) {
  return new Date(dt) < new Date();
}

// ── Populate topbar user info ──────────────────────────────
function loadUserInfo() {
  const user = getUser();
  if (!user) return;
  const nameEl   = document.getElementById('userName');
  const avatarEl = document.getElementById('userAvatar');
  if (nameEl)   nameEl.textContent   = user.name;
  if (avatarEl) avatarEl.textContent = user.name.charAt(0).toUpperCase();
}