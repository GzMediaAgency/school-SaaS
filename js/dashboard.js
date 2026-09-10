// js/dashboard.js
class DashboardManager {
    constructor() {
        this.barChartCanvas = document.getElementById('barChart');
        this.pieChartCanvas = document.getElementById('pieChart');
    }

    // ✅ init() devient async
    async init() {
        await this.loadStatistics();
        this.drawBarChart(); // Le dessin du canvas reste synchrone une fois les données chargées
        this.drawPieChart();
        await this.loadRecentFinance();
        await this.loadRecentStudents();
    }

    // ✅ async + await
    async loadStatistics() {
        const students = await db.getData('students');
        const teachers = await db.getData('teachers');
        const finance = await db.getData('finance');
        const attendance = await db.getData('attendance');

        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        const monthlyIncome = finance
            .filter(f => {
                const date = new Date(f.date);
                return f.type === 'income' &&
                    date.getMonth() === currentMonth &&
                    date.getFullYear() === currentYear;
            })
            .reduce((sum, f) => sum + parseFloat(f.amount || 0), 0);

        const presentCount = attendance.filter(a => a.status === 'present').length;
        const totalAttendance = attendance.length;
        const attendanceRate = totalAttendance > 0 ? (presentCount / totalAttendance) * 100 : 0;

        document.getElementById('statStudents').textContent = ui.formatNumber(students.length);
        document.getElementById('statTeachers').textContent = ui.formatNumber(teachers.length);
        document.getElementById('statIncome').textContent = `${ui.formatNumber(monthlyIncome)} درهم`;
        document.getElementById('statAttendance').textContent = `${Math.round(attendanceRate)}%`;
    }

    // ✅ async pour récupérer les données, puis dessin synchrone
    async drawBarChart() {
        const canvas = this.barChartCanvas;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        ctx.clearRect(0, 0, width, height);

        const months = this.getLast6Months();
        const finance = await db.getData('finance');
        
        const data = months.map(month => {
            const monthFinance = finance.filter(f => {
                const date = new Date(f.date);
                return date.getMonth() === month.month && date.getFullYear() === month.year;
            });
            const income = monthFinance.filter(f => f.type === 'income').reduce((sum, f) => sum + parseFloat(f.amount || 0), 0);
            const expense = monthFinance.filter(f => f.type === 'expense').reduce((sum, f) => sum + parseFloat(f.amount || 0), 0);
            return { label: month.label, income: income, expense: expense };
        });

        const padding = 50;
        const chartWidth = width - padding * 2;
        const chartHeight = height - padding * 2;
        const maxValue = Math.max(...data.map(d => Math.max(d.income, d.expense))) || 10000;

        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, height - padding);
        ctx.lineTo(width - padding, height - padding);
        ctx.stroke();

        ctx.strokeStyle = '#f0f0f0';
        for (let i = 0; i <= 5; i++) {
            const y = padding + (chartHeight / 5) * i;
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(width - padding, y);
            ctx.stroke();
            const value = maxValue - (maxValue / 5) * i;
            ctx.fillStyle = '#6C757D';
            ctx.font = '12px Tajawal';
            ctx.textAlign = 'right';
            ctx.fillText(ui.formatNumber(Math.round(value)), padding - 10, y + 4);
        }

        const barGroupWidth = chartWidth / data.length;
        const barWidth = barGroupWidth / 3;
        data.forEach((item, index) => {
            const x = padding + barGroupWidth * index;
            const incomeHeight = (item.income / maxValue) * chartHeight;
            ctx.fillStyle = '#2A9D8F';
            ctx.fillRect(x + barGroupWidth / 6, height - padding - incomeHeight, barWidth, incomeHeight);
            const expenseHeight = (item.expense / maxValue) * chartHeight;
            ctx.fillStyle = '#E63946';
            ctx.fillRect(x + barGroupWidth / 6 + barWidth, height - padding - expenseHeight, barWidth, expenseHeight);
            ctx.fillStyle = '#1D3557';
            ctx.font = '12px Tajawal';
            ctx.textAlign = 'center';
            ctx.fillText(item.label, x + barGroupWidth / 2, height - padding + 20);
        });

