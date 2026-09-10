// js/saas-manager.js
class SaaSManager {
    constructor() {
        this.DEMO_DAYS = 15;
        this.PLANS = {
            demo: {
            name: 'نسخة تجريبية',
            duration: 15,
            price: 0,
            limits: {
                students: 50,
                teachers: 5,
                classes: 6,    // ✅ 3 seed + 3 ajoutables
                subjects: 10   // ✅ 4 seed + 6 ajoutables
            }
        },
        full_access: {
            name: 'الباقة الكاملة',
            duration: 365,
            price: 2999,
            limits: {
                students: -1,
                teachers: -1,
                classes: -1,
                subjects: -1
            }
        }
    };

        // ⚠️ MODIFIEZ CES INFORMATIONS AVEC LES VÔTRES
        this.DEVELOPER_EMAIL = 'gz.app.medi@gmail.com';
        this.DEVELOPER_WHATSAPP = '212671752151'; // format international sans +
        this.BANK_INFO = {
            bank: 'CIH Banque',
            rib: '230 041 545 848 621 102 2800 82',
            account: 'Soufiane GZINIT'
        };
    }

    // ========== ÉTAT DE L'ABONNEMENT ==========
    async getStatus(userId) {
        const { data, error } = await supabaseClient
            .from('subscriptions').select('*')
            .eq('user_id', userId).single();

        if (error || !data) return { active: false, reason: 'no_subscription', days: 0, sub: null };

        const end = new Date(data.end_date);
        const now = new Date();
        const days = Math.ceil((end - now) / 86400000);

        if (data.status !== 'active') return { active: false, reason: 'suspended', days: 0, sub: data };
        if (end <= now) return { active: false, reason: 'expired', days: 0, sub: data };

        return { active: true, reason: 'ok', days: Math.max(days, 0), sub: data };
    }

    async getPendingRequest(userId) {
        const { data } = await supabaseClient
            .from('payment_requests').select('*')
            .eq('user_id', userId).eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(1).maybeSingle();
        return data;
    }
	
	    // ========== FORCER LA VÉRIFICATION DE LIMITE AVANT AJOUT ==========
    async enforceLimit(collection, labelAr) {
        try {
            const check = await this.checkLimit(collection);
            
            // ✅ Limite OK ou plan illimité → on autorise
            if (check.allowed) return true;
            
            // ❌ Limite atteinte → on bloque et on redirige
            const msg = `⚠️ حد أقصى وصلتي ليه: ${check.current}/${check.limit} من ${labelAr} في النسخة التجريبية.`;
            ui.showToast(`${msg} رقّي للباقة الكاملة للمتابعة.`, 'error', 5000);
            
            setTimeout(() => {
                window.location.href = 'payment.html';
            }, 3000);
            
            return false;
        } catch (e) {
            console.error('Erreur vérification limite:', e);
            return true; // Ne pas bloquer l'utilisateur en cas d'erreur réseau
        }
    }

    // ========== BADGE D'UTILISATION (optionnel, pour affichage) ==========
    async getUsageText(collection) {
        const check = await this.checkLimit(collection);
        if (check.limit === 'unlimited') return 'غير محدود';
        return `${check.current}/${check.limit}`;
    }

    // ========== INSCRIPTION (démo 15 jours auto via trigger) ==========
    async handleSignup() {
        const data = {
            orgName: document.getElementById('orgName').value.trim(),
            fullName: document.getElementById('fullName').value.trim(),
            email: document.getElementById('email').value.trim(),
            password: document.getElementById('password').value,
            phone: document.getElementById('phone').value.trim()
        };

        if (!data.orgName || !data.fullName || !data.email || !data.password) {
            this.showSignupError('يرجى ملء جميع الحقول المطلوبة');
            return;
        }
        if (data.password.length < 6) {
            this.showSignupError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
            return;
        }

        const btn = document.getElementById('signupSubmit');
        btn.disabled = true;
        btn.textContent = 'جاري إنشاء الحساب...';

        const { data: authData, error } = await supabaseClient.auth.signUp({
            email: data.email,
            password: data.password,
            options: {
                data: { full_name: data.fullName, org_name: data.orgName }
            }
        });

        if (error) {
            this.showSignupError(this.translateError(error.message));
            btn.disabled = false;
            btn.textContent = '🚀 ابدأ التجربة المجانية (15 يوم)';
            return;
        }

        if (!authData.session) {
            this.showSignupError('تم إنشاء الحساب. يرجى تأكيد بريدك الإلكتروني ثم تسجيل الدخول.');
            btn.disabled = false;
            return;
        }

        const userId = authData.user.id;

        // Compléter le profil (le trigger a déjà créé profil + abonnement démo)
        await supabaseClient.from('profiles').update({
            full_name: data.fullName,
            org_name: data.orgName,
            phone: data.phone
        }).eq('id', userId);

        const { data: profile } = await supabaseClient.from('profiles').select('*').eq('id', userId).single();
        const { data: sub } = await supabaseClient.from('subscriptions').select('*').eq('user_id', userId).single();

        sessionStorage.setItem('currentUser', JSON.stringify({ uid: userId, ...profile, subscription: sub }));
        window.location.href = 'dashboard.html';
    }

    showSignupError(msg) {
        const err = document.getElementById('signupError');
        err.textContent = msg;
        err.style.display = 'block';
        setTimeout(() => err.style.display = 'none', 5000);
    }

    translateError(message) {
        if (message.includes('already registered')) return 'هذا البريد الإلكتروني مسجل بالفعل';
        if (message.includes('Password')) return 'كلمة المرور ضعيفة جداً';
        if (message.includes('rate limit')) return 'محاولات كثيرة، انتظر قليلاً ثم أعد المحاولة';
        return 'حدث خطأ: ' + message;
    }

