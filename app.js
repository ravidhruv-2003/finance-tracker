/* ═══════════════════════════════════════════════════════════
   FinanceFlow – Personal Finance Tracker
   Application Logic – Firebase Auth + Firestore backend
   ═══════════════════════════════════════════════════════════ */

// ─── Categories ───
const EXPENSE_CATEGORIES = [
  { name: 'Food & Dining', icon: '🍔', color: '#f87171' },
  { name: 'Transportation', icon: '🚗', color: '#fbbf24' },
  { name: 'Shopping', icon: '🛍️', color: '#f472b6' },
  { name: 'Entertainment', icon: '🎬', color: '#a78bfa' },
  { name: 'Bills & Utilities', icon: '💡', color: '#22d3ee' },
  { name: 'Health & Fitness', icon: '💊', color: '#34d399' },
  { name: 'Education', icon: '📚', color: '#818cf8' },
  { name: 'Travel', icon: '✈️', color: '#fb923c' },
  { name: 'Groceries', icon: '🛒', color: '#4ade80' },
  { name: 'Rent & Housing', icon: '🏠', color: '#60a5fa' },
  { name: 'Insurance', icon: '🛡️', color: '#c084fc' },
  { name: 'Other Expense', icon: '📦', color: '#94a3b8' },
];

const INCOME_CATEGORIES = [
  { name: 'Salary', icon: '💼', color: '#34d399' },
  { name: 'Freelance', icon: '💻', color: '#22d3ee' },
  { name: 'Investments', icon: '📈', color: '#818cf8' },
  { name: 'Business', icon: '🏢', color: '#fbbf24' },
  { name: 'Rental Income', icon: '🏘️', color: '#60a5fa' },
  { name: 'Gifts', icon: '🎁', color: '#f472b6' },
  { name: 'Other Income', icon: '💰', color: '#a78bfa' },
];

const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

// ─── State ───
let transactions = [];
let budgets = {};
let currentView = 'dashboard';
let editingId = null;
let currentUser = null;
let unsubscribeTransactions = null;
let unsubscribeBudgets = null;

// ─── Chart instances ───
let chartMonthly = null;
let chartCategory = null;
let chartIncomeExpense = null;
let chartTrend = null;
let chartTopSpending = null;
let chartIncomeSources = null;

// ─── DOM helpers ───
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ─── Firestore collection helpers ───
function txnCol(uid) { return db.collection('users').doc(uid).collection('transactions'); }
function budgetDoc(uid) { return db.collection('users').doc(uid).collection('budgets').doc('data'); }

/* ═══════════════════════════════════════════════════════════
   AUTH SCREEN
   ═══════════════════════════════════════════════════════════ */

function initAuth() {
  const tabBtns = $$('.auth-tab');
  const form = $('#auth-form');
  const nameField = $('#auth-field-name');
  const submitLabel = $('#auth-submit-label');
  const switchBtn = $('#auth-switch-btn');
  const switchText = $('#auth-switch-text');
  const errorEl = $('#auth-error');
  const pwToggle = $('#password-toggle');
  const pwInput = $('#auth-password');

  let mode = 'signin'; // 'signin' | 'signup'

  // Tab click
  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      mode = btn.dataset.tab;
      applyMode();
    });
  });

  // Switch text link
  switchBtn.addEventListener('click', () => {
    mode = mode === 'signin' ? 'signup' : 'signin';
    applyMode();
  });

  // Google sign-in
  $('#btn-google-signin').addEventListener('click', async () => {
    clearAuthError();
    setAuthLoading(true);
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      await auth.signInWithPopup(provider);
      // onAuthStateChanged handles showing the app
    } catch (err) {
      showAuthError(friendlyAuthError(err.code));
      setAuthLoading(false);
    }
  });

  // Email/password form
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAuthError();
    setAuthLoading(true);

    const email = $('#auth-email').value.trim();
    const password = $('#auth-password').value;

    try {
      if (mode === 'signup') {
        const name = $('#auth-name').value.trim() || 'User';
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        await cred.user.updateProfile({ displayName: name });
      } else {
        await auth.signInWithEmailAndPassword(email, password);
      }
    } catch (err) {
      showAuthError(friendlyAuthError(err.code));
      setAuthLoading(false);
    }
  });

  // Password visibility toggle
  pwToggle.addEventListener('click', () => {
    const isText = pwInput.type === 'text';
    pwInput.type = isText ? 'password' : 'text';
    $('#eye-icon').innerHTML = isText
      ? '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'
      : '<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';
  });

  function applyMode() {
    tabBtns.forEach((b) => b.classList.toggle('active', b.dataset.tab === mode));
    clearAuthError();
    if (mode === 'signup') {
      nameField.style.display = '';
      submitLabel.textContent = 'Create Account';
      switchText.innerHTML = 'Already have an account? <button class="auth-switch-btn" id="auth-switch-btn">Sign in</button>';
    } else {
      nameField.style.display = 'none';
      submitLabel.textContent = 'Sign In';
      switchText.innerHTML = "Don't have an account? <button class=\"auth-switch-btn\" id=\"auth-switch-btn\">Create one</button>";
    }
    // Re-attach click on the new button
    $('#auth-switch-btn').addEventListener('click', () => {
      mode = mode === 'signin' ? 'signup' : 'signin';
      applyMode();
    });
  }

  function showAuthError(msg) {
    errorEl.textContent = msg;
    errorEl.style.display = 'block';
  }
  function clearAuthError() {
    errorEl.textContent = '';
    errorEl.style.display = 'none';
  }
  function setAuthLoading(state) {
    $('#auth-spinner').style.display = state ? 'inline-block' : 'none';
    $('#btn-auth-submit').disabled = state;
    $('#btn-google-signin').disabled = state;
  }
}

