// ================================================================
// STIGA FINANCE - CORREÇÕES MOBILE (JavaScript)
// Adicione este código no FINAL do script.js
// ================================================================

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
