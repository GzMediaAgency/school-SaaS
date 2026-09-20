-- ============================================================================
-- مخطط قاعدة البيانات Supabase — نظام إدارة المؤسسة التكوينية (SaaS متعدد العملاء)
-- ============================================================================
-- كيفية الاستعمال :
-- 1) أنشئ مشروعاً على https://supabase.com (مجاني للبداية)
-- 2) افتح SQL Editor داخل المشروع، الصق هذا الملف بالكامل، ثم اضغط Run
-- 3) من Project Settings → API انسخ Project URL و anon public key
--    وضعهما في js/supabase-client.js
-- 4) من Authentication → Providers تأكد أن Email مفعّل
--    (يُستحسن تعطيل "Confirm email" أثناء الاختبار لتفعيل الحساب فوراً)
-- ============================================================================

create extension if not exists "pgcrypto"; -- لتوليد uuid عبر gen_random_uuid()

-- ---------------------------------------------------------------------------
-- جدول الإعدادات : صف واحد لكل عميل (مؤسسة) + حالة الاشتراك
-- ---------------------------------------------------------------------------
create table if not exists public.settings (
    user_id      uuid primary key references auth.users(id) on delete cascade,
    school_name  text not null default 'المؤسسة التكوينية',
    school_logo  text,                          -- صورة Base64 (data URL)
    email        text,                          -- بريد العميل (لعرضه في لوحة المتابعة)
    is_admin     boolean not null default false, -- true فقط لحسابك أنت (صاحب المنصة)
    plan         text not null default 'trial', -- 'trial' | 'full'
    trial_start  timestamptz not null default now(),
    activated_at timestamptz,
    expires_at   timestamptz,
    license_key  text,
    created_at   timestamptz not null default now()
);

-- إن كان الجدول موجوداً من قبل (تشغيل سابق لهذا الملف) نضيف العمودين الناقصين فقط
alter table public.settings add column if not exists email text;
alter table public.settings add column if not exists is_admin boolean not null default false;

-- ---------------------------------------------------------------------------
-- الجداول التشغيلية : بنية عامة موحّدة (id, user_id, data JSONB)
-- كل حقول العنصر (فقط كما تستعملها الواجهة : fullName, phone, classId...)
-- تُخزَّن كما هي داخل data، فلا حاجة لتحديث المخطط كلما أضيف حقل جديد في JS.
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
    foreach t in array array['students','teachers','subjects','classes','schedules','attendance','grades','finance','payments']
    loop
        execute format($f$
            create table if not exists public.%I (
                id         text primary key default gen_random_uuid()::text,
                user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
                data       jsonb not null default '{}'::jsonb,
                created_at timestamptz not null default now()
            )
        $f$, t);
    end loop;
end $$;

-- ---------------------------------------------------------------------------
-- تفعيل RLS (عزل بيانات كل عميل) على كل جدول
-- ---------------------------------------------------------------------------
alter table public.settings enable row level security;

do $$
declare t text;
begin
    foreach t in array array['students','teachers','subjects','classes','schedules','attendance','grades','finance','payments']
    loop
        execute format('alter table public.%I enable row level security', t);
        execute format('drop policy if exists "owner_all" on public.%I', t);
        execute format(
            'create policy "owner_all" on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)',
            t
        );
    end loop;
end $$;

-- ---------------------------------------------------------------------------
-- دالة تتحقق هل المستخدم الحالي "أدمن" (صاحب المنصة) — تتجاوز RLS داخلياً
-- لتفادي التكرار اللانهائي عند استعمالها داخل سياسة نفس الجدول
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
    select coalesce((select is_admin from public.settings where user_id = auth.uid()), false);
$$;

drop policy if exists "owner_all" on public.settings;
create policy "owner_all" on public.settings
    for all
    using (auth.uid() = user_id or public.is_admin())
    with check (auth.uid() = user_id or public.is_admin());

-- ---------------------------------------------------------------------------
-- عند تسجيل عميل جديد (auth.users) : إنشاء صف إعدادات تلقائياً + بدء فترة تجريبية
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
    insert into public.settings (user_id, school_name, email, plan, trial_start)
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'school_name', 'المؤسسة التكوينية'),
        new.email,
        'trial',
        now()
    )
    on conflict (user_id) do nothing;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- ⚠️ خطوة يدوية لمرة واحدة : اجعل حسابك أنت (صاحب المنصة) أدمن حتى تصل
-- لوحة متابعة العملاء (admin-panel.html). نفّذ هذا السطر بعد إنشاء حسابك
-- الخاص عبر index.html، وضع بريدك الإلكتروني الحقيقي مكان البريد أدناه :
-- ---------------------------------------------------------------------------
-- update public.settings set is_admin = true
-- where user_id = (select id from auth.users where email = 'you@example.com');
