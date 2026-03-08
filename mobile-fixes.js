// ================================================================
// STIGA FINANCE - MOBILE FIXES (JavaScript)
// ================================================================

(function () {
    'use strict';

    // Atualiza cor dos SVGs conforme aba ativa
    function updateNavIcons() {
        document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
            const svgs = btn.querySelectorAll('svg');
            const isActive = btn.classList.contains('active');
            const color = isActive ? '#E2BE45' : 'rgba(255,255,255,0.6)';
            svgs.forEach(svg => {
                svg.setAttribute('stroke', color);
                svg.querySelectorAll('circle[fill]').forEach(c => c.setAttribute('fill', color));
            });
        });
    }

    // Função central de navegação mobile — única fonte da verdade
    function mobileNavigate(tabName) {
        // 1. Atualizar estado do bottom nav
        document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active'));
        const map = { credits:'mbnCredits', debits:'mbnDebits', future:'mbnFuture', overview:'mbnOverview' };
        const btn = document.getElementById(map[tabName]);
        if (btn) btn.classList.add('active');
        updateNavIcons();

        // 2. Overview = scroll até os cards do topo (não é tab)
        if (tabName === 'overview') {
            const dash = document.getElementById('dashboard-area');
            if (dash) dash.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
        }

        // 3. Mostrar a tab correta (sem chamar navigateToTab para evitar conflito de scroll)
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

        // 4. Renderizar dados da tab
        if (typeof renderLists === 'function' && ['credits','debits','future'].includes(tabName)) renderLists();
        if (tabName === 'recurring' && typeof renderRecurring === 'function') { if(typeof syncRecurringMain==='function') syncRecurringMain(); renderRecurring(); }
        if (tabName === 'budgets'   && typeof renderBudgets   === 'function') { if(typeof syncBudgetsMain  ==='function') syncBudgetsMain();   renderBudgets(); }
        if (tabName === 'goals'     && typeof renderGoals     === 'function') { if(typeof syncGoalsMain    ==='function') syncGoalsMain();     renderGoals(); renderGoalsList && renderGoalsList(); }

        // 5. Fechar sidebar se aberta
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        if (sidebar) sidebar.classList.remove('active');
        if (overlay) overlay.classList.remove('active');

        // 6. Scroll ao topo — único, sem conflito
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function initMobile() {
        if (window.innerWidth > 768) return;

        // Garantir aba inicial visível
        const firstActive = document.querySelector('.tab-button.active');
        const firstTab = firstActive ? firstActive.getAttribute('data-tab') : 'credits';
        const firstContent = document.getElementById(firstTab);
        if (firstContent) {
            firstContent.classList.add('active');
            firstContent.style.display = 'block';
        }

        // Sincronizar bottom nav inicial
        if (typeof syncMobileNav === 'function') syncMobileNav(firstTab);
        updateNavIcons();

        // Substituir mobileNavTo pela versão sem conflito
        window.mobileNavTo = mobileNavigate;

        // Interceptar cliques na sidebar para também fazer scroll ao topo
        document.querySelectorAll('.sidebar .tab-button').forEach(btn => {
            btn.addEventListener('click', function() {
                const tabName = this.getAttribute('data-tab');
                if (!tabName || tabName === 'calendar' || tabName === 'settings') return;
                // Pequeno delay para deixar o navigateToTab (onclick) executar primeiro
                setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 150);
            });
        });

        console.log('✅ Mobile iniciado — aba:', firstTab);
    }

    window.addEventListener('load', function () {
        setTimeout(initMobile, 800);
    });

})();
