// js/settings.js
class SettingsManager {
    constructor() {
        this.contentArea = document.getElementById('contentArea');
    }

    render() {
        try {
            document.querySelector('.header-title').textContent = 'الإعدادات';
            const user = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
            const sub = user.subscription || null;

            let days = 0;
            if (sub && sub.end_date) {
                days = Math.max(0, Math.ceil((new Date(sub.end_date) - new Date()) / 86400000));
            }
            const planName = sub ? (sub.plan === 'full_access' ? 'الباقة الكاملة' : 'نسخة تجريبية') : 'غير معروف';
            const active = sub && sub.status === 'active' && days > 0;

            this.contentArea.innerHTML = `
                <div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));">
                    <div class="card">
                        <h3 style="margin-bottom: 1.5rem;">🏫 معلومات المؤسسة</h3>
                        <form id="profileForm">
                            <div class="form-group">
                                <label class="form-label">اسم المؤسسة</label>
                                <input type="text" id="setOrgName" class="form-input" value="${user.org_name || ''}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">اسم المدير</label>
                                <input type="text" id="setFullName" class="form-input" value="${user.full_name || ''}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">البريد الإلكتروني</label>
                                <input type="email" class="form-input" value="${user.email || ''}" disabled style="background:#f0f0f0;">
                            </div>
                            <button type="submit" class="btn btn-success" style="width:100%; justify-content:center;">حفظ التغييرات</button>
                        </form>
                    </div>

                    <div class="card">
                        <h3 style="margin-bottom: 1.5rem;">💎 الاشتراك</h3>
                        <div style="display:flex; justify-content:space-between; padding:0.75rem 0; border-bottom:1px solid #eee;">
                            <span>الباقة الحالية</span><strong>${planName}</strong>
                        </div>
                        <div style="display:flex; justify-content:space-between; padding:0.75rem 0; border-bottom:1px solid #eee;">
                            <span>الحالة</span>
                            <span class="badge ${active ? 'badge-success' : 'badge-danger'}">${active ? 'نشط' : 'منتهي'}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; padding:0.75rem 0;">
                            <span>الأيام المتبقية</span><strong>${days} يوم</strong>
                        </div>
                        <a href="payment.html" class="btn btn-success" style="width:100%; margin-top:1rem; justify-content:center; text-decoration:none;">
                            ${sub && sub.plan === 'full_access' ? 'تجديد الاشتراك' : '⬆ الترقية للباقة الكاملة (2999 درهم/سنة)'}
                        </a>
                    </div>

                    <div class="card">
                        <h3 style="margin-bottom: 1.5rem;">🔐 الأمان</h3>
                        <form id="passwordForm">
                            <div class="form-group">
                                <label class="form-label">كلمة المرور الجديدة</label>
                                <input type="password" id="newPassword" class="form-input" minlength="6" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">تأكيد كلمة المرور</label>
                                <input type="password" id="confirmPassword" class="form-input" minlength="6" required>
                            </div>
                            <button type="submit" class="btn btn-primary" style="width:100%; justify-content:center;">تغيير كلمة المرور</button>
                        </form>
                    </div>
                </div>
            `;
            this.attachEvents();
        } catch (e) {
            console.error('Settings render error:', e);
            this.contentArea.innerHTML = `<p style="color: red;">خطأ في عرض الإعدادات : ${e.message}</p>`;
        }
    }

    attachEvents() {
        const pf = document.getElementById('profileForm');
        if (pf) pf.addEventListener('submit', (e) => { e.preventDefault(); this.saveProfile(); });
        const pw = document.getElementById('passwordForm');
        if (pw) pw.addEventListener('submit', (e) => { e.preventDefault(); this.changePassword(); });
    }

    async saveProfile() {
        const user = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
        const data = {
            org_name: document.getElementById('setOrgName').value.trim(),
            full_name: document.getElementById('setFullName').value.trim()
        };
        try {
            const { error } = await supabaseClient.from('profiles').update(data).eq('id', user.uid);
            if (error) throw error;
            sessionStorage.setItem('currentUser', JSON.stringify({ ...user, ...data }));
            const userName = document.getElementById('userName');
            const userAvatar = document.getElementById('userAvatar');
            if (userName) userName.textContent = data.full_name;
            if (userAvatar) userAvatar.textContent = data.full_name.charAt(0);
            ui.showToast('تم حفظ التغييرات بنجاح', 'success');
        } catch (e) {
            ui.showToast('حدث خطأ : ' + e.message, 'error');
        }
    }

    async changePassword() {
        const a = document.getElementById('newPassword').value;
        const b = document.getElementById('confirmPassword').value;
        if (a !== b) { ui.showToast('كلمتا المرور غير متطابقتين', 'error'); return; }
        try {
            const { error } = await supabaseClient.auth.updateUser({ password: a });
            if (error) throw error;
            ui.showToast('تم تغيير كلمة المرور بنجاح', 'success');
            document.getElementById('passwordForm').reset();
        } catch (e) {
            ui.showToast('حدث خطأ : ' + e.message, 'error');
        }
    }
}

window.settingsManager = new SettingsManager();