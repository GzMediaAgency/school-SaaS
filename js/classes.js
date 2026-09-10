// js/classes.js
class ClassesManager {
    constructor() {
        this.contentArea = document.getElementById('contentArea');
    }

    // ✅ render() devient async
    async render() {
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
                        <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1.5rem;">
                            <button type="button" class="btn btn-outline" onclick="closeModal('classModal')">إلغاء</button>
                            <button type="submit" class="btn btn-success">حفظ</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        await this.loadClasses();
        this.attachEvents();
    }

    // ✅ async + await
    async loadClasses() {
        const classes = await db.getData('classes');
        const teachers = await db.getData('teachers');
        const students = await db.getData('students');
        const grid = document.getElementById('classesGrid');

        if (classes.length === 0) {
            grid.innerHTML = `<div class="card" style="text-align: center; padding: 3rem; grid-column: 1/-1;">
                <p style="color: var(--text-secondary);">لا توجد فصول</p>
            </div>`;
            return;
        }

        grid.innerHTML = classes.map(cls => {
            const teacher = teachers.find(t => t.id === cls.teacher_id);
            const classStudents = students.filter(s => s.class_id === cls.id);
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
                    <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 1rem;">
                        <strong>الأستاذ:</strong> ${teacher ? teacher.full_name : 'غير محدد'}
                    </p>
                    <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                        <button class="btn btn-outline" style="padding: 0.25rem 0.75rem; font-size: 0.85rem;" onclick="classesManager.editClass('${cls.id}')">تعديل</button>
                        <button class="btn btn-danger" style="padding: 0.25rem 0.75rem; font-size: 0.85rem;" onclick="classesManager.deleteClass('${cls.id}')">حذف</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // ✅ async
    async loadTeachers() {
        const teachers = await db.getData('teachers');
        const teacherSelect = document.getElementById('classTeacher');
        teacherSelect.innerHTML = '<option value="">-- بدون أستاذ --</option>';
        teachers.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.id;
            opt.textContent = t.full_name;
            teacherSelect.appendChild(opt);
        });
    }

    attachEvents() {
        document.getElementById('addClassBtn').addEventListener('click', () => this.showAddModal());
        // ✅ async dans le submit
        document.getElementById('classForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveClass();
        });
    }

    // ✅ async
    async showAddModal() {
        document.getElementById('classModalTitle').textContent = 'إضافة فصل جديد';
        document.getElementById('classForm').reset();
        document.getElementById('classId').value = '';
        await this.loadTeachers();
        ui.openModal('classModal');
    }

    // ✅ async
    async editClass(id) {
        const cls = await db.findItem('classes', c => c.id === id);
        if (!cls) return;
        document.getElementById('classModalTitle').textContent = 'تعديل الفصل';
        document.getElementById('classId').value = cls.id;
        document.getElementById('className').value = cls.name;
        document.getElementById('classCapacity').value = cls.capacity;
        await this.loadTeachers();
        document.getElementById('classTeacher').value = cls.teacher_id || '';
        ui.openModal('classModal');
    }

        // ✅ async
    async saveClass() {
        const id = document.getElementById('classId').value;

        // 🔒 ÉTAPE 5 : Vérifier la limite pour un nouveau فصل
        if (!id) {
            const allowed = await saasManager.enforceLimit('classes', 'الفصول');
            if (!allowed) return;
        }

        const data = {
            name: document.getElementById('className').value.trim(),
            capacity: parseInt(document.getElementById('classCapacity').value),
            teacher_id: document.getElementById('classTeacher').value || null
        };

        if (!data.name || !data.capacity) {
            ui.showToast('يرجى ملء جميع الحقول المطلوبة', 'error');
            return;
        }

        if (id) {
            await db.updateItem('classes', id, data);
            ui.showToast('تم تحديث الفصل بنجاح', 'success');
        } else {
            await db.addItem('classes', data);
            ui.showToast('تم إضافة الفصل بنجاح', 'success');
        }
        ui.closeModal('classModal');
        await this.loadClasses();
    }

    // ✅ async
    async deleteClass(id) {
        const confirmed = await ui.confirmDelete('هل أنت متأكد من حذف هذا الفصل؟');
        if (confirmed) {
            await db.deleteItem('classes', id);
            ui.showToast('تم حذف الفصل بنجاح', 'success');
            await this.loadClasses();
        }
    }
}

window.classesManager = new ClassesManager();