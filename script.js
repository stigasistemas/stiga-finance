// ========================================
// STIGA FINANCE - FIRESTORE VERSION
// Dados sincronizados em nuvem
// ========================================

// Estado Global
let currentUser = null;
let currentUserUID = null;
let currentAccount = 'main';
let theme = 'dark';
let layoutMode = 'tabs';
let notifications = [];
let settings = {
    enableNotifications: true,
    enableSound: true,
    enablePushNotifications: false,
    notificationDays: 3
};
let accounts = {
    main: { name: '💰 Conta Principal', credits: [], debits: [], futurePurchases: [] }
};
let customCategories = {
    credit: ['Salário', 'Bonificação', 'Freelance', 'Investimento', 'Outro'],
    debit: ['Alimentação', 'Transporte', 'Moradia', 'Lazer', 'Contas', 'Outro']
};
let recurringTransactions = [];
let budgets = {};
let goals = [];
let credits = [];
let debits = [];
let futurePurchases = [];
let myChart = null;
let balanceChart = null;
let privacyMode = false;
let currentCategoryType = 'credit';
let chatbotOpen = false;
let db = null;
let auth = null;
let isSaving = false;

// ========================================
// FIREBASE INIT
// ========================================
document.addEventListener('DOMContentLoaded', async function () {
    if (typeof firebase === 'undefined') {
        showToast('Erro ao carregar Firebase', 'error');
        return;
    }

    if (!firebase.apps.length) {
        firebase.initializeApp({
            apiKey: "AIzaSyA3sqLG4T5UkRviauT8A4xo5SN59uWvrAs",
            authDomain: "stiga-finance-72dbf.firebaseapp.com",
            projectId: "stiga-finance-72dbf",
            storageBucket: "stiga-finance-72dbf.firebasestorage.app",
            messagingSenderId: "148799450086",
            appId: "1:148799450086:web:743faed370d44b146ac427"
        });
    }

    auth = firebase.auth();
    db = firebase.firestore();

    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = 'login.html';
            return;
        }
        currentUser = user.email;
        currentUserUID = user.uid;
        await loadAllDataFromFirestore();
        initApp();
    });
});

// ========================================
// FIRESTORE — CARREGAR DADOS
// ========================================
async function loadAllDataFromFirestore() {
    try {
        showLoading();
        const doc = await db.collection('userData').doc(currentUserUID).get();
        if (doc.exists) {
            const data = doc.data();
            accounts             = data.accounts             || accounts;
            customCategories     = data.customCategories     || customCategories;
            recurringTransactions= data.recurringTransactions|| [];
            budgets              = data.budgets              || {};
            goals                = data.goals                || [];
            notifications        = data.notifications        || [];
            settings             = data.settings             || settings;
            theme                = data.theme                || 'dark';
            layoutMode           = data.layoutMode           || 'tabs';
        }
        // Carregar conta atual
        credits         = accounts[currentAccount]?.credits         || [];
        debits          = accounts[currentAccount]?.debits          || [];
        futurePurchases = accounts[currentAccount]?.futurePurchases || [];
    } catch (e) {
        console.error('Erro ao carregar dados:', e);
        showToast('Erro ao carregar dados. Verifique sua conexão.', 'error');
    }
}

// ========================================
// FIRESTORE — SALVAR DADOS
// ========================================
async function saveToFirestore() {
    if (!currentUserUID || !db) return;
    if (isSaving) return;
    isSaving = true;
    try {
        // Atualiza conta atual antes de salvar
        accounts[currentAccount] = {
            name: accounts[currentAccount].name,
            credits,
            debits,
            futurePurchases
        };
        await db.collection('userData').doc(currentUserUID).set({
            accounts,
            customCategories,
            recurringTransactions,
            budgets,
            goals,
            notifications,
            settings,
            theme,
            layoutMode,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (e) {
        console.error('Erro ao salvar:', e);
        showToast('Erro ao salvar dados', 'error');
    } finally {
        isSaving = false;
    }
}

// saveAccounts agora chama Firestore
function updateFileLabel(input, labelId) {
    const label = document.getElementById(labelId);
    if (!label) return;
    if (input.files && input.files.length > 0) {
        const name = input.files[0].name;
        label.textContent = name.length > 35 ? name.slice(0, 32) + '...' : name;
        label.style.color = '#F4E5C3';
        label.style.fontStyle = 'normal';
    } else {
        label.textContent = 'Nenhum arquivo selecionado';
        label.style.color = '#999';
        label.style.fontStyle = 'italic';
    }
}

function saveAccounts() {
    accounts[currentAccount] = {
        name: accounts[currentAccount].name,
        credits,
        debits,
        futurePurchases
    };
    saveToFirestore();
}

// ========================================
// INICIALIZAÇÃO DO APP
// ========================================
function initApp() {
    try {
        showLoading();
        const welcome = document.getElementById('welcomeUser');
        if (welcome) welcome.textContent = `Olá, ${currentUser}`;

        if (theme === 'light') {
            document.body.classList.add('light-theme');
            const btn = document.getElementById('themeBtn');
            if (btn) btn.textContent = '☀️';
        }

        setTodayAsDefault();
        loadAccountSelector();
        updateCategorySelects();
        renderAccountsList();
        renderCustomCategories();
        loadSettings();
        updateNotificationBadge();
        renderNotifications();
        renderBudgets();
        loadBudgetCategories();
        renderRecurringList();
        renderRecurring();
        renderGoalsList();
        updateSummary();
        setTimeout(processRecurringTransactions, 500);
        setLayoutMode(layoutMode);
        hideLoading();

        // Forms
        setupForms();

        // Tabs
        setupTabs();

        // Scroll animations
        setTimeout(initScrollAnimations, 600);
        setTimeout(updateReminderBadge, 1000);
        setTimeout(checkUpcomingReminders, 1500);
    } catch (e) {
        console.error('Erro na inicialização:', e);
        hideLoading();
        showToast('Erro ao carregar o sistema. Recarregue a página.', 'error');
    }
}

// ========================================
// FUNÇÕES BÁSICAS
// ========================================
const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const formatDate = (d) => {
    if (!d) return "";
    return new Intl.DateTimeFormat('pt-BR').format(new Date(d + 'T00:00:00'));
};
function setTodayAsDefault() {
    const today = new Date().toISOString().split('T')[0];
    ['creditDate', 'debitDate', 'futureDueDate'].forEach(id => {
        const input = document.getElementById(id);
        if (input && !input.value) input.value = today;
    });
}
function showLoading() {
    const o = document.getElementById('loadingOverlay');
    if (o) o.classList.add('active');
}
function hideLoading() {
    setTimeout(() => {
        const o = document.getElementById('loadingOverlay');
        if (o) o.classList.remove('active');
    }, 300);
}

// ========================================
// LAYOUT MODE
// ========================================
function setLayoutMode(mode) {
    layoutMode = mode;
    const tabContainer = document.querySelector('.tabs');
    const viewSelector = document.getElementById('viewModeSelector');
    if (viewSelector) viewSelector.value = mode;
    if (mode === 'full') {
        if (tabContainer) tabContainer.style.display = 'none';
        document.querySelectorAll('.tab-content').forEach(el => {
            el.style.display = 'block';
            el.classList.add('active');
            el.style.marginBottom = '40px';
            el.style.borderTop = '1px solid var(--glass-border)';
            el.style.paddingTop = '20px';
        });
    } else {
        if (tabContainer) tabContainer.style.display = 'flex';
        document.querySelectorAll('.tab-content').forEach(el => {
            el.style.marginBottom = '0';
            el.style.borderTop = 'none';
            el.style.paddingTop = '0';
            el.classList.remove('active');
            el.style.display = 'none';
        });
        const activeBtn = document.querySelector('.tab-button.active');
        if (activeBtn) {
            const tabId = activeBtn.dataset.tab;
            const tabContent = document.getElementById(tabId);
            if (tabContent) { tabContent.style.display = 'block'; tabContent.classList.add('active'); }
        } else {
            const firstBtn = document.querySelector('.tab-button');
            if (firstBtn) firstBtn.click();
        }
    }
    saveToFirestore();
}

// ========================================
// TEMA
// ========================================
function toggleTheme() {
    theme = theme === 'dark' ? 'light' : 'dark';
    document.body.classList.toggle('light-theme');
    const btn = document.getElementById('themeBtn');
    if (btn) btn.textContent = theme === 'dark' ? '🌙' : '☀️';
    showToast(`Tema ${theme === 'dark' ? 'escuro' : 'claro'} ativado`, 'info');
    updateChart();
    updateBalanceEvolutionChart();
    saveToFirestore();
}

// ========================================
// SOM
// ========================================
function playNotificationSound() {
    if (!settings.enableSound) return;
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 800;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
    } catch (e) {}
}

// ========================================
// TOAST E NOTIFICAÇÕES
// ========================================
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => toast.classList.remove('show'), 3000);
    if (settings.enableSound) playNotificationSound();
}
function addNotification(title, message, type = 'info') {
    notifications.unshift({ id: Date.now(), title, message, type, timestamp: new Date().toISOString(), read: false });
    if (notifications.length > 50) notifications = notifications.slice(0, 50);
    saveToFirestore();
    updateNotificationBadge();
    renderNotifications();
}
function updateNotificationBadge() {
    const unread = notifications.filter(n => !n.read).length;
    const badge = document.getElementById('notificationBadge');
    if (badge) { badge.textContent = unread; badge.style.display = unread > 0 ? 'block' : 'none'; }
}
function renderNotifications() {
    const list = document.getElementById('notificationList');
    if (!list) return;
    if (notifications.length === 0) { list.innerHTML = '<p class="no-data">Nenhuma notificação</p>'; return; }
    const getIcon = (t) => ({ warning:'⚠️', success:'✅', error:'❌', info:'ℹ️', alert:'🔔' }[t] || 'ℹ️');
    const formatTime = (ts) => {
        const diff = Math.floor((new Date() - new Date(ts)) / 1000);
        if (diff < 60) return 'Agora';
        if (diff < 3600) return `${Math.floor(diff/60)} min atrás`;
        if (diff < 86400) return `${Math.floor(diff/3600)}h atrás`;
        return new Date(ts).toLocaleDateString('pt-BR');
    };
    list.innerHTML = notifications.map(n => `
        <div class="notification-item ${n.read ? 'read' : 'unread'} notification-${n.type}" onclick="markAsRead(${n.id})">
            <div class="notification-icon">${getIcon(n.type)}</div>
            <div class="notification-content">
                <strong>${n.title}</strong>
                <p>${n.message}</p>
                <small>${formatTime(n.timestamp)}</small>
            </div>
            <button class="delete-notification" onclick="event.stopPropagation(); deleteNotification(${n.id})">×</button>
        </div>
    `).join('');
}
function markAsRead(id) {
    const n = notifications.find(x => x.id === id);
    if (n) { n.read = true; saveToFirestore(); updateNotificationBadge(); renderNotifications(); }
}
function deleteNotification(id) {
    notifications = notifications.filter(n => n.id !== id);
    saveToFirestore();
    updateNotificationBadge();
    renderNotifications();
}
function clearAllNotifications() {
    if (confirm('Limpar todas as notificações?')) {
        notifications = [];
        saveToFirestore();
        updateNotificationBadge();
        renderNotifications();
        showToast('🗑️ Notificações limpas', 'info');
    }
}
function toggleNotificationCenter() {
    const c = document.getElementById('notificationCenter');
    if (c) c.classList.toggle('active');
}

// ========================================
// CONTAS
// ========================================
function switchAccount() {
    showLoading();
    currentAccount = document.getElementById('accountSelector').value;
    credits         = accounts[currentAccount]?.credits         || [];
    debits          = accounts[currentAccount]?.debits          || [];
    futurePurchases = accounts[currentAccount]?.futurePurchases || [];
    updateSummary();
    hideLoading();
    showToast(`Conta: ${accounts[currentAccount].name}`, 'success');
}
function loadAccountSelector() {
    const s = document.getElementById('accountSelector');
    if (s) s.innerHTML = Object.entries(accounts).map(([id, acc]) =>
        `<option value="${id}" ${id === currentAccount ? 'selected' : ''}>${acc.name}</option>`
    ).join('');
}
function addAccount() {
    const name = document.getElementById('newAccountName')?.value.trim();
    if (!name) { showToast('Digite um nome para a conta', 'error'); return; }
    const id = 'acc_' + Date.now();
    accounts[id] = { name, credits: [], debits: [], futurePurchases: [] };
    saveToFirestore();
    loadAccountSelector();
    renderAccountsList();
    document.getElementById('newAccountName').value = '';
    showToast(`Conta "${name}" criada com sucesso!`, 'success');
}
function deleteAccount(id) {
    if (id === 'main') { showToast('Não é possível deletar a conta principal', 'error'); return; }
    if (confirm(`Deletar a conta "${accounts[id].name}"?`)) {
        delete accounts[id];
        if (currentAccount === id) { currentAccount = 'main'; switchAccount(); }
        saveToFirestore();
        loadAccountSelector();
        renderAccountsList();
        showToast('Conta deletada', 'info');
    }
}
function renderAccountsList() {
    const list = document.getElementById('accountsList');
    if (list) list.innerHTML = Object.entries(accounts).map(([id, acc]) => `
        <div class="transaction-item">
            <span>${acc.name}</span>
            ${id !== 'main' ? `<button onclick="deleteAccount('${id}')" class="delete-btn-small">×</button>` : ''}
        </div>
    `).join('');
}

// ========================================
// CATEGORIAS
// ========================================
function addCustomCategory() {
    const name = document.getElementById('newCategoryName')?.value.trim();
    if (!name) { showToast('Digite um nome para a categoria', 'error'); return; }
    if (customCategories[currentCategoryType].includes(name)) { showToast('Esta categoria já existe', 'error'); return; }
    customCategories[currentCategoryType].push(name);
    saveToFirestore();
    renderCustomCategories();
    updateCategorySelects();
    document.getElementById('newCategoryName').value = '';
    showToast(`Categoria "${name}" adicionada!`, 'success');
}
function deleteCustomCategory(type, category) {
    const defaults = {
        credit: ['Salário', 'Bonificação', 'Freelance', 'Investimento', 'Outro'],
        debit: ['Alimentação', 'Transporte', 'Moradia', 'Lazer', 'Contas', 'Outro']
    };
    if (defaults[type].includes(category)) { showToast('Não é possível deletar categorias padrão', 'error'); return; }
    customCategories[type] = customCategories[type].filter(c => c !== category);
    saveToFirestore();
    renderCustomCategories();
    updateCategorySelects();
    showToast('Categoria removida', 'info');
}
// Função auxiliar que retorna customCategories (usada em initializeFilters e outros locais)
function getCategories() {
    return customCategories;
}
function renderCustomCategories() {
    const list = document.getElementById('customCategoriesList');
    if (list) list.innerHTML = customCategories[currentCategoryType].map(cat => `
        <div class="transaction-item">
            <span>${cat}</span>
            <button onclick="deleteCustomCategory('${currentCategoryType}', '${cat}')" class="delete-btn-small">×</button>
        </div>
    `).join('');
}
function updateCategorySelects() {
    ['creditCategory', 'filterCreditCategory'].forEach(id => {
        const s = document.getElementById(id);
        if (!s) return;
        const cur = s.value;
        s.innerHTML = (id.includes('filter') ? '<option value="">📁 Todas</option>' : '') +
            customCategories.credit.map(cat => `<option value="${cat}">${cat}</option>`).join('');
        if (cur && customCategories.credit.includes(cur)) s.value = cur;
    });
    ['debitCategory', 'filterDebitCategory'].forEach(id => {
        const s = document.getElementById(id);
        if (!s) return;
        const cur = s.value;
        s.innerHTML = (id.includes('filter') ? '<option value="">📁 Todas</option>' : '') +
            customCategories.debit.map(cat => `<option value="${cat}">${cat}</option>`).join('');
        if (cur && customCategories.debit.includes(cur)) s.value = cur;
    });
    updateEditCategorySelect();
    updateRecurringCategorySelect();
}
function updateEditCategorySelect() {
    const s = document.getElementById('editCategory');
    if (!s) return;
    const type = document.getElementById('editType')?.value;
    const cur = s.value;
    if (type === 'credits') s.innerHTML = customCategories.credit.map(c => `<option value="${c}">${c}</option>`).join('');
    else if (type === 'debits') s.innerHTML = customCategories.debit.map(c => `<option value="${c}">${c}</option>`).join('');
    if (cur) s.value = cur;
}
function updateRecurringCategorySelect() {
    const s = document.getElementById('recurringCategory');
    const t = document.getElementById('recurringType');
    if (!s || !t) return;
    const type = t.value === 'credit' ? 'credit' : 'debit';
    s.innerHTML = customCategories[type].map(c => `<option value="${c}">${c}</option>`).join('');
}

// ========================================
// ORÇAMENTOS
// ========================================
function loadBudgetCategories() {
    const s = document.getElementById('budgetCategory');
    if (!s) return;
    s.innerHTML = customCategories.debit.map(c => `<option value="${c}">${c}</option>`).join('');
}
function addBudget() {
    try {
        const cat = document.getElementById('budgetCategory')?.value;
        const amt = parseFloat(document.getElementById('budgetAmount')?.value);
        if (!cat || !amt || amt <= 0) { showToast('Digite um valor válido para o orçamento', 'error'); return; }
        budgets[cat] = amt;
        saveToFirestore();
        renderBudgets();
        const input = document.getElementById('budgetAmount');
        if (input) input.value = '';
        showToast(`Orçamento de ${cat} definido: ${formatCurrency(amt)}`, 'success');
        setTimeout(syncBudgetsMain, 200);
    } catch (e) { showToast('Erro ao adicionar orçamento', 'error'); }
}
function renderBudgets() {
    try {
        const entries = Object.entries(budgets || {});
        const thisMonth = new Date().getMonth();

        const buildBudgetHTML = (cat, lim, showDelete = true) => {
            const spent = (debits || [])
                .filter(d => d.category === cat && new Date(d.date).getMonth() === thisMonth)
                .reduce((s, d) => s + parseFloat(d.amount || 0), 0);
            const pct = lim > 0 ? Math.min(spent / lim * 100, 100).toFixed(0) : 0;
            const color = pct >= 100 ? 'var(--danger)' : pct >= 80 ? 'var(--warning)' : 'var(--success)';
            const delBtn = showDelete ? `<button onclick="deleteBudget('${cat}')" style="padding:3px 8px;font-size:0.8em;border-radius:5px;background:rgba(231,76,60,0.15);border:1px solid rgba(231,76,60,0.4);color:#E74C3C;cursor:pointer;">&times;</button>` : '';
            return `
            <div style="margin-bottom:14px;padding:14px 16px;background:rgba(0,0,0,0.2);border:1px solid var(--glass-border);border-radius:8px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                    <span style="color:var(--text-primary);font-weight:600;font-size:1.2em;">${cat}</span>
                    <div style="display:flex;align-items:center;gap:10px;">
                        <span style="font-size:1.5em;color:${color};font-weight:700;">${pct}% — ${formatCurrency(spent)} / ${formatCurrency(lim)}</span>
                        ${delBtn}
                    </div>
                </div>
                <div style="height:10px;background:rgba(255,255,255,0.08);border-radius:6px;overflow:hidden;">
                    <div style="height:100%;width:${pct}%;background:${color};border-radius:6px;transition:width 0.6s ease;"></div>
                </div>
            </div>`;
        };

        const emptyHTML = `
            <div style="text-align:center;padding:60px 20px;color:var(--text-secondary);">
                <svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="var(--gold-primary)" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.3;margin-bottom:18px;display:block;margin-left:auto;margin-right:auto;">
                    <line x1="18" y1="20" x2="18" y2="10"/>
                    <line x1="12" y1="20" x2="12" y2="4"/>
                    <line x1="6" y1="20" x2="6" y2="14"/>
                    <line x1="2" y1="20" x2="22" y2="20"/>
                </svg>
                <h3 style="font-family:'Cinzel',serif;color:var(--gold-primary);margin-bottom:8px;font-size:1.05em;letter-spacing:1px;">Nenhum orçamento definido</h3>
                <p style="font-size:0.88em;max-width:360px;margin:0 auto;line-height:1.6;">Defina limites de gastos por categoria para manter suas finanças sob controle.</p>
            </div>`;
        const fullHTML = entries.length === 0 ? emptyHTML : entries.map(([cat, lim]) => buildBudgetHTML(cat, lim)).join('');

        // Escrever em TODOS os containers possíveis
        ['budgetList', 'budgetListMain', 'budgetProgress'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = fullHTML;
        });

        // Painel de controle (dashBudgets)
        const dashEl = document.getElementById('dashBudgets');
        if (dashEl) {
            dashEl.innerHTML = entries.length === 0
                ? '<p style="color:var(--text-secondary);font-style:italic;font-size:0.85em;">Configure orçamentos em Configurações</p>'
                : entries.slice(0, 3).map(([cat, lim]) => buildBudgetHTML(cat, lim, false)).join('');
        }

        loadBudgetCategories();
    } catch (e) { console.error('Erro ao renderizar orçamentos:', e); }
}
function deleteBudget(cat) {
    if (confirm(`Remover orçamento de ${cat}?`)) {
        delete budgets[cat];
        saveToFirestore();
        renderBudgets();
        showToast('Orçamento removido', 'info');
    }
}

