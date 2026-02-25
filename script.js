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
    } catch (e) { showToast('Erro ao adicionar orçamento', 'error'); }
}
function renderBudgets() {
    const cont = document.getElementById('budgetList');
    const prog = document.getElementById('budgetProgress');
    try {
        const entries = Object.entries(budgets);
        if (entries.length === 0) {
            if (cont) cont.innerHTML = '<p class="no-data">Nenhum orçamento definido</p>';
            if (prog) prog.innerHTML = '<p class="no-data">Defina orçamentos nas configurações</p>';
            return;
        }
        const budgetHTML = ([cat, lim]) => {
            const spent = debits.filter(d => d.category === cat && new Date(d.date).getMonth() === new Date().getMonth())
                .reduce((s, d) => s + parseFloat(d.amount || 0), 0);
            const pct = (spent / lim * 100).toFixed(1);
            const rem = lim - spent;
            return `
                <div class="transaction-item">
                    <div style="flex:1;">
                        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
                            <strong>${cat}</strong>
                            <button onclick="deleteBudget('${cat}')" class="delete-btn-small">×</button>
                        </div>
                        <div class="budget-bar">
                            <div class="budget-fill ${pct >= 100 ? 'over-budget' : pct >= 80 ? 'warning-budget' : ''}" style="width:${Math.min(pct,100)}%"></div>
                        </div>
                        <div class="budget-details">
                            <span>${formatCurrency(spent)} / ${formatCurrency(lim)}</span>
                            <span class="${rem < 0 ? 'over-budget-text' : ''}">${rem >= 0 ? 'Restam' : 'Excedeu'}: ${formatCurrency(Math.abs(rem))}</span>
                        </div>
                    </div>
                </div>`;
        };
        if (cont) cont.innerHTML = entries.map(budgetHTML).join('');
        if (prog) prog.innerHTML = entries.slice(0, 5).map(budgetHTML).join('');
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
                <div class="transaction-item"><span>Créditos:</span><span class="${cDiff > 0 ? 'positive' : 'negative'}">${cDiff > 0 ? '+' : ''}${cDiff.toFixed(1)}% ${cDiff > 0 ? '⬆️' : '⬇️'}</span></div>
                <div class="transaction-item"><span>Débitos:</span><span class="${dDiff < 0 ? 'positive' : 'negative'}">${dDiff > 0 ? '+' : ''}${dDiff.toFixed(1)}% ${dDiff > 0 ? '⬆️' : '⬇️'}</span></div>
                <div class="transaction-item"><span>Saldo:</span><span class="${bDiff > 0 ? 'positive' : 'negative'}">${bDiff > 0 ? '+' : ''}${bDiff.toFixed(1)}% ${bDiff > 0 ? '🎉' : '⚠️'}</span></div>
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
    const backup = { version:'2.0', user:currentUser, date:new Date().toISOString(), accounts, settings, customCategories, recurringTransactions, notifications, budgets, goals };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type:'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `stiga_backup_${currentUser}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    showToast('💾 Backup realizado!', 'success');
}
function restoreData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const bkp = JSON.parse(ev.target.result);
                if (!bkp.version || !bkp.accounts) { showToast('❌ Arquivo inválido', 'error'); return; }
                if (confirm('Restaurar backup? Isso substituirá todos os dados atuais!')) {
                    accounts = bkp.accounts;
                    settings = bkp.settings || settings;
                    customCategories = bkp.customCategories || customCategories;
                    recurringTransactions = bkp.recurringTransactions || [];
                    notifications = bkp.notifications || [];
                    budgets = bkp.budgets || {};
                    goals = bkp.goals || [];
                    saveToFirestore().then(() => {
                        showToast('✅ Backup restaurado!', 'success');
                        setTimeout(() => location.reload(), 1500);
                    });
                }
            } catch (err) { showToast('❌ Erro ao ler backup', 'error'); }
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
        ? `<p style="color:#E74C3C;font-weight:bold">⚠️ ${prox.length} conta(s) vencendo em breve!</p>`
        : `<p style="color:#2ECC71">✅ Todos os compromissos estão em dia</p>`;
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
        : `<h4 style="color:var(--gold-primary);font-family:'Cinzel',serif;font-size:0.8em;letter-spacing:1px;text-transform:uppercase;margin:12px 0 10px">Gastos por Categoria</h4>` +
          sorted.map(([cat, val]) => `
            <div style="margin-bottom:10px">
                <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                    <span style="font-size:0.88em;color:var(--text-primary)">${cat}</span>
                    <strong style="color:var(--gold-light);font-size:0.88em">${formatCurrency(val)}</strong>
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
            : `<h4 style="color:var(--gold-primary);font-family:'Cinzel',serif;font-size:0.8em;letter-spacing:1px;text-transform:uppercase;margin:12px 0 10px">Orçamentos do Mês</h4>` +
              entries.map(([cat, lim]) => {
                const spent = debits.filter(d => d.category === cat && new Date(d.date).getMonth() === thisMonth).reduce((s, d) => s + parseFloat(d.amount || 0), 0);
                const pct = Math.min(spent/lim*100, 100).toFixed(0);
                const color = pct >= 100 ? 'var(--danger)' : pct >= 80 ? 'var(--warning)' : 'var(--success)';
                return `<div style="margin-bottom:10px">
                    <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                        <span style="font-size:0.85em;color:var(--text-primary)">${cat}</span>
                        <span style="font-size:0.82em;color:${color}">${pct}% — ${formatCurrency(spent)} / ${formatCurrency(lim)}</span>
                    </div>
                    <div style="height:4px;background:rgba(255,255,255,0.07);border-radius:2px;overflow:hidden">
                        <div style="height:100%;width:${pct}%;background:${color};border-radius:2px;transition:width 0.5s"></div>
                    </div>
                </div>`;
              }).join('');
    }

    const goalsDiv = document.getElementById('dashGoals');
    if (goalsDiv) {
        goalsDiv.innerHTML = !goals || goals.length === 0
            ? '<p class="no-data" style="color:var(--text-secondary);font-style:italic;font-size:0.85em">Crie metas em Configurações</p>'
            : `<h4 style="color:var(--gold-primary);font-family:'Cinzel',serif;font-size:0.8em;letter-spacing:1px;text-transform:uppercase;margin:12px 0 10px">Metas Financeiras</h4>` +
              goals.slice(0, 3).map(g => {
                const pct = Math.min((g.current || 0)/g.target*100, 100).toFixed(0);
                return `<div style="margin-bottom:10px">
                    <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                        <span style="font-size:0.85em;color:var(--text-primary)">${g.name}</span>
                        <span style="font-size:0.82em;color:var(--gold-primary)">${pct}% — ${formatCurrency(g.current || 0)} / ${formatCurrency(g.target)}</span>
                    </div>
                    <div style="height:4px;background:rgba(255,255,255,0.07);border-radius:2px;overflow:hidden">
                        <div style="height:100%;width:${pct}%;background:var(--gold-primary);border-radius:2px;transition:width 0.5s"></div>
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
            const tab = this.getAttribute('data-tab');
            if (!tab) return;
            if (layoutMode === 'full') {
                const target = document.getElementById(tab);
                if (target) {
                    // Scroll sem pular o topo da página
                    const offset = target.getBoundingClientRect().top + window.scrollY - 80;
                    window.scrollTo({ top: offset, behavior: 'smooth' });
                }
                return;
            }
            // Salvar posição do scroll para não pular para o topo
            const scrollY = window.scrollY;
            document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => { c.classList.remove('active'); c.style.display = 'none'; });
            this.classList.add('active');
            const target = document.getElementById(tab);
            if (target) {
                target.style.display = 'block';
                target.classList.add('active'); // sem setTimeout — evita flash
            }
            // Restaurar posição do scroll imediatamente
            window.scrollTo({ top: scrollY, behavior: 'instant' });
            if (tab === 'calendar') setTimeout(() => { initCalendar(); initScrollAnimations(); }, 50);
            if (tab === 'overview') updateOverviewTab();
        });
    });

    document.querySelectorAll('.settings-tab').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.settings-tab').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.settings-tab-content').forEach(c => c.classList.remove('active'));
            button.classList.add('active');
            const tabId = button.dataset.tab;
            const tab = document.getElementById(tabId);
            if (tab) tab.classList.add('active');
            if (tabId === 'budget-settings') loadBudgetCategories();
            if (tabId === 'recurring-settings') renderRecurringList();
            if (tabId === 'goals-settings') renderGoalsList();
        });
    });

    document.querySelectorAll('.cat-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.cat-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCategoryType = btn.dataset.type;
            renderCustomCategories();
        });
    });

    // Ativa primeira aba
    const firstBtn = document.querySelector('.tab-button[data-tab="credits"]');
    const firstContent = document.getElementById('credits');
    if (firstBtn && firstContent) {
        document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => { c.classList.remove('active'); });
        firstBtn.classList.add('active');
        firstContent.classList.add('active');
    }
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
    showToast('⚙️ Configurações salvas!', 'success');
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
function deleteRecurring(i) {
    if (!confirm('Remover esta transação recorrente?')) return;
    recurringTransactions.splice(i, 1);
    saveToFirestore();
    renderRecurringList();
    showToast('Recorrente removida', 'info');
}

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
    const list = document.getElementById('goalsList');
    if (!list) return;
    if (!goals || goals.length === 0) { list.innerHTML = '<p class="no-data" style="color:var(--text-secondary);padding:20px 0;text-align:center;">Nenhuma meta definida</p>'; return; }
    list.innerHTML = goals.map((g, i) => {
        const pct = Math.min((g.current / g.target) * 100, 100).toFixed(1);
        const remaining = g.target - g.current;
        return `
        <div class="goal-item">
            <div class="goal-header"><strong style="color:var(--gold-light)">${g.name}</strong><button onclick="deleteGoal(${i})" class="delete-btn" style="padding:4px 10px;font-size:0.8em">×</button></div>
            <div class="goal-progress-bar"><div class="goal-progress-fill" style="width:${pct}%"></div></div>
            <div class="goal-details">
                <span>${formatCurrency(g.current)} de ${formatCurrency(g.target)}</span>
                <span style="color:${remaining <= 0 ? 'var(--success)':'var(--gold-primary)'}">${remaining <= 0 ? 'Meta atingida!' : 'Faltam ' + formatCurrency(remaining)}</span>
            </div>
            <div class="goal-actions">
                <input type="number" id="goalAdd_${i}" placeholder="Valor a adicionar" step="0.01" style="flex:1;padding:6px 10px;background:rgba(0,0,0,0.3);border:1px solid var(--glass-border);border-radius:6px;color:var(--text-primary);font-size:0.9em;">
                <button onclick="addToGoal(${i})" class="edit-btn" style="padding:6px 14px">Adicionar</button>
            </div>
            ${g.deadline ? `<small style="color:var(--text-secondary);margin-top:5px;display:block">Prazo: ${formatDate(g.deadline)}</small>` : ''}
        </div>`;
    }).join('');
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

console.log('✅ Sistema de filtros carregado');
