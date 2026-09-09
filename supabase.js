/* =========================================================
   supabase.js — подключение общей базы данных (Supabase)
   ---------------------------------------------------------
   ВАЖНО, ПРОЧИТАЙТЕ:

   1) URL берётся из Supabase → Settings → API → "Project URL".
      Это ГОЛЫЙ адрес проекта, БЕЗ "/rest/v1/" на конце —
      клиент сам допишет нужный путь.

   2) Ключ берётся оттуда же, строка "anon public".
      НИКОГДА не вставляйте сюда ключ "service_role" / "sb_secret_…":
      сайт публичный, и такой ключ даёт любому посетителю полный
      доступ к базе в обход всех политик безопасности.
      Ключ "anon public" публиковать безопасно — он работает
      только в рамках RLS-политик из supabase-schema.sql.

   3) Пока ключ не вставлен, сайт работает в локальном режиме:
      расписание, конспекты и настройки хранятся в браузере,
      общие ДЗ и щитпост недоступны. Ничего не ломается.
   ========================================================= */

const SUPABASE_URL = 'https://fcnpuwmcbmzsgvjrsphd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjbnB1d21jYm16c2d2anJzcGhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2OTkwMjQsImV4cCI6MjEwNDI3NTAyNH0.irOBj7ZZqxQ2hruBQ6ekMQUOh7BWMAVZtAb_MuIXKqY';

window.APP_SUPABASE = (function () {
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
    if (SUPABASE_ANON_KEY.indexOf('ВСТАВЬТЕ') === 0) {
      console.info('[Supabase] anon-ключ не задан — работаем в локальном режиме.');
      return null;
    }
    if (SUPABASE_ANON_KEY.indexOf('sb_secret') === 0 || SUPABASE_ANON_KEY.indexOf('service_role') !== -1) {
      console.error('[Supabase] В supabase.js вставлен СЕКРЕТНЫЙ ключ. Отключаю подключение. ' +
                    'Отзовите этот ключ в панели Supabase и вставьте "anon public".');
      return null;
    }
    if (typeof supabase === 'undefined' || typeof supabase.createClient !== 'function') {
      console.warn('[Supabase] Библиотека не загрузилась — локальный режим.');
      return null;
    }
    return supabase.createClient(SUPABASE_URL.replace(/\/+$/, ''), SUPABASE_ANON_KEY);
  } catch (e) {
    console.warn('[Supabase] Не удалось инициализировать клиент:', e);
    return null;
  }
})();