// ========================================
// COMPARAÇÃO MENSAL
// ========================================
function renderMonthComparison() {
    const cont = document.getElementById('monthComparison');
    if (!cont) return;
    try {
        const thisM = new Date().getMonth();
        const lastM = thisM === 0 ? 11 : thisM - 1;
        const sum = (arr, month) => arr.filter(x => { try { return new Date(x.date).getMonth() === month; } catch { return false; } })
            .reduce((s, x) => s + parseFloat(x.amount || 0), 0);
        const thisC = sum(credits, thisM), lastC = sum(credits, lastM);
        const thisD = sum(debits, thisM), lastD = sum(debits, lastM);
        const cDiff = lastC > 0 ? ((thisC - lastC) / lastC * 100) : 0;
        const dDiff = lastD > 0 ? ((thisD - lastD) / lastD * 100) : 0;
        const bDiff = (lastC - lastD) !== 0 ? (((thisC - thisD) - (lastC - lastD)) / Math.abs(lastC - lastD) * 100) : 0;
        cont.innerHTML = `
            <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">
                <div class="transaction-item" style="font-size:0.95em;padding:6px 0;"><span>Créditos:</span><span class="${cDiff > 0 ? 'positive' : 'negative'}">${cDiff > 0 ? '+' : ''}${cDiff.toFixed(1)}% ${cDiff > 0 ? '⬆️' : '⬇️'}</span></div>
                <div class="transaction-item" style="font-size:0.95em;padding:6px 0;"><span>Débitos:</span><span class="${dDiff < 0 ? 'positive' : 'negative'}">${dDiff > 0 ? '+' : ''}${dDiff.toFixed(1)}% ${dDiff > 0 ? '⬆️' : '⬇️'}</span></div>
                <div class="transaction-item" style="font-size:0.95em;padding:6px 0;"><span>Saldo:</span><span class="${bDiff > 0 ? 'positive' : 'negative'}">${bDiff > 0 ? '+' : ''}${bDiff.toFixed(1)}% ${bDiff > 0 ? '🎉' : '⚠️'}</span></div>
            </div>`;
    } catch (e) { cont.innerHTML = '<p class="no-data">Erro ao carregar comparação mensal</p>'; }
}

// ========================================
// EXPORT/IMPORT
// ========================================
function exportToCSV() {
    let csv = "\ufeffTipo;Descricao;Valor;Data;Categoria;Tags\n";
    debits.forEach(d => csv += `Debito;${d.description};${d.amount};${d.date};${d.category};${(d.tags||[]).join(',')}\n`);
    credits.forEach(c => csv += `Credito;${c.description};${c.amount};${c.date};${c.category};${(c.tags||[]).join(',')}\n`);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `stiga_${currentUser}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    showToast('📥 CSV exportado!', 'success');
}
function backupData() {
    try {
        // Garante que a conta atual está salva no objeto accounts
        accounts[currentAccount] = {
            ...(accounts[currentAccount] || {}),
            credits,
            debits,
            futurePurchases
        };
        const backup = {
            version: '2.1',
            user: currentUser,
            date: new Date().toISOString(),
            accounts,
            settings,
            customCategories,
            recurringTransactions,
            notifications,
            budgets,
            goals,
            theme,
            layoutMode,
            currentAccount
        };
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `stiga_backup_${(currentUser||'user').replace(/[^a-z0-9]/gi,'_')}_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
        showToast('💾 Backup realizado com sucesso!', 'success');
    } catch(e) {
        console.error('Erro no backup:', e);
        showToast('❌ Erro ao gerar backup', 'error');
    }
}

function restoreData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.style.display = 'none';
    document.body.appendChild(input);

    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) { document.body.removeChild(input); return; }

        const reader = new FileReader();
        reader.onload = (ev) => {
            document.body.removeChild(input);
            try {
                const bkp = JSON.parse(ev.target.result);

                // Validação básica
                if (!bkp.accounts) {
                    showToast('❌ Arquivo de backup inválido', 'error');
                    return;
                }

                if (!confirm('Restaurar backup?\n\nIsso substituirá TODOS os dados atuais.\nUm reload será feito em seguida.')) return;

                // Restaurar todas as variáveis
                accounts              = bkp.accounts;
                settings              = bkp.settings              || settings;
                customCategories      = bkp.customCategories      || customCategories;
                recurringTransactions = bkp.recurringTransactions  || [];
                notifications         = bkp.notifications          || [];
                budgets               = bkp.budgets                || {};
                goals                 = bkp.goals                  || [];
                theme                 = bkp.theme                  || theme || 'dark';
                layoutMode            = bkp.layoutMode             || layoutMode || 'tabs';

                // Restaurar conta atual
                const restoredAccount = bkp.currentAccount || 'main';
                currentAccount = Object.keys(accounts).includes(restoredAccount) ? restoredAccount : Object.keys(accounts)[0] || 'main';

                // Atualizar variáveis locais da conta
                credits         = accounts[currentAccount]?.credits         || [];
                debits          = accounts[currentAccount]?.debits          || [];
                futurePurchases = accounts[currentAccount]?.futurePurchases || [];

                showToast('⏳ Restaurando dados...', 'info');

                if (currentUserUID && db) {
                    saveToFirestore()
                        .then(() => {
                            showToast('✅ Backup restaurado com sucesso!', 'success');
                            setTimeout(() => location.reload(), 1500);
                        })
                        .catch((err) => {
                            console.error('Erro Firestore:', err);
                            showToast('❌ Erro ao salvar no servidor', 'error');
                        });
                } else {
                    // Sem Firestore: salva local e recarrega
                    showToast('✅ Backup restaurado!', 'success');
                    setTimeout(() => location.reload(), 1500);
                }

            } catch (err) {
                console.error('Erro ao restaurar:', err);
                showToast('❌ Arquivo corrompido ou inválido', 'error');
            }
        };
        reader.onerror = () => {
            document.body.removeChild(input);
            showToast('❌ Erro ao ler o arquivo', 'error');
        };
        reader.readAsText(file);
    };

    input.click();
}

