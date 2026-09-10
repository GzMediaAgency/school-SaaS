// js/supabase-config.js
(function () {
    // ⚠️ REMPLACEZ par vos vraies clés (Dashboard Supabase → Project Settings → API)
    const SUPABASE_URL = 'https://qutxgwfqdeackpkqqhun.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1dHhnd2ZxZGVhY2twa3FxaHVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NzM2MjMsImV4cCI6MjEwNDU0OTYyM30.b7hZu7xPYb8_EGflkyj8wgNr0XAWuBRT6CKy8na2efQ';

    // Vérifier que le SDK CDN est bien chargé
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
        console.error('❌ SDK Supabase non chargé (CDN bloqué ou pas d\'internet).');
        return;
    }

    // Nom global unique, utilisé par toute l'application
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Supabase initialisé:', SUPABASE_URL);
})();