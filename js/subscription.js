// js/subscription.js
// نظام الاشتراك (SaaS) : فترة تجريبية محدودة + الباقة الكاملة السنوية
// -----------------------------------------------------------------------------
// الحالة محفوظة في Supabase (جدول settings) وتُقرأ عبر db.getSettings().
// بعد انتهاء الاشتراك يصبح الحساب في "وضع القراءة فقط" :
//   - في الواجهة : أزرار الإضافة/التعديل/الحذف/الحفظ متوقفة (انظر guardManagers)
//   - في الخادم  : سياسات RLS في schema.sql ترفض أي كتابة (هذا هو الحاجز الحقيقي)
// التفعيل يتم برمز ترخيص يتحقق منه الخادم نفسه (دالة activate_license) :
// سرّ الترخيص لم يعد موجوداً في هذا الملف ولا يصل للمتصفح إطلاقاً.
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
    }
};

class SubscriptionManager {
    // حالة الاشتراك تُقرأ مباشرة من db.getSettings() (مُزامنة مع Supabase)
    state() {
        if (typeof db !== 'undefined' && typeof db.getSettings === 'function') {
            return db.getSettings();
        }
        return { plan: 'trial', trialStart: new Date().toISOString(), activatedAt: null, expiresAt: null, licenseKey: null, isAdmin: false };
    }

    // حساب صاحب المنصة (أنت) : وصول كامل دائماً
    isAdmin() {
        return !!this.state().isAdmin;
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

    // منتهٍ = وضع القراءة فقط
    isExpired() {
        return !this.isAdmin() && !this.isFull() && this.daysLeft() <= 0;
    }

    statusLabel() {
        if (this.isAdmin()) return 'حساب المزوّد (وصول كامل)';
        if (this.isFull()) {
            const d = this.daysLeft();
            return d === Infinity ? 'الباقة الكاملة' : `الباقة الكاملة — ${d} يوماً متبقياً`;
        }
        if (this.isExpired()) return 'انتهى الاشتراك — وضع القراءة فقط';
        return `النسخة التجريبية — ${this.daysLeft()} يوماً متبقياً`;
    }

    // ---------- الحدود ----------
    limitFor(collection) {
        if (this.isFull() || this.isAdmin()) return Infinity;
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
            return 'انتهى الاشتراك والحساب في وضع القراءة فقط. فعّل الباقة الكاملة لمتابعة استعمال النظام.';
        }
        return `بلغت الحد الأقصى في النسخة التجريبية (${this.limitFor(collection)} من ${names[collection] || 'العناصر'}). رقِّ إلى الباقة الكاملة للحصول على عدد غير محدود.`;
    }

    // ---------- رمز التفعيل ----------
    // الدالتان التاليتان تستعملهما صفحة activation-keygen.html (أداة المزوّد) فقط،
    // ويُمرَّر لهما السرّ يدوياً. أما التحقق من الرمز فيتم في الخادم.
    static checksum(text) {
        let h = 2166136261;
        for (let i = 0; i < text.length; i++) {
            h ^= text.charCodeAt(i);
            h = Math.imul(h, 16777619) >>> 0;
        }
        return h;
    }

    static buildKey(g1, g2, secret) {
        if (!secret) throw new Error('السرّ مطلوب لتوليد الرمز');
        const sum = SubscriptionManager.checksum(`MOAS-${g1}-${g2}-${secret}`);
        const g3 = sum.toString(36).toUpperCase().slice(-4).padStart(4, '0');
        return `MOAS-${g1}-${g2}-${g3}`;
    }