// ========================================
// CHATBOT
// ========================================
function toggleChatbot() {
    chatbotOpen = !chatbotOpen;
    const chatbot = document.getElementById('chatbot');
    if (!chatbot) return;
    chatbot.classList.toggle('active', chatbotOpen);
    if (chatbotOpen && document.getElementById('chatMessages').children.length === 0)
        addChatMessage('bot', 'Olá! Sou seu assistente financeiro da Stiga Finance. Como posso ajudar?');
}
function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    if (!message) return;
    addChatMessage('user', message);
    input.value = '';
    setTimeout(() => addChatMessage('bot', processChatMessage(message)), 500);
}
function addChatMessage(sender, text) {
    const container = document.getElementById('chatMessages');
    if (!container) return;
    const div = document.createElement('div');
    div.className = `chat-message ${sender}`;
    div.innerHTML = `<div class="message-bubble">${text}</div>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}
function processChatMessage(message) {
    const msg = message.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // ── Utilitários internos ──────────────────────────────────────
    const totalC = credits.reduce((s, c) => s + parseFloat(c.amount || 0), 0);
    const totalD = debits.reduce((s, d) => s + parseFloat(d.amount || 0), 0);
    const saldo  = totalC - totalD;
    const hoje   = new Date();
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();

    const credMes = credits.filter(c => {
        const d = new Date(c.date + 'T00:00:00');
        return d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
    }).reduce((s, c) => s + parseFloat(c.amount || 0), 0);

    const debitMes = debits.filter(d => {
        const dt = new Date(d.date + 'T00:00:00');
        return dt.getMonth() === mesAtual && dt.getFullYear() === anoAtual;
    }).reduce((s, d) => s + parseFloat(d.amount || 0), 0);

    const proximos = futurePurchases
        .filter(f => new Date(f.dueDate) >= hoje)
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    const catGastos = {};
    debits.forEach(d => {
        const cat = d.category || 'Outro';
        catGastos[cat] = (catGastos[cat] || 0) + parseFloat(d.amount || 0);
    });
    const maiorCat = Object.entries(catGastos).sort((a,b) => b[1]-a[1]);

    const has = (...words) => words.some(w => msg.includes(w));

    // ── SAUDAÇÕES ─────────────────────────────────────────────────
    if (has('oi', 'ola', 'hello', 'bom dia', 'boa tarde', 'boa noite', 'hey', 'tudo bem', 'tudo bom'))
        return `Olá! 👋 Sou o Assistente Stiga, seu consultor financeiro pessoal.<br><br>Posso te ajudar com:<br>💰 <b>Saldo e resumo</b><br>📊 <b>Gastos por categoria</b><br>📅 <b>Contas a vencer</b><br>📈 <b>Análise financeira</b><br>💡 <b>Dicas de economia</b><br>🎯 <b>Metas e orçamentos</b><br><br>O que deseja saber?`;

    // ── SALDO ─────────────────────────────────────────────────────
    if (has('saldo', 'quanto tenho', 'quanto tem', 'meu dinheiro', 'sobrou', 'disponivel', 'disponível')) {
        const emoji = saldo >= 0 ? '✅' : '⚠️';
        const status = saldo >= 0 ? 'positivo' : 'negativo';
        return `${emoji} Seu saldo atual é <b>${formatCurrency(saldo)}</b> (${status}).<br><br>📥 Total de entradas: <b>${formatCurrency(totalC)}</b><br>📤 Total de saídas: <b>${formatCurrency(totalD)}</b>`;
    }

    // ── GASTOS TOTAIS / MÊS ──────────────────────────────────────
    if (has('quanto gastei', 'total gasto', 'gastei esse mes', 'gastei este mes', 'meus gastos', 'debitos', 'débitos', 'debito', 'débito')) {
        const nomeMes = hoje.toLocaleString('pt-BR', { month: 'long' });
        return `📊 Em <b>${nomeMes}</b> você gastou <b>${formatCurrency(debitMes)}</b>.<br><br>💳 Total geral de gastos: <b>${formatCurrency(totalD)}</b>`;
    }

    // ── ENTRADAS / RECEITAS ──────────────────────────────────────
    if (has('receita', 'recebi', 'quanto recebi', 'entradas', 'credito', 'crédito', 'salario', 'salário', 'renda')) {
        const nomeMes = hoje.toLocaleString('pt-BR', { month: 'long' });
        return `💰 Em <b>${nomeMes}</b> você recebeu <b>${formatCurrency(credMes)}</b>.<br><br>📥 Total geral de entradas: <b>${formatCurrency(totalC)}</b>`;
    }

    // ── CATEGORIAS ────────────────────────────────────────────────
    if (has('categoria', 'categorias', 'onde gastei mais', 'maior gasto', 'o que mais gastei')) {
        if (!maiorCat.length) return '📊 Nenhum gasto registrado ainda.';
        const lista = maiorCat.slice(0, 5).map((c, i) => `${i+1}. <b>${c[0]}</b>: ${formatCurrency(c[1])}`).join('<br>');
        return `📊 Seus maiores gastos por categoria:<br><br>${lista}`;
    }

    // ── VENCIMENTOS / CONTAS A PAGAR ─────────────────────────────
    if (has('venci', 'vencimento', 'vencer', 'conta', 'pagar', 'boleto', 'parcela', 'futuras', 'programadas')) {
        if (!proximos.length) return '✅ Ótima notícia! Você não tem contas a vencer.';
        const lista = proximos.slice(0, 5).map(f =>
            `📅 <b>${f.description}</b>: ${formatCurrency(f.amount)} — ${formatDate(f.dueDate)}`
        ).join('<br>');
        const totalFut = proximos.reduce((s, f) => s + parseFloat(f.amount || 0), 0);
        return `📋 Próximas contas a pagar:<br><br>${lista}<br><br>💳 Total futuro: <b>${formatCurrency(totalFut)}</b>`;
    }

    // ── PRÓXIMA CONTA ─────────────────────────────────────────────
    if (has('proxima conta', 'próxima conta', 'qual conta', 'primeira conta', 'mais urgente')) {
        if (!proximos.length) return '✅ Nenhuma conta urgente! Você está em dia.';
        const f = proximos[0];
        const dias = Math.ceil((new Date(f.dueDate) - hoje) / 86400000);
        return `⚡ Conta mais urgente:<br><br><b>${f.description}</b><br>💰 Valor: ${formatCurrency(f.amount)}<br>📅 Vence em: ${formatDate(f.dueDate)} (<b>${dias} dia${dias !== 1 ? 's' : ''}</b>)`;
    }

    // ── ANÁLISE / DIAGNÓSTICO ─────────────────────────────────────
    if (has('analise', 'análise', 'diagnostico', 'diagnóstico', 'como estou', 'minha situacao', 'minha situação', 'financas', 'finanças')) {
        const pct = totalC > 0 ? ((totalD / totalC) * 100).toFixed(1) : 0;
        let status, dica;
        if (pct < 60)  { status = '🟢 Excelente';  dica = 'Continue assim! Você está economizando muito bem.'; }
        else if (pct < 80) { status = '🟡 Atenção'; dica = 'Seus gastos estão altos. Tente reduzir despesas não essenciais.'; }
        else { status = '🔴 Crítico'; dica = 'Gastos muito altos! Revise urgentemente seu orçamento.'; }
        return `📈 <b>Diagnóstico Financeiro</b><br><br>Status: <b>${status}</b><br>📥 Receitas: ${formatCurrency(totalC)}<br>📤 Despesas: ${formatCurrency(totalD)}<br>📊 Comprometimento: <b>${pct}%</b> da renda<br>💰 Saldo: ${formatCurrency(saldo)}<br><br>💡 <i>${dica}</i>`;
    }

    // ── ECONOMIA / QUANTO ECONOMIZEI ─────────────────────────────
    if (has('economiz', 'poupei', 'poupa', 'guardar', 'reserva', 'quanto sobrou')) {
        const pct = totalC > 0 ? ((saldo / totalC) * 100).toFixed(1) : 0;
        if (saldo <= 0) return `⚠️ Você está no negativo em ${formatCurrency(Math.abs(saldo))}. Reduza os gastos para começar a economizar.`;
        return `💚 Você economizou <b>${formatCurrency(saldo)}</b>, o equivalente a <b>${pct}%</b> das suas receitas.<br><br>🏆 Meta ideal: poupar pelo menos 20% da renda.`;
    }

    // ── MÉDIA DE GASTOS ───────────────────────────────────────────
    if (has('media', 'média', 'gasto medio', 'gasto médio', 'por dia', 'diario', 'diário')) {
        const diasNoMes = new Date(anoAtual, mesAtual + 1, 0).getDate();
        const mediaDia = debitMes / diasNoMes;
        const mediaTrans = debits.length > 0 ? totalD / debits.length : 0;
        return `📊 Médias financeiras:<br><br>📅 Gasto médio/dia este mês: <b>${formatCurrency(mediaDia)}</b><br>🧾 Média por transação: <b>${formatCurrency(mediaTrans)}</b><br>💳 Total de transações: <b>${debits.length}</b>`;
    }

    // ── NÚMERO DE TRANSAÇÕES ──────────────────────────────────────
    if (has('quantas transacao', 'quantas transações', 'quantos lancamento', 'quantos lançamento', 'historico', 'histórico', 'quantas vezes')) {
        return `🧾 Histórico de transações:<br><br>📥 Entradas: <b>${credits.length}</b><br>📤 Saídas: <b>${debits.length}</b><br>📋 Contas futuras: <b>${futurePurchases.length}</b><br>📊 Total: <b>${credits.length + debits.length}</b> transações`;
    }

    // ── DICAS DE ECONOMIA ─────────────────────────────────────────
    if (has('dica', 'dicas', 'conselho', 'como economizar', 'economizar mais', 'poupar mais')) {
        const dicas = [
            '🛒 Faça listas de compras e evite compras por impulso.',
            '💡 Compare preços antes de comprar qualquer produto.',
            '🍽️ Cozinhar em casa pode economizar até 60% vs restaurantes.',
            '📱 Revise assinaturas e cancele as que não usa.',
            '⛽ Agrupe compromissos para economizar combustível.',
            '💳 Evite parcelamentos com juros — prefira à vista.',
            '🎯 Siga a regra 50/30/20: necessidades, desejos, poupança.',
            '🏦 Crie uma reserva de emergência de 3 a 6 meses de gastos.'
        ];
        const d = dicas[Math.floor(Math.random() * dicas.length)];
        return `💡 <b>Dica financeira:</b><br><br>${d}<br><br>Quer mais dicas? Pergunte de novo! 😊`;
    }

    // ── ORÇAMENTO ─────────────────────────────────────────────────
    if (has('orcamento', 'orçamento', 'budget', 'limite', 'meta gasto')) {
        if (!budgets || !budgets.length) return '📋 Você ainda não configurou orçamentos. Acesse a aba <b>Orçamentos</b> para definir limites por categoria.';
        const lista = budgets.slice(0, 5).map(b => {
            const gasto = debits.filter(d => d.category === b.category).reduce((s, d) => s + parseFloat(d.amount || 0), 0);
            const pct = b.limit > 0 ? ((gasto / b.limit) * 100).toFixed(0) : 0;
            const emoji = pct >= 100 ? '🔴' : pct >= 80 ? '🟡' : '🟢';
            return `${emoji} <b>${b.category}</b>: ${formatCurrency(gasto)} / ${formatCurrency(b.limit)} (${pct}%)`;
        }).join('<br>');
        return `🎯 <b>Status dos Orçamentos:</b><br><br>${lista}`;
    }

    // ── METAS ─────────────────────────────────────────────────────
    if (has('meta', 'metas', 'objetivo', 'objetivos', 'sonho', 'viagem', 'comprar')) {
        if (!goals || !goals.length) return '🎯 Você ainda não tem metas cadastradas. Acesse a aba <b>Metas</b> para criar seus objetivos financeiros!';
        const lista = goals.slice(0, 4).map(g => {
            const pct = g.target > 0 ? Math.min(100, ((g.current / g.target) * 100).toFixed(0)) : 0;
            return `🎯 <b>${g.name}</b>: ${formatCurrency(g.current)} / ${formatCurrency(g.target)} (${pct}%)`;
        }).join('<br>');
        return `🏆 <b>Suas Metas:</b><br><br>${lista}`;
    }

    // ── ADICIONAR TRANSAÇÃO ───────────────────────────────────────
    if (has('como adicionar', 'como lancar', 'como lançar', 'como registrar', 'como colocar')) {
        return `➕ <b>Como registrar transações:</b><br><br>📥 <b>Crédito (entrada):</b> Aba "Créditos" → preencha valor, categoria, data e clique em Adicionar.<br><br>📤 <b>Débito (saída):</b> Aba "Débitos" → mesmo processo.<br><br>📅 <b>Compra futura:</b> Aba "Compras Futuras" → informe valor total e número de parcelas.`;
    }

    // ── COMPROVANTE ───────────────────────────────────────────────
    if (has('comprovante', 'anexar', 'arquivo', 'foto', 'nota fiscal', 'recibo')) {
        return `📎 <b>Como anexar comprovantes:</b><br><br>1. Vá para a aba <b>Créditos</b> ou <b>Débitos</b><br>2. Preencha os dados da transação<br>3. Clique em <b>"Escolher arquivo"</b> no campo de comprovante<br>4. Selecione a imagem ou PDF<br>5. Clique em <b>Adicionar</b><br><br>Para visualizar: clique no ícone 📎 ao lado da transação.`;
    }

    // ── EXPORTAR / BACKUP ─────────────────────────────────────────
    if (has('exportar', 'backup', 'baixar', 'relatorio', 'relatório', 'pdf', 'csv')) {
        return `📄 <b>Exportar dados:</b><br><br>📊 <b>PDF:</b> Clique no botão <b>"Gerar PDF"</b> no menu principal.<br><br>💾 <b>Backup:</b> Menu → <b>Exportar/Importar</b> para salvar todos os seus dados em JSON.<br><br>📋 <b>CSV:</b> Disponível na opção de importação de dados.`;
    }

    // ── CONTAS BANCÁRIAS ──────────────────────────────────────────
    if (has('conta bancaria', 'conta corrente', 'conta poupanca', 'minhas contas', 'trocar conta', 'nova conta')) {
        return `🏦 <b>Gerenciar contas:</b><br><br>Você pode ter múltiplas contas no Stiga Finance (ex: Nubank, Bradesco, Cartão).<br><br>➕ Para adicionar: clique no seletor de contas no topo e selecione <b>"+ Nova Conta"</b>.<br><br>🔄 Para trocar: use o menu suspenso de contas no topo da página.`;
    }

    // ── RECORRENTES ───────────────────────────────────────────────
    if (has('recorrente', 'recorrentes', 'automatico', 'automático', 'todo mes', 'todo mês', 'mensal', 'mensal')) {
        return `🔄 <b>Transações Recorrentes:</b><br><br>Para lançamentos fixos mensais (aluguel, assinaturas etc.), use a aba <b>Recorrentes</b>.<br><br>✅ O sistema lança automaticamente todo mês sem você precisar digitar de novo!`;
    }

    // ── PRIVACIDADE ───────────────────────────────────────────────
    if (has('privacidade', 'privado', 'esconder', 'ocultar', 'ninguem ver', 'ninguém ver', 'modo privado')) {
        return `👁️ <b>Modo Privacidade:</b><br><br>Clique no ícone 👁️ no topo da página para ocultar todos os valores financeiros.<br><br>Útil quando estiver em locais públicos ou não quiser mostrar seus dados.`;
    }

    // ── PERÍODO / FILTROS ─────────────────────────────────────────
    if (has('filtrar', 'filtro', 'periodo', 'período', 'mes passado', 'mês passado', 'buscar')) {
        return `🔍 <b>Filtros disponíveis:</b><br><br>📁 <b>Por conta:</b> Use o seletor de contas no topo.<br><br>📂 <b>Por categoria:</b> Use o filtro de pastas nas listas.<br><br>📅 <b>Por período:</b> Clique no ícone de calendário no topo para filtrar por data.`;
    }

    // ── TEMA ──────────────────────────────────────────────────────
    if (has('tema', 'claro', 'escuro', 'dark', 'light', 'cor', 'aparencia', 'aparência')) {
        return `🎨 <b>Temas:</b><br><br>Clique no ícone ☀️/🌙 no canto superior direito para alternar entre tema claro e escuro.<br><br>A preferência fica salva automaticamente!`;
    }

    // ── NOTIFICAÇÕES ──────────────────────────────────────────────
    if (has('notificacao', 'notificação', 'notificacoes', 'notificações', 'alerta', 'aviso')) {
        return `🔔 <b>Notificações:</b><br><br>O sino no topo mostra alertas sobre:<br>• Contas próximas do vencimento<br>• Orçamentos no limite<br>• Metas atingidas<br>• Novas transações registradas<br><br>Clique no 🔔 para ver todas.`;
    }

    // ── AJUDA GERAL ───────────────────────────────────────────────
    if (has('ajuda', 'help', 'o que voce faz', 'o que você faz', 'comandos', 'perguntas', 'menu')) {
        return `🤖 <b>Tudo que posso responder:</b><br><br>
💰 <b>Saldo e finanças:</b> "qual meu saldo?", "como estou financeiramente?"<br>
📊 <b>Gastos:</b> "quanto gastei?", "maiores categorias", "média de gastos"<br>
📥 <b>Receitas:</b> "quanto recebi?", "minhas entradas"<br>
📅 <b>Vencimentos:</b> "contas a pagar", "próxima conta"<br>
🎯 <b>Metas e orçamentos:</b> "minhas metas", "meu orçamento"<br>
💡 <b>Dicas:</b> "dicas de economia", "como economizar"<br>
📎 <b>Sistema:</b> "como adicionar", "como exportar", "como usar"<br>
🏦 <b>Contas:</b> "minhas contas", "trocar conta"<br>
🔄 <b>Recorrentes:</b> "transações automáticas"<br><br>
Pode digitar em linguagem natural! 😊`;
    }

    // ── AGRADECIMENTO ─────────────────────────────────────────────
    if (has('obrigado', 'obrigada', 'valeu', 'thanks', 'muito bom', 'otimo', 'ótimo', 'excelente', 'perfeito'))
        return `😊 Fico feliz em ajudar! Se precisar de mais alguma coisa, é só chamar. Boas finanças! 💰`;

    // ── DESPEDIDA ─────────────────────────────────────────────────
    if (has('tchau', 'ate logo', 'até logo', 'bye', 'xau', 'ate mais', 'até mais', 'fechar'))
        return `👋 Até logo! Lembre-se: cada centavo conta. Boa sorte nas suas finanças! 💪`;

    // ── NÃO ENTENDEU ──────────────────────────────────────────────
    const sugestoes = [
        '"qual meu saldo?"',
        '"quanto gastei esse mês?"',
        '"contas a pagar"',
        '"dicas de economia"',
        '"como estou financeiramente?"'
    ];
    const s = sugestoes[Math.floor(Math.random() * sugestoes.length)];
    return `🤔 Não entendi bem. Tente perguntar como:<br><br><i>${s}</i><br><br>Ou digite <b>"ajuda"</b> para ver tudo que posso responder!`;
}

// ========================================
// GRÁFICOS
// ========================================
function updateChart() {
    const canvas = document.getElementById('expenseChart');
    if (!canvas) return;
    try {
        const ctx = canvas.getContext('2d');
        const cats = {};
        debits.forEach(d => { const cat = d.category || 'Outro'; cats[cat] = (cats[cat] || 0) + parseFloat(d.amount || 0); });
        if (myChart) { try { myChart.destroy(); } catch(e) {} }
        const hasData = Object.keys(cats).length > 0;
        myChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: hasData ? Object.keys(cats) : ['Sem dados'],
                datasets: [{ data: hasData ? Object.values(cats) : [1], backgroundColor: hasData ? ['#D4AF37','#F4E5C3','#B8942A','#E74C3C','#2ECC71','#3498DB','#9B59B6','#F39C12'] : ['#333'], borderWidth: 0 }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: theme === 'dark' ? '#A0A0A0' : '#333', font: { size: 10 }, padding: 10 } } } }
        });
    } catch (e) { console.error('Erro no gráfico:', e); }
}
function updateBalanceEvolutionChart() {
    const canvas = document.getElementById('balanceEvolutionChart');
    if (!canvas) return;
    try {
        const ctx = canvas.getContext('2d');
        const days = 30, today = new Date();
        const labels = [], data = [];
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            labels.push(date.getDate() + '/' + (date.getMonth() + 1));
            const cUp = credits.filter(c => c.date && c.date <= dateStr).reduce((s, c) => s + parseFloat(c.amount || 0), 0);
            const dUp = debits.filter(d => d.date && d.date <= dateStr).reduce((s, d) => s + parseFloat(d.amount || 0), 0);
            data.push(cUp - dUp);
        }
        if (balanceChart) { try { balanceChart.destroy(); } catch(e) {} }
        balanceChart = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets: [{ label: 'Saldo', data, borderColor: '#D4AF37', backgroundColor: 'rgba(212,175,55,0.1)', fill: true, tension: 0.4 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { color: theme === 'dark' ? '#A0A0A0' : '#333', callback: (v) => formatCurrency(v) }, grid: { color: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' } }, x: { ticks: { color: theme === 'dark' ? '#A0A0A0' : '#333' }, grid: { display: false } } } }
        });
    } catch (e) { console.error('Erro no gráfico evolução:', e); }
}

// ========================================
// PDF REPORT
// ========================================
async function generatePDFReport() {
    showLoading();
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.setFontSize(20); doc.setTextColor(212, 175, 55);
        doc.text('STIGA FINANCE', 105, 20, { align: 'center' });
        doc.setFontSize(12); doc.setTextColor(100);
        doc.text('Relatório Financeiro', 105, 28, { align: 'center' });
        doc.text(`Conta: ${accounts[currentAccount].name}`, 105, 35, { align: 'center' });
        doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 105, 42, { align: 'center' });
        const totalC = credits.reduce((s, c) => s + parseFloat(c.amount || 0), 0);
        const totalD = debits.reduce((s, d) => s + parseFloat(d.amount || 0), 0);
        doc.setFontSize(14); doc.setTextColor(0); doc.text('RESUMO FINANCEIRO', 20, 55);
        doc.setFontSize(11);
        doc.setTextColor(46, 204, 113); doc.text(`Total Créditos: ${formatCurrency(totalC)}`, 20, 65);
        doc.setTextColor(231, 76, 60); doc.text(`Total Débitos: ${formatCurrency(totalD)}`, 20, 72);
        doc.setTextColor(212, 175, 55); doc.text(`Saldo: ${formatCurrency(totalC - totalD)}`, 20, 79);
        doc.save(`relatorio_stiga_${currentUser}_${new Date().toISOString().split('T')[0]}.pdf`);
        showToast('📄 PDF gerado!', 'success');
    } catch (err) { showToast('❌ Erro ao gerar PDF', 'error'); }
    hideLoading();
}

// ========================================
// SUMMARY
// ========================================
function updateSummary() {
    const totalC = credits.reduce((s, c) => s + parseFloat(c.amount || 0), 0);
    const totalD = debits.reduce((s, d) => s + parseFloat(d.amount || 0), 0);
    const totalF = futurePurchases.reduce((s, f) => s + parseFloat(f.amount || 0), 0);
    const el = (id, txt) => { const e = document.getElementById(id); if (e) e.textContent = txt; };
    el('totalCredits', formatCurrency(totalC));
    el('totalDebits', formatCurrency(totalD));
    el('currentBalance', formatCurrency(totalC - totalD));
    el('futurePurchases', formatCurrency(totalF));
    const accName = accounts[currentAccount]?.name || 'Conta';
    ['accountCredit','accountDebit','accountBalance','accountFuture'].forEach(id => el(id, accName));
    renderLists();
    updateChart();
    updateBalanceEvolutionChart();
    checkVencimentos();
    showCategoryTotals();
    renderMonthComparison();
    renderBudgets();
    updateOverviewTab();
}
function checkVencimentos() {
    const div = document.getElementById('vencimentoAlert');
    if (!div) return;
    const hoje = new Date(), em = new Date();
    em.setDate(hoje.getDate() + parseInt(settings.notificationDays));
    const prox = futurePurchases.filter(p => new Date(p.dueDate + 'T00:00:00') <= em);
    div.innerHTML = prox.length > 0
        ? `<p style="color:#E74C3C;font-weight:bold;font-size:0.95em;">⚠️ ${prox.length} conta(s) vencendo em breve!</p>`
        : `<p style="color:#2ECC71;font-size:0.95em;">✅ Todos os compromissos estão em dia</p>`;
}
function showCategoryTotals() {
    const div = document.getElementById('categoryTotals');
    if (!div) return;
    const cats = {};
    debits.forEach(d => cats[d.category] = (cats[d.category] || 0) + parseFloat(d.amount || 0));
    const sorted = Object.entries(cats).sort((a, b) => b[1] - a[1]);
    const maxVal = sorted.length > 0 ? sorted[0][1] : 1;
    div.innerHTML = sorted.length === 0
        ? '<p class="no-data" style="color:var(--text-secondary);font-style:italic;padding:10px 0">Nenhum gasto registrado</p>'
        : `<h4 style="color:var(--gold-primary);font-family:'Cinzel',serif;font-size:0.85em;letter-spacing:1px;text-transform:uppercase;margin:10px 0 8px">Gastos por Categoria</h4>` +
          sorted.map(([cat, val]) => `
            <div style="margin-bottom:10px">
                <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                    <span style="font-size:0.95em;color:var(--text-primary);font-weight:600;">${cat}</span>
                    <strong style="color:var(--gold-light);font-size:0.95em;font-weight:700;">${formatCurrency(val)}</strong>
                </div>
                <div style="height:4px;background:rgba(255,255,255,0.07);border-radius:2px;overflow:hidden">
                    <div style="height:100%;width:${(val/maxVal*100).toFixed(0)}%;background:linear-gradient(90deg,var(--gold-dark),var(--gold-primary));border-radius:2px;transition:width 0.5s"></div>
                </div>
            </div>`).join('');

    const budgetDiv = document.getElementById('dashBudgets');
    if (budgetDiv) {
        const entries = Object.entries(budgets);
        const thisMonth = new Date().getMonth();
        budgetDiv.innerHTML = entries.length === 0
            ? '<p class="no-data" style="color:var(--text-secondary);font-style:italic;font-size:0.85em">Configure orçamentos em Configurações</p>'
            : `<h4 style="color:var(--gold-primary);font-family:'Cinzel',serif;font-size:0.85em;letter-spacing:1px;text-transform:uppercase;margin:10px 0 8px">Orçamentos do Mês</h4>` +
              entries.map(([cat, lim]) => {
                const spent = debits.filter(d => d.category === cat && new Date(d.date).getMonth() === thisMonth).reduce((s, d) => s + parseFloat(d.amount || 0), 0);
                const pct = Math.min(spent/lim*100, 100).toFixed(0);
                const color = pct >= 100 ? 'var(--danger)' : pct >= 80 ? 'var(--warning)' : 'var(--success)';
                return `<div style="margin-bottom:16px;padding:14px;background:rgba(0,0,0,0.2);border-radius:10px;border-left:4px solid ${color};">
                    <div style="font-size:1em !important;color:var(--text-primary) !important;font-weight:700 !important;margin-bottom:4px !important;line-height:1.2;">${cat}</div>
                    <div style="font-size:1.8em !important;color:${color} !important;font-weight:800 !important;margin-bottom:10px !important;line-height:1.3;">${pct}% &nbsp;|&nbsp; ${formatCurrency(spent)} / ${formatCurrency(lim)}</div>
                    <div style="height:14px;background:rgba(255,255,255,0.07);border-radius:7px;overflow:hidden;">
                        <div style="height:100%;width:${pct}%;background:${color};border-radius:7px;transition:width 0.5s"></div>
                    </div>
                </div>`;
              }).join('');
    }

    const goalsDiv = document.getElementById('dashGoals');
    if (goalsDiv) {
        goalsDiv.innerHTML = !goals || goals.length === 0
            ? '<p class="no-data" style="color:var(--text-secondary);font-style:italic;font-size:0.85em">Crie metas em Configurações</p>'
            : `<h4 style="color:var(--gold-primary);font-family:'Cinzel',serif;font-size:0.85em;letter-spacing:1px;text-transform:uppercase;margin:10px 0 8px">Metas Financeiras</h4>` +
              goals.slice(0, 3).map(g => {
                const pct = Math.min((g.current || 0)/g.target*100, 100).toFixed(0);
                return `<div style="margin-bottom:16px;padding:14px;background:rgba(0,0,0,0.2);border-radius:10px;border-left:4px solid var(--gold-primary);">
                    <div style="font-size:1em !important;color:var(--text-primary) !important;font-weight:700 !important;margin-bottom:4px !important;line-height:1.2;">${g.name}</div>
                    <div style="font-size:1.1em !important;color:var(--gold-primary) !important;font-weight:700 !important;margin-bottom:8px !important;line-height:1.3;">${pct}% — ${formatCurrency(g.current || 0)} / ${formatCurrency(g.target)}</div>
                    <div style="height:14px;background:rgba(255,255,255,0.07);border-radius:7px;overflow:hidden;">
                        <div style="height:100%;width:${pct}%;background:var(--gold-primary);border-radius:7px;transition:width 0.5s"></div>
                    </div>
                </div>`;
              }).join('');
    }
}
function togglePrivacy() {
    privacyMode = !privacyMode;
    const eye = document.getElementById('eyeIcon');
    if (eye) eye.textContent = privacyMode ? '🙈' : '👁️';
    renderLists();
    ['totalCredits','totalDebits','currentBalance','futurePurchases'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('privacy-active', privacyMode);
    });
}
function logout() {
    if (confirm('Deseja realmente sair?')) {
        auth.signOut().then(() => { window.location.href = 'login.html'; });
    }
}
function editItem(type, index) {
    const item = type === 'credits' ? credits[index] : debits[index];
    const set = (id, val) => { const e = document.getElementById(id); if (e) e.value = val; };
    set('editType', type); set('editIndex', index); set('editAmount', item.amount);
    set('editDate', item.date); set('editDescription', item.description);
    set('editTags', item.tags ? item.tags.join(', ') : '');
    updateEditCategorySelect();
    set('editCategory', item.category);
    const modal = document.getElementById('editModal');
    if (modal) modal.style.display = 'block';
}
function closeEditModal() {
    const modal = document.getElementById('editModal');
    if (modal) modal.style.display = 'none';
}
function deleteItem(type, i) {
    if (!confirm("Tem certeza que deseja excluir?")) return;
    if (type === 'credits') credits.splice(i, 1);
    else if (type === 'debits') debits.splice(i, 1);
    else futurePurchases.splice(i, 1);
    saveAccounts();
    updateSummary();
    showToast('🗑️ Item excluído', 'info');
}
function payItem(i) {
    const item = futurePurchases[i];
    debits.unshift({ amount: item.amount, category: "Contas", date: new Date().toISOString().split('T')[0], description: `PAGO: ${item.description}`, tags: ['pago'] });
    futurePurchases.splice(i, 1);
    saveAccounts();
    updateSummary();
    showToast('💳 Pagamento registrado!', 'success');
    addNotification('✅ Pagamento', `${item.description} foi pago`, 'success');
}

// FUNÇÃO: ESTORNAR PAGAMENTO
function undoPayment(index) {
    const debit = debits[index];
    
    // Verificar se é um débito de pagamento
    if (!debit.description || !debit.description.startsWith('PAGO:')) {
        showToast('⚠️ Este débito não pode ser estornado', 'error');
        return;
    }
    
    // Confirmar com usuário
    if (!confirm(`Estornar pagamento de "${debit.description.replace('PAGO: ', '')}"?\n\nIsso vai:\n• Remover o débito\n• Devolver para Compras Futuras`)) {
        return;
    }
    
    // Extrair descrição original (sem o "PAGO:")
    const originalDescription = debit.description.replace('PAGO: ', '');
    
    // Criar item em compras futuras
    const futureItem = {
        amount: debit.amount,
        dueDate: debit.date,
        description: originalDescription,
        account: debit.account || currentAccount
    };
    
    // Adicionar em compras futuras
    futurePurchases.push(futureItem);
    
    // Remover débito
    debits.splice(index, 1);
    
    // Salvar e atualizar
    saveAccounts();
    updateSummary();
    renderLists();
    
    showToast('🔄 Pagamento estornado!', 'success');
    addNotification('🔄 Estorno', `${originalDescription} voltou para Compras Futuras`, 'info');
}

// ========================================
// SETUP FORMS
// ========================================
function setupForms() {
    const creditForm = document.getElementById('creditForm');
    if (creditForm) {
        creditForm.onsubmit = (e) => {
            e.preventDefault();
            const newCredit = {
                amount: document.getElementById('creditAmount')?.value,
                category: document.getElementById('creditCategory')?.value,
                date: document.getElementById('creditDate')?.value,
                description: document.getElementById('creditDescription')?.value,
                tags: document.getElementById('creditTags')?.value.split(',').map(t => t.trim()).filter(Boolean)
            };
            const fileInput = document.getElementById('creditAttachment');
            const file = fileInput && fileInput.files && fileInput.files[0];
            const doSaveCredit = () => {
                credits.unshift(newCredit);
                saveAccounts();
                updateSummary();
                renderLists();
                showToast('✅ Crédito adicionado!', 'success');
                addNotification('💰 Crédito', 'Novo crédito registrado', 'success');
                e.target.reset();
                setTodayAsDefault();
            };
            if (file) {
                const reader = new FileReader();
                reader.onload = function(ev) {
                    newCredit.attachment = { data: ev.target.result, type: file.type, name: file.name };
                    doSaveCredit();
                };
                reader.readAsDataURL(file);
            } else {
                doSaveCredit();
            }
        };
    }

    const debitForm = document.getElementById('debitForm');
    if (debitForm) {
        debitForm.onsubmit = (e) => {
            e.preventDefault();
            const newDebit = {
                amount: document.getElementById('debitAmount')?.value,
                category: document.getElementById('debitCategory')?.value,
                date: document.getElementById('debitDate')?.value,
                description: document.getElementById('debitDescription')?.value,
                tags: document.getElementById('debitTags')?.value.split(',').map(t => t.trim()).filter(Boolean)
            };
            const fileInput = document.getElementById('debitAttachment');
            const file = fileInput && fileInput.files && fileInput.files[0];
            const doSaveDebit = () => {
                debits.unshift(newDebit);
                saveAccounts();
                updateSummary();
                renderLists();
                showToast('✅ Débito adicionado!', 'success');
                addNotification('💸 Débito', 'Novo débito registrado', 'info');
                e.target.reset();
                setTodayAsDefault();
            };
            if (file) {
                const reader = new FileReader();
                reader.onload = function(ev) {
                    newDebit.attachment = { data: ev.target.result, type: file.type, name: file.name };
                    doSaveDebit();
                };
                reader.readAsDataURL(file);
            } else {
                doSaveDebit();
            }
        };
    }

    const futureForm = document.getElementById('futureForm');
    if (futureForm) {
        futureForm.onsubmit = (e) => {
            e.preventDefault();
            const totalAmt = parseFloat(document.getElementById('futureAmount')?.value);
            const installments = parseInt(document.getElementById('futureInstallments')?.value);
            const firstDate = document.getElementById('futureDueDate')?.value;
            const desc = document.getElementById('futureDescription')?.value;
            const valPerInst = totalAmt / installments;
            for (let i = 0; i < installments; i++) {
                let d = new Date(firstDate + 'T00:00:00');
                d.setMonth(d.getMonth() + i);
                futurePurchases.push({ amount: valPerInst, dueDate: d.toISOString().split('T')[0], description: `${desc} (${i+1}/${installments})` });
            }
            e.target.reset();
            setTodayAsDefault();
            saveAccounts();
            updateSummary();
            showToast(`✅ ${installments}x parcelas criadas!`, 'success');
        };
    }

    const editForm = document.getElementById('editForm');
    if (editForm) {
        editForm.onsubmit = (e) => {
            e.preventDefault();
            const type = document.getElementById('editType')?.value;
            const index = parseInt(document.getElementById('editIndex')?.value);
            const updated = {
                amount: document.getElementById('editAmount')?.value,
                category: document.getElementById('editCategory')?.value,
                date: document.getElementById('editDate')?.value,
                description: document.getElementById('editDescription')?.value,
                tags: document.getElementById('editTags')?.value.split(',').map(t => t.trim()).filter(Boolean)
            };
            if (type === 'credits') credits[index] = { ...credits[index], ...updated };
            else debits[index] = { ...debits[index], ...updated };
            saveAccounts();
            updateSummary();
            closeEditModal();
            showToast('✅ Transação atualizada!', 'success');
        };
    }

    const recurringFormEl = document.getElementById('recurringForm');
    if (recurringFormEl) {
        recurringFormEl.onsubmit = function(e) {
            e.preventDefault();
            const type   = document.getElementById('recurringType')?.value;
            const amount = parseFloat(document.getElementById('recurringAmount')?.value);
            const cat    = document.getElementById('recurringCategory')?.value;
            const desc   = document.getElementById('recurringDescription')?.value?.trim();
            const freq   = document.getElementById('recurringFrequency')?.value;
            const day    = parseInt(document.getElementById('recurringDay')?.value);
            if (!amount || !cat || !desc || !freq || !day) { showToast('Preencha todos os campos', 'error'); return; }
            recurringTransactions.push({ type, amount, category: cat, description: desc, frequency: freq, day });
            saveToFirestore();
            renderRecurring();
            renderRecurringList();
            closeRecurringModal();
            e.target.reset();
            updateRecurringCategorySelect();
            showToast('Transação recorrente criada!', 'success');
        };
    }

    const goalFormEl = document.getElementById('goalForm');
    if (goalFormEl) {
        goalFormEl.onsubmit = function(e) {
            e.preventDefault();
            const name     = document.getElementById('goalName')?.value?.trim();
            const target   = parseFloat(document.getElementById('goalTarget')?.value);
            const deadline = document.getElementById('goalDeadline')?.value;
            if (!name || !target || target <= 0) { showToast('Preencha nome e valor da meta', 'error'); return; }
            goals.push({ name, target, current: 0, deadline: deadline || null, createdAt: new Date().toISOString() });
            saveToFirestore();
            renderGoalsList();
            showCategoryTotals();
            closeGoalModal();
            e.target.reset();
            showToast('Meta criada com sucesso!', 'success');
        };
    }
}

// ========================================
// SETUP TABS
// ========================================
function setupTabs() {
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.addEventListener('click', function () {
            const tabId = this.getAttribute('data-tab');
            if (!tabId || tabId === 'calendar' || tabId === 'settings') return;
            navigateToTab(tabId);
            syncMobileNav(tabId);
        });
    });
    // Garantir aba inicial visivel
    const firstActive = document.querySelector('.tab-button.active');
    const firstTab = firstActive ? firstActive.getAttribute('data-tab') : 'credits';
    const firstContent = document.getElementById(firstTab);
    if (firstContent) { firstContent.classList.add('active'); firstContent.style.display = 'block'; }
}

// ========================================
// SETTINGS
// ========================================
function toggleSettings() {
    const panel = document.getElementById('settingsPanel');
    if (panel) panel.classList.toggle('active');
}
function saveSettings() {
    settings = {
        enableNotifications: document.getElementById('enableNotifications')?.checked || false,
        enableSound: document.getElementById('enableSound')?.checked || false,
        enablePushNotifications: document.getElementById('enablePushNotifications')?.checked || false,
        notificationDays: parseInt(document.getElementById('notificationDays')?.value) || 3
    };
    saveToFirestore();
    // Mostrar toast SEM som (não é uma notificação financeira)
    const toast = document.getElementById('toast');
    if (toast) { toast.textContent = '⚙️ Configurações salvas!'; toast.className = 'toast show success'; setTimeout(() => toast.classList.remove('show'), 3000); }
}
function loadSettings() {
    const set = (id, val) => { const e = document.getElementById(id); if (e) e.checked = val; };
    set('enableNotifications', settings.enableNotifications);
    set('enableSound', settings.enableSound);
    set('enablePushNotifications', settings.enablePushNotifications);
    const notDays = document.getElementById('notificationDays');
    if (notDays) notDays.value = settings.notificationDays;
}

// ========================================
// CALENDÁRIO
// ========================================
let calCurrentMonth = new Date().getMonth();
let calCurrentYear  = new Date().getFullYear();
let remindersList   = [];

function initCalendar() {
    const today = new Date().toISOString().split('T')[0];
    const ri = document.getElementById('reminderDate');
    if (ri && !ri.value) ri.value = today;
    const rf = document.getElementById('reminderForm');
    if (rf) {
    rf.removeEventListener('submit', addReminder);
    rf.addEventListener('submit', addReminder);
}
    renderCalendar();
    renderRemindersList();
}

function renderCalendar() {
    const grid = document.getElementById('calGrid');
    const title = document.getElementById('calMonthYear');
    if (!grid || !title) return;
    const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    title.textContent = `${months[calCurrentMonth]} ${calCurrentYear}`;
    const firstDay = new Date(calCurrentYear, calCurrentMonth, 1).getDay();
    const daysInMonth = new Date(calCurrentYear, calCurrentMonth + 1, 0).getDate();
    const today = new Date();
    let html = '';
    for (let i = 0; i < firstDay; i++) html += `<div class="cal-day other-month"></div>`;
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${calCurrentYear}-${String(calCurrentMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const isToday = (d === today.getDate() && calCurrentMonth === today.getMonth() && calCurrentYear === today.getFullYear());
        const dayReminders = remindersList.filter(r => r.date === dateStr);
        const dayCredits   = credits.filter(c => c.date === dateStr);
        const dayDebits    = debits.filter(db => db.date === dateStr);
        let classes = 'cal-day';
        if (isToday) classes += ' today';
        if (dayReminders.length) classes += ' has-reminder';
        if (dayDebits.length) classes += ' has-debit';
        if (dayCredits.length) classes += ' has-credit';
        let dots = '';
        if (dayCredits.length) dots += `<span class="cal-dot credit"></span>`;
        if (dayDebits.length) dots += `<span class="cal-dot debit"></span>`;
        if (dayReminders.length) dots += `<span class="cal-dot reminder"></span>`;
        html += `<div class="${classes}" onclick="selectCalDay('${dateStr}')" title="${dateStr}"><span>${d}</span>${dots ? `<div class="cal-dots">${dots}</div>` : ''}</div>`;
    }
    grid.innerHTML = html;
}

function selectCalDay(dateStr) {
    document.querySelectorAll('.cal-day').forEach(d => d.classList.remove('selected'));
    event.currentTarget.classList.add('selected');
    const ri = document.getElementById('reminderDate');
    if (ri) ri.value = dateStr;
}
function calPrevMonth() {
    calCurrentMonth--;
    if (calCurrentMonth < 0) { calCurrentMonth = 11; calCurrentYear--; }
    renderCalendar();
}
function calNextMonth() {
    calCurrentMonth++;
    if (calCurrentMonth > 11) { calCurrentMonth = 0; calCurrentYear++; }
    renderCalendar();
}

async function addReminder(e) {
    e.preventDefault();
    const date = document.getElementById('reminderDate')?.value;
    const time = document.getElementById('reminderTime')?.value;
    const type = document.getElementById('reminderType')?.value;
    const desc = document.getElementById('reminderDescription')?.value?.trim();
    if (!date || !time || !desc) { showToast('Preencha todos os campos do lembrete', 'error'); return; }
    remindersList.push({ id: Date.now(), date, time, type: type || 'outro', description: desc, createdAt: new Date().toISOString() });
    await saveRemindersToFirestore();
    document.getElementById('reminderForm').reset();
    document.getElementById('reminderDate').value = new Date().toISOString().split('T')[0];
    renderCalendar();
    renderRemindersList();
    showToast('Lembrete adicionado!', 'success');
}

async function saveRemindersToFirestore() {
    if (!currentUserUID || !db) return;
    try {
        await db.collection('userReminders').doc(currentUserUID).set({ reminders: remindersList });
    } catch (e) { console.error('Erro ao salvar lembretes:', e); }
}

async function loadRemindersFromFirestore() {
    if (!currentUserUID || !db) return;
    try {
        const doc = await db.collection('userReminders').doc(currentUserUID).get();
        if (doc.exists) remindersList = doc.data().reminders || [];
    } catch (e) { console.error('Erro ao carregar lembretes:', e); }
}

function renderRemindersList() {
    const container = document.getElementById('remindersList');
    if (!container) return;
    const sorted = [...remindersList].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    if (!sorted.length) { container.innerHTML = '<p style="color:var(--text-secondary);text-align:center;padding:20px 0;">Nenhum lembrete cadastrado</p>'; return; }
    const typeLabels = { vencimento:'Vencimento', pagamento:'Pagamento', meta:'Meta', reuniao:'Reunião', outro:'Outro' };
    const today = new Date().toISOString().split('T')[0];
    container.innerHTML = sorted.map(r => {
        const isPast = r.date < today;
        const [yr, mo, dy] = r.date.split('-');
        return `
        <div class="reminder-item ${r.type}" style="${isPast ? 'opacity:0.5' : ''}">
            <div>
                <b style="color:var(--gold-light);font-size:0.95em">${r.description}</b>
                <div class="reminder-date">${dy}/${mo}/${yr} às ${r.time}</div>
            </div>
            <div style="display:flex;align-items:center;gap:10px">
                <span class="reminder-badge">${typeLabels[r.type] || 'Outro'}</span>
                <button onclick="deleteReminder(${r.id})" class="delete-btn" style="padding:5px 10px;font-size:0.75em">Remover</button>
            </div>
        </div>`;
    }).join('');
}

async function deleteReminder(id) {
    remindersList = remindersList.filter(r => r.id !== id);
    await saveRemindersToFirestore();
    renderCalendar();
    renderRemindersList();
    showToast('Lembrete removido', 'info');
}

function updateReminderBadge() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const pending = remindersList.filter(r => r.date >= today).length;
        const badge = document.getElementById('reminderCount');
        if (!badge) return;
        badge.textContent = pending;
        badge.style.display = pending > 0 ? 'inline-block' : 'none';
    } catch(e) {}
}

function openCalendarModal() {
    const modal = document.getElementById('calendarModal');
    if (!modal) return;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    loadRemindersFromFirestore().then(() => {
        initCalendar();
        renderRemindersList();
    });
    const today = new Date().toISOString().split('T')[0];
    const ri = document.getElementById('reminderDate');
    if (ri && !ri.value) ri.value = today;
    const ri2 = document.getElementById('reminderTime');
    if (ri2 && !ri2.value) {
        const h = String(new Date().getHours() + 1).padStart(2, '0');
        ri2.value = `${h}:00`;
    }
}

function closeCalendarModal() {
    const modal = document.getElementById('calendarModal');
    if (!modal) return;
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

function closeCalendarModalOverlay(e) { if (e.target === e.currentTarget) closeCalendarModal(); }

document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeCalendarModal(); });

// ========================================
// SCROLL ANIMATIONS
// ========================================
function initScrollAnimations() {
    const targets = document.querySelectorAll('.summary-card, .form-section, .transactions-list, .tools-section, .filter-section, .tabs');
    targets.forEach((el, i) => {
        if (!el.classList.contains('scroll-reveal')) {
            el.classList.add('scroll-reveal');
            const delay = (i % 4);
            if (delay > 0) el.classList.add(`delay-${delay}`);
        }
    });
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('visible'); });
    }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });
    document.querySelectorAll('.scroll-reveal').forEach(el => observer.observe(el));
}

function checkUpcomingReminders() {
    try {
        const today = new Date();
        const in3days = new Date(); in3days.setDate(in3days.getDate() + 3);
        const upcoming = remindersList.filter(r => {
            const d = new Date(r.date + 'T' + r.time);
            return d >= today && d <= in3days;
        });
        if (upcoming.length > 0) setTimeout(() => showToast(`Você tem ${upcoming.length} lembrete(s) nos próximos 3 dias`, 'info'), 1500);
    } catch(e) {}
}

// ========================================
// RECORRENTES
// ========================================
function showAddRecurring() {
    const modal = document.getElementById('recurringModal');
    if (modal) { modal.style.display = 'block'; updateRecurringCategorySelect(); }
}
function closeRecurringModal() {
    const modal = document.getElementById('recurringModal');
    if (modal) modal.style.display = 'none';
}
function renderRecurringList() {
    const list = document.getElementById('recurringList');
    if (!list) return;
    if (!recurringTransactions || recurringTransactions.length === 0) {
        list.innerHTML = '<p class="no-data" style="color:var(--text-secondary);padding:20px 0;text-align:center;">Nenhuma transação recorrente configurada</p>';
        return;
    }
    const freqLabel = { daily:'Diária', weekly:'Semanal', monthly:'Mensal', yearly:'Anual' };
    list.innerHTML = recurringTransactions.map((r, i) => `
        <div class="transaction-item">
            <div style="flex:1">
                <b style="color:var(--gold-light)">${r.description}</b><br>
                <small style="color:var(--text-secondary)">${r.category} — ${freqLabel[r.frequency] || r.frequency} — Dia ${r.day}</small>
            </div>
            <div style="display:flex;align-items:center;gap:10px">
                <span style="color:${r.type==='credit'?'var(--success)':'var(--danger)'};font-weight:bold">${r.type==='credit'?'+':'-'}${formatCurrency(r.amount)}</span>
                <button onclick="deleteRecurring(${i})" class="delete-btn" style="padding:5px 10px;font-size:0.8em">×</button>
            </div>
        </div>`).join('');
}
function processRecurringTransactions() {
    if (!recurringTransactions || recurringTransactions.length === 0) return;
    const today = new Date();
    const todayDay = today.getDate();
    const todayStr = today.toISOString().split('T')[0];
    const lastRunKey = `recurring_lastRun_${currentUserUID}`;
    const lastRun = localStorage.getItem(lastRunKey);
    if (lastRun === todayStr) return;
    let launched = 0;
    recurringTransactions.forEach(r => {
        const rDay = parseInt(r.day);
        let shouldLaunch = false;
        switch (r.frequency) {
            case 'daily': shouldLaunch = true; break;
            case 'weekly': shouldLaunch = (today.getDay() === (rDay % 7)); break;
            case 'monthly': shouldLaunch = (todayDay === rDay); break;
            case 'yearly': shouldLaunch = (todayDay === rDay); break;
        }
        if (!shouldLaunch) return;
        const recKey = `rec_done_${currentUserUID}_${r.description}_${todayStr}`;
        if (localStorage.getItem(recKey)) return;
        const transaction = { amount: r.amount, category: r.category, date: todayStr, description: `[Recorrente] ${r.description}`, tags: ['recorrente'], recurring: true };
        if (r.type === 'credit') credits.unshift(transaction);
        else debits.unshift(transaction);
        localStorage.setItem(recKey, '1');
        launched++;
    });
    if (launched > 0) {
        saveAccounts();
        updateSummary();
        localStorage.setItem(lastRunKey, todayStr);
        showToast(`${launched} transação(ões) recorrente(s) lançada(s)`, 'success');
        addNotification('Recorrentes', `${launched} transação(ões) lançada(s) hoje`, 'info');
    } else {
        localStorage.setItem(lastRunKey, todayStr);
    }
}
// deleteRecurring definida abaixo

// ========================================
// METAS
// ========================================
function showAddGoal() {
    const modal = document.getElementById('goalModal');
    if (modal) modal.style.display = 'block';
}
function closeGoalModal() {
    const modal = document.getElementById('goalModal');
    if (modal) modal.style.display = 'none';
}
function renderGoalsList() {
    const emptyHTML = `
        <div style="text-align:center;padding:60px 20px;color:var(--text-secondary);">
            <svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="var(--gold-primary)" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.3;margin-bottom:18px;display:block;margin-left:auto;margin-right:auto;">
                <circle cx="12" cy="12" r="10"/>
                <circle cx="12" cy="12" r="6"/>
                <circle cx="12" cy="12" r="2"/>
                <line x1="12" y1="2" x2="12" y2="4"/>
                <line x1="12" y1="20" x2="12" y2="22"/>
                <line x1="2" y1="12" x2="4" y2="12"/>
                <line x1="20" y1="12" x2="22" y2="12"/>
            </svg>
            <h3 style="font-family:'Cinzel',serif;color:var(--gold-primary);margin-bottom:8px;font-size:1.05em;letter-spacing:1px;">Nenhuma meta definida</h3>
            <p style="font-size:0.88em;max-width:360px;margin:0 auto;line-height:1.6;">Defina objetivos como viagem, reserva de emergencia ou uma compra especial.</p>
        </div>`;

    const html = (!goals || goals.length === 0) ? emptyHTML : goals.map((g, i) => {
        const cur = parseFloat(g.current || 0);
        const tgt = parseFloat(g.target || 1);
        const pct = Math.min(cur / tgt * 100, 100).toFixed(1);
        const remaining = tgt - cur;
        const color = remaining <= 0 ? 'var(--success)' : 'var(--gold-primary)';
        return `
        <div style="margin-bottom:14px;padding:14px;background:rgba(0,0,0,0.2);border:1px solid var(--glass-border);border-radius:10px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <strong style="color:var(--gold-light);font-size:1.35em;letter-spacing:0.3px;">${g.name}</strong>
                <button onclick="deleteGoal(${i})" style="padding:3px 9px;font-size:0.85em;border-radius:5px;background:rgba(231,76,60,0.15);border:1px solid rgba(231,76,60,0.4);color:#E74C3C;cursor:pointer;">&times;</button>
            </div>
            <div style="height:10px;background:rgba(255,255,255,0.07);border-radius:5px;overflow:hidden;margin-bottom:10px;">
                <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--gold-dark),var(--gold-primary));border-radius:3px;transition:width 0.5s;"></div>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:1.25em;margin-bottom:12px;">
                <span style="color:var(--text-secondary)">${formatCurrency(cur)} de ${formatCurrency(tgt)} (${pct}%)</span>
                <span style="color:${color}">${remaining <= 0 ? '&#10003; Meta atingida!' : 'Faltam ' + formatCurrency(remaining)}</span>
            </div>
            <div style="display:flex;gap:8px;">
                <input type="number" id="goalAdd_${i}" placeholder="Valor a adicionar" step="0.01" min="0"
                    style="flex:1;padding:10px 12px;background:rgba(0,0,0,0.3);border:1px solid var(--glass-border);border-radius:7px;color:var(--text-primary);font-size:1em;">
                <button onclick="addToGoalDirect(${i})" style="padding:10px 18px;border-radius:7px;background:linear-gradient(135deg,var(--gold-dark),var(--gold-primary));border:none;color:#0A0E17;font-weight:700;cursor:pointer;font-size:1em;">+ Adicionar</button>
            </div>
            ${g.deadline ? '<small style="color:var(--text-secondary);margin-top:8px;display:block;font-size:1.1em;">Prazo: ' + formatDate(g.deadline) + '</small>' : ''}
        </div>`;
    }).join('');

    ['goalsList', 'goalsListMain'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = html;
    });
}
function addToGoal(i) {
    const inp = document.getElementById('goalAdd_' + i);
    const val = parseFloat(inp?.value);
    if (!val || val <= 0) { showToast('Digite um valor válido', 'error'); return; }
    goals[i].current = (goals[i].current || 0) + val;
    saveToFirestore();
    renderGoalsList();
    showCategoryTotals();
    if (inp) inp.value = '';
    if (goals[i].current >= goals[i].target) showToast(`🏆 Meta "${goals[i].name}" atingida!`, 'success');
    else showToast(`Progresso: ${Math.min((goals[i].current/goals[i].target)*100, 100).toFixed(0)}%`, 'success');
}
function deleteGoal(i) {
    if (!confirm('Remover esta meta?')) return;
    goals.splice(i, 1);
    saveToFirestore();
    renderGoalsList();
    showCategoryTotals();
    showToast('Meta removida', 'info');
}

// ========================================
// VISÃO GERAL
// ========================================
function updateOverviewTab() {
    try {
        const totalC = credits.reduce((s, c) => s + parseFloat(c.amount||0), 0);
        const totalD = debits.reduce((s, d) => s + parseFloat(d.amount||0), 0);
        const totalF = futurePurchases.reduce((s, f) => s + parseFloat(f.amount||0), 0);
        const balance = totalC - totalD;
        const el = (id, val) => { const e = document.getElementById(id); if(e) e.textContent = val; };
        el('ov-credits', formatCurrency(totalC));
        el('ov-debits', formatCurrency(totalD));
        el('ov-balance', formatCurrency(balance));
        el('ov-future', formatCurrency(totalF));
        el('ov-balance-card', formatCurrency(balance));

        const cats = {};
        debits.forEach(d => { cats[d.category] = (cats[d.category]||0) + parseFloat(d.amount||0); });
        const sorted = Object.entries(cats).sort((a,b) => b[1]-a[1]).slice(0,5);
        const catEl = document.getElementById('ov-categories');
        if (catEl) {
            if (sorted.length === 0) { catEl.innerHTML = '<p style="color:var(--text-secondary);text-align:center">Sem lançamentos</p>'; }
            else {
                const maxVal = sorted[0][1];
                catEl.innerHTML = sorted.map(([cat, val]) => `
                    <div style="margin-bottom:14px">
                        <div style="display:flex;justify-content:space-between;margin-bottom:5px">
                            <span style="color:var(--text-primary)">${cat}</span>
                            <span style="color:var(--gold-primary);font-weight:600">${formatCurrency(val)}</span>
                        </div>
                        <div style="height:6px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden">
                            <div style="height:100%;width:${(val/maxVal*100).toFixed(0)}%;background:linear-gradient(90deg,var(--gold-dark),var(--gold-primary));border-radius:3px;transition:width 0.6s ease"></div>
                        </div>
                    </div>`).join('');
            }
        }

        const all = [...credits.map(c=>({...c,_type:'credit'})),...debits.map(d=>({...d,_type:'debit'}))].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,5);
        const recentEl = document.getElementById('ov-recent');
        if (recentEl) {
            recentEl.innerHTML = all.length === 0 ? '<p style="color:var(--text-secondary);text-align:center">Sem transações recentes</p>'
                : all.map(t => `
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--glass-border)">
                        <div>
                            <div style="color:var(--text-primary);font-size:0.95em">${t.description}</div>
                            <div style="color:var(--text-secondary);font-size:0.8em">${t.category} • ${formatDate(t.date)}</div>
                        </div>
                        <span style="font-weight:600;color:${t._type==='credit'?'var(--success)':'var(--danger)'}">${t._type==='credit'?'+':'-'}${formatCurrency(t.amount)}</span>
                    </div>`).join('');
        }
    } catch(e) { console.error('updateOverviewTab:', e); }
}

// Expor funções para o HTML que precisa de showImportModal
// [removida - função duplicada]


// ================================================================
// CORREÇÃO: VISUALIZAÇÃO DE COMPROVANTES
// Adicionado automaticamente
// ================================================================

// Remover função antiga se existir
if (typeof viewAttachment !== 'undefined') {
    console.log('⚠️ Substituindo viewAttachment antiga');
}

// FUNÇÃO CORRIGIDA
function viewAttachment(type, index) {
    console.log('🔍 viewAttachment chamado:', {type, index});
    
    // Buscar o item correto
    let item;
    if (type === 'credits' || type === 'credit') {
        item = credits[index];
    } else if (type === 'debits' || type === 'debit') {
        item = debits[index];
    } else if (type === 'future') {
        item = futurePurchases[index];
    }
    
    // Verificar se existe
    if (!item) {
        console.error('❌ Item não encontrado:', {type, index});
        showToast('Erro: item não encontrado', 'error');
        return;
    }
    
    // Verificar se tem anexo
    if (!item.attachment || !item.attachment.data) {
        console.warn('⚠️ Sem anexo:', item);
        showToast('Nenhum comprovante anexado neste item', 'info');
        return;
    }
    
    console.log('✅ Anexo encontrado:', {
        type: item.attachment.type,
        name: item.attachment.name,
        size: item.attachment.data.length
    });
    
    // Remover modal anterior
    const oldModal = document.getElementById('attachmentModal');
    if (oldModal) oldModal.remove();
    
    // Verificar se é imagem
    const isImage = item.attachment.type && item.attachment.type.startsWith('image/');
    
    // Criar modal
    const modal = document.createElement('div');
    modal.id = 'attachmentModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.95);
        backdrop-filter: blur(10px);
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        animation: fadeIn 0.3s ease;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
        background: var(--bg-card, #1a1f2e);
        border: 1px solid var(--glass-border, rgba(212,175,55,0.2));
        border-radius: 16px;
        padding: 24px;
        max-width: min(90vw, 800px);
        max-height: 90vh;
        overflow: auto;
        position: relative;
        box-shadow: 0 30px 80px rgba(0,0,0,0.8);
    `;
    
    // Header
    const header = document.createElement('div');
    header.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 20px;
        padding-bottom: 16px;
        border-bottom: 1px solid var(--glass-border, rgba(212,175,55,0.2));
    `;
    
    const title = document.createElement('h2');
    title.textContent = '📎 Comprovante';
    title.style.cssText = `
        font-family: 'Cinzel', serif;
        color: var(--gold-primary, #D4AF37);
        font-size: 1.1em;
        letter-spacing: 1px;
        margin: 0;
    `;
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = `
        background: transparent;
        border: 1px solid var(--glass-border, rgba(212,175,55,0.2));
        color: var(--text-secondary, #A0A0A0);
        width: 34px;
        height: 34px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 1.5em;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        transition: all 0.3s;
    `;
    closeBtn.onmouseover = () => {
        closeBtn.style.background = 'rgba(212,175,55,0.1)';
        closeBtn.style.borderColor = 'var(--gold-primary, #D4AF37)';
    };
    closeBtn.onmouseout = () => {
        closeBtn.style.background = 'transparent';
        closeBtn.style.borderColor = 'var(--glass-border, rgba(212,175,55,0.2))';
    };
    closeBtn.onclick = () => modal.remove();
    
    header.appendChild(title);
    header.appendChild(closeBtn);
    
    // Body
    const body = document.createElement('div');
    body.style.cssText = 'text-align: center;';
    
    if (isImage) {
        // Mostrar imagem
        const img = document.createElement('img');
        img.src = item.attachment.data;
        img.alt = 'Comprovante';
        img.style.cssText = `
            max-width: 100%;
            max-height: 70vh;
            object-fit: contain;
            border-radius: 8px;
            display: block;
            margin: 0 auto;
        `;
        body.appendChild(img);
        
        console.log('✅ Imagem renderizada');
    } else {
        // Arquivo não-imagem
        const fileInfo = document.createElement('p');
        fileInfo.textContent = `📄 ${item.attachment.name || 'Arquivo anexado'}`;
        fileInfo.style.cssText = `
            color: var(--text-primary, #FFF);
            margin-bottom: 20px;
            font-size: 1.1em;
        `;
        
        const downloadBtn = document.createElement('a');
        downloadBtn.href = item.attachment.data;
        downloadBtn.download = item.attachment.name || 'comprovante';
        downloadBtn.textContent = '⬇️ Download';
        downloadBtn.style.cssText = `
            background: linear-gradient(135deg, var(--gold-primary, #D4AF37), var(--gold-dark, #B8942A));
            color: #0A0E17;
            padding: 12px 28px;
            border-radius: 8px;
            text-decoration: none;
            font-family: 'Cinzel', serif;
            font-size: 0.85em;
            letter-spacing: 1px;
            font-weight: bold;
            display: inline-block;
            transition: transform 0.3s;
        `;
        downloadBtn.onmouseover = () => {
            downloadBtn.style.transform = 'translateY(-2px)';
        };
        downloadBtn.onmouseout = () => {
            downloadBtn.style.transform = 'translateY(0)';
        };
        
        body.appendChild(fileInfo);
        body.appendChild(downloadBtn);
        
        console.log('✅ Link de download renderizado');
    }
    
    content.appendChild(header);
    content.appendChild(body);
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // Fechar ao clicar no fundo
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    // Fechar com ESC
    const handleEsc = (e) => {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', handleEsc);
        }
    };
    document.addEventListener('keydown', handleEsc);
    
    console.log('✅ Modal de comprovante aberto com sucesso');
}

// Adicionar CSS de animação
if (!document.getElementById('attachmentModalStyle')) {
    const style = document.createElement('style');
    style.id = 'attachmentModalStyle';
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
    `;
    document.head.appendChild(style);
}

console.log('✅ Correção de comprovantes carregada');
// ================================================================
// CORREÇÕES: DATA E IMPORTAÇÃO
// Cole este código no FINAL do script.js (substituindo as funções antigas)
// ================================================================

// CORREÇÃO 1: EXPORTAR COM DATA NO FORMATO DD/MM/AAAA

// CORREÇÃO 2: IMPORTAR DÉBITOS E CRÉDITOS (com suporte a DD/MM/AAAA)
// [removida - função duplicada]


console.log('✅ Correções de data e importação carregadas');
// ================================================================
// CORREÇÃO FINAL: IMPORTAÇÃO + FILTROS
// Cole este código no FINAL do script.js (SUBSTITUI AS FUNÇÕES ANTIGAS)
// ================================================================

// CORREÇÃO 1: FUNÇÃO DE IMPORTAÇÃO REESCRITA
function showImportModal() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const text = ev.target.result;
                console.log('📄 Arquivo CSV lido:', file.name);
                console.log('📊 Tamanho:', text.length, 'bytes');
                
                // Remover BOM se existir
                const cleanText = text.replace(/^\ufeff/, '');
                
                const lines = cleanText.split('\n').filter(l => l.trim());
                console.log('📝 Total de linhas:', lines.length);
                console.log('📋 Cabeçalho:', lines[0]);
                
                // Pular cabeçalho
                const dataLines = lines.slice(1);
                console.log('📊 Linhas de dados:', dataLines.length);
                
                let imported = 0;
                let duplicados = 0;
                let erros = 0;
                let creditosAdd = 0;
                let debitosAdd = 0;

                function chave(t) {
                    return `${t.amount}_${t.date}_${t.description}_${t.category}`;
                }

                const chavesCreditos = new Set(credits.map(chave));
                const chavesDebitos = new Set(debits.map(chave));

                dataLines.forEach((line, index) => {
                    try {
                        if (!line.trim()) return;
                        
                        // Separar por ponto e vírgula — remover \r do Windows
                        const parts = line.split(';').map(p => p.trim().replace(/\r/g, '').replace(/^"|"$/g, ''));
                        
                        if (parts.length < 4) {
                            console.warn(`⚠️ Linha ${index + 2}: Muito curta - ${parts.length} campos`);
                            erros++;
                            return;
                        }
                        
                        const [tipo, desc, valor, data, cat, tags] = parts;
                        
                        console.log(`\n📍 Linha ${index + 2}:`);
                        console.log(`  Tipo: "${tipo}"`);
                        console.log(`  Descrição: "${desc}"`);
                        console.log(`  Valor: "${valor}"`);
                        console.log(`  Data: "${data}"`);
                        
                        // Converter valor — detecta decimal vs milhar
                        let valorNorm = valor.trim().replace(/\r/g, '');
                        let amount;
                        if (/^\d{1,3}(\.\d{3})*(,\d{1,2})?$/.test(valorNorm)) {
                            amount = parseFloat(valorNorm.replace(/\./g, '').replace(',', '.'));
                        } else if (/^\d+\.\d{1,2}$/.test(valorNorm)) {
                            amount = parseFloat(valorNorm);
                        } else if (/^\d+,\d{1,2}$/.test(valorNorm)) {
                            amount = parseFloat(valorNorm.replace(',', '.'));
                        } else {
                            amount = parseFloat(valorNorm.replace(',', '.'));
                        }
                        
                        if (isNaN(amount) || amount === 0) {
                            console.error(`❌ Valor inválido: "${valor}" → ${amount}`);
                            erros++;
                            return;
                        }
                        
                        // Converter data DD/MM/AAAA → AAAA-MM-DD
                        let dateISO = data;
                        if (data.includes('/')) {
                            const [day, month, year] = data.split('/');
                            dateISO = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                        }

                        const trans = {
                            amount,
                            category: cat || 'Outro',
                            date: dateISO,
                            description: desc,
                            tags: tags ? tags.split(',').filter(Boolean) : [],
                            account: currentAccount
                        };
                        
                        const k = chave(trans);
                        
                        // Detecção de tipo MELHORADA
                        const tipoLower = tipo.toLowerCase().trim().replace(/\r/g, '');
                        
                        // Verificar se é CRÉDITO
                        const isCredito = 
                            tipoLower === 'credito' ||
                            tipoLower === 'crédito' ||
                            tipoLower === 'credit' ||
                            tipoLower === 'c' ||
                            tipoLower === 'entrada' ||
                            tipoLower === 'receita';
                        
                        // Verificar se é DÉBITO
                        const isDebito = 
                            tipoLower === 'debito' ||
                            tipoLower === 'débito' ||
                            tipoLower === 'debit' ||
                            tipoLower === 'd' ||
                            tipoLower === 'saida' ||
                            tipoLower === 'saída' ||
                            tipoLower === 'despesa' ||
                            tipoLower === 'gasto';
                        
                        console.log(`  → Crédito? ${isCredito} | Débito? ${isDebito}`);

                        if (isCredito) {
                            if (chavesCreditos.has(k)) {
                                console.log(`  ⚠️ Duplicado (crédito)`);
                                duplicados++;
                                return;
                            }
                            credits.unshift(trans);
                            chavesCreditos.add(k);
                            creditosAdd++;
                            console.log(`  ✅ CRÉDITO adicionado: ${desc} - R$ ${amount}`);
                        } else if (isDebito) {
                            if (chavesDebitos.has(k)) {
                                console.log(`  ⚠️ Duplicado (débito) - importando mesmo assim`);
                            }
                            debits.unshift(trans);
                            chavesDebitos.add(k);
                            debitosAdd++;
                            console.log(`  ✅ DÉBITO adicionado: ${desc} - R$ ${amount}`);
                        } else {
                            console.error(`  ❌ Tipo não reconhecido: "${tipo}"`);
                            erros++;
                            return;
                        }
                        
                        imported++;
                    } catch (error) {
                        console.error(`❌ Erro na linha ${index + 2}:`, error);
                        erros++;
                    }
                });

                console.log('\n' + '='.repeat(50));
                console.log('📊 RESULTADO DA IMPORTAÇÃO:');
                console.log(`✅ Total importado: ${imported}`);
                console.log(`  💚 Créditos: ${creditosAdd}`);
                console.log(`  ❤️ Débitos: ${debitosAdd}`);
                console.log(`  ⚠️ Duplicados: ${duplicados}`);
                console.log(`  ❌ Erros: ${erros}`);
                console.log('='.repeat(50));

                if (imported > 0) {
                    saveAccounts();
                    updateSummary();
                    renderLists();
                }

                // Mensagem de resultado
                let msg = `✅ ${imported} importada(s)`;
                if (creditosAdd > 0) msg += ` · 📈 ${creditosAdd} crédito(s)`;
                if (debitosAdd > 0) msg += ` · 📉 ${debitosAdd} débito(s)`;
                if (duplicados > 0) msg += ` · ⚠️ ${duplicados} duplicata(s)`;
                if (erros > 0) msg += ` · ❌ ${erros} erro(s)`;
                
                showToast(msg, imported > 0 ? 'success' : 'error');
                
            } catch (error) {
                console.error('❌ Erro fatal:', error);
                showToast('❌ Erro ao ler arquivo: ' + error.message, 'error');
            }
        };
        reader.readAsText(file, 'UTF-8');
    };
    input.click();
}

