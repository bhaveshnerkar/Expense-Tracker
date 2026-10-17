
const SETTINGS_KEY = 'expenseflow.settings.v1';

const CATEGORIES = [
    'Food', 'Transport', 'Shopping', 'Bills',
    'Education', 'Health', 'Entertainment', 'Other'
];

const ICONS = {
    Food: '☕',
    Transport: '↗',
    Shopping: '◇',
    Bills: '▤',
    Education: '▣',
    Health: '＋',
    Entertainment: '♫',
    Other: '•'
};

const CURRENCIES = {
    INR: { locale: 'en-IN', symbol: '₹' },
    USD: { locale: 'en-US', symbol: '$' },
    EUR: { locale: 'de-DE', symbol: '€' },
    GBP: { locale: 'en-GB', symbol: '£' }
};

const $ = selector => document.querySelector(selector);
const $$ = selector => document.querySelectorAll(selector);

let expenses = [];
let settings = readStore(SETTINGS_KEY, {
    currency: 'INR',
    dark: false
});
let toastTimer;

// -------------------- STORAGE --------------------

function readStore(key, fallback) {
    try {
        return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
        return fallback;
    }
}

function storeSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// Expenses are now saved in SQLite through Flask.

// -------------------- BACKEND API --------------------

async function api(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            ...(options.body ? {
                'Content-Type': 'application/json'
            } : {}),
            ...(options.headers || {})
        }
    });

    let data = {};

    try {
        data = await response.json();
    } catch {
        // Handle responses without JSON.
    }

    if (!response.ok) {
        throw new Error(
            data.error || `Request failed (${response.status}).`
        );
    }

    return data;
}

async function loadExpenses() {
    expenses = await api('/api/expenses');

    expenses = expenses.map(expense => ({
        ...expense,
        id: String(expense.id),
        amount: Number(expense.amount),
        name: String(expense.name || ''),
        category: CATEGORIES.includes(expense.category)
            ? expense.category
            : 'Other',
        date: expense.date || today(),
        notes: String(expense.notes || ''),
        createdAt: Number(expense.createdAt) || 0
    }));

    renderAll();
}

// -------------------- HELPERS --------------------

function money(value) {
    const currency = CURRENCIES[settings.currency]
        ? settings.currency
        : 'INR';

    return new Intl.NumberFormat(
        CURRENCIES[currency].locale,
        {
            style: 'currency',
            currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    ).format(Number(value) || 0);
}

function today() {
    const d = new Date();

    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtDate(value) {
    if (!value) return '—';

    const d = new Date(value + 'T12:00:00');

    return Number.isNaN(d.getTime())
        ? value
        : d.toLocaleDateString(undefined, {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
}

function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[char]);
}

function notify(message) {
    const toast = $('#toast');

    if (!toast) {
        console.log(message);
        return;
    }

    toast.textContent = message;
    toast.classList.add('show');

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toast.classList.remove('show');
    }, 2600);
}

