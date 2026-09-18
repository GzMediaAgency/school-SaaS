// js/settings.js
class SettingsManager {
constructor() {
this.contentArea = document.getElementById('contentArea');
this.pendingLogo = undefined; // undefined = pas de changement, null = suppression, string = nouveau logo
}
render() {
     document.querySelector('.header-title').textContent = 'الإعدادات';
     const settings = db.getSettings();
     this.pendingLogo = undefined;
     this.contentArea.innerHTML = `
         <div class="card" style="max-width: 600px; padding: 1.5rem;">
             <h3 style="margin-bottom: 1.25rem;">بيانات المؤسسة (تظهر في أعلى المستندات المصدّرة)</h3>
             <div class="form-group">
                 <label class="form-label">اسم المؤسسة</label>
                 <input type="text" id="settingsSchoolName" class="form-input" value="${settings.schoolName || ''}">
             </div>
             <div class="form-group">
                 <label class="form-label">شعار / ترويسة المؤسسة</label>
                 <div id="logoPreviewWrap" style="margin-bottom: 0.75rem; ${settings.schoolLogo ? '' : 'display:none;'}">
                     <img id="logoPreview" src="${settings.schoolLogo || ''}" style="max-height: 90px; max-width: 100%; border: 1px solid rgba(0,0,0,0.1); border-radius: var(--border-radius); padding: 0.5rem; background: #fff;">
                 </div>
                 <div style="display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap;">
                     <input type="file" id="settingsLogoInput" accept="image/*" class="form-input" style="max-width: 320px;">
                     <button type="button" class="btn btn-outline" id="removeLogoBtn" style="${settings.schoolLogo ? '' : 'display:none;'}">🗑️ حذف الشعار</button>
                 </div>
                 <p style="color: var(--text-secondary); font-size: 0.8rem; margin-top: 0.5rem;">يفضل صورة بعرض معقول (أقل من 500 كيلوبايت) بصيغة PNG أو JPG.</p>
             </div>
             <button class="btn btn-success" id="saveSettingsBtn" style="margin-top: 0.5rem;">حفظ الإعدادات</button>
         </div>
     `;
     this.attachEvents();
 }
 attachEvents() {
     const fileInput = document.getElementById('settingsLogoInput');
     fileInput.addEventListener('change', (e) => {
         const file = e.target.files[0];
         if (!file) return;
         if (file.size > 800 * 1024) {
             ui.showToast('الصورة كبيرة نوعاً ما، يفضل اختيار صورة أصغر من 500 كيلوبايت', 'error');
         }
         const reader = new FileReader();
         reader.onload = (ev) => {
             this.pendingLogo = ev.target.result; // data URL base64
             const previewWrap = document.getElementById('logoPreviewWrap');
             const preview = document.getElementById('logoPreview');
             preview.src = this.pendingLogo;
             previewWrap.style.display = '';
             document.getElementById('removeLogoBtn').style.display = '';
         };
         reader.readAsDataURL(file);
     });

     document.getElementById('removeLogoBtn').addEventListener('click', () => {
         this.pendingLogo = null; // marquer pour suppression
         document.getElementById('logoPreviewWrap').style.display = 'none';
         document.getElementById('removeLogoBtn').style.display = 'none';
         fileInput.value = '';
     });

     document.getElementById('saveSettingsBtn').addEventListener('click', () => {
         const updates = {
             schoolName: document.getElementById('settingsSchoolName').value.trim() || 'المؤسسة التكوينية'
         };
         if (this.pendingLogo !== undefined) {
             updates.schoolLogo = this.pendingLogo; // string (نجاح) أو null (حذف)
         }
         db.updateSettings(updates);
         if (typeof app !== 'undefined' && app && typeof app.updateSidebarSchoolName === 'function') {
             app.updateSidebarSchoolName();
         }
         ui.showToast('تم حفظ الإعدادات بنجاح', 'success');
         this.render();
     });
 }
}
window.settingsManager = new SettingsManager();