// CORREÇÃO 2: ADICIONAR CONTA AO EXPORTAR
function showExportModal() {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.8);
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
    `;
    
    modal.innerHTML = `
        <div style="
            background: var(--bg-card, #1a1f2e);
            border: 1px solid var(--glass-border, rgba(212,175,55,0.2));
            border-radius: 16px;
            padding: 30px;
            max-width: 400px;
            width: 100%;
        ">
            <h2 style="
                font-family: 'Cinzel', serif;
                color: var(--gold-primary, #D4AF37);
                margin: 0 0 24px 0;
                font-size: 1.3em;
            ">📊 Exportar Dados</h2>
            
            <div style="margin-bottom: 20px;">
                <label style="
                    display: block;
                    font-family: 'Cinzel', serif;
                    font-size: 0.75em;
                    color: var(--gold-light, #F4E5C3);
                    letter-spacing: 1px;
                    text-transform: uppercase;
                    margin-bottom: 8px;
                ">Data Inicial (DD/MM/AAAA)</label>
                <input type="text" id="exportStartDate" placeholder="01/01/2026" maxlength="10" style="
                    width: 100%;
                    padding: 12px 14px;
                    background: rgba(0,0,0,0.35);
                    border: 1px solid rgba(212,175,55,0.2);
                    border-radius: 8px;
                    color: #fff;
                    font-size: 1em;
                ">
            </div>
            
            <div style="margin-bottom: 24px;">
                <label style="
                    display: block;
                    font-family: 'Cinzel', serif;
                    font-size: 0.75em;
                    color: var(--gold-light, #F4E5C3);
                    letter-spacing: 1px;
                    text-transform: uppercase;
                    margin-bottom: 8px;
                ">Data Final (DD/MM/AAAA)</label>
                <input type="text" id="exportEndDate" placeholder="31/12/2026" maxlength="10" style="
                    width: 100%;
                    padding: 12px 14px;
                    background: rgba(0,0,0,0.35);
                    border: 1px solid rgba(212,175,55,0.2);
                    border-radius: 8px;
                    color: #fff;
                    font-size: 1em;
                ">
            </div>
            
            <div style="display: flex; gap: 12px;">
                <button id="exportCancelBtn" style="
                    flex: 1;
                    padding: 12px;
                    background: rgba(255,255,255,0.1);
                    border: 1px solid rgba(255,255,255,0.2);
                    border-radius: 8px;
                    color: #fff;
                    cursor: pointer;
                    font-family: 'Cinzel', serif;
                    font-size: 0.85em;
                    letter-spacing: 1px;
                ">Cancelar</button>
                <button id="exportConfirmBtn" style="
                    flex: 1;
                    padding: 12px;
                    background: linear-gradient(135deg, var(--gold-primary, #D4AF37), var(--gold-dark, #B8942A));
                    border: none;
                    border-radius: 8px;
                    color: #0A0E17;
                    cursor: pointer;
                    font-family: 'Cinzel', serif;
                    font-size: 0.85em;
                    font-weight: bold;
                    letter-spacing: 1px;
                ">Exportar</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const startInput = document.getElementById('exportStartDate');
    const endInput = document.getElementById('exportEndDate');
    
    function applyDateMask(input) {
        input.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length >= 2) {
                value = value.substring(0, 2) + '/' + value.substring(2);
            }
            if (value.length >= 5) {
                value = value.substring(0, 5) + '/' + value.substring(5, 9);
            }
            e.target.value = value;
        });
    }
    
    applyDateMask(startInput);
    applyDateMask(endInput);
    
    document.getElementById('exportCancelBtn').onclick = () => modal.remove();
    
    document.getElementById('exportConfirmBtn').onclick = () => {
        const start = startInput.value;
        const end = endInput.value;
        
        if (!start || !end) {
            showToast('❌ Preencha ambas as datas', 'error');
            return;
        }
        
        const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
        if (!dateRegex.test(start) || !dateRegex.test(end)) {
            showToast('❌ Use o formato DD/MM/AAAA', 'error');
            return;
        }
        
        const startISO = start.split('/').reverse().join('-');
        const endISO = end.split('/').reverse().join('-');
        
        const fC = credits.filter(c => c.date >= startISO && c.date <= endISO);
        const fD = debits.filter(d => d.date >= startISO && d.date <= endISO);
        
        let csv = "\ufeffTipo;Descricao;Valor;Data;Categoria;Tags\n";
        
        fD.forEach(d => {
            const dataBR = d.date.split('-').reverse().join('/');
            csv += `Debito;${d.description};${d.amount};${dataBR};${d.category};${(d.tags||[]).join(',')}\n`;
        });
        
        fC.forEach(c => {
            const dataBR = c.date.split('-').reverse().join('/');
            csv += `Credito;${c.description};${c.amount};${dataBR};${c.category};${(c.tags||[]).join(',')}\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `stiga_${start.replace(/\//g, '-')}_${end.replace(/\//g, '-')}.csv`;
        link.click();
        
        showToast(`📥 ${fC.length + fD.length} transações exportadas!`, 'success');
        modal.remove();
    };
}

console.log('✅ Correção final de importação e exportação carregada');
console.log('📝 Para testar, abra o Console (F12) e importe um CSV');
// ================================================================
// SISTEMA COMPLETO DE FILTROS
// Cole este código no FINAL do script.js
// ================================================================

// Variáveis globais de filtro
let filterCreditCategoryValue = '';
let filterDebitCategoryValue = '';

// FUNÇÃO: Inicializar filtros
function initializeFilters() {
    console.log('🔍 Inicializando sistema de filtros...');
    
    // Preencher opções de filtro de créditos
    const filterCreditSelect = document.getElementById('filterCreditCategory');
    if (filterCreditSelect) {
        const creditCategories = getCategories().credit;
        filterCreditSelect.innerHTML = '<option value="">📁 Todas as categorias</option>';
        creditCategories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            filterCreditSelect.appendChild(option);
        });
        
        // Event listener
        filterCreditSelect.addEventListener('change', function() {
            filterCreditCategoryValue = this.value;
            console.log('🔍 Filtro crédito mudou para:', filterCreditCategoryValue || 'TODAS');
            renderLists();
        });
        
        console.log('✅ Filtro de créditos inicializado');
    }
    
    // Preencher opções de filtro de débitos
    const filterDebitSelect = document.getElementById('filterDebitCategory');
    if (filterDebitSelect) {
        const debitCategories = getCategories().debit;
        filterDebitSelect.innerHTML = '<option value="">📁 Todas as categorias</option>';
        debitCategories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            filterDebitSelect.appendChild(option);
        });
        
        // Event listener
        filterDebitSelect.addEventListener('change', function() {
            filterDebitCategoryValue = this.value;
            console.log('🔍 Filtro débito mudou para:', filterDebitCategoryValue || 'TODAS');
            renderLists();
        });
        
        console.log('✅ Filtro de débitos inicializado');
    }
}

// FUNÇÃO: Renderizar listas COM FILTROS
function renderLists() {
    const privClass = privacyMode ? 'privacy-active' : '';
    
    // ========================================
    // CRÉDITOS COM FILTRO
    // ========================================
    let creditosParaMostrar = credits;
    
    // Aplicar filtro de categoria
    if (filterCreditCategoryValue) {
        creditosParaMostrar = credits.filter(c => c.category === filterCreditCategoryValue);
        console.log(`🔍 Filtro créditos aplicado: "${filterCreditCategoryValue}" → ${creditosParaMostrar.length} resultados`);
    }
    
    const credList = document.getElementById('creditsList');
    if (credList) {
        credList.innerHTML = creditosParaMostrar.length > 0 ? creditosParaMostrar.map((c, i) => {
            // Encontrar índice original para editar/deletar corretamente
            const originalIndex = credits.indexOf(c);
            return `
                <div class="transaction-item">
                    <div style="flex:1">
                        <b>${formatDate(c.date)}</b><br>
                        ${c.category} - ${c.description}
                        ${c.tags && c.tags.length ? `<br><small class="tags">${c.tags.map(t => `🏷️${t}`).join(' ')}</small>` : ''}
                    </div>
                    <div class="summary-value ${privClass}" style="color:#2ECC71">${formatCurrency(c.amount)}</div>
                    <div class="action-btns">
                        ${c.attachment ? `<button class="edit-btn" title="Ver comprovante" onclick="viewAttachment('credits',${originalIndex})">📎</button>` : ''}
                        <button class="edit-btn" onclick="editItem('credits',${originalIndex})">✏️</button>
                        <button class="delete-btn" onclick="deleteItem('credits',${originalIndex})">×</button>
                    </div>
                </div>
            `;
        }).join('') : `<p class="no-data">Nenhum crédito ${filterCreditCategoryValue ? 'nesta categoria' : 'registrado'}</p>`;
    }
    
    // ========================================
    // DÉBITOS COM FILTRO
    // ========================================
    let debitosParaMostrar = debits;
    
    // Aplicar filtro de categoria
    if (filterDebitCategoryValue) {
        debitosParaMostrar = debits.filter(d => d.category === filterDebitCategoryValue);
        console.log(`🔍 Filtro débitos aplicado: "${filterDebitCategoryValue}" → ${debitosParaMostrar.length} resultados`);
    }
    
    const debList = document.getElementById('debitsList');
    if (debList) {
        debList.innerHTML = debitosParaMostrar.length > 0 ? debitosParaMostrar.map((d, i) => {
            // Encontrar índice original para editar/deletar corretamente
            const originalIndex = debits.indexOf(d);
            // Verificar se é um débito que pode ser estornado
            const isPaidItem = d.description && d.description.startsWith('PAGO:');
            const undoButton = isPaidItem ? `<button class="btn-undo" onclick="undoPayment(${originalIndex})" title="Estornar pagamento">🔄 Estornar</button>` : '';
            
            return `
                <div class="transaction-item">
                    <div style="flex:1">
                        <b>${formatDate(d.date)}</b><br>
                        ${d.category} - ${d.description}
                        ${d.tags && d.tags.length ? `<br><small class="tags">${d.tags.map(t => `🏷️${t}`).join(' ')}</small>` : ''}
                    </div>
                    <div class="summary-value ${privClass}" style="color:#E74C3C">-${formatCurrency(d.amount)}</div>
                    <div class="action-btns">
                        ${d.attachment ? `<button class="edit-btn" title="Ver comprovante" onclick="viewAttachment('debits',${originalIndex})">📎</button>` : ''}
                        ${undoButton}
                        <button class="edit-btn" onclick="editItem('debits',${originalIndex})">✏️</button>
                        <button class="delete-btn" onclick="deleteItem('debits',${originalIndex})">×</button>
                    </div>
                </div>
            `;
        }).join('') : `<p class="no-data">Nenhum débito ${filterDebitCategoryValue ? 'nesta categoria' : 'registrado'}</p>`;
    }
    
    // ========================================
    // COMPRAS FUTURAS (sem filtro)
    // ========================================
    const futList = document.getElementById('futureList');
    if (futList) {
        const futIndexed = futurePurchases.map((f, i) => ({ ...f, _origIdx: i }));
        futIndexed.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
        const hoje2 = new Date(); 
        hoje2.setHours(0,0,0,0);
        
        futList.innerHTML = futIndexed.length > 0 ? futIndexed.map(f => {
            const venc = new Date(f.dueDate + 'T00:00:00');
            const diffDias = Math.ceil((venc - hoje2) / 86400000);
            let urgLabel = '';
            if (diffDias < 0) urgLabel = `<span style="color:#E74C3C;font-size:0.75em;font-weight:bold;"> ⚠️ VENCIDA</span>`;
            else if (diffDias === 0) urgLabel = `<span style="color:#E74C3C;font-size:0.75em;font-weight:bold;"> 🔴 HOJE</span>`;
            else if (diffDias <= 3) urgLabel = `<span style="color:#F39C12;font-size:0.75em;font-weight:bold;"> 🟡 ${diffDias}d</span>`;
            else urgLabel = `<span style="color:#8A95A3;font-size:0.75em;"> ${diffDias}d</span>`;
            
            return `
                <div class="transaction-item">
                    <div style="flex:1">
                        <b>Vencimento: ${formatDate(f.dueDate)}</b>${urgLabel}<br>
                        ${f.description}
                    </div>
                    <div class="summary-value ${privClass}" style="color:#F39C12">${formatCurrency(f.amount)}</div>
                    <div class="action-btns">
                        <button class="btn btn-small pay-btn" onclick="payItem(${f._origIdx})">💳 Pagar</button>
                        <button class="delete-btn" onclick="deleteItem('futurePurchases',${f._origIdx})">×</button>
                    </div>
                </div>
            `;
        }).join('') : '<p class="no-data">Nenhuma compra futura</p>';
    }
}

// FUNÇÃO: Limpar filtros
function clearFilters() {
    filterCreditCategoryValue = '';
    filterDebitCategoryValue = '';
    
    const filterCreditSelect = document.getElementById('filterCreditCategory');
    if (filterCreditSelect) filterCreditSelect.value = '';
    
    const filterDebitSelect = document.getElementById('filterDebitCategory');
    if (filterDebitSelect) filterDebitSelect.value = '';
    
    console.log('🔍 Filtros limpos');
    renderLists();
}

// Inicializar filtros quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando sistema...');
    
    // Aguardar 500ms para garantir que tudo carregou
    setTimeout(() => {
        initializeFilters();
        renderLists();
    }, 500);
});

