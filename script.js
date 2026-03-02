// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CATEGORY CONFIG
// Each category has a label, an emoji icon, and a hex colour.
// The colour is used for the left border and the icon background tint.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const CATS = {
  food:          { label: 'Food',          icon: '🍔', color: '#f97316' },
  transport:     { label: 'Transport',     icon: '🚗', color: '#3b82f6' },
  shopping:      { label: 'Shopping',      icon: '🛍️', color: '#a855f7' },
  bills:         { label: 'Bills',         icon: '⚡', color: '#ef4444' },
  entertainment: { label: 'Entertainment', icon: '🎬', color: '#f59e0b' },
  other:         { label: 'Other',         icon: '📦', color: '#64748b' },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STATE — loaded from localStorage so data survives page refreshes
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
let expenses = JSON.parse(localStorage.getItem('et_expenses') || '[]');
let budget   = parseFloat(localStorage.getItem('et_budget')   || '0');
let chart    = null;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PERSISTENCE — call save() any time state changes
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function save() {
  localStorage.setItem('et_expenses', JSON.stringify(expenses));
  localStorage.setItem('et_budget',   String(budget));
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Format a number as currency: 1234.5 → "$1,234.50"
function fmt(n) {
  return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Turn "2024-03-15" into "Today", "Yesterday", or "Mar 15, 2024"
function fmtDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  const date      = new Date(y, m - 1, d);
  const today     = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString())     return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Generate a unique ID: timestamp + random suffix
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RENDER — rebuilds the entire UI from the current state.
// Called once on page load and after every state change.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function render() {
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  // ── Header total ──────────────────────────────────────────────────────
  const totalEl = document.getElementById('totalAmount');
  totalEl.textContent = fmt(total);
  totalEl.classList.toggle('over', budget > 0 && total > budget);

  // ── Budget progress bar ───────────────────────────────────────────────
  const progressEl = document.getElementById('budgetProgress');
  const alertEl    = document.getElementById('budgetAlert');

  if (budget > 0) {
    progressEl.style.display = 'block';

    const pct  = (total / budget) * 100;
    const fill = document.getElementById('budgetFill');

    fill.style.width = Math.min(pct, 100) + '%';

    // Colour shifts from green → amber → red as you approach/exceed budget
    if      (pct >= 100) fill.style.background = '#ef4444';
    else if (pct >= 80)  fill.style.background = '#f59e0b';
    else                 fill.style.background = '#10b981';

    document.getElementById('spentLabel').textContent  = `Spent: ${fmt(total)}`;
    document.getElementById('budgetLabel').textContent = `Budget: ${fmt(budget)}`;

    // Show warning only when over budget
    if (total > budget) {
      alertEl.style.display = 'flex';
      document.getElementById('alertText').textContent =
        `You're ${fmt(total - budget)} over your ${fmt(budget)} budget!`;
    } else {
      alertEl.style.display = 'none';
    }
  } else {
    progressEl.style.display = 'none';
  }

  // ── Transaction list ──────────────────────────────────────────────────
  const listEl  = document.getElementById('txList');
  const countEl = document.getElementById('txCount');
  const n       = expenses.length;

  countEl.textContent = n + (n === 1 ? ' expense' : ' expenses');

  updateChart();

  if (n === 0) {
    listEl.innerHTML = `
      <div class="empty">
        <div class="empty-emoji">💸</div>
        <div class="empty-title">No expenses yet</div>
        <div class="empty-sub">Add your first expense above to start tracking</div>
      </div>`;
    return;
  }

  // Build each transaction row from a template string
  listEl.innerHTML = expenses.map(e => {
    const cat = CATS[e.category] || CATS.other;
    // "1a" appended to hex color = ~10% opacity tint for icon background
    return `
      <div class="tx-item" id="tx-${e.id}" style="border-left-color:${cat.color}">
        <div class="tx-icon" style="background:${cat.color}1a">${cat.icon}</div>
        <div class="tx-body">
          <div class="tx-cat" style="color:${cat.color}">${cat.label}</div>
          <div class="tx-note">${e.notes || '—'}</div>
          <div class="tx-date">${fmtDate(e.date)}</div>
        </div>
        <div class="tx-right">
          <div class="tx-amount">${fmt(e.amount)}</div>
          <button class="del-btn" onclick="deleteExpense('${e.id}')" title="Delete" aria-label="Delete expense">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      </div>`;
  }).join('');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CHART — doughnut showing spending totals per category
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function updateChart() {
  // Aggregate totals per category
  const totals = {};
  for (const e of expenses) {
    totals[e.category] = (totals[e.category] || 0) + e.amount;
  }

  const keys   = Object.keys(totals);
  const labels = keys.map(k => `${CATS[k].icon} ${CATS[k].label}`);
  const data   = keys.map(k => totals[k]);
  const colors = keys.map(k => CATS[k].color);

  const cardEl = document.getElementById('chartCard');

  if (keys.length === 0) {
    cardEl.style.display = 'none';
    return;
  }
  cardEl.style.display = 'block';

  if (!chart) {
    // First time: create the Chart.js instance
    chart = new Chart(document.getElementById('spendingChart'), {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors,
          borderColor: '#161b22',   // --surface: gap between slices matches card bg
          borderWidth: 3,
          hoverOffset: 8,
        }]
      },
      options: {
        responsive: true,
        cutout: '68%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#8b949e',    // --muted
              padding: 16,
              font: { size: 13, family: 'inherit' },
              usePointStyle: true,
              pointStyleWidth: 10,
            }
          },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.label}  ${fmt(ctx.parsed)}`
            },
            backgroundColor: '#21262d',  // --surface-2
            titleColor: '#e6edf3',        // --text
            bodyColor: '#e6edf3',
            borderColor: 'rgba(255,255,255,0.08)',
            borderWidth: 1,
          }
        }
      }
    });
  } else {
    // Subsequent updates: mutate data and call update() for smooth animation
    chart.data.labels                      = labels;
    chart.data.datasets[0].data            = data;
    chart.data.datasets[0].backgroundColor = colors;
    chart.update();
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ACTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function addExpense() {
  const amountEl   = document.getElementById('amount');
  const dateEl     = document.getElementById('date');
  const amount     = parseFloat(amountEl.value);
  const category   = document.getElementById('category').value;
  const date       = dateEl.value;
  const notes      = document.getElementById('notes').value.trim();

  // Validate — highlight offending fields with a red glow
  let valid = true;
  if (!amount || amount <= 0)  { markError(amountEl); valid = false; }
  if (!date)                   { markError(dateEl);   valid = false; }
  if (!valid) return;

  // Newest expense goes first (unshift = add to front of array)
  expenses.unshift({ id: uid(), amount, category, date, notes });
  save();
  render();

  // Clear the fields that change every time; keep date & category
  amountEl.value = '';
  document.getElementById('notes').value = '';
  amountEl.focus();
}

function deleteExpense(id) {
  const el = document.getElementById('tx-' + id);
  if (!el) return;

  // Two-phase animation: fade+slide out, then height collapse
  el.style.transition = 'opacity .15s, transform .15s';
  el.style.opacity    = '0';
  el.style.transform  = 'translateX(14px)';

  setTimeout(() => {
    // Lock the current height so we can animate it to zero
    el.style.transition   = 'height .18s, padding .18s, margin .18s, border-width .18s';
    el.style.overflow     = 'hidden';
    el.style.height       = el.offsetHeight + 'px';

    // One frame later, collapse to nothing
    requestAnimationFrame(() => {
      el.style.height           = '0';
      el.style.paddingTop       = '0';
      el.style.paddingBottom    = '0';
      el.style.marginBottom     = '0';
      el.style.borderTopWidth   = '0';
      el.style.borderBottomWidth = '0';
    });

    setTimeout(() => {
      expenses = expenses.filter(e => e.id !== id);
      save();
      render();
    }, 180);
  }, 150);
}

function setBudget() {
  const val = parseFloat(document.getElementById('budgetInput').value);
  if (!isNaN(val) && val >= 0) {
    budget = val;
    save();
    render();
  }
}

// Flash an input red and focus it to signal a validation error
function markError(el) {
  el.classList.add('error');
  el.focus();
  setTimeout(() => el.classList.remove('error'), 1500);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INIT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Default the date picker to today
document.getElementById('date').valueAsDate = new Date();

// Re-populate budget input if one was previously saved
if (budget > 0) document.getElementById('budgetInput').value = budget;

// Let the user press Enter to submit from these fields
document.getElementById('amount').addEventListener('keydown', e => {
  if (e.key === 'Enter') addExpense();
});
document.getElementById('budgetInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') setBudget();
});

// Draw the initial UI
render();
