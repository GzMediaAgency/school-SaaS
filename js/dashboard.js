// js/dashboard.js
class DashboardManager {
constructor() {
this.contentArea = document.getElementById('contentArea');
this.barChartCanvas = null;
this.pieChartCanvas = null;
}
render() {
     document.querySelector('.header-title').textContent = 'لوحة التحكم';
     this.contentArea.innerHTML = `
         <div class="stats-grid">
             <div class="stat-card">
                 <div class="stat-icon blue">👨‍🎓</div>
                 <div class="stat-info">
                     <h3>إجمالي الطلاب</h3>
                     <div class="stat-value" id="statStudents">0</div>
                 </div>
             </div>
             <div class="stat-card">
                 <div class="stat-icon green">👨‍🏫</div>
                 <div class="stat-info">
                     <h3>إجمالي الأساتذة</h3>
                     <div class="stat-value" id="statTeachers">0</div>
                 </div>
             </div>
             <div class="stat-card">
                 <div class="stat-icon blue">💰</div>
                 <div class="stat-info">
                     <h3>المداخيل الشهرية</h3>
                     <div class="stat-value" id="statIncome">0 درهم</div>
                 </div>
             </div>
             <div class="stat-card">
                 <div class="stat-icon green">✅</div>
                 <div class="stat-info">
                     <h3>نسبة الحضور</h3>
                     <div class="stat-value" id="statAttendance">0%</div>
                 </div>
             </div>
         </div>

         <div class="stats-grid" style="grid-template-columns: 3fr 2fr;">
             <div class="card">
                 <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
                     <h3 style="margin: 0;">المداخيل والمصاريف</h3>
                     <div style="display: flex; gap: 1rem;">
                         <span style="display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; color: var(--text-primary);">
                             <span style="width: 12px; height: 12px; border-radius: 3px; background: #2A9D8F; display: inline-block;"></span>
                             المداخيل
                         </span>
                         <span style="display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; color: var(--text-primary);">
                             <span style="width: 12px; height: 12px; border-radius: 3px; background: #E63946; display: inline-block;"></span>
                             المصاريف
                         </span>
                     </div>
                 </div>
                 <canvas id="barChart" width="600" height="300"></canvas>
             </div>
             <div class="card">
                 <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
                     <h3 style="margin: 0;">توزيع الطلاب</h3>
                     <div id="pieChartLegend" style="display: flex; gap: 0.75rem; flex-wrap: wrap;"></div>
                 </div>
                 <canvas id="pieChart" width="380" height="300"></canvas>
             </div>
         </div>

         <div class="stats-grid" style="grid-template-columns: 1fr 1fr; margin-top: 2rem;">
             <div class="card">
                 <h3 style="margin-bottom: 1rem;">آخر الحركات المالية</h3>
                 <div class="table-container">
                     <table>
                         <thead>
                             <tr>
                                 <th>النوع</th>
                                 <th>الفئة</th>
                                 <th>المبلغ</th>
                                 <th>التاريخ</th>
                             </tr>
                         </thead>
                         <tbody id="recentFinance"></tbody>
                     </table>
                 </div>
             </div>
             <div class="card">
                 <h3 style="margin-bottom: 1rem;">آخر الطلاب المسجلين</h3>
                 <div class="table-container">
                     <table>
                         <thead>
                             <tr>
                                 <th>الاسم</th>
                                 <th>الفصل</th>
                                 <th>الحالة</th>
                             </tr>
                         </thead>
                         <tbody id="recentStudents"></tbody>
                     </table>
                 </div>
             </div>
         </div>
     `;
     this.barChartCanvas = document.getElementById('barChart');
     this.pieChartCanvas = document.getElementById('pieChart');
     this.init();
 }
 init() {
     this.loadStatistics();
     this.drawBarChart();
     this.drawPieChart();
     this.loadRecentFinance();
     this.loadRecentStudents();
 }
 loadStatistics() {
     const stats = db.getStatistics();
     document.getElementById('statStudents').textContent = ui.formatNumber(stats.totalStudents);
     document.getElementById('statTeachers').textContent = ui.formatNumber(stats.totalTeachers);
     document.getElementById('statIncome').textContent = `${ui.formatNumber(stats.monthlyIncome)} درهم`;
     document.getElementById('statAttendance').textContent = `${stats.attendanceRate}%`;
 }
 drawBarChart() {
     const canvas = this.barChartCanvas;
     const ctx = canvas.getContext('2d');
     const width = canvas.width;
     const height = canvas.height;
     ctx.clearRect(0, 0, width, height);
     const months = this.getLast6Months();
     const finance = db.getData('finance');
     const data = months.map(month => {
         const monthFinance = finance.filter(f => {
             const date = new Date(f.date);
             return date.getMonth() === month.month && date.getFullYear() === month.year;
         });
         const income = monthFinance
             .filter(f => f.type === 'income')
             .reduce((sum, f) => sum + f.amount, 0);
         const expense = monthFinance
             .filter(f => f.type === 'expense')
             .reduce((sum, f) => sum + f.amount, 0);
         return {
             label: month.label,
             income: income,
             expense: expense
         };
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
         ctx.font = '12px Segoe UI';
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
         ctx.font = '12px Segoe UI';
         ctx.textAlign = 'center';
         ctx.fillText(item.label, x + barGroupWidth / 2, height - padding + 20);
     });
 }
 drawPieChart() {
     const canvas = this.pieChartCanvas;
     const ctx = canvas.getContext('2d');
     const width = canvas.width;
     const height = canvas.height;
     ctx.clearRect(0, 0, width, height);
     const legendContainer = document.getElementById('pieChartLegend');
     const classes = db.getData('classes');
     const students = db.getData('students');
     const data = classes.map(cls => ({
         label: cls.name,
         value: students.filter(s => s.classId === cls.id).length,
         color: this.getRandomColor()
     })).filter(d => d.value > 0);
     if (data.length === 0) {
         ctx.fillStyle = '#6C757D';
         ctx.font = '16px Segoe UI';
         ctx.textAlign = 'center';
         ctx.fillText('لا توجد بيانات', width / 2, height / 2);
         if (legendContainer) legendContainer.innerHTML = '';
         return;
     }
     const radius = Math.min(width, height) / 2 - 15;
     const centerX = width / 2;
     const centerY = height / 2;
     const total = data.reduce((sum, d) => sum + d.value, 0);
     let startAngle = 0;
     data.forEach((item, index) => {
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
     if (legendContainer) {
         legendContainer.innerHTML = data.map(item => {
             const percentage = ((item.value / total) * 100).toFixed(1);
             return `
                 <span style="display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.78rem; color: var(--text-primary);">
                     <span style="width: 12px; height: 12px; border-radius: 3px; background: ${item.color}; display: inline-block;"></span>
                     ${item.label} (${percentage}%)
                 </span>
             `;
         }).join('');
     }
 }
 loadRecentFinance() {
     const finance = db.getData('finance')
         .sort((a, b) => new Date(b.date) - new Date(a.date))
         .slice(0, 5);
     const tbody = document.getElementById('recentFinance');
     tbody.innerHTML = finance.map(f => `
         <tr>
             <td>
                 <span class="badge ${f.type === 'income' ? 'badge-success' : 'badge-danger'}">
                     ${f.type === 'income' ? 'دخل' : 'مصروف'}
                 </span>
             </td>
             <td>${f.category}</td>
             <td style="color: ${f.type === 'income' ? 'var(--success-green)' : 'var(--danger-red)'}; font-weight: bold;">
                 ${f.type === 'income' ? '+' : '-'}${ui.formatNumber(f.amount)} درهم
             </td>
             <td>${ui.formatDate(f.date)}</td>
         </tr>
     `).join('');
 }
 loadRecentStudents() {
     const students = db.getData('students')
         .sort((a, b) => new Date(b.enrollmentDate) - new Date(a.enrollmentDate))
         .slice(0, 5);
     const classes = db.getData('classes');
     const tbody = document.getElementById('recentStudents');
     tbody.innerHTML = students.map(s => {
         const studentClass = classes.find(c => c.id === s.classId);
         return `
             <tr>
                 <td>${s.fullName}</td>
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
     const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'ماي', 'يونيو', 
                        'يوليوز', 'غشت', 'شتنبر', 'أكتوبر', 'نونبر', 'دجنبر'];
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