console.log('✅ Sistema de filtros carregado');// ================================================================
// SIDEBAR LATERAL PROFISSIONAL - JAVASCRIPT
// Cole este código no FINAL do script.js
// ================================================================

// TOGGLE SIDEBAR (MOBILE)
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const toggle = document.getElementById('sidebarToggle');
    if (!sidebar) return;
    sidebar.classList.toggle('active');
    if (overlay) overlay.classList.toggle('active');
    if (toggle) toggle.classList.toggle('active');
}

function mobileNavTo(tabName) {
    document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active'));
    const map = { credits:'mbnCredits', debits:'mbnDebits', future:'mbnFuture', overview:'mbnOverview' };
    const b = document.getElementById(map[tabName]);
    if (b) b.classList.add('active');
    navigateToTab(tabName);
}

function syncMobileNav(tabName) {
    document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active'));
    const map = { credits:'mbnCredits', debits:'mbnDebits', future:'mbnFuture', overview:'mbnOverview' };
    const b = document.getElementById(map[tabName]);
    if (b) b.classList.add('active');
}

// NAVEGAÇÃO ENTRE TABS
function setupSidebarNavigation() {
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    const tabContents = document.querySelectorAll('.tab-content');
    
    sidebarItems.forEach(item => {
        item.addEventListener('click', () => {
            const tabName = item.dataset.tab;
            
            // Remove active de todos
            sidebarItems.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Adiciona active no clicado
            item.classList.add('active');
            
            // Mostra o conteúdo correto
            const targetTab = document.getElementById(tabName);
            if (targetTab) {
                targetTab.classList.add('active');
            }
            
            // Fecha sidebar em mobile
            if (window.innerWidth <= 768) {
                toggleSidebar();
            }
            
            // scroll pelo sistema unificado
            
            // Atualiza URL
            history.pushState(null, null, `#${tabName}`);
            
            // Log para debug
            console.log(`Navegou para: ${tabName}`);
        });
    });
}

