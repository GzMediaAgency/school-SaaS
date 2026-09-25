// js/finance.js
class FinanceManager {
constructor() {
this.contentArea = document.getElementById('contentArea');
}
render() {
     document.querySelector('.header-title').textContent = 'الإدارة المالية';
     const finance = db.getData('finance');
     const totalIncome = finance.filter(f => f.type === 'income').reduce((sum, f) => sum + f.amount, 0);
     const totalExpense = finance.filter(f => f.type === 'expense').reduce((sum, f) => sum + f.amount, 0);
     const balance = totalIncome - totalExpense;
     this.contentArea.innerHTML = `
         <div class="stats-grid" style="margin-bottom: 2rem;">
             <div class="stat-card">
                 <div class="stat-icon green">💰</div>
                 <div class="stat-info">
                     <h3>إجمالي المداخيل</h3>
                     <div class="stat-value" style="color: var(--success-green);">${ui.formatNumber(totalIncome)} درهم</div>
                 </div>
             </div>
             <div class="stat-card">
                 <div class="stat-icon red">💸</div>
                 <div class="stat-info">
                     <h3>إجمالي المصاريف</h3>
                     <div class="stat-value" style="color: var(--danger-red);">${ui.formatNumber(totalExpense)} درهم</div>
                 </div>
             </div>
             <div class="stat-card">
                 <div class="stat-icon blue">📊</div>
                 <div class="stat-info">
                     <h3>الرصيد الحالي</h3>
                     <div class="stat-value" style="color: ${balance >= 0 ? 'var(--success-green)' : 'var(--danger-red)'};">${ui.formatNumber(balance)} درهم</div>
                 </div>
             </div>
         </div>
         <div class="table-header" style="background: transparent; padding: 0; margin-bottom: 1.5rem; border: none; box-shadow: none;">
             <h2 style="color: var(--text-primary);">سجل الحركات المالية</h2>
             <div style="display: flex; gap: 0.75rem;">
                 <button class="btn btn-outline" id="exportFinancePdfBtn">🖨️ تصدير PDF</button>
                 <button class="btn btn-success" id="addFinanceBtn">+ إضافة حركة جديدة</button>
             </div>
         </div>
         <div class="table-container">
             <table>
                 <thead>
                     <tr>
                         <th>#</th>
                         <th>النوع</th>
                         <th>الفئة</th>
                         <th>المبلغ</th>
                         <th>الوصف</th>
                         <th>التاريخ</th>
                         <th>الإجراءات</th>
                     </tr>
                 </thead>
                 <tbody id="financeTableBody"></tbody>
             </table>
         </div>
         <div class="modal" id="financeModal">
             <div class="modal-content" style="max-width: 500px;">
                 <div class="modal-header">
                     <h3 class="modal-title">إضافة حركة مالية</h3>
                     <button class="modal-close" onclick="closeModal('financeModal')">×</button>
                 </div>
                 <form id="financeForm">
                     <div class="form-group">
                         <label class="form-label">نوع الحركة *</label>
                         <select id="financeType" class="form-input" required>
                             <option value="income">دخل (مداخيل)</option>
                             <option value="expense">مصروف (مصاريف)</option>
                         </select>
                     </div>
                     <div class="form-group">
                         <label class="form-label">الفئة *</label>
                         <input type="text" id="financeCategory" class="form-input" required placeholder="مثال: رسوم دراسية، رواتب">
                     </div>
                     <div class="form-group">
                         <label class="form-label">المبلغ *</label>
                         <input type="number" id="financeAmount" class="form-input" required min="0" step="0.01">
                     </div>
                     <div class="form-group">
                         <label class="form-label">الوصف</label>
                         <textarea id="financeDescription" class="form-input" rows="3"></textarea>
                     </div>
                     <div class="form-group">
                         <label class="form-label">التاريخ *</label>
                         <input type="date" id="financeDate" class="form-input" required value="${new Date().toISOString().split('T')[0]}">
                     </div>
                     <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1.5rem;">
                         <button type="button" class="btn btn-outline" onclick="closeModal('financeModal')">إلغاء</button>
                         <button type="submit" class="btn btn-success">حفظ</button>
                     </div>
                 </form>
             </div>
         </div>
     `;
     this.loadFinance();
     this.attachEvents();
 }
 loadFinance() {
     const finance = db.getData('finance').sort((a, b) => new Date(b.date) - new Date(a.date));
     const tbody = document.getElementById('financeTableBody');
     tbody.innerHTML = finance.map((f, index) => `
         <tr>
             <td>${index + 1}</td>
             <td>
                 <span class="badge ${f.type === 'income' ? 'badge-success' : 'badge-danger'}">
                     ${f.type === 'income' ? 'دخل' : 'مصروف'}
                 </span>
             </td>
             <td>${f.category}${f.autoGenerated ? ' <span class="badge" style="background: rgba(29,53,87,0.08); color: var(--primary-blue); font-size: 0.7rem;">🔗 تلقائي</span>' : ''}</td>
             <td style="font-weight: bold; color: ${f.type === 'income' ? 'var(--success-green)' : 'var(--danger-red)'};">
                 ${f.type === 'income' ? '+' : '-'}${ui.formatNumber(f.amount)} درهم
             </td>
             <td>${f.description || '-'}</td>
             <td>${ui.formatDate(f.date)}</td>
             <td>
                 <button class="btn btn-danger" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" onclick="financeManager.deleteFinance('${f.id}')">حذف</button>
             </td>
         </tr>
     `).join('');
 }
 attachEvents() {
     document.getElementById('addFinanceBtn').addEventListener('click', () => {
         document.getElementById('financeForm').reset();
         document.getElementById('financeDate').value = new Date().toISOString().split('T')[0];
         ui.openModal('financeModal');
     });
     document.getElementById('exportFinancePdfBtn').addEventListener('click', () => this.exportFinancePDF());
     document.getElementById('financeForm').addEventListener('submit', (e) => {
         e.preventDefault();
         this.saveFinance();
     });
 }
 saveFinance() {
     const data = {
         type: document.getElementById('financeType').value,
         category: document.getElementById('financeCategory').value.trim(),
         amount: parseFloat(document.getElementById('financeAmount').value),
         description: document.getElementById('financeDescription').value.trim(),
         date: document.getElementById('financeDate').value
     };
     if (!data.category || !data.amount || !data.date) {
         ui.showToast('يرجى ملء جميع الحقول المطلوبة', 'error');
         return;
     }
     db.addItem('finance', data);
     ui.showToast('تم إضافة الحركة المالية بنجاح', 'success');
     ui.closeModal('financeModal');
     this.render();
 }
 async deleteFinance(id) {
     const confirmed = await ui.confirmDelete('هل أنت متأكد من حذف هذه الحركة المالية؟');
     if (confirmed) {
         db.deleteItem('finance', id);
         ui.showToast('تم حذف الحركة المالية بنجاح', 'success');
         this.render();
     }
 }
 getFinanceRowsForExport() {
     const finance = db.getData('finance').sort((a, b) => new Date(b.date) - new Date(a.date));
     const headers = ['النوع', 'الفئة', 'المبلغ', 'الوصف', 'التاريخ'];
     const rows = finance.map(f => [
         f.type === 'income' ? 'دخل' : 'مصروف', f.category, `${ui.formatNumber(f.amount)} درهم`, f.description || '-', f.date
     ]);
     const totalIncome = finance.filter(f => f.type === 'income').reduce((sum, f) => sum + Number(f.amount), 0);
     const totalExpense = finance.filter(f => f.type === 'expense').reduce((sum, f) => sum + Number(f.amount), 0);
     const balance = totalIncome - totalExpense;
     const summaryRow = [
         'المجموع', '-', '-',
         `مجموع المداخيل : ${ui.formatNumber(totalIncome)} درهم | مجموع المصاريف : ${ui.formatNumber(totalExpense)} درهم`,
         `الرصيد الحالي : ${ui.formatNumber(balance)} درهم`
     ];
     return { headers, rows, summaryRow };
 }
 exportFinancePDF() {
     const { headers, rows, summaryRow } = this.getFinanceRowsForExport();
     if (rows.length === 0) {
         ui.showToast('لا توجد حركات مالية لتصديرها', 'error');
         return;
     }
     ui.printTable('سجل الحركات المالية', headers, rows, summaryRow);
 }
}
window.financeManager = new FinanceManager();