function friendlyAuthError(code) {
  const map = {
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/too-many-requests': 'Too many attempts. Please wait and try again.',
    'auth/popup-closed-by-user': 'Sign-in popup closed. Please try again.',
    'auth/network-request-failed': 'Network error. Check your connection.',
    'auth/invalid-credential': 'Incorrect email or password.',
    'auth/operation-not-allowed': 'Email/Password sign-in is disabled in your Firebase Console (Authentication -> Sign-in method).',
  };
  return map[code] || `Authentication error (${code || 'unknown'}). Please try again.`;
}

/* ═══════════════════════════════════════════════════════════
   AUTH STATE OBSERVER
   ═══════════════════════════════════════════════════════════ */

auth.onAuthStateChanged(async (user) => {
  if (user) {
    // ── Signed in ──
    currentUser = user;

    // Save/update user document in Firestore so user details (email, name) are stored & viewable in Firestore
    db.collection('users').doc(user.uid).set({
      email: user.email || '',
      displayName: user.displayName || 'User',
      lastLogin: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).catch((err) => console.error('Error saving user profile:', err));

    showPageLoader(false);
    showAuthOverlay(false);
    showMainApp(true);
    updateUserChip(user);
    subscribeToUserData(user.uid);
  } else {
    // ── Signed out ──
    currentUser = null;
    unsubscribeListeners();
    transactions = [];
    budgets = {};
    showPageLoader(false);
    showAuthOverlay(true);
    showMainApp(false);
  }
});

function showPageLoader(show) {
  $('#page-loader').style.display = show ? 'flex' : 'none';
}
function showAuthOverlay(show) {
  $('#auth-overlay').classList.toggle('visible', show);
}
function showMainApp(show) {
  $('#sidebar').style.display = show ? '' : 'none';
  $('#main-content').style.display = show ? '' : 'none';
}

function updateUserChip(user) {
  $('#user-name').textContent = user.displayName || 'User';
  $('#user-email').textContent = user.email || '';

  const avatarEl = $('#user-avatar');
  if (user.photoURL) {
    avatarEl.innerHTML = `<img src="${user.photoURL}" alt="Avatar" referrerpolicy="no-referrer">`;
  } else {
    const initials = (user.displayName || user.email || 'U')
      .split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
    avatarEl.innerHTML = `<span class="user-initials">${initials}</span>`;
  }
}

/* ═══════════════════════════════════════════════════════════
   FIRESTORE REAL-TIME LISTENERS
   ═══════════════════════════════════════════════════════════ */

function subscribeToUserData(uid) {
  // Transactions listener
  unsubscribeTransactions = txnCol(uid)
    .orderBy('createdAt', 'desc')
    .onSnapshot((snap) => {
      transactions = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      renderAll();
    }, (err) => {
      console.error('Transactions listener error:', err);
    });

  // Budgets listener
  unsubscribeBudgets = budgetDoc(uid)
    .onSnapshot((snap) => {
      budgets = snap.exists ? snap.data() : {};
      renderBudgetForm();
      renderBudgetProgress();
    }, (err) => {
      console.error('Budgets listener error:', err);
    });
}

function unsubscribeListeners() {
  if (unsubscribeTransactions) { unsubscribeTransactions(); unsubscribeTransactions = null; }
  if (unsubscribeBudgets) { unsubscribeBudgets(); unsubscribeBudgets = null; }
}

/* ═══════════════════════════════════════════════════════════
   INITIALIZATION (runs once DOM is ready)
   ═══════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  // Show page loader until Firebase resolves auth state
  showPageLoader(true);
  showMainApp(false);

  initDate();
  initAuth();
  initNavigation();
  initModal();
  initFilters();
  initSignOut();
  initClearData();
});

// ─── Display current date ───
function initDate() {
  const now = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  $('#date-display').textContent = now.toLocaleDateString('en-IN', options);
}

/* ═══════════════════════════════════════════════════════════
   NAVIGATION
   ═══════════════════════════════════════════════════════════ */

function initNavigation() {
  $$('.nav-btn[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  $('#hamburger').addEventListener('click', () => {
    $('#sidebar').classList.toggle('open');
  });

  document.addEventListener('click', (e) => {
    const sidebar = $('#sidebar');
    const hamburger = $('#hamburger');
    if (
      sidebar.classList.contains('open') &&
      !sidebar.contains(e.target) &&
      !hamburger.contains(e.target)
    ) {
      sidebar.classList.remove('open');
    }
  });

  $('#btn-view-all').addEventListener('click', () => switchView('transactions'));
}

