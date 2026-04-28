/* ================================================================
   main.js — ShieldAuth Frontend Controller
   ================================================================ */

// ── State ────────────────────────────────────────────────────────
const state = {
  token: localStorage.getItem('shieldauth_token') || null,
  user:  JSON.parse(localStorage.getItem('shieldauth_user') || 'null'),
  mode:  'login', // 'login' | 'register' | 'forgot'
  lockCountdown: null,
};

// ── API Helper ───────────────────────────────────────────────────
async function api(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (state.token) headers['Authorization'] = `Bearer ${state.token}`;

  const res = await fetch(path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

// ── Toast ─────────────────────────────────────────────────────────
const toast = document.getElementById('toast');
let toastTimer;
function showToast(msg, type = 'info') {
  toast.textContent = msg;
  toast.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
}

// ── Element Refs ──────────────────────────────────────────────────
const screenAuth      = document.getElementById('screen-auth');
const screenDash      = document.getElementById('screen-dashboard');

const tabLogin        = document.getElementById('tab-login');
const tabRegister     = document.getElementById('tab-register');
const tabSlider       = document.querySelector('.tab-slider');

const formLogin       = document.getElementById('form-login');
const formRegister    = document.getElementById('form-register');
const formForgot      = document.getElementById('form-forgot');

const loginEmail      = document.getElementById('login-email');
const loginPassword   = document.getElementById('login-password');
const regEmail        = document.getElementById('reg-email');
const regPassword     = document.getElementById('reg-password');
const forgotEmail     = document.getElementById('forgot-email');

const btnLogin        = document.getElementById('btn-login');
const btnRegister     = document.getElementById('btn-register');
const btnForgot       = document.getElementById('btn-forgot');
const btnLogout       = document.getElementById('btn-logout');
const btnRefresh      = document.getElementById('btn-refresh');

const attemptWarning  = document.getElementById('attempt-warning');
const attemptText     = document.getElementById('attempt-text');
const lockoutBanner   = document.getElementById('lockout-banner');
const countdownEl     = document.getElementById('countdown');

const visLogin        = document.getElementById('vis-login');
const visReg          = document.getElementById('vis-reg');
const forgotLink      = document.getElementById('forgot-link');
const backToLogin     = document.getElementById('back-to-login');

const strengthFill    = document.getElementById('strength-fill');
const strengthLabel   = document.getElementById('strength-label');

// Dashboard elements
const navEmail        = document.getElementById('nav-email');
const navAvatar       = document.getElementById('nav-avatar');
const dashAvatar      = document.getElementById('dash-avatar');
const dashEmail       = document.getElementById('dash-email');
const statSuccess     = document.getElementById('stat-success');
const statFailed      = document.getElementById('stat-failed');
const statLocked      = document.getElementById('stat-locked');
const statAttacks     = document.getElementById('stat-attacks');
const activityFeed    = document.getElementById('activity-feed');
const historyBody     = document.getElementById('history-body');

// ── Routing ───────────────────────────────────────────────────────
function showAuth() {
  screenAuth.classList.add('active');
  screenAuth.classList.remove('hidden');
  screenDash.classList.add('hidden');
  screenDash.classList.remove('active');
}

function showDashboard() {
  screenAuth.classList.remove('active');
  screenAuth.classList.add('hidden');
  screenDash.classList.remove('hidden');
  screenDash.classList.add('active');
  loadDashboard();
}

// ── Tab Switching ─────────────────────────────────────────────────
function setMode(mode) {
  state.mode = mode;
  formLogin.classList.add('hidden');
  formRegister.classList.add('hidden');
  formForgot.classList.add('hidden');
  tabLogin.classList.remove('active');
  tabRegister.classList.remove('active');
  tabSlider.classList.remove('right');

  if (mode === 'login') {
    formLogin.classList.remove('hidden');
    tabLogin.classList.add('active');
    tabLogin.setAttribute('aria-selected', 'true');
    tabRegister.setAttribute('aria-selected', 'false');
  } else if (mode === 'register') {
    formRegister.classList.remove('hidden');
    tabRegister.classList.add('active');
    tabSlider.classList.add('right');
    tabLogin.setAttribute('aria-selected', 'false');
    tabRegister.setAttribute('aria-selected', 'true');
  } else if (mode === 'forgot') {
    formForgot.classList.remove('hidden');
  }

  // Clear attempt/lockout UI when switching
  attemptWarning.classList.add('hidden');
  lockoutBanner.classList.add('hidden');
}

tabLogin.addEventListener('click', () => setMode('login'));
tabRegister.addEventListener('click', () => setMode('register'));
forgotLink.addEventListener('click', () => setMode('forgot'));
backToLogin.addEventListener('click', () => setMode('login'));

// ── Show/Hide Password ───────────────────────────────────────────
function toggleVisibility(inputEl, btn) {
  const isText = inputEl.type === 'text';
  inputEl.type = isText ? 'password' : 'text';
  btn.style.opacity = isText ? '0.5' : '1';
}
visLogin.addEventListener('click', () => toggleVisibility(loginPassword, visLogin));
visReg.addEventListener('click',   () => toggleVisibility(regPassword, visReg));

// ── Password Strength Checker ─────────────────────────────────────
const STRENGTH_LEVELS = [
  { max: 20,  label: 'Very Weak', color: '#fc8181', width: '15%' },
  { max: 40,  label: 'Weak',      color: '#f6ad55', width: '30%' },
  { max: 60,  label: 'Fair',      color: '#f6e05e', width: '55%' },
  { max: 80,  label: 'Strong',    color: '#68d391', width: '78%' },
  { max: 101, label: 'Very Strong',color: '#48bb78', width: '100%' },
];

function calcStrength(pw) {
  let score = 0;
  if (pw.length >= 8)  score += 20;
  if (pw.length >= 12) score += 10;
  if (pw.length >= 16) score += 10;
  if (/[A-Z]/.test(pw)) score += 15;
  if (/[a-z]/.test(pw)) score += 15;
  if (/[0-9]/.test(pw)) score += 15;
  if (/[^A-Za-z0-9]/.test(pw)) score += 15;
  return Math.min(score, 100);
}

function updateStrengthUI(pw) {
  const score = calcStrength(pw);
  const level = STRENGTH_LEVELS.find(l => score <= l.max) || STRENGTH_LEVELS.at(-1);
  strengthFill.style.width = pw ? level.width : '0';
  strengthFill.style.background = level.color;
  strengthLabel.textContent = pw ? level.label : '—';
  strengthLabel.style.color = pw ? level.color : 'var(--text-muted)';

  // Requirements
  document.getElementById('req-len').classList.toggle('ok',   pw.length >= 8);
  document.getElementById('req-upper').classList.toggle('ok', /[A-Z]/.test(pw));
  document.getElementById('req-lower').classList.toggle('ok', /[a-z]/.test(pw));
  document.getElementById('req-num').classList.toggle('ok',   /[0-9]/.test(pw));
  document.getElementById('req-sym').classList.toggle('ok',   /[^A-Za-z0-9]/.test(pw));
}

regPassword.addEventListener('input', () => updateStrengthUI(regPassword.value));

// ── Button Spinner ────────────────────────────────────────────────
function setLoading(btn, loading) {
  const text    = btn.querySelector('.btn-text');
  const spinner = btn.querySelector('.btn-spinner');
  btn.disabled = loading;
  text.classList.toggle('hidden', loading);
  spinner.classList.toggle('hidden', !loading);
}

// ── Lockout Countdown ─────────────────────────────────────────────
function startCountdown(seconds) {
  attemptWarning.classList.add('hidden');
  lockoutBanner.classList.remove('hidden');
  clearInterval(state.lockCountdown);

  let remaining = seconds;
  const tick = () => {
    const m = String(Math.floor(remaining / 60)).padStart(2, '0');
    const s = String(remaining % 60).padStart(2, '0');
    countdownEl.textContent = `${m}:${s}`;
    if (remaining <= 0) {
      clearInterval(state.lockCountdown);
      lockoutBanner.classList.add('hidden');
      showToast('Account unlocked. You may now try again.', 'success');
    }
    remaining--;
  };
  tick();
  state.lockCountdown = setInterval(tick, 1000);
}

// ── LOGIN ─────────────────────────────────────────────────────────
formLogin.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email    = loginEmail.value.trim();
  const password = loginPassword.value;
  if (!email || !password) return showToast('Please fill in all fields.', 'error');

  setLoading(btnLogin, true);
  try {
    const data = await api('POST', '/auth/login', { email, password });

    if (data.success) {
      state.token = data.token;
      state.user  = data.user;
      localStorage.setItem('shieldauth_token', data.token);
      localStorage.setItem('shieldauth_user', JSON.stringify(data.user));
      attemptWarning.classList.add('hidden');
      showToast('Welcome back! Access granted.', 'success');
      formLogin.reset();
      showDashboard();
    } else {
      if (data.error === 'ACCOUNT_LOCKED') {
        startCountdown(data.lockTimeRemaining || 600);
      } else {
        attemptWarning.classList.remove('hidden');
        if (data.attemptsRemaining !== undefined) {
          attemptText.textContent = `Invalid credentials. ${data.attemptsRemaining} attempt(s) remaining before lockout.`;
        } else {
          attemptText.textContent = data.message || 'Invalid email or password.';
        }
      }
    }
  } catch {
    showToast('Network error. Please try again.', 'error');
  } finally {
    setLoading(btnLogin, false);
  }
});

