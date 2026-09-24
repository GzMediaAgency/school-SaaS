// js/payments.js
class PaymentsManager {
    constructor() {
        this.contentArea = document.getElementById('contentArea');
        this.monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'ماي', 'يونيو',
            'يوليوز', 'غشت', 'شتنبر', 'أكتوبر', 'نونبر', 'دجنبر'];
    }

    currentMonth() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }

    monthLabel(monthStr) {
        const [y, m] = monthStr.split('-');
        return `${this.monthNames[parseInt(m, 10) - 1]} ${y}`;
    }

    today() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    render() {
        document.querySelector('.header-title').textContent = 'الأداءات والرواتب';
        const cur = this.currentMonth();
        const today = this.today();

        this.contentArea.innerHTML = `
            <div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));">
                <!-- بطاقة تسجيل أداء -->
                <div class="card">
                    <h3 style="margin-bottom:1rem;">💵 تسجيل أداء طالب <span class="badge badge-success">يُضاف للمداخيل تلقائياً</span></h3>
                    <form id="paymentForm">
                        <div class="form-group">
                            <label class="form-label">الطالب *</label>
                            <select id="payStudent" class="form-input" required></select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">المبلغ (درهم) *</label>
                            <input type="number" id="payAmount" class="form-input" min="0" step="0.01" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">شهر الأداء *</label>
                            <input type="month" id="payMonth" class="form-input" value="${cur}" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">تاريخ الأداء</label>
                            <input type="date" id="payDate" class="form-input" value="${today}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">ملاحظة</label>
                            <input type="text" id="payNotes" class="form-input" placeholder="مثال: القسط الشهري">
                        </div>
                        <button type="submit" class="btn btn-success" style="width:100%; justify-content:center;">تسجيل الأداء ➜ إضافة للمداخيل</button>
                    </form>
                </div>

                <!-- بطاقة دفع راتب -->
                <div class="card">
                    <h3 style="margin-bottom:1rem;">👨‍ دفع راتب أستاذ <span class="badge badge-danger">يُضاف للمصاريف تلقائياً</span></h3>
                    <form id="salaryForm">
                        <div class="form-group">
                            <label class="form-label">الأستاذ *</label>
                            <select id="salTeacher" class="form-input" required></select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">المبلغ (درهم) *</label>
                            <input type="number" id="salAmount" class="form-input" min="0" step="0.01" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">شهر الراتب *</label>
                            <input type="month" id="salMonth" class="form-input" value="${cur}" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">تاريخ الدفع</label>
                            <input type="date" id="salDate" class="form-input" value="${today}">
                        </div>
                        <button type="submit" class="btn btn-danger" style="width:100%; justify-content:center;">دفع الراتب ➜ إضافة للمصاريف</button>
                    </form>
                    <button id="bulkSalariesBtn" class="btn btn-primary" style="width:100%; justify-content:center; margin-top:0.75rem;">
                        🔄 توليد رواتب الشهر الحالي لكل الأساتذة دفعة واحدة
                    </button>
                </div>
            </div>

            <div class="stats-grid" style="grid-template-columns: 1fr 1fr;">
                <div class="table-container">
                    <div class="table-header"><h3 class="table-title">آخر الأداءات (مداخيل)</h3></div>
                    <table>
                        <thead><tr><th>الطالب</th><th>الشهر</th><th>المبلغ</th><th></th></tr></thead>
                        <tbody id="paymentsTableBody"></tbody>
                    </table>
                </div>
                <div class="table-container">
                    <div class="table-header"><h3 class="table-title">آخر الرواتب (مصاريف)</h3></div>
                    <table>
                        <thead><tr><th>الأستاذ</th><th>الشهر</th><th>المبلغ</th><th></th></tr></thead>
                        <tbody id="salariesTableBody"></tbody>
                    </table>
                </div>
            </div>
        `;

        this.populateSelects();
        this.loadTables();
        this.attachEvents();
    }

    populateSelects() {
        const students = db.getData('students');
        const paySelect = document.getElementById('payStudent');
        paySelect.innerHTML = '<option value="">-- اختر الطالب --</option>';
        students.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = s.fullName || s.full_name;
            paySelect.appendChild(opt);
        });

        const teachers = db.getData('teachers');
        const salSelect = document.getElementById('salTeacher');
        salSelect.innerHTML = '<option value="">-- اختر الأستاذ --</option>';
        teachers.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.id;
            opt.dataset.salary = t.salary || 0;
            opt.textContent = `${t.fullName || t.full_name}${t.salary ? ' (' + ui.formatNumber(t.salary) + ' درهم)' : ''}`;
            salSelect.appendChild(opt);
        });

        // تعبئة المبلغ تلقائياً من راتب الأستاذ عند الاختيار
        salSelect.addEventListener('change', () => {
            const selected = salSelect.options[salSelect.selectedIndex];
            if (selected && selected.dataset.salary) {
                document.getElementById('salAmount').value = selected.dataset.salary;
            }
        });
    }

    attachEvents() {
        document.getElementById('paymentForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.savePayment();
        });
        document.getElementById('salaryForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSalary();
        });
        document.getElementById('bulkSalariesBtn').addEventListener('click', () => {
            this.bulkSalaries();
        });
    }

    // ========== تسجيل أداء طالب → دخل تلقائي ==========
    savePayment() {
        const studentId = document.getElementById('payStudent').value;
        const amount = parseFloat(document.getElementById('payAmount').value);
        const month = document.getElementById('payMonth').value;
        const date = document.getElementById('payDate').value || this.today();
        const notes = document.getElementById('payNotes').value.trim();

        const student = db.findItem('students', s => s.id === studentId);
        if (!student || !amount || amount <= 0 || !month) {
            ui.showToast('يرجى ملء جميع الحقول المطلوبة', 'error');
            return;
        }

        const studentName = student.fullName || student.full_name;

        // 1) حفظ الأداء
        const row = db.addItem('payments', {
            studentId: studentId,
            studentName: studentName,
            amount: amount,
            month: month,
            date: date,
            notes: notes
        });

        // 2) ✅ إضافة تلقائية إلى المالية كدخل
        db.addItem('finance', {
            type: 'income',
            category: 'أداءات الطلاب',
            amount: amount,
            description: `أداء ${studentName} - ${this.monthLabel(month)}${notes ? ' - ' + notes : ''}`,
            date: date,
            source: 'payment',
            sourceId: row.id
        });

        ui.showToast(`تم تسجيل الأداء وإضافته إلى المداخيل تلقائياً (+${ui.formatNumber(amount)} درهم)`, 'success');
        document.getElementById('paymentForm').reset();
        document.getElementById('payMonth').value = this.currentMonth();
        document.getElementById('payDate').value = this.today();
        this.loadTables();
    }

    // ========== دفع راتب أستاذ → مصروف تلقائي ==========
    saveSalary() {
        const teacherId = document.getElementById('salTeacher').value;
        const amount = parseFloat(document.getElementById('salAmount').value);
        const month = document.getElementById('salMonth').value;
        const date = document.getElementById('salDate').value || this.today();

        const teacher = db.findItem('teachers', t => t.id === teacherId);
        if (!teacher || !amount || amount <= 0 || !month) {
            ui.showToast('يرجى ملء جميع الحقول المطلوبة', 'error');
            return;
        }

        // منع تكرار راتب نفس الأستاذ لنفس الشهر
        const exists = db.getData('salaries').find(s => s.teacherId === teacherId && s.month === month);
        if (exists) {
            ui.showToast(`راتب ${teacher.fullName || teacher.full_name} لشهر ${this.monthLabel(month)} مسجل بالفعل`, 'error');
            return;
        }

        const teacherName = teacher.fullName || teacher.full_name;

        // 1) حفظ الراتب
        const row = db.addItem('salaries', {
            teacherId: teacherId,
            teacherName: teacherName,
            amount: amount,
            month: month,
            date: date
        });

        // 2) ✅ إضافة تلقائية إلى المالية كمصروف
        db.addItem('finance', {
            type: 'expense',
            category: 'رواتب الأساتذة',
            amount: amount,
            description: `راتب ${teacherName} - ${this.monthLabel(month)}`,
            date: date,
            source: 'salary',
            sourceId: row.id
        });

        ui.showToast(`تم دفع الراتب وإضافته إلى المصاريف تلقائياً (-${ui.formatNumber(amount)} درهم)`, 'success');
        document.getElementById('salaryForm').reset();
        document.getElementById('salMonth').value = this.currentMonth();
        document.getElementById('salDate').value = this.today();
        this.loadTables();
    }

    // ========== توليد رواتب الشهر لكل الأساتذة ==========
    bulkSalaries() {
        const month = this.currentMonth();
        const teachers = db.getData('teachers').filter(t => (t.salary || 0) > 0);
        const existing = db.getData('salaries');
        let count = 0;

        teachers.forEach(t => {
            const already = existing.find(s => s.teacherId === t.id && s.month === month);
            if (already) return;

            const teacherName = t.fullName || t.full_name;
            const row = db.addItem('salaries', {
                teacherId: t.id,
                teacherName: teacherName,
                amount: t.salary,
                month: month,
                date: this.today()
            });
            db.addItem('finance', {
                type: 'expense',
                category: 'رواتب الأساتذة',
                amount: t.salary,
                description: `راتب ${teacherName} - ${this.monthLabel(month)}`,
                date: this.today(),
                source: 'salary',
                sourceId: row.id
            });
            count++;
        });

        if (count === 0) {
            ui.showToast('رواتب هذا الشهر مولدة بالفعل (أو لا يوجد أساتذة برواتب)', 'info');
        } else {
            ui.showToast(`تم توليد ${count} راتباً وإضافتها إلى المصاريف تلقائياً`, 'success');
        }
        this.loadTables();
    }

    // ========== الجداول ==========
    loadTables() {
        const payments = db.getData('payments')
            .sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
        document.getElementById('paymentsTableBody').innerHTML = payments.map(p => `
            <tr>
                <td>${p.studentName}</td>
                <td>${this.monthLabel(p.month)}</td>
                <td style="color: var(--success-green); font-weight: bold;">+${ui.formatNumber(p.amount)} درهم</td>
                <td><button class="btn btn-danger" style="padding:0.25rem 0.5rem; font-size:0.8rem;" onclick="paymentsManager.deletePayment('${p.id}')">حذف</button></td>
            </tr>
        `).join('') || '<tr><td colspan="4" style="text-align:center; padding:1rem; color:var(--text-secondary);">لا توجد أداءات</td></tr>';

        const salaries = db.getData('salaries')
            .sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
        document.getElementById('salariesTableBody').innerHTML = salaries.map(s => `
            <tr>
                <td>${s.teacherName}</td>
                <td>${this.monthLabel(s.month)}</td>
                <td style="color: var(--danger-red); font-weight: bold;">-${ui.formatNumber(s.amount)} درهم</td>
                <td><button class="btn btn-danger" style="padding:0.25rem 0.5rem; font-size:0.8rem;" onclick="paymentsManager.deleteSalary('${s.id}')">حذف</button></td>
            </tr>
        `).join('') || '<tr><td colspan="4" style="text-align:center; padding:1rem; color:var(--text-secondary);">لا توجد رواتب</td></tr>';
    }

    // ========== حذف متزامن (يحذف القيد المالي المرتبط) ==========
    async deletePayment(id) {
        const confirmed = await ui.confirmDelete('حذف الأداء سيحذف أيضاً قيد الدخل المرتبط به من المالية. متابعة؟');
        if (!confirmed) return;
        const linked = db.getData('finance').find(f => f.source === 'payment' && f.sourceId === id);
        if (linked) db.deleteItem('finance', linked.id);
        db.deleteItem('payments', id);
        ui.showToast('تم حذف الأداء وقيد الدخل المرتبط به', 'success');
        this.loadTables();
    }

    async deleteSalary(id) {
        const confirmed = await ui.confirmDelete('حذف الراتب سيحذف أيضاً قيد المصروف المرتبط به من المالية. متابعة؟');
        if (!confirmed) return;
        const linked = db.getData('finance').find(f => f.source === 'salary' && f.sourceId === id);
        if (linked) db.deleteItem('finance', linked.id);
        db.deleteItem('salaries', id);
        ui.showToast('تم حذف الراتب وقيد المصروف المرتبط به', 'success');
        this.loadTables();
    }
}

window.paymentsManager = new PaymentsManager();
