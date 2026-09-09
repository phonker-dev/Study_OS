-- =========================================================
--  Study OS — схема общей базы для GitHub Pages
--  Выполните этот файл целиком в Supabase → SQL Editor → New query → Run
-- =========================================================
--
--  Логика прав доступа:
--    · читать (SELECT) может кто угодно с anon-ключом — то есть любой
--      одногруппник, открывший сайт;
--    · писать (INSERT/UPDATE/DELETE) может только вошедший пользователь
--      (роль authenticated) — то есть вы, после ввода пароля в админке.
--  Поэтому anon-ключ безопасно держать в публичном репозитории:
--  без входа им нельзя ничего изменить.
-- =========================================================


-- ---------------------------------------------------------
-- 1. Расписание: одна строка (id = 1) с целым JSON-объектом
-- ---------------------------------------------------------
create table if not exists public.schedule (
  id          integer primary key,
  data        jsonb       not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

alter table public.schedule enable row level security;

drop policy if exists "schedule read for everyone"  on public.schedule;
drop policy if exists "schedule write for admin"    on public.schedule;

create policy "schedule read for everyone"
  on public.schedule for select
  to anon, authenticated
  using (true);

create policy "schedule write for admin"
  on public.schedule for all
  to authenticated
  using (true) with check (true);


-- ---------------------------------------------------------
-- 2. Домашние задания: по одной строке на день недели
-- ---------------------------------------------------------
create table if not exists public.day_notes (
  day_key     text primary key
              check (day_key in ('mon','tue','wed','thu','fri','sat','sun')),
  note_text   text        not null default '',
  updated_at  timestamptz not null default now()
);

alter table public.day_notes enable row level security;

drop policy if exists "day_notes read for everyone" on public.day_notes;
drop policy if exists "day_notes write for admin"   on public.day_notes;

create policy "day_notes read for everyone"
  on public.day_notes for select
  to anon, authenticated
  using (true);

create policy "day_notes write for admin"
  on public.day_notes for all
  to authenticated
  using (true) with check (true);


-- ---------------------------------------------------------
-- 3. Щитпост: список картинок
-- ---------------------------------------------------------
create table if not exists public.memes (
  id          uuid primary key default gen_random_uuid(),
  url         text        not null,
  caption     text        not null default '',
  created_at  timestamptz not null default now()
);

create index if not exists memes_created_at_idx on public.memes (created_at desc);

alter table public.memes enable row level security;

drop policy if exists "memes read for everyone" on public.memes;
drop policy if exists "memes write for admin"   on public.memes;

create policy "memes read for everyone"
  on public.memes for select
  to anon, authenticated
  using (true);

create policy "memes write for admin"
  on public.memes for all
  to authenticated
  using (true) with check (true);


-- ---------------------------------------------------------
-- 4. Хранилище файлов для мемов (Supabase Storage)
--    Бакет публичный на чтение, загрузка — только авторизованным.
-- ---------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('memes', 'memes', true)
on conflict (id) do update set public = true;

drop policy if exists "memes files public read"   on storage.objects;
drop policy if exists "memes files admin write"   on storage.objects;
drop policy if exists "memes files admin delete"  on storage.objects;

create policy "memes files public read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'memes');

create policy "memes files admin write"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'memes');

create policy "memes files admin delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'memes');


-- ---------------------------------------------------------
-- 4b. Посещаемость (электронный журнал старосты)
--     Один ряд = одна пара в конкретный день. present — jsonb-массив
--     ФИО присутствовавших. В ОТЛИЧИЕ от остальных таблиц читать это
--     могут ТОЛЬКО authenticated (вошедший в админку староста) —
--     обычным посетителям сайта эти данные не видны вообще.
-- ---------------------------------------------------------
create table if not exists public.attendance (
  lesson_id   text        not null,
  lesson_date date        not null,
  present     jsonb       not null default '[]'::jsonb,
  updated_at  timestamptz not null default now(),
  primary key (lesson_id, lesson_date)
);

alter table public.attendance enable row level security;

drop policy if exists "attendance admin only" on public.attendance;

create policy "attendance admin only"
  on public.attendance for all
  to authenticated
  using (true) with check (true);


-- ---------------------------------------------------------
-- 5. Стартовые данные (пустые заметки на все учебные дни)
-- ---------------------------------------------------------
insert into public.day_notes (day_key, note_text)
values ('mon',''), ('tue',''), ('wed',''), ('thu',''), ('fri',''), ('sat','')
on conflict (day_key) do nothing;

-- Пустая строка расписания, чтобы upsert из админки всегда находил id = 1
insert into public.schedule (id, data)
values (1, '{}'::jsonb)
on conflict (id) do nothing;