// ── REGISTER ──────────────────────────────────────────────────────
formRegister.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email    = regEmail.value.trim();
  const password = regPassword.value;

  if (!email || !password) return showToast('Please fill in all fields.', 'error');
  if (password.length < 8) return showToast('Password must be at least 8 characters.', 'error');
  if (calcStrength(password) < 30) return showToast('Password is too weak. Add numbers, symbols, and mix cases.', 'error');

  setLoading(btnRegister, true);
  try {
    const data = await api('POST', '/auth/register', { email, password });
    if (data.success) {
      showToast('Account created! You can now sign in.', 'success');
      formRegister.reset();
      updateStrengthUI('');
      setMode('login');
    } else {
      const msg = data.error === 'EMAIL_EXISTS'
        ? 'An account with this email already exists.'
        : (data.message || 'Registration failed.');
      showToast(msg, 'error');
    }
  } catch {
    showToast('Network error. Please try again.', 'error');
  } finally {
    setLoading(btnRegister, false);
  }
});

// ── FORGOT PASSWORD ───────────────────────────────────────────────
formForgot.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = forgotEmail.value.trim();
  if (!email) return showToast('Please enter your email.', 'error');

  setLoading(btnForgot, true);
  try {
    const data = await api('POST', '/auth/forgot-password', { email });
    showToast(data.message || 'Reset link sent if account exists.', 'success');
    formForgot.reset();
    setMode('login');
  } catch {
    showToast('Network error.', 'error');
  } finally {
    setLoading(btnForgot, false);
  }
});