function go(page) {
    if (!document.getElementById(page)) return;

    $$('.page-section').forEach(section => {
        section.classList.toggle('active', section.id === page);
    });

    $$('.nav-link').forEach(button => {
        button.classList.toggle(
            'active',
            button.dataset.page === page
        );
    });

    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// -------------------- DASHBOARD --------------------

function categoryTotals(list) {
    const totals = {};

    list.forEach(expense => {
        totals[expense.category] =
            (totals[expense.category] || 0) + expense.amount;
    });

    return Object.entries(totals).sort(
        (a, b) => b[1] - a[1]
    );
}

function renderBars(container, list) {
    if (!container) return;

    const totals = categoryTotals(list);

    const total = totals.reduce(
        (sum, item) => sum + item[1],
        0
    );

    container.innerHTML = totals.map(([category, amount]) => `
        <div class="category-row">
            <div class="category-bar-head">
                <span>${esc(category)}</span>
                <span>${money(amount)} · ${Math.round(amount / (total || 1) * 100)}%</span>
            </div>
            <div class="bar-track">
                <div class="bar-fill"
                     style="width:${total ? Math.max(2, amount / total * 100) : 0}%">
                </div>
            </div>
        </div>
    `).join('') || '<p class="muted">No expenses recorded yet.</p>';
}

function renderDashboard() {
    const total = expenses.reduce(
        (sum, expense) => sum + expense.amount,
        0
    );

    if ($('#totalExpenses')) {
        $('#totalExpenses').textContent = money(total);
    }

    if ($('#transactionCount')) {
        $('#transactionCount').textContent = expenses.length;
    }

    if ($('#averageExpense')) {
        $('#averageExpense').textContent = money(
            expenses.length ? total / expenses.length : 0
        );
    }

    if ($('#snapshotTotal')) {
        $('#snapshotTotal').textContent = money(total);
    }

    const recent = [...expenses]
        .sort((a, b) =>
            b.date.localeCompare(a.date) ||
            b.createdAt - a.createdAt
        )
        .slice(0, 5);

    const recentList = $('#recentList');

    if (recentList) {
        recentList.innerHTML = recent.length
            ? recent.map(expense => `
                <div class="recent-row">
                    <span class="cat-icon">${ICONS[expense.category] || '•'}</span>
                    <div class="recent-info">
                        <strong>${esc(expense.name)}</strong>
                        <small>${esc(expense.category)} · ${fmtDate(expense.date)}</small>
                    </div>
                    <span class="recent-amount">${money(expense.amount)}</span>
                </div>
            `).join('')
            : `
                <div class="empty-state" style="display:block">
                    <div class="empty-symbol">↗</div>
                    <h3>No expenses yet</h3>
                    <p>Add your first expense to see it here.</p>
                    <button class="button secondary" data-action="add">
                        Add expense
                    </button>
                </div>
            `;
    }

    renderBars($('#dashboardCategories'), expenses);
}

// -------------------- TRANSACTIONS --------------------

function filteredExpenses() {
    const search = $('#searchInput')?.value.trim().toLowerCase() || '';
    const category = $('#categoryFilter')?.value || '';
    const sort = $('#sortSelect')?.value || 'newest';

    const list = expenses.filter(expense => {
        const matchesSearch = !search ||
            `${expense.name} ${expense.category} ${expense.notes}`
                .toLowerCase()
                .includes(search);

        const matchesCategory = !category ||
            expense.category === category;

        return matchesSearch && matchesCategory;
    });

    list.sort((a, b) => {
        if (sort === 'oldest') {
            return a.date.localeCompare(b.date) ||
                a.createdAt - b.createdAt;
        }

        if (sort === 'high') {
            return b.amount - a.amount;
        }

        if (sort === 'low') {
            return a.amount - b.amount;
        }

        return b.date.localeCompare(a.date) ||
            b.createdAt - a.createdAt;
    });

    return list;
}

function renderTransactions() {
    const rows = $('#transactionRows');

    if (!rows) return;

    const list = filteredExpenses();

    if ($('#rowCount')) {
        $('#rowCount').textContent =
            `${list.length} ${list.length === 1 ? 'item' : 'items'}`;
    }

    if ($('#tableSummary')) {
        $('#tableSummary').textContent =
            list.length === expenses.length
                ? 'Manage your recorded expenses'
                : `${list.length} of ${expenses.length} transactions shown`;
    }

    rows.innerHTML = list.map(expense => `
        <tr>
            <td>
                <div class="expense-cell">
                    <span class="cat-icon">${ICONS[expense.category] || '•'}</span>
                    <div>
                        <div class="expense-title">${esc(expense.name)}</div>
                        ${expense.notes
                            ? `<small class="expense-note">${esc(expense.notes)}</small>`
                            : ''}
                    </div>
                </div>
            </td>
            <td>
                <span class="category-pill">${esc(expense.category)}</span>
            </td>
            <td>${fmtDate(expense.date)}</td>
            <td class="amount-cell">${money(expense.amount)}</td>
            <td>
                <div class="row-actions">
                    <button data-edit="${esc(expense.id)}"
                            aria-label="Edit ${esc(expense.name)}"
                            title="Edit">✎</button>
                    <button class="delete"
                            data-delete="${esc(expense.id)}"
                            aria-label="Delete ${esc(expense.name)}"
                            title="Delete">⌫</button>
                </div>
            </td>
        </tr>
    `).join('');

    if ($('#emptyTransactions')) {
        $('#emptyTransactions').classList.toggle(
            'visible',
            list.length === 0
        );
    }

    if ($('#tableWrap')) {
        $('#tableWrap').style.display =
            list.length ? 'block' : 'none';
    }
}

// -------------------- REPORTS --------------------

function renderReports() {
    if (!$('#reportMonth')) return;

    const month = $('#reportMonth').value || today().slice(0, 7);

    const list = expenses.filter(expense =>
        expense.date.startsWith(month)
    );

    const total = list.reduce(
        (sum, expense) => sum + expense.amount,
        0
    );

    const largest = list.reduce(
        (best, expense) =>
            !best || expense.amount > best.amount ? expense : best,
        null
    );

    if ($('#monthTotal')) {
        $('#monthTotal').textContent = money(total);
    }

    if ($('#monthCount')) {
        $('#monthCount').textContent = list.length;
    }

    if ($('#monthLabel')) {
        $('#monthLabel').textContent =
            new Date(month + '-15T12:00:00')
                .toLocaleDateString(undefined, {
                    month: 'long',
                    year: 'numeric'
                });
    }

    if ($('#largestAmount')) {
        $('#largestAmount').textContent =
            money(largest ? largest.amount : 0);
    }

    if ($('#largestName')) {
        $('#largestName').textContent =
            largest ? largest.name : 'No expenses this month';
    }

    renderBars($('#reportCategories'), list);

    if ($('#reportEmpty')) {
        $('#reportEmpty').style.display =
            list.length ? 'none' : 'block';
    }

    const months = [];
    const anchor = new Date(month + '-15T12:00:00');

    for (let i = 5; i >= 0; i--) {
        const d = new Date(
            anchor.getFullYear(),
            anchor.getMonth() - i,
            1
        );

        const key =
            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

        const amount = expenses
            .filter(expense => expense.date.startsWith(key))
            .reduce((sum, expense) => sum + expense.amount, 0);

        months.push({
            label: d.toLocaleDateString(undefined, { month: 'short' }),
            amount
        });
    }

    const max = Math.max(1, ...months.map(month => month.amount));

    if ($('#monthlyBars')) {
        $('#monthlyBars').innerHTML = months.map(month => `
            <div class="monthly-row">
                <span class="month-name">${esc(month.label)}</span>
                <div class="month-track">
                    <div class="month-fill"
                         style="width:${month.amount / max * 100}%">
                    </div>
                </div>
                <strong>${money(month.amount)}</strong>
            </div>
        `).join('');
    }
}

function renderAll() {
    renderDashboard();
    renderTransactions();
    renderReports();
}

// -------------------- ADD / EDIT FORM --------------------

function openForm(expense = null) {
    go('transactions');

    const panel = $('#formPanel');
    if (!panel) {
        notify('Expense form was not found in the HTML.');
        return;
    }

    panel.hidden = false;

    $('#formTitle').textContent =
        expense ? 'Edit expense' : 'Add an expense';

    $('#expenseId').value = expense?.id || '';
    $('#expenseName').value = expense?.name || '';
    $('#expenseAmount').value = expense?.amount ?? '';
    $('#expenseCategory').value = expense?.category || 'Food';
    $('#expenseDate').value = expense?.date || today();
    $('#expenseNotes').value = expense?.notes || '';

    panel.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });

    $('#expenseName')?.focus();
}

