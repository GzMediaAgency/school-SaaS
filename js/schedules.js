// js/schedules.js
class SchedulesManager {
constructor() {
this.contentArea = document.getElementById('contentArea');
this.selectedClass = 'all';
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
timeSlotValue(slot) {
    return `${slot.start}-${slot.end}`;
}
render() {
     document.querySelector('.header-title').textContent = 'الجداول الدراسية';
     this.contentArea.innerHTML = `
         <div class="card" style="padding: 1rem 1.5rem; margin-bottom: 1rem;">
             <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
                 <label style="font-weight: 500;">اختر الفصل *</label>
                 <select id="scheduleClassFilter" class="form-input" style="max-width: 300px; padding: 0.5rem 0.75rem;">
                     <option value="all">-- اختر الفصل --</option>
                 </select>
                 <button class="btn btn-success" id="addScheduleBtn" style="padding: 0.5rem 1.1rem;">+ إضافة حصة</button>
                 <button class="btn btn-outline" id="exportSchedulePdfBtn" style="padding: 0.5rem 1.1rem;">🖨️ تصدير PDF</button>
             </div>
         </div>
         <div class="card" style="padding: 1.25rem;">
             <table id="scheduleTable" style="width: 100%; table-layout: fixed;">
                 <thead>
                     <tr>
                         <th style="width: 10%; background: var(--bg-primary); padding: 0.6rem; font-size: 0.85rem;">التوقيت</th>
                         ${this.dayNames.map(d => `<th style="background: var(--bg-primary); padding: 0.6rem; font-size: 0.85rem;">${d}</th>`).join('')}
                     </tr>
                 </thead>
                 <tbody id="scheduleTableBody"></tbody>
             </table>
             <p style="text-align: center; color: var(--text-secondary); font-size: 0.8rem; padding: 0.6rem 0 0; margin: 0;">
                 اختر الفصل أولاً من القائمة أعلاه، ثم اضغط على أي خانة فارغة لإضافة حصة، أو على حصة موجودة لتعديلها.
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
                     <input type="hidden" id="scheduleClassId">
                     <div class="form-group">
                         <label class="form-label">الفصل</label>
                         <div id="scheduleClassDisplay" style="padding: 0.5rem 0.75rem; background: var(--bg-primary); border-radius: var(--border-radius); font-weight: 500; color: var(--text-primary);">-</div>
                     </div>
                     <div class="form-group">
                         <label class="form-label">المادة *</label>
                         <select id="scheduleSubject" class="form-input" required>
                             <option value="">-- اختر المادة --</option>
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
     let filteredSchedules = schedules;
     if (this.selectedClass !== 'all') {
         filteredSchedules = schedules.filter(s => s.classId === this.selectedClass);
     }
     const tbody = document.getElementById('scheduleTableBody');
     let html = '';
     let lastPeriod = null;

     this.timeSlots.forEach(slot => {
         if (lastPeriod === 'am' && slot.period === 'pm') {
             html += `<tr><td colspan="${this.dayNames.length + 1}" style="background: var(--bg-primary); text-align: center; font-weight: bold; color: var(--text-secondary); padding: 0.4rem; font-size: 0.8rem;">— الفترة المسائية —</td></tr>`;
         }
         lastPeriod = slot.period;

         const timeValue = this.timeSlotValue(slot);
         html += `<tr><td style="background: var(--bg-primary); text-align: center; padding: 0.5rem;">
             <div style="font-weight: 700; color: var(--text-primary); font-size: 0.88rem; line-height: 1.25;">${slot.start}</div>
             <div style="color: var(--text-secondary); font-size: 0.78rem; line-height: 1.25;">${slot.end}</div>
         </td>`;

         this.dayNames.forEach((dayName, day) => {
             const match = filteredSchedules.find(s => s.day == day && s.timeSlot === timeValue);
             if (match) {
                 const cls = classes.find(c => c.id === match.classId);
                 const teacher = cls ? teachers.find(t => t.id === cls.teacherId) : null;
                 const subject = subjects.find(sub => sub.id === match.subjectId) || (cls ? subjects.find(sub => sub.id === cls.subject) : null);
                 html += `
                     <td style="background: rgba(69, 123, 157, 0.1); position: relative; padding: 0.4rem; cursor: pointer; overflow: hidden;"
                         onclick="schedulesManager.editSchedule('${match.id}')">
                         <div style="font-weight: bold; color: var(--primary-blue); font-size: 0.8rem; line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                             ${subject ? subject.name : (cls ? cls.name : 'غير محدد')}
                         </div>
                         <div style="font-size: 0.72rem; color: var(--text-secondary); line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                             ${teacher ? teacher.fullName : 'غير محدد'}
                         </div>
                         ${match.room ? `<div style="font-size: 0.68rem; color: var(--text-secondary); line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"> ${match.room}</div>` : ''}
                         <button onclick="event.stopPropagation(); schedulesManager.deleteSchedule('${match.id}')"
                                 style="position: absolute; top: 2px; left: 2px; background: var(--danger-red); color: white; border: none; border-radius: 50%; width: 16px; height: 16px; cursor: pointer; font-size: 0.62rem; line-height: 1; padding: 0;">×</button>
                     </td>
                 `;
             } else {
                 html += `<td style="background: var(--bg-white); cursor: pointer; padding: 0.4rem;"
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
     document.getElementById('addScheduleBtn').addEventListener('click', () => {
         this.showAddModal();
     });
     document.getElementById('scheduleForm').addEventListener('submit', (e) => {
         e.preventDefault();
         this.saveSchedule();
     });
     document.getElementById('scheduleDeleteBtn').addEventListener('click', () => {
         const id = document.getElementById('scheduleId').value;
         if (id) this.deleteSchedule(id, true);
     });
     document.getElementById('exportSchedulePdfBtn').addEventListener('click', () => this.exportSchedulePDF());
 }
 exportSchedulePDF() {
     const schedules = db.getData('schedules');
     const classes = db.getData('classes');
     const teachers = db.getData('teachers');
     const subjects = db.getData('subjects');
     let filteredSchedules = schedules;
     if (this.selectedClass !== 'all') {
         filteredSchedules = schedules.filter(s => s.classId === this.selectedClass);
     }
     const headers = ['التوقيت', ...this.dayNames];
     const rows = this.timeSlots.map(slot => {
         const timeValue = this.timeSlotValue(slot);
         const row = [`${slot.start} - ${slot.end}`];
         this.dayNames.forEach((dayName, day) => {
             const match = filteredSchedules.find(s => s.day == day && s.timeSlot === timeValue);
             if (match) {
                 const cls = classes.find(c => c.id === match.classId);
                 const teacher = cls ? teachers.find(t => t.id === cls.teacherId) : null;
                 const subject = subjects.find(sub => sub.id === match.subjectId) || (cls ? subjects.find(sub => sub.id === cls.subject) : null);
                 const parts = [subject ? subject.name : (cls ? cls.name : '-')];
                 if (teacher) parts.push(teacher.fullName);
                 if (match.room) parts.push(match.room);
                 row.push(parts.join(' - '));
             } else {
                 row.push('-');
             }
         });
         return row;
     });
     const selectedClassObj = classes.find(c => c.id === this.selectedClass);
     const title = selectedClassObj ? `الجدول الدراسي - ${selectedClassObj.name}` : 'الجدول الدراسي - جميع الفصول';
     ui.printTable(title, headers, rows);
 }
 populateSubjectSelect(preselectSubjectId) {
     const subjects = db.getData('subjects');
     const select = document.getElementById('scheduleSubject');
     select.innerHTML = '<option value="">-- اختر المادة --</option>';
     subjects.forEach(sub => {
         const opt = document.createElement('option');
         opt.value = sub.id;
         opt.textContent = sub.name;
         select.appendChild(opt);
     });
     if (preselectSubjectId) select.value = preselectSubjectId;
 }
 // day/time optionnels : pré-remplis automatiquement si on clique sur une case vide de la grille.
 // La classe est celle sélectionnée dans la liste en haut de page (obligatoire avant d'ajouter une case).
 showAddModal(day = null, timeValue = null) {
     if (this.selectedClass === 'all') {
         ui.showToast('يرجى اختيار الفصل أولاً من القائمة أعلاه', 'error');
         return;
     }
     const classes = db.getData('classes');
     const cls = classes.find(c => c.id === this.selectedClass);

     document.getElementById('scheduleModalTitle').textContent = 'إضافة حصة دراسية';
     document.getElementById('scheduleForm').reset();
     document.getElementById('scheduleId').value = '';
     document.getElementById('scheduleClassId').value = this.selectedClass;
     document.getElementById('scheduleClassDisplay').textContent = cls ? cls.name : '-';
     document.getElementById('scheduleDeleteBtn').style.display = 'none';
     this.populateSubjectSelect(cls ? cls.subject : null);
     if (day !== null) {
         document.getElementById('scheduleDay').value = day;
     }
     if (timeValue !== null) {
         document.getElementById('scheduleTimeSlot').value = timeValue;
     }
     ui.openModal('scheduleModal');
 }
 editSchedule(id) {
     const schedule = db.findItem('schedules', s => s.id === id);
     if (!schedule) return;
     const classes = db.getData('classes');
     const cls = classes.find(c => c.id === schedule.classId);

     document.getElementById('scheduleModalTitle').textContent = 'تعديل الحصة';
     document.getElementById('scheduleId').value = schedule.id;
     document.getElementById('scheduleClassId').value = schedule.classId;
     document.getElementById('scheduleClassDisplay').textContent = cls ? cls.name : '-';
     this.populateSubjectSelect(schedule.subjectId || (cls ? cls.subject : null));
     document.getElementById('scheduleDay').value = schedule.day;
     document.getElementById('scheduleTimeSlot').value = schedule.timeSlot;
     document.getElementById('scheduleRoom').value = schedule.room || '';
     document.getElementById('scheduleDeleteBtn').style.display = 'inline-flex';
     ui.openModal('scheduleModal');
 }
 saveSchedule() {
     const id = document.getElementById('scheduleId').value;
     const data = {
         classId: document.getElementById('scheduleClassId').value,
         subjectId: document.getElementById('scheduleSubject').value,
         day: document.getElementById('scheduleDay').value,
         timeSlot: document.getElementById('scheduleTimeSlot').value,
         room: document.getElementById('scheduleRoom').value.trim()
     };
     if (!data.classId || !data.subjectId || !data.timeSlot) {
         ui.showToast('يرجى ملء الحقول المطلوبة (الفصل، المادة، الفترة)', 'error');
         return;
     }
     // Vérifier les conflits (en excluant la case qu'on est en train de modifier)
     const sameSlot = db.getData('schedules').filter(s =>
         s.day === data.day && s.timeSlot === data.timeSlot && s.id !== id
     );

     const classConflict = sameSlot.find(s => s.classId === data.classId);
     if (classConflict) {
         ui.showToast('يوجد حصة أخرى في نفس الوقت لهذا الفصل', 'error');
         return;
     }

     if (data.room) {
         const roomConflict = sameSlot.find(s => s.room && s.room.trim() === data.room);
         if (roomConflict) {
             ui.showToast('هذه القاعة محجوزة لفصل آخر في نفس الوقت', 'error');
             return;
         }
     }

     const classes = db.getData('classes');
     const currentClass = classes.find(c => c.id === data.classId);
     if (currentClass && currentClass.teacherId) {
         const teacherConflict = sameSlot.find(s => {
             const otherClass = classes.find(c => c.id === s.classId);
             return otherClass && otherClass.teacherId === currentClass.teacherId;
         });
         if (teacherConflict) {
             ui.showToast('الأستاذ المسؤول عن هذا الفصل مبرمج في حصة أخرى بنفس التوقيت', 'error');
             return;
         }
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
