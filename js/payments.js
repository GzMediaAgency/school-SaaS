// js/payments.js
// صفحة الأداءات : متابعة أداء الواجبات الشهرية للطلبة (اختيار الشهر والفصل)
class PaymentsManager {
    constructor() {
        this.contentArea = document.getElementById('contentArea');
        this.selectedClass = '';
        this.selectedMonth = new Date().toISOString().slice(0, 7);
    }

    render() {
        document.querySelector('.header-title').textContent = 'الأداءات';
        this.contentArea.innerHTML = `
            <div class="card" style="padding: 1.5rem; margin-bottom: 1.5rem;">
                <form id="paymentsFilterForm" style="display: flex; gap: 1rem; align-items: flex-end; flex-wrap: wrap;">
                    <div style="flex: 1; min-width: 180px;">
                        <label class="form-label">الشهر *</label>
                        <input type="month" id="paymentsMonth" class="form-input" value="${this.selectedMonth}">
                    </div>
                    <div style="flex: 1; min-width: 180px;">
                        <label class="form-label">اختر الفصل *</label>
                        <select id="paymentsClass" class="form-input">
                            <option value="">-- اختر الفصل --</option>
                        </select>
                    </div>
                    <div style="flex: 1; min-width: 160px;">
                        <label class="form-label">المبلغ الافتراضي (درهم)</label>
                        <input type="number" id="paymentsDefaultAmount" class="form-input" min="0" step="1" value="300">
                    </div>
                    <div style="display: flex; gap: 0.5rem;">
                        <button type="submit" class="btn btn-primary">عرض اللائحة</button>
                    </div>
                </form>
            </div>

            <div id="paymentsSummary" class="stats-grid" style="display:none; margin-bottom: 1.5rem;"></div>

            <div id="paymentsContainer" style="display: none;">
                <div class="table-container">
                    <div class="table-header">
                        <h3 class="table-title" id="paymentsTableTitle">لائحة الأداءات</h3>
                        <div style="display: flex; gap: 0.5rem;">
                            <button class="btn btn-success" id="savePaymentsBtn">حفظ</button>
                            <button class="btn btn-outline" id="exportPaymentsBtn">🖨️ تصدير PDF</button>
                        </div>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>اسم الطالب</th>
                                <th style="min-width: 140px;">المبلغ (درهم)</th>
                                <th style="text-align: center;">أدّى</th>
                                <th>تاريخ الأداء</th>
                                <th>ملاحظات</th>
                            </tr>
                        </thead>
                        <tbody id="paymentsTableBody"></tbody>
                    </table>
                </div>
            </div>

            <div id="noPaymentsSelection" class="card" style="text-align: center; padding: 3rem;">
                <p style="color: var(--text-secondary); font-size: 1.1rem;">يرجى اختيار الشهر والفصل لعرض لائحة أداءات الطلبة</p>
            </div>
        `;
        this.loadClasses();
        this.attachEvents();
    }

    loadClasses() {
        const classes = db.getData('classes');
        const select = document.getElementById('paymentsClass');
        classes.forEach(cls => {
            const opt = document.createElement('option');
            opt.value = cls.id;
            opt.textContent = cls.name;
            select.appendChild(opt);
        });
    }

    attachEvents() {
        document.getElementById('paymentsMonth').addEventListener('change', (e) => {
            this.selectedMonth = e.target.value;
        });
        document.getElementById('paymentsClass').addEventListener('change', (e) => {
            this.selectedClass = e.target.value;
        });
        document.getElementById('paymentsFilterForm').addEventListener('submit', (e) => {
            e.preventDefault();
            if (!this.selectedMonth || !this.selectedClass) {
                ui.showToast('يرجى اختيار الشهر والفصل', 'error');
                return;
            }
            this.loadPayments();
        });
        document.getElementById('savePaymentsBtn').addEventListener('click', () => this.savePayments());
        document.getElementById('exportPaymentsBtn').addEventListener('click', () => this.exportPayments());
    }