function switchView(view) {
  currentView = view;

  $$('.nav-btn[data-view]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });

  $$('.view').forEach((v) => v.classList.remove('active'));
  $(`#view-${view}`).classList.add('active');

  const titles = { dashboard: 'Dashboard', transactions: 'Transactions', analytics: 'Analytics', budgets: 'Budgets' };
  $('#page-title').textContent = titles[view] || 'Dashboard';

  $('#sidebar').classList.remove('open');

  if (view === 'analytics') renderAnalyticsCharts();
  if (view === 'budgets') renderBudgetProgress();
  if (view === 'transactions') renderAllTransactions();
}

/* ═══════════════════════════════════════════════════════════
   SIGN OUT
   ═══════════════════════════════════════════════════════════ */

function initSignOut() {
  $('#btn-signout').addEventListener('click', async () => {
    await auth.signOut();
    showToast('Signed out successfully', 'info');
  });
}

/* ═══════════════════════════════════════════════════════════
   MODAL
   ═══════════════════════════════════════════════════════════ */

function initModal() {
  const overlay = $('#modal-overlay');
  const form = $('#transaction-form');

  $('#btn-add-transaction').addEventListener('click', () => openModal());
  $('#modal-close').addEventListener('click', () => closeModal());
  $('#btn-cancel').addEventListener('click', () => closeModal());

  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

  $$('#txn-type-toggle .toggle-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('#txn-type-toggle .toggle-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      $('#txn-type').value = btn.dataset.value;
      populateCategorySelect(btn.dataset.value);
    });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    saveTransaction();
  });
}

function openModal(txn = null) {
  editingId = txn ? txn.id : null;
  $('#modal-title').textContent = txn ? 'Edit Transaction' : 'Add Transaction';
  $('#btn-save').textContent = txn ? 'Update Transaction' : 'Save Transaction';

  if (txn) {
    $$('#txn-type-toggle .toggle-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.value === txn.type);
    });
    $('#txn-type').value = txn.type;
    populateCategorySelect(txn.type);
    $('#txn-amount').value = txn.amount;
    $('#txn-date').value = txn.date;
    $('#txn-category').value = txn.category;
    $('#txn-description').value = txn.description;
  } else {
    $('#transaction-form').reset();
    $$('#txn-type-toggle .toggle-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.value === 'expense');
    });
    $('#txn-type').value = 'expense';
    populateCategorySelect('expense');
    $('#txn-date').value = new Date().toISOString().split('T')[0];
  }

  $('#modal-overlay').classList.add('open');
}

