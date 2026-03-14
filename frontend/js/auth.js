/* auth.js — Login & Register handlers */

// Redirect if already logged in
if (getToken()) {
  window.location.href = 'pages/dashboard.html';
}

// Password strength indicator
const pwInput = document.getElementById('password');
if (pwInput) {
  pwInput.addEventListener('input', () => {
    const val = pwInput.value;
    const bar = document.getElementById('pw-strength');
    if (!bar) return;

    let strength = 0;
    if (val.length >= 6) strength++;
    if (/[A-Z]/.test(val)) strength++;
    if (/[0-9]/.test(val)) strength++;
    if (/[^A-Za-z0-9]/.test(val)) strength++;

    const colors = ['', '#ef4444', '#f59e0b', '#6366f1', '#10b981'];

    bar.style.width = (strength * 25) + '%';
    bar.style.background = colors[strength];
  });
}

function showError(msg) {
  const el = document.getElementById('auth-error');
  el.className = 'auth-alert error';
  el.textContent = msg;
}

async function handleLogin() {

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (!email || !password)
    return showError('Please fill in all fields');

  const btn = document.getElementById('loginBtn');

  btn.disabled = true;
  btn.innerHTML =
    '<i class="fa-solid fa-spinner fa-spin"></i> Signing in...';

  const res = await AuthAPI.login({ email, password });

  if (res.ok) {

    setAuth(res.data.token, res.data.user);

    window.location.href = 'pages/dashboard.html';

  } else {

    showError(res.data.message || 'Login failed');

    btn.disabled = false;

    btn.innerHTML =
      '<span>Sign In</span> <i class="fa-solid fa-arrow-right"></i>';
  }

}

async function handleRegister() {

  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (!name || !email || !password)
    return showError('Please fill in all fields');

  if (password.length < 6)
    return showError('Password must be at least 6 characters');

  if (password !== confirmPassword)
    return showError('Passwords do not match');

  const btn = document.getElementById('registerBtn');

  btn.disabled = true;

  btn.innerHTML =
    '<i class="fa-solid fa-spinner fa-spin"></i> Creating account...';

  const res = await AuthAPI.register({ name, email, password });

  if (res.ok) {

    setAuth(res.data.token, res.data.user);

    window.location.href = 'pages/dashboard.html';

  } else {

    const msg =
      res.data.errors?.[0]?.msg ||
      res.data.message ||
      'Registration failed';

    showError(msg);

    btn.disabled = false;

    btn.innerHTML =
      '<span>Create Account</span> <i class="fa-solid fa-user-plus"></i>';
  }

}

// Allow Enter key
document.addEventListener('keydown', (e) => {

  if (e.key !== 'Enter') return;

  if (document.getElementById('loginBtn'))
    handleLogin();

  if (document.getElementById('registerBtn'))
    handleRegister();

});

