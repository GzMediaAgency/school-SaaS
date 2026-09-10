// js/teachers.js
class TeachersManager {
    constructor() {
        this.contentArea = document.getElementById('contentArea');
        this.currentFilter = '';
    }

    // ✅ render() devient async
    async render() {
        document.querySelector('.header-title').textContent = 'إدارة الأساتذة والمواد';
        this.contentArea.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr; gap: 2rem;">
                <!-- قسم الأساتذة -->
                <div>
                    <div class="table-header" style="background: transparent; padding: 0; margin-bottom: 1.5rem; border: none; box-shadow: none;">
                        <h2 style="color: var(--text-primary);">قائمة الأساتذة</h2>
                        <button class="btn btn-success" id="addTeacherBtn">+ إضافة أستاذ جديد</button>
                    </div>
                    <div class="card" style="padding: 1.5rem; margin-bottom: 1.5rem;">
                        <div class="search-box" style="max-width: 400px;">
                            <span>🔍</span>
                            <input type="text" id="searchTeacher" placeholder="البحث بالاسم أو التخصص..." style="width: 100%; border: none; background: none; outline: none;">
                        </div>
                    </div>
                    <div class="stats-grid" id="teachersGrid"></div>
                </div>
                <!-- قسم المواد -->
                <div>
                    <div class="table-header" style="background: transparent; padding: 0; margin-bottom: 1.5rem; border: none; box-shadow: none;">
                        <h2 style="color: var(--text-primary);">المواد التكوينية</h2>
                        <button class="btn btn-success" id="addSubjectBtn">+ إضافة مادة جديدة</button>
                    </div>
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>اسم المادة</th>
                                    <th>المعامل</th>
                                    <th>الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody id="subjectsTableBody"></tbody>
                        </table>
                    </div>
                </div>
            </div>
            <!-- نافذة إضافة/تعديل أستاذ -->
            <div class="modal" id="teacherModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 class="modal-title" id="teacherModalTitle">إضافة أستاذ</h3>
                        <button class="modal-close" onclick="closeModal('teacherModal')">×</button>
                    </div>
                    <form id="teacherForm">
                        <input type="hidden" id="teacherId">
                        <div class="form-group">
                            <label class="form-label">الاسم الكامل *</label>
                            <input type="text" id="teacherName" class="form-input" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">رقم الهاتف *</label>
                            <input type="tel" id="teacherPhone" class="form-input" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">البريد الإلكتروني</label>
                            <input type="email" id="teacherEmail" class="form-input">
                        </div>
                        <div class="form-group">
                            <label class="form-label">التخصص *</label>
                            <input type="text" id="teacherSpecialty" class="form-input" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">الراتب</label>
                            <input type="number" id="teacherSalary" class="form-input" min="0">
                        </div>
                        <div class="form-group">
                            <label class="form-label">المواد التي يدرسها</label>
                            <div id="teacherSubjectsCheckboxes" style="display: flex; flex-direction: column; gap: 0.5rem; max-height: 200px; overflow-y: auto; padding: 0.5rem; border: 1px solid #e0e0e0; border-radius: 4px;"></div>
                        </div>
                        <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1.5rem;">
                            <button type="button" class="btn btn-outline" onclick="closeModal('teacherModal')">إلغاء</button>
                            <button type="submit" class="btn btn-success">حفظ البيانات</button>
                        </div>
                    </form>
                </div>
            </div>
            <!-- نافذة إضافة/تعديل مادة -->
            <div class="modal" id="subjectModal">
                <div class="modal-content" style="max-width: 400px;">
                    <div class="modal-header">
                        <h3 class="modal-title" id="subjectModalTitle">إضافة مادة</h3>
                        <button class="modal-close" onclick="closeModal('subjectModal')">×</button>
                    </div>
                    <form id="subjectForm">
                        <input type="hidden" id="subjectId">
                        <div class="form-group">
                            <label class="form-label">اسم المادة *</label>
                            <input type="text" id="subjectName" class="form-input" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">المعامل *</label>
                            <input type="number" id="subjectCoefficient" class="form-input" required min="1" max="10">
                        </div>
                        <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1.5rem;">
                            <button type="button" class="btn btn-outline" onclick="closeModal('subjectModal')">إلغاء</button>
                            <button type="submit" class="btn btn-success">حفظ</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        await this.loadTeachers();
        await this.loadSubjects();
        this.attachEvents();
    }