        // Légende
        ctx.fillStyle = '#2A9D8F';
        ctx.fillRect(width - 150, 20, 15, 15);
        ctx.fillStyle = '#1D3557';
        ctx.font = '12px Tajawal';
        ctx.textAlign = 'left';
        ctx.fillText('المداخيل', width - 130, 32);
        ctx.fillStyle = '#E63946';
        ctx.fillRect(width - 150, 45, 15, 15);
        ctx.fillStyle = '#1D3557';
        ctx.fillText('المصاريف', width - 130, 57);
    }

    // ✅ async
    async drawPieChart() {
        const canvas = this.pieChartCanvas;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        ctx.clearRect(0, 0, width, height);

        const classes = await db.getData('classes');
        const students = await db.getData('students');

        const data = classes.map(cls => ({
            label: cls.name,
            value: students.filter(s => s.class_id === cls.id).length,
            color: this.getRandomColor()
        })).filter(d => d.value > 0);

        if (data.length === 0) {
            ctx.fillStyle = '#6C757D';
            ctx.font = '16px Tajawal';
            ctx.textAlign = 'center';
            ctx.fillText('لا توجد بيانات', width / 2, height / 2);
            return;
        }

        const centerX = width / 2 - 80;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 3;
        const total = data.reduce((sum, d) => sum + d.value, 0);
        let startAngle = 0;

        data.forEach((item) => {
            const sliceAngle = (item.value / total) * 2 * Math.PI;
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
            ctx.closePath();
            ctx.fillStyle = item.color;
            ctx.fill();
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2;
            ctx.stroke();
            startAngle += sliceAngle;
        });

        let legendY = 50;
        data.forEach((item) => {
            const percentage = ((item.value / total) * 100).toFixed(1);
            ctx.fillStyle = item.color;
            ctx.fillRect(width - 150, legendY, 15, 15);
            ctx.fillStyle = '#1D3557';
            ctx.font = '12px Tajawal';
            ctx.textAlign = 'left';
            ctx.fillText(`${item.label} (${percentage}%)`, width - 130, legendY + 12);
            legendY += 25;
        });
    }

    // ✅ async
    async loadRecentFinance() {
        const finance = (await db.getData('finance'))
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5);
        const tbody = document.getElementById('recentFinance');
        if (!tbody) return;
        
        tbody.innerHTML = finance.map(f => `
            <tr>
                <td>
                    <span class="badge ${f.type === 'income' ? 'badge-success' : 'badge-danger'}">
                        ${f.type === 'income' ? 'دخل' : 'مصروف'}
                    </span>
                </td>
                <td>${f.category}</td>
                <td style="color: ${f.type === 'income' ? 'var(--success-green)' : 'var(--danger-red)'}; font-weight: bold;">
                    ${f.type === 'income' ? '+' : '-'}${ui.formatNumber(parseFloat(f.amount || 0))} درهم
                </td>
                <td>${ui.formatDate(f.date)}</td>
            </tr>
        `).join('');
    }

    // ✅ async
    async loadRecentStudents() {
        const students = (await db.getData('students'))
            .sort((a, b) => new Date(b.enrollment_date || b.created_at) - new Date(a.enrollment_date || a.created_at))
            .slice(0, 5);
        const classes = await db.getData('classes');
        const tbody = document.getElementById('recentStudents');
        if (!tbody) return;

        tbody.innerHTML = students.map(s => {
            const studentClass = classes.find(c => c.id === s.class_id);
            return `
                <tr>
                    <td>${s.full_name}</td>
                    <td>${studentClass ? studentClass.name : 'غير محدد'}</td>
                    <td>
                        <span class="badge ${s.status === 'active' ? 'badge-success' : 'badge-danger'}">
                            ${s.status === 'active' ? 'نشط' : 'غير نشط'}
                        </span>
                    </td>
                </tr>
            `;
        }).join('');
    }

    getLast6Months() {
        const months = [];
        const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 
                           'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push({
                month: date.getMonth(),
                year: date.getFullYear(),
                label: monthNames[date.getMonth()]
            });
        }
        return months;
    }

    getRandomColor() {
        const colors = ['#1D3557', '#457B9D', '#2A9D8F', '#E63946', '#F4A261', '#264653'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
}

window.dashboard = new DashboardManager();