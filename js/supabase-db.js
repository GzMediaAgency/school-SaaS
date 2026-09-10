// js/supabase-db.js
// Wrapper Supabase qui imite l'API de realm-db.js

class SupabaseDB {
    constructor() {
        this.currentUser = null;
        this.userId = null;
    }

    // Récupérer l'ID utilisateur connecté
    getUserId() {
        if (this.userId) return this.userId;
        const user = sessionStorage.getItem('currentUser');
        if (user) {
            const userData = JSON.parse(user);
            this.userId = userData.uid || userData.id;
            return this.userId;
        }
        return null;
    }

    // ========== API COMPATIBLE avec realm-db.js ==========

    async getData(collection) {
        const userId = this.getUserId();
        if (!userId) return [];

        try {
            const { data, error } = await supabaseClient
                .from(collection)
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error(`Error fetching ${collection}:`, error);
                return [];
            }
            return data || [];
        } catch (err) {
            console.error(err);
            return [];
        }
    }

    async setData(collection, data) {
        const userId = this.getUserId();
        if (!userId) return;

        try {
            // Supprimer les anciennes données
            await supabaseClient
                .from(collection)
                .delete()
                .eq('user_id', userId);

            // Insérer les nouvelles
            if (data.length > 0) {
                const { error } = await supabaseClient
                    .from(collection)
                    .insert(data.map(item => ({ ...item, user_id: userId })));

                if (error) console.error(`Error setting ${collection}:`, error);
            }
        } catch (err) {
            console.error(err);
        }
    }

    async addItem(collection, item) {
        const userId = this.getUserId();
        if (!userId) return null;

        try {
            const newItem = { ...item, user_id: userId };
            const { data, error } = await supabaseClient
                .from(collection)
                .insert([newItem])
                .select()
                .single();

            if (error) {
                console.error(`Error adding to ${collection}:`, error);
                return null;
            }
            return data;
        } catch (err) {
            console.error(err);
            return null;
        }
    }

    async updateItem(collection, id, updates) {
        const userId = this.getUserId();
        if (!userId) return null;

        try {
            const { data, error } = await supabaseClient
                .from(collection)
                .update({ ...updates, user_id: userId })
                .eq('id', id)
                .eq('user_id', userId)
                .select()
                .single();

            if (error) {
                console.error(`Error updating ${collection}:`, error);
                return null;
            }
            return data;
        } catch (err) {
            console.error(err);
            return null;
        }
    }

    async deleteItem(collection, id) {
        const userId = this.getUserId();
        if (!userId) return;

        try {
            const { error } = await supabaseClient
                .from(collection)
                .delete()
                .eq('id', id)
                .eq('user_id', userId);

            if (error) console.error(`Error deleting from ${collection}:`, error);
        } catch (err) {
            console.error(err);
        }
    }

    async findItem(collection, predicate) {
        const data = await this.getData(collection);
        return data.find(predicate);
    }

    async filterItems(collection, predicate) {
        const data = await this.getData(collection);
        return data.filter(predicate);
    }

    // ========== AUTHENTIFICATION ==========

    async signup(userData) {
        try {
            const { data: authData, error: authError } = await supabaseClient.auth.signUp({
                email: userData.email,
                password: userData.password,
                options: {
                    data: {
                        full_name: userData.fullName,
                        org_name: userData.orgName
                    }
                }
            });

            if (authError) throw authError;

            const userId = authData.user.id;

            // Créer l'abonnement démo
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + 15);

            await supabaseClient
                .from('subscriptions')
                .insert([{
                    user_id: userId,
                    plan: 'demo',
                    status: 'active',
                    start_date: new Date().toISOString(),
                    end_date: endDate.toISOString(),
                    is_demo: true
                }]);

            // Mettre à jour le profil
            await supabaseClient
                .from('profiles')
                .update({
                    org_name: userData.orgName,
                    full_name: userData.fullName,
                    phone: userData.phone || ''
                })
                .eq('id', userId);

            return { success: true, userId: userId };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async login(email, password) {
        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) throw error;

            // Récupérer le profil
            const { data: profile } = await supabaseClient
                .from('profiles')
                .select('*')
                .eq('id', data.user.id)
                .single();

            // Récupérer l'abonnement
            const { data: subscription } = await supabaseClient
                .from('subscriptions')
                .select('*')
                .eq('user_id', data.user.id)
                .single();

            // Vérifier l'abonnement
            if (subscription && new Date(subscription.end_date) < new Date() && subscription.status === 'active') {
                await supabaseClient
                    .from('subscriptions')
                    .update({ status: 'suspended' })
                    .eq('user_id', data.user.id);
                await supabaseClient.auth.signOut();
                return { success: false, error: 'subscription_expired' };
            }

            if (subscription && subscription.status === 'suspended') {
                await supabaseClient.auth.signOut();
                return { success: false, error: 'subscription_suspended' };
            }

            // Stocker en session
            this.userId = data.user.id;
            sessionStorage.setItem('currentUser', JSON.stringify({
                uid: data.user.id,
                ...profile,
                subscription: subscription
            }));

            return { success: true, user: profile };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async logout() {
        await supabaseClient.auth.signOut();
        sessionStorage.removeItem('currentUser');
        this.userId = null;
    }

    // ========== STATISTIQUES ==========

    async getStatistics() {
        const students = await this.getData('students');
        const teachers = await this.getData('teachers');
        const finance = await this.getData('finance');
        const attendance = await this.getData('attendance');

        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        const monthlyIncome = finance
            .filter(f => {
                const date = new Date(f.date);
                return f.type === 'income' &&
                    date.getMonth() === currentMonth &&
                    date.getFullYear() === currentYear;
            })
            .reduce((sum, f) => sum + parseFloat(f.amount || 0), 0);

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

    // Données seed pour nouveaux utilisateurs
    async generateSeedData(userId) {
        const classes = [
            { user_id: userId, name: 'الفصل أ - رياضيات', capacity: 30, teacher_id: null, subject: null },
            { user_id: userId, name: 'الفصل ب - فيزياء', capacity: 25, teacher_id: null, subject: null },
            { user_id: userId, name: 'الفصل ج - كيمياء', capacity: 28, teacher_id: null, subject: null }
        ];

        const subjects = [
            { user_id: userId, name: 'الرياضيات', coefficient: 4 },
            { user_id: userId, name: 'الجبر', coefficient: 3 },
            { user_id: userId, name: 'الفيزياء', coefficient: 3 },
            { user_id: userId, name: 'الكيمياء', coefficient: 3 }
        ];

        const { error: classesError } = await supabaseClient.from('classes').insert(classes);
        const { error: subjectsError } = await supabaseClient.from('subjects').insert(subjects);

        if (classesError) console.error('Error seeding classes:', classesError);
        if (subjectsError) console.error('Error seeding subjects:', subjectsError);
    }
}

// Créer l'instance globale (remplace 'db' de realm-db.js)
const db = new SupabaseDB();