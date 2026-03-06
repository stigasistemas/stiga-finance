// ========================================
// STIGA FINANCE — VERSÃO COMERCIAL
// Login com Firebase Authentication + Persistência
// ========================================

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyA3sqLG4T5UkRviauT8A4xo5SN59uWvrAs",
  authDomain: "stiga-finance-72dbf.firebaseapp.com",
  projectId: "stiga-finance-72dbf",
  storageBucket: "stiga-finance-72dbf.firebasestorage.app",
  messagingSenderId: "148799450086",
  appId: "1:148799450086:web:743faed370d44b146ac427"
};

// Inicializar Firebase (será carregado via CDN no HTML)
let auth = null;
let db = null;

document.addEventListener('DOMContentLoaded', function() {
    // Verificar se Firebase foi carregado
    if (typeof firebase === 'undefined') {
        console.error('Firebase não carregado. Adicione os scripts no HTML.');
        showToast('Erro ao carregar sistema de autenticação', 'error');
        return;
    }

    // Inicializar Firebase
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        auth = firebase.auth();
        db = firebase.firestore();
        
        // CONFIGURAR PERSISTÊNCIA (MANTER LOGADO)
        auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
            .then(() => {
                console.log('✅ Persistência configurada: LOCAL');
            })
            .catch((error) => {
                console.error('Erro ao configurar persistência:', error);
            });
        
        console.log('Firebase inicializado com sucesso');
    } catch (error) {
        console.error('Erro ao inicializar Firebase:', error);
        showToast('Erro de configuração. Contate o suporte.', 'error');
    }

    // Verificar se já está logado
    auth.onAuthStateChanged(user => {
        if (user) {
            console.log('✅ Usuário já está logado:', user.email);
            // Salvar email para referência
            localStorage.setItem('currentUser', user.email);
            // Redirecionar para app
            window.location.href = 'index.html';
        } else {
            console.log('⚠️ Nenhum usuário logado');
            // Carregar email salvo (se tiver)
            loadRememberedEmail();
        }
    });

    // Configurar formulário de login
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
});

// ========================================
// FUNÇÃO DE LOGIN
// ========================================
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginUsername')?.value?.trim();
    const password = document.getElementById('loginPassword')?.value;
    const remember = document.getElementById('rememberMe')?.checked;

    if (!email || !password) {
        showToast('Preencha email e senha', 'error');
        return;
    }

    if (!auth) {
        showToast('Sistema de autenticação não inicializado', 'error');
        return;
    }

    showLoading();

    try {
        // ESCOLHER TIPO DE PERSISTÊNCIA
        const persistenceType = remember 
            ? firebase.auth.Auth.Persistence.LOCAL  // Mantém logado mesmo fechando navegador
            : firebase.auth.Auth.Persistence.SESSION; // Só mantém logado na sessão atual
        
        // Configurar persistência ANTES de fazer login
        await auth.setPersistence(persistenceType);
        console.log('📌 Persistência definida:', remember ? 'LOCAL (lembrar)' : 'SESSION (só esta sessão)');
        
        // Autenticar com Firebase
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Salvar email no localStorage (para referência rápida)
        localStorage.setItem('currentUser', user.email);
        
        // Se marcou "lembrar-me", salvar email para preencher depois
        if (remember) {
            localStorage.setItem('rememberedEmail', email);
            console.log('💾 Email salvo para próximo login');
        } else {
            localStorage.removeItem('rememberedEmail');
        }

        showToast('✅ Login realizado com sucesso!', 'success');
        
        // Redirecionar após 500ms
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 500);

    } catch (error) {
        hideLoading();
        console.error('Erro no login:', error);
        
        let message = 'Erro ao fazer login';
        switch (error.code) {
            case 'auth/invalid-email':
                message = '❌ Email inválido';
                break;
            case 'auth/user-disabled':
                message = '🚫 Usuário desabilitado. Contate o suporte.';
                break;
            case 'auth/user-not-found':
                message = '❌ Usuário não encontrado. Verifique seu email.';
                break;
            case 'auth/wrong-password':
                message = '🔑 Senha incorreta';
                break;
            case 'auth/too-many-requests':
                message = '⏰ Muitas tentativas. Tente novamente mais tarde.';
                break;
            case 'auth/network-request-failed':
                message = '🌐 Erro de conexão. Verifique sua internet.';
                break;
            default:
                message = 'Erro: ' + error.message;
        }
        
        showToast(message, 'error');
    }
}

// ========================================
// CARREGAR EMAIL SALVO
// ========================================
function loadRememberedEmail() {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
        const emailInput = document.getElementById('loginUsername');
        const rememberCheckbox = document.getElementById('rememberMe');
        
        if (emailInput) {
            emailInput.value = rememberedEmail;
            console.log('📧 Email pré-preenchido:', rememberedEmail);
        }
        
        if (rememberCheckbox) {
            rememberCheckbox.checked = true;
        }
    }
}

// ========================================
// UTILITÁRIOS
// ========================================
function showLoading() {
    const btn = document.querySelector('.btn-submit');
    if (btn) {
        btn.disabled = true;
        btn.style.opacity = '0.6';
        btn.style.cursor = 'wait';
        btn.innerHTML = '<span>Entrando...</span>';
    }
}

function hideLoading() {
    const btn = document.querySelector('.btn-submit');
    if (btn) {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
        btn.innerHTML = `<span>Entrar no Sistema</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
            </svg>`;
    }
}

function showToast(message, type = 'info') {
    // Criar toast se não existir
    let toast = document.getElementById('loginToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'loginToast';
        toast.className = 'login-toast';
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.className = 'login-toast show ' + type;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function togglePasswordVisibility(inputId, button) {
    const input = document.getElementById(inputId);
    if (!input) return;

    if (input.type === 'password') {
        input.type = 'text';
        button.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
            <line x1="1" y1="1" x2="23" y2="23"/>
        </svg>`;
    } else {
        input.type = 'password';
        button.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
        </svg>`;
    }
}

// Particles animation (opcional - visual)
class Particle {
    constructor(canvas) {
        this.canvas = canvas;
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.size = Math.random() * 2 + 1;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0 || this.x > this.canvas.width) this.vx *= -1;
        if (this.y < 0 || this.y > this.canvas.height) this.vy *= -1;
    }
    draw(ctx) {
        ctx.fillStyle = 'rgba(212, 175, 55, 0.3)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

const canvas = document.getElementById('particles');
if (canvas) {
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const particles = Array.from({ length: 50 }, () => new Particle(canvas));
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => { p.update(); p.draw(ctx); });
        requestAnimationFrame(animate);
    }
    animate();
    window.addEventListener('resize', () => {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
    });
}

console.log('✅ Sistema de login carregado!');
console.log('📌 Persistência: Firebase Auth gerencia sessões automaticamente');
console.log('💡 Marque "Lembrar-me" para manter login mesmo fechando o navegador');
