// ================================================================
// STIGA FINANCE - MOBILE FIXES (JavaScript)
// ================================================================

(function () {
    'use strict';

    function updateNavIcons() {
        document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
            const isActive = btn.classList.contains('active');
            const color = isActive ? '#E2BE45' : 'rgba(255,255,255,0.6)';
            btn.querySelectorAll('svg').forEach(svg => {
                svg.setAttribute('stroke', color);
                svg.querySelectorAll('circle[fill]').forEach(c => c.setAttribute('fill', color));
            });
        });
    }

    // Scroll preciso até o início da aba, compensando header fixo
    function scrollToTab(tabName) {
        const tab = document.getElementById(tabName);
        if (!tab) return;

        // Pega o primeiro elemento filho visível da tab
        const target = tab.querySelector('.form-section') || tab.querySelector('h2') || tab;
        const headerH = 60; // altura do header fixo

        // Calcula posição absoluta do elemento na página
        const rect = target.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const absoluteTop = rect.top + scrollTop - headerH - 8;

        window.scrollTo({ top: absoluteTop, behavior: 'smooth' });
    }

    function mobileNavigate(tabName) {
        // Atualizar bottom nav
        document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active'));
        const map = { credits:'mbnCredits', debits:'mbnDebits', future:'mbnFuture', overview:'mbnOverview' };
        const navBtn = document.getElementById(map[tabName]);
        if (navBtn) navBtn.classList.add('active');
        updateNavIcons();

        // Dashboard = scroll até os cards do topo
        if (tabName === 'overview') {
            const dash = document.getElementById('dashboard-area');
            if (dash) {
                const rect = dash.getBoundingClientRect();
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                window.scrollTo({ top: rect.top + scrollTop - 60, behavior: 'smooth' });
            }
            return;
        }

        // Trocar tab visível
        document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
        const activeBtn = document.querySelector(`.tab-button[data-tab="${tabName}"]`);
        if (activeBtn) activeBtn.classList.add('active');

        document.querySelectorAll('.tab-content').forEach(t => {
            t.classList.remove('active');
            t.style.display = 'none';
        });
        const content = document.getElementById(tabName);
        if (content) {
            content.classList.add('active');
            content.style.display = 'block';
        }

        // Renderizar dados
        try {
            if (['credits','debits','future'].includes(tabName) && typeof renderLists === 'function') renderLists();
            if (tabName === 'recurring') { if(typeof syncRecurringMain==='function') syncRecurringMain(); if(typeof renderRecurring==='function') renderRecurring(); }
            if (tabName === 'budgets')   { if(typeof syncBudgetsMain==='function')   syncBudgetsMain();   if(typeof renderBudgets==='function')   renderBudgets(); }
            if (tabName === 'goals')     { if(typeof syncGoalsMain==='function')     syncGoalsMain();     if(typeof renderGoals==='function')     renderGoals(); if(typeof renderGoalsList==='function') renderGoalsList(); }
        } catch(e) { console.warn('render:', e); }

        // Fechar sidebar
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        if (sidebar) sidebar.classList.remove('active');
        if (overlay) overlay.classList.remove('active');

        // Scroll preciso até o formulário — após a tab estar visível
        setTimeout(() => scrollToTab(tabName), 60);
    }

    function initMobile() {
        if (window.innerWidth > 768) return;

        // Aba inicial
        const firstActive = document.querySelector('.tab-button.active');
        const firstTab = firstActive ? firstActive.getAttribute('data-tab') : 'credits';
        const firstContent = document.getElementById(firstTab);
        if (firstContent) { firstContent.classList.add('active'); firstContent.style.display = 'block'; }

        if (typeof syncMobileNav === 'function') syncMobileNav(firstTab);
        updateNavIcons();

        // Substituir mobileNavTo
        window.mobileNavTo = mobileNavigate;

        // Sidebar: botões Recorrentes, Orçamentos, Metas (chamam navigateToTab via onclick)
        // Adicionamos apenas o scroll preciso depois
        document.querySelectorAll('.sidebar .tab-button').forEach(btn => {
            btn.addEventListener('click', function() {
                const tabName = this.getAttribute('data-tab');
                if (!tabName || tabName === 'calendar' || tabName === 'settings') return;
                const sidebar = document.getElementById('sidebar');
                const overlay = document.getElementById('sidebarOverlay');
                if (sidebar) sidebar.classList.remove('active');
                if (overlay) overlay.classList.remove('active');
                // navigateToTab já rodou via onclick — só fazemos o scroll
                setTimeout(() => scrollToTab(tabName), 120);
            });
        });

        console.log('✅ Mobile — aba inicial:', firstTab);
    }

    window.addEventListener('load', () => setTimeout(initMobile, 800));

})();
