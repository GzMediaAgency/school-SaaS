// js/db.js
// يحل محل js/realm-db.js : نفس الواجهة العامة (getData, addItem, updateItem,
// deleteItem, findItem, filterItems, setData, getSettings, updateSettings,
// getStatistics) لكن البيانات محفوظة في Supabase بدل localStorage.
// أي عميل يسجّل حساباً يرى بياناته فقط (معزولة عبر Row Level Security).
//
// لتبسيط الأمر على كل ملفات الواجهة الحالية (students.js, teachers.js...)
// التي تستدعي db.getData() بشكل متزامن، نحتفظ بذاكرة تخزين مؤقت (cache) تُحمَّل
// دفعة واحدة عند بدء التشغيل (db.ready)، وكل عملية كتابة تُحدّث الذاكرة فوراً
// ثم تُرسَل إلى Supabase في الخلفية.

const DB_COLLECTIONS = ['students', 'teachers', 'subjects', 'classes', 'schedules', 'attendance', 'grades', 'finance'];

const DEFAULT_SETTINGS = {
    schoolName: 'المؤسسة التكوينية',
    schoolLogo: null,
    plan: 'trial',
    trialStart: null,
    activatedAt: null,
    expiresAt: null,
    licenseKey: null
};

class SupabaseDB {
    constructor() {
        this.cache = {};
        DB_COLLECTIONS.forEach(c => { this.cache[c] = []; });
        this.settings = { ...DEFAULT_SETTINGS };
        this.userId = null;
        this.ready = this.bootstrap();
    }

    async bootstrap() {
        const { data: { session } } = await sb.auth.getSession();
        if (!session) {
            // لا يوجد مستخدم مسجَّل دخوله (مثلاً صفحة index.html قبل تسجيل الدخول)
            return;
        }
        this.userId = session.user.id;
        await this.refreshAll();
    }

    async refreshAll() {
        const results = await Promise.all([
            ...DB_COLLECTIONS.map(c => sb.from(c).select('*').order('created_at', { ascending: true })),
            sb.from('settings').select('*').eq('user_id', this.userId).maybeSingle()
        ]);

        DB_COLLECTIONS.forEach((c, i) => {
            const { data, error } = results[i];
            if (error) {
                console.error(`تعذّر تحميل ${c}`, error);
                return;
            }
            this.cache[c] = (data || []).map(row => this._rowToItem(row));
        });

        const settingsResult = results[DB_COLLECTIONS.length];
        if (settingsResult.data) {
            this.settings = this._settingsRowToObj(settingsResult.data);
        } else {
            // نادراً ما يحدث (فشل المُشغّل التلقائي) : ننشئ الصف يدوياً
            const inserted = await sb.from('settings').insert({ user_id: this.userId }).select().single();
            if (inserted.data) this.settings = this._settingsRowToObj(inserted.data);
        }
    }

    _rowToItem(row) {
        return { ...(row.data || {}), id: row.id };
    }

    _settingsRowToObj(row) {
        return {
            schoolName: row.school_name || DEFAULT_SETTINGS.schoolName,
            schoolLogo: row.school_logo || null,
            plan: row.plan || 'trial',
            trialStart: row.trial_start,
            activatedAt: row.activated_at,
            expiresAt: row.expires_at,
            licenseKey: row.license_key
        };
    }

    _notifyError(message) {
        console.error(message);
        if (window.ui && typeof ui.showToast === 'function') {
            ui.showToast('تعذّر حفظ التغيير في الخادم، تحقّق من اتصالك بالإنترنت', 'error');
        }
    }

    // ---------- قراءة عامة ----------
    getData(collection) {
        return this.cache[collection] || [];
    }

    findItem(collection, predicate) {
        return this.getData(collection).find(predicate);
    }

    filterItems(collection, predicate) {
        return this.getData(collection).filter(predicate);
    }

