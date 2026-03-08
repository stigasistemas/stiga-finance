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

    // Scroll até o formulário da aba ativa
    function scrollToTabContent(tabName) {
        // Tenta scrollar até o form-section da aba
        const tab = document.getElementById(tabName);
        if (!tab) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }

        const formSection = tab.querySelector('.form-section, .section-header, h2');
        const target = formSection || tab;

        // Usa scrollIntoView para garantir que vai até lá
        setTimeout(() => {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            // Ajuste extra para não ficar atrás do header fixo (56px)
            setTimeout(() => {
                window.scrollBy({ top: -64, behavior: 'smooth' });
            }, 300);
        }, 80);
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
            if (dash) {
                setTimeout(() => dash.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
            }
            return;
        }

        // 3. Mostrar a tab correta
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
        try {
            if (['credits','debits','future'].includes(tabName) && typeof renderLists === 'function') renderLists();
            if (tabName === 'recurring' && typeof renderRecurring === 'function') { if(typeof syncRecurringMain==='function') syncRecurringMain(); renderRecurring(); }
            if (tabName === 'budgets'   && typeof renderBudgets   === 'function') { if(typeof syncBudgetsMain  ==='function') syncBudgetsMain();   renderBudgets(); }
            if (tabName === 'goals'     && typeof renderGoals     === 'function') { if(typeof syncGoalsMain    ==='function') syncGoalsMain();     renderGoals(); if(typeof renderGoalsList==='function') renderGoalsList(); }
        } catch(e) { console.warn('Render error:', e); }

        // 5. Fechar sidebar se aberta
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        if (sidebar) sidebar.classList.remove('active');
        if (overlay) overlay.classList.remove('active');

        // 6. Scroll até o formulário da aba
        scrollToTabContent(tabName);
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

        // Substituir mobileNavTo pela versão centralizada
        window.mobileNavTo = mobileNavigate;

        // Interceptar cliques na sidebar (Recorrentes, Orçamentos, Metas, etc.)
        // Esses botões chamam navigateToTab via onclick — precisamos adicionar o scroll depois
        document.querySelectorAll('.sidebar .tab-button').forEach(btn => {
            btn.addEventListener('click', function() {
                const tabName = this.getAttribute('data-tab');
                if (!tabName || tabName === 'calendar' || tabName === 'settings') return;
                // Fechar sidebar e scrollar até o form
                const sidebar = document.getElementById('sidebar');
                const overlay = document.getElementById('sidebarOverlay');
                if (sidebar) sidebar.classList.remove('active');
                if (overlay) overlay.classList.remove('active');
                scrollToTabContent(tabName);
            });
        });

        console.log('✅ Mobile iniciado — aba:', firstTab);
    }

    window.addEventListener('load', function () {
        setTimeout(initMobile, 800);
    });

})();