function closeForm() {
    if ($('#formPanel')) {
        $('#formPanel').hidden = true;
    }

    $('#expenseForm')?.reset();

    if ($('#expenseId')) {
        $('#expenseId').value = '';
    }

    if ($('#expenseDate')) {
        $('#expenseDate').value = today();
    }
}

async function saveExpense(event) {
    event.preventDefault();

    const name = $('#expenseName').value.trim();
    const amount = Number($('#expenseAmount').value);
    const category = $('#expenseCategory').value;
    const date = $('#expenseDate').value;
    const notes = $('#expenseNotes').value.trim();
    const id = $('#expenseId').value;

    if (
        !name ||
        !Number.isFinite(amount) ||
        amount <= 0 ||
        !date ||
        !CATEGORIES.includes(category)
    ) {
        notify('Enter a name, positive amount, category, and date.');
        return;
    }

    const expense = {
        name,
        amount,
        category,
        date,
        notes
    };

    const submitButton = $('#expenseForm')?.querySelector(
        '[type="submit"]'
    );

    if (submitButton) submitButton.disabled = true;

    try {
        if (id) {
            await api(`/api/expenses/${encodeURIComponent(id)}`, {
                method: 'PUT',
                body: JSON.stringify(expense)
            });
        } else {
            await api('/api/expenses', {
                method: 'POST',
                body: JSON.stringify(expense)
            });
        }

        closeForm();
        await loadExpenses();

        notify(id ? 'Expense updated.' : 'Expense added.');
    } catch (error) {
        notify(error.message);
    } finally {
        if (submitButton) submitButton.disabled = false;
    }
}

async function removeExpense(id) {
    const expense = expenses.find(item => item.id === id);

    if (!expense || !confirm(`Delete "${expense.name}"?`)) {
        return;
    }

    try {
        await api(`/api/expenses/${encodeURIComponent(id)}`, {
            method: 'DELETE'
        });

        await loadExpenses();
        notify('Expense deleted.');
    } catch (error) {
        notify(error.message);
    }
}

