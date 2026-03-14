/* profile.js */

requireAuth();
loadUserInfo();

async function loadProfile() {
  const res = await AuthAPI.me();
  if (!res.ok) return;
  const { user } = res.data;

  document.getElementById('profileName').textContent    = user.name;
  document.getElementById('profileEmail').textContent   = user.email;
  document.getElementById('profileSince').textContent   =
    new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  document.getElementById('profileAvatarBig').textContent = user.name.charAt(0).toUpperCase();
  document.getElementById('userAvatar').textContent       = user.name.charAt(0).toUpperCase();
  document.getElementById('userName').textContent         = user.name;
}

function showPwAlert(msg, type = 'error') {
  const el = document.getElementById('pwAlert');
  el.className = `auth-alert ${type}`;
  el.textContent = msg;
}

async function changePassword() {
  const currentPw  = document.getElementById('currentPw').value;
  const newPw      = document.getElementById('newPw').value;
  const confirmPw  = document.getElementById('confirmPw').value;

  if (!currentPw || !newPw || !confirmPw) return showPwAlert('All fields are required');
  if (newPw.length < 6)                   return showPwAlert('New password must be at least 6 characters');
  if (newPw !== confirmPw)                return showPwAlert('Passwords do not match');

  const res = await AuthAPI.changePassword({ currentPassword: currentPw, newPassword: newPw });

  if (res.ok) {
    showPwAlert('Password updated successfully!', 'success');
    document.getElementById('currentPw').value = '';
    document.getElementById('newPw').value      = '';
    document.getElementById('confirmPw').value  = '';
  } else {
    showPwAlert(res.data.message || 'Error updating password');
  }
}

function togglePw(id, btn) {
  const input = document.getElementById(id);
  const icon  = btn.querySelector('i');
  if (input.type === 'password') {
    input.type = 'text';
    icon.className = 'fa-solid fa-eye-slash';
  } else {
    input.type = 'password';
    icon.className = 'fa-solid fa-eye';
  }
}

loadProfile();