// ── LOGOUT ────────────────────────────────────────────────────────
btnLogout.addEventListener('click', () => {
  state.token = null;
  state.user  = null;
  localStorage.removeItem('shieldauth_token');
  localStorage.removeItem('shieldauth_user');
  showToast('Session terminated.', 'info');
  showAuth();
});

// ── DASHBOARD DATA ────────────────────────────────────────────────
async function loadDashboard() {
  // Update user info
  const email = state.user?.email || '—';
  const initial = (email[0] || 'U').toUpperCase();
  navEmail.textContent   = email;
  navAvatar.textContent  = initial;
  dashAvatar.textContent = initial;
  dashEmail.textContent  = email;

  await Promise.all([loadStats(), loadActivity(), loadHistory()]);
}

async function loadStats() {
  try {
    const data = await api('GET', '/auth/security-stats');
    if (data.success) {
      const { totalSuccess, totalFailed, lockedAccounts, recentAttacks } = data.stats;
      animateNum(statSuccess, totalSuccess);
      animateNum(statFailed, totalFailed);
      animateNum(statLocked, lockedAccounts);
      animateNum(statAttacks, recentAttacks);
    }
  } catch { /* silently fail */ }
}

async function loadActivity() {
  try {
    const data = await api('GET', '/auth/recent-activity');
    if (data.success) {
      if (!data.activity.length) {
        activityFeed.innerHTML = '<div class="feed-loader">No activity yet.</div>';
        return;
      }
      activityFeed.innerHTML = data.activity.map(ev => {
        const dotClass = ev.status === 'SUCCESS' ? 'ok' : ev.status === 'REGISTERED' ? 'reg' : ev.status === 'ACCOUNT_LOCKED' ? 'lock' : 'fail';
        const label = ev.reason || ev.status;
        return `
          <div class="feed-item">
            <div class="feed-dot ${dotClass}"></div>
            <span class="feed-email">${escHtml(ev.email)}</span>
            <span class="feed-time mono">${relTime(ev.timestamp)}</span>
          </div>`;
      }).join('');
    }
  } catch { activityFeed.innerHTML = '<div class="feed-loader">Failed to load.</div>'; }
}

