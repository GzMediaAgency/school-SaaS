// js/attendance.js
class AttendanceManager {
    constructor() {
        this.contentArea = document.getElementById('contentArea');
        this.selectedClass = '';
        this.selectedDate = new Date().toISOString().split('T')[0];
    }

    // ✅ render() devient async
    async render() {
        document.querySelector('.header-title').textContent = 'الحضور والغياب';
        this.contentArea.innerHTML = `
            <div class="card" style="padding: 1.5rem; margin-bottom: 1.5rem;">
                <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
                    <div style="flex: 1; min-width: 200px;">
                        <label class="form-label">اختر الفصل *</label>
                        <select id="attendanceClass" class="form-input">
                            <option value="">-- اختر الفصل --</option>
                        </select>
                    </div>
                    <div style="flex: 1; min-width: 200px;">
                        <label class="form-label">التاريخ *</label>
                        <input type="date" id="attendanceDate" class="form-input" value="${this.selectedDate}">
                    </div>
                    <div style="align-self: flex-end; display: flex; gap: 0.5rem;">
                        <button class="btn btn-primary" id="loadAttendanceBtn">تحميل القائمة</button>
                        <button class="btn btn-outline" id="monthlyReportBtn"> التقرير الشهري</button>
                    </div>
                </div>
            </div>
            <div id="attendanceContainer" style="display: none;">
                <div class="table-container">
                    <div class="table-header">
                        <h3 class="table-title">قائمة الحضور</h3>
                        <button class="btn btn-success" id="saveAttendanceBtn">حفظ الحضور</button>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>اسم الطالب</th>
                                <th style="text-align: center;">حاضر</th>
                                <th style="text-align: center;">غائب</th>
                                <th style="text-align: center;">متأخر</th>
                                <th>ملاحظات</th>
                            </tr>
                        </thead>
                        <tbody id="attendanceTableBody"></tbody>
                    </table>
                </div>
            </div>
            <div id="noClassSelected" class="card" style="text-align: center; padding: 3rem;">
                <p style="color: var(--text-secondary); font-size: 1.1rem;">يرجى اختيار الفصل والتاريخ لعرض قائمة الحضور</p>
            </div>
            <!-- Modal Rapport Mensuel -->
            <div class="modal" id="monthlyReportModal">
                <div class="modal-content" style="max-width: 900px;">
                    <div class="modal-header">
                        <h3 class="modal-title">التقرير الشهري للغياب</h3>
                        <button class="modal-close" onclick="closeModal('monthlyReportModal')">×</button>
                    </div>
                    <div style="margin-bottom: 1rem; display: flex; gap: 1rem; align-items: center;">
                        <label>الشهر:</label>
                        <input type="month" id="reportMonth" class="form-input" style="max-width: 200px;" value="${new Date().toISOString().slice(0, 7)}">
                        <button class="btn btn-primary" id="generateReportBtn">عرض التقرير</button>
                        <button class="btn btn-success" id="exportReportBtn">📥 تصدير</button>
                    </div>
                    <div id="monthlyReportContent" style="overflow-x: auto;"></div>
                </div>
            </div>
        `;
        await this.loadClasses();
        this.attachEvents();
    }

    // ✅ async
    async loadClasses() {
        const classes = await db.getData('classes');
        const select = document.getElementById('attendanceClass');
        classes.forEach(cls => {
            const opt = document.createElement('option');
            opt.value = cls.id;
            opt.textContent = cls.name;
            select.appendChild(opt);
        });
    }

    // ✅ async
    async loadAttendance() {
        if (!this.selectedClass) {
            document.getElementById('noClassSelected').style.display = 'block';
            document.getElementById('attendanceContainer').style.display = 'none';
            return;
        }
        document.getElementById('noClassSelected').style.display = 'none';
        document.getElementById('attendanceContainer').style.display = 'block';

        const students = (await db.getData('students')).filter(s => s.class_id === this.selectedClass);
        const existingAttendance = (await db.getData('attendance')).filter(a =>
            a.date === this.selectedDate &&
            students.some(s => s.id === a.student_id)
        );

        const tbody = document.getElementById('attendanceTableBody');
        tbody.innerHTML = students.map((s) => {
            const record = existingAttendance.find(a => a.student_id === s.id);
            const status = record ? record.status : 'present';
            const notes = record ? record.notes : '';
            return `
                <tr data-student-id="${s.id}">
                    <td><strong>${s.full_name}</strong></td>
                    <td style="text-align: center;">
                        <input type="radio" name="status_${s.id}" value="present" ${status === 'present' ? 'checked' : ''}>
                    </td>
                    <td style="text-align: center;">
                        <input type="radio" name="status_${s.id}" value="absent" ${status === 'absent' ? 'checked' : ''}>
                    </td>
                    <td style="text-align: center;">
                        <input type="radio" name="status_${s.id}" value="late" ${status === 'late' ? 'checked' : ''}>
                    </td>
                    <td>
                        <input type="text" class="form-input" style="padding: 0.25rem 0.5rem;" value="${notes}" data-notes-for="${s.id}">
                    </td>
                </tr>
            `;
        }).join('');
    }

