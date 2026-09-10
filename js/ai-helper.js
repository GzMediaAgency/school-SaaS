// js/ai-helper.js
class AIHelper {
    constructor() {
        this.contentArea = document.getElementById('contentArea');
    }

    // ✅ render() devient async
    async render() {
        document.querySelector('.header-title').textContent = 'المساعد الذكي (AI)';
        const insights = await this.generateInsights();
        
        this.contentArea.innerHTML = `
            <div class="card" style="margin-bottom: 2rem; background: linear-gradient(135deg, var(--primary-blue) 0%, var(--light-blue) 100%); color: white; border: none;">
                <div style="display: flex; align-items: center; gap: 1.5rem;">
                    <div style="font-size: 4rem;">🤖</div>
                    <div>
                        <h2 style="margin: 0; font-size: 1.8rem;">المساعد الذكي للمؤسسة</h2>
                        <p style="opacity: 0.9; margin: 0.5rem 0 0;">تحليلات وتوصيات فورية مبنية على بيانات المؤسسة</p>
                    </div>
                </div>
            </div>
            <div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));">
                ${insights.map(insight => `
                    <div class="card" style="border-right: 5px solid ${insight.color};">
                        <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                            <div style="font-size: 2.5rem;">${insight.icon}</div>
                            <h3 style="color: var(--text-primary); margin: 0; font-size: 1.2rem;">${insight.title}</h3>
                        </div>
                        <p style="color: var(--text-secondary); line-height: 1.7; margin-bottom: 1rem;">${insight.message}</p>
                        ${insight.action ? `<button class="btn btn-outline" style="width: 100%;" onclick="app.navigateTo('${insight.action}')">انتقل إلى القسم</button>` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    }

    // ✅ async pour récupérer toutes les données
    async generateInsights() {
        const insights = [];
        const students = await db.getData('students');
        const classes = await db.getData('classes');
        const attendance = await db.getData('attendance');
        const grades = await db.getData('grades');
        const finance = await db.getData('finance');

        // 1. تحليل الطلاب المتعثرين
        const failingStudents = [];
        students.forEach(s => {
            const studentGrades = grades.filter(g => g.student_id === s.id);
            if (studentGrades.length > 0) {
                const avg = studentGrades.reduce((sum, g) => sum + parseFloat(g.score || 0), 0) / studentGrades.length;
                if (avg < 10) failingStudents.push(s.full_name);
            }
        });

        if (failingStudents.length > 0) {
            insights.push({
                icon: '⚠️',
                title: 'طلاب بحاجة لدعم أكاديمي',
                message: `يوجد ${failingStudents.length} طالب بمعدل أقل من 10/20. يُنصح بتنظيم حصص دعم إضافية لهم.`,
                color: 'var(--danger-red)',
                action: 'grades'
            });
        } else {
            insights.push({
                icon: '✅',
                title: 'المستوى الأكاديمي ممتاز',
                message: 'جميع الطلاب المسجل لهم نقاط يحققون معدلاً فوق 10/20. استمر في هذا النهج!',
                color: 'var(--success-green)'
            });
        }

        // 2. تحليل الحضور
        const totalRecords = attendance.length;
        const presentRecords = attendance.filter(a => a.status === 'present').length;
        const attendanceRate = totalRecords > 0 ? ((presentRecords / totalRecords) * 100).toFixed(1) : 0;

        if (totalRecords > 0 && attendanceRate < 80) {
            insights.push({
                icon: '📉',
                title: 'نسبة الحضور منخفضة',
                message: `نسبة الحضور الحالية هي ${attendanceRate}% وهي أقل من 80%. يُنصح بالتواصل مع الطلاب الغائبين.`,
                color: 'var(--danger-red)',
                action: 'attendance'
            });
        } else {
            insights.push({
                icon: '📈',
                title: 'نسبة حضور ممتازة',
                message: `نسبة الحضور الحالية هي ${attendanceRate}%. المستوى العام للحضور جيد جداً.`,
                color: 'var(--success-green)',
                action: 'attendance'
            });
        }

        // 3. التحليل المالي
        const totalIncome = finance.filter(f => f.type === 'income').reduce((sum, f) => sum + parseFloat(f.amount || 0), 0);
        const totalExpense = finance.filter(f => f.type === 'expense').reduce((sum, f) => sum + parseFloat(f.amount || 0), 0);
        const balance = totalIncome - totalExpense;

        if (balance < 0) {
            insights.push({
                icon: '💸',
                title: 'عجز مالي',
                message: `المصاريف تتجاوز المداخيل بمقدار ${ui.formatNumber(Math.abs(balance))} درهم. يجب مراجعة الميزانية.`,
                color: 'var(--danger-red)',
                action: 'finance'
            });
        } else {
            insights.push({
                icon: '💰',
                title: 'صحة مالية جيدة',
                message: `الرصيد الحالي إيجابي بمقدار ${ui.formatNumber(balance)} درهم. المؤسسة تتمتع باستقرار مالي.`,
                color: 'var(--success-green)',
                action: 'finance'
            });
        }

        // 4. تحليل استيعاب الفصول
        let overcrowded = 0;
        classes.forEach(cls => {
            const count = students.filter(s => s.class_id === cls.id).length;
            if (count > cls.capacity) overcrowded++;
        });

        if (overcrowded > 0) {
            insights.push({
                icon: '🏫',
                title: 'فصول مزدحمة',
                message: `يوجد ${overcrowded} فصل يتجاوز عدد طلابه سعته الاستيعابية. يُنصح بتقسيمها.`,
                color: '#ffc107',
                action: 'classes'
            });
        } else {
            insights.push({
                icon: '',
                title: 'استيعاب الفصول مثالي',
                message: 'جميع الفصول ضمن سعتها الاستيعابية. التوزيع الحالي للطلاب ممتاز.',
                color: 'var(--success-green)',
                action: 'classes'
            });
        }

        return insights;
    }
}

window.aiHelper = new AIHelper();