// js/supabase-client.js
// ⚠️ عدّل هذين السطرين فقط : الصقهما من Supabase → Project Settings → API
const SUPABASE_URL = 'https://ivvkctufszixwijgcssr.supabase.co ';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2dmtjdHVmc3ppeHdpamdjc3NyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3Njc5MTYsImV4cCI6MjEwNTM0MzkxNn0.gt1grg5kGKrKlDRlaMyK-bsARW53PgqR74N4ZDPYA6k';

if (typeof window.supabase === 'undefined') {
    console.error('مكتبة Supabase لم تُحمَّل. تحقق من رابط CDN في ملف HTML.');
}

// عميل Supabase العام المستعمل في كل صفحات التطبيق
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true
    }
});