// -------------------- CSV EXPORT --------------------

function exportCsv() {
    const rows = [
        ['Name', 'Amount', 'Category', 'Date', 'Notes'],
        ...expenses.map(expense => [
            expense.name,
            expense.amount,
            expense.category,
            expense.date,
            expense.notes || ''
        ])
    ];

    const csv = '\uFEFF' + rows.map(row =>
        row.map(value =>
            '"' + String(value).replace(/"/g, '""') + '"'
        ).join(',')
    ).join('\r\n');

    const url = URL.createObjectURL(
        new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    );

    const link = document.createElement('a');

    link.href = url;
    link.download = `expenseflow-${today()}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);

    notify('CSV export downloaded.');
}

// -------------------- SETTINGS --------------------

function applySettings() {
    document.body.classList.toggle('dark', !!settings.dark);

    if ($('#currencySetting')) {
        $('#currencySetting').value = settings.currency;
    }

    if ($('#themeToggle')) {
        $('#themeToggle').checked = !!settings.dark;
    }

    if ($('#themeText')) {
        $('#themeText').textContent =
            settings.dark ? 'Dark mode' : 'Light mode';
    }
}

// -------------------- INITIALIZATION --------------------

document.addEventListener('DOMContentLoaded', async () => {
    if (!CURRENCIES[settings.currency]) {
        settings.currency = 'INR';
    }

    if (!$('#reportMonth') || !$('#expenseForm')) {
        console.error(
            'Required dashboard elements were not found. Check index.html.'
        );
    }

    if ($('#reportMonth')) {
        $('#reportMonth').value = today().slice(0, 7);
    }

    if ($('#expenseDate')) {
        $('#expenseDate').value = today();
    }

    // Navigation
    $$('.nav-link, [data-page]').forEach(element => {
        element.addEventListener('click', () => {
            go(element.dataset.page);
        });
    });

    // Add-expense buttons
    document.addEventListener('click', event => {
        if (event.target.closest('[data-action="add"]')) {
            openForm();
        }
    });

    $('#addExpenseButton')?.addEventListener('click', () => openForm());
    $('#closeForm')?.addEventListener('click', closeForm);
    $('#cancelForm')?.addEventListener('click', closeForm);

    // Form submission
    $('#expenseForm')?.addEventListener('submit', saveExpense);

    // Search, filters and reports
    $('#searchInput')?.addEventListener('input', renderTransactions);
    $('#categoryFilter')?.addEventListener('change', renderTransactions);
    $('#sortSelect')?.addEventListener('change', renderTransactions);
    $('#reportMonth')?.addEventListener('change', renderReports);

    // Edit and delete buttons
    $('#transactionRows')?.addEventListener('click', event => {
        const editButton = event.target.closest('[data-edit]');
        const deleteButton = event.target.closest('[data-delete]');

        if (editButton) {
            const expense = expenses.find(
                item => item.id === editButton.dataset.edit
            );

            if (expense) openForm(expense);
        }

        if (deleteButton) {
            removeExpense(deleteButton.dataset.delete);
        }
    });

    // Currency
    $('#currencySetting')?.addEventListener('change', event => {
        settings.currency = CURRENCIES[event.target.value]
            ? event.target.value
            : 'INR';

        storeSettings();
        renderAll();
        notify('Currency updated.');
    });

    // Theme
    $('#themeToggle')?.addEventListener('change', event => {
        settings.dark = event.target.checked;

        storeSettings();
        applySettings();
        notify('Theme updated.');
    });

    // CSV export
    $('#exportButton')?.addEventListener('click', exportCsv);

    // Clear all expenses
    $('#clearButton')?.addEventListener('click', async () => {
        if (!expenses.length) {
            notify('There are no expenses to clear.');
            return;
        }

        if (!confirm(
            'Delete all expenses saved in the database? This cannot be undone.'
        )) {
            return;
        }

        try {
            await api('/api/expenses', {
                method: 'DELETE'
            });

            closeForm();
            await loadExpenses();

            notify('All expenses cleared.');
        } catch (error) {
            notify(error.message);
        }
    });

    // Apply preferences and load data from SQLite.
    applySettings();

    try {
        await loadExpenses();
    } catch (error) {
        console.error('Could not load expenses:', error);
        notify('Could not connect to Flask. Start the server with python app.py.');
    }
});
