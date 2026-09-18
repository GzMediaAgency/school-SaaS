// js/auth.js
// المصادقة عبر Supabase (كل عميل ينشئ حسابه الخاص ويحصل على قاعدة بياناته المعزولة)

class AuthManager {
    constructor() {
        this.mode = 'login'; // 'login' | 'signup'
        this.form = document.getElementById('authForm');
        this.errorMessage = document.getElementById('errorMessage');
        this.institutionGroup = document.getElementById('institutionGroup');
        this.submitBtn = document.getElementById('authSubmitBtn');
        this.toggleLink = document.getElementById('authToggleLink');
        this.title = document.getElementById('authTitle');
        this.subtitle = document.getElementById('authSubtitle');
        this.init();
    }

    async init() {
        const { data: { session } } = await sb.auth.getSession();
        if (session) {
            this.redirectToDashboard();
            return;
        }

        if (this.form) {
            this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        }
        if (this.toggleLink) {
            this.toggleLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.setMode(this.mode === 'login' ? 'signup' : 'login');
            });
        }
    }

    setMode(mode) {
        this.mode = mode;
        const isSignup = mode === 'signup';

        if (this.institutionGroup) this.institutionGroup.style.display = isSignup ? 'block' : 'none';
        if (this.submitBtn) this.submitBtn.textContent = isSignup ? 'إنشاء الحساب' : 'تسجيل الدخول';
        if (this.title) this.title.textContent = isSignup ? 'إنشاء حساب جديد' : 'نظام إدارة المؤسسة';
        if (this.subtitle) {
            this.subtitle.textContent = isSignup
                ? 'ابدأ نسختك التجريبية المجانية لمدة 15 يوماً'
                : 'مرحباً بك، يرجى تسجيل الدخول للمتابعة';
        }
        if (this.toggleLink) {
            this.toggleLink.textContent = isSignup ? 'لديك حساب بالفعل؟ سجّل الدخول' : 'مؤسسة جديدة؟ أنشئ حساباً';
        }
        this.hideError();
    }

    async handleSubmit(e) {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        if (!email || !password) {
            this.showError('يرجى ملء جميع الحقول');
            return;
        }

        if (this.mode === 'signup') {
            await this.handleSignup(email, password);
        } else {
            await this.handleLogin(email, password);
        }
    }

    async handleSignup(email, password) {
        const institutionName = (document.getElementById('institutionName')?.value || '').trim();

        if (password.length < 6) {
            this.showError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
            return;
        }

        const { data, error } = await sb.auth.signUp({
            email,
            password,
            options: {
                data: { school_name: institutionName || 'المؤسسة التكوينية' }
            }
        });

        if (error) {
            this.showError(this.translateError(error.message));
            return;
        }

        if (data.session) {
            this.showToast('تم إنشاء الحساب بنجاح، مرحباً بك 🎉', 'success');
            setTimeout(() => this.redirectToDashboard(), 800);
        } else {
            // تفعيل البريد الإلكتروني مفعّل في إعدادات Supabase : يجب تأكيد البريد أولاً
            this.showToast('تم إنشاء الحساب. تحقق من بريدك الإلكتروني لتأكيده ثم سجّل الدخول', 'success');
            this.setMode('login');
        }
    }

    async handleLogin(email, password) {
        const { error } = await sb.auth.signInWithPassword({ email, password });

        if (error) {
            this.showError('البريد الإلكتروني أو كلمة المرور غير صحيحة');
            return;
        }

        this.showToast('تم تسجيل الدخول بنجاح', 'success');
        setTimeout(() => this.redirectToDashboard(), 500);
    }

    translateError(message) {
        if (/already registered/i.test(message)) return 'هذا البريد الإلكتروني مسجَّل بالفعل';
        if (/password/i.test(message)) return 'كلمة المرور غير صالحة (6 أحرف على الأقل)';
        return 'تعذّر إنشاء الحساب، حاول مرة أخرى';
    }

    redirectToDashboard() {
        window.location.href = 'dashboard.html';
    }

    showError(message) {
        if (this.errorMessage) {
            this.errorMessage.textContent = message;
            this.errorMessage.classList.add('show');
            setTimeout(() => this.errorMessage.classList.remove('show'), 4000);
        }
    }

    hideError() {
        if (this.errorMessage) this.errorMessage.classList.remove('show');
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

        const icons = { success: '✓', error: '✗', info: 'ℹ' };
        toast.innerHTML = `
            <div class="toast-icon">${icons[type]}</div>
            <div class="toast-message">${message}</div>
        `;

        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(400px)';
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    }
}

const authManager = new AuthManager();