    // التفعيل : الخادم يتحقق من الرمز ويمنع إعادة استعماله ثم يرقّي الحساب
    async activate(key) {
        const clean = String(key || '').trim();
        if (!clean) {
            return { ok: false, message: 'يرجى إدخال رمز التفعيل.' };
        }
        if (typeof sb === 'undefined' || typeof db === 'undefined') {
            return { ok: false, message: 'تعذّر الاتصال بالخادم. حاول مرة أخرى لاحقاً.' };
        }

        const { data, error } = await sb.rpc('activate_license', { p_key: clean });
        if (error) {
            return { ok: false, message: 'تعذّر الاتصال بالخادم. حاول مرة أخرى لاحقاً.' };
        }
        if (!data || !data.ok) {
            const reasons = {
                invalid: 'رمز التفعيل غير صحيح. تأكد من كتابته كما وصلك.',
                used: 'هذا الرمز مستعمل من قبل. اطلب رمزاً جديداً.',
                not_configured: 'النظام غير مهيأ بعد. تواصل مع الدعم.'
            };
            return { ok: false, message: reasons[data && data.reason] || reasons.invalid };
        }

        await db.reloadSettings();
        const expires = new Date(data.expires_at);
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

        if (this.isAdmin()) {
            host.innerHTML = `
                <div class="sub-banner sub-banner--full">
                    <span class="sub-banner__icon">🛠️</span>
                    <div class="sub-banner__text">
                        <strong>حساب المزوّد</strong>
                        <span>وصول كامل بلا قيود أو حدود.</span>
                    </div>
                </div>`;
            return;
        }

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
                    <strong>${expired ? 'انتهى الاشتراك — الحساب في وضع القراءة فقط' : `النسخة التجريبية — ${this.daysLeft()} يوماً متبقياً`}</strong>
                    <span>${expired
                        ? 'يمكنك الاطلاع على بياناتك وتصدير الوثائق، لكن الإضافة والتعديل والحذف متوقفة. فعّل الباقة الكاملة لاستئناف العمل.'
                        : `الحدود الحالية : ${SUBSCRIPTION_CONFIG.limits.students} طالباً، ${SUBSCRIPTION_CONFIG.limits.teachers} أساتذة، ${SUBSCRIPTION_CONFIG.limits.classes} فصول.`}</span>
                </div>
                <a class="sub-banner__cta" href="payment.html">الترقية إلى الباقة الكاملة</a>
            </div>`;
    }

    // بلوغ حدّ النسخة التجريبية : رسالة + عرض الذهاب لصفحة الترقية
    notifyBlocked(collection) {
        const message = this.blockMessage(collection);
        if (window.ui && typeof ui.showToast === 'function') {
            ui.showToast(message, 'error', 5000);
        }
        if (confirm(`${message}\n\nهل تريد الاطلاع على الباقة الكاملة الآن؟`)) {
            window.location.href = 'payment.html';
        }
    }

    // وضع القراءة فقط : رسالة قصيرة (الشريط العلوي فيه زر الترقية)
    notifyReadOnly() {
        if (window.ui && typeof ui.showToast === 'function') {
            ui.showToast('الحساب في وضع القراءة فقط لانتهاء الاشتراك. فعّل الباقة الكاملة لاستئناف الإضافة والتعديل والحذف.', 'error', 5000);
        }
    }

    // يغلّف كل دوال الإضافة/التعديل/الحفظ/الحذف في المدراء دون تعديل ملفاتهم :
    //  - الاشتراك منتهٍ  → رفض + رسالة (وضع القراءة فقط)
    //  - دالة إضافة      → فحص حدّ النسخة التجريبية (القيمة = اسم المجموعة)
    guardManagers() {
        const writeMethods = {
            studentsManager:   { showAddModal: 'students', editStudent: null, saveStudent: null, deleteStudent: null },
            teachersManager:   { showAddTeacherModal: 'teachers', editTeacher: null, saveTeacher: null, deleteTeacher: null,
                                 showAddSubjectModal: 'subjects', editSubject: null, saveSubject: null, deleteSubject: null },
            classesManager:    { showAddModal: 'classes', editClass: null, saveClass: null, deleteClass: null },
            schedulesManager:  { showAddModal: null, editSchedule: null, saveSchedule: null, deleteSchedule: null },
            attendanceManager: { saveAttendance: null },
            gradesManager:     { saveGrades: null },
            financeManager:    { saveFinance: null, deleteFinance: null },
            paymentsManager:   { savePayments: null }
        };

        Object.entries(writeMethods).forEach(([managerName, methods]) => {
            const instance = window[managerName];
            if (!instance) return;
            Object.entries(methods).forEach(([method, collection]) => {
                if (typeof instance[method] !== 'function' || instance[method].__guarded) return;
                const original = instance[method].bind(instance);
                const guarded = (...args) => {
                    if (this.isExpired()) {
                        this.notifyReadOnly();
                        return;
                    }
                    if (collection && !this.canAdd(collection)) {
                        this.notifyBlocked(collection);
                        return;
                    }
                    return original(...args);
                };
                guarded.__guarded = true;
                instance[method] = guarded;
            });
        });

        // زر "إضافة حركة" في المالية يفتح النافذة مباشرة دون المرور بدالة في المدير
        if (!this._clickGuardAdded) {
            this._clickGuardAdded = true;
            document.addEventListener('click', (e) => {
                if (this.isExpired() && e.target.closest && e.target.closest('#addFinanceBtn')) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    this.notifyReadOnly();
                }
            }, true);
        }
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
