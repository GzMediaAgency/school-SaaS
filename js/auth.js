// js/auth.js
class AuthManager {
    constructor() {
        this.loginForm = document.getElementById('loginForm');
        this.errorMessage = document.getElementById('errorMessage');
        this.init();
    }

    async init() {
        // Vérifier si déjà connecté
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
            this.redirectToDashboard();
            return;
        }

        if (this.loginForm) {
            this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        
        if (!email || !password) {
            this.showError('يرجى ملء جميع الحقول');
            return;
        }

        const btn = document.querySelector('.btn-login');
        btn.textContent = 'جاري تسجيل الدخول...';
        btn.disabled = true;

        const result = await db.login(email, password);

        if (result.success) {
            this.showToast('تم تسجيل الدخول بنجاح', 'success');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 800);
        } else {
            this.showError(result.error);
            btn.textContent = 'تسجيل الدخول';
            btn.disabled = false;
        }
    }

    isLoggedIn() {
        return sessionStorage.getItem('currentUser') !== null;
    }

    getCurrentUser() {
        const userStr = sessionStorage.getItem('currentUser');
        return userStr ? JSON.parse(userStr) : null;
    }

    async logout() {
        await db.logout();
        window.location.href = 'index.html';
    }

    redirectToDashboard() {
        window.location.href = 'dashboard.html';
    }

    showError(message) {
        if (this.errorMessage) {
            this.errorMessage.textContent = message;
            this.errorMessage.classList.add('show');
            setTimeout(() => {
                this.errorMessage.classList.remove('show');
            }, 3000);
        }
    }

    showToast(message, type = 'info') {
        let toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toastContainer';
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
        }
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const icons = {
            success: '✓',
            error: '✗',
            info: 'ℹ'
        };
        toast.innerHTML = `
            <div class="toast-icon">${icons[type]}</div>
            <div class="toast-message">${message}</div>
        `;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(400px)';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }
}

// Initialisation
const authManager = new AuthManager();