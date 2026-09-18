// js/grades.js
class GradesManager {
constructor() {
this.contentArea = document.getElementById('contentArea');
this.selectedClass = '';
this.selectedSubject = '';
}
render() {
     document.querySelector('.header-title').textContent = 'النقاط والشهادات';
     this.contentArea.innerHTML = `
         <div class="card" style="padding: 1.5rem; margin-bottom: 1.5rem;">
             <form id="gradesFilterForm" style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
                 <div style="flex: 1; min-width: 200px;">
                     <label class="form-label">الفصل *</label>
                     <select id="gradesClass" class="form-input">
                         <option value="">-- اختر الفصل --</option>
                     </select>
                 </div>
                 <div style="flex: 1; min-width: 200px;">
                     <label class="form-label">المادة *</label>
                     <select id="gradesSubject" class="form-input">
                         <option value="">-- اختر المادة --</option>
                     </select>
                 </div>
                 <div style="flex: 1; min-width: 200px;">
                     <label class="form-label">نوع الامتحان *</label>
                     <select id="gradesExamType" class="form-input">
                         <option value="exam1">الامتحان الأول</option>
                         <option value="exam2">الامتحان الثاني</option>
                         <option value="final">الامتحان النهائي</option>
                     </select>
                 </div>
                 <div style="align-self: flex-end;">
                     <button type="submit" class="btn btn-primary" id="loadGradesBtn">تحميل النقاط</button>
                 </div>
             </form>
         </div>
         <div id="gradesContainer" style="display: none;">
             <div class="table-container">
                 <div class="table-header">
                     <h3 class="table-title">جدول النقاط</h3>
                     <div style="display: flex; gap: 0.5rem;">
                         <button class="btn btn-success" id="saveGradesBtn">حفظ النقاط</button>
                         <button class="btn btn-primary" id="generateCertificatesBtn">إصدار الشهادات</button>
                     </div>
                 </div>
                 <table>
                     <thead>
                         <tr>
                             <th>#</th>
                             <th>اسم الطالب</th>
                             <th>النقطة / 20</th>
                             <th>التقدير</th>
                             <th>الإجراء</th>
                         </tr>
                     </thead>
                     <tbody id="gradesTableBody"></tbody>
                 </table>
             </div>
         </div>
         <!-- Section Résultats Périodiques -->
         <div class="card" style="margin-top: 2rem;">
             <div class="table-header" style="background: transparent; padding: 0; border: none; box-shadow: none;">
                 <h3 style="color: var(--text-primary);">النتائج الدورية</h3>
                 <button class="btn btn-primary" id="loadPeriodicResultsBtn">حساب النتائج الدورية</button>
             </div>
             <div id="periodicResultsContainer" style="display: none;">
                 <div class="table-container">
                     <table>
                         <thead>
                             <tr>
                                 <th>#</th>
                                 <th>اسم الطالب</th>
                                 <th>المعدل العام / 20</th>
                                 <th>التقدير</th>
                                 <th>الترتيب</th>
                             </tr>
                         </thead>
                         <tbody id="periodicResultsBody"></tbody>
                     </table>
                 </div>
             </div>
         </div>
         <div id="noSelection" class="card" style="text-align: center; padding: 3rem;">
             <p style="color: var(--text-secondary); font-size: 1.1rem;">يرجى اختيار الفصل والمادة لعرض جدول النقاط</p>
         </div>
         <div class="modal" id="certificateModal">
             <div class="modal-content" style="max-width: 800px; padding: 0;">
                 <div id="certificateContent" style="padding: 2rem;"></div>
                 <div style="padding: 1rem; border-top: 1px solid #e0e0e0; display: flex; justify-content: flex-end; gap: 1rem;">
                     <button class="btn btn-outline" onclick="closeModal('certificateModal')">إغلاق</button>
                     <button class="btn btn-primary" onclick="window.print()">طباعة الشهادة</button>
                 </div>
             </div>
         </div>
     `;
     this.loadClasses();
     this.attachEvents();
 }
 loadClasses() {
     const classes = db.getData('classes');
     const select = document.getElementById('gradesClass');
     classes.forEach(cls => {
         const opt = document.createElement('option');
         opt.value = cls.id;
         opt.textContent = cls.name;
         select.appendChild(opt);
     });
 }
 loadSubjectsForClass(classId) {
     const cls = db.getData('classes').find(c => c.id === classId);
     const subjects = db.getData('subjects');
     const select = document.getElementById('gradesSubject');
     select.innerHTML = '<option value="">-- اختر المادة --</option>';
     if (cls && cls.subject) {
         const subject = subjects.find(s => s.id === cls.subject);
         if (subject) {
             const opt = document.createElement('option');
             opt.value = subject.id;
             opt.textContent = subject.name;
             select.appendChild(opt);
         }
     }
 }
 loadGrades() {
     if (!this.selectedClass || !this.selectedSubject) {
         document.getElementById('noSelection').style.display = 'block';
         document.getElementById('gradesContainer').style.display = 'none';
         return;
     }
     document.getElementById('noSelection').style.display = 'none';
     document.getElementById('gradesContainer').style.display = 'block';
     const students = db.getData('students').filter(s => s.classId === this.selectedClass);
     const examType = document.getElementById('gradesExamType').value;
     const allGrades = db.getData('grades');
     const tbody = document.getElementById('gradesTableBody');
     tbody.innerHTML = students.map((s, index) => {
         const grade = allGrades.find(g => 
             g.studentId === s.id && 
             g.subjectId === this.selectedSubject && 
             g.examType === examType
         );
         const score = grade ? grade.score : '';
         const gradeLabel = this.getGradeLabel(score);
         return `
             <tr data-student-id="${s.id}">
                 <td>${index + 1}</td>
                 <td><strong>${s.fullName}</strong></td>
                 <td>
                     <input type="number" class="form-input" style="width: 80px; padding: 0.25rem 0.5rem;" 
                            min="0" max="20" step="0.25" value="${score}" 
                            data-grade-for="${s.id}" onchange="gradesManager.updateGradeLabel(this)">
                 </td>
                 <td>
                     <span class="badge ${gradeLabel.class}" data-label-for="${s.id}">
                         ${gradeLabel.text}
                     </span>
                 </td>
                 <td>
                     <button class="btn btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" 
                             onclick="gradesManager.showCertificate('${s.id}')">
                         شهادة
                     </button>
                 </td>
             </tr>
         `;
     }).join('');
 }
 getGradeLabel(score) {
     if (!score || score === '') return { text: '-', class: '' };
     if (score >= 16) return { text: 'ممتاز', class: 'badge-success' };
     if (score >= 14) return { text: 'جيد جداً', class: 'badge-success' };
     if (score >= 12) return { text: 'جيد', class: 'badge-success' };
     if (score >= 10) return { text: 'مقبول', class: 'badge-warning' };
     return { text: 'ضعيف', class: 'badge-danger' };
 }
 updateGradeLabel(input) {
     const studentId = input.dataset.gradeFor;
     const score = parseFloat(input.value);
     const label = this.getGradeLabel(score);
     const labelSpan = document.querySelector(`[data-label-for="${studentId}"]`);
     if (labelSpan) {
         labelSpan.textContent = label.text;
         labelSpan.className = `badge ${label.class}`;
     }
 }
 calculatePeriodicResults() {
     if (!this.selectedClass) {
         ui.showToast('يرجى اختيار الفصل أولاً', 'error');
         return;
     }
     const students = db.getData('students').filter(s => s.classId === this.selectedClass);
     const subjects = db.getData('subjects');
     const allGrades = db.getData('grades');
     const results = students.map(s => {
         let totalPoints = 0;
         let totalCoefficients = 0;
         subjects.forEach(subject => {
             const subjectGrades = allGrades.filter(g => 
                 g.studentId === s.id && g.subjectId === subject.id
             );
             if (subjectGrades.length > 0) {
                 // Moyenne de la matière = somme des examens / nombre d'examens
                 const subjectAverage = subjectGrades.reduce((sum, g) => sum + g.score, 0) / subjectGrades.length;
                 totalPoints += subjectAverage * subject.coefficient;
                 totalCoefficients += subject.coefficient;
             }
         });
         const average = totalCoefficients > 0 ? (totalPoints / totalCoefficients) : 0;
         return {
             student: s,
             average: average.toFixed(2),
             gradeLabel: this.getGradeLabel(average)
         };
     });
     // Trier par moyenne décroissante pour le classement
     results.sort((a, b) => parseFloat(b.average) - parseFloat(a.average));
     const tbody = document.getElementById('periodicResultsBody');
     tbody.innerHTML = results.map((r, index) => `
         <tr>
             <td>${index + 1}</td>
             <td><strong>${r.student.fullName}</strong></td>
             <td style="font-weight: bold; color: ${parseFloat(r.average) >= 10 ? 'var(--success-green)' : 'var(--danger-red)'};">
                 ${r.average} / 20
             </td>
             <td>
                 <span class="badge ${r.gradeLabel.class}">${r.gradeLabel.text}</span>
             </td>
             <td style="font-weight: bold; color: var(--primary-blue);">${index + 1}</td>
         </tr>
     `).join('');
     document.getElementById('periodicResultsContainer').style.display = 'block';
     ui.showToast('تم حساب النتائج الدورية بنجاح', 'success');
 }
 attachEvents() {
     document.getElementById('gradesClass').addEventListener('change', (e) => {
         this.selectedClass = e.target.value;
         this.loadSubjectsForClass(this.selectedClass);
     });
     document.getElementById('gradesSubject').addEventListener('change', (e) => {
         this.selectedSubject = e.target.value;
     });
     document.getElementById('gradesFilterForm').addEventListener('submit', (e) => {
         e.preventDefault();
         if (!this.selectedClass || !this.selectedSubject) {
             ui.showToast('يرجى اختيار الفصل والمادة', 'error');
             return;
         }
         this.loadGrades();
     });
     document.getElementById('saveGradesBtn').addEventListener('click', () => {
         this.saveGrades();
     });
     document.getElementById('generateCertificatesBtn').addEventListener('click', () => {
         ui.showToast('اضغط على زر "شهادة" بجانب كل طالب لإصدار شهادته', 'info');
     });
     document.getElementById('loadPeriodicResultsBtn').addEventListener('click', () => {
         this.calculatePeriodicResults();
     });
 }
 saveGrades() {
     const examType = document.getElementById('gradesExamType').value;
     const inputs = document.querySelectorAll('input[data-grade-for]');
     const allGrades = db.getData('grades');
     let outOfRangeCount = 0;
     inputs.forEach(input => {
         const studentId = input.dataset.gradeFor;
         const score = parseFloat(input.value);
         if (!isNaN(score)) {
             if (score < 0 || score > 20) {
                 outOfRangeCount++;
                 return;
             }
             const existingIndex = allGrades.findIndex(g => 
                 g.studentId === studentId && 
                 g.subjectId === this.selectedSubject && 
                 g.examType === examType
             );
             if (existingIndex !== -1) {
                 allGrades[existingIndex].score = score;
             } else {
                 allGrades.push({
                     id: Date.now().toString() + Math.random(),
                     studentId: studentId,
                     subjectId: this.selectedSubject,
                     examType: examType,
                     score: score,
                     date: new Date().toISOString().split('T')[0]
                 });
             }
         }
     });
     db.setData('grades', allGrades);
     if (outOfRangeCount > 0) {
         ui.showToast(`تم الحفظ، لكن ${outOfRangeCount} نقطة تم تجاهلها لأنها خارج المجال 0-20`, 'error');
     } else {
         ui.showToast('تم حفظ النقاط بنجاح', 'success');
     }
 }
 showCertificate(studentId) {
     const student = db.getData('students').find(s => s.id === studentId);
     const subjects = db.getData('subjects');
     const allGrades = db.getData('grades').filter(g => g.studentId === studentId);
     const classes = db.getData('classes');
     const cls = classes.find(c => c.id === student.classId);
     let totalPoints = 0;
     let totalCoefficients = 0;
     subjects.forEach(subject => {
         const subjectGrades = allGrades.filter(g => g.subjectId === subject.id);
         if (subjectGrades.length > 0) {
             const avg = subjectGrades.reduce((sum, g) => sum + g.score, 0) / subjectGrades.length;
             totalPoints += avg * subject.coefficient;
             totalCoefficients += subject.coefficient;
         }
     });
     const average = totalCoefficients > 0 ? (totalPoints / totalCoefficients).toFixed(2) : 0;
     const certificateHTML = `
         <div style="border: 10px double var(--primary-blue); padding: 3rem; text-align: center; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);">
             <div style="margin-bottom: 2rem;">
                 <h1 style="color: var(--primary-blue); font-size: 2.5rem; margin-bottom: 0.5rem;">شهادة نجاح</h1>
                 <p style="color: var(--text-secondary); font-size: 1.1rem;">Certificate of Achievement</p>
             </div>
             <div style="margin: 2rem 0;">
                 <p style="font-size: 1.2rem; color: var(--text-primary); margin-bottom: 1rem;">تشهد إدارة المؤسسة التكوينية بأن الطالب/ة</p>
                 <h2 style="color: var(--primary-blue); font-size: 2rem; margin: 1rem 0; border-bottom: 2px solid var(--primary-blue); display: inline-block; padding-bottom: 0.5rem;">${student.fullName}</h2>
             </div>
             <div style="margin: 2rem 0;">
                 <p style="font-size: 1.1rem; color: var(--text-primary);">قد أتم بنجاح دراسة الفصل</p>
                 <p style="font-size: 1.3rem; color: var(--success-green); font-weight: bold; margin: 1rem 0;">${cls ? cls.name : 'غير محدد'}</p>
                 <p style="font-size: 1.1rem; color: var(--text-primary);">بمعدل عام</p>
                 <p style="font-size: 2rem; color: var(--primary-blue); font-weight: bold; margin: 1rem 0;">${average} / 20</p>
             </div>
             <div style="margin-top: 3rem; display: flex; justify-content: space-around; align-items: center;">
                 <div>
                     <p style="color: var(--text-secondary); margin-bottom: 0.5rem;">التاريخ</p>
                     <p style="font-weight: bold;">${new Date().toLocaleDateString('ar-MA')}</p>
                 </div>
                 <div>
                     <p style="color: var(--text-secondary); margin-bottom: 0.5rem;">الختم والتوقيع</p>
                     <div style="width: 100px; height: 100px; border: 2px dashed var(--text-secondary); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--text-secondary);">
                         الختم
                     </div>
                 </div>
             </div>
         </div>
     `;
     document.getElementById('certificateContent').innerHTML = certificateHTML;
     ui.openModal('certificateModal');
 }
}
window.gradesManager = new GradesManager();