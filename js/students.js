// js/students.js
class StudentsManager {
constructor() {
this.contentArea = document.getElementById('contentArea');
this.currentFilter = '';
this.currentClassFilter = 'all';
}
render() {
     document.querySelector('.header-title').textContent = 'إدارة الطلاب';
     this.contentArea.innerHTML = `
         <div class="table-header" style="background: transparent; padding: 0; margin-bottom: 1.5rem; border: none; box-shadow: none;">
             <h2 style="color: var(--text-primary);">قائمة الطلاب</h2>
             <div style="display: flex; gap: 0.75rem;">
                 <button class="btn btn-outline" id="exportStudentsPdfBtn">🖨️ تصدير PDF</button>
                 <button class="btn btn-success" id="addStudentBtn">+ إضافة طالب جديد</button>
             </div>
         </div>
         <div class="card" style="padding: 1.5rem; margin-bottom: 1.5rem;">
             <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                 <div class="search-box" style="flex: 1; min-width: 200px;">
                     <span>🔍</span>
                     <input type="text" id="searchStudent" placeholder="البحث بالاسم أو الهاتف..." style="width: 100%; border: none; background: none; outline: none;">
                 </div>
                 <select id="filterClass" class="form-input" style="max-width: 250px;">
                     <option value="all">جميع الفصول</option>
                 </select>
             </div>
         </div>
         <div class="table-container">
             <table>
                 <thead>
                     <tr>
                         <th>#</th>
                         <th>الاسم الكامل</th>
                         <th>الهاتف</th>
                         <th>ولي الأمر</th>
                         <th>هاتف ولي الأمر</th>
                         <th>الفصل</th>
                         <th>الحالة</th>
                         <th>الإجراءات</th>
                     </tr>
                 </thead>
                 <tbody id="studentsTableBody"></tbody>
             </table>
         </div>
         <div class="modal" id="studentModal">
             <div class="modal-content">
                 <div class="modal-header">
                     <h3 class="modal-title" id="studentModalTitle">إضافة طالب</h3>
                     <button class="modal-close" onclick="closeModal('studentModal')">×</button>
                 </div>
                 <form id="studentForm">
                     <input type="hidden" id="studentId">
                     <div class="form-group">
                         <label class="form-label">الاسم الكامل *</label>
                         <input type="text" id="studentName" class="form-input" required>
                     </div>
                     <div class="form-group">
                         <label class="form-label">رقم الهاتف *</label>
                         <input type="tel" id="studentPhone" class="form-input" required>
                     </div>
                     <div class="form-group">
                         <label class="form-label">البريد الإلكتروني</label>
                         <input type="email" id="studentEmail" class="form-input">
                     </div>
                     <div class="form-group">
                         <label class="form-label">اسم ولي الأمر *</label>
                         <input type="text" id="studentParentName" class="form-input" required>
                     </div>
                     <div class="form-group">
                         <label class="form-label">هاتف ولي الأمر *</label>
                         <input type="tel" id="studentParentPhone" class="form-input" required>
                     </div>
                     <div class="form-group">
                         <label class="form-label">الفصل *</label>
                         <select id="studentClass" class="form-input" required>
                         </select>
                     </div>
                     <div class="form-group">
                         <label class="form-label">الحالة</label>
                         <select id="studentStatus" class="form-input">
                             <option value="active">نشط</option>
                             <option value="inactive">غير نشط</option>
                         </select>
                     </div>
                     <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1.5rem;">
                         <button type="button" class="btn btn-outline" onclick="closeModal('studentModal')">إلغاء</button>
                         <button type="submit" class="btn btn-success">حفظ البيانات</button>
                     </div>
                 </form>
             </div>
         </div>
     `;
     this.loadClassesForFilter();
     this.loadClassesForForm();
     this.loadStudents();
     this.attachEvents();
 }
 loadClassesForFilter() {
     const classes = db.getData('classes');
     const select = document.getElementById('filterClass');
     classes.forEach(cls => {
         const opt = document.createElement('option');
         opt.value = cls.id;
         opt.textContent = cls.name;
         select.appendChild(opt);
     });
 }
 loadClassesForForm() {
     const classes = db.getData('classes');
     const select = document.getElementById('studentClass');
     select.innerHTML = '<option value="">-- اختر الفصل --</option>';
     classes.forEach(cls => {
         const opt = document.createElement('option');
         opt.value = cls.id;
         opt.textContent = cls.name;
         select.appendChild(opt);
     });
 }
 loadStudents() {
     let students = db.getData('students');
     const classes = db.getData('classes');
     if (this.currentClassFilter !== 'all') {
         students = students.filter(s => s.classId === this.currentClassFilter);
     }
     if (this.currentFilter) {
         const term = this.currentFilter.toLowerCase();
         students = students.filter(s => 
             s.fullName.toLowerCase().includes(term) || 
             s.phone.includes(term)
         );
     }
     const tbody = document.getElementById('studentsTableBody');
     if (students.length === 0) {
         tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-secondary);">لا يوجد طلاب مطابقين للبحث</td></tr>`;
         return;
     }
     tbody.innerHTML = students.map((s, index) => {
         const studentClass = classes.find(c => c.id === s.classId);
         return `
             <tr>
                 <td>${index + 1}</td>
                 <td><strong>${s.fullName}</strong></td>
                 <td>${s.phone}</td>
                 <td>${s.parentName || '-'}</td>
                 <td>${s.parentPhone || '-'}</td>
                 <td>${studentClass ? studentClass.name : 'غير محدد'}</td>
                 <td>
                     <span class="badge ${s.status === 'active' ? 'badge-success' : 'badge-danger'}">
                         ${s.status === 'active' ? 'نشط' : 'غير نشط'}
                     </span>
                 </td>
                 <td>
                     <button class="btn btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; margin-left: 0.25rem;" onclick="studentsManager.editStudent('${s.id}')">تعديل</button>
                     <button class="btn btn-danger" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" onclick="studentsManager.deleteStudent('${s.id}')">حذف</button>
                 </td>
             </tr>
         `;
     }).join('');
 }
 attachEvents() {
     document.getElementById('addStudentBtn').addEventListener('click', () => this.showAddModal());
     document.getElementById('exportStudentsPdfBtn').addEventListener('click', () => this.exportStudentsPDF());
     document.getElementById('searchStudent').addEventListener('input', (e) => {
         this.currentFilter = e.target.value;
         this.loadStudents();
     });
     document.getElementById('filterClass').addEventListener('change', (e) => {
         this.currentClassFilter = e.target.value;
         this.loadStudents();
     });
     document.getElementById('studentForm').addEventListener('submit', (e) => {
         e.preventDefault();
         this.saveStudent();
     });
 }
 getFilteredStudentsForExport() {
     let students = db.getData('students');
     const classes = db.getData('classes');
     if (this.currentClassFilter !== 'all') {
         students = students.filter(s => s.classId === this.currentClassFilter);
     }
     if (this.currentFilter) {
         const term = this.currentFilter.toLowerCase();
         students = students.filter(s =>
             s.fullName.toLowerCase().includes(term) ||
             s.phone.includes(term)
         );
     }
     const headers = ['الاسم الكامل', 'الهاتف', 'البريد الإلكتروني', 'ولي الأمر', 'هاتف ولي الأمر', 'الفصل', 'الحالة', 'تاريخ التسجيل'];
     const rows = students.map(s => {
         const cls = classes.find(c => c.id === s.classId);
         return [
             s.fullName, s.phone, s.email || '-', s.parentName || '-', s.parentPhone || '-',
             cls ? cls.name : '-', s.status === 'active' ? 'نشط' : 'غير نشط', s.enrollmentDate || '-'
         ];
     });
     return { headers, rows };
 }
 exportStudentsPDF() {
     const { headers, rows } = this.getFilteredStudentsForExport();
     if (rows.length === 0) {
         ui.showToast('لا يوجد طلاب لتصديرهم', 'error');
         return;
     }
     ui.printTable('قائمة الطلاب', headers, rows);
 }
 showAddModal() {
     document.getElementById('studentModalTitle').textContent = 'إضافة طالب جديد';
     document.getElementById('studentForm').reset();
     document.getElementById('studentId').value = '';
     ui.openModal('studentModal');
 }
 editStudent(id) {
     const student = db.findItem('students', s => s.id === id);
     if (!student) return;
     document.getElementById('studentModalTitle').textContent = 'تعديل بيانات الطالب';
     document.getElementById('studentId').value = student.id;
     document.getElementById('studentName').value = student.fullName;
     document.getElementById('studentPhone').value = student.phone;
     document.getElementById('studentEmail').value = student.email || '';
     document.getElementById('studentParentName').value = student.parentName || '';
     document.getElementById('studentParentPhone').value = student.parentPhone || '';
     document.getElementById('studentClass').value = student.classId;
     document.getElementById('studentStatus').value = student.status;
     ui.openModal('studentModal');
 }
 saveStudent() {
     const id = document.getElementById('studentId').value;
     const data = {
         fullName: document.getElementById('studentName').value.trim(),
         phone: document.getElementById('studentPhone').value.trim(),
         email: document.getElementById('studentEmail').value.trim(),
         parentName: document.getElementById('studentParentName').value.trim(),
         parentPhone: document.getElementById('studentParentPhone').value.trim(),
         classId: document.getElementById('studentClass').value,
         status: document.getElementById('studentStatus').value
     };
     if (!data.fullName || !data.phone || !data.parentName || !data.parentPhone || !data.classId) {
         ui.showToast('يرجى ملء جميع الحقول المطلوبة (*)', 'error');
         return;
     }
     if (id) {
         db.updateItem('students', id, data);
         ui.showToast('تم تحديث بيانات الطالب بنجاح', 'success');
     } else {
         data.enrollmentDate = new Date().toISOString().split('T')[0];
         db.addItem('students', data);
         ui.showToast('تم إضافة الطالب بنجاح', 'success');
     }
     ui.closeModal('studentModal');
     this.loadStudents();
 }
 async deleteStudent(id) {
     const confirmed = await ui.confirmDelete('هل أنت متأكد من حذف هذا الطالب؟');
     if (confirmed) {
         db.deleteItem('students', id);
         ui.showToast('تم حذف الطالب بنجاح', 'success');
         this.loadStudents();
     }
 }
}
window.studentsManager = new StudentsManager();