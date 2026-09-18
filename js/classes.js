// js/classes.js
class ClassesManager {
constructor() {
this.contentArea = document.getElementById('contentArea');
}
render() {
     document.querySelector('.header-title').textContent = 'إدارة الفصول';
     this.contentArea.innerHTML = `
         <div class="table-header" style="background: transparent; padding: 0; margin-bottom: 1.5rem; border: none; box-shadow: none;">
             <h2 style="color: var(--text-primary);">قائمة الفصول</h2>
             <button class="btn btn-success" id="addClassBtn">+ إضافة فصل جديد</button>
         </div>
         <div class="stats-grid" id="classesGrid"></div>
         <div class="modal" id="classModal">
             <div class="modal-content" style="max-width: 500px;">
                 <div class="modal-header">
                     <h3 class="modal-title" id="classModalTitle">إضافة فصل</h3>
                     <button class="modal-close" onclick="closeModal('classModal')">×</button>
                 </div>
                 <form id="classForm">
                     <input type="hidden" id="classId">
                     <div class="form-group">
                         <label class="form-label">اسم الفصل *</label>
                         <input type="text" id="className" class="form-input" required>
                     </div>
                     <div class="form-group">
                         <label class="form-label">السعة الاستيعابية *</label>
                         <input type="number" id="classCapacity" class="form-input" required min="1">
                     </div>
                     <div class="form-group">
                         <label class="form-label">الأستاذ المسؤول (اختياري)</label>
                         <select id="classTeacher" class="form-input">
                             <option value="">-- بدون أستاذ --</option>
                         </select>
                     </div>
                     <div class="form-group">
                         <label class="form-label">المادة (اختياري)</label>
                         <select id="classSubject" class="form-input">
                             <option value="">-- بدون مادة --</option>
                         </select>
                     </div>
                     <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1.5rem;">
                         <button type="button" class="btn btn-outline" onclick="closeModal('classModal')">إلغاء</button>
                         <button type="submit" class="btn btn-success">حفظ</button>
                     </div>
                 </form>
             </div>
         </div>
     `;
     this.loadClasses();
     this.attachEvents();
 }
 loadClasses() {
     const classes = db.getData('classes');
     const teachers = db.getData('teachers');
     const students = db.getData('students');
     const subjects = db.getData('subjects');
     const grid = document.getElementById('classesGrid');
     if (classes.length === 0) {
         grid.innerHTML = `<div class="card" style="text-align: center; padding: 3rem; grid-column: 1/-1;">
             <p style="color: var(--text-secondary);">لا توجد فصول</p>
         </div>`;
         return;
     }
     grid.innerHTML = classes.map(cls => {
         const teacher = teachers.find(t => t.id === cls.teacherId);
         const subject = subjects.find(sub => sub.id === cls.subject);
         const classStudents = students.filter(s => s.classId === cls.id);
         const occupancy = ((classStudents.length / cls.capacity) * 100).toFixed(0);
         return `
             <div class="card">
                 <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                     <div>
                         <h3 style="color: var(--text-primary); margin-bottom: 0.5rem;">${cls.name}</h3>
                     </div>
                     <div style="text-align: center;">
                         <div style="font-size: 2rem; font-weight: bold; color: var(--primary-blue);">${classStudents.length}</div>
                         <div style="font-size: 0.8rem; color: var(--text-secondary);">/ ${cls.capacity}</div>
                     </div>
                 </div>
                 <div style="margin-bottom: 1rem;">
                     <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.25rem;">
                         <span>نسبة الإشغال</span>
                         <span>${occupancy}%</span>
                     </div>
                     <div style="background: #e0e0e0; height: 8px; border-radius: 4px; overflow: hidden;">
                         <div style="background: ${occupancy > 80 ? 'var(--danger-red)' : 'var(--success-green)'}; height: 100%; width: ${occupancy}%; transition: width 0.3s;"></div>
                     </div>
                 </div>
                 <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 0.5rem;">
                     <strong>الأستاذ:</strong> ${teacher ? teacher.fullName : 'غير محدد'}
                 </p>
                 <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 1rem;">
                     <strong>المادة:</strong> ${subject ? subject.name : 'غير محدد'}
                 </p>
                 <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                     <button class="btn btn-outline" style="padding: 0.25rem 0.75rem; font-size: 0.85rem;" onclick="classesManager.editClass('${cls.id}')">تعديل</button>
                     <button class="btn btn-danger" style="padding: 0.25rem 0.75rem; font-size: 0.85rem;" onclick="classesManager.deleteClass('${cls.id}')">حذف</button>
                 </div>
             </div>
         `;
     }).join('');
 }
 loadTeachers() {
     const teachers = db.getData('teachers');
     const teacherSelect = document.getElementById('classTeacher');
     teacherSelect.innerHTML = '<option value="">-- بدون أستاذ --</option>';
     teachers.forEach(t => {
         const opt = document.createElement('option');
         opt.value = t.id;
         opt.textContent = t.fullName;
         teacherSelect.appendChild(opt);
     });
 }
 loadSubjects() {
     const subjects = db.getData('subjects');
     const subjectSelect = document.getElementById('classSubject');
     subjectSelect.innerHTML = '<option value="">-- بدون مادة --</option>';
     subjects.forEach(sub => {
         const opt = document.createElement('option');
         opt.value = sub.id;
         opt.textContent = sub.name;
         subjectSelect.appendChild(opt);
     });
 }
 attachEvents() {
     document.getElementById('addClassBtn').addEventListener('click', () => this.showAddModal());
     document.getElementById('classForm').addEventListener('submit', (e) => {
         e.preventDefault();
         this.saveClass();
     });
 }
 showAddModal() {
     document.getElementById('classModalTitle').textContent = 'إضافة فصل جديد';
     document.getElementById('classForm').reset();
     document.getElementById('classId').value = '';
     this.loadTeachers();
     this.loadSubjects();
     ui.openModal('classModal');
 }
 editClass(id) {
     const cls = db.findItem('classes', c => c.id === id);
     if (!cls) return;
     document.getElementById('classModalTitle').textContent = 'تعديل الفصل';
     document.getElementById('classId').value = cls.id;
     document.getElementById('className').value = cls.name;
     document.getElementById('classCapacity').value = cls.capacity;
     this.loadTeachers();
     document.getElementById('classTeacher').value = cls.teacherId || '';
     this.loadSubjects();
     document.getElementById('classSubject').value = cls.subject || '';
     ui.openModal('classModal');
 }
 saveClass() {
     const id = document.getElementById('classId').value;
     const data = {
         name: document.getElementById('className').value.trim(),
         capacity: parseInt(document.getElementById('classCapacity').value),
         teacherId: document.getElementById('classTeacher').value || null,
         subject: document.getElementById('classSubject').value || null
     };
     if (!data.name || !data.capacity) {
         ui.showToast('يرجى ملء جميع الحقول المطلوبة', 'error');
         return;
     }
     if (id) {
         db.updateItem('classes', id, data);
         ui.showToast('تم تحديث الفصل بنجاح', 'success');
     } else {
         db.addItem('classes', data);
         ui.showToast('تم إضافة الفصل بنجاح', 'success');
     }
     ui.closeModal('classModal');
     this.loadClasses();
 }
 async deleteClass(id) {
     const confirmed = await ui.confirmDelete('هل أنت متأكد من حذف هذا الفصل؟');
     if (confirmed) {
         db.deleteItem('classes', id);
         ui.showToast('تم حذف الفصل بنجاح', 'success');
         this.loadClasses();
     }
 }
}
window.classesManager = new ClassesManager();