async function loadHistory() {
  try {
    const data = await api('GET', '/auth/history');
    if (data.success) {
      if (!data.history.length) {
        historyBody.innerHTML = '<tr><td colspan="4" class="loading-row">No history yet.</td></tr>';
        return;
      }
      historyBody.innerHTML = data.history.map(ev => {
        const pillClass = ev.status === 'SUCCESS' ? 'success' : ev.status === 'REGISTERED' ? 'reg' : ev.status === 'ACCOUNT_LOCKED' ? 'locked' : 'failed';
        return `<tr>
          <td><span class="pill ${pillClass}">${ev.status}</span></td>
          <td>${escHtml(ev.reason || '—')}</td>
          <td class="mono">${escHtml(ev.ip_address || '—')}</td>
          <td class="mono">${relTime(ev.timestamp)}</td>
        </tr>`;
      }).join('');
    }
  } catch { historyBody.innerHTML = '<tr><td colspan="4" class="loading-row">Failed to load.</td></tr>'; }
}

btnRefresh.addEventListener('click', async () => {
  btnRefresh.style.transform = 'rotate(90deg)';
  await Promise.all([loadStats(), loadActivity(), loadHistory()]);
  setTimeout(() => btnRefresh.style.transform = '', 400);
});

// ── Utilities ─────────────────────────────────────────────────────
function escHtml(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(str));
  return d.innerHTML;
}

function relTime(unixSeconds) {
  const diff = Math.floor(Date.now() / 1000) - unixSeconds;
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(unixSeconds * 1000).toLocaleDateString();
}

function animateNum(el, target) {
  const start = 0;
  const duration = 800;
  const startTime = performance.now();
  const update = (now) => {
    const progress = Math.min((now - startTime) / duration, 1);
    el.textContent = Math.round(start + (target - start) * progress);
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

// ── Init ──────────────────────────────────────────────────────────
if (state.token && state.user) {
  // Verify token is still valid
  api('GET', '/auth/me').then(data => {
    if (data.success) {
      showDashboard();
    } else {
      state.token = null;
      state.user  = null;
      localStorage.removeItem('shieldauth_token');
      localStorage.removeItem('shieldauth_user');
      showAuth();
    }
  }).catch(() => showAuth());
} else {
  showAuth();
}
