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