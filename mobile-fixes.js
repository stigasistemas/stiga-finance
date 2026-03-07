// ================================================================
// STIGA FINANCE - MOBILE FIXES (JavaScript)
// Nota: toggleSidebar, mobileNavTo, syncMobileNav e setupTabs
// já estão corrigidos no script.js principal.
// Este arquivo apenas garante a inicialização mobile após o app.
// ================================================================

(function () {
    'use strict';

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

        // Sincronizar bottom nav com aba inicial
        if (typeof syncMobileNav === 'function') {
            syncMobileNav(firstTab);
        }

        console.log('✅ Mobile iniciado — aba:', firstTab);
    }

    // Aguarda o app carregar (Firebase + initApp levam ~800ms)
    window.addEventListener('load', function () {
        setTimeout(initMobile, 1000);
    });

})();
