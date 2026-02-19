// ========================================
// STIGA FINANCE - JAVASCRIPT CORRIGIDO
// PROBLEMA DO LOGIN E LOGOUT RESOLVIDO
// ========================================
// CORREÇÃO 1: REDIRECIONA PARA LOGIN SE NÃO ESTIVER LOGADO
let currentUser = localStorage.getItem('currentUser');
if (!currentUser) {
    window.location.href = 'login.html';
    // Não lançamos erro aqui para permitir que o resto do script carregue se necessário, 
    // mas o redirect acontece
}
// Estado Global
let currentAccount = 'main';
let theme = localStorage.getItem(`theme_${currentUser}`) || 'dark';
// NOVO: Estado do Layout (tabs ou full)
let layoutMode = localStorage.getItem(`layout_${currentUser}`) || 'tabs'; 
let notifications = JSON.parse(localStorage.getItem(`notifications_${currentUser}`)) || [];
let settings = JSON.parse(localStorage.getItem(`settings_${currentUser}`)) || {
    enableNotifications: true,
    enableSound: true,
    enablePushNotifications: false,
    notificationDays: 3
};
let accounts = JSON.parse(localStorage.getItem(`accounts_${currentUser}`)) || {
    main: { name: '💰 Conta Principal', credits: [], debits: [], futurePurchases: [] }
};
let customCategories = JSON.parse(localStorage.getItem(`customCategories_${currentUser}`)) || {
    credit: ['Salário', 'Bonificação', 'Freelance', 'Investimento', 'Outro'],
    debit: ['Alimentação', 'Transporte', 'Moradia', 'Lazer', 'Contas', 'Outro']
};
let recurringTransactions = JSON.parse(localStorage.getItem(`recurring_${currentUser}`)) || [];
let budgets = JSON.parse(localStorage.getItem(`budgets_${currentUser}`)) || {};
let goals = JSON.parse(localStorage.getItem(`goals_${currentUser}`)) || [];
// gamificação removida
let credits = accounts[currentAccount]?.credits || [];
let debits = accounts[currentAccount]?.debits || [];
let futurePurchases = accounts[currentAccount]?.futurePurchases || [];
let myChart = null;
let balanceChart = null;
let privacyMode = false;
let currentCategoryType = 'credit';
let chatbotOpen = false;
// ========================================
// FUNÇÕES BÁSICAS
// ========================================
const formatCurrency = (v) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(v);
};
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
// LAYOUT MODE (NOVO)
// ========================================
function setLayoutMode(mode) {
    layoutMode = mode;
    localStorage.setItem(`layout_${currentUser}`, mode);
    
    const tabContainer = document.querySelector('.tabs');
    const contentContainer = document.querySelector('.content-wrapper'); // Vamos criar isso no HTML
    const viewSelector = document.getElementById('viewModeSelector');
    if(viewSelector) viewSelector.value = mode;
    if (mode === 'full') {
        // Modo Full: Esconde botões de aba, mostra todo conteúdo
        if(tabContainer) tabContainer.style.display = 'none';
        
        document.querySelectorAll('.tab-content').forEach(el => {
            el.style.display = 'block';
            el.classList.add('active');
            // Adiciona margem para separação
            el.style.marginBottom = '40px';
            el.style.borderTop = '1px solid var(--glass-border)';
            el.style.paddingTop = '20px';
        });
    } else {
        // Modo Tabs: Mostra botões, comportamento padrão
        if(tabContainer) tabContainer.style.display = 'flex';
        
        document.querySelectorAll('.tab-content').forEach(el => {
            el.style.marginBottom = '0';
            el.style.borderTop = 'none';
            el.style.paddingTop = '0';
            el.classList.remove('active');
            el.style.display = 'none';
        });
        
        // Ativa a primeira aba por padrão ou a que estava ativa
        const activeBtn = document.querySelector('.tab-button.active');
        if(activeBtn) {
            const tabId = activeBtn.dataset.tab;
            const tabContent = document.getElementById(tabId);
            if(tabContent) {
                tabContent.style.display = 'block';
                tabContent.classList.add('active');
            }
        } else {
            // Fallback para primeira aba
            const firstBtn = document.querySelector('.tab-button');
            if(firstBtn) firstBtn.click();
        }
    }
}
// ========================================
// TEMA
// ========================================
function toggleTheme() {
    theme = theme === 'dark' ? 'light' : 'dark';
    document.body.classList.toggle('light-theme');
    const btn = document.getElementById('themeBtn');
    if (btn) btn.textContent = theme === 'dark' ? '🌙' : '☀️';
    localStorage.setItem(`theme_${currentUser}`, theme);
    showToast(`Tema ${theme === 'dark' ? 'escuro' : 'claro'} ativado`, 'info');
    updateChart();
    updateBalanceEvolutionChart();
}
if (theme === 'light') {
    document.body.classList.add('light-theme');
    const btn = document.getElementById('themeBtn');
    if (btn) btn.textContent = '☀️';
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
    } catch (e) {
        console.error('Erro ao reproduzir som:', e);
    }
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
    notifications.unshift({
        id: Date.now(),
        title,
        message,
        type,
        timestamp: new Date().toISOString(),
        read: false
    });
    if (notifications.length > 50) notifications = notifications.slice(0, 50);
    localStorage.setItem(`notifications_${currentUser}`, JSON.stringify(notifications));
    updateNotificationBadge();
    renderNotifications();
}
function updateNotificationBadge() {
    const unread = notifications.filter(n => !n.read).length;
    const badge = document.getElementById('notificationBadge');
    if (badge) {
        badge.textContent = unread;
        badge.style.display = unread > 0 ? 'block' : 'none';
    }
}
function renderNotifications() {
    const list = document.getElementById('notificationList');
    if (!list) return;
    if (notifications.length === 0) {
        list.innerHTML = '<p class="no-data">Nenhuma notificação</p>';
        return;
    }
    const getIcon = (t) => ({
        warning: '⚠️',
        success: '✅',
        error: '❌',
        info: 'ℹ️',
        alert: '🔔'
    }[t] || 'ℹ️');
    const formatTime = (ts) => {
        const diff = Math.floor((new Date() - new Date(ts)) / 1000);
        if (diff < 60) return 'Agora';
        if (diff < 3600) return `${Math.floor(diff / 60)} min atrás`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
        return new Date(ts).toLocaleDateString('pt-BR');
    };
    list.innerHTML = notifications.map(n => `
        <div class="notification-item ${n.read ? 'read' : 'unread'} notification-${n.type}"
             onclick="markAsRead(${n.id})">
            <div class="notification-icon">${getIcon(n.type)}</div>
            <div class="notification-content">
                <strong>${n.title}</strong>
                <p>${n.message}</p>
                <small>${formatTime(n.timestamp)}</small>
            </div>
            <button class="delete-notification"
                    onclick="event.stopPropagation(); deleteNotification(${n.id})">×</button>
        </div>
    `).join('');
}
function markAsRead(id) {
    const n = notifications.find(x => x.id === id);
    if (n) {
        n.read = true;
        localStorage.setItem(`notifications_${currentUser}`, JSON.stringify(notifications));
        updateNotificationBadge();
        renderNotifications();
    }
}
function deleteNotification(id) {
    notifications = notifications.filter(n => n.id !== id);
    localStorage.setItem(`notifications_${currentUser}`, JSON.stringify(notifications));
    updateNotificationBadge();
    renderNotifications();
}
function clearAllNotifications() {
    if (confirm('Limpar todas as notificações?')) {
        notifications = [];
        localStorage.setItem(`notifications_${currentUser}`, JSON.stringify(notifications));
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
    credits = accounts[currentAccount]?.credits || [];
    debits = accounts[currentAccount]?.debits || [];
    futurePurchases = accounts[currentAccount]?.futurePurchases || [];
    updateSummary();
    hideLoading();
    showToast(`Conta: ${accounts[currentAccount].name}`, 'success');
}
function loadAccountSelector() {
    const s = document.getElementById('accountSelector');
    if (s) {
        s.innerHTML = Object.entries(accounts).map(([id, acc]) =>
            `<option value="${id}" ${id === currentAccount ? 'selected' : ''}>${acc.name}</option>`
        ).join('');
    }
}
function addAccount() {
    const name = document.getElementById('newAccountName')?.value.trim();
    if (!name) {
        showToast('Digite um nome para a conta', 'error');
        return;
    }
    const id = 'acc_' + Date.now();
    accounts[id] = { name, credits: [], debits: [], futurePurchases: [] };
    saveAccounts();
    loadAccountSelector();
    renderAccountsList();
    document.getElementById('newAccountName').value = '';
    showToast(`Conta "${name}" criada com sucesso!`, 'success');
}
function deleteAccount(id) {
    if (id === 'main') {
        showToast('Não é possível deletar a conta principal', 'error');
        return;
    }
    if (confirm(`Deletar a conta "${accounts[id].name}"?`)) {
        delete accounts[id];
        if (currentAccount === id) {
            currentAccount = 'main';
            switchAccount();
        }
        saveAccounts();
        loadAccountSelector();
        renderAccountsList();
        showToast('Conta deletada', 'info');
    }
}
function renderAccountsList() {
    const list = document.getElementById('accountsList');
    if (list) {
        list.innerHTML = Object.entries(accounts).map(([id, acc]) => `
            <div class="transaction-item">
                <span>${acc.name}</span>
                ${id !== 'main' ? `<button onclick="deleteAccount('${id}')" class="delete-btn-small">×</button>` : ''}
            </div>
        `).join('');
    }
}
function saveAccounts() {
    accounts[currentAccount] = {
        name: accounts[currentAccount].name,
        credits,
        debits,
        futurePurchases
    };
    localStorage.setItem(`accounts_${currentUser}`, JSON.stringify(accounts));
}
// ========================================
// CATEGORIAS
// ========================================
function addCustomCategory() {
    const name = document.getElementById('newCategoryName')?.value.trim();
    if (!name) {
        showToast('Digite um nome para a categoria', 'error');
        return;
    }
    if (customCategories[currentCategoryType].includes(name)) {
        showToast('Esta categoria já existe', 'error');
        return;
    }
    customCategories[currentCategoryType].push(name);
    localStorage.setItem(`customCategories_${currentUser}`, JSON.stringify(customCategories));
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
    if (defaults[type].includes(category)) {
        showToast('Não é possível deletar categorias padrão', 'error');
        return;
    }
    customCategories[type] = customCategories[type].filter(c => c !== category);
    localStorage.setItem(`customCategories_${currentUser}`, JSON.stringify(customCategories));
    renderCustomCategories();
    updateCategorySelects();
    showToast('Categoria removida', 'info');
}
function renderCustomCategories() {
    const list = document.getElementById('customCategoriesList');
    if (list) {
        list.innerHTML = customCategories[currentCategoryType].map(cat => `
            <div class="transaction-item">
                <span>${cat}</span>
                <button onclick="deleteCustomCategory('${currentCategoryType}', '${cat}')"
                        class="delete-btn-small">×</button>
            </div>
        `).join('');
    }
}
function updateCategorySelects() {
    // Créditos
    ['creditCategory', 'filterCreditCategory'].forEach(id => {
        const s = document.getElementById(id);
        if (!s) return;
        const cur = s.value;
        s.innerHTML = (id.includes('filter') ? '<option value="">📁 Todas</option>' : '') +
            customCategories.credit.map(cat => `<option value="${cat}">${cat}</option>`).join('');
        if (cur && customCategories.credit.includes(cur)) s.value = cur;
    });
    // Débitos
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
    if (type === 'credits') {
        s.innerHTML = customCategories.credit.map(c => `<option value="${c}">${c}</option>`).join('');
    } else if (type === 'debits') {
        s.innerHTML = customCategories.debit.map(c => `<option value="${c}">${c}</option>`).join('');
    }
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
// ORÇAMENTOS - CORRIGIDO E SIMPLIFICADO
// ========================================
function loadBudgetCategories() {
    const s = document.getElementById('budgetCategory');
    if (!s) return;
    
    try {
        s.innerHTML = customCategories.debit.map(c =>
            `<option value="${c}">${c}</option>`
        ).join('');
    } catch (e) {
        console.error('Erro ao carregar categorias:', e);
    }
}
function addBudget() {
    try {
        const cat = document.getElementById('budgetCategory')?.value;
        const amt = parseFloat(document.getElementById('budgetAmount')?.value);
        if (!cat || !amt || amt <= 0) {
            showToast('Digite um valor válido para o orçamento', 'error');
            return;
        }
        budgets[cat] = amt;
        localStorage.setItem(`budgets_${currentUser}`, JSON.stringify(budgets));
        renderBudgets();
        const input = document.getElementById('budgetAmount');
        if (input) input.value = '';
        showToast(`Orçamento de ${cat} definido: ${formatCurrency(amt)}`, 'success');
    } catch (e) {
        console.error('Erro ao adicionar orçamento:', e);
        showToast('Erro ao adicionar orçamento', 'error');
    }
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
            const spent = debits
                .filter(d => d.category === cat && new Date(d.date).getMonth() === new Date().getMonth())
                .reduce((s, d) => s + parseFloat(d.amount || 0), 0);
            const pct = (spent / lim * 100).toFixed(1);
            const rem = lim - spent;
            return `
                <div class="transaction-item">
                    <div style="flex: 1;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <strong>${cat}</strong>
                            <button onclick="deleteBudget('${cat}')" class="delete-btn-small">×</button>
                        </div>
                        <div class="budget-bar">
                            <div class="budget-fill ${pct >= 100 ? 'over-budget' : pct >= 80 ? 'warning-budget' : ''}"
                                 style="width: ${Math.min(pct, 100)}%"></div>
                        </div>
                        <div class="budget-details">
                            <span>${formatCurrency(spent)} / ${formatCurrency(lim)}</span>
                            <span class="${rem < 0 ? 'over-budget-text' : ''}">
                                ${rem >= 0 ? 'Restam' : 'Excedeu'}: ${formatCurrency(Math.abs(rem))}
                            </span>
                        </div>
                    </div>
                </div>
            `;
        };
        if (cont) cont.innerHTML = entries.map(budgetHTML).join('');
        if (prog) prog.innerHTML = entries.slice(0, 5).map(budgetHTML).join('');
        loadBudgetCategories();
    } catch (e) {
        console.error('Erro ao renderizar orçamentos:', e);
    }
}
function deleteBudget(cat) {
    try {
        if (confirm(`Remover orçamento de ${cat}?`)) {
            delete budgets[cat];
            localStorage.setItem(`budgets_${currentUser}`, JSON.stringify(budgets));
            renderBudgets();
            showToast('Orçamento removido', 'info');
        }
    } catch (e) {
        console.error('Erro ao deletar orçamento:', e);
    }
}
// ========================================
// COMPARAÇÃO MENSAL - CORRIGIDO E PROTEGIDO
// ========================================
function renderMonthComparison() {
    const cont = document.getElementById('monthComparison');
    if (!cont) return;
    try {
        const thisM = new Date().getMonth();
        const lastM = thisM === 0 ? 11 : thisM - 1;
        const thisC = credits.filter(c => {
            try {
                return new Date(c.date).getMonth() === thisM;
            } catch { return false; }
        }).reduce((s, c) => s + parseFloat(c.amount || 0), 0);
        
        const lastC = credits.filter(c => {
            try {
                return new Date(c.date).getMonth() === lastM;
            } catch { return false; }
        }).reduce((s, c) => s + parseFloat(c.amount || 0), 0);
        const thisD = debits.filter(d => {
            try {
                return new Date(d.date).getMonth() === thisM;
            } catch { return false; }
        }).reduce((s, d) => s + parseFloat(d.amount || 0), 0);
        
        const lastD = debits.filter(d => {
            try {
                return new Date(d.date).getMonth() === lastM;
            } catch { return false; }
        }).reduce((s, d) => s + parseFloat(d.amount || 0), 0);
        const cDiff = lastC > 0 ? ((thisC - lastC) / lastC * 100) : 0;
        const dDiff = lastD > 0 ? ((thisD - lastD) / lastD * 100) : 0;
        const bDiff = (lastC - lastD) !== 0 ?
            (((thisC - thisD) - (lastC - lastD)) / Math.abs(lastC - lastD) * 100) : 0;
        cont.innerHTML = `
            <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
                <div class="transaction-item">
                    <span>Créditos:</span>
                    <span class="${cDiff > 0 ? 'positive' : 'negative'}">
                        ${cDiff > 0 ? '+' : ''}${cDiff.toFixed(1)}% ${cDiff > 0 ? '⬆️' : '⬇️'}
                    </span>
                </div>
                <div class="transaction-item">
                    <span>Débitos:</span>
                    <span class="${dDiff < 0 ? 'positive' : 'negative'}">
                        ${dDiff > 0 ? '+' : ''}${dDiff.toFixed(1)}% ${dDiff > 0 ? '⬆️' : '⬇️'}
                    </span>
                </div>
                <div class="transaction-item">
                    <span>Saldo:</span>
                    <span class="${bDiff > 0 ? 'positive' : 'negative'}">
                        ${bDiff > 0 ? '+' : ''}${bDiff.toFixed(1)}% ${bDiff > 0 ? '🎉' : '⚠️'}
                    </span>
                </div>
            </div>
        `;
    } catch (e) {
        console.error('Erro ao renderizar comparação mensal:', e);
        cont.innerHTML = '<p class="no-data">Erro ao carregar comparação mensal</p>';
    }
}
// ========================================
// EXPORT/IMPORT
// ========================================
function showExportModal() {
    const start = prompt('Data inicial (AAAA-MM-DD):');
    const end = prompt('Data final (AAAA-MM-DD):');
    if (!start || !end) return;
    const fC = credits.filter(c => c.date >= start && c.date <= end);
    const fD = debits.filter(d => d.date >= start && d.date <= end);
    let csv = "\ufeffTipo;Descricao;Valor;Data;Categoria;Tags\n";
    fD.forEach(d => csv += `Debito;${d.description};${d.amount};${d.date};${d.category};${(d.tags || []).join(',')}\n`);
    fC.forEach(c => csv += `Credito;${c.description};${c.amount};${c.date};${c.category};${(c.tags || []).join(',')}\n`);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `stiga_${start}_${end}.csv`;
    link.click();
    showToast('📥 Dados exportados com sucesso!', 'success');
}
function showImportModal() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const lines = ev.target.result.split('\n').filter(l => l.trim()).slice(1);
            let imported = 0;
            lines.forEach(line => {
                const parts = line.split(';').map(p => p.trim().replace(/"/g, ''));
                if (parts.length < 4) return;
                const [tipo, desc, valor, data, cat, tags] = parts;
                const amount = parseFloat(valor.replace(/[^\d,-]/g, '').replace(',', '.'));
                if (!isNaN(amount)) {
                    const trans = {
                        amount,
                        category: cat || 'Outro',
                        date,
                        description: desc,
                        tags: tags ? tags.split(',') : []
                    };
                    if (tipo.toLowerCase().includes('credit')) {
                        credits.unshift(trans);
                    } else {
                        debits.unshift(trans);
                    }
                    imported++;
                }
            });
            saveAccounts();
            updateSummary();
            showToast(`✅ ${imported} transações importadas com sucesso!`, 'success');
        };
        reader.readAsText(file, 'UTF-8');
    };
    input.click();
}
function exportToCSV() {
    let csv = "\ufeffTipo;Descricao;Valor;Data;Categoria;Tags\n";
    debits.forEach(d => csv += `Debito;${d.description};${d.amount};${d.date};${d.category};${(d.tags || []).join(',')}\n`);
    credits.forEach(c => csv += `Credito;${c.description};${c.amount};${c.date};${c.category};${(c.tags || []).join(',')}\n`);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `stiga_${currentUser}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    showToast('📥 CSV exportado!', 'success');
}
function backupData() {
    const backup = {
        version: '2.0',
        user: currentUser,
        date: new Date().toISOString(),
        accounts,
        settings,
        customCategories,
        recurringTransactions,
        notifications,
        budgets,
        goals,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `stiga_backup_${currentUser}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    showToast('💾 Backup realizado com sucesso!', 'success');
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
                if (!bkp.version || !bkp.accounts) {
                    showToast('❌ Arquivo de backup inválido', 'error');
                    return;
                }
                if (confirm('Restaurar backup? Isso substituirá todos os dados atuais!')) {
                    accounts = bkp.accounts;
                    settings = bkp.settings || settings;
                    customCategories = bkp.customCategories || customCategories;
                    recurringTransactions = bkp.recurringTransactions || [];
                    notifications = bkp.notifications || [];
                    budgets = bkp.budgets || {};
                    goals = bkp.goals || [];

                    localStorage.setItem(`accounts_${currentUser}`, JSON.stringify(accounts));
                    localStorage.setItem(`settings_${currentUser}`, JSON.stringify(settings));
                    localStorage.setItem(`customCategories_${currentUser}`, JSON.stringify(customCategories));
                    localStorage.setItem(`recurring_${currentUser}`, JSON.stringify(recurringTransactions));
                    localStorage.setItem(`notifications_${currentUser}`, JSON.stringify(notifications));
                    localStorage.setItem(`budgets_${currentUser}`, JSON.stringify(budgets));
                    localStorage.setItem(`goals_${currentUser}`, JSON.stringify(goals));

                    showToast('✅ Backup restaurado! Recarregando...', 'success');
                    setTimeout(() => location.reload(), 1500);
                }
            } catch (err) {
                console.error(err);
                showToast('❌ Erro ao ler arquivo de backup', 'error');
            }
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
    if (chatbotOpen && document.getElementById('chatMessages').children.length === 0) {
        addChatMessage('bot', 'Olá! Sou seu assistente financeiro da Stiga Finance. Como posso ajudar?');
    }
}
function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    if (!message) return;
    addChatMessage('user', message);
    input.value = '';
    setTimeout(() => {
        const response = processChatMessage(message);
        addChatMessage('bot', response);
    }, 500);
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
    const msg = message.toLowerCase();
    if (msg.includes('quanto') && (msg.includes('gast') || msg.includes('debit'))) {
        const category = customCategories.debit.find(c => msg.includes(c.toLowerCase()));
        if (category) {
            const total = debits
                .filter(d => d.category === category)
                .reduce((sum, d) => sum + parseFloat(d.amount), 0);
            return `Você gastou ${formatCurrency(total)} em ${category}.`;
        }
        const thisMonth = debits.filter(d => new Date(d.date).getMonth() === new Date().getMonth())
            .reduce((sum, d) => sum + parseFloat(d.amount), 0);
        return `Você gastou ${formatCurrency(thisMonth)} este mês.`;
    }
    if (msg.includes('saldo') || msg.includes('quanto tenho')) {
        const totalC = credits.reduce((s, c) => s + parseFloat(c.amount), 0);
        const totalD = debits.reduce((s, d) => s + parseFloat(d.amount), 0);
        return `Seu saldo atual é ${formatCurrency(totalC - totalD)}.`;
    }
    if (msg.includes('venc') || msg.includes('conta') || msg.includes('pagar')) {
        const proximos = futurePurchases
            .filter(f => new Date(f.dueDate) >= new Date())
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
            .slice(0, 3);
        if (proximos.length === 0) {
            return 'Você não tem contas a vencer nos próximos dias! ✅';
        }
        return `Próximas contas:\n${proximos.map(f =>
            `📅 ${f.description}: ${formatCurrency(f.amount)} (${formatDate(f.dueDate)})`
        ).join('\n')}`;
    }
    if (msg.includes('média') || msg.includes('media')) {
        const avg = debits.length > 0
            ? debits.reduce((sum, d) => sum + parseFloat(d.amount), 0) / debits.length
            : 0;
        return `Sua média de gastos por transação é ${formatCurrency(avg)}.`;
    }
    if (msg.includes('orçamento') || msg.includes('orcamento') || msg.includes('limite')) {
        const budgetEntries = Object.entries(budgets);
        if (budgetEntries.length === 0) {
            return 'Você não tem orçamentos definidos. Configure nas configurações! 💸';
        }
        let response = 'Seus orçamentos:\n';
        budgetEntries.slice(0, 3).forEach(([cat, limit]) => {
            const spent = debits
                .filter(d => d.category === cat && new Date(d.date).getMonth() === new Date().getMonth())
                .reduce((sum, d) => sum + parseFloat(d.amount), 0);
            const percent = (spent / limit * 100).toFixed(0);
            response += `💰 ${cat}: ${percent}% usado\n`;
        });
        return response;
    }
    if (msg.includes('econ') || msg.includes('sobrou')) {
        const totalC = credits.reduce((s, c) => s + parseFloat(c.amount), 0);
        const totalD = debits.reduce((s, d) => s + parseFloat(d.amount), 0);
        const balance = totalC - totalD;
        if (balance > 0) {
            return `Você economizou ${formatCurrency(balance)}! Continue assim! 💎`;
        } else {
            return `Você está com saldo negativo de ${formatCurrency(Math.abs(balance))}. Cuidado! ⚠️`;
        }
    }
    if (msg.includes('ajuda') || msg.includes('help') || msg.includes('?')) {
        return `Posso ajudar com:\n📊 Gastos (ex: "quanto gastei em alimentação?")\n💰 Saldo (ex: "qual meu saldo?")\n📅 Vencimentos (ex: "contas a pagar")\n💸 Orçamento (ex: "meu orçamento")\n📈 Economia (ex: "quanto economizei?")\n📉 Média (ex: "média de gastos")`;
    }
    return 'Desculpe, não entendi. Digite "ajuda" para ver o que posso fazer! 🤔';
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
        debits.forEach(d => {
            const cat = d.category || 'Outro';
            const amt = parseFloat(d.amount || 0);
            cats[cat] = (cats[cat] || 0) + amt;
        });
        if (myChart) {
            try {
                myChart.destroy();
            } catch (e) {
                console.error('Erro ao destruir gráfico:', e);
            }
        }
        const hasData = Object.keys(cats).length > 0;
        myChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: hasData ? Object.keys(cats) : ['Sem dados'],
                datasets: [{
                    data: hasData ? Object.values(cats) : [1],
                    backgroundColor: hasData ? [
                        '#D4AF37', '#F4E5C3', '#B8942A', '#E74C3C', '#2ECC71',
                        '#3498DB', '#9B59B6', '#F39C12'
                    ] : ['#333'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: theme === 'dark' ? '#A0A0A0' : '#333',
                            font: { size: 10 },
                            padding: 10
                        }
                    }
                }
            }
        });
    } catch (e) {
        console.error('Erro ao atualizar gráfico:', e);
    }
}
function updateBalanceEvolutionChart() {
    const canvas = document.getElementById('balanceEvolutionChart');
    if (!canvas) return;
    try {
        const ctx = canvas.getContext('2d');
        const days = 30;
        const today = new Date();
        const labels = [];
        const data = [];
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            labels.push(date.getDate() + '/' + (date.getMonth() + 1));
            const cUpTo = credits.filter(c => {
                try {
                    return c.date && c.date <= dateStr;
                } catch { return false; }
            }).reduce((s, c) => s + parseFloat(c.amount || 0), 0);
            
            const dUpTo = debits.filter(d => {
                try {
                    return d.date && d.date <= dateStr;
                } catch { return false; }
            }).reduce((s, d) => s + parseFloat(d.amount || 0), 0);
            data.push(cUpTo - dUpTo);
        }
        if (balanceChart) {
            try {
                balanceChart.destroy();
            } catch (e) {
                console.error('Erro ao destruir gráfico de evolução:', e);
            }
        }
        balanceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Saldo',
                    data,
                    borderColor: '#D4AF37',
                    backgroundColor: 'rgba(212, 175, 55, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        ticks: {
                            color: theme === 'dark' ? '#A0A0A0' : '#333',
                            callback: (v) => formatCurrency(v)
                        },
                        grid: {
                            color: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
                        }
                    },
                    x: {
                        ticks: { color: theme === 'dark' ? '#A0A0A0' : '#333' },
                        grid: { display: false }
                    }
                }
            }
        });
    } catch (e) {
        console.error('Erro ao atualizar gráfico de evolução:', e);
    }
}
// ========================================
// PDF REPORT
// ========================================
async function generatePDFReport() {
    showLoading();
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.setFontSize(20);
        doc.setTextColor(212, 175, 55);
        doc.text('STIGA FINANCE', 105, 20, { align: 'center' });
        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text('Relatorio Financeiro', 105, 28, { align: 'center' });
        doc.text(`Conta: ${accounts[currentAccount].name}`, 105, 35, { align: 'center' });
        doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 105, 42, { align: 'center' });
        const totalC = credits.reduce((s, c) => s + parseFloat(c.amount || 0), 0);
        const totalD = debits.reduce((s, d) => s + parseFloat(d.amount || 0), 0);
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text('RESUMO FINANCEIRO', 20, 55);
        doc.setFontSize(11);
        doc.setTextColor(46, 204, 113);
        doc.text(`Total Creditos: ${formatCurrency(totalC)}`, 20, 65);
        doc.setTextColor(231, 76, 60);
        doc.text(`Total Debitos: ${formatCurrency(totalD)}`, 20, 72);
        doc.setTextColor(212, 175, 55);
        doc.text(`Saldo: ${formatCurrency(totalC - totalD)}`, 20, 79);
        const cats = {};
        debits.forEach(d => cats[d.category] = (cats[d.category] || 0) + parseFloat(d.amount));
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text('GASTOS POR CATEGORIA', 20, 95);
        doc.setFontSize(10);
        let y = 105;
        Object.entries(cats).sort((a, b) => b[1] - a[1]).forEach(([cat, val]) => {
            doc.text(`${cat}: ${formatCurrency(val)}`, 25, y);
            y += 7;
        });
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text('ULTIMAS TRANSACOES', 20, y + 10);
        y += 20;
        doc.setFontSize(9);
        [...credits.slice(0, 5), ...debits.slice(0, 5)]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 10)
            .forEach(t => {
                const isC = credits.includes(t);
                doc.setTextColor(isC ? 46 : 231, isC ? 204 : 76, isC ? 113 : 60);
                doc.text(`${formatDate(t.date)} - ${t.description.substring(0, 40)}`, 25, y);
                doc.text(`${isC ? '+' : '-'}${formatCurrency(t.amount)}`, 160, y);
                y += 6;
                if (y > 280) return;
            });
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text('Gerado por Stiga Finance - Sistema de Gestao Financeira Inteligente', 105, 290, { align: 'center' });
        doc.save(`relatorio_stiga_${currentUser}_${new Date().toISOString().split('T')[0]}.pdf`);
        showToast('📄 Relatório PDF gerado com sucesso!', 'success');
    } catch (err) {
        console.error(err);
        showToast('❌ Erro ao gerar PDF', 'error');
    }
    hideLoading();
}
// ========================================
// SUMMARY E PAINEL
// ========================================
function updateSummary() {
    const totalC = credits.reduce((s, c) => s + parseFloat(c.amount || 0), 0);
    const totalD = debits.reduce((s, d) => s + parseFloat(d.amount || 0), 0);
    const totalF = futurePurchases.reduce((s, f) => s + parseFloat(f.amount || 0), 0);
    const el = (id, txt) => {
        const e = document.getElementById(id);
        if (e) e.textContent = txt;
    };
    el('totalCredits', formatCurrency(totalC));
    el('totalDebits', formatCurrency(totalD));
    el('currentBalance', formatCurrency(totalC - totalD));
    el('futurePurchases', formatCurrency(totalF));
    const accName = accounts[currentAccount]?.name || 'Conta';
    ['accountCredit', 'accountDebit', 'accountBalance', 'accountFuture'].forEach(id => el(id, accName));
    renderLists();
    updateChart();
    updateBalanceEvolutionChart();
    checkVencimentos();
    showCategoryTotals();
    renderMonthComparison();
    renderBudgets();
}
function checkVencimentos() {
    const div = document.getElementById('vencimentoAlert');
    if (!div) return;
    const hoje = new Date();
    const em = new Date();
    em.setDate(hoje.getDate() + parseInt(settings.notificationDays));
    const prox = futurePurchases.filter(p => new Date(p.dueDate + 'T00:00:00') <= em);
    div.innerHTML = prox.length > 0
        ? `<p style="color:#E74C3C; font-weight: bold;">⚠️ ${prox.length} conta(s) vencendo em breve!</p>`
        : `<p style="color:#2ECC71">✅ Todos os compromissos estão em dia</p>`;
}
function showCategoryTotals() {
    const div = document.getElementById('categoryTotals');
    if (!div) return;
    const cats = {};
    debits.forEach(d => cats[d.category] = (cats[d.category] || 0) + parseFloat(d.amount || 0));
    const sorted = Object.entries(cats).sort((a, b) => b[1] - a[1]);
    const maxVal = sorted.length > 0 ? sorted[0][1] : 1;
    if (sorted.length === 0) {
        div.innerHTML = '<p class="no-data" style="color:var(--text-secondary);font-style:italic;padding:10px 0">Nenhum gasto registrado</p>';
    } else {
        div.innerHTML = `<h4 style="color:var(--gold-primary);font-family:'Cinzel',serif;font-size:0.8em;letter-spacing:1px;text-transform:uppercase;margin:12px 0 10px">Gastos por Categoria</h4>` +
            sorted.map(([cat, val]) => `
                <div style="margin-bottom:10px">
                    <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                        <span style="font-size:0.88em;color:var(--text-primary)">${cat}</span>
                        <strong style="color:var(--gold-light);font-size:0.88em">${formatCurrency(val)}</strong>
                    </div>
                    <div style="height:4px;background:rgba(255,255,255,0.07);border-radius:2px;overflow:hidden">
                        <div style="height:100%;width:${(val/maxVal*100).toFixed(0)}%;background:linear-gradient(90deg,var(--gold-dark),var(--gold-primary));border-radius:2px;transition:width 0.5s"></div>
                    </div>
                </div>
            `).join('');
    }
    // Mostrar orçamentos no painel
    const budgetDiv = document.getElementById('dashBudgets');
    if (budgetDiv) {
        const entries = Object.entries(budgets);
        if (entries.length === 0) {
            budgetDiv.innerHTML = '<p class="no-data" style="color:var(--text-secondary);font-style:italic;font-size:0.85em">Configure orçamentos em Configurações</p>';
        } else {
            const thisMonth = new Date().getMonth();
            budgetDiv.innerHTML = `<h4 style="color:var(--gold-primary);font-family:'Cinzel',serif;font-size:0.8em;letter-spacing:1px;text-transform:uppercase;margin:12px 0 10px">Orçamentos do Mês</h4>` +
                entries.map(([cat, lim]) => {
                    const spent = debits.filter(d => d.category === cat && new Date(d.date).getMonth() === thisMonth)
                        .reduce((s, d) => s + parseFloat(d.amount || 0), 0);
                    const pct = Math.min(spent / lim * 100, 100).toFixed(0);
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
    }
    // Mostrar metas no painel
    const goalsDiv = document.getElementById('dashGoals');
    if (goalsDiv) {
        if (!goals || goals.length === 0) {
            goalsDiv.innerHTML = '<p class="no-data" style="color:var(--text-secondary);font-style:italic;font-size:0.85em">Crie metas em Configurações</p>';
        } else {
            goalsDiv.innerHTML = `<h4 style="color:var(--gold-primary);font-family:'Cinzel',serif;font-size:0.8em;letter-spacing:1px;text-transform:uppercase;margin:12px 0 10px">Metas Financeiras</h4>` +
                goals.slice(0, 3).map(g => {
                    const pct = Math.min((g.current || 0) / g.target * 100, 100).toFixed(0);
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
}
function renderLists() {
    const privClass = privacyMode ? 'privacy-active' : '';
    const credList = document.getElementById('creditsList');
    if (credList) {
        credList.innerHTML = credits.length > 0 ? credits.map((c, i) => `
            <div class="transaction-item">
                <div style="flex: 1;">
                    <b>${formatDate(c.date)}</b><br>
                    ${c.category} - ${c.description}
                    ${c.tags && c.tags.length ? `<br><small class="tags">${c.tags.map(t => `🏷️${t}`).join(' ')}</small>` : ''}
                    ${c.attachment ? `<br><button onclick="viewAttachment('credits', ${i})" class="btn btn-small">📎 Ver</button>` : ''}
                </div>
                <div class="summary-value ${privClass}" style="color:#2ECC71">${formatCurrency(c.amount)}</div>
                <div class="action-btns">
                    <button class="edit-btn" onclick="editItem('credits', ${i})">✏️</button>
                    <button class="delete-btn" onclick="deleteItem('credits', ${i})">×</button>
                </div>
            </div>
        `).join('') : '<p class="no-data">Nenhum crédito registrado</p>';
    }
    const debList = document.getElementById('debitsList');
    if (debList) {
        debList.innerHTML = debits.length > 0 ? debits.map((d, i) => `
            <div class="transaction-item">
                <div style="flex: 1;">
                    <b>${formatDate(d.date)}</b><br>
                    ${d.category} - ${d.description}
                    ${d.tags && d.tags.length ? `<br><small class="tags">${d.tags.map(t => `🏷️${t}`).join(' ')}</small>` : ''}
                    ${d.attachment ? `<br><button onclick="viewAttachment('debits', ${i})" class="btn btn-small">📎 Ver</button>` : ''}
                </div>
                <div class="summary-value ${privClass}" style="color:#E74C3C">-${formatCurrency(d.amount)}</div>
                <div class="action-btns">
                    <button class="edit-btn" onclick="editItem('debits', ${i})">✏️</button>
                    <button class="delete-btn" onclick="deleteItem('debits', ${i})">×</button>
                </div>
            </div>
        `).join('') : '<p class="no-data">Nenhum débito registrado</p>';
    }
    const futList = document.getElementById('futureList');
    if (futList) {
        futList.innerHTML = futurePurchases.length > 0 ? futurePurchases.map((f, i) => `
            <div class="transaction-item">
                <div style="flex: 1;">
                    <b>Vencimento: ${formatDate(f.dueDate)}</b><br>
                    ${f.description}
                </div>
                <div class="summary-value ${privClass}" style="color:#F39C12">${formatCurrency(f.amount)}</div>
                <div class="action-btns">
                    <button class="btn btn-small pay-btn" onclick="payItem(${i})">💳 Pagar</button>
                    <button class="delete-btn" onclick="deleteItem('futurePurchases', ${i})">×</button>
                </div>
            </div>
        `).join('') : '<p class="no-data">Nenhuma compra futura</p>';
    }
}
function viewAttachment(type, index) {
    const item = type === 'credits' ? credits[index] : debits[index];
    if (!item || !item.attachment) return;
    // Remover modal anterior se existir
    const existing = document.getElementById('attachmentModal');
    if (existing) existing.remove();
    const isImage = item.attachment.type && item.attachment.type.startsWith('image/');
    const modal = document.createElement('div');
    modal.id = 'attachmentModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);backdrop-filter:blur(8px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';
    modal.innerHTML = `
        <div style="background:var(--bg-card);border:1px solid var(--glass-border);border-radius:16px;padding:28px;max-width:700px;width:100%;max-height:90vh;overflow:auto;position:relative;box-shadow:0 30px 80px rgba(0,0,0,0.8);">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid var(--glass-border)">
                <h2 style="font-family:'Cinzel',serif;color:var(--gold-primary);font-size:1.1em;letter-spacing:1px">Comprovante</h2>
                <button onclick="document.getElementById('attachmentModal').remove()" style="background:transparent;border:1px solid var(--glass-border);color:var(--text-secondary);width:34px;height:34px;border-radius:8px;cursor:pointer;font-size:1.2em;display:flex;align-items:center;justify-content:center;padding:0;min-width:unset">×</button>
            </div>
            ${isImage
                ? `<img src="${item.attachment.data}" style="width:100%;max-height:65vh;object-fit:contain;border-radius:8px;display:block;">`
                : `<div style="text-align:center;padding:40px 20px">
                    <p style="color:var(--text-primary);margin-bottom:20px;font-size:1.1em">${item.attachment.name}</p>
                    <a href="${item.attachment.data}" download="${item.attachment.name}" style="background:linear-gradient(135deg,var(--gold-primary),var(--gold-dark));color:#0A0E17;padding:12px 28px;border-radius:8px;text-decoration:none;font-family:'Cinzel',serif;font-size:0.85em;letter-spacing:1px;font-weight:bold">Download</a>
                  </div>`}
        </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}
function togglePrivacy() {
    privacyMode = !privacyMode;
    const eye = document.getElementById('eyeIcon');
    if (eye) eye.textContent = privacyMode ? '🙈' : '👁️';
    renderLists();
    ['totalCredits', 'totalDebits', 'currentBalance', 'futurePurchases'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('privacy-active', privacyMode);
    });
}
function logout() {
    if (confirm('Deseja realmente sair?')) {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('rememberUser');
        window.location.href = 'login.html';
    }
}
function editItem(type, index) {
    const item = type === 'credits' ? credits[index] : debits[index];
    const typeEl = document.getElementById('editType');
    const indexEl = document.getElementById('editIndex');
    const amountEl = document.getElementById('editAmount');
    const dateEl = document.getElementById('editDate');
    const descEl = document.getElementById('editDescription');
    const tagsEl = document.getElementById('editTags');
    if (typeEl) typeEl.value = type;
    if (indexEl) indexEl.value = index;
    if (amountEl) amountEl.value = item.amount;
    if (dateEl) dateEl.value = item.date;
    if (descEl) descEl.value = item.description;
    if (tagsEl) tagsEl.value = item.tags ? item.tags.join(', ') : '';
    updateEditCategorySelect();
    const catEl = document.getElementById('editCategory');
    if (catEl) catEl.value = item.category;
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
    debits.unshift({
        amount: item.amount,
        category: "Contas",
        date: new Date().toISOString().split('T')[0],
        description: `PAGO: ${item.description}`,
        tags: ['pago']
    });
    futurePurchases.splice(i, 1);
    saveAccounts();
    updateSummary();
    showToast('💳 Pagamento registrado!', 'success');
    addNotification('✅ Pagamento', `${item.description} foi pago`, 'success');
}
// ========================================
// FORMULÁRIOS
// ========================================
const creditForm = document.getElementById('creditForm');
if (creditForm) {
    creditForm.onsubmit = (e) => {
        e.preventDefault();
        const amount = document.getElementById('creditAmount')?.value;
        const category = document.getElementById('creditCategory')?.value;
        const date = document.getElementById('creditDate')?.value;
        const description = document.getElementById('creditDescription')?.value;
        const tags = document.getElementById('creditTags')?.value.split(',').map(t => t.trim()).filter(Boolean);
        const attachmentFile = document.getElementById('creditAttachment')?.files[0];
        const newCredit = { amount, category, date, description, tags };
        if (attachmentFile) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                newCredit.attachment = {
                    name: attachmentFile.name,
                    type: attachmentFile.type,
                    data: ev.target.result
                };
                credits.unshift(newCredit);
                saveAccounts();
                updateSummary();
                showToast('✅ Crédito com comprovante adicionado!', 'success');
                addNotification('💰 Crédito', 'Novo crédito registrado', 'success');
            };
            reader.readAsDataURL(attachmentFile);
        } else {
            credits.unshift(newCredit);
            saveAccounts();
            updateSummary();
            showToast('✅ Crédito adicionado!', 'success');
            addNotification('💰 Crédito', 'Novo crédito registrado', 'success');
        }
        e.target.reset();
        setTodayAsDefault();
    };
}
const debitForm = document.getElementById('debitForm');
if (debitForm) {
    debitForm.onsubmit = (e) => {
        e.preventDefault();
        const amount = document.getElementById('debitAmount')?.value;
        const category = document.getElementById('debitCategory')?.value;
        const date = document.getElementById('debitDate')?.value;
        const description = document.getElementById('debitDescription')?.value;
        const tags = document.getElementById('debitTags')?.value.split(',').map(t => t.trim()).filter(Boolean);
        const attachmentFile = document.getElementById('debitAttachment')?.files[0];
        const newDebit = { amount, category, date, description, tags };
        if (attachmentFile) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                newDebit.attachment = {
                    name: attachmentFile.name,
                    type: attachmentFile.type,
                    data: ev.target.result
                };
                debits.unshift(newDebit);
                saveAccounts();
                updateSummary();
                showToast('✅ Débito com comprovante adicionado!', 'success');
                addNotification('💸 Débito', 'Novo débito registrado', 'info');
            };
            reader.readAsDataURL(attachmentFile);
        } else {
            debits.unshift(newDebit);
            saveAccounts();
            updateSummary();
            showToast('✅ Débito adicionado!', 'success');
            addNotification('💸 Débito', 'Novo débito registrado', 'info');
        }
        e.target.reset();
        setTodayAsDefault();
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
            futurePurchases.push({
                amount: valPerInst,
                dueDate: d.toISOString().split('T')[0],
                description: `${desc} (${i + 1}/${installments})`
            });
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
        const tags = document.getElementById('editTags')?.value.split(',').map(t => t.trim()).filter(Boolean);
        const updated = {
            amount: document.getElementById('editAmount')?.value,
            category: document.getElementById('editCategory')?.value,
            date: document.getElementById('editDate')?.value,
            description: document.getElementById('editDescription')?.value,
            tags
        };
        if (type === 'credits') {
            credits[index] = { ...credits[index], ...updated };
        } else {
            debits[index] = { ...debits[index], ...updated };
        }
        saveAccounts();
        updateSummary();
        closeEditModal();
        showToast('✅ Transação atualizada!', 'success');
    };
}
// ========================================
// TABS
// ========================================
document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
        // Se estiver em modo full, não faz nada (ou faz scroll)
        if (layoutMode === 'full') {
            const tabId = button.dataset.tab;
            const target = document.getElementById(tabId);
            if(target) target.scrollIntoView({ behavior: 'smooth' });
            return;
        }
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        button.classList.add('active');
        const tab = document.getElementById(button.dataset.tab);
        if (tab) {
            tab.style.display = 'block';
            setTimeout(() => tab.classList.add('active'), 10);
        }
    });
});
document.querySelectorAll('.settings-tab').forEach(button => {
    button.addEventListener('click', () => {
        document.querySelectorAll('.settings-tab').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.settings-tab-content').forEach(content => content.classList.remove('active'));
        button.classList.add('active');
        const tabId = button.dataset.tab;
        const tab = document.getElementById(tabId);
        if (tab) tab.classList.add('active');
        // Recarregar dados ao trocar de aba nas configurações
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
    localStorage.setItem(`settings_${currentUser}`, JSON.stringify(settings));
    showToast('⚙️ Configurações salvas!', 'success');
}
function loadSettings() {
    const enNot = document.getElementById('enableNotifications');
    const enSound = document.getElementById('enableSound');
    const enPush = document.getElementById('enablePushNotifications');
    const notDays = document.getElementById('notificationDays');
    if (enNot) enNot.checked = settings.enableNotifications;
    if (enSound) enSound.checked = settings.enableSound;
    if (enPush) enPush.checked = settings.enablePushNotifications;
    if (notDays) notDays.value = settings.notificationDays;
}
// ========================================
// INICIALIZAÇÃO - PROTEGIDA CONTRA ERROS
// ========================================
window.onload = function () {
    try {
        if(!currentUser) return; // Se redirecionou, não executa o resto
        showLoading();
        const welcome = document.getElementById('welcomeUser');
        if (welcome) welcome.textContent = `Olá, ${currentUser}`;
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
        // Processar recorrentes automaticamente ao entrar
        setTimeout(processRecurringTransactions, 500);
        
        // Aplica o modo de layout salvo
        setLayoutMode(layoutMode);
        hideLoading();
        if (credits.length + debits.length === 1) {
            setTimeout(() => {
                try {
                } catch (e) {
                    console.error('Erro ao desbloquear conquista:', e);
                }
            }, 1000);
        }
    } catch (e) {
        console.error('Erro na inicialização:', e);
        hideLoading();
        showToast('Erro ao carregar o sistema. Recarregue a página.', 'error');
    }
};
// ================================================
// STIGA FINANCE - CALENDÁRIO + ANIMAÇÕES SCROLL
// ================================================

// ---- CALENDÁRIO ----
let calCurrentMonth = new Date().getMonth();
let calCurrentYear  = new Date().getFullYear();

function initCalendar() {
    const today = new Date().toISOString().split('T')[0];
    const ri = document.getElementById('reminderDate');
    if (ri && !ri.value) ri.value = today;

    const rf = document.getElementById('reminderForm');
    if (rf) rf.addEventListener('submit', addReminder);

    renderCalendar();
    renderRemindersList();
}

function renderCalendar() {
    const grid = document.getElementById('calGrid');
    const title = document.getElementById('calMonthYear');
    if (!grid || !title) return;

    const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                    'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    title.textContent = `${months[calCurrentMonth]} ${calCurrentYear}`;

    const firstDay   = new Date(calCurrentYear, calCurrentMonth, 1).getDay();
    const daysInMonth = new Date(calCurrentYear, calCurrentMonth + 1, 0).getDate();
    const today       = new Date();

    const userData = getCurrentUserData();
    const reminders = userData.reminders || [];
    const credits   = userData.credits   || [];
    const debits    = userData.debits    || [];

    let html = '';

    // Células vazias antes do 1º dia
    for (let i = 0; i < firstDay; i++) {
        html += `<div class="cal-day other-month"></div>`;
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${calCurrentYear}-${String(calCurrentMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const isToday = (d === today.getDate() && calCurrentMonth === today.getMonth() && calCurrentYear === today.getFullYear());
        const dayReminders = reminders.filter(r => r.date === dateStr);
        const dayCredits   = credits.filter(c => c.date === dateStr);
        const dayDebits    = debits.filter(db => db.date === dateStr);

        let classes = 'cal-day';
        if (isToday) classes += ' today';
        if (dayReminders.length) classes += ' has-reminder';
        if (dayDebits.length)   classes += ' has-debit';
        if (dayCredits.length)  classes += ' has-credit';

        let dots = '';
        if (dayCredits.length)  dots += `<span class="cal-dot credit" title="Crédito"></span>`;
        if (dayDebits.length)   dots += `<span class="cal-dot debit" title="Débito"></span>`;
        if (dayReminders.length) dots += `<span class="cal-dot reminder" title="Lembrete"></span>`;

        html += `
            <div class="${classes}" onclick="selectCalDay('${dateStr}')" title="${dateStr}">
                <span>${d}</span>
                ${dots ? `<div class="cal-dots">${dots}</div>` : ''}
            </div>`;
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

// ---- LEMBRETES ----
function addReminder(e) {
    e.preventDefault();
    const date = document.getElementById('reminderDate')?.value;
    const time = document.getElementById('reminderTime')?.value;
    const type = document.getElementById('reminderType')?.value;
    const desc = document.getElementById('reminderDescription')?.value?.trim();

    if (!date || !time || !desc) {
        showToast('Preencha todos os campos do lembrete', 'error');
        return;
    }

    const userData = getCurrentUserData();
    if (!userData.reminders) userData.reminders = [];

    userData.reminders.push({
        id: Date.now(),
        date, time, type: type || 'outro',
        description: desc,
        createdAt: new Date().toISOString()
    });

    saveCurrentUserData(userData);
    document.getElementById('reminderForm').reset();
    document.getElementById('reminderDate').value = new Date().toISOString().split('T')[0];

    renderCalendar();
    renderRemindersList();
    showToast('Lembrete adicionado!', 'success');
}

function renderRemindersList() {
    const container = document.getElementById('remindersList');
    if (!container) return;

    const userData = getCurrentUserData();
    const reminders = (userData.reminders || [])
        .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

    if (!reminders.length) {
        container.innerHTML = '<p style="color:var(--text-secondary);text-align:center;padding:20px 0;">Nenhum lembrete cadastrado</p>';
        return;
    }

    const typeLabels = { vencimento:'Vencimento', pagamento:'Pagamento', meta:'Meta', reuniao:'Reunião', outro:'Outro' };
    const today = new Date().toISOString().split('T')[0];

    container.innerHTML = reminders.map(r => {
        const isPast = r.date < today;
        const [yr, mo, dy] = r.date.split('-');
        const formatted = `${dy}/${mo}/${yr}`;
        return `
        <div class="reminder-item ${r.type}" style="${isPast ? 'opacity:0.5' : ''}">
            <div>
                <b style="color:var(--gold-light);font-size:0.95em">${r.description}</b>
                <div class="reminder-date">${formatted} às ${r.time}</div>
            </div>
            <div style="display:flex;align-items:center;gap:10px">
                <span class="reminder-badge" style="color:${r.type==='vencimento'?'var(--danger)':r.type==='pagamento'?'var(--warning)':'var(--gold-primary)'}">
                    ${typeLabels[r.type] || 'Outro'}
                </span>
                <button onclick="deleteReminder(${r.id})" class="delete-btn" style="padding:5px 10px;font-size:0.75em">Remover</button>
            </div>
        </div>`;
    }).join('');
}

function deleteReminder(id) {
    const userData = getCurrentUserData();
    userData.reminders = (userData.reminders || []).filter(r => r.id !== id);
    saveCurrentUserData(userData);
    renderCalendar();
    renderRemindersList();
    showToast('Lembrete removido', 'info');
}

// Helpers para acessar dados do usuário atual
function getCurrentUserData() {
    const user = localStorage.getItem('currentUser');
    const users = JSON.parse(localStorage.getItem('stigaUsers') || localStorage.getItem('diamondUsers') || '{}');
    if (!users[user]) users[user] = { data: { credits:[], debits:[], futurePurchases:[], reminders:[] } };
    if (!users[user].data) users[user].data = { credits:[], debits:[], futurePurchases:[], reminders:[] };
    if (!users[user].data.reminders) users[user].data.reminders = [];
    return users[user].data;
}
function saveCurrentUserData(data) {
    const user = localStorage.getItem('currentUser');
    const users = JSON.parse(localStorage.getItem('stigaUsers') || '{}');
    if (!users[user]) users[user] = {};
    users[user].data = data;
    localStorage.setItem('stigaUsers',  JSON.stringify(users));
    localStorage.setItem('diamondUsers', JSON.stringify(users));
}

// ---- ANIMAÇÕES DE SCROLL ----
function initScrollAnimations() {
    // Adiciona classe scroll-reveal em elementos que devem animar
    const targets = document.querySelectorAll('.summary-card, .form-section, .transactions-list, .tools-section, .filter-section, .tabs');
    targets.forEach((el, i) => {
        if (!el.classList.contains('scroll-reveal')) {
            el.classList.add('scroll-reveal');
            const delay = (i % 4);
            if (delay > 0) el.classList.add(`delay-${delay}`);
        }
    });

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });

    document.querySelectorAll('.scroll-reveal').forEach(el => observer.observe(el));
}

// Interceptar troca de abas para re-inicializar animações e calendário
(function patchTabSwitching() {
    document.addEventListener('click', function(e) {
        const btn = e.target.closest('.tab-button');
        if (!btn) return;
        const tab = btn.getAttribute('data-tab');
        if (tab === 'calendar') {
            setTimeout(() => {
                initCalendar();
                initScrollAnimations();
            }, 50);
        } else {
            setTimeout(initScrollAnimations, 50);
        }
    });
})();

// ---- INIT GERAL (QUANDO A PÁGINA CARREGA) ----);

function checkUpcomingReminders() {
    try {
        const userData = getCurrentUserData();
        const reminders = userData.reminders || [];
        const today = new Date();
        const in3days = new Date(); in3days.setDate(in3days.getDate() + 3);

        const upcoming = reminders.filter(r => {
            const d = new Date(r.date + 'T' + r.time);
            return d >= today && d <= in3days;
        });

        if (upcoming.length > 0) {
            setTimeout(() => {
                showToast(`Você tem ${upcoming.length} lembrete(s) nos próximos 3 dias`, 'info');
            }, 1500);
        }
    } catch(e) {}
}

// =============================================
// MODAL CALENDÁRIO - STIGA FINANCE
// =============================================

function openCalendarModal() {
    const modal = document.getElementById('calendarModal');
    if (!modal) return;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    initCalendar();
    renderRemindersList();
    // Definir data de hoje no input de lembrete
    const today = new Date().toISOString().split('T')[0];
    const ri = document.getElementById('reminderDate');
    if (ri && !ri.value) ri.value = today;
    // Hora padrão = agora + 1h
    const ri2 = document.getElementById('reminderTime');
    if (ri2 && !ri2.value) {
        const h = String(new Date().getHours() + 1).padStart(2,'0');
        ri2.value = `${h}:00`;
    }
}

function closeCalendarModal() {
    const modal = document.getElementById('calendarModal');
    if (!modal) return;
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

function closeCalendarModalOverlay(e) {
    if (e.target === e.currentTarget) closeCalendarModal();
}

// Atualizar badge de lembretes no header
function updateReminderBadge() {
    try {
        const userData = getCurrentUserData();
        const reminders = userData.reminders || [];
        const today = new Date().toISOString().split('T')[0];
        const pending = reminders.filter(r => r.date >= today).length;
        const badge = document.getElementById('reminderCount');
        if (!badge) return;
        if (pending > 0) {
            badge.textContent = pending;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    } catch(e) {}
}

// ESC para fechar
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeCalendarModal();
});

// Atualizar badge ao carregar);


// Garantir que tabs funcionam corretamente — patch do switchTab original);

// ========================================
// RECORRENTES - FUNÇÕES COMPLETAS
// ========================================
function showAddRecurring() {
    const modal = document.getElementById('recurringModal');
    if (modal) {
        modal.style.display = 'block';
        // força flex para centralizar
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        updateRecurringCategorySelect();
    }
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
                <span style="color:${r.type==='credit'?'var(--success)':'var(--danger)'}; font-weight:bold">
                    ${r.type==='credit'?'+':'-'}${formatCurrency(r.amount)}
                </span>
                <button onclick="deleteRecurring(${i})" class="delete-btn" style="padding:5px 10px;font-size:0.8em">×</button>
            </div>
        </div>
    `).join('');
}

// ================================================================
// RECORRENTES — EXECUÇÃO AUTOMÁTICA
// Ao entrar no sistema, verifica quais recorrentes devem ser 
// lançadas (por data) e as executa automaticamente
// ================================================================
function processRecurringTransactions() {
    if (!recurringTransactions || recurringTransactions.length === 0) return;

    const today = new Date();
    const todayDay = today.getDate();
    const todayMonth = today.getMonth();
    const todayYear = today.getFullYear();
    const todayStr = today.toISOString().split('T')[0]; // AAAA-MM-DD

    // Chave de controle: evita lançar duas vezes no mesmo dia
    const lastRunKey = `recurring_lastRun_${currentUser}`;
    const lastRun = localStorage.getItem(lastRunKey);
    if (lastRun === todayStr) return; // já rodou hoje

    let launched = 0;

    recurringTransactions.forEach(r => {
        const rDay = parseInt(r.day);
        let shouldLaunch = false;

        switch (r.frequency) {
            case 'daily':
                shouldLaunch = true;
                break;
            case 'weekly':
                // lança no dia da semana correspondente (1=seg...7=dom, rDay 1-7)
                shouldLaunch = (today.getDay() === (rDay % 7));
                break;
            case 'monthly':
                shouldLaunch = (todayDay === rDay);
                break;
            case 'yearly':
                // rDay aqui = dia do mês, e mês é salvo separadamente
                // Para yearly simples: lança sempre que o dia bate no mês atual
                shouldLaunch = (todayDay === rDay);
                break;
        }

        if (!shouldLaunch) return;

        // Verificar se já foi lançado hoje para essa recorrente
        const recKey = `rec_done_${currentUser}_${r.description}_${todayStr}`;
        if (localStorage.getItem(recKey)) return; // já lançado hoje

        // Lançar a transação
        const transaction = {
            amount: r.amount,
            category: r.category,
            date: todayStr,
            description: `[Recorrente] ${r.description}`,
            tags: ['recorrente'],
            recurring: true
        };

        if (r.type === 'credit') {
            credits.unshift(transaction);
        } else {
            debits.unshift(transaction);
        }

        // Marcar como lançado hoje
        localStorage.setItem(recKey, '1');
        launched++;
    });

    if (launched > 0) {
        saveAccounts();
        updateSummary();
        localStorage.setItem(lastRunKey, todayStr);
        showToast(`${launched} transação(ões) recorrente(s) lançada(s) automaticamente`, 'success');
        addNotification(
            'Recorrentes processadas',
            `${launched} transação(ões) recorrente(s) foram lançadas hoje`,
            'info'
        );
    } else {
        // Mesmo sem lançamentos, registrar que rodou hoje
        localStorage.setItem(lastRunKey, todayStr);
    }
}

function deleteRecurring(i) {
    if (!confirm('Remover esta transação recorrente?')) return;
    recurringTransactions.splice(i, 1);
    localStorage.setItem('recurring_' + currentUser, JSON.stringify(recurringTransactions));
    renderRecurringList();
    showToast('Recorrente removida', 'info');
}
// recurringForm configurado no DOMContentLoaded

// ========================================
// METAS - FUNÇÕES COMPLETAS
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
    if (!goals || goals.length === 0) {
        list.innerHTML = '<p class="no-data" style="color:var(--text-secondary);padding:20px 0;text-align:center;">Nenhuma meta definida</p>';
        return;
    }
    list.innerHTML = goals.map((g, i) => {
        const pct = Math.min((g.current / g.target) * 100, 100).toFixed(1);
        const remaining = g.target - g.current;
        return `
        <div class="goal-item">
            <div class="goal-header">
                <strong style="color:var(--gold-light)">${g.name}</strong>
                <button onclick="deleteGoal(${i})" class="delete-btn" style="padding:4px 10px;font-size:0.8em">×</button>
            </div>
            <div class="goal-progress-bar">
                <div class="goal-progress-fill" style="width:${pct}%"></div>
            </div>
            <div class="goal-details">
                <span>${formatCurrency(g.current)} de ${formatCurrency(g.target)}</span>
                <span style="color:${remaining <= 0 ? 'var(--success)':'var(--gold-primary)'}">${remaining <= 0 ? 'Meta atingida!' : 'Faltam ' + formatCurrency(remaining)}</span>
            </div>
            <div class="goal-actions">
                <input type="number" id="goalAdd_${i}" placeholder="Valor a adicionar" step="0.01"
                       style="flex:1; padding:6px 10px; background:rgba(0,0,0,0.3); border:1px solid var(--glass-border); border-radius:6px; color:var(--text-primary); font-size:0.9em;">
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
    localStorage.setItem('goals_' + currentUser, JSON.stringify(goals));
    renderGoalsList();
    showCategoryTotals(); // atualiza dashboard em tempo real
    if (inp) inp.value = '';        // atualiza lista no modal de config
    showCategoryTotals();     // atualiza dashboard imediatamente — sem reload
    if (inp) inp.value = '';  // limpa o campo após adicionar
    if (goals[i].current >= goals[i].target) {
        showToast('🏆 Meta "' + goals[i].name + '" atingida!', 'success');
    } else {
        const pct = Math.min((goals[i].current / goals[i].target) * 100, 100).toFixed(0);
        showToast('Progresso atualizado: ' + pct + '%', 'success');
    }
}
function deleteGoal(i) {
    if (!confirm('Remover esta meta?')) return;
    goals.splice(i, 1);
    localStorage.setItem('goals_' + currentUser, JSON.stringify(goals));
    renderGoalsList();
    showCategoryTotals(); // atualiza dashboard
    showToast('Meta removida', 'info');
}
// goalForm configurado no DOMContentLoaded

// ========================================
// VISÃO GERAL — ABA RESUMIDA
// ========================================
function updateOverviewTab() {
    try {
        const totalC = credits.reduce((s, c) => s + parseFloat(c.amount||0), 0);
        const totalD = debits.reduce((s, d) => s + parseFloat(d.amount||0), 0);
        const totalF = futurePurchases.reduce((s, f) => s + parseFloat(f.amount||0), 0);
        const balance = totalC - totalD;

        const el = (id, val) => { const e = document.getElementById(id); if(e) e.textContent = val; };
        el('ov-credits',  formatCurrency(totalC));
        el('ov-debits',   formatCurrency(totalD));
        el('ov-balance',  formatCurrency(balance));
        el('ov-future',   formatCurrency(totalF));
        el('ov-balance-card', formatCurrency(balance));

        // Top 3 categorias de débito
        const cats = {};
        debits.forEach(d => { cats[d.category] = (cats[d.category]||0) + parseFloat(d.amount||0); });
        const sorted = Object.entries(cats).sort((a,b) => b[1]-a[1]).slice(0,5);
        const catEl = document.getElementById('ov-categories');
        if (catEl) {
            if (sorted.length === 0) {
                catEl.innerHTML = '<p style="color:var(--text-secondary);text-align:center">Sem lançamentos</p>';
            } else {
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
                    </div>
                `).join('');
            }
        }

        // Últimas 5 transações
        const all = [
            ...credits.map(c => ({...c, _type:'credit'})),
            ...debits.map(d => ({...d, _type:'debit'}))
        ].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0,5);

        const recentEl = document.getElementById('ov-recent');
        if (recentEl) {
            recentEl.innerHTML = all.length === 0
                ? '<p style="color:var(--text-secondary);text-align:center">Sem transações recentes</p>'
                : all.map(t => `
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--glass-border)">
                        <div>
                            <div style="color:var(--text-primary);font-size:0.95em">${t.description}</div>
                            <div style="color:var(--text-secondary);font-size:0.8em">${t.category} • ${formatDate(t.date)}</div>
                        </div>
                        <span style="font-weight:600;color:${t._type==='credit'?'var(--success)':'var(--danger)'}">
                            ${t._type==='credit'?'+':'-'}${formatCurrency(t.amount)}
                        </span>
                    </div>
                `).join('');
        }

        // Orçamentos no overview
        const budgetEntries = Object.entries(budgets).slice(0,3);
        const ovBudgetEl = document.getElementById('ov-budgets');
        if (ovBudgetEl) {
            ovBudgetEl.innerHTML = budgetEntries.length === 0
                ? '<p style="color:var(--text-secondary);text-align:center;font-size:0.9em">Configure orçamentos nas Configurações</p>'
                : budgetEntries.map(([cat, lim]) => {
                    const spent = debits
                        .filter(d => d.category===cat && new Date(d.date).getMonth()===new Date().getMonth())
                        .reduce((s,d) => s+parseFloat(d.amount||0), 0);
                    const pct = Math.min(spent/lim*100, 100).toFixed(0);
                    const color = pct >= 100 ? 'var(--danger)' : pct >= 80 ? 'var(--warning)' : 'var(--success)';
                    return `
                        <div style="margin-bottom:12px">
                            <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                                <span style="color:var(--text-primary);font-size:0.9em">${cat}</span>
                                <span style="color:${color};font-size:0.85em">${pct}% de ${formatCurrency(lim)}</span>
                            </div>
                            <div style="height:5px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden">
                                <div style="height:100%;width:${pct}%;background:${color};border-radius:3px;transition:width 0.5s"></div>
                            </div>
                        </div>
                    `;
                }).join('');
        }

        // Metas no overview
        const ovGoalsEl = document.getElementById('ov-goals');
        if (ovGoalsEl) {
            ovGoalsEl.innerHTML = goals.length === 0
                ? '<p style="color:var(--text-secondary);text-align:center;font-size:0.9em">Crie metas nas Configurações</p>'
                : goals.slice(0,3).map(g => {
                    const pct = Math.min((g.current/g.target)*100, 100).toFixed(0);
                    return `
                        <div style="margin-bottom:12px">
                            <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                                <span style="color:var(--text-primary);font-size:0.9em">${g.name}</span>
                                <span style="color:var(--gold-primary);font-size:0.85em">${pct}%</span>
                            </div>
                            <div style="height:5px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden">
                                <div style="height:100%;width:${pct}%;background:var(--gold-primary);border-radius:3px;transition:width 0.5s"></div>
                            </div>
                        </div>
                    `;
                }).join('');
        }
    } catch(e) { console.error('updateOverviewTab:', e); }
}

// Atualizar aba overview quando ativada);

// updateOverviewTab é chamado automaticamente via listener de aba
// (sem redeclarar updateSummary para evitar erro de duplicata)

// ========================================
// INICIALIZAÇÃO DOM — ÚNICO LISTENER
// ========================================
document.addEventListener('DOMContentLoaded', function() {

    // Configurar form de RECORRENTES
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
            localStorage.setItem('recurring_' + currentUser, JSON.stringify(recurringTransactions));
            renderRecurringList();
            closeRecurringModal();
            e.target.reset();
            updateRecurringCategorySelect();
            showToast('Transação recorrente criada!', 'success');
        };
    }

    // Configurar form de METAS
    const goalFormEl = document.getElementById('goalForm');
    if (goalFormEl) {
        goalFormEl.onsubmit = function(e) {
            e.preventDefault();
            const name     = document.getElementById('goalName')?.value?.trim();
            const target   = parseFloat(document.getElementById('goalTarget')?.value);
            const deadline = document.getElementById('goalDeadline')?.value;
            if (!name || !target || target <= 0) { showToast('Preencha nome e valor da meta', 'error'); return; }
            goals.push({ name, target, current: 0, deadline: deadline || null, createdAt: new Date().toISOString() });
            localStorage.setItem('goals_' + currentUser, JSON.stringify(goals));
            renderGoalsList();
            showCategoryTotals(); // atualiza dashboard imediatamente
            closeGoalModal();
            e.target.reset();
            showToast('Meta criada com sucesso!', 'success');
        };
    }


    // 1. Configurar TABS
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.addEventListener('click', function() {
            const tab = this.getAttribute('data-tab');
            if (!tab) return;
            document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            const target = document.getElementById(tab);
            if (target) target.classList.add('active');
        });
    });

    // Garantir que Créditos começa ativo
    const firstBtn = document.querySelector('.tab-button[data-tab="credits"]');
    const firstContent = document.getElementById('credits');
    if (firstBtn && firstContent) {
        document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        firstBtn.classList.add('active');
        firstContent.classList.add('active');
    }

    // 2. Scroll animations
    setTimeout(initScrollAnimations, 600);

    // 3. Badge de lembretes
    setTimeout(updateReminderBadge, 1000);

    // 4. Checar lembretes próximos
    setTimeout(checkUpcomingReminders, 1500);
});