// ATUALIZAR INFO DO USUÁRIO NA SIDEBAR
function updateSidebarUser() {
    const userNameEl = document.getElementById('sidebarUserName');
    const userBalanceEl = document.getElementById('sidebarUserBalance');
    
    if (userNameEl && currentUser) {
        // Pega primeiro nome do email
        const firstName = currentUser.split('@')[0];
        const capitalizedName = firstName.charAt(0).toUpperCase() + firstName.slice(1);
        userNameEl.textContent = capitalizedName;
    }
    
    if (userBalanceEl) {
        const totalCredits = credits.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
        const totalDebits = debits.reduce((sum, d) => sum + parseFloat(d.amount || 0), 0);
        const balance = totalCredits - totalDebits;
        
        userBalanceEl.textContent = formatCurrency(balance);
        userBalanceEl.style.color = balance >= 0 ? 'var(--success)' : 'var(--danger)';
    }
}

// ATUALIZAR BADGE DO CALENDÁRIO
function updateSidebarCalendarBadge() {
    const badgeEl = document.getElementById('calendarBadge');
    if (badgeEl) {
        const reminderCount = reminders.length;
        badgeEl.textContent = reminderCount;
        badgeEl.style.display = reminderCount > 0 ? 'block' : 'none';
    }
}

// INICIALIZAR SIDEBAR
function initSidebar() {
    setupSidebarNavigation();
    updateSidebarUser();
    updateSidebarCalendarBadge();
    
    // Navegar para tab inicial ou hash da URL
    const hash = window.location.hash.replace('#', '');
    if (hash) {
        const targetButton = document.querySelector(`[data-tab="${hash}"]`);
        if (targetButton) {
            targetButton.click();
        }
    } else {
        // Ativa Dashboard por padrão
        const dashboardBtn = document.querySelector('[data-tab="dashboard"]');
        if (dashboardBtn) {
            dashboardBtn.click();
        }
    }
}

// ATUALIZAR SIDEBAR QUANDO DADOS MUDAREM
function onDataUpdate() {
    updateSidebarUser();
    updateSidebarCalendarBadge();
}

// Chamar onDataUpdate sempre que dados mudarem
const originalSaveAccounts = saveAccounts;
saveAccounts = function() {
    originalSaveAccounts.apply(this, arguments);
    onDataUpdate();
};

// FECHAR SIDEBAR AO CLICAR FORA (MOBILE)
document.addEventListener('click', (e) => {
    const sidebar = document.querySelector('.sidebar-pro');
    const toggle = document.querySelector('.sidebar-toggle-btn');
    
    if (window.innerWidth <= 768 && 
        sidebar?.classList.contains('active') &&
        !sidebar.contains(e.target) && 
        !toggle.contains(e.target)) {
        toggleSidebar();
    }
});

// ATALHO DE TECLADO (Ctrl + B = Toggle Sidebar)
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        toggleSidebar();
    }
});

// INICIALIZAR QUANDO DOM CARREGAR
document.addEventListener('DOMContentLoaded', () => {
    // Pequeno delay para garantir que tudo carregou
    setTimeout(initSidebar, 500);
});

// ================================================================
// FIM DO JAVASCRIPT DA SIDEBAR
// ================================================================

console.log('✅ Sidebar profissional carregada!');

// ================================================================
// FIX: FORÇAR NAVEGAÇÃO CORRETA
// ================================================================

// Garantir que setupSidebarNavigation seja chamado
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 Iniciando correção de navegação...');
    
    // Pequeno delay para garantir que DOM carregou
    setTimeout(() => {
        // Forçar setup da navegação
        if (typeof setupSidebarNavigation === 'function') {
            setupSidebarNavigation();
            console.log('✅ Navegação configurada!');
        }
        
        // Forçar dashboard ativo
        const dashboard = document.getElementById('dashboard');
        if (dashboard) {
            dashboard.classList.add('active');
            console.log('✅ Dashboard ativado!');
        }
        
        // Verificar botões da sidebar
        const sidebarButtons = document.querySelectorAll('.sidebar-item');
        console.log(`📍 ${sidebarButtons.length} botões encontrados`);
        
        sidebarButtons.forEach((btn, index) => {
            const tab = btn.dataset.tab;
            console.log(`  ${index + 1}. ${tab}`);
        });
        
    }, 1000);
});

console.log('✅ Script de correção carregado!');

// ================================================================
// FIM DO FIX
// ================================================================

// ================================================================
// METAS E ORÇAMENTOS - VERSÃO LIMPA SEM DUPLICATAS
// ================================================================

goals = JSON.parse(localStorage.getItem('goals') || '[]');
budgets = JSON.parse(localStorage.getItem('budgets') || '[]');

function addGoal(e) {
    e.preventDefault();
    const goal = {
        id: Date.now(),
        name: document.getElementById('goalName')?.value?.trim(),
        target: parseFloat(document.getElementById('goalTarget')?.value || 0),
        current: parseFloat(document.getElementById('goalCurrent')?.value || 0),
        deadline: document.getElementById('goalDeadline')?.value || '',
        createdAt: new Date().toISOString()
    };
    if (!goal.name || !goal.target) { showToast('Preencha nome e valor da meta', 'error'); return; }
    goals.push(goal);
    saveToFirestore();
    document.getElementById('goalForm')?.reset();
    const modal = document.getElementById('goalModal');
    if (modal) modal.style.display = 'none';
    renderGoalsList();
    syncGoalsMain();
    updateSummary();
    showToast('🎯 Meta criada com sucesso!', 'success');
}

function renderGoalsFinal() {
    const container = document.getElementById('goalsList');
    if (!container) return;
    
    if (goals.length === 0) {
        container.innerHTML = '<p class="no-data">Nenhuma meta cadastrada ainda.</p>';
        return;
    }
    
    container.innerHTML = goals.map(goal => {
        const progress = (goal.current / goal.target) * 100;
        const remaining = goal.target - goal.current;
        const daysLeft = goal.deadline ? Math.ceil((new Date(goal.deadline) - new Date()) / (1000 * 60 * 60 * 24)) : null;
        
        return `
            <div class="card" style="margin-bottom: 20px; padding: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                    <div>
                        <h3 style="font-family: 'Cinzel', serif; color: var(--gold-primary); margin-bottom: 5px;">
                            ${goal.name}
                        </h3>
                        ${daysLeft !== null ? `<p style="color: var(--text-secondary); font-size: 0.85em;">
                            ${daysLeft > 0 ? `Faltam ${daysLeft} dias` : 'Prazo vencido'}
                        </p>` : ''}
                    </div>
                    <button onclick="deleteGoalFinal(${goal.id})" class="delete-btn-small" title="Excluir meta">×</button>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="color: var(--text-secondary); font-size: 0.9em;">
                            ${formatCurrency(goal.current)} de ${formatCurrency(goal.target)}
                        </span>
                        <span style="color: var(--gold-primary); font-weight: bold; font-size: 0.9em;">
                            ${progress.toFixed(1)}%
                        </span>
                    </div>
                    <div style="background: rgba(255,255,255,0.1); height: 12px; border-radius: 6px; overflow: hidden;">
                        <div style="background: linear-gradient(90deg, var(--gold-dark), var(--gold-primary)); 
                                    height: 100%; width: ${Math.min(progress, 100)}%; transition: width 0.5s;"></div>
                    </div>
                </div>
                
                <div style="display: flex; gap: 10px; align-items: center;">
                    <input type="number" id="goalAdd${goal.id}" placeholder="Valor" step="0.01" 
                           style="flex: 1; padding: 8px; background: rgba(0,0,0,0.3); border: 1px solid rgba(212,175,55,0.3); 
                                  border-radius: 6px; color: white;">
                    <button onclick="addToGoalFinal(${goal.id})" class="btn-secondary" style="padding: 8px 16px;">
                        ➕ Adicionar
                    </button>
                </div>
                
                ${remaining > 0 ? `<p style="color: var(--text-secondary); font-size: 0.85em; margin-top: 10px;">
                    Faltam ${formatCurrency(remaining)} para atingir a meta
                </p>` : `<p style="color: var(--success); font-weight: bold; margin-top: 10px;">
                    🎉 Meta atingida!
                </p>`}
            </div>
        `;
    }).join('');
}

