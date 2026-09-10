// js/realm-db.js
class RealmDB {
constructor() {
this.dbName = 'training_institution_db';
this.ready = this.initializeDB();
}
initializeDB() {
     if (!localStorage.getItem(this.dbName)) {
         const initialData = {
             users: [
                 {
                     id: '1',
                     username: 'admin',
                     passwordHash: null, // hash réel calculé de façon asynchrone ci-dessous
                     role: 'admin',
                     fullName: 'مدير النظام'
                 }
             ],
             students: this.generateSeedStudents(),
             teachers: this.generateSeedTeachers(),
             classes: this.generateSeedClasses(),
             subjects: this.generateSeedSubjects(),
             schedules: [],
             attendance: [],
             grades: [],
             finance: this.generateSeedFinance(),
             settings: {
                 schoolName: 'المؤسسة التكوينية',
                 schoolLogo: null // Chaîne base64 (data URL) du logo/en-tête téléversé par l'établissement
             }
         };
         localStorage.setItem(this.dbName, JSON.stringify(initialData));
         // Le hachage SHA-256 est asynchrone (Web Crypto API) ; on met à jour
         // le mot de passe admin dès qu'il est prêt, sans bloquer le reste de l'app.
         return this.hashPassword('admin').then(hash => {
             this.updateItem('users', '1', { passwordHash: hash });
         });
     }
     // Migration : une installation déjà existante (localStorage rempli avant l'ajout
     // de la collection "settings") n'a pas encore cette clé — on l'ajoute sans y toucher.
     const existing = JSON.parse(localStorage.getItem(this.dbName));
     if (!existing.settings) {
         existing.settings = { schoolName: 'المؤسسة التكوينية', schoolLogo: null };
         localStorage.setItem(this.dbName, JSON.stringify(existing));
     }
     return Promise.resolve();
 }
 getSettings() {
     const db = JSON.parse(localStorage.getItem(this.dbName));
     return (db && db.settings) ? db.settings : { schoolName: 'المؤسسة التكوينية', schoolLogo: null };
 }
 updateSettings(updates) {
     const db = JSON.parse(localStorage.getItem(this.dbName));
     db.settings = { ...(db.settings || {}), ...updates };
     localStorage.setItem(this.dbName, JSON.stringify(db));
     return db.settings;
 }
 generateSalt() {
     const bytes = new Uint8Array(16);
     crypto.getRandomValues(bytes);
     return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
 }
 async hashPassword(password, existingSalt = null) {
     const salt = existingSalt || this.generateSalt();
     const encoder = new TextEncoder();
     const data = encoder.encode(salt + password);
     const hashBuffer = await crypto.subtle.digest('SHA-256', data);
     const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
     return `${salt}:${hashHex}`;
 }
 async verifyPassword(password, storedHash) {
     if (!storedHash || !storedHash.includes(':')) return false;
     const [salt] = storedHash.split(':');
     const computed = await this.hashPassword(password, salt);
     return computed === storedHash;
 }
 getData(collection) {
     const db = JSON.parse(localStorage.getItem(this.dbName));
     return db[collection] || [];
 }
 setData(collection, data) {
     const db = JSON.parse(localStorage.getItem(this.dbName));
     db[collection] = data;
     localStorage.setItem(this.dbName, JSON.stringify(db));
 }
 addItem(collection, item) {
     const data = this.getData(collection);
     item.id = Date.now().toString();
     data.push(item);
     this.setData(collection, data);
     return item;
 }
 updateItem(collection, id, updates) {
     const data = this.getData(collection);
     const index = data.findIndex(item => item.id === id);
     if (index !== -1) {
         data[index] = { ...data[index], ...updates };
         this.setData(collection, data);
         return data[index];
     }
     return null;
 }
 deleteItem(collection, id) {
     const data = this.getData(collection);
     const filtered = data.filter(item => item.id !== id);
     this.setData(collection, filtered);
 }
 findItem(collection, predicate) {
     const data = this.getData(collection);
     return data.find(predicate);
 }
 filterItems(collection, predicate) {
     const data = this.getData(collection);
     return data.filter(predicate);
 }
 generateSeedStudents() {
     const names = ['أحمد محمد', 'فاطمة علي', 'يوسف حسن', 'مريم خالد', 'عمر سعيد', 'نورة عبدالله'];
     return names.map((name, index) => ({
         id: (index + 1).toString(),
         fullName: name,
         phone: `066${Math.floor(1000000 + Math.random() * 9000000)}`,
         email: `${name.split(' ')[0].toLowerCase()}@example.com`,
         parentName: 'ولي الأمر',
         parentPhone: `066${Math.floor(1000000 + Math.random() * 9000000)}`,
         classId: ((index % 3) + 1).toString(),
         enrollmentDate: new Date().toISOString().split('T')[0],
         status: 'active'
     }));
 }
 generateSeedTeachers() {
     const teachers = [
         { name: 'د. محمد العلي', specialty: 'الرياضيات', subjects: ['1', '2'] },
         { name: 'أ. سارة الأحمد', specialty: 'الفيزياء', subjects: ['3'] },
         { name: 'د. خالد المنصور', specialty: 'الكيمياء', subjects: ['4'] }
     ];
     return teachers.map((teacher, index) => ({
         id: (index + 1).toString(),
         fullName: teacher.name,
         phone: `066${Math.floor(1000000 + Math.random() * 9000000)}`,
         email: `${teacher.name.split(' ')[1]}@example.com`,
         specialties: teacher.specialty,
         subjects: teacher.subjects,
         salary: 5000 + (index * 500)
     }));
 }
 generateSeedClasses() {
     return [
         { id: '1', name: 'الفصل أ - رياضيات', capacity: 30, teacherId: '1', subject: '1' },
         { id: '2', name: 'الفصل ب - فيزياء', capacity: 25, teacherId: '2', subject: '3' },
         { id: '3', name: 'الفصل ج - كيمياء', capacity: 28, teacherId: '3', subject: '4' }
     ];
 }
 generateSeedSubjects() {
     return [
         { id: '1', name: 'الرياضيات', coefficient: 4 },
         { id: '2', name: 'الجبر', coefficient: 3 },
         { id: '3', name: 'الفيزياء', coefficient: 3 },
         { id: '4', name: 'الكيمياء', coefficient: 3 }
     ];
 }
 generateSeedFinance() {
     const now = new Date();
     const currentMonth = now.getMonth();
     const currentYear = now.getFullYear();
     return [
         {
             id: '1',
             type: 'income',
             category: 'رسوم دراسية',
             amount: 15000,
             date: new Date(currentYear, currentMonth, 1).toISOString().split('T')[0],
             description: 'رسوم الفصل الأول'
         },
         {
             id: '2',
             type: 'expense',
             category: 'رواتب',
             amount: 18000,
             date: new Date(currentYear, currentMonth, 5).toISOString().split('T')[0],
             description: 'رواتب الأساتذة'
         },
         {
             id: '3',
             type: 'income',
             category: 'رسوم امتحانات',
             amount: 3000,
             date: new Date(currentYear, currentMonth, 10).toISOString().split('T')[0],
             description: 'رسوم الامتحان النهائي'
         }
     ];
 }
 getStatistics() {
     const students = this.getData('students');
     const teachers = this.getData('teachers');
     const finance = this.getData('finance');
     const attendance = this.getData('attendance');
     const currentMonth = new Date().getMonth();
     const currentYear = new Date().getFullYear();
     const monthlyIncome = finance
         .filter(f => {
             const date = new Date(f.date);
             return f.type === 'income' && 
                    date.getMonth() === currentMonth && 
                    date.getFullYear() === currentYear;
         })
         .reduce((sum, f) => sum + f.amount, 0);
     const presentCount = attendance.filter(a => a.status === 'present').length;
     const totalAttendance = attendance.length;
     const attendanceRate = totalAttendance > 0 ? (presentCount / totalAttendance) * 100 : 0;
     return {
         totalStudents: students.length,
         totalTeachers: teachers.length,
         monthlyIncome: monthlyIncome,
         attendanceRate: Math.round(attendanceRate)
     };
 }
}
const db = new RealmDB();