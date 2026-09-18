// js/subscription.js
// نظام الاشتراك (SaaS) : فترة تجريبية محدودة + الباقة الكاملة السنوية
// -----------------------------------------------------------------------------
// الحالة محفوظة الآن في Supabase (جدول settings) عبر db.getSettings()/updateSettings()
// بدل localStorage، فهي مرتبطة بحساب العميل ومعزولة بواسطة RLS.
// التفعيل يتم برمز ترخيص يُسلَّم للعميل بعد التحقق من التحويل البنكي
// (انظر activation-keygen.html — أداة خاصة بالمزوّد فقط).
// -----------------------------------------------------------------------------

const SUBSCRIPTION_CONFIG = {
    trialDays: 15,
    price: 2999,
    currency: 'درهم',
    // حدود النسخة التجريبية (غير محدودة في الباقة الكاملة)
    limits: {
        students: 25,
        teachers: 8,
        subjects: 10,
        classes: 5
    },
    // يُستعمل في حساب مجموع التحقق لرمز التفعيل. غيّره قبل التوزيع،
    // ويجب أن يكون نفسه في activation-keygen.html.
    licenseSecret: 'MOASSASSATI-2026'
};

class SubscriptionManager {
    // حالة الاشتراك تُقرأ مباشرة من db.getSettings() (مُزامنة مع Supabase)
    state() {
        if (typeof db !== 'undefined' && typeof db.getSettings === 'function') {
            return db.getSettings();
        }
        return { plan: 'trial', trialStart: new Date().toISOString(), activatedAt: null, expiresAt: null, licenseKey: null };
    }

    // ---------- الحالة ----------
    isFull() {
        const s = this.state();
        if (s.plan !== 'full') return false;
        if (!s.expiresAt) return true;
        return new Date(s.expiresAt) > new Date();
    }

    daysLeft() {
        const s = this.state();
        if (this.isFull()) {
            if (!s.expiresAt) return Infinity;
            return Math.max(0, Math.ceil((new Date(s.expiresAt) - new Date()) / 86400000));
        }
        if (!s.trialStart) return SUBSCRIPTION_CONFIG.trialDays;
        const end = new Date(s.trialStart);
        end.setDate(end.getDate() + SUBSCRIPTION_CONFIG.trialDays);
        return Math.max(0, Math.ceil((end - new Date()) / 86400000));
    }

    isExpired() {
        return !this.isFull() && this.daysLeft() <= 0;
    }

    statusLabel() {
        if (this.isFull()) {
            const d = this.daysLeft();
            return d === Infinity ? 'الباقة الكاملة' : `الباقة الكاملة — ${d} يوماً متبقياً`;
        }
        if (this.isExpired()) return 'انتهت الفترة التجريبية';
        return `النسخة التجريبية — ${this.daysLeft()} يوماً متبقياً`;
    }

    // ---------- الحدود ----------
    limitFor(collection) {
        if (this.isFull()) return Infinity;
        const limit = SUBSCRIPTION_CONFIG.limits[collection];
        return typeof limit === 'number' ? limit : Infinity;
    }

    countOf(collection) {
        if (typeof db === 'undefined' || typeof db.getData !== 'function') return 0;
        return (db.getData(collection) || []).length;
    }

    canAdd(collection) {
        if (this.isExpired()) return false;
        return this.countOf(collection) < this.limitFor(collection);
    }

    // الرسالة المعروضة عند بلوغ الحد
    blockMessage(collection) {
        const names = {
            students: 'الطلاب',
            teachers: 'الأساتذة',
            subjects: 'المواد',
            classes: 'الفصول'
        };
        if (this.isExpired()) {
            return 'انتهت الفترة التجريبية. يرجى الترقية إلى الباقة الكاملة لمتابعة استعمال النظام.';
        }
        return `بلغت الحد الأقصى في النسخة التجريبية (${this.limitFor(collection)} من ${names[collection] || 'العناصر'}). رقِّ إلى الباقة الكاملة للحصول على عدد غير محدود.`;
    }

    // ---------- رمز التفعيل ----------
    static checksum(text) {
        let h = 2166136261;
        for (let i = 0; i < text.length; i++) {
            h ^= text.charCodeAt(i);
            h = Math.imul(h, 16777619) >>> 0;
        }
        return h;
    }

    static buildKey(g1, g2) {
        const sum = SubscriptionManager.checksum(`MOAS-${g1}-${g2}-${SUBSCRIPTION_CONFIG.licenseSecret}`);
        const g3 = sum.toString(36).toUpperCase().slice(-4).padStart(4, '0');
        return `MOAS-${g1}-${g2}-${g3}`;
    }