    // ---------- كتابة (متفائلة : تُحدّث الذاكرة فوراً ثم تُزامن في الخلفية) ----------
    addItem(collection, item) {
        item.id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString() + Math.random();
        this.cache[collection].push(item);

        sb.from(collection).insert({ id: item.id, data: item }).then(({ error }) => {
            if (error) this._notifyError(`addItem ${collection}: ${error.message}`);
        });

        return item;
    }

    updateItem(collection, id, updates) {
        const data = this.cache[collection];
        const index = data.findIndex(item => item.id === id);
        if (index === -1) return null;

        data[index] = { ...data[index], ...updates };
        const merged = data[index];

        sb.from(collection).update({ data: merged }).eq('id', id).then(({ error }) => {
            if (error) this._notifyError(`updateItem ${collection}: ${error.message}`);
        });

        return merged;
    }

    deleteItem(collection, id) {
        this.cache[collection] = this.cache[collection].filter(item => item.id !== id);

        sb.from(collection).delete().eq('id', id).then(({ error }) => {
            if (error) this._notifyError(`deleteItem ${collection}: ${error.message}`);
        });
    }

    // استبدال دفعة كاملة (تُستعمل في attendance.js و grades.js للحفظ الجماعي)
    setData(collection, newArray) {
        const oldArray = this.cache[collection] || [];
        this.cache[collection] = newArray;

        const oldIds = new Set(oldArray.map(i => i.id));
        const newIds = new Set(newArray.map(i => i.id));
        const toDelete = oldArray.filter(i => !newIds.has(i.id)).map(i => i.id);
        const toUpsert = newArray.map(item => ({ id: item.id, data: item }));

        (async () => {
            try {
                if (toDelete.length) {
                    const { error } = await sb.from(collection).delete().in('id', toDelete);
                    if (error) throw error;
                }
                if (toUpsert.length) {
                    const { error } = await sb.from(collection).upsert(toUpsert, { onConflict: 'id' });
                    if (error) throw error;
                }
            } catch (error) {
                this._notifyError(`setData ${collection}: ${error.message}`);
            }
        })();

        void oldIds; // (محفوظ للتوضيح فقط، غير مستعمل مباشرة)
        return newArray;
    }

    // ---------- الإعدادات ----------
    getSettings() {
        return this.settings;
    }

    updateSettings(updates) {
        this.settings = { ...this.settings, ...updates };

        const row = {
            user_id: this.userId,
            school_name: this.settings.schoolName,
            school_logo: this.settings.schoolLogo,
            plan: this.settings.plan,
            trial_start: this.settings.trialStart,
            activated_at: this.settings.activatedAt,
            expires_at: this.settings.expiresAt,
            license_key: this.settings.licenseKey
        };

        sb.from('settings').upsert(row, { onConflict: 'user_id' }).then(({ error }) => {
            if (error) this._notifyError(`updateSettings: ${error.message}`);
        });

        return this.settings;
    }

    // ---------- إحصائيات لوحة التحكم ----------
    getStatistics() {
        const students = this.getData('students');
        const teachers = this.getData('teachers');
        const finance = this.getData('finance');
        const attendance = this.getData('attendance');

        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        const monthlyIncome = finance
            .filter(f => {
                const date = new Date(f.date);
                return f.type === 'income' &&
                       date.getMonth() === currentMonth &&
                       date.getFullYear() === currentYear;
            })
            .reduce((sum, f) => sum + Number(f.amount || 0), 0);

        const presentCount = attendance.filter(a => a.status === 'present').length;
        const totalAttendance = attendance.length;
        const attendanceRate = totalAttendance > 0 ? (presentCount / totalAttendance) * 100 : 0;

        return {
            totalStudents: students.length,
            totalTeachers: teachers.length,
            monthlyIncome: monthlyIncome,
            attendanceRate: Math.round(attendanceRate)
        };
    }
}

const db = new SupabaseDB();
