// js/ui-components.js
class UIComponents {
    constructor() {
        this.toastContainer = null;
        this.monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'ماي', 'يونيو', 
                          'يوليوز', 'غشت', 'شتنبر', 'أكتوبر', 'نونبر', 'دجنبر'];
    }
    
    getToastContainer() {
        if (!this.toastContainer) {
            this.toastContainer = document.getElementById('toastContainer');
            if (!this.toastContainer) {
                this.toastContainer = document.createElement('div');
                this.toastContainer.id = 'toastContainer';
                this.toastContainer.className = 'toast-container';
                document.body.appendChild(this.toastContainer);
            }
        }
        return this.toastContainer;
    }
    
    showToast(message, type = 'info', duration = 3000) {
        const container = this.getToastContainer();
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const icons = {
            success: '✓',
            error: '',
            info: 'ℹ',
            warning: '⚠'
        };
        toast.innerHTML = `
            <div class="toast-icon">${icons[type] || icons.info}</div>
            <div class="toast-message">${message}</div>
        `;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(400px)';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
    
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
        } else {
            console.error('Modal not found:', modalId);
        }
    }
    
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
        }
    }
    
    async confirmDelete(message = 'هل أنت متأكد من الحذف؟') {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal active';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 400px;">
                    <div class="modal-header">
                        <h3 class="modal-title">تأكيد الحذف</h3>
                        <button class="modal-close" id="cancelDelete">×</button>
                    </div>
                    <p style="margin-bottom: 1.5rem;">${message}</p>
                    <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                        <button class="btn btn-outline" id="cancelBtn">إلغاء</button>
                        <button class="btn btn-danger" id="confirmBtn">حذف</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            const cleanup = () => modal.remove();
            modal.querySelector('#cancelBtn').onclick = () => {
                cleanup();
                resolve(false);
            };
            modal.querySelector('#cancelDelete').onclick = () => {
                cleanup();
                resolve(false);
            };
            modal.querySelector('#confirmBtn').onclick = () => {
                cleanup();
                resolve(true);
            };
        });
    }
    
    updateNotificationBadge(count) {
        const badge = document.getElementById('notificationBadge');
        if (badge) {
            badge.textContent = count;
            badge.style.display = count > 0 ? 'flex' : 'none';
        }
    }
    
    formatNumber(num) {
        return new Intl.NumberFormat('ar-DZ').format(num);
    }
    
    formatDate(dateStr) {
        const date = new Date(dateStr);
        const day = date.getDate();
        const month = this.monthNames[date.getMonth()];
        const year = date.getFullYear();
        return `${day} ${month} ${year}`;
    }

    // تصدير جدول كملف PDF عبر نافذة طباعة المتصفح
    // (المستخدم يختار "حفظ كـ PDF" من مربع الطباعة)
    // summaryRow اختياري : مصفوفة خلايا تُعرض كسطر أخير بارز (مثل: مجموع المداخيل/المصاريف/الرصيد)
    printTable(title, headers, rows, summaryRow = null) {
        const settings = (typeof db !== 'undefined' && typeof db.getSettings === 'function')
            ? db.getSettings()
            : {};
        const schoolName = settings.schoolName || 'المؤسسة التكوينية';
        const schoolLogo = settings.schoolLogo || null;

        const printWindow = window.open('', '_blank', 'width=1000,height=700');
        if (!printWindow) {
            this.showToast('يرجى السماح للنوافذ المنبثقة لتصدير PDF', 'error');
            return;
        }

        const todayStr = new Date().toLocaleDateString('ar-MA');

        const headHtml = `<tr>${headers.map(h => `<th>${this.escapeHtml(h)}</th>`).join('')}</tr>`;
        const bodyHtml = rows.map(row =>
            `<tr>${row.map(cell => `<td>${this.escapeHtml(cell === null || cell === undefined ? '-' : String(cell))}</td>`).join('')}</tr>`
        ).join('');
        const footHtml = summaryRow
            ? `<tfoot><tr>${summaryRow.map(cell => `<td>${this.escapeHtml(cell === null || cell === undefined ? '-' : String(cell))}</td>`).join('')}</tr></tfoot>`
            : '';

        // الترويسة : الشعار المرفوع من الإعدادات إن وُجد، وإلا اسم المؤسسة نصاً
        const headerBrandHtml = schoolLogo
            ? `<img src="${schoolLogo}" alt="${this.escapeHtml(schoolName)}" class="print-logo">`
            : `<h1>🎓 ${this.escapeHtml(schoolName)}</h1>`;

        printWindow.document.write(`
            <!DOCTYPE html>
            <html lang="ar" dir="rtl">
            <head>
                <meta charset="UTF-8">
                <title>${this.escapeHtml(title)}</title>
                <style>
                    * { box-sizing: border-box; }
                    body {
                        font-family: 'Tajawal', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        padding: 1.5rem 2rem 2rem;
                        color: #1D3557;
                    }
                    .print-header {
                        border-bottom: 2px solid #1D3557;
                        padding-bottom: 1rem;
                        margin-bottom: 1rem;
                        text-align: center;
                    }
                    .print-header h1 {
                        font-size: 1.3rem;
                        margin: 0;
                    }
                    .print-logo {
                        display: block;
                        margin: 0 auto;
                        max-width: calc(100% - 10cm);
                        max-height: 140px;
                        object-fit: contain;
                    }
                    .print-meta { text-align: center; font-size: 0.85rem; color: #6C757D; margin-bottom: 1.5rem; }
                    h2 { font-size: 1.4rem; margin: 0 0 1.5rem; text-align: center; }
                    table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
                    th, td { border: 1px solid #dee2e6; padding: 0.5rem 0.65rem; text-align: right; }
                    th { background: #1D3557; color: #fff; }
                    tr:nth-child(even) td { background: #F1FAEE; }
                    tfoot td { background: #1D3557; color: #fff; font-weight: 700; border-color: #1D3557; }
                    .print-footer { margin-top: 1.5rem; font-size: 0.8rem; color: #6C757D; text-align: center; }
                    @media print {
                        body { padding: 1rem 1rem 0.5rem; }
                    }
                </style>
            </head>
            <body>
                <div class="print-header">
                    ${headerBrandHtml}
                </div>
                <div class="print-meta">${todayStr}</div>
                <h2>${this.escapeHtml(title)}</h2>
                <table>
                    <thead>${headHtml}</thead>
                    <tbody>${bodyHtml}</tbody>
                    ${footHtml}
                </table>
                <div class="print-footer">تم إنشاء هذا التقرير آلياً من نظام إدارة المؤسسة</div>
            </body>
            </html>
        `);
        printWindow.document.close();

        printWindow.onload = () => {
            printWindow.focus();
            printWindow.print();
        };
        // بديل احتياطي إذا لم يُطلق onload (بعض المتصفحات)
        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
        }, 400);
    }

    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}

// إنشاء نسخة عامة
window.ui = new UIComponents();

// دوال مساعدة عامة
window.openModal = function(modalId) {
    window.ui.openModal(modalId);
};

window.closeModal = function(modalId) {
    window.ui.closeModal(modalId);
};