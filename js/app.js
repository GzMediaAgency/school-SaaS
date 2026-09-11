// js/app.js
let app; // Définition globale

document.addEventListener('DOMContentLoaded', async function() {
    // Vérifier l'authentification via Supabase
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (!session) {
        window.location.href = 'index.html';
        return;
    }

    // Récupérer les données utilisateur depuis Supabase
    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

    const { data: subscription } = await supabaseClient
        .from('subscriptions')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

    // Stocker en session
    sessionStorage.setItem('currentUser', JSON.stringify({
        uid: session.user.id,
        ...profile,
        subscription: subscription
    }));

    // Mettre à jour l'ID utilisateur dans le wrapper DB
    db.userId = session.user.id;

    // Mettre à jour l'affichage
    const userName = document.getElementById('userName');
    const userAvatar = document.getElementById('userAvatar');
    if (userName && profile) userName.textContent = profile.full_name;
    if (userAvatar && profile) userAvatar.textContent = profile.full_name.charAt(0);

    // Initialiser l'application
    app = new AppManager();
});

class AppManager {
    constructor() {
        this.currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
        this.init();
    }

    async init() {
    console.log('App initialized');
    
    // ✅ VÉRIFIER L'ABONNEMENT
    const isActive = await saasManager.isActive();
    if (!isActive) {
        const sub = await saasManager.getCurrentSubscription();
        if (sub && new Date(sub.end_date) < new Date()) {
            // Abonnement expiré → rediriger vers payment
            alert('⚠️ انتهى اشتراكك. يرجى التجديد للمتابعة.');
            window.location.href = 'payment.html';
            return;
        }
    }
    
    this.setupSidebar();
    this.setupHeaderActions();
    
    // ✅ AFFICHER LE BANDEAU D'ALERTE
    await this.setupSubscriptionAlert();
    
    setTimeout(async () => {
        await this.navigateTo('dashboard');
    }, 100);
}

async setupSubscriptionAlert() {
    const alertDiv = document.getElementById('subscriptionAlert');
    if (alertDiv && window.saasManager) {
        alertDiv.innerHTML = await saasManager.getAlertBanner();
    }
}
    async init() {
        console.log('App initialized with Supabase');
        this.setupSidebar();
        this.setupHeaderActions();
        await this.setupSubscriptionAlert();
        
        // Charger le dashboard par défaut
        setTimeout(async () => {
            await this.navigateTo('dashboard');
        }, 100);
    }

    // Afficher l'alerte d'abonnement si nécessaire
    async setupSubscriptionAlert() {
        if (window.saasManager) {
            const alertDiv = document.getElementById('subscriptionAlert');
            if (alertDiv) {
                alertDiv.innerHTML = await saasManager.getAlertBanner();
            }
        }
    }

    setupSidebar() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const page = item.dataset.page;
            const href = item.getAttribute('href');

            // 🔗 رابط خارجي (مثل payment.html) بدون data-page :
            // نترك المتصفح ينتقل بشكل طبيعي
            if (!page) {
                if (href && href !== '#') return; // ✅ لا preventDefault
                e.preventDefault();
                return;
            }

            e.preventDefault();
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            this.navigateTo(page);
        });
    });
}

    setupHeaderActions() {
        // Menu mobile
        const menuToggle = document.getElementById('menuToggle');
        const sidebar = document.getElementById('sidebar');
        if (menuToggle && sidebar) {
            menuToggle.addEventListener('click', () => {
                sidebar.classList.toggle('active');
            });
        }

        // Notifications
        const notificationBell = document.getElementById('notificationBell');
        if (notificationBell) {
            notificationBell.addEventListener('click', () => {
                this.showNotifications();
            });
        }

        // Déconnexion
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                if (confirm('هل تريد تسجيل الخروج؟')) {
                    await db.logout();
                    window.location.href = 'index.html';
                }
            });
        }

        // Badge notifications
        if (window.ui) {
            ui.updateNotificationBadge(3);
        }
    }

    async navigateTo(page) {
        console.log('Navigating to:', page);
        
        // Fermer le menu mobile
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.classList.remove('active');
        
        const contentArea = document.getElementById('contentArea');
        if (!contentArea) {
            console.error('contentArea not found!');
            return;
        }

        switch(page) {
            case 'dashboard':
                document.querySelector('.header-title').textContent = 'لوحة التحكم';
                if (window.dashboard) {
                    await dashboard.init();
                }
                break;
            case 'students':
                if (window.studentsManager) {
                    await studentsManager.render();
                } else {
                    contentArea.innerHTML = '<p style="color: red;">Error: studentsManager not loaded</p>';
                }
                break;
            case 'teachers':
                if (window.teachersManager) {
                    await teachersManager.render();
                } else {
                    contentArea.innerHTML = '<p style="color: red;">Error: teachersManager not loaded</p>';
                }
                break;
            case 'classes':
                if (window.classesManager) {
                    await classesManager.render();
                } else {
                    contentArea.innerHTML = '<p style="color: red;">Error: classesManager not loaded</p>';
                }
                break;
            case 'schedules':
                if (window.schedulesManager) {
                    await schedulesManager.render();
                } else {
                    contentArea.innerHTML = '<p style="color: red;">Error: schedulesManager not loaded</p>';
                }
                break;
            case 'attendance':
                if (window.attendanceManager) {
                    await attendanceManager.render();
                } else {
                    contentArea.innerHTML = '<p style="color: red;">Error: attendanceManager not loaded</p>';
                }
                break;
            case 'grades':
                if (window.gradesManager) {
                    await gradesManager.render();
                } else {
                    contentArea.innerHTML = '<p style="color: red;">Error: gradesManager not loaded</p>';
                }
                break;
            case 'finance':
                if (window.financeManager) {
                    await financeManager.render();
                } else {
                    contentArea.innerHTML = '<p style="color: red;">Error: financeManager not loaded</p>';
                }
                break;
            case 'ai-assistant':
                if (window.aiHelper) {
                    await aiHelper.render();
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
            case 'payment':
            case 'upgrade':
                    window.location.href = 'payment.html';
                return;
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
                icon: '',
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