    static isValidKey(key) {
        const parts = String(key || '').trim().toUpperCase().split('-');
        if (parts.length !== 4 || parts[0] !== 'MOAS') return false;
        if (parts.slice(1).some(p => p.length !== 4)) return false;
        return SubscriptionManager.buildKey(parts[1], parts[2]) === parts.join('-');
    }

    activate(key) {
        if (!SubscriptionManager.isValidKey(key)) {
            return { ok: false, message: 'رمز التفعيل غير صحيح. تأكد من كتابته كما وصلك.' };
        }
        if (typeof db === 'undefined' || typeof db.updateSettings !== 'function') {
            return { ok: false, message: 'تعذّر الاتصال بالخادم. حاول مرة أخرى لاحقاً.' };
        }
        const now = new Date();
        const expires = new Date(now);
        expires.setFullYear(expires.getFullYear() + 1);

        db.updateSettings({
            plan: 'full',
            licenseKey: String(key).trim().toUpperCase(),
            activatedAt: now.toISOString(),
            expiresAt: expires.toISOString()
        });

        return {
            ok: true,
            message: 'تم تفعيل الباقة الكاملة. اشتراكك صالح إلى غاية ' + expires.toLocaleDateString('ar-MA')
        };
    }

    // ---------- الواجهة ----------
    renderBanner() {
        const host = document.getElementById('subscriptionBanner');
        if (!host) return;

        const s = this.state();

        if (this.isFull()) {
            host.innerHTML = `
                <div class="sub-banner sub-banner--full">
                    <span class="sub-banner__icon">💎</span>
                    <div class="sub-banner__text">
                        <strong>الباقة الكاملة مفعّلة</strong>
                        <span>اشتراكك صالح إلى غاية ${s.expiresAt ? new Date(s.expiresAt).toLocaleDateString('ar-MA') : '—'}</span>
                    </div>
                </div>`;
            return;
        }

        const expired = this.isExpired();
        host.innerHTML = `
            <div class="sub-banner ${expired ? 'sub-banner--expired' : ''}">
                <span class="sub-banner__icon">${expired ? '🔒' : '⏳'}</span>
                <div class="sub-banner__text">
                    <strong>${expired ? 'انتهت الفترة التجريبية' : `النسخة التجريبية — ${this.daysLeft()} يوماً متبقياً`}</strong>
                    <span>${expired
                        ? 'إضافة وتعديل البيانات متوقفان. فعّل الباقة الكاملة لاستئناف العمل.'
                        : `الحدود الحالية : ${SUBSCRIPTION_CONFIG.limits.students} طالباً، ${SUBSCRIPTION_CONFIG.limits.teachers} أساتذة، ${SUBSCRIPTION_CONFIG.limits.classes} فصول.`}</span>
                </div>
                <a class="sub-banner__cta" href="payment.html">الترقية إلى الباقة الكاملة</a>
            </div>`;
    }

    notifyBlocked(collection) {
        const message = this.blockMessage(collection);
        if (window.ui && typeof ui.showToast === 'function') {
            ui.showToast(message, 'error', 5000);
        }
        if (confirm(`${message}\n\nهل تريد الاطلاع على الباقة الكاملة الآن؟`)) {
            window.location.href = 'payment.html';
        }
    }

    // يغلّف دوال الإضافة في المدراء دون تعديل ملفاتهم
    guardManagers() {
        const targets = [
            { manager: 'studentsManager', methods: ['showAddModal'], collection: 'students' },
            { manager: 'teachersManager', methods: ['showAddTeacherModal'], collection: 'teachers' },
            { manager: 'teachersManager', methods: ['showAddSubjectModal'], collection: 'subjects' },
            { manager: 'classesManager', methods: ['showAddModal'], collection: 'classes' }
        ];

        targets.forEach(({ manager, methods, collection }) => {
            const instance = window[manager];
            if (!instance) return;
            methods.forEach(method => {
                if (typeof instance[method] !== 'function' || instance[method].__guarded) return;
                const original = instance[method].bind(instance);
                const guarded = (...args) => {
                    if (!this.canAdd(collection)) {
                        this.notifyBlocked(collection);
                        return;
                    }
                    return original(...args);
                };
                guarded.__guarded = true;
                instance[method] = guarded;
            });
        });
    }
}

const subscription = new SubscriptionManager();
window.subscription = subscription;

document.addEventListener('DOMContentLoaded', async () => {
    if (typeof db !== 'undefined' && db.ready) {
        await db.ready;
    }
    subscription.renderBanner();
    // المدراء يُنشأون عند تحميل السكريبتات، لكن نترك مهلة قصيرة للأمان
    setTimeout(() => subscription.guardManagers(), 300);
});
