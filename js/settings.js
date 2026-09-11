// js/settings.js
class SettingsManager {
    constructor() {
        this.contentArea = document.getElementById('contentArea');
    }

    async render() {
        document.querySelector('.header-title').textContent = 'الإعدادات';
        const user = JSON.parse(sessionStorage.getItem('currentUser') || '{}');

        // جلب أحدث بيانات الملف الشخصي
        let profile = user;
        try {
            const { data } = await supabaseClient
                .from('profiles').select('*')
                .eq('id', user.uid).single();
            if (data) profile = data;
        } catch (e) { console.error(e); }

        // جلب معلومات الاشتراك
        let sub = user.subscription || null;
        let days = 0;
        if (window.saasManager) {
            sub = await saasManager.getCurrentSubscription();
            days = await saasManager.getDaysRemaining();
        }

        const planName = sub ? (sub.plan === 'full_access' ? 'الباقة الكاملة' : 'نسخة تجريبية') : 'غير معروف';
        const subStatus = (sub && sub.status === 'active' && days > 0)
            ? '<span class="badge badge-success">نشط</span>'
            : '<span class="badge badge-danger">منتهي</span>';

        this.contentArea.innerHTML = `
            <div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));">
                <!-- معلومات المؤسسة -->
                <div class="card">
                    <h3 style="margin-bottom: 1.5rem;">🏫 معلومات المؤسسة</h3>
                    <form id="profileForm">
                        <div class="form-group">
                            <label class="form-label">اسم المؤسسة</label>
                            <input type="text" id="setOrgName" class="form-input" value="${profile.org_name || ''}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">اسم المدير</label>
                            <input type="text" id="setFullName" class="form-input" value="${profile.full_name || ''}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">رقم الهاتف</label>
                            <input type="tel" id="setPhone" class="form-input" value="${profile.phone || ''}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">البريد الإلكتروني</label>
                            <input type="email" class="form-input" value="${profile.email || ''}" disabled style="background:#f0f0f0;">
                        </div>
                        <button type="submit" class="btn btn-success" style="width:100%; justify-content:center;">حفظ التغييرات</button>
                    </form>
                </div>

                <!-- الاشتراك -->
                <div class="card">
                    <h3 style="margin-bottom: 1.5rem;">💎 الاشتراك</h3>
                    <div style="display:flex; justify-content:space-between; padding:0.75rem 0; border-bottom:1px solid #eee;">
                        <span>الباقة الحالية</span><strong>${planName}</strong>
                    </div>
                    <div style="display:flex; justify-content:space-between; padding:0.75rem 0; border-bottom:1px solid #eee;">
                        <span>الحالة</span>${subStatus}
                    </div>
                    <div style="display:flex; justify-content:space-between; padding:0.75rem 0; border-bottom:1px solid #eee;">
                        <span>الأيام المتبقية</span><strong>${days} يوم</strong>
                    </div>
                    ${sub && sub.end_date ? `
                    <div style="display:flex; justify-content:space-between; padding:0.75rem 0; border-bottom:1px solid #eee;">
                        <span>تاريخ الانتهاء</span><strong>${new Date(sub.end_date).toLocaleDateString('ar-MA')}</strong>
                    </div>` : ''}
                    <a href="payment.html" class="btn btn-success" style="width:100%; margin-top:1.5rem; justify-content:center;">
                        ${sub && sub.plan === 'full_access' ? 'تجديد الاشتراك' : '⬆ الترقية للباقة الكاملة (2999 درهم/سنة)'}
                    </a>
                </div>

                <!-- الأمان -->
                <div class="card">
                    <h3 style="margin-bottom: 1.5rem;">🔐 الأمان</h3>
                    <form id="passwordForm">
                        <div class="form-group">
                            <label class="form-label">كلمة المرور الجديدة</label>
                            <input type="password" id="newPassword" class="form-input" minlength="6" required placeholder="6 أحرف على الأقل">
                        </div>
                        <div class="form-group">
                            <label class="form-label">تأكيد كلمة المرور</label>
                            <input type="password" id="confirmPassword" class="form-input" minlength="6" required>
                        </div>
                        <button type="submit" class="btn btn-primary" style="width:100%; justify-content:center;">تغيير كلمة المرور</button>
                    </form>
                    <button id="logoutAllBtn" class="btn btn-danger" style="width:100%; margin-top:1rem; justify-content:center;">🚪 تسجيل الخروج</button>
                </div>
            </div>
        `;

        this.attachEvents();
    }

    attachEvents() {
        document.getElementById('profileForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveProfile();
        });
        document.getElementById('passwordForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.changePassword();
        });
        document.getElementById('logoutAllBtn').addEventListener('click', async () => {
            if (confirm('هل تريد تسجيل الخروج؟')) {
                await supabaseClient.auth.signOut();
                sessionStorage.removeItem('currentUser');
                window.location.href = 'index.html';
            }
        });
    }

    async saveProfile() {
        const user = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
        const data = {
            org_name: document.getElementById('setOrgName').value.trim(),
            full_name: document.getElementById('setFullName').value.trim(),
            phone: document.getElementById('setPhone').value.trim()
        };
        const { error } = await supabaseClient.from('profiles').update(data).eq('id', user.uid);
        if (error) {
            ui.showToast('حدث خطأ أثناء الحفظ: ' + error.message, 'error');
            return;
        }
        const updated = { ...user, ...data };
        sessionStorage.setItem('currentUser', JSON.stringify(updated));
        const userName = document.getElementById('userName');
        const userAvatar = document.getElementById('userAvatar');
        if (userName) userName.textContent = data.full_name;
        if (userAvatar) userAvatar.textContent = data.full_name.charAt(0);
        ui.showToast('تم حفظ التغييرات بنجاح', 'success');
    }

    async changePassword() {
        const newPass = document.getElementById('newPassword').value;
        const confirmPass = document.getElementById('confirmPassword').value;
        if (newPass !== confirmPass) {
            ui.showToast('كلمتا المرور غير متطابقتين', 'error');
            return;
        }
        const { error } = await supabaseClient.auth.updateUser({ password: newPass });
        if (error) {
            ui.showToast('حدث خطأ: ' + error.message, 'error');
            return;
        }
        ui.showToast('تم تغيير كلمة المرور بنجاح', 'success');
        document.getElementById('passwordForm').reset();
    }
}

window.settingsManager = new SettingsManager();