function closeModal() {
  $('#modal-overlay').classList.remove('open');
  editingId = null;
}

function populateCategorySelect(type) {
  const select = $('#txn-category');
  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  select.innerHTML = categories
    .map((cat) => `<option value="${cat.name}">${cat.icon} ${cat.name}</option>`)
    .join('');
}

/* ═══════════════════════════════════════════════════════════
   TRANSACTIONS CRUD (Firestore)
   ═══════════════════════════════════════════════════════════ */

async function saveTransaction() {
  if (!currentUser) return;

  const type = $('#txn-type').value;
  const amount = parseFloat($('#txn-amount').value);
  const date = $('#txn-date').value;
  const category = $('#txn-category').value;
  const description = $('#txn-description').value.trim();

  if (!amount || !date || !category || !description) {
    showToast('Please fill in all fields', 'error');
    return;
  }

  const saveBtn = $('#btn-save');
  saveBtn.disabled = true;

  try {
    if (editingId) {
      await txnCol(currentUser.uid).doc(editingId).update({ type, amount, date, category, description });
      showToast('Transaction updated successfully', 'success');
    } else {
      await txnCol(currentUser.uid).add({
        type, amount, date, category, description,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      showToast('Transaction added successfully', 'success');
    }
    closeModal();
  } catch (err) {
    console.error('Save transaction error:', err);
    showToast('Failed to save transaction. Try again.', 'error');
  } finally {
    saveBtn.disabled = false;
  }
}

async function deleteTransaction(id) {
  if (!currentUser) return;
  try {
    await txnCol(currentUser.uid).doc(id).delete();
    showToast('Transaction deleted', 'info');
  } catch (err) {
    console.error('Delete error:', err);
    showToast('Failed to delete transaction.', 'error');
  }
}

/* ═══════════════════════════════════════════════════════════
   BUDGETS (Firestore)
   ═══════════════════════════════════════════════════════════ */

async function saveBudget(category, value) {
  if (!currentUser) return;
  try {
    if (value > 0) {
      await budgetDoc(currentUser.uid).set({ [category]: value }, { merge: true });
    } else {
      await budgetDoc(currentUser.uid).set(
        { [category]: firebase.firestore.FieldValue.delete() },
        { merge: true }
      );
    }
  } catch (err) {
    console.error('Budget save error:', err);
    showToast('Failed to save budget.', 'error');
  }
}

/* ═══════════════════════════════════════════════════════════
   CLEAR DATA
   ═══════════════════════════════════════════════════════════ */

function initClearData() {
  $('#btn-clear-data').addEventListener('click', async () => {
    if (!currentUser) return;
    const ok = confirm('Delete ALL your transactions and budgets? This cannot be undone.');
    if (!ok) return;

    try {
      // Delete all transactions in batches
      const snap = await txnCol(currentUser.uid).get();
      const batchSize = 500;
      let batch = db.batch();
      let count = 0;
      snap.docs.forEach((doc) => {
        batch.delete(doc.ref);
        count++;
        if (count >= batchSize) {
          batch.commit();
          batch = db.batch();
          count = 0;
        }
      });
      if (count > 0) await batch.commit();

      // Delete budget document
      await budgetDoc(currentUser.uid).delete();

      showToast('All data has been cleared', 'info');
    } catch (err) {
      console.error('Clear data error:', err);
      showToast('Failed to clear data.', 'error');
    }
  });
}

/* ═══════════════════════════════════════════════════════════
   RENDERING
   ═══════════════════════════════════════════════════════════ */

function renderAll() {
  renderSummaryCards();
  renderDashboardCharts();
  renderRecentTransactions();
  renderAllTransactions();
  renderBudgetProgress();
  populateFilterCategories();
}

// ─── Summary Cards ───
function renderSummaryCards() {
  const income = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;

  animateValue('#total-balance', balance);
  animateValue('#total-income', income);
  animateValue('#total-expense', expense);

  const countEl = $('#total-count');
  countEl.textContent = transactions.length;
  countEl.classList.add('animate-value');
  setTimeout(() => countEl.classList.remove('animate-value'), 400);
}

function animateValue(selector, value) {
  const el = $(selector);
  el.textContent = formatCurrency(value);
  el.classList.add('animate-value');
  setTimeout(() => el.classList.remove('animate-value'), 400);
}

function formatCurrency(amount) {
  const formatted = Math.abs(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
  return amount < 0 ? `-₹${formatted}` : `₹${formatted}`;
}

// ─── Dashboard Charts ───
function renderDashboardCharts() {
  renderMonthlyChart();
  renderCategoryChart();
}

function renderMonthlyChart() {
  const ctx = $('#chart-monthly').getContext('2d');
  const months = getLast6Months();

  const incomeData = months.map((m) => transactions.filter((t) => t.type === 'income' && t.date.startsWith(m.key)).reduce((s, t) => s + t.amount, 0));
  const expenseData = months.map((m) => transactions.filter((t) => t.type === 'expense' && t.date.startsWith(m.key)).reduce((s, t) => s + t.amount, 0));

  if (chartMonthly) chartMonthly.destroy();
  chartMonthly = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: months.map((m) => m.label),
      datasets: [
        { label: 'Income', data: incomeData, backgroundColor: 'rgba(52,211,153,0.7)', borderColor: '#34d399', borderWidth: 1, borderRadius: 6, borderSkipped: false },
        { label: 'Expenses', data: expenseData, backgroundColor: 'rgba(248,113,113,0.7)', borderColor: '#f87171', borderWidth: 1, borderRadius: 6, borderSkipped: false },
      ],
    },
    options: getBarChartOptions(),
  });
}