    loadPayments() {
        document.getElementById('noPaymentsSelection').style.display = 'none';
        document.getElementById('paymentsContainer').style.display = 'block';
        document.getElementById('paymentsSummary').style.display = 'grid';

        const classes = db.getData('classes');
        const cls = classes.find(c => c.id === this.selectedClass);
        document.getElementById('paymentsTableTitle').textContent =
            `لائحة الأداءات — ${cls ? cls.name : ''} — ${this.monthLabel(this.selectedMonth)}`;

        const students = db.getData('students').filter(s => s.classId === this.selectedClass);
        const existing = db.getData('payments').filter(p => p.month === this.selectedMonth && p.classId === this.selectedClass);
        const defaultAmount = Number(document.getElementById('paymentsDefaultAmount').value) || 0;

        const tbody = document.getElementById('paymentsTableBody');
        tbody.innerHTML = students.map((s, index) => {
            const record = existing.find(p => p.studentId === s.id);
            const amount = record ? record.amount : defaultAmount;
            const paid = record ? !!record.paid : false;
            const paidDate = record ? (record.paidDate || '') : '';
            const notes = record ? (record.notes || '') : '';
            return `
                <tr data-student-id="${s.id}">
                    <td>${index + 1}</td>
                    <td><strong>${s.fullName}</strong></td>
                    <td><input type="number" class="form-input" style="padding: 0.4rem 0.6rem;" min="0" step="1" value="${amount}" data-amount-for="${s.id}"></td>
                    <td style="text-align: center;"><input type="checkbox" data-paid-for="${s.id}" style="width: 1.15rem; height: 1.15rem;" ${paid ? 'checked' : ''}></td>
                    <td><input type="date" class="form-input" style="padding: 0.4rem 0.6rem;" value="${paidDate}" data-paiddate-for="${s.id}"></td>
                    <td><input type="text" class="form-input" style="padding: 0.4rem 0.6rem;" value="${notes}" data-notes-for="${s.id}"></td>
                </tr>
            `;
        }).join('');

        this.renderSummary(students, existing, defaultAmount);
    }

    renderSummary(students, existing, defaultAmount) {
        const total = students.length;
        let expected = 0, collected = 0, paidCount = 0;
        students.forEach(s => {
            const record = existing.find(p => p.studentId === s.id);
            const amount = record ? Number(record.amount) : defaultAmount;
            expected += amount;
            if (record && record.paid) {
                collected += amount;
                paidCount++;
            }
        });
        const remaining = expected - collected;

        document.getElementById('paymentsSummary').innerHTML = `
            <div class="stat-card">
                <div class="stat-icon blue">🧑‍🎓</div>
                <div class="stat-info">
                    <h3>عدد الطلبة</h3>
                    <div class="stat-value">${total}</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon green">✅</div>
                <div class="stat-info">
                    <h3>الذين أدّوا</h3>
                    <div class="stat-value">${paidCount} / ${total}</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon green">💰</div>
                <div class="stat-info">
                    <h3>المبلغ المحصَّل</h3>
                    <div class="stat-value">${ui.formatNumber(collected)} درهم</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon blue">⏳</div>
                <div class="stat-info">
                    <h3>المبلغ المتبقي</h3>
                    <div class="stat-value" style="color: ${remaining > 0 ? 'var(--danger-red)' : 'var(--success-green)'};">${ui.formatNumber(remaining)} درهم</div>
                </div>
            </div>
        `;
    }

