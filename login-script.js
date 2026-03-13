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

// ========================================
// RATE LIMITING — Proteção contra força bruta
// ========================================
const RATE_LIMIT = {
    MAX_ATTEMPTS: 5,
    BLOCK_DURATION_MS: 5 * 60 * 1000, // 5 minutos

    getKey() { return 'stiga_login_rl'; },

    getData() {
        try {
            return JSON.parse(sessionStorage.getItem(this.getKey())) || { attempts: 0, blockedUntil: null };
        } catch { return { attempts: 0, blockedUntil: null }; }
    },

    save(data) {
        sessionStorage.setItem(this.getKey(), JSON.stringify(data));
    },

    isBlocked() {
        const data = this.getData();
        if (data.blockedUntil && Date.now() < data.blockedUntil) {
            const remaining = Math.ceil((data.blockedUntil - Date.now()) / 1000 / 60);
            return { blocked: true, remaining };
        }
        // Expirou o bloqueio — resetar
        if (data.blockedUntil && Date.now() >= data.blockedUntil) {
            this.reset();
        }
        return { blocked: false };
    },

    increment() {
        const data = this.getData();
        data.attempts += 1;
        if (data.attempts >= this.MAX_ATTEMPTS) {
            data.blockedUntil = Date.now() + this.BLOCK_DURATION_MS;
        }
        this.save(data);
        return data.attempts;
    },

    reset() {
        sessionStorage.removeItem(this.getKey());
    }
};

// Inicializar Firebase
let auth = null;
let db = null;

document.addEventListener('DOMContentLoaded', function() {
    if (typeof firebase === 'undefined') {
        showToast('Erro ao carregar sistema de autenticação', 'error');
        return;
    }

    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        auth = firebase.auth();
        db = firebase.firestore();

        auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {});

    } catch (error) {
        showToast('Erro de configuração. Contate o suporte.', 'error');
    }

    // Verificar se já está logado
    auth.onAuthStateChanged(user => {
        if (user) {
            localStorage.setItem('currentUser', user.email);
            window.location.href = 'index.html';
        } else {
            loadRememberedEmail();
        }
    });

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

    // ── Verificar rate limit ANTES de qualquer coisa ──
    const limitStatus = RATE_LIMIT.isBlocked();
    if (limitStatus.blocked) {
        showToast(`⏰ Muitas tentativas. Aguarde ${limitStatus.remaining} min.`, 'error');
        return;
    }

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
        const persistenceType = remember
            ? firebase.auth.Auth.Persistence.LOCAL
            : firebase.auth.Auth.Persistence.SESSION;

        await auth.setPersistence(persistenceType);

        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Login bem-sucedido — resetar contador
        RATE_LIMIT.reset();

        localStorage.setItem('currentUser', user.email);

        if (remember) {
            localStorage.setItem('rememberedEmail', email);
        } else {
            localStorage.removeItem('rememberedEmail');
        }

        showToast('✅ Login realizado com sucesso!', 'success');

        setTimeout(() => {
            window.location.href = 'index.html';
        }, 500);

    } catch (error) {
        hideLoading();

        // Incrementar tentativas falhas
        const attempts = RATE_LIMIT.increment();
        const remaining = RATE_LIMIT.MAX_ATTEMPTS - attempts;

        let message = 'Erro ao fazer login';
        switch (error.code) {
            case 'auth/invalid-email':
                message = '❌ Email inválido';
                break;
            case 'auth/user-disabled':
                message = '🚫 Usuário desabilitado. Contate o suporte.';
                break;
            case 'auth/user-not-found':
            case 'auth/wrong-password':
            case 'auth/invalid-credential':
                // Mensagem genérica — não revela se é email ou senha
                message = remaining > 0
                    ? `🔑 Credenciais inválidas. ${remaining} tentativa(s) restante(s).`
                    : '🔒 Conta bloqueada por 5 minutos.';
                break;
            case 'auth/too-many-requests':
                message = '⏰ Muitas tentativas. Tente novamente mais tarde.';
                RATE_LIMIT.reset(); // Firebase já bloqueou
                break;
            case 'auth/network-request-failed':
                message = '🌐 Erro de conexão. Verifique sua internet.';
                break;
            default:
                message = '❌ Erro ao fazer login. Tente novamente.';
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
        if (emailInput) emailInput.value = rememberedEmail;
        if (rememberCheckbox) rememberCheckbox.checked = true;
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
    let toast = document.getElementById('loginToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'loginToast';
        toast.className = 'login-toast';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = 'login-toast show ' + type;
    setTimeout(() => { toast.classList.remove('show'); }, 3500);
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

// ========================================
// PARTÍCULAS (visual)
// ========================================
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