function renderCategoryChart() {
  const ctx = $('#chart-category').getContext('2d');
  const categoryTotals = {};
  transactions.filter((t) => t.type === 'expense').forEach((t) => {
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
  });

  const entries = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  const labels = entries.map(([cat]) => cat);
  const data = entries.map(([, val]) => val);
  const colors = labels.map((label) => { const c = ALL_CATEGORIES.find((c) => c.name === label); return c ? c.color : '#94a3b8'; });

  if (chartCategory) chartCategory.destroy();
  if (data.length === 0) {
    chartCategory = new Chart(ctx, { type: 'doughnut', data: { labels: ['No data yet'], datasets: [{ data: [1], backgroundColor: ['rgba(255,255,255,0.06)'], borderWidth: 0 }] }, options: getDoughnutOptions() });
    return;
  }
  chartCategory = new Chart(ctx, { type: 'doughnut', data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0, hoverOffset: 8 }] }, options: getDoughnutOptions() });
}

// ─── Analytics Charts ───
function renderAnalyticsCharts() {
  renderIncomeExpenseChart();
  renderTrendChart();
  renderTopSpendingChart();
  renderIncomeSourcesChart();
}

function renderIncomeExpenseChart() {
  const ctx = $('#chart-income-expense').getContext('2d');
  const months = getLast6Months();
  const incomeData = months.map((m) => transactions.filter((t) => t.type === 'income' && t.date.startsWith(m.key)).reduce((s, t) => s + t.amount, 0));
  const expenseData = months.map((m) => transactions.filter((t) => t.type === 'expense' && t.date.startsWith(m.key)).reduce((s, t) => s + t.amount, 0));

  if (chartIncomeExpense) chartIncomeExpense.destroy();
  chartIncomeExpense = new Chart(ctx, {
    type: 'line',
    data: {
      labels: months.map((m) => m.label),
      datasets: [
        { label: 'Income', data: incomeData, borderColor: '#34d399', backgroundColor: 'rgba(52,211,153,0.1)', fill: true, tension: 0.4, pointBackgroundColor: '#34d399', pointRadius: 5, pointHoverRadius: 7 },
        { label: 'Expenses', data: expenseData, borderColor: '#f87171', backgroundColor: 'rgba(248,113,113,0.1)', fill: true, tension: 0.4, pointBackgroundColor: '#f87171', pointRadius: 5, pointHoverRadius: 7 },
      ],
    },
    options: getLineChartOptions(),
  });
}