    // ========== DEMANDE DE TRCAGE (virement) ==========
    async requestFullAccess(userId, proofUrl) {
        const { error } = await supabaseClient.from('payment_requests').insert([{
            user_id: userId,
            plan: 'full_access',
            amount: this.FULL_ACCESS_PRICE,
            currency: 'MAD',
            payment_proof: proofUrl || null,
            status: 'pending'
        }]);
        if (error) {
            alert('حدث خطأ أثناء إرسال الطلب: ' + error.message);
            return false;
        }
        return true;
    }

    // ========== BANDEAU D'ALERTE (dashboard) ==========
    async mountBanner(userId) {
        const el = document.getElementById('subscriptionAlert');
        if (!el) return;

        const pending = await this.getPendingRequest(userId);
        if (pending) {
            el.innerHTML = `<div style="background:#ffc107;color:#000;padding:0.6rem 1rem;text-align:center;font-weight:600;">
                ⏳ طلب الترقية قيد المعالجة — سيتم تفعيل اشتراكك بعد التحقق من التحويل البنكي.</div>`;
            return;
        }

        const status = await this.getStatus(userId);
        if (!status.active || status.sub.plan === 'full_access') { el.innerHTML = ''; return; }

        if (status.days <= 5) {
            el.innerHTML = `<div style="background:#ffc107;color:#000;padding:0.6rem 1rem;text-align:center;font-weight:600;">
                ⚠️ متبقي <strong>${status.days} يوم</strong> فقط على انتهاء تجربتك المجانية.
                <a href="payment.html" style="color:#000;margin-right:0.5rem;">ترقية الآن ←</a></div>`;
        } else {
            el.innerHTML = `<div style="background:var(--light-blue);color:#fff;padding:0.5rem 1rem;text-align:center;font-size:0.9rem;">
                🎁 نسخة تجريبية — متبقي <strong>${status.days} يوم</strong>.
                <a href="payment.html" style="color:#fff;margin-right:0.5rem;">الترقية للباقة الكاملة ←</a></div>`;
        }
    }

    // ========== PAGE DE PAIEMENT ==========
    async initPaymentPage() {
        // Remplir les infos bancaires et contacts
        document.getElementById('bankName').textContent = this.BANK_INFO.bank;
        document.getElementById('bankRib').textContent = this.BANK_INFO.rib;
        document.getElementById('bankAccount').textContent = this.BANK_INFO.account;
        document.getElementById('planPrice').textContent = `${this.FULL_ACCESS_PRICE} ${this.CURRENCY}`;

        const emailLink = document.getElementById('devEmailLink');
        emailLink.href = `mailto:${this.DEVELOPER_EMAIL}`;
        emailLink.textContent = this.DEVELOPER_EMAIL;

        const waLink = document.getElementById('devWhatsappLink');
        waLink.href = `https://wa.me/${this.DEVELOPER_WHATSAPP}`;

        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) { window.location.href = 'index.html'; return; }
        const userId = session.user.id;

        const statusBox = document.getElementById('statusBox');
        const reason = new URLSearchParams(location.search).get('reason');

        if (reason === 'expired' || reason === 'suspended' || reason === 'no_subscription') {
            statusBox.innerHTML = `<div style="background:#ffebee;color:var(--danger-red);border-right:4px solid var(--danger-red);
                padding:1rem;border-radius:8px;margin-bottom:1.5rem;font-weight:600;">
                ⛔ انتهى اشتراكك أو تم تعليقه. قم بالترقية للمتابعة.</div>`;
        }

        const pending = await this.getPendingRequest(userId);
        const status = await this.getStatus(userId);

        if (pending) {
            statusBox.innerHTML = `<div style="background:#fff3cd;color:#856404;border-right:4px solid #ffc107;
                padding:1rem;border-radius:8px;margin-bottom:1.5rem;font-weight:600;">
                ⏳ طلبك قيد المعالجة. سيتم تفعيل اشتراكك خلال 24 ساعة بعد التحقق من التحويل.</div>`;
            document.getElementById('proofForm').style.display = 'none';
            return;
        }

        if (status.active && status.sub.plan === 'full_access') {
            const endDate = new Date(status.sub.end_date).toLocaleDateString('ar-MA');
            statusBox.innerHTML = `<div style="background:#e8f5e9;color:var(--success-green);border-right:4px solid var(--success-green);
                padding:1rem;border-radius:8px;margin-bottom:1.5rem;font-weight:600;">
                ✅ اشتراكك الكامل نشط حتى ${endDate}. شكراً لثقتك!</div>`;
            document.getElementById('proofForm').style.display = 'none';
            return;
        }

        if (status.active && status.sub.is_demo) {
            statusBox.innerHTML = `<div style="background:#e3f2fd;color:var(--primary-blue);border-right:4px solid var(--light-blue);
                padding:1rem;border-radius:8px;margin-bottom:1.5rem;">
                🎁 أنت في الفترة التجريبية — متبقي <strong>${status.days} يوم</strong>.</div>`;
        }

        // Envoi de la preuve
        document.getElementById('proofForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const proof = document.getElementById('proofUrl').value.trim();
            const ok = await this.requestFullAccess(userId, proof);
            if (ok) {
                alert('تم إرسال طلب الترقية بنجاح! سيتم تفعيل اشتراكك خلال 24 ساعة.');
                location.reload();
            }
        });
    }
}

window.saasManager = new SaaSManager();