// js/schedules.js
class SchedulesManager {
    constructor() {
        this.contentArea = document.getElementById('contentArea');
        this.selectedClass = 'all';
        // لأسبوع يبدأ بالأحد غيّر هذا السطر فقط : ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس']
        this.dayNames = ['الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        this.timeSlots = [
            { period: 'am', start: '08:00', end: '09:00' },
            { period: 'am', start: '09:00', end: '10:00' },
            { period: 'am', start: '10:00', end: '11:00' },
            { period: 'am', start: '11:00', end: '12:00' },
            { period: 'pm', start: '14:00', end: '15:00' },
            { period: 'pm', start: '15:00', end: '16:00' },
            { period: 'pm', start: '16:00', end: '17:00' },
            { period: 'pm', start: '17:00', end: '18:00' }
        ];
    }

    timeSlotValue(slot) { return `${slot.start}-${slot.end}`; }

    render() {
        document.querySelector('.header-title').textContent = 'الجداول الدراسية';
        this.contentArea.innerHTML = `
            <div class="card" style="padding: 0.75rem 1.25rem; margin-bottom: 0.75rem;">
                <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
                    <label style="font-weight: 500;">اختر الفصل:</label>
                    <select id="scheduleClassFilter" class="form-input" style="max-width: 300px; padding: 0.4rem 0.75rem;">
                        <option value="all">جميع الفصول</option>
                    </select>
                    <button class="btn btn-success" id="addScheduleBtn" style="padding: 0.4rem 1rem;">+ إضافة حصة</button>
                </div>
            </div>
            <div class="card" style="padding: 1rem;">
                <div style="overflow-x: auto;">
                    <table id="scheduleTable" style="width: 100%; table-layout: fixed; border-collapse: collapse;">
                        <thead>
                            <tr>
                                <th style="width: 9%; background: var(--bg-primary); padding: 0.4rem; font-size: 0.8rem; border: 1px solid #e0e0e0;">التوقيت</th>
                                ${this.dayNames.map(d => `<th style="background: var(--bg-primary); padding: 0.4rem; font-size: 0.8rem; border: 1px solid #e0e0e0;">${d}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody id="scheduleTableBody"></tbody>
                    </table>
                </div>
                <p style="text-align: center; color: var(--text-secondary); font-size: 0.75rem; padding: 0.5rem 0 0; margin: 0;">
                    اضغط على أي خانة فارغة لإضافة حصة، أو على حصة موجودة لتعديلها.
                </p>
            </div>
            <div class="modal" id="scheduleModal">
                <div class="modal-content" style="max-width: 500px;">
                    <div class="modal-header">
                        <h3 class="modal-title" id="scheduleModalTitle">إضافة حصة دراسية</h3>
                        <button class="modal-close" onclick="closeModal('scheduleModal')">×</button>
                    </div>
                    <form id="scheduleForm">
                        <input type="hidden" id="scheduleId">
                        <div class="form-group">
                            <label class="form-label">الفصل *</label>
                            <select id="scheduleClass" class="form-input" required>
                                <option value="">-- اختر الفصل --</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">اليوم *</label>
                            <select id="scheduleDay" class="form-input" required>
                                ${this.dayNames.map((d, i) => `<option value="${i}">${d}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">الفترة *</label>
                            <select id="scheduleTimeSlot" class="form-input" required>
                                ${this.timeSlots.map(s => `<option value="${this.timeSlotValue(s)}">${s.start} - ${s.end}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">القاعة (اختياري)</label>
                            <input type="text" id="scheduleRoom" class="form-input" placeholder="مثال: قاعة 101">
                        </div>
                        <div style="display: flex; gap: 1rem; justify-content: space-between; margin-top: 1.5rem;">
                            <button type="button" class="btn btn-danger" id="scheduleDeleteBtn" style="display: none;">حذف الحصة</button>
                            <div style="display: flex; gap: 1rem; margin-right: auto;">
                                <button type="button" class="btn btn-outline" onclick="closeModal('scheduleModal')">إلغاء</button>
                                <button type="submit" class="btn btn-success">حفظ</button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        `;
        this.loadClassesFilter();
        this.loadSchedule();
        this.attachEvents();
    }

    loadClassesFilter() {
        const classes = db.getData('classes');
        const select = document.getElementById('scheduleClassFilter');
        select.innerHTML = '<option value="all">جميع الفصول</option>';
        classes.forEach(cls => {
            const opt = document.createElement('option');
            opt.value = cls.id;
            opt.textContent = cls.name;
            select.appendChild(opt);
        });
    }

    loadSchedule() {
        const schedules = db.getData('schedules');
        const classes = db.getData('classes');
        const teachers = db.getData('teachers');
        const subjects = db.getData('subjects');
        let filtered = schedules;
        if (this.selectedClass !== 'all') {
            filtered = schedules.filter(s => (s.classId || s.class_id) === this.selectedClass);
        }
        const tbody = document.getElementById('scheduleTableBody');
        let html = '';
        let lastPeriod = null;

        this.timeSlots.forEach(slot => {
            if (lastPeriod === 'am' && slot.period === 'pm') {
                html += `<tr><td colspan="${this.dayNames.length + 1}" style="background: var(--bg-primary); text-align: center; font-weight: bold; color: var(--text-secondary); padding: 0.4rem; font-size: 0.8rem; border: 1px solid #e0e0e0;">— الفترة المسائية —</td></tr>`;
            }
            lastPeriod = slot.period;
            const timeValue = this.timeSlotValue(slot);
            html += `<tr><td style="background: var(--bg-primary); text-align: center; padding: 0.35rem; border: 1px solid #e0e0e0;">
                <div style="font-weight: 700; color: var(--text-primary); font-size: 0.8rem; line-height: 1.2;">${slot.start}</div>
                <div style="color: var(--text-secondary); font-size: 0.7rem; line-height: 1.2;">${slot.end}</div>
            </td>`;
            this.dayNames.forEach((dayName, day) => {
                const match = filtered.find(s => String(s.day) === String(day) && (s.timeSlot || s.time_slot) === timeValue);
                if (match) {
                    const cls = classes.find(c => c.id === (match.classId || match.class_id));
                    const teacher = cls ? teachers.find(t => t.id === (cls.teacherId || cls.teacher_id)) : null;
                    const subject = subjects.find(sb => sb.id === (match.subjectId || match.subject_id || (cls && (cls.subjectId || cls.subject))));
                    html += `
                        <td style="background: rgba(69,123,157,0.1); position: relative; padding: 0.3rem; cursor: pointer; overflow: hidden; border: 1px solid #e0e0e0;"
                            onclick="schedulesManager.editSchedule('${match.id}')">
                            <div style="font-weight: bold; color: var(--primary-blue); font-size: 0.72rem; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${subject ? subject.name : (cls ? cls.name : 'غير محدد')}</div>
                            <div style="font-size: 0.65rem; color: var(--text-secondary); line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${teacher ? (teacher.fullName || teacher.full_name) : 'غير محدد'}</div>
                            <div style="font-size: 0.6rem; color: var(--text-secondary); line-height: 1.2;">${match.room || ''}</div>
                            <button onclick="event.stopPropagation(); schedulesManager.deleteSchedule('${match.id}')"
                                    style="position: absolute; top: 1px; left: 1px; background: var(--danger-red); color: white; border: none; border-radius: 50%; width: 14px; height: 14px; cursor: pointer; font-size: 0.6rem; line-height: 1; padding: 0;">×</button>
                        </td>`;
                } else {
                    html += `<td style="background: var(--bg-white); cursor: pointer; padding: 0.3rem; border: 1px solid #e0e0e0; min-height: 50px;"
                        onclick="schedulesManager.showAddModal('${day}', '${timeValue}')"></td>`;
                }
            });
            html += '</tr>';
        });
        tbody.innerHTML = html;
    }

    attachEvents() {
        document.getElementById('scheduleClassFilter').addEventListener('change', (e) => {
            this.selectedClass = e.target.value;
            this.loadSchedule();
        });
        document.getElementById('addScheduleBtn').addEventListener('click', () => this.showAddModal());
        document.getElementById('scheduleForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSchedule();
        });
        document.getElementById('scheduleDeleteBtn').addEventListener('click', () => {
            const id = document.getElementById('scheduleId').value;
            if (id) this.deleteSchedule(id, true);
        });
    }

    populateClassSelect() {
        const classes = db.getData('classes');
        const select = document.getElementById('scheduleClass');
        select.innerHTML = '<option value="">-- اختر الفصل --</option>';
        classes.forEach(cls => {
            const opt = document.createElement('option');
            opt.value = cls.id;
            opt.textContent = cls.name;
            select.appendChild(opt);
        });
    }

    showAddModal(day = null, timeValue = null) {
        document.getElementById('scheduleModalTitle').textContent = 'إضافة حصة دراسية';
        document.getElementById('scheduleForm').reset();
        document.getElementById('scheduleId').value = '';
        document.getElementById('scheduleDeleteBtn').style.display = 'none';
        this.populateClassSelect();
        if (this.selectedClass !== 'all') document.getElementById('scheduleClass').value = this.selectedClass;
        if (day !== null) document.getElementById('scheduleDay').value = day;
        if (timeValue !== null) document.getElementById('scheduleTimeSlot').value = timeValue;
        ui.openModal('scheduleModal');
    }

    editSchedule(id) {
        const schedule = db.findItem('schedules', s => s.id === id);
        if (!schedule) return;
        document.getElementById('scheduleModalTitle').textContent = 'تعديل الحصة';
        this.populateClassSelect();
        document.getElementById('scheduleId').value = schedule.id;
        document.getElementById('scheduleClass').value = schedule.classId || schedule.class_id;
        document.getElementById('scheduleDay').value = schedule.day;
        document.getElementById('scheduleTimeSlot').value = schedule.timeSlot || schedule.time_slot;
        document.getElementById('scheduleRoom').value = schedule.room || '';
        document.getElementById('scheduleDeleteBtn').style.display = 'inline-flex';
        ui.openModal('scheduleModal');
    }

    saveSchedule() {
        const id = document.getElementById('scheduleId').value;
        const data = {
            classId: document.getElementById('scheduleClass').value,
            day: document.getElementById('scheduleDay').value,
            timeSlot: document.getElementById('scheduleTimeSlot').value,
            room: document.getElementById('scheduleRoom').value.trim()
        };
        if (!data.classId || !data.timeSlot) {
            ui.showToast('يرجى ملء جميع الحقول', 'error');
            return;
        }
        const sameSlot = db.getData('schedules').filter(s =>
            String(s.day) === String(data.day) && (s.timeSlot || s.time_slot) === data.timeSlot && s.id !== id
        );
        if (sameSlot.find(s => (s.classId || s.class_id) === data.classId)) {
            ui.showToast('يوجد حصة أخرى في نفس الوقت لهذا الفصل', 'error');
            return;
        }
        if (data.room && sameSlot.find(s => (s.room || '').trim() === data.room)) {
            ui.showToast('هذه القاعة محجوزة لفصل آخر في نفس الوقت', 'error');
            return;
        }
        if (id) {
            db.updateItem('schedules', id, data);
            ui.showToast('تم تحديث الحصة بنجاح', 'success');
        } else {
            db.addItem('schedules', data);
            ui.showToast('تم إضافة الحصة بنجاح', 'success');
        }
        ui.closeModal('scheduleModal');
        this.loadSchedule();
    }

    async deleteSchedule(id, fromModal = false) {
        const confirmed = await ui.confirmDelete('هل تريد حذف هذه الحصة؟');
        if (confirmed) {
            db.deleteItem('schedules', id);
            ui.showToast('تم حذف الحصة بنجاح', 'success');
            if (fromModal) ui.closeModal('scheduleModal');
            this.loadSchedule();
        }
    }
}

window.schedulesManager = new SchedulesManager();