function renderTrendChart() {
  const ctx = $('#chart-trend').getContext('2d');
  const months = getLast6Months();
  let runningBalance = 0;
  const balanceData = months.map((m) => {
    const income = transactions.filter((t) => t.type === 'income' && t.date.startsWith(m.key)).reduce((s, t) => s + t.amount, 0);
    const expense = transactions.filter((t) => t.type === 'expense' && t.date.startsWith(m.key)).reduce((s, t) => s + t.amount, 0);
    runningBalance += income - expense;
    return runningBalance;
  });

  if (chartTrend) chartTrend.destroy();
  chartTrend = new Chart(ctx, {
    type: 'line',
    data: {
      labels: months.map((m) => m.label),
      datasets: [{ label: 'Balance', data: balanceData, borderColor: '#818cf8', backgroundColor: createGradient(ctx, '#818cf8'), fill: true, tension: 0.4, pointBackgroundColor: '#818cf8', pointRadius: 5, pointHoverRadius: 7 }],
    },
    options: getLineChartOptions(),
  });
}

function renderTopSpendingChart() {
  const ctx = $('#chart-top-spending').getContext('2d');
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const categoryTotals = {};
  transactions.filter((t) => t.type === 'expense' && t.date.startsWith(currentMonth)).forEach((t) => {
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
  });

  const entries = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const labels = entries.map(([cat]) => cat);
  const data = entries.map(([, val]) => val);
  const colors = labels.map((label) => { const c = ALL_CATEGORIES.find((c) => c.name === label); return c ? c.color : '#94a3b8'; });

  if (chartTopSpending) chartTopSpending.destroy();
  chartTopSpending = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Spent', data, backgroundColor: colors.map((c) => c + 'BB'), borderColor: colors, borderWidth: 1, borderRadius: 6, borderSkipped: false }] },
    options: { ...getBarChartOptions(), indexAxis: 'y' },
  });
}

function renderIncomeSourcesChart() {
  const ctx = $('#chart-income-sources').getContext('2d');
  const categoryTotals = {};
  transactions.filter((t) => t.type === 'income').forEach((t) => {
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
  });

  const entries = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  const labels = entries.map(([cat]) => cat);
  const data = entries.map(([, val]) => val);
  const colors = labels.map((label) => { const c = ALL_CATEGORIES.find((c) => c.name === label); return c ? c.color : '#94a3b8'; });

  if (chartIncomeSources) chartIncomeSources.destroy();
  if (data.length === 0) {
    chartIncomeSources = new Chart(ctx, { type: 'doughnut', data: { labels: ['No data yet'], datasets: [{ data: [1], backgroundColor: ['rgba(255,255,255,0.06)'], borderWidth: 0 }] }, options: getDoughnutOptions() });
    return;
  }
  chartIncomeSources = new Chart(ctx, { type: 'doughnut', data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0, hoverOffset: 8 }] }, options: getDoughnutOptions() });
}

// ─── Chart helpers ───
function getLast6Months() {
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
    });
  }
  return months;
}

function createGradient(ctx, color) {
  const gradient = ctx.canvas.getContext('2d').createLinearGradient(0, 0, 0, 280);
  gradient.addColorStop(0, color + '40');
  gradient.addColorStop(1, color + '00');
  return gradient;
}

function getBarChartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, labels: { color: '#94a3b8', font: { family: 'Inter', size: 12 }, usePointStyle: true, pointStyle: 'rectRounded', padding: 20 } },
      tooltip: { backgroundColor: '#1e293b', titleColor: '#f1f5f9', bodyColor: '#94a3b8', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1, cornerRadius: 8, padding: 12, titleFont: { family: 'Inter', weight: '600' }, bodyFont: { family: 'Inter' }, callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y || ctx.parsed.x)}` } },
    },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { family: 'Inter', size: 11 } } },
      y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { family: 'Inter', size: 11 }, callback: (val) => formatCurrency(val) } },
    },
  };
}

function getLineChartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, labels: { color: '#94a3b8', font: { family: 'Inter', size: 12 }, usePointStyle: true, padding: 20 } },
      tooltip: { backgroundColor: '#1e293b', titleColor: '#f1f5f9', bodyColor: '#94a3b8', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1, cornerRadius: 8, padding: 12, titleFont: { family: 'Inter', weight: '600' }, bodyFont: { family: 'Inter' }, callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}` } },
    },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { family: 'Inter', size: 11 } } },
      y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { family: 'Inter', size: 11 }, callback: (val) => formatCurrency(val) } },
    },
  };
}

function getDoughnutOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: { position: 'bottom', labels: { color: '#94a3b8', font: { family: 'Inter', size: 11 }, usePointStyle: true, padding: 16, boxWidth: 8 } },
      tooltip: { backgroundColor: '#1e293b', titleColor: '#f1f5f9', bodyColor: '#94a3b8', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1, cornerRadius: 8, padding: 12, titleFont: { family: 'Inter', weight: '600' }, bodyFont: { family: 'Inter' }, callbacks: { label: (ctx) => ` ${ctx.label}: ${formatCurrency(ctx.parsed)}` } },
    },
  };
}

/* ═══════════════════════════════════════════════════════════
   TRANSACTION LIST RENDERING
   ═══════════════════════════════════════════════════════════ */

function renderRecentTransactions() {
  const container = $('#recent-transactions');
  const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
  const recent = sorted.slice(0, 5);

  if (recent.length === 0) {
    container.innerHTML = getEmptyState('No transactions yet', 'Add your first transaction to start tracking your finances.');
    return;
  }
  container.innerHTML = recent.map((t) => createTransactionItem(t)).join('');
  attachTransactionListeners(container);
}

function renderAllTransactions() {
  const container = $('#all-transactions');
  const filtered = getFilteredTransactions();

  if (filtered.length === 0) {
    container.innerHTML = getEmptyState('No transactions found', 'Try adjusting your filters or add new transactions.');
    return;
  }
  container.innerHTML = filtered.map((t) => createTransactionItem(t)).join('');
  attachTransactionListeners(container);
}

function getFilteredTransactions() {
  let result = [...transactions];
  const typeFilter = $('#filter-type').value;
  const categoryFilter = $('#filter-category').value;
  const searchFilter = $('#filter-search').value.toLowerCase().trim();
  const sortFilter = $('#filter-sort').value;

  if (typeFilter !== 'all') result = result.filter((t) => t.type === typeFilter);
  if (categoryFilter !== 'all') result = result.filter((t) => t.category === categoryFilter);
  if (searchFilter) result = result.filter((t) => t.description.toLowerCase().includes(searchFilter) || t.category.toLowerCase().includes(searchFilter));

  switch (sortFilter) {
    case 'newest': result.sort((a, b) => new Date(b.date) - new Date(a.date)); break;
    case 'oldest': result.sort((a, b) => new Date(a.date) - new Date(b.date)); break;
    case 'highest': result.sort((a, b) => b.amount - a.amount); break;
    case 'lowest': result.sort((a, b) => a.amount - b.amount); break;
  }
  return result;
}

function createTransactionItem(t) {
  const cat = ALL_CATEGORIES.find((c) => c.name === t.category);
  const icon = cat ? cat.icon : '📌';
  const bgClass = t.type === 'income' ? 'income-bg' : 'expense-bg';
  const amountClass = t.type === 'income' ? 'income' : 'expense';
  const sign = t.type === 'income' ? '+' : '-';
  const dateFormatted = new Date(t.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return `
    <div class="txn-item" data-id="${t.id}">
      <div class="txn-icon-wrapper ${bgClass}">${icon}</div>
      <div class="txn-details">
        <div class="txn-description">${escapeHtml(t.description)}</div>
        <div class="txn-meta">
          <span>${dateFormatted}</span>
          <span class="txn-category-badge">${t.category}</span>
        </div>
      </div>
      <span class="txn-amount ${amountClass}">${sign}${formatCurrency(t.amount)}</span>
      <div class="txn-actions">
        <button class="txn-action-btn edit-btn"   title="Edit"   data-action="edit"   data-id="${t.id}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="txn-action-btn delete-btn" title="Delete" data-action="delete" data-id="${t.id}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
        </button>
      </div>
    </div>
  `;
}

function attachTransactionListeners(container) {
  container.querySelectorAll('.txn-action-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      if (action === 'edit') {
        const txn = transactions.find((t) => t.id === id);
        if (txn) openModal(txn);
      } else if (action === 'delete') {
        deleteTransaction(id);
      }
    });
  });
}