    // ✅ async - Génération du rapport mensuel
    async generateMonthlyReport(month, classId) {
        const students = (await db.getData('students')).filter(s => s.class_id === classId);
        const allAttendance = await db.getData('attendance');
        const [year, monthNum] = month.split('-').map(Number);
        const daysInMonth = new Date(year, monthNum, 0).getDate();
        const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
            'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

        let html = `<h4 style="margin-bottom: 1rem; color: var(--text-primary);">تقرير ${monthNames[monthNum - 1]} ${year}</h4>`;
        html += '<table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">';
        html += '<thead><tr><th style="border: 1px solid #ddd; padding: 0.5rem;">الطالب</th>';
        for (let d = 1; d <= daysInMonth; d++) {
            html += `<th style="border: 1px solid #ddd; padding: 0.25rem; font-size: 0.7rem;">${d}</th>`;
        }
        html += '<th style="border: 1px solid #ddd; padding: 0.5rem;">إجمالي الغياب</th><th style="border: 1px solid #ddd; padding: 0.5rem;">النسبة</th></tr></thead><tbody>';

        students.forEach(s => {
            let absentCount = 0;
            let totalDays = 0;
            html += `<tr><td style="border: 1px solid #ddd; padding: 0.5rem; font-weight: bold;">${s.full_name}</td>`;
            for (let d = 1; d <= daysInMonth; d++) {
                const dateStr = `${year}-${String(monthNum).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const record = allAttendance.find(a => a.student_id === s.id && a.date === dateStr);
                if (record) {
                    totalDays++;
                    if (record.status === 'absent') {
                        absentCount++;
                        html += '<td style="border: 1px solid #ddd; padding: 0.25rem; text-align: center; background: #ffebee; color: var(--danger-red);">غ</td>';
                    } else if (record.status === 'late') {
                        html += '<td style="border: 1px solid #ddd; padding: 0.25rem; text-align: center; background: #fff3e0; color: #f57c00;">م</td>';
                    } else {
                        html += '<td style="border: 1px solid #ddd; padding: 0.25rem; text-align: center; background: #e8f5e9; color: var(--success-green);">ح</td>';
                    }
                } else {
                    html += '<td style="border: 1px solid #ddd; padding: 0.25rem; text-align: center; color: #ccc;">-</td>';
                }
            }
            const rate = totalDays > 0 ? ((absentCount / totalDays) * 100).toFixed(0) : 0;
            html += `<td style="border: 1px solid #ddd; padding: 0.5rem; text-align: center; font-weight: bold; color: ${absentCount > 3 ? 'var(--danger-red)' : 'var(--text-primary)'};">${absentCount}</td>`;
            html += `<td style="border: 1px solid #ddd; padding: 0.5rem; text-align: center;">${rate}%</td>`;
            html += '</tr>';
        });
        html += '</tbody></table>';
        html += '<div style="margin-top: 1rem; font-size: 0.85rem; color: var(--text-secondary);">';
        html += '<span style="margin-left: 1rem;">🟢 ح = حاضر</span>';
        html += '<span style="margin-left: 1rem;">🔴 غ = غائب</span>';
        html += '<span style="margin-left: 1rem;">🟡 م = متأخر</span>';
        html += '</div>';
        return html;
    }

    // ✅ async - Export CSV
    async exportMonthlyReport(month, classId) {
        const students = (await db.getData('students')).filter(s => s.class_id === classId);
        const allAttendance = await db.getData('attendance');
        const classes = await db.getData('classes');
        const cls = classes.find(c => c.id === classId);
        const [year, monthNum] = month.split('-').map(Number);
        const daysInMonth = new Date(year, monthNum, 0).getDate();
        const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
            'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

        let csv = '\uFEFF'; // BOM UTF-8
        csv += `تقرير الغياب الشهري - ${cls ? cls.name : ''} - ${monthNames[monthNum - 1]} ${year}\n\n`;
        csv += 'الطالب,';
        for (let d = 1; d <= daysInMonth; d++) {
            csv += `${d},`;
        }
        csv += 'إجمالي الغياب,نسبة الغياب\n';

        students.forEach(s => {
            csv += `${s.full_name},`;
            let absentCount = 0;
            let totalDays = 0;
            for (let d = 1; d <= daysInMonth; d++) {
                const dateStr = `${year}-${String(monthNum).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const record = allAttendance.find(a => a.student_id === s.id && a.date === dateStr);
                if (record) {
                    totalDays++;
                    if (record.status === 'absent') {
                        absentCount++;
                        csv += 'غائب,';
                    } else if (record.status === 'late') {
                        csv += 'متأخر,';
                    } else {
                        csv += 'حاضر,';
                    }
                } else {
                    csv += '-,';
                }
            }
            const rate = totalDays > 0 ? ((absentCount / totalDays) * 100).toFixed(0) : 0;
            csv += `${absentCount},${rate}%\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `تقرير_الغياب_${cls ? cls.name : ''}_${month}.csv`;
        link.click();
        ui.showToast('تم تصدير التقرير بنجاح', 'success');
    }

    attachEvents() {
        document.getElementById('attendanceClass').addEventListener('change', (e) => {
            this.selectedClass = e.target.value;
        });
        document.getElementById('attendanceDate').addEventListener('change', (e) => {
            this.selectedDate = e.target.value;
        });
        document.getElementById('loadAttendanceBtn').addEventListener('click', () => {
            if (!this.selectedClass) {
                ui.showToast('يرجى اختيار الفصل', 'error');
                return;
            }
            this.loadAttendance();
        });
        // ✅ async
        document.getElementById('saveAttendanceBtn').addEventListener('click', async () => {
            await this.saveAttendance();
        });
        document.getElementById('monthlyReportBtn').addEventListener('click', () => {
            if (!this.selectedClass) {
                ui.showToast('يرجى اختيار الفصل أولاً', 'error');
                return;
            }
            ui.openModal('monthlyReportModal');
        });
        // ✅ async
        document.getElementById('generateReportBtn').addEventListener('click', async () => {
            const month = document.getElementById('reportMonth').value;
            if (!month || !this.selectedClass) {
                ui.showToast('يرجى اختيار الشهر', 'error');
                return;
            }
            const report = await this.generateMonthlyReport(month, this.selectedClass);
            document.getElementById('monthlyReportContent').innerHTML = report;
        });
        // ✅ async
        document.getElementById('exportReportBtn').addEventListener('click', async () => {
            const month = document.getElementById('reportMonth').value;
            if (!month || !this.selectedClass) {
                ui.showToast('يرجى اختيار الشهر', 'error');
                return;
            }
            await this.exportMonthlyReport(month, this.selectedClass);
        });
    }

    // ✅ async - Sauvegarde optimisée pour Supabase
    async saveAttendance() {
        const students = (await db.getData('students')).filter(s => s.class_id === this.selectedClass);
        const attendanceData = [];

        students.forEach(s => {
            const statusRadio = document.querySelector(`input[name="status_${s.id}"]:checked`);
            const notesInput = document.querySelector(`input[data-notes-for="${s.id}"]`);
            if (statusRadio) {
                attendanceData.push({
                    student_id: s.id,
                    date: this.selectedDate,
                    status: statusRadio.value,
                    notes: notesInput ? notesInput.value.trim() : ''
                });
            }
        });

        // Supprimer les anciens enregistrements pour cette date et ces étudiants
        const allAttendance = await db.getData('attendance');
        const studentIds = students.map(s => s.id);
        const filtered = allAttendance.filter(a =>
            !(a.date === this.selectedDate && studentIds.includes(a.student_id))
        );

        // Ajouter les nouveaux enregistrements
        attendanceData.forEach(record => {
            filtered.push({
                id: Date.now().toString() + Math.random(),
                ...record
            });
        });

        // Sauvegarder via le wrapper Supabase
        await db.setData('attendance', filtered);
        ui.showToast('تم حفظ الحضور بنجاح', 'success');
    }
}

window.attendanceManager = new AttendanceManager();