// js/grades.js
class GradesManager {
    constructor() {
        this.contentArea = document.getElementById('contentArea');
        this.selectedClass = '';
        this.selectedSubject = '';
    }

    // ✅ render() devient async
    async render() {
        document.querySelector('.header-title').textContent = 'النقاط والشهادات';
        this.contentArea.innerHTML = `
            <div class="card" style="padding: 1.5rem; margin-bottom: 1.5rem;">
                <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
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
                    <div style="align-self: flex-end; display: flex; gap: 0.5rem;">
                        <button class="btn btn-primary" id="loadGradesBtn">تحميل النقاط</button>
                        <button class="btn btn-info" id="loadPeriodicBtn" style="background: var(--light-blue); color: white;">النتائج الدورية</button>
                    </div>
                </div>
            </div>
            
            <div id="gradesContainer" style="display: none;">
                <div class="table-container">
                    <div class="table-header">
                        <h3 class="table-title">جدول النقاط</h3>
                        <button class="btn btn-success" id="saveGradesBtn">حفظ النقاط</button>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <!-- Colonne # supprimée -->
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

            <div id="periodicContainer" style="display: none; margin-top: 2rem;">
                <div class="table-container">
                    <div class="table-header">
                        <h3 class="table-title">النتائج الدورية (المعدل العام)</h3>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>الترتيب</th>
                                <th>اسم الطالب</th>
                                <th>المعدل العام / 20</th>
                                <th>التقدير</th>
                            </tr>
                        </thead>
                        <tbody id="periodicTableBody"></tbody>
                    </table>
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
        await this.loadClasses();
        this.attachEvents();
    }

    // ✅ async
    async loadClasses() {
        const classes = await db.getData('classes');
        const select = document.getElementById('gradesClass');
        classes.forEach(cls => {
            const opt = document.createElement('option');
            opt.value = cls.id;
            opt.textContent = cls.name;
            select.appendChild(opt);
        });
    }

    // ✅ async - Charger toutes les matières
    async loadSubjects() {
        const subjects = await db.getData('subjects');
        const select = document.getElementById('gradesSubject');
        select.innerHTML = '<option value="">-- اختر المادة --</option>';
        subjects.forEach(sub => {
            const opt = document.createElement('option');
            opt.value = sub.id;
            opt.textContent = sub.name;
            select.appendChild(opt);
        });
    }

    // ✅ async
    async loadGrades() {
        if (!this.selectedClass || !this.selectedSubject) {
            document.getElementById('noSelection').style.display = 'block';
            document.getElementById('gradesContainer').style.display = 'none';
            return;
        }
        document.getElementById('noSelection').style.display = 'none';
        document.getElementById('gradesContainer').style.display = 'block';
        document.getElementById('periodicContainer').style.display = 'none';

        const students = (await db.getData('students')).filter(s => s.class_id === this.selectedClass);
        const examType = document.getElementById('gradesExamType').value;
        const allGrades = await db.getData('grades');
        const tbody = document.getElementById('gradesTableBody');

        tbody.innerHTML = students.map((s) => {
            const grade = allGrades.find(g => 
                g.student_id === s.id && 
                g.subject_id === this.selectedSubject && 
                g.exam_type === examType
            );
            const score = grade ? grade.score : '';
            const gradeLabel = this.getGradeLabel(score);
            return `
                <tr data-student-id="${s.id}">
                    <td><strong>${s.full_name}</strong></td>
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
        if (!score && score !== 0) return { text: '-', class: '' };
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

    // ✅ async - Calcul des résultats périodiques
    async calculatePeriodicResults() {
        if (!this.selectedClass) {
            ui.showToast('يرجى اختيار الفصل أولاً', 'error');
            return;
        }
        document.getElementById('periodicContainer').style.display = 'block';
        
        const students = (await db.getData('students')).filter(s => s.class_id === this.selectedClass);
        const subjects = await db.getData('subjects');
        const allGrades = await db.getData('grades');

        const results = students.map(s => {
            let totalPoints = 0;
            let totalCoefficients = 0;

            subjects.forEach(subject => {
                // Moyenne de la matière = somme des examens / nombre d'examens
                const subjectGrades = allGrades.filter(g => g.student_id === s.id && g.subject_id === subject.id);
                if (subjectGrades.length > 0) {
                    const subjectAverage = subjectGrades.reduce((sum, g) => sum + parseFloat(g.score || 0), 0) / subjectGrades.length;
                    totalPoints += subjectAverage * subject.coefficient;
                    totalCoefficients += subject.coefficient;
                }
            });

            // Moyenne générale = total points / total coefficients
            const average = totalCoefficients > 0 ? (totalPoints / totalCoefficients) : 0;
            return {
                student: s,
                average: average,
                gradeLabel: this.getGradeLabel(average)
            };
        });

        // Trier par moyenne décroissante pour le classement
        results.sort((a, b) => b.average - a.average);

        const tbody = document.getElementById('periodicTableBody');
        tbody.innerHTML = results.map((r, index) => `
            <tr>
                <td><strong>${index + 1}</strong></td>
                <td><strong>${r.student.full_name}</strong></td>
                <td style="font-weight: bold; color: ${r.average >= 10 ? 'var(--success-green)' : 'var(--danger-red)'};">
                    ${r.average.toFixed(2)} / 20
                </td>
                <td>
                    <span class="badge ${r.gradeLabel.class}">${r.gradeLabel.text}</span>
                </td>
            </tr>
        `).join('');
    }

    attachEvents() {
        document.getElementById('gradesClass').addEventListener('change', async (e) => {
            this.selectedClass = e.target.value;
            await this.loadSubjects(); // Recharger les matières
        });
        document.getElementById('gradesSubject').addEventListener('change', (e) => {
            this.selectedSubject = e.target.value;
        });
        document.getElementById('loadGradesBtn').addEventListener('click', () => {
            if (!this.selectedClass || !this.selectedSubject) {
                ui.showToast('يرجى اختيار الفصل والمادة', 'error');
                return;
            }
            this.loadGrades();
        });
        // ✅ async
        document.getElementById('saveGradesBtn').addEventListener('click', async () => {
            await this.saveGrades();
        });
        document.getElementById('loadPeriodicBtn').addEventListener('click', async () => {
            await this.calculatePeriodicResults();
        });
    }

    // ✅ async
    async saveGrades() {
        const examType = document.getElementById('gradesExamType').value;
        const inputs = document.querySelectorAll('input[data-grade-for]');
        const allGrades = await db.getData('grades');
        
        inputs.forEach(input => {
            const studentId = input.dataset.gradeFor;
            const score = parseFloat(input.value);
            
            if (!isNaN(score)) {
                const existingIndex = allGrades.findIndex(g => 
                    g.student_id === studentId && 
                    g.subject_id === this.selectedSubject && 
                    g.exam_type === examType
                );
                
                if (existingIndex !== -1) {
                    allGrades[existingIndex].score = score;
                } else {
                    allGrades.push({
                        id: Date.now().toString() + Math.random(),
                        student_id: studentId,
                        subject_id: this.selectedSubject,
                        exam_type: examType,
                        score: score,
                        date: new Date().toISOString().split('T')[0]
                    });
                }
            }
        });
        
        await db.setData('grades', allGrades);
        ui.showToast('تم حفظ النقاط بنجاح', 'success');
    }

    // ✅ async
    async showCertificate(studentId) {
        const student = (await db.getData('students')).find(s => s.id === studentId);
        const subjects = await db.getData('subjects');
        const allGrades = (await db.getData('grades')).filter(g => g.student_id === studentId);
        const classes = await db.getData('classes');
        const cls = classes.find(c => c.id === student.class_id);

        let totalPoints = 0;
        let totalCoefficients = 0;

        subjects.forEach(subject => {
            const subjectGrades = allGrades.filter(g => g.subject_id === subject.id);
            if (subjectGrades.length > 0) {
                const avg = subjectGrades.reduce((sum, g) => sum + parseFloat(g.score || 0), 0) / subjectGrades.length;
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
                    <h2 style="color: var(--primary-blue); font-size: 2rem; margin: 1rem 0; border-bottom: 2px solid var(--primary-blue); display: inline-block; padding-bottom: 0.5rem;">${student.full_name}</h2>
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