function getEmptyState(title, message) {
  return `
    <div class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
      <h3>${title}</h3>
      <p>${message}</p>
    </div>
  `;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ═══════════════════════════════════════════════════════════
   FILTERS
   ═══════════════════════════════════════════════════════════ */

function initFilters() {
  $('#filter-type').addEventListener('change', renderAllTransactions);
  $('#filter-category').addEventListener('change', renderAllTransactions);
  $('#filter-search').addEventListener('input', debounce(renderAllTransactions, 300));
  $('#filter-sort').addEventListener('change', renderAllTransactions);
}

function populateFilterCategories() {
  const select = $('#filter-category');
  const currentValue = select.value;
  const usedCategories = [...new Set(transactions.map((t) => t.category))].sort();

  select.innerHTML =
    '<option value="all">All Categories</option>' +
    usedCategories.map((cat) => `<option value="${cat}">${cat}</option>`).join('');

  if (usedCategories.includes(currentValue)) select.value = currentValue;
}

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/* ═══════════════════════════════════════════════════════════
   BUDGETS
   ═══════════════════════════════════════════════════════════ */

function renderBudgetForm() {
  const container = $('#budget-form');
  if (!container) return;

  container.innerHTML = EXPENSE_CATEGORIES.map((cat) => `
    <div class="budget-item">
      <span class="budget-item-icon">${cat.icon}</span>
      <span class="budget-item-name">${cat.name}</span>
      <input type="number" min="0" step="100" placeholder="₹ 0"
             value="${budgets[cat.name] || ''}"
             data-category="${cat.name}"
             class="budget-input" id="budget-${cat.name.replace(/\s+/g, '-').toLowerCase()}">
    </div>
  `).join('');

  container.querySelectorAll('.budget-input').forEach((input) => {
    input.addEventListener('change', async () => {
      const category = input.dataset.category;
      const value = parseFloat(input.value);
      if (!value || value <= 0) input.value = '';
      await saveBudget(category, value > 0 ? value : 0);
    });
  });
}

function renderBudgetProgress() {
  const container = $('#budget-progress');
  if (!container) return;

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const budgetEntries = Object.entries(budgets);

  if (budgetEntries.length === 0) {
    container.innerHTML = getEmptyState('No budgets set', 'Set monthly spending limits above to track your budget progress.');
    return;
  }

  container.innerHTML = budgetEntries.map(([category, limit]) => {
    const spent = transactions.filter((t) => t.type === 'expense' && t.category === category && t.date.startsWith(currentMonth)).reduce((s, t) => s + t.amount, 0);
    const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
    const remaining = limit - spent;
    const cat = ALL_CATEGORIES.find((c) => c.name === category);
    const icon = cat ? cat.icon : '📦';

    let statusClass = 'on-track', statusText = 'On Track', barClass = '';
    if (pct >= 100) { statusClass = 'over'; statusText = 'Over Budget'; barClass = 'danger'; }
    else if (pct >= 75) { statusClass = 'close'; statusText = 'Getting Close'; barClass = 'warning'; }

    return `
      <div class="budget-progress-item">
        <div class="budget-progress-header">
          <div class="budget-progress-label"><span>${icon}</span><span>${category}</span></div>
          <span class="budget-status ${statusClass}">${statusText}</span>
        </div>
        <div class="budget-progress-values">
          <strong>${formatCurrency(spent)}</strong> of ${formatCurrency(limit)} spent
          ${remaining >= 0
        ? `· <span style="color:var(--accent-green)">${formatCurrency(remaining)} left</span>`
        : `· <span style="color:var(--accent-red)">${formatCurrency(Math.abs(remaining))} over</span>`}
        </div>
        <div class="budget-bar-track" style="margin-top:10px;">
          <div class="budget-bar-fill ${barClass}" style="width:${pct}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

/* ═══════════════════════════════════════════════════════════
   TOAST NOTIFICATIONS
   ═══════════════════════════════════════════════════════════ */

function showToast(message, type = 'info') {
  const container = $('#toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icons = { success: '✓', error: '✗', info: 'ℹ' };
  toast.innerHTML = `
    <span style="font-size:1.1rem;font-weight:700;">${icons[type] || 'ℹ'}</span>
    <span class="toast-message">${message}</span>
  `;
  container.appendChild(toast);
  setTimeout(() => { if (toast.parentNode) toast.remove(); }, 3000);
}
