// js/auth.js
class AuthManager {
    constructor() {
        this.loginForm = document.getElementById('loginForm');
        this.errorMessage = document.getElementById('errorMessage');
        this.init();
    }

    async init() {
        // Si une session Supabase existe déjà → dashboard directement
        if (typeof supabaseClient !== 'undefined') {
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (session) {
                window.location.href = 'dashboard.html';
                return;
            }
        }
        if (this.loginForm) {
            this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
    }

    async handleLogin(e) {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const btn = document.getElementById('loginBtn');

        if (!email || !password) {
            this.showError('يرجى ملء جميع الحقول');
            return;
        }

        btn.disabled = true;
        btn.textContent = 'جاري تسجيل الدخول...';

        try {
            // 1. Connexion Supabase
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) throw error;

            // 2. Récupérer le profil
            const { data: profile } = await supabaseClient
                .from('profiles')
                .select('*')
                .eq('id', data.user.id)
                .single();

            // 3. Récupérer l'abonnement
            const { data: sub } = await supabaseClient
                .from('subscriptions')
                .select('*')
                .eq('user_id', data.user.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (!sub) {
                this.showError('لا يوجد اشتراك لهذا الحساب. يرجى إنشاء حساب جديد.');
                btn.disabled = false;
                btn.textContent = 'تسجيل الدخول';
                return;
            }

            // 4. Vérifier la validité de l'abonnement
            const expired = new Date(sub.end_date) < new Date();
            if (expired || sub.status !== 'active') {
                // Stocker quand même la session pour la page payment
                sessionStorage.setItem('currentUser', JSON.stringify({
                    uid: data.user.id,
                    email: email,
                    full_name: profile?.full_name || '',
                    org_name: profile?.org_name || '',
                    role: profile?.role || 'admin',
                    subscription: sub
                }));
                this.showError('⚠️ انتهى اشتراكك. سيتم تحويلك لصفحة التجديد.');
                setTimeout(() => window.location.href = 'payment.html', 2000);
                return;
            }

            // 5. Session valide → dashboard
            sessionStorage.setItem('currentUser', JSON.stringify({
                uid: data.user.id,
                email: email,
                full_name: profile?.full_name || '',
                org_name: profile?.org_name || '',
                role: profile?.role || 'admin',
                subscription: sub
            }));

            if (window.ui) ui.showToast('تم تسجيل الدخول بنجاح', 'success');
            setTimeout(() => window.location.href = 'dashboard.html', 800);

        } catch (err) {
            console.error('Erreur connexion:', err);
            this.showError(this.translateError(err.message));
            btn.disabled = false;
            btn.textContent = 'تسجيل الدخول';
        }
    }

    translateError(message) {
        const errors = {
            'Invalid login credentials': 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
            'Email not confirmed': 'يرجى تأكيد بريدك الإلكتروني أولاً',
            'Rate limit exceeded': 'محاولات كثيرة، انتظر قليلاً ثم أعد المحاولة'
        };
        return errors[message] || message || 'حدث خطأ غير متوقع';
    }

    showError(message) {
        if (this.errorMessage) {
            this.errorMessage.textContent = message;
            this.errorMessage.classList.add('show');
            setTimeout(() => this.errorMessage.classList.remove('show'), 4000);
        }
    }
}

// Initialisation
const authManager = new AuthManager();