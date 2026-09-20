// js/app.js

let app; // تعريف عام

document.addEventListener('DOMContentLoaded', async function() {
    // التحقق من تسجيل الدخول عبر Supabase
    const { data: { session } } = await sb.auth.getSession();
    if (!session) {
        window.location.href = 'index.html';
        return;
    }

    // انتظار تحميل بيانات العميل من Supabase قبل عرض أي واجهة
    await db.ready;

    const settings = db.getSettings();
    const displayName = settings.schoolName || session.user.email;

    // تحديث بيانات المستخدم في الرأس
    const userName = document.getElementById('userName');
    const userAvatar = document.getElementById('userAvatar');
    if (userName) userName.textContent = displayName;
    if (userAvatar) userAvatar.textContent = displayName.charAt(0);

    // تهيئة التطبيق
    app = new AppManager({ email: session.user.email, fullName: displayName });
});

class AppManager {
    constructor(currentUser) {
        this.currentUser = currentUser;
        this.init();
    }
    
    init() {
        console.log('App initialized');
        this.setupSidebar();
        this.setupHeaderActions();
        this.updateSidebarSchoolName();
        
        // تحميل لوحة التحكم افتراضياً
        setTimeout(() => {
            this.navigateTo('dashboard');
        }, 100);
    }
    
    updateSidebarSchoolName() {
        const el = document.getElementById('sidebarSchoolName');
        if (el && typeof db !== 'undefined' && typeof db.getSettings === 'function') {
            const settings = db.getSettings();
            el.textContent = `🎓 ${settings.schoolName || 'المؤسسة التكوينية'}`;
        }
    }
    
    setupSidebar() {
        const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
        console.log('Setting up sidebar, found', navItems.length, 'items');
        
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Clicked on:', item.dataset.page);
                
                // إزالة الحالة النشطة من جميع العناصر
                navItems.forEach(i => i.classList.remove('active'));
                
                // إضافة الحالة النشطة للعنصر المحدد
                item.classList.add('active');
                
                const page = item.dataset.page;
                this.navigateTo(page);
            });
        });
    }
    
    setupHeaderActions() {
        // زر القائمة للهواتف
        const menuToggle = document.getElementById('menuToggle');
        const sidebar = document.getElementById('sidebar');
        
        if (menuToggle && sidebar) {
            menuToggle.addEventListener('click', () => {
                sidebar.classList.toggle('active');
            });
        }
        
        // جرس الإشعارات
        const notificationBell = document.getElementById('notificationBell');
        if (notificationBell) {
            notificationBell.addEventListener('click', () => {
                this.showNotifications();
            });
        }
        
        // زر تسجيل الخروج (الرأس + أسفل القائمة الجانبية)
        const doLogout = () => {
            if (confirm('هل تريد تسجيل الخروج؟')) {
                sb.auth.signOut().then(() => {
                    window.location.href = 'index.html';
                });
            }
        };
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', doLogout);
        }
        
        // تحديث شارة الإشعارات
        if (window.ui) {
            ui.updateNotificationBadge(3);
        }
    }
    
    navigateTo(page) {
        console.log('Navigating to:', page);
        
        // إخفاء الشريط الجانبي في الهواتف
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.classList.remove('active');
        
        const contentArea = document.getElementById('contentArea');
        if (!contentArea) {
            console.error('contentArea not found!');
            return;
        }
        
        switch(page) {
            case 'upgrade':
                window.location.href = 'payment.html';
                break;

            case 'dashboard':
                if (window.dashboard) {
                    dashboard.render();
                } else {
                    contentArea.innerHTML = '<p style="color: red;">Error: dashboard not loaded</p>';
                }
                break;
                
            case 'students':
                if (window.studentsManager) {
                    studentsManager.render();
                } else {
                    contentArea.innerHTML = '<p style="color: red;">Error: studentsManager not loaded</p>';
                }
                break;
                
            case 'teachers':
                if (window.teachersManager) {
                    teachersManager.render();
                } else {
                    contentArea.innerHTML = '<p style="color: red;">Error: teachersManager not loaded</p>';
                }
                break;
                
            case 'classes':
                if (window.classesManager) {
                    classesManager.render();
                } else {
                    contentArea.innerHTML = '<p style="color: red;">Error: classesManager not loaded</p>';
                }
                break;
                
            case 'schedules':
                if (window.schedulesManager) {
                    schedulesManager.render();
                } else {
                    contentArea.innerHTML = '<p style="color: red;">Error: schedulesManager not loaded</p>';
                }
                break;
                
            case 'attendance':
                if (window.attendanceManager) {
                    attendanceManager.render();
                } else {
                    contentArea.innerHTML = '<p style="color: red;">Error: attendanceManager not loaded</p>';
                }
                break;
                
            case 'grades':
                if (window.gradesManager) {
                    gradesManager.render();
                } else {
                    contentArea.innerHTML = '<p style="color: red;">Error: gradesManager not loaded</p>';
                }
                break;
                
            case 'payments':
                if (window.paymentsManager) {
                    paymentsManager.render();
                } else {
                    contentArea.innerHTML = '<p style="color: red;">Error: paymentsManager not loaded</p>';
                }
                break;
                
            case 'finance':
                if (window.financeManager) {
                    financeManager.render();
                } else {
                    contentArea.innerHTML = '<p style="color: red;">Error: financeManager not loaded</p>';
                }
                break;
                
            case 'ai-assistant':
                if (window.aiHelper) {
                    aiHelper.render();
                } else {
                    contentArea.innerHTML = '<p style="color: red;">Error: aiHelper not loaded</p>';
                }
                break;

            case 'settings':
                if (window.settingsManager) {
                    settingsManager.render();
                } else {
                    contentArea.innerHTML = '<p style="color: red;">Error: settingsManager not loaded</p>';
                }
                break;
                
            default:
                contentArea.innerHTML = `<p>الصفحة غير موجودة: ${page}</p>`;
        }
    }
    
    showNotifications() {
        const notificationsList = document.getElementById('notificationsList');
        
        const notifications = [
            {
                type: 'success',
                icon: '✓',
                title: 'تم تسجيل طالب جديد',
                message: 'أحمد محمد تم تسجيله في فصل الرياضيات',
                time: 'منذ 5 دقائق'
            },
            {
                type: 'warning',
                icon: '⚠',
                title: 'حصة ملغاة',
                message: 'تم إلغاء حصة الفيزياء اليوم',
                time: 'منذ ساعة'
            },
            {
                type: 'info',
                icon: 'ℹ',
                title: 'تذكير',
                message: 'موعد الامتحان النهائي غداً',
                time: 'منذ 3 ساعات'
            }
        ];
        
        notificationsList.innerHTML = notifications.map(n => `
            <div style="padding: 1rem; border-bottom: 1px solid #e0e0e0; display: flex; gap: 1rem;">
                <div style="width: 40px; height: 40px; border-radius: 50%; background: var(--${n.type === 'success' ? 'success-green' : n.type === 'warning' ? 'danger-red' : 'light-blue'}); color: white; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; flex-shrink: 0;">
                    ${n.icon}
                </div>
                <div style="flex: 1;">
                    <div style="font-weight: bold; margin-bottom: 0.25rem;">${n.title}</div>
                    <div style="color: var(--text-secondary); font-size: 0.9rem;">${n.message}</div>
                    <div style="color: var(--text-secondary); font-size: 0.8rem; margin-top: 0.5rem;">${n.time}</div>
                </div>
            </div>
        `).join('');
        
        if (window.ui) {
            ui.openModal('notificationsModal');
        }
    }
}