    // ✅ async
    async loadTeachers() {
        let teachers = await db.getData('teachers');
        const subjects = await db.getData('subjects');

        if (this.currentFilter) {
            const term = this.currentFilter.toLowerCase();
            teachers = teachers.filter(t =>
                t.full_name.toLowerCase().includes(term) ||
                t.specialties.toLowerCase().includes(term)
            );
        }

        const grid = document.getElementById('teachersGrid');
        if (teachers.length === 0) {
            grid.innerHTML = `<div class="card" style="text-align: center; padding: 3rem; grid-column: 1/-1;">
                <p style="color: var(--text-secondary);">لا يوجد أساتذة</p>
            </div>`;
            return;
        }

        grid.innerHTML = teachers.map(t => {
            // subjects est stocké comme string JSON dans Supabase
            let teacherSubjectIds = [];
            try {
                teacherSubjectIds = t.subjects ? (Array.isArray(t.subjects) ? t.subjects : JSON.parse(t.subjects)) : [];
            } catch (e) {
                teacherSubjectIds = [];
            }
            const teacherSubjects = subjects.filter(s => teacherSubjectIds.includes(s.id));
            const subjectsList = teacherSubjects.map(s => s.name).join('، ') || 'لا توجد مواد';
            return `
                <div class="card" style="position: relative;">
                    <div style="display: flex; gap: 1.5rem; align-items: flex-start;">
                        <div style="width: 80px; height: 80px; border-radius: 50%; background: var(--light-blue); display: flex; align-items: center; justify-content: center; color: white; font-size: 2rem; font-weight: bold; flex-shrink: 0;">
                            ${t.full_name.charAt(0)}
                        </div>
                        <div style="flex: 1;">
                            <h3 style="color: var(--text-primary); margin-bottom: 0.5rem;">${t.full_name}</h3>
                            <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 0.5rem;">
                                <strong>التخصص:</strong> ${t.specialties}
                            </p>
                            <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 0.5rem;">
                                <strong>الهاتف:</strong> ${t.phone}
                            </p>
                            <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 0.5rem;">
                                <strong>المواد:</strong> ${subjectsList}
                            </p>
                            <p style="color: var(--success-green); font-weight: bold;">
                                ${t.salary ? ui.formatNumber(t.salary) + ' درهم' : ''}
                            </p>
                        </div>
                    </div>
                    <div style="display: flex; gap: 0.5rem; margin-top: 1rem; justify-content: flex-end;">
                        <button class="btn btn-outline" style="padding: 0.25rem 0.75rem; font-size: 0.85rem;" onclick="teachersManager.editTeacher('${t.id}')">تعديل</button>
                        <button class="btn btn-danger" style="padding: 0.25rem 0.75rem; font-size: 0.85rem;" onclick="teachersManager.deleteTeacher('${t.id}')">حذف</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // ✅ async
    async loadSubjects() {
        const subjects = await db.getData('subjects');
        const tbody = document.getElementById('subjectsTableBody');
        tbody.innerHTML = subjects.map((s) => `
            <tr>
                <td><strong>${s.name}</strong></td>
                <td><span class="badge badge-success">${s.coefficient}</span></td>
                <td>
                    <button class="btn btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; margin-left: 0.25rem;" onclick="teachersManager.editSubject('${s.id}')">تعديل</button>
                    <button class="btn btn-danger" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" onclick="teachersManager.deleteSubject('${s.id}')">حذف</button>
                </td>
            </tr>
        `).join('');
    }

    // ✅ async
    async loadSubjectsCheckboxes(selectedIds = []) {
        const subjects = await db.getData('subjects');
        const container = document.getElementById('teacherSubjectsCheckboxes');
        container.innerHTML = subjects.map(s => `
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                <input type="checkbox" name="teacherSubjects" value="${s.id}" ${selectedIds.includes(s.id) ? 'checked' : ''}>
                <span>${s.name} (معامل ${s.coefficient})</span>
            </label>
        `).join('');
    }

    attachEvents() {
        document.getElementById('addTeacherBtn').addEventListener('click', () => this.showAddTeacherModal());
        document.getElementById('addSubjectBtn').addEventListener('click', () => this.showAddSubjectModal());
        document.getElementById('searchTeacher').addEventListener('input', (e) => {
            this.currentFilter = e.target.value;
            this.loadTeachers();
        });
        document.getElementById('teacherForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveTeacher();
        });
        document.getElementById('subjectForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveSubject();
        });
    }

    // ✅ async
    async showAddTeacherModal() {
        document.getElementById('teacherModalTitle').textContent = 'إضافة أستاذ جديد';
        document.getElementById('teacherForm').reset();
        document.getElementById('teacherId').value = '';
        await this.loadSubjectsCheckboxes();
        ui.openModal('teacherModal');
    }

    // ✅ async
    async editTeacher(id) {
        const teacher = await db.findItem('teachers', t => t.id === id);
        if (!teacher) return;
        document.getElementById('teacherModalTitle').textContent = 'تعديل بيانات الأستاذ';
        document.getElementById('teacherId').value = teacher.id;
        document.getElementById('teacherName').value = teacher.full_name;
        document.getElementById('teacherPhone').value = teacher.phone;
        document.getElementById('teacherEmail').value = teacher.email || '';
        document.getElementById('teacherSpecialty').value = teacher.specialties;
        document.getElementById('teacherSalary').value = teacher.salary || '';
        
        // Parser les subjects (peut être string JSON ou array)
        let selectedIds = [];
        try {
            selectedIds = teacher.subjects ? (Array.isArray(teacher.subjects) ? teacher.subjects : JSON.parse(teacher.subjects)) : [];
        } catch (e) {
            selectedIds = [];
        }
        await this.loadSubjectsCheckboxes(selectedIds);
        ui.openModal('teacherModal');
    }

        // ✅ async
    async saveTeacher() {
        const id = document.getElementById('teacherId').value;

        // 🔒 ÉTAPE 5 : Vérifier la limite pour un nouvel professeur
        if (!id) {
            const allowed = await saasManager.enforceLimit('teachers', 'الأساتذة');
            if (!allowed) return;
        }

        const selectedSubjects = Array.from(document.querySelectorAll('input[name="teacherSubjects"]:checked')).map(cb => cb.value);
        const data = {
            full_name: document.getElementById('teacherName').value.trim(),
            phone: document.getElementById('teacherPhone').value.trim(),
            email: document.getElementById('teacherEmail').value.trim(),
            specialties: document.getElementById('teacherSpecialty').value.trim(),
            salary: parseFloat(document.getElementById('teacherSalary').value) || 0,
            subjects: JSON.stringify(selectedSubjects)
        };

        if (!data.full_name || !data.phone || !data.specialties) {
            ui.showToast('يرجى ملء جميع الحقول المطلوبة (*)', 'error');
            return;
        }

        if (id) {
            await db.updateItem('teachers', id, data);
            ui.showToast('تم تحديث بيانات الأستاذ بنجاح', 'success');
        } else {
            await db.addItem('teachers', data);
            ui.showToast('تم إضافة الأستاذ بنجاح', 'success');
        }
        ui.closeModal('teacherModal');
        await this.loadTeachers();
    }

    // ✅ async
    async deleteTeacher(id) {
        const confirmed = await ui.confirmDelete('هل أنت متأكد من حذف هذا الأستاذ؟');
        if (confirmed) {
            await db.deleteItem('teachers', id);
            ui.showToast('تم حذف الأستاذ بنجاح', 'success');
            await this.loadTeachers();
        }
    }

    showAddSubjectModal() {
        document.getElementById('subjectModalTitle').textContent = 'إضافة مادة جديدة';
        document.getElementById('subjectForm').reset();
        document.getElementById('subjectId').value = '';
        ui.openModal('subjectModal');
    }

    // ✅ async
    async editSubject(id) {
        const subject = await db.findItem('subjects', s => s.id === id);
        if (!subject) return;
        document.getElementById('subjectModalTitle').textContent = 'تعديل المادة';
        document.getElementById('subjectId').value = subject.id;
        document.getElementById('subjectName').value = subject.name;
        document.getElementById('subjectCoefficient').value = subject.coefficient;
        ui.openModal('subjectModal');
    }

        // ✅ async
    async saveSubject() {
        const id = document.getElementById('subjectId').value;

        // 🔒 ÉTAPE 5 : Vérifier la limite pour une nouvelle matière
        if (!id) {
            const allowed = await saasManager.enforceLimit('subjects', 'المواد');
            if (!allowed) return;
        }

        const data = {
            name: document.getElementById('subjectName').value.trim(),
            coefficient: parseInt(document.getElementById('subjectCoefficient').value)
        };

        if (!data.name || !data.coefficient) {
            ui.showToast('يرجى ملء جميع الحقول', 'error');
            return;
        }

        if (id) {
            await db.updateItem('subjects', id, data);
            ui.showToast('تم تحديث المادة بنجاح', 'success');
        } else {
            await db.addItem('subjects', data);
            ui.showToast('تم إضافة المادة بنجاح', 'success');
        }
        ui.closeModal('subjectModal');
        await this.loadSubjects();
    }

    // ✅ async
    async deleteSubject(id) {
        const confirmed = await ui.confirmDelete('هل أنت متأكد من حذف هذه المادة؟');
        if (confirmed) {
            await db.deleteItem('subjects', id);
            ui.showToast('تم حذف المادة بنجاح', 'success');
            await this.loadSubjects();
        }
    }
}

window.teachersManager = new TeachersManager();