function addToGoalFinal(goalId) {
    const input = document.getElementById(`goalAdd${goalId}`);
    const amount = parseFloat(input.value);
    
    if (!amount || amount <= 0) {
        showToast('Digite um valor válido', 'error');
        return;
    }
    
    const goal = goals.find(g => g.id === goalId);
    if (goal) {
        goal.current += amount;
        localStorage.setItem('goals', JSON.stringify(goals));
        renderGoalsFinal();
        showToast(`${formatCurrency(amount)} adicionado à meta!`, 'success');
    }
}

function deleteGoalFinal(goalId) {
    if (!confirm('Deseja realmente excluir esta meta?')) return;
    
    goals = goals.filter(g => g.id !== goalId);
    localStorage.setItem('goals', JSON.stringify(goals));
    renderGoalsFinal();
    showToast('Meta excluída', 'info');
}

function addBudget(e) {
    e.preventDefault();
    
    const category = document.getElementById('budgetCategory').value;
    
    const exists = budgets.find(b => b.category === category);
    if (exists) {
        showToast('Já existe um orçamento para esta categoria', 'error');
        return;
    }
    
    const budget = {
        id: Date.now(),
        category: category,
        limit: parseFloat(document.getElementById('budgetLimit').value),
        createdAt: new Date().toISOString()
    };
    
    budgets.push(budget);
    localStorage.setItem('budgets', JSON.stringify(budgets));
    
    document.getElementById('budgetForm').reset();
    renderBudgetsFinal();
    showToast('Orçamento definido com sucesso!', 'success');
}

function renderBudgetsFinal() {
    const container = document.getElementById('budgetsList');
    if (!container) return;
    
    if (budgets.length === 0) {
        container.innerHTML = '<p class="no-data">Nenhum orçamento definido ainda.</p>';
        return;
    }
    
    container.innerHTML = budgets.map(budget => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        const spent = debits
            .filter(d => {
                const debitDate = new Date(d.date);
                return debitDate.getMonth() === currentMonth && 
                       debitDate.getFullYear() === currentYear && 
                       d.category === budget.category;
            })
            .reduce((sum, d) => sum + parseFloat(d.amount), 0);
        
        const percentage = (spent / budget.limit) * 100;
        const remaining = budget.limit - spent;
        
        let statusColor = 'var(--success)';
        let statusText = 'Dentro do limite';
        
        if (percentage >= 100) {
            statusColor = 'var(--danger)';
            statusText = 'Orçamento estourado!';
        } else if (percentage >= 80) {
            statusColor = '#FFA500';
            statusText = 'Atenção: próximo do limite';
        }
        
        return `
            <div class="card" style="margin-bottom: 20px; padding: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                    <div>
                        <h3 style="font-family: 'Cinzel', serif; color: var(--gold-primary); margin-bottom: 5px;">
                            ${budget.category}
                        </h3>
                        <p style="color: ${statusColor}; font-size: 0.85em; font-weight: bold;">
                            ${statusText}
                        </p>
                    </div>
                    <button onclick="deleteBudgetFinal(${budget.id})" class="delete-btn-small" title="Excluir orçamento">×</button>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="color: var(--text-secondary); font-size: 0.9em;">
                            Gasto: ${formatCurrency(spent)} de ${formatCurrency(budget.limit)}
                        </span>
                        <span style="color: ${statusColor}; font-weight: bold; font-size: 0.9em;">
                            ${percentage.toFixed(1)}%
                        </span>
                    </div>
                    <div style="background: rgba(255,255,255,0.1); height: 12px; border-radius: 6px; overflow: hidden;">
                        <div style="background: ${statusColor}; height: 100%; width: ${Math.min(percentage, 100)}%; 
                                    transition: width 0.5s;"></div>
                    </div>
                </div>
                
                <p style="color: var(--text-secondary); font-size: 0.9em;">
                    ${remaining >= 0 
                        ? `Disponível: ${formatCurrency(remaining)}` 
                        : `Excedido em: ${formatCurrency(Math.abs(remaining))}`
                    }
                </p>
            </div>
        `;
    }).join('');
}

function deleteBudgetFinal(budgetId) {
    if (!confirm('Deseja realmente excluir este orçamento?')) return;
    
    budgets = budgets.filter(b => b.id !== budgetId);
    localStorage.setItem('budgets', JSON.stringify(budgets));
    renderBudgetsFinal();
    showToast('Orçamento excluído', 'info');
}

// INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        renderGoalsFinal();
        renderBudgetsFinal();
        
        const configEmail = document.getElementById('configEmail');
        if (configEmail && currentUser) {
            configEmail.textContent = currentUser;
        }
    }, 500);
});

console.log('✅ Metas e Orçamentos carregados (versão limpa)!');



function scrollToTop() { /* desativado */ }
function navigateToTab(tabName) {
    // Atualizar botões da sidebar
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.querySelector(`.tab-button[data-tab="${tabName}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    // Esconder todos os conteúdos
    document.querySelectorAll('.tab-content').forEach(c => { c.classList.remove('active'); c.style.display = 'none'; });

    // Mostrar conteúdo alvo
    const tabContent = document.getElementById(tabName);
    if (tabContent) { tabContent.classList.add('active'); tabContent.style.display = 'block'; }

    // Renderizar dados na tab aberta
    if (tabName === 'recurring') { syncRecurringMain(); renderRecurring(); }
    if (tabName === 'budgets') { syncBudgetsMain(); }
    if (tabName === 'goals') { syncGoalsMain(); renderGoalsList(); }

    // Em mobile: fechar sidebar após clicar
    if (window.innerWidth <= 768) {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    }
    

    
    // Atualizar histórico do navegador (opcional)
    if (history.pushState) {
        history.pushState(null, null, `#${tabName}`);
    }
    
    // Renderizar conteúdo se necessário
    if (tabName === 'dashboard') {
        updateDashboard();
    } else if (tabName === 'credits' || tabName === 'debits' || tabName === 'future') {
        renderLists();
    } else if (tabName === 'calendar') {
        openCalendarModal();
    } else if (tabName === 'goals') {
        renderGoals();
    } else if (tabName === 'budgets') {
        renderBudgets();
    } else if (tabName === 'recurring') {
        renderRecurring();
    }
}

// ================================================================
// SYNC: TABS SIDEBAR (Recorrentes / Orçamentos / Metas)
// ================================================================

// Função principal que renderiza na aba Recorrentes (recurringListMain)
function renderRecurring() {
    const container = document.getElementById('recurringListMain');
    if (!container) { renderRecurringList(); return; }

    const freqLabel = { daily:'Diária', weekly:'Semanal', monthly:'Mensal', yearly:'Anual' };

    // SVG icons
    const svgCategory = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`;
    const svgRepeat  = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>`;
    const svgCalendar= `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;
    const svgArrowUp = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>`;
    const svgArrowDn = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>`;

    if (!recurringTransactions || recurringTransactions.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:60px 20px;color:var(--text-secondary);">
                <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="var(--gold-primary)" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.3;margin-bottom:18px;display:block;margin-left:auto;margin-right:auto;">
                    <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
                    <polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
                </svg>
                <h3 style="font-family:'Cinzel',serif;color:var(--gold-primary);margin-bottom:8px;font-size:1.05em;">Nenhuma transação recorrente</h3>
                <p style="font-size:0.88em;max-width:360px;margin:0 auto;line-height:1.6;">Configure lançamentos fixos como salário, aluguel ou assinaturas.</p>
            </div>`;
        return;
    }

    container.innerHTML = recurringTransactions.map((r, i) => {
        const isCredit = r.type === 'credit';
        const color    = isCredit ? 'var(--success)' : 'var(--danger)';
        const colorHex = isCredit ? '#2ECC71' : '#E74C3C';
        const bgColor  = isCredit ? 'rgba(46,204,113,0.07)' : 'rgba(231,76,60,0.07)';
        const freq     = freqLabel[r.frequency] || r.frequency;
        const arrow    = isCredit ? svgArrowUp : svgArrowDn;

        return `
        <div style="
            display:flex;
            align-items:center;
            gap:14px;
            padding:14px 18px;
            margin-bottom:10px;
            background:rgba(255,255,255,0.03);
            border:1px solid rgba(212,175,55,0.12);
            border-left:3px solid ${colorHex};
            border-radius:10px;
            transition:background 0.2s, transform 0.2s;
            cursor:default;
        "
        onmouseover="this.style.background='rgba(212,175,55,0.05)';this.style.transform='translateX(3px)';"
        onmouseout="this.style.background='rgba(255,255,255,0.03)';this.style.transform='translateX(0)';">

            <!-- Ícone tipo -->
            <div style="
                width:38px;height:38px;border-radius:10px;
                background:${bgColor};
                border:1px solid ${colorHex}33;
                display:flex;align-items:center;justify-content:center;
                flex-shrink:0;
                color:${colorHex};
            ">${arrow}</div>

            <!-- Info -->
            <div style="flex:1;min-width:0;">
                <div style="
                    font-family:'Cinzel',serif;
                    font-size:1.1em;
                    color:var(--gold-light);
                    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
                    margin-bottom:6px;
                ">${r.description}</div>
                <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
                    <span style="display:inline-flex;align-items:center;gap:4px;font-size:0.92em;color:var(--text-secondary);">
                        <span style="color:var(--gold-primary);opacity:0.7;">${svgCategory}</span>${r.category}
                    </span>
                    <span style="display:inline-flex;align-items:center;gap:4px;font-size:0.92em;color:var(--text-secondary);">
                        <span style="color:var(--gold-primary);opacity:0.7;">${svgRepeat}</span>${freq}
                    </span>
                    <span style="display:inline-flex;align-items:center;gap:4px;font-size:0.92em;color:var(--text-secondary);">
                        <span style="color:var(--gold-primary);opacity:0.7;">${svgCalendar}</span>Dia ${r.day}
                    </span>
                </div>
            </div>

            <!-- Valor -->
            <div style="
                font-family:'Cinzel',serif;
                font-size:1.2em;
                font-weight:700;
                color:${color};
                white-space:nowrap;
                flex-shrink:0;
                margin-right:4px;
            ">${isCredit ? '+' : '-'}${formatCurrency(r.amount)}</div>

            <!-- Botão excluir -->
            <button onclick="deleteRecurring(${i})" title="Remover recorrente" style="
                width:34px;height:34px;
                border-radius:8px;
                background:rgba(231,76,60,0.08);
                border:1px solid rgba(231,76,60,0.25);
                color:#E74C3C;
                cursor:pointer;
                display:flex;align-items:center;justify-content:center;
                flex-shrink:0;
                font-size:20px;
                line-height:1;
                transition:all 0.2s;
            "
            onmouseover="this.style.background='rgba(231,76,60,0.22)';this.style.borderColor='rgba(231,76,60,0.7)';this.style.transform='scale(1.1)';"
            onmouseout="this.style.background='rgba(231,76,60,0.08)';this.style.borderColor='rgba(231,76,60,0.25)';this.style.transform='scale(1)';"
            >&#x00D7;</button>
        </div>`;
    }).join('');
}

function syncRecurringMain() {
    renderRecurring();
    renderRecurringList();
}

function syncBudgetsMain() {
    const catDst = document.getElementById('budgetCategoryMain');
    if (catDst) catDst.innerHTML = customCategories.debit.map(c => `<option value="${c}">${c}</option>`).join('');
    renderBudgets();
}

function addBudgetFromMain() {
    const catEl = document.getElementById('budgetCategoryMain');
    const amtEl = document.getElementById('budgetAmountMain');
    if (!catEl || !amtEl) return;
    const cat = catEl.value?.trim();
    const amt = parseFloat(amtEl.value);
    if (!cat || isNaN(amt) || amt <= 0) { showToast('Preencha categoria e valor válido', 'error'); return; }
    budgets[cat] = amt;
    saveToFirestore();
    amtEl.value = '';
    renderBudgets();
    showToast(`Orçamento de ${cat}: ${formatCurrency(amt)}`, 'success');
}

function syncGoalsMain() {
    renderGoalsList();
}

function addToGoalDirect(i) {
    // Pega do input ativo (pode estar em goalsListMain ou goalsList)
    const input = document.getElementById(`goalAdd_${i}`);
    if (!input || !input.value) { showToast('Digite um valor para adicionar', 'error'); return; }
    const amount = parseFloat(input.value);
    if (isNaN(amount) || amount <= 0) { showToast('Valor inválido', 'error'); return; }
    if (!goals[i]) return;
    goals[i].current = (parseFloat(goals[i].current) || 0) + amount;
    saveToFirestore();
    renderGoalsList();
    updateSummary();
    showToast(`✅ +${formatCurrency(amount)} adicionado à meta "${goals[i].name}"!`, 'success');
}



// === CORREÇÕES MOBILE ===
// FIX 1: FILTRO DE CONTAS - Garantir que funciona
document.addEventListener('DOMContentLoaded', function() {
    // Créditos
    const creditAccountFilter = document.getElementById('creditAccountFilter');
    if (creditAccountFilter) {
        creditAccountFilter.addEventListener('change', function() {
            console.log('Filtro crédito mudou para:', this.value);
            renderLists(); // Força atualização
        });
    }
    
    // Débitos
    const debitAccountFilter = document.getElementById('debitAccountFilter');
    if (debitAccountFilter) {
        debitAccountFilter.addEventListener('change', function() {
            console.log('Filtro débito mudou para:', this.value);
            renderLists(); // Força atualização
        });
    }
    
    // Futuras
    const futureAccountFilter = document.getElementById('futureAccountFilter');
    if (futureAccountFilter) {
        futureAccountFilter.addEventListener('change', function() {
            console.log('Filtro futuras mudou para:', this.value);
            renderLists(); // Força atualização
        });
    }
});

// FIX 2: VIEW ATTACHMENT - Corrigir visualização
function viewAttachment(type, index) {
    const item = type === 'credits' ? credits[index] : debits[index];
    if (!item || !item.attachment) {
        showToast('Nenhum comprovante anexado', 'info');
        return;
    }
    
    // Remover modal anterior se existir
    const existing = document.getElementById('attachmentModal');
    if (existing) existing.remove();
    
    const isImage = item.attachment.type && item.attachment.type.startsWith('image/');
    
    const modal = document.createElement('div');
    modal.id = 'attachmentModal';
    modal.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.95);
        backdrop-filter: blur(8px);
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        animation: fadeIn 0.3s ease;
    `;
    
    modal.innerHTML = `
        <div style="
            background: var(--bg-card);
            border: 1px solid var(--glass-border);
            border-radius: 16px;
            padding: 24px;
            max-width: 90vw;
            max-height: 85vh;
            overflow: auto;
            position: relative;
            box-shadow: 0 30px 80px rgba(0,0,0,0.8);
        ">
            <div style="
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 20px;
                padding-bottom: 16px;
                border-bottom: 1px solid var(--glass-border);
            ">
                <h2 style="
                    font-family: 'Cinzel', serif;
                    color: var(--gold-primary);
                    font-size: 1.1em;
                    letter-spacing: 1px;
                    margin: 0;
                ">📎 Comprovante</h2>
                <button onclick="document.getElementById('attachmentModal').remove()" style="
                    background: transparent;
                    border: 1px solid var(--glass-border);
                    color: var(--text-secondary);
                    width: 34px;
                    height: 34px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 1.2em;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 0;
                ">×</button>
            </div>
            ${isImage
                ? `<img src="${item.attachment.data}" style="
                    width: 100%;
                    max-height: 65vh;
                    object-fit: contain;
                    border-radius: 8px;
                    display: block;
                " alt="Comprovante">`
                : `<div style="text-align: center; padding: 40px 20px;">
                    <p style="color: var(--text-primary); margin-bottom: 20px; font-size: 1.1em;">
                        📄 ${item.attachment.name || 'Arquivo anexado'}
                    </p>
                    <a href="${item.attachment.data}" download="${item.attachment.name}" style="
                        background: linear-gradient(135deg, var(--gold-primary), var(--gold-dark));
                        color: #0A0E17;
                        padding: 12px 28px;
                        border-radius: 8px;
                        text-decoration: none;
                        font-family: 'Cinzel', serif;
                        font-size: 0.85em;
                        letter-spacing: 1px;
                        font-weight: bold;
                        display: inline-block;
                    ">⬇️ Download</a>
                </div>`
            }
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Fechar ao clicar fora
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
    
    console.log('✅ Comprovante exibido:', item.attachment.name || 'Imagem');
}

// FIX 3: RENDERIZAR LISTAS - Aplicar filtro corretamente
// Esta função substitui a original se houver problemas
function applyAccountFilter(list, filterValue) {
    if (!filterValue || filterValue === 'all') {
        return list;
    }
    return list.filter(item => item.account === filterValue);
}

// FIX 4: GARANTIR QUE FILTROS APARECEM
function ensureFiltersVisible() {
    const filters = document.querySelectorAll('.filter-section, .filter-row, .filter-select');
    filters.forEach(filter => {
        if (filter) {
            filter.style.display = 'block';
            filter.style.visibility = 'visible';
            filter.style.opacity = '1';
        }
    });
}

// Executar ao carregar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureFiltersVisible);
} else {
    ensureFiltersVisible();
}

// FIX 5: BOTÃO EXCLUIR - Confirmar antes de excluir (mobile-friendly)
function confirmDelete(message) {
    if (window.innerWidth <= 768) {
        // Em mobile, usar confirm nativo que é mais touch-friendly
        return confirm(message || 'Deseja realmente excluir este item?');
    }
    return confirm(message || 'Deseja realmente excluir este item?');
}

// FIX 6: SCROLL SUAVE ao abrir modais em mobile
function openModalMobile(modalId) {
    const modal = document.getElementById(modalId);
    if (modal && window.innerWidth <= 768) {
        modal.style.display = 'block';
        // Scroll to top
        setTimeout(() => {
            if (modal.querySelector('.modal-content')) {
                modal.querySelector('.modal-content').scrollTop = 0;
            }
        }, 100);
    }
}

// FIX 7: FORMATAÇÃO DE VALORES - Garantir que R$ apareça
function ensureCurrencyVisible() {
    const values = document.querySelectorAll('.summary-value, .transaction-item strong, .value');
    values.forEach(el => {
        if (el.textContent && el.textContent.includes('R$')) {
            el.style.whiteSpace = 'nowrap';
            el.style.overflow = 'visible';
        }
    });
}

// Executar periodicamente
setInterval(ensureCurrencyVisible, 2000);

console.log('✅ Correções mobile carregadas');
// ================================================================
// CORREÇÃO DEFINITIVA: TABS DE CONFIGURAÇÕES + RECORRENTES
// Cole este código no FINAL do script.js (SUBSTITUINDO o anterior)
// ================================================================

// ===== FIX 1: TABS DE CONFIGURAÇÕES (CORRIGIDO) =====
document.addEventListener('DOMContentLoaded', function() {
    
    console.log('🔧 Inicializando tabs de configurações...');
    
    // Configurar tabs de configurações
    const settingsTabs = document.querySelectorAll('.settings-tab');
    
    if (settingsTabs.length === 0) {
        console.log('⚠️ Nenhuma tab de configurações encontrada');
        return;
    }
    
    console.log(`📋 ${settingsTabs.length} tabs encontradas`);
    
    settingsTabs.forEach(tab => {
        tab.addEventListener('click', function(e) {
            e.preventDefault();
            
            console.log('🖱️ Tab clicada:', this.getAttribute('data-tab'));
            
            // Remover active de todas as tabs
            settingsTabs.forEach(t => t.classList.remove('active'));
            
            // Adicionar active na clicada
            this.classList.add('active');
            
            // Pegar ID da tab
            const tabId = this.getAttribute('data-tab');
            
            // Esconder todos os painéis (CLASSE CORRETA: settings-tab-content)
            const allPanels = document.querySelectorAll('.settings-tab-content');
            console.log(`📄 ${allPanels.length} painéis encontrados`);
            
            allPanels.forEach(content => {
                content.classList.remove('active');
                content.style.display = 'none';
            });
            
            // Mostrar painel correto
            const targetPanel = document.getElementById(tabId);
            if (targetPanel) {
                targetPanel.classList.add('active');
                targetPanel.style.display = 'block';
                console.log('✅ Painel ativado:', tabId);
            } else {
                console.error('❌ Painel não encontrado:', tabId);
            }
        });
    });
    
    // Garantir que primeira tab esteja ativa
    setTimeout(() => {
        const firstTab = document.querySelector('.settings-tab');
        const firstPanel = document.getElementById('notifications-settings');
        
        if (firstTab && firstPanel) {
            firstTab.classList.add('active');
            firstPanel.classList.add('active');
            firstPanel.style.display = 'block';
            console.log('✅ Primeira tab ativada');
        }
    }, 100);
});

// ===== FIX 2: BOTÃO TESTAR ALERTA =====
function testAlert() {
    console.log('🔔 Testando alerta...');
    
    // Verificar permissão de notificações
    if ('Notification' in window) {
        if (Notification.permission === 'granted') {
            // Criar notificação
            new Notification('🎯 Teste de Alerta - Stiga Finance', {
                body: 'Esta é uma notificação de teste. Sistema funcionando corretamente!',
                icon: 'logo-stiga.png',
                badge: 'logo-stiga.png'
            });
            showToast('🔔 Notificação enviada!', 'success');
        } else if (Notification.permission !== 'denied') {
            // Pedir permissão
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    new Notification('🎯 Teste de Alerta - Stiga Finance', {
                        body: 'Permissão concedida! Agora você receberá alertas de vencimento.',
                        icon: 'logo-stiga.png'
                    });
                    showToast('✅ Permissão concedida!', 'success');
                } else {
                    showToast('❌ Permissão negada pelo navegador', 'error');
                }
            });
        } else {
            showToast('❌ Notificações bloqueadas. Ative nas configurações do navegador.', 'error');
        }
    } else {
        // Navegador não suporta
        showToast('⚠️ Seu navegador não suporta notificações', 'info');
    }
}

// ===== FIX 3: RENDERIZAR RECORRENTES (MELHORADO) =====
function renderRecurringTransactions() {
    console.log('📋 Renderizando recorrentes...');
    
    const container = document.getElementById('recurringList');
    if (!container) {
        console.error('❌ Container recurringList não encontrado');
        return;
    }
    
    // Pegar recorrentes da variável global (Firestore)
    let recurring = [];
    try {
        recurring = Array.isArray(recurringTransactions) ? recurringTransactions : [];
    } catch (e) {
        console.error('❌ Erro ao ler recorrentes:', e);
        recurring = [];
    }
    
    console.log(`📊 Recorrentes encontradas: ${recurring.length}`);
    
    if (recurring.length === 0) {
        container.innerHTML = `
            <div style="
                text-align: center;
                padding: 60px 20px;
                color: var(--text-secondary);
            ">
                <div style="font-size: 4em; margin-bottom: 20px; opacity: 0.3;">🔄</div>
                <h3 style="
                    font-family: 'Cinzel', serif;
                    color: var(--gold-primary);
                    margin-bottom: 10px;
                    font-size: 1.2em;
                ">Nenhuma transação recorrente</h3>
                <p style="
                    color: var(--text-secondary);
                    margin-bottom: 25px;
                    font-size: 0.95em;
                    max-width: 400px;
                    margin-left: auto;
                    margin-right: auto;
                    line-height: 1.5;
                ">
                    Configure transações que se repetem automaticamente, 
                    como salário, aluguel, ou assinaturas mensais.
                </p>
                <button onclick="openRecurringModal()" class="btn-primary" style="
                    padding: 12px 30px;
                    font-size: 0.9em;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                ">
                    ➕ Adicionar Primeira Recorrente
                </button>
            </div>
        `;
        return;
    }
    
    // Renderizar cada recorrente
    container.innerHTML = recurring.map((item, index) => {
        const isCredit = item.type === 'credit';
        const icon = isCredit ? '💰' : '💳';
        const color = isCredit ? 'var(--success)' : 'var(--danger)';
        
        // Traduzir frequência
        const frequencyMap = {
            'daily': 'Diária',
            'weekly': 'Semanal',
            'monthly': 'Mensal',
            'yearly': 'Anual'
        };
        const frequency = frequencyMap[item.frequency] || item.frequency;
        
        return `
            <div class="card" style="
                margin-bottom: 16px;
                padding: 18px;
                border-left: 3px solid ${color};
                transition: all 0.3s;
            " onmouseover="this.style.transform='translateX(5px)'; this.style.boxShadow='0 4px 15px rgba(212,175,55,0.2)';" 
               onmouseout="this.style.transform='translateX(0)'; this.style.boxShadow='';">
                
                <div style="display: flex; justify-content: space-between; align-items: start; gap: 15px;">
                    
                    <!-- LADO ESQUERDO -->
                    <div style="flex: 1; min-width: 0;">
                        
                        <!-- TÍTULO -->
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                            <span style="font-size: 1.3em;">${icon}</span>
                            <h4 style="
                                font-family: 'Cinzel', serif;
                                color: var(--gold-primary);
                                margin: 0;
                                font-size: 1.05em;
                                letter-spacing: 0.5px;
                            ">${item.description}</h4>
                        </div>
                        
                        <!-- INFO -->
                        <div style="
                            display: flex;
                            gap: 15px;
                            flex-wrap: wrap;
                            color: var(--text-secondary);
                            font-size: 0.85em;
                            margin-bottom: 10px;
                        ">
                            <span title="Categoria">📁 ${item.category}</span>
                            <span title="Frequência">🔄 ${frequency}</span>
                            <span title="Dia do mês">📅 Dia ${item.day}</span>
                        </div>
                        
                        <!-- PRÓXIMA OCORRÊNCIA -->
                        <div style="
                            font-size: 0.8em;
                            color: var(--text-secondary);
                            padding-top: 8px;
                            border-top: 1px solid rgba(212, 175, 55, 0.15);
                        ">
                            ⏰ Próxima: ${getNextOccurrence(item.frequency, item.day)}
                        </div>
                    </div>
                    
                    <!-- LADO DIREITO -->
                    <div style="
                        display: flex;
                        flex-direction: column;
                        align-items: flex-end;
                        gap: 12px;
                    ">
                        <!-- VALOR -->
                        <span style="
                            font-family: 'Cinzel', serif;
                            font-size: 1.15em;
                            font-weight: bold;
                            color: ${color};
                            white-space: nowrap;
                        ">
                            ${isCredit ? '+' : '-'} ${formatCurrency(item.amount)}
                        </span>
                        
                        <!-- BOTÃO EXCLUIR -->
                        <button onclick="deleteRecurring(${index})" 
                                title="Excluir recorrente"
                                style="
                                    width: 32px;
                                    height: 32px;
                                    border-radius: 6px;
                                    background: rgba(231, 76, 60, 0.1);
                                    border: 1px solid rgba(231, 76, 60, 0.3);
                                    color: var(--danger);
                                    cursor: pointer;
                                    font-size: 18px;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    transition: all 0.3s;
                                "
                                onmouseover="this.style.background='rgba(231,76,60,0.2)'; this.style.transform='scale(1.1)';"
                                onmouseout="this.style.background='rgba(231,76,60,0.1)'; this.style.transform='scale(1)';">×</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    console.log('✅ Recorrentes renderizadas com sucesso!');
}

// Função para calcular próxima ocorrência
function getNextOccurrence(frequency, day) {
    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    if (frequency === 'monthly') {
        let targetDate;
        
        if (day > currentDay) {
            // Este mês
            targetDate = new Date(currentYear, currentMonth, day);
        } else {
            // Próximo mês
            targetDate = new Date(currentYear, currentMonth + 1, day);
        }
        
        const dayStr = String(targetDate.getDate()).padStart(2, '0');
        const monthStr = String(targetDate.getMonth() + 1).padStart(2, '0');
        const yearStr = targetDate.getFullYear();
        
        return `${dayStr}/${monthStr}/${yearStr}`;
    }
    
    if (frequency === 'weekly') {
        return 'Próxima semana';
    }
    
    if (frequency === 'daily') {
        return 'Amanhã';
    }
    
    if (frequency === 'yearly') {
        return 'Próximo ano';
    }
    
    return 'Em breve';
}

// Função para excluir recorrente
function deleteRecurring(index) {
    if (!confirm('Remover esta transação recorrente?')) return;
    recurringTransactions.splice(index, 1);
    saveToFirestore();
    renderRecurring();
    renderRecurringList();
    showToast('Recorrente removida', 'info');
}

// ===== FIX 4: CHAMAR RENDERIZAÇÃO QUANDO NECESSÁRIO =====

// Sobrescrever showTab para detectar quando abrir recorrentes
const originalShowTab = window.showTab;
if (typeof originalShowTab === 'function') {
    window.showTab = function(tabName) {
        originalShowTab(tabName);
        
        if (tabName === 'recurring') {
            setTimeout(() => {
                renderRecurringTransactions();
            }, 100);
        }
    };
}

// Renderizar se já estiver na tab ao carregar
setTimeout(() => {
    const recurringTab = document.getElementById('recurring');
    if (recurringTab && recurringTab.classList.contains('active')) {
        renderRecurringTransactions();
    }
}, 800);

console.log('✅ Sistema de tabs e recorrentes carregado!');
// ================================================================
// MEGA CORREÇÃO - TODOS OS PROBLEMAS RESOLVIDOS
// Cole este código no FINAL do script.js
// ================================================================

// ===== FIX 1: TAB DÉBITOS NAS CATEGORIAS =====
document.addEventListener('DOMContentLoaded', function() {
    // Usar as classes corretas do HTML: .category-type-tabs .cat-tab com data-type
    function setupCategoryTabs() {
        const categoryTabs = document.querySelectorAll('.category-type-tabs .cat-tab');
        if (!categoryTabs.length) return;

        categoryTabs.forEach(tab => {
            // Remover listener antigo clonando
            const clone = tab.cloneNode(true);
            tab.parentNode.replaceChild(clone, tab);
        });

        document.querySelectorAll('.category-type-tabs .cat-tab').forEach(tab => {
            tab.addEventListener('click', function() {
                // Atualizar active visual
                document.querySelectorAll('.category-type-tabs .cat-tab').forEach(t => t.classList.remove('active'));
                this.classList.add('active');

                // Atualizar tipo global e re-renderizar
                const type = this.dataset.type || (this.textContent.toLowerCase().includes('crédit') ? 'credit' : 'debit');
                currentCategoryType = type;
                renderCustomCategories();
            });
        });
    }

    setupCategoryTabs();

    // Re-setup quando modal de settings abrir (pode ser criado depois)
    document.addEventListener('click', function(e) {
        if (e.target && (e.target.id === 'settingsBtn' || e.target.closest('.settings-btn'))) {
            setTimeout(setupCategoryTabs, 100);
        }
    });
});

// ===== FIX 2: RECORRENTES - FORÇAR RENDERIZAÇÃO =====

// ===== FIX 3: AUMENTAR CARDS E INPUTS =====

// Aplicar estilos maiores para cards e inputs
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        // Cards de orçamento
        const budgetCards = document.querySelectorAll('#budgetsList .card, [id*="budget"] .card');
        budgetCards.forEach(card => {
            card.style.padding = '24px';
            card.style.minHeight = '140px';
        });
        
        // Inputs de adicionar valor nas metas
        const goalInputs = document.querySelectorAll('[id^="goalAdd"]');
        goalInputs.forEach(input => {
            input.style.padding = '12px 16px';
            input.style.fontSize = '1em';
            input.style.minHeight = '48px';
        });
        
        console.log('✅ Cards e inputs aumentados!');
    }, 1000);
});

// ===== FIX 4: SIDEBAR - SUBIR SEÇÕES =====

// Aplicar CSS para subir as seções
const sidebarStyle = document.createElement('style');
sidebarStyle.innerHTML = `
    /* Sidebar logo - tamanho legível */
    .logo-container {
        margin-bottom: 12px !important;
        padding: 16px 12px 12px !important;
        text-align: center !important;
    }
    
    .logo-img {
        width: 64px !important;
        height: 64px !important;
        margin-bottom: 10px !important;
    }
    
    .logo-title {
        font-size: 1.1em !important;
        margin-bottom: 4px !important;
        letter-spacing: 2px !important;
    }
    
    .logo-subtitle {
        font-size: 0.72em !important;
        margin: 0 !important;
        letter-spacing: 1px !important;
    }
    
    /* Sidebar brand (nova sidebar) */
    .sidebar-logo {
        width: 64px !important;
        height: 64px !important;
        margin-bottom: 10px !important;
    }
    
    .sidebar-brand {
        font-size: 1.15em !important;
        letter-spacing: 2px !important;
    }
    
    .sidebar-subtitle {
        font-size: 0.72em !important;
        letter-spacing: 1px !important;
    }
    
    /* Seções coladas no topo */
    .sidebar-section-label {
        margin-top: 2px !important;
        margin-bottom: 2px !important;
        padding-top: 0px !important;
        font-size: 0.7em !important;
    }
    
    .sidebar-divider {
        margin: 4px 0 !important;
    }
    
    /* Botões compactos */
    .tab-button {
        padding: 8px 16px !important;
        margin-bottom: 1px !important;
        font-size: 0.9em !important;
    }
    
    /* Menu colado ao topo */
    .sidebar-menu {
        margin-top: 0 !important;
        padding-top: 0 !important;
    }
    
    /* Cards maiores */
    #budgetsList .card {
        padding: 24px !important;
        min-height: 150px !important;
        margin-bottom: 20px !important;
    }
    
    #budgetsList h3 {
        font-size: 1.15em !important;
        margin-bottom: 10px !important;
    }
    
    #budgetsList p {
        font-size: 0.95em !important;
        line-height: 1.6 !important;
    }
    
    /* Inputs de metas maiores */
    [id^="goalAdd"] {
        padding: 12px 16px !important;
        font-size: 1em !important;
        min-height: 48px !important;
        border: 2px solid rgba(212, 175, 55, 0.3) !important;
    }
    
    [id^="goalAdd"]:focus {
        border-color: var(--gold-primary) !important;
        box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.1) !important;
    }
    
    /* Botão adicionar nas metas maior */
    #goalsList .btn-secondary {
        padding: 12px 20px !important;
        font-size: 0.95em !important;
        min-height: 48px !important;
    }
    
    /* Cards de metas maiores */
    #goalsList .card {
        padding: 22px !important;
        min-height: 160px !important;
    }
    
    #goalsList h3 {
        font-size: 1.2em !important;
        margin-bottom: 10px !important;
    }
    
    /* Seção de metas - campo adicionar */
    #goalsList input[type="number"] {
        min-width: 150px !important;
        flex: 1 !important;
    }
    
    /* Desktop: garantir que sidebar comece do topo */
    @media (min-width: 769px) {
        .sidebar {
            padding-top: 2px !important;
        }
        
        .sidebar-menu {
            margin-top: 0 !important;
        }
    }
    
    /* Mobile */
    @media (max-width: 768px) {
        .logo-img {
            width: 30px !important;
            height: 30px !important;
        }
        
        .tab-button {
            padding: 12px 14px !important;
        }
        
        #budgetsList .card,
        #goalsList .card {
            padding: 18px !important;
        }
    }
`;
document.head.appendChild(sidebarStyle);

// ===== FIX 5: DEBUG LOGS =====

// Log quando criar recorrente
const originalCreateRecurring = window.createRecurring;
if (typeof originalCreateRecurring === 'function') {
    window.createRecurring = function(...args) {
        console.log('➕ Criando recorrente...');
        const result = originalCreateRecurring.apply(this, args);
        
        // Forçar renderização após criar
        setTimeout(() => {
            console.log('🔄 Renderizando após criar...');
            renderRecurringTransactions();
        }, 300);
        
        return result;
    };
}

// ===== FIX 6: GARANTIR QUE TUDO RENDERIZE AO ABRIR TAB =====

// Observer para detectar quando tab fica visível
const tabObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            const target = mutation.target;
            
            // Se tab recurring ficou ativa
            if (target.id === 'recurring' && target.classList.contains('active')) {
                console.log('👁️ Tab recurring ficou visível!');
                setTimeout(() => {
                    renderRecurringTransactions();
                }, 100);
            }
            
            // Se tab budgets ficou ativa
            if (target.id === 'budgets' && target.classList.contains('active')) {
                console.log('👁️ Tab budgets ficou visível!');
                setTimeout(() => {
                    if (typeof renderBudgetsFinal === 'function') {
                        renderBudgetsFinal();
                    }
                }, 100);
            }
            
            // Se tab goals ficou ativa
            if (target.id === 'goals' && target.classList.contains('active')) {
                console.log('👁️ Tab goals ficou visível!');
                setTimeout(() => {
                    if (typeof renderGoalsFinal === 'function') {
                        renderGoalsFinal();
                    }
                }, 100);
            }
        }
    });
});

// Observar todas as tabs
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        const tabs = document.querySelectorAll('.tab-content');
        tabs.forEach(tab => {
            tabObserver.observe(tab, { attributes: true });
        });
        console.log('👁️ Observer ativado para', tabs.length, 'tabs');
    }, 500);
});

console.log('✅ MEGA CORREÇÃO APLICADA!');
console.log('✅ Fix 1: Débitos nas categorias');
console.log('✅ Fix 2: Recorrentes renderizam');
console.log('✅ Fix 3: Cards maiores');
console.log('✅ Fix 4: Sidebar mais alta');
console.log('✅ Fix 5: Debug logs');
console.log('✅ Fix 6: Observer de tabs');

// ================================================================


// ================================================================
// SCROLL AUTOMÁTICO - SISTEMA ÚNICO
// ================================================================
(function() {
    function irParaConteudo() {
        const mainWrapper = document.querySelector('.main-wrapper');
        if (!mainWrapper) return;
        const cw = document.getElementById('contentWrapper') || document.querySelector('.content-wrapper');
        if (cw) mainWrapper.scrollTo({ top: cw.offsetTop, behavior: 'smooth' });
    }

    function ativarAba(tabId) {
        document.querySelectorAll('.tab-content').forEach(c => { c.classList.remove('active'); c.style.display = 'none'; });
        const tabEl = document.getElementById(tabId);
        if (tabEl) { tabEl.classList.add('active'); tabEl.style.display = 'block'; }
        document.querySelectorAll('.tab-button, .sidebar-item').forEach(b => {
            b.classList.toggle('active', (b.getAttribute('data-tab') || b.dataset.tab) === tabId);
        });
        if (tabId === 'recurring') { if(typeof syncRecurringMain==='function') syncRecurringMain(); if(typeof renderRecurring==='function') renderRecurring(); if(typeof renderRecurringList==='function') renderRecurringList(); }
        if (tabId === 'budgets')   { if(typeof syncBudgetsMain==='function') syncBudgetsMain(); if(typeof renderBudgets==='function') renderBudgets(); }
        if (tabId === 'goals')     { if(typeof syncGoalsMain==='function') syncGoalsMain(); if(typeof renderGoalsList==='function') renderGoalsList(); }
        if (window.innerWidth <= 768) {
            const sb = document.getElementById('sidebar'); const ov = document.getElementById('sidebarOverlay');
            if (sb) sb.classList.remove('active'); if (ov) ov.classList.remove('active');
        }
        if (history.pushState) history.pushState(null, null, '#' + tabId);
        setTimeout(irParaConteudo, 150);
    }

    function attachListeners() {
        document.querySelectorAll('.tab-button, .sidebar-item').forEach(btn => {
            const clone = btn.cloneNode(true);
            btn.parentNode.replaceChild(clone, btn);
            clone.addEventListener('click', function(e) {
                e.stopPropagation();
                const tabId = this.getAttribute('data-tab') || this.dataset.tab;
                if (!tabId || tabId === 'calendar' || tabId === 'settings') return;
                ativarAba(tabId);
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(attachListeners, 800));
    } else {
        setTimeout(attachListeners, 800);
    }
})();