    savePayments() {
        const students = db.getData('students').filter(s => s.classId === this.selectedClass);
        const newRecords = [];

        students.forEach(s => {
            const amountInput = document.querySelector(`input[data-amount-for="${s.id}"]`);
            const paidCheckbox = document.querySelector(`input[data-paid-for="${s.id}"]`);
            const paidDateInput = document.querySelector(`input[data-paiddate-for="${s.id}"]`);
            const notesInput = document.querySelector(`input[data-notes-for="${s.id}"]`);

            newRecords.push({
                id: Date.now().toString() + Math.random(),
                studentId: s.id,
                classId: this.selectedClass,
                month: this.selectedMonth,
                amount: Number(amountInput.value) || 0,
                paid: paidCheckbox.checked,
                paidDate: paidCheckbox.checked ? (paidDateInput.value || new Date().toISOString().split('T')[0]) : '',
                notes: notesInput.value.trim()
            });
        });

        const allPayments = db.getData('payments');
        const filtered = allPayments.filter(p => !(p.month === this.selectedMonth && p.classId === this.selectedClass));
        db.setData('payments', [...filtered, ...newRecords]);

        this.syncFinanceFromPayments(students, newRecords);

        ui.showToast('تم حفظ لائحة الأداءات بنجاح', 'success');
        this.loadPayments();
    }

    // يزامن كل أداء تمّ تفعيل خانة "أدّى" فيه كمدخول تلقائي في المالية،
    // ويحذف المدخول المرتبط إن أُلغي التفعيل لاحقاً
    syncFinanceFromPayments(students, records) {
        const finance = db.getData('finance');
        records.forEach(record => {
            const key = `payment:${record.studentId}:${record.month}`;
            const existing = finance.find(f => f.linkedPaymentKey === key);
            const student = students.find(s => s.id === record.studentId);

            if (record.paid) {
                const financeData = {
                    type: 'income',
                    category: 'أداءات الطلبة',
                    amount: record.amount,
                    description: `أداء الطالب ${student ? student.fullName : ''} — ${this.monthLabel(record.month)}`,
                    date: record.paidDate || new Date().toISOString().split('T')[0],
                    linkedPaymentKey: key,
                    autoGenerated: true
                };
                if (existing) {
                    db.updateItem('finance', existing.id, financeData);
                } else {
                    db.addItem('finance', financeData);
                }
            } else if (existing) {
                db.deleteItem('finance', existing.id);
            }
        });
    }

    monthLabel(month) {
        const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'ماي', 'يونيو', 'يوليوز', 'غشت', 'شتنبر', 'أكتوبر', 'نونبر', 'دجنبر'];
        const [year, m] = month.split('-').map(Number);
        return `${monthNames[m - 1]} ${year}`;
    }

    exportPayments() {
        const classes = db.getData('classes');
        const cls = classes.find(c => c.id === this.selectedClass);
        const students = db.getData('students').filter(s => s.classId === this.selectedClass);
        const existing = db.getData('payments').filter(p => p.month === this.selectedMonth && p.classId === this.selectedClass);
        const defaultAmount = Number(document.getElementById('paymentsDefaultAmount').value) || 0;

        if (students.length === 0) {
            ui.showToast('لا يوجد طلبة في هذا الفصل', 'error');
            return;
        }

        const headers = ['اسم الطالب', 'المبلغ', 'الحالة', 'تاريخ الأداء', 'ملاحظات'];
        let expected = 0, collected = 0;
        const rows = students.map(s => {
            const record = existing.find(p => p.studentId === s.id);
            const amount = record ? Number(record.amount) : defaultAmount;
            const paid = record ? !!record.paid : false;
            expected += amount;
            if (paid) collected += amount;
            return [
                s.fullName,
                `${ui.formatNumber(amount)} درهم`,
                paid ? 'أدّى ✓' : 'لم يؤدّ',
                (record && record.paidDate) ? record.paidDate : '-',
                (record && record.notes) ? record.notes : '-'
            ];
        });

        const summaryRow = [
            'المجموع', `${ui.formatNumber(expected)} درهم`,
            `محصَّل : ${ui.formatNumber(collected)} درهم`,
            `متبقي : ${ui.formatNumber(expected - collected)} درهم`, '-'
        ];

        const title = `لائحة أداءات الطلبة — ${cls ? cls.name : ''} — ${this.monthLabel(this.selectedMonth)}`;
        ui.printTable(title, headers, rows, summaryRow);
    }
}

window.paymentsManager = new PaymentsManager();
