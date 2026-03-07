// ================================================================
// STIGA FINANCE - MOBILE FIXES (JavaScript)
// Tudo que é mobile fica aqui. Não alterar script.js.
// ================================================================

(function () {
    'use strict';

    // ============================================================
    // TOGGLE SIDEBAR (drawer mobile)
    // Sobrescreve a versão do script.js que usa .sidebar-pro
    // ============================================================
    window.toggleSidebar = function () {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        const toggle  = document.getElementById('sidebarToggle');
        if (!sidebar) return;
        sidebar.classList.toggle('active');
        if (overlay) overlay.classList.toggle('active');
        if (toggle)  toggle.classList.toggle('active');
    };

    // ============================================================
    // MOBILE NAV — bottom navigation bar
    // ============================================================
    window.mobileNavTo = function (tabName) {
        // Atualizar botões do bottom nav
        document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active'));
        const map = { credits: 'mbnCredits', debits: 'mbnDebits', future: 'mbnFuture', overview: 'mbnOverview' };
        const btn = document.getElementById(map[tabName]);
        if (btn) btn.classList.add('active');

        // Navegar usando a função principal
        if (typeof navigateToTab === 'function') {
            navigateToTab(tabName);
        }
    };

    window.syncMobileNav = function (tabName) {
        document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active'));
        const map = { credits: 'mbnCredits', debits: 'mbnDebits', future: 'mbnFuture', overview: 'mbnOverview' };
        const btn = document.getElementById(map[tabName]);
        if (btn) btn.classList.add('active');
    };

    // ============================================================
    // PATCH setupTabs — garante que conteúdo renderiza ao clicar
    // e sincroniza o bottom nav
    // ============================================================
    function patchSetupTabs() {
        document.querySelectorAll('.tab-button').forEach(btn => {
            // Remover listeners antigos clonando o elemento
            const clone = btn.cloneNode(true);
            btn.parentNode.replaceChild(clone, btn);
        });

        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.addEventListener('click', function () {
                const tabId = this.getAttribute('data-tab');
                if (!tabId || tabId === 'calendar' || tabId === 'settings') return;
                if (typeof navigateToTab === 'function') {
                    navigateToTab(tabId);
                }
                syncMobileNav(tabId);
            });
        });

        // Garantir que a aba ativa inicial está visível
        const firstActive = document.querySelector('.tab-button.active');
        const firstTab = firstActive ? firstActive.getAttribute('data-tab') : 'credits';
        const firstContent = document.getElementById(firstTab);
        if (firstContent) {
            firstContent.classList.add('active');
            firstContent.style.display = 'block';
        }
    }

    // ============================================================
    // INICIALIZAÇÃO MOBILE
    // ============================================================
    function initMobile() {
        if (window.innerWidth > 768) return; // só roda no mobile

        patchSetupTabs();
        syncMobileNav('credits'); // aba padrão
        console.log('✅ Mobile fixes carregados');
    }

    // Esperar o app principal inicializar antes de patchear
    // initApp() é chamado após loadAllDataFromFirestore()
    const originalInitApp = window.initApp;
    if (typeof originalInitApp === 'function') {
        window.initApp = function () {
            originalInitApp.apply(this, arguments);
            initMobile();
        };
    } else {
        // Fallback: aguardar DOMContentLoaded + delay
        document.addEventListener('DOMContentLoaded', function () {
            setTimeout(initMobile, 800);
        });
    }

    // Também rodar se o DOM já carregou
    if (document.readyState !== 'loading') {
        setTimeout(initMobile, 800);
    }

})();
