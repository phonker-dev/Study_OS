'use strict';
/* =========================================================
   Study OS — app.js
   Расписание, конспекты, погода, щитпост и админка
   в интерфейсе Windows XP.
   ========================================================= */

/* ---------------------------------------------------------
   1. Конфигурация
   --------------------------------------------------------- */
const TOMTOM_API_KEY = 'yL8umJnxsyxwO78ZaeqM7g8PmtdVUaWm';
const ADMIN_PASSWORD = 'penis';
/* Технический аккаунт админа в Supabase Auth. Создайте пользователя
   с этим e-mail и паролем ADMIN_PASSWORD (см. SETUP.md). */
const ADMIN_EMAIL = 'admin@study-os.local';

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DAY_LABELS = { mon: 'Понедельник', tue: 'Вторник', wed: 'Среда', thu: 'Четверг', fri: 'Пятница', sat: 'Суббота', sun: 'Воскресенье' };
const MONTH_NAMES = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
const SCHOOL_DAY_KEYS = ['mon','tue','wed','thu','fri','sat'];

/* Список группы для журнала посещаемости — виден и редактируется только старостой (админом) */
const GROUP_STUDENTS = [
  'Анисимова Алёна Николаевна', 'Березикова Виктория Сергеевна', 'Блинов Артем',
  'Боженков Никита Андреевич', 'Валеева Валерия Константиновна', 'Вьюкова Александра Сергеевна',
  'Гаврилова Ксения Николаевна', 'Ильина Милена Владимировна', 'Колосова Евгения Сергеевна',
  'Колядин Сергей Дмитриевич', 'Кочуров Алексей Витальевич', 'Кузьмин Егор Алексеевич',
  'Мироненко Артём Андреевич', 'Морозова Анастасия Андреевна', 'Натальина Елизавета Артёмовна',
  'Николаева Маргарита Евгеньевна', 'Подгорнова Вероника Александровна', 'Позднякова Валерия Валерьевна',
  'Рыжов Тимофей Евгеньевич', 'Самсон Карина Александровна', 'Семенов Денис Максимович',
  'Синицина Владислава Игоревна', 'Ткач Дмитрий Александрович', 'Черноиванова Арина Ивановна',
  'Шишкин Иван Владимирович', 'Щапова Алина Викторовна', 'Ющук Юлия Юрьевна'
];

const LS_KEYS = {
  schedule: 'rxp_schedule',
  notes: 'rxp_notes',
  settings: 'rxp_settings',
  dayNotes: 'rxp_day_notes',
  memes: 'rxp_memes',
  attendance: 'rxp_attendance',
  calendarPeriods: 'rxp_calendar_periods'
};

/* Периоды учебного года — показываются цветными «овалами» на датах
   во всплывающем календаре. Это стартовые данные «на всякий случай»:
   если Supabase не подключён или таблица calendar_periods ещё пуста,
   календарь всё равно покажет актуальный график. Как только админ
   один раз откроет Supabase-версию (см. supabase-schema.sql, там те
   же данные заранее вставлены), сайт станет читать их оттуда. */
const DEFAULT_PERIODS = [
  { label: 'Теоретическое обучение', color: '#3a93ff', start: '2026-09-01', end: '2026-12-21' },
  { label: 'Сессия',                 color: '#c0392b', start: '2026-12-22', end: '2026-12-28' },
  { label: 'Каникулы',               color: '#e0a636', start: '2026-12-29', end: '2027-01-11' },
  { label: 'Теоретическое обучение', color: '#3a93ff', start: '2027-02-12', end: '2027-05-17' },
  { label: 'Производственная практика', color: '#3fa64a', start: '2027-05-18', end: '2027-06-14' },
  { label: 'Сессия',                 color: '#c0392b', start: '2027-06-15', end: '2027-06-28' },
  { label: 'Каникулы',               color: '#e0a636', start: '2027-06-29', end: '2027-08-31' }
];

const PERIOD_COLOR_PRESETS = [
  { name: 'Синий (обучение)',  value: '#3a93ff' },
  { name: 'Красный (сессия)',  value: '#c0392b' },
  { name: 'Оранжевый (каникулы)', value: '#e0a636' },
  { name: 'Зелёный (практика)', value: '#3fa64a' },
  { name: 'Фиолетовый',        value: '#8e5bd8' },
  { name: 'Розовый',           value: '#e0559e' }
];

const APP_WINDOW_IDS = {
  schedule: 'window-schedule',
  'lesson-form': 'window-lesson-form',
  notes: 'window-notes',
  weather: 'window-weather',
  settings: 'window-settings',
  shitpost: 'window-shitpost',
  admin: 'window-admin',
  attendance: 'window-attendance'
};
const APP_TITLES = {
  schedule: 'Расписание', 'lesson-form': 'Пара', notes: 'Конспекты',
  weather: 'Погода и пробки', settings: 'Панель управления',
  shitpost: 'Щитпост', admin: 'Админ-панель', attendance: 'Журнал посещаемости'
};
const APP_ICONS = {
  schedule: 'PNG/Raspisanie.svg', 'lesson-form': 'PNG/Raspisanie.svg',
  notes: 'PNG/Conspect.svg', weather: 'PNG/Weather.svg',
  settings: 'PNG/Settings.png', shitpost: 'PNG/Shitpost.png',
  admin: 'PNG/Settings.png', attendance: 'PNG/Settings.png'
};

/* ---------------------------------------------------------
   2. Утилиты
   --------------------------------------------------------- */
function $(id){ return document.getElementById(id); }
function pad2(n){ return String(n).padStart(2, '0'); }
function formatTime24(date){ return pad2(date.getHours()) + ':' + pad2(date.getMinutes()); }
function formatDateFull(date){ return date.getDate() + ' ' + MONTH_NAMES[date.getMonth()]; }
function formatIsoDate(date){ return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate()); }
function escapeHtml(str){
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function uid(prefix){ return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7); }
function isMobile(){ return window.matchMedia('(max-width: 780px)').matches; }

/* Номер ISO-недели — по нему считается чётность */
function getISOWeekNumber(date){
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;          // Пн = 1 … Вс = 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);  // четверг этой недели
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}
function getParityForDate(date){ return getISOWeekNumber(date) % 2 === 0 ? 'even' : 'odd'; }
function dayKeyForDate(date){ return DAY_KEYS[date.getDay()]; }

/* «Сейчас» в часовом поясе выбранного города, а не устройства */
function getZonedNow(timeZone){
  if (!timeZone) return new Date();
  try {
    const parts = {};
    new Intl.DateTimeFormat('en-US', {
      timeZone, hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).formatToParts(new Date()).forEach(function(p){ if (p.type !== 'literal') parts[p.type] = p.value; });
    let hour = parseInt(parts.hour, 10);
    if (hour === 24) hour = 0;
    return new Date(+parts.year, +parts.month - 1, +parts.day, hour, +parts.minute, +parts.second);
  } catch(e){
    return new Date(); // некорректный пояс — падаем на системное время
  }
}
function now(){ return getZonedNow(State.settings.timezone); }

/* ---------------------------------------------------------
   3. LocalStorage
   --------------------------------------------------------- */
const Store = {
  save(key, value){
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch(e){ console.warn('Не удалось сохранить', key, e); return false; }
  },
  load(key, fallback){
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch(e){ return fallback; }
  },
  remove(key){ try { localStorage.removeItem(key); } catch(e){} }
};

function emptySchedule(){
  const mk = function(){ return SCHOOL_DAY_KEYS.reduce(function(acc, k){ acc[k] = []; return acc; }, {}); };
  return { even: mk(), odd: mk() };
}
function normalizeSchedule(raw){
  const base = emptySchedule();
  if (!raw || typeof raw !== 'object') return base;
  ['even','odd'].forEach(function(parity){
    const src = raw[parity];
    if (!src || typeof src !== 'object') return;
    SCHOOL_DAY_KEYS.forEach(function(day){
      if (Array.isArray(src[day])){
        base[parity][day] = src[day]
          .filter(function(l){ return l && l.subject; })
          .map(function(l){
            return {
              id: l.id || uid('lesson'),
              start: l.start || '09:00', end: l.end || '10:30',
              type: l.type === 'lecture' ? 'lecture' : 'seminar',
              subject: String(l.subject), room: l.room || '', teacher: l.teacher || '',
              note: l.note || '',      // ДЗ / заметка к конкретной паре
              due: l.due || ''         // дата сдачи ДЗ, необязательно (YYYY-MM-DD)
            };
          });
      }
    });
  });
  return base;
}

/* ---------------------------------------------------------
   4. Состояние
   --------------------------------------------------------- */
const State = {
  schedule: emptySchedule(),
  notes: [],
  settings: {
    city: '', timezone: '',
    homeLat: '', homeLon: '', homeAddress: '',
    studyLat: '', studyLon: '', studyAddress: ''
  },
  widgetOffsetDays: 0,
  scheduleActiveParity: 'even',
  selectedNoteId: null,
  zCounter: 100,
  openApps: new Set(),
  dayNotes: {},   // { mon: 'текст ДЗ', … } — общие для всех
  calendarPeriods: [], // [{ label, color, start, end }] — сессии/каникулы/практика
  memes: [],      // [{ id, url, caption }]
  isAdmin: false,
  weather: null
};

/* ---------------------------------------------------------
   5. Слой общей базы (Supabase).
      Всё опционально: нет ключа — сайт работает локально.
   --------------------------------------------------------- */
const DB = {
  get client(){ return window.APP_SUPABASE || null; },
  get ready(){ return !!window.APP_SUPABASE; },

  async loadSchedule(){
    if (!this.ready) return null;
    const res = await this.client.from('schedule').select('data').eq('id', 1).maybeSingle();
    if (res.error) throw res.error;
    return res.data ? res.data.data : null;
  },
  async saveSchedule(schedule){
    if (!this.ready) return false;
    const res = await this.client.from('schedule')
      .upsert({ id: 1, data: schedule, updated_at: new Date().toISOString() });
    if (res.error) throw res.error;
    return true;
  },

  async loadDayNotes(){
    if (!this.ready) return null;
    const res = await this.client.from('day_notes').select('day_key, note_text');
    if (res.error) throw res.error;
    const out = {};
    (res.data || []).forEach(function(r){ out[r.day_key] = r.note_text || ''; });
    return out;
  },
  async saveDayNote(dayKey, text){
    if (!this.ready) return false;
    const res = await this.client.from('day_notes')
      .upsert({ day_key: dayKey, note_text: text, updated_at: new Date().toISOString() },
              { onConflict: 'day_key' });
    if (res.error) throw res.error;
    return true;
  },

  async loadMemes(){
    if (!this.ready) return null;
    const res = await this.client.from('memes')
      .select('id, url, caption').order('created_at', { ascending: false });
    if (res.error) throw res.error;
    return res.data || [];
  },
  async addMeme(url, caption){
    if (!this.ready) return null;
    const res = await this.client.from('memes')
      .insert([{ url: url, caption: caption || '' }]).select().single();
    if (res.error) throw res.error;
    return res.data;
  },
  async deleteMeme(id){
    if (!this.ready) return false;
    const res = await this.client.from('memes').delete().eq('id', id);
    if (res.error) throw res.error;
    return true;
  },

  /* Файл в Supabase Storage (бакет "memes", публичный на чтение) */
  async uploadMemeFile(file){
    if (!this.ready) throw new Error('Общая база не подключена');
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
    const path = Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;
    const up = await this.client.storage.from('memes')
      .upload(path, file, { cacheControl: '3600', upsert: false });
    if (up.error) throw up.error;
    return this.client.storage.from('memes').getPublicUrl(path).data.publicUrl;
  },

  /* Посещаемость: и чтение, и запись доступны только вошедшему старосте
     (RLS в supabase-schema.sql разрешает select/insert/update/delete
     только роли authenticated — анонимный ключ ничего не увидит).

     Важно: запись НЕ привязана к id пары из расписания — время, предмет,
     кабинет и т.п. сохраняются «снимком» прямо в строке attendance.
     Поэтому редактирование или удаление пары в расписании никогда не
     портит и не осиротит уже сохранённые отметки; ключ — дата + время
     начала пары, этого достаточно, чтобы у группы не было двух разных
     пар одновременно. */
  async loadAttendance(date, startTime){
    if (!this.ready) return null;
    const res = await this.client.from('attendance')
      .select('*').eq('lesson_date', date).eq('start_time', startTime).maybeSingle();
    if (res.error) throw res.error;
    return res.data || null;
  },
  async saveAttendance(record){
    if (!this.ready) return false;
    const res = await this.client.from('attendance').upsert({
      lesson_date: record.date, start_time: record.start, end_time: record.end || '',
      subject: record.subject || '', room: record.room || '', teacher: record.teacher || '',
      lesson_type: record.type || 'seminar', present: record.present,
      updated_at: new Date().toISOString()
    }, { onConflict: 'lesson_date,start_time' });
    if (res.error) throw res.error;
    return true;
  },
  /* Список всех сохранённых записей за дату — виден и тогда, когда
     соответствующая пара уже переименована или удалена из расписания. */
  async listAttendanceByDate(date){
    if (!this.ready) return [];
    const res = await this.client.from('attendance')
      .select('*').eq('lesson_date', date).order('start_time');
    if (res.error) throw res.error;
    return res.data || [];
  },
  /* Вся история сразу — для сводки по группе и экспорта в CSV,
     чтобы старосте не нужно было заходить в Supabase вообще. */
  async listAllAttendance(){
    if (!this.ready) return [];
    const res = await this.client.from('attendance')
      .select('*').order('lesson_date').order('start_time');
    if (res.error) throw res.error;
    return res.data || [];
  },

  /* Периоды календаря (сессия/каникулы/практика): читает кто угодно,
     пишет только вошедший админ. */
  async loadPeriods(){
    if (!this.ready) return null;
    const res = await this.client.from('calendar_periods')
      .select('id, label, color, start_date, end_date').order('start_date');
    if (res.error) throw res.error;
    return res.data || [];
  },
  async addPeriod(period){
    if (!this.ready) return null;
    const res = await this.client.from('calendar_periods')
      .insert([{ label: period.label, color: period.color, start_date: period.start, end_date: period.end }])
      .select().single();
    if (res.error) throw res.error;
    return res.data;
  },
  async deletePeriod(id){
    if (!this.ready) return false;
    const res = await this.client.from('calendar_periods').delete().eq('id', id);
    if (res.error) throw res.error;
    return true;
  },

  /* Права на запись: когда база общая, писать может только вошедший админ */
  async signInAdmin(password){
    if (!this.ready) return true;               // локальный режим — просто пускаем
    const res = await this.client.auth.signInWithPassword({
      email: ADMIN_EMAIL, password: password
    });
    if (res.error) throw res.error;
    return true;
  },
  async signOutAdmin(){
    if (!this.ready) return;
    try { await this.client.auth.signOut(); } catch(e){}
  },
  async restoreSession(){
    if (!this.ready) return false;
    try {
      const res = await this.client.auth.getSession();
      return !!(res.data && res.data.session);
    } catch(e){ return false; }
  }
};

/* «Можно ли править здесь и сейчас»: без общей базы правит кто угодно
   (данные всё равно локальные), с базой — только вошедший админ. */
function canEdit(){ return State.isAdmin || !DB.ready; }

/* ---------------------------------------------------------
   6. Загрузка начальных данных
   --------------------------------------------------------- */
async function loadInitialSchedule(){
  // 1) общая база
  try {
    const remote = await DB.loadSchedule();
    // Пустую строку-заготовку из БД игнорируем, иначе она затрёт
    // локальное расписание, пока админ не выгрузил настоящее.
    if (remote && remote.even && remote.odd){
      State.schedule = normalizeSchedule(remote);
      Store.save(LS_KEYS.schedule, State.schedule);
      return;
    }
  } catch(e){ console.warn('Расписание из БД недоступно, работаем локально:', e.message); }

  // 2) локальная копия
  const saved = Store.load(LS_KEYS.schedule, null);
  if (saved && saved.even && saved.odd){ State.schedule = normalizeSchedule(saved); return; }

  // 3) schedule.json из репозитория
  try {
    const res = await fetch('schedule.json', { cache: 'no-store' });
    if (res.ok){
      const data = await res.json();
      if (data && data.even && data.odd){
        State.schedule = normalizeSchedule(data);
        Store.save(LS_KEYS.schedule, State.schedule);
        return;
      }
    }
  } catch(e){ console.warn('Не удалось загрузить schedule.json', e); }

  State.schedule = emptySchedule();
}

function saveSchedule(){
  Store.save(LS_KEYS.schedule, State.schedule);
  if (DB.ready && State.isAdmin){
    DB.saveSchedule(State.schedule).catch(function(e){
      showToast('Не удалось сохранить в общую базу: ' + e.message, true);
    });
  }
}

function loadInitialNotes(){
  const saved = Store.load(LS_KEYS.notes, null);
  State.notes = Array.isArray(saved) ? saved : [];
  if (State.notes.length) State.selectedNoteId = State.notes[0].id;
}
function saveNotes(){ Store.save(LS_KEYS.notes, State.notes); }

function loadInitialSettings(){
  const saved = Store.load(LS_KEYS.settings, null);
  if (saved && typeof saved === 'object') Object.assign(State.settings, saved);
}
function saveSettings(){ Store.save(LS_KEYS.settings, State.settings); }

async function loadDayNotes(){
  try {
    const remote = await DB.loadDayNotes();
    if (remote){ State.dayNotes = remote; Store.save(LS_KEYS.dayNotes, remote); return; }
  } catch(e){ console.warn('Заметки ДЗ из БД недоступны:', e.message); }
  State.dayNotes = Store.load(LS_KEYS.dayNotes, {}) || {};
}

/* Периоды учебного года для календаря: БД → локальное сохранение →
   встроенные дефолты (DEFAULT_PERIODS), чтобы календарь работал
   правильно даже без единой настройки Supabase. */
async function loadCalendarPeriods(){
  try {
    const remote = await DB.loadPeriods();
    if (remote && remote.length){
      State.calendarPeriods = remote.map(function(p){ return { id: p.id, label: p.label, color: p.color, start: p.start_date, end: p.end_date }; });
      Store.save(LS_KEYS.calendarPeriods, State.calendarPeriods);
      return;
    }
  } catch(e){ console.warn('Периоды календаря из БД недоступны:', e.message); }
  const local = Store.load(LS_KEYS.calendarPeriods, null);
  State.calendarPeriods = (local && local.length) ? local : DEFAULT_PERIODS.slice();
}

async function loadMemes(){
  try {
    const remote = await DB.loadMemes();
    if (remote){ State.memes = remote; Store.save(LS_KEYS.memes, remote); return; }
  } catch(e){ console.warn('Мемы из БД недоступны:', e.message); }
  State.memes = Store.load(LS_KEYS.memes, []) || [];
}

/* ---------------------------------------------------------
   6b. Живая синхронизация (Supabase Realtime)
   ---------------------------------------------------------
   Без этого страница подтягивает общие данные только при загрузке —
   если одногруппник поменял что-то, пока вы уже открыли сайт, вы
   узнаёте об этом только после ручного обновления страницы.
   Здесь подписываемся на изменения в публичных таблицах и просто
   перезагружаем соответствующий кусок данных + перерисовываем то,
   что уже на экране.

   ВАЖНО: чтобы Realtime реально присылал события, у таблиц должна
   быть включена репликация — см. блок в конце supabase-schema.sql
   (alter publication supabase_realtime add table ...). Без этого
   подписка молча ничего не получит — это настройка на стороне
   Supabase, не баг фронтенда. */
function initRealtimeSync(){
  if (!DB.ready) return;
  const client = DB.client;

  client.channel('study-os-public-sync')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'schedule' }, function(){
      loadInitialSchedule().then(function(){ renderWidget(); renderScheduleWindow(); });
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'day_notes' }, function(){
      loadDayNotes();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_periods' }, function(){
      loadCalendarPeriods().then(function(){ renderCalendarGrid(); });
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'memes' }, function(){
      loadMemes().then(function(){ renderShitpostGallery(); });
    })
    .subscribe();

  // Посещаемость видна только вошедшему старосте — подписываемся
  // отдельно и только когда включён режим админа, чтобы не запрашивать
  // лишнее и не спамить RLS-отказами у обычных посетителей.
  let attendanceChannel = null;
  function syncAttendanceChannel(){
    if (State.isAdmin && !attendanceChannel){
      attendanceChannel = client.channel('study-os-attendance-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, function(){
          if (State.openApps.has('attendance')){
            loadAttendanceForSelection();
            loadAttendanceSummary();
          }
        })
        .subscribe();
    } else if (!State.isAdmin && attendanceChannel){
      client.removeChannel(attendanceChannel);
      attendanceChannel = null;
    }
  }
  document.addEventListener('study-os:admin-mode-changed', syncAttendanceChannel);
  syncAttendanceChannel();
}

/* ---------------------------------------------------------
   7. Всплывающее уведомление (вместо alert)
   --------------------------------------------------------- */
let toastTimer = null;
function showToast(text, isError){
  let el = $('app-toast');
  if (!el){
    el = document.createElement('div');
    el.id = 'app-toast';
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.classList.toggle('is-error', !!isError);
  el.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function(){ el.classList.remove('visible'); }, 3600);
}

/* ---------------------------------------------------------
   8. Часы в трее
   --------------------------------------------------------- */
function tickClock(){
  const el = $('tray-clock-time');
  if (el) el.textContent = formatTime24(now());
}

/* ---------------------------------------------------------
   9. Погода: иконки в стиле XP (рисуются кодом, без файлов)
   --------------------------------------------------------- */
const WX_SVG = {
  clear:
    '<circle cx="16" cy="16" r="7.4" fill="url(#wxSun)" stroke="#d8790a" stroke-width=".9"/>' +
    '<g stroke="#f6a81c" stroke-width="2.1" stroke-linecap="round">' +
    '<path d="M16 1.6v3.4"/><path d="M16 27v3.4"/><path d="M1.6 16h3.4"/><path d="M27 16h3.4"/>' +
    '<path d="M5.8 5.8l2.4 2.4"/><path d="M23.8 23.8l2.4 2.4"/><path d="M26.2 5.8l-2.4 2.4"/><path d="M8.2 23.8l-2.4 2.4"/></g>',
  partly:
    '<circle cx="12" cy="12" r="6" fill="url(#wxSun)" stroke="#d8790a" stroke-width=".9"/>' +
    '<g stroke="#f6a81c" stroke-width="1.9" stroke-linecap="round">' +
    '<path d="M12 1.8v2.6"/><path d="M2 12h2.6"/><path d="M4.9 4.9l1.9 1.9"/><path d="M19.1 4.9l-1.9 1.9"/></g>' +
    '<path d="M11 27.5a5.6 5.6 0 0 1 1-11.1 7.6 7.6 0 0 1 14.3 2.1 5.2 5.2 0 0 1-.8 10.2z" ' +
    'fill="url(#wxCloud)" stroke="#6f85ab" stroke-width="1.1" stroke-linejoin="round"/>',
  cloudy:
    '<path d="M7 22.5a4.6 4.6 0 0 1 1-9.1 6.4 6.4 0 0 1 12 1.7 4.4 4.4 0 0 1-.7 8.6z" ' +
    'fill="#dbe6f7" stroke="#8296b6" stroke-width="1" stroke-linejoin="round" opacity=".9"/>' +
    '<path d="M12 28.5a5.6 5.6 0 0 1 1-11.1 7.6 7.6 0 0 1 14.3 2.1 5.2 5.2 0 0 1-.8 10.2z" ' +
    'fill="url(#wxCloud)" stroke="#6f85ab" stroke-width="1.1" stroke-linejoin="round"/>',
  fog:
    '<path d="M8 20.5a5.3 5.3 0 0 1 1-10.5 7.2 7.2 0 0 1 13.6 2 5 5 0 0 1-.8 9.7z" ' +
    'fill="url(#wxCloud)" stroke="#8296b6" stroke-width="1.1" stroke-linejoin="round" opacity=".95"/>' +
    '<g stroke="#93a6c2" stroke-width="2.1" stroke-linecap="round">' +
    '<path d="M5 24.5h22"/><path d="M8 28.5h16"/></g>',
  drizzle:
    '<path d="M9 21.5a5.3 5.3 0 0 1 1-10.5 7.2 7.2 0 0 1 13.6 2 5 5 0 0 1-.8 9.7z" ' +
    'fill="url(#wxCloud)" stroke="#6f85ab" stroke-width="1.1" stroke-linejoin="round"/>' +
    '<g stroke="#4f9ae8" stroke-width="1.8" stroke-linecap="round">' +
    '<path d="M11 24.5v2.6"/><path d="M16 25.5v2.6"/><path d="M21 24.5v2.6"/></g>',
  rain:
    '<path d="M9 21.5a5.3 5.3 0 0 1 1-10.5 7.2 7.2 0 0 1 13.6 2 5 5 0 0 1-.8 9.7z" ' +
    'fill="url(#wxCloud)" stroke="#6f85ab" stroke-width="1.1" stroke-linejoin="round"/>' +
    '<g stroke="#2f7fd6" stroke-width="2.1" stroke-linecap="round">' +
    '<path d="M11 24.2l-1.5 4.4"/><path d="M16.5 24.2L15 28.6"/><path d="M22 24.2l-1.5 4.4"/></g>',
  showers:
    '<path d="M9 20.5a5.3 5.3 0 0 1 1-10.5 7.2 7.2 0 0 1 13.6 2 5 5 0 0 1-.8 9.7z" ' +
    'fill="url(#wxCloud)" stroke="#5f7397" stroke-width="1.1" stroke-linejoin="round"/>' +
    '<g stroke="#1f6ec4" stroke-width="2.3" stroke-linecap="round">' +
    '<path d="M10 22.6l-2.2 6"/><path d="M15.5 22.6l-2.2 6"/><path d="M21 22.6l-2.2 6"/><path d="M26 22.6l-2.2 6"/></g>',
  snow:
    '<path d="M9 20.5a5.3 5.3 0 0 1 1-10.5 7.2 7.2 0 0 1 13.6 2 5 5 0 0 1-.8 9.7z" ' +
    'fill="url(#wxCloud)" stroke="#7e93b5" stroke-width="1.1" stroke-linejoin="round"/>' +
    '<g stroke="#5aa8e8" stroke-width="1.6" stroke-linecap="round">' +
    '<path d="M11 23v4"/><path d="M9.3 24l3.4 2"/><path d="M12.7 24l-3.4 2"/>' +
    '<path d="M21 23v4"/><path d="M19.3 24l3.4 2"/><path d="M22.7 24l-3.4 2"/>' +
    '<path d="M16 26v4"/><path d="M14.3 27l3.4 2"/><path d="M17.7 27l-3.4 2"/></g>',
  thunder:
    '<path d="M9 20.5a5.3 5.3 0 0 1 1-10.5 7.2 7.2 0 0 1 13.6 2 5 5 0 0 1-.8 9.7z" ' +
    'fill="#c3cee1" stroke="#5f7397" stroke-width="1.1" stroke-linejoin="round"/>' +
    '<path d="M17.6 21l-6.4 6.6h4l-2 4.2 6.8-7.1h-4.2z" fill="#ffd23b" stroke="#c48a06" stroke-width=".9" stroke-linejoin="round"/>' +
    '<g stroke="#2f7fd6" stroke-width="1.9" stroke-linecap="round"><path d="M10 23l-1.4 4"/><path d="M23 23l-1.4 4"/></g>',
  unknown:
    '<circle cx="16" cy="16" r="10.5" fill="#e6edf9" stroke="#8296b6" stroke-width="1.2"/>' +
    '<path d="M13 13a3 3 0 1 1 3.6 3c-.7.2-1.1.8-1.1 1.6v.9" fill="none" stroke="#5f7397" stroke-width="2" stroke-linecap="round"/>' +
    '<circle cx="15.5" cy="21.6" r="1.4" fill="#5f7397"/>'
};

/* Код Open-Meteo (WMO) -> внешний вид и подпись */
const WEATHER_MAP = {
  0:  ['clear',    'Ясно'],
  1:  ['partly',   'Преимущественно ясно'],
  2:  ['partly',   'Переменная облачность'],
  3:  ['cloudy',   'Пасмурно'],
  45: ['fog',      'Туман'],
  48: ['fog',      'Изморозь'],
  51: ['drizzle',  'Слабая морось'],
  53: ['drizzle',  'Морось'],
  55: ['drizzle',  'Сильная морось'],
  56: ['drizzle',  'Ледяная морось'],
  57: ['drizzle',  'Сильная ледяная морось'],
  61: ['rain',     'Небольшой дождь'],
  63: ['rain',     'Дождь'],
  65: ['showers',  'Сильный дождь'],
  66: ['rain',     'Ледяной дождь'],
  67: ['showers',  'Сильный ледяной дождь'],
  71: ['snow',     'Небольшой снег'],
  73: ['snow',     'Снег'],
  75: ['snow',     'Сильный снегопад'],
  77: ['snow',     'Снежная крупа'],
  80: ['showers',  'Ливень'],
  81: ['showers',  'Сильный ливень'],
  82: ['showers',  'Очень сильный ливень'],
  85: ['snow',     'Снежный ливень'],
  86: ['snow',     'Сильный снежный ливень'],
  95: ['thunder',  'Гроза'],
  96: ['thunder',  'Гроза с градом'],
  99: ['thunder',  'Сильная гроза с градом']
};

function getWeatherInfo(code){
  const found = WEATHER_MAP[code];
  return { key: found ? found[0] : 'unknown', label: found ? found[1] : 'Погодные условия' };
}

/* Собирает готовый <svg> нужного состояния. Градиенты — на каждый
   экземпляр свои, иначе два SVG на странице делят одни id. */
function weatherSvg(key, size){
  const gid = 'wx' + Math.random().toString(36).slice(2, 8);
  const body = (WX_SVG[key] || WX_SVG.unknown)
    .replace(/url\(#wxSun\)/g, 'url(#' + gid + 'S)')
    .replace(/url\(#wxCloud\)/g, 'url(#' + gid + 'C)');
  return '<svg class="wx-icon" viewBox="0 0 32 32" width="' + size + '" height="' + size + '" aria-hidden="true">' +
    '<defs>' +
      '<radialGradient id="' + gid + 'S" cx=".38" cy=".33" r=".8">' +
        '<stop offset="0" stop-color="#fffbe0"/><stop offset=".45" stop-color="#ffd83b"/><stop offset="1" stop-color="#f08a12"/>' +
      '</radialGradient>' +
      '<linearGradient id="' + gid + 'C" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#eef4fd"/><stop offset="1" stop-color="#b9caea"/>' +
      '</linearGradient>' +
    '</defs>' + body + '</svg>';
}

/* ---------------------------------------------------------
   10. Погода, геокодинг и часовой пояс
   --------------------------------------------------------- */
async function geocodeCity(city){
  const url = 'https://geocoding-api.open-meteo.com/v1/search?name=' +
              encodeURIComponent(city) + '&count=1&language=ru&format=json';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Сервис поиска города недоступен');
  const data = await res.json();
  if (!data.results || !data.results.length) throw new Error('Город «' + city + '» не найден');
  const r = data.results[0];
  return { lat: r.latitude, lon: r.longitude, name: r.name, timezone: r.timezone || '' };
}

/* Обратный геокодинг: координаты -> название города.
   Open-Meteo /search ищет только по имени, поэтому используем TomTom,
   ключ для которого в проекте уже есть. */
async function reverseGeocode(lat, lon){
  const url = 'https://api.tomtom.com/search/2/reverseGeocode/' + lat + ',' + lon +
              '.json?key=' + TOMTOM_API_KEY + '&language=ru-RU&radius=20000';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Сервис геокодирования недоступен');
  const data = await res.json();
  const addr = data.addresses && data.addresses[0] && data.addresses[0].address;
  if (!addr) throw new Error('Не удалось определить адрес');
  return {
    city: addr.municipality || addr.countrySecondarySubdivision || addr.countrySubdivision || '',
    freeform: addr.freeformAddress || ''
  };
}

function applyWeather(data, cityName){
  const cur = data.current;
  const info = getWeatherInfo(cur.weather_code);
  const temp = Math.round(cur.temperature_2m);
  State.weather = { temp: temp, info: info, city: cityName };

  // Часовой пояс приходит вместе с погодой (timezone=auto) — привязываем часы к нему
  if (data.timezone && data.timezone !== State.settings.timezone){
    State.settings.timezone = data.timezone;
    saveSettings();
    tickClock();
    renderWidget();
  }

  const trayTemp = $('tray-weather-temp');
  const trayIcon = $('tray-weather-icon');
  if (trayTemp) trayTemp.textContent = temp + '°C';
  if (trayIcon){
    trayIcon.innerHTML = weatherSvg(info.key, 18);
    trayIcon.title = info.label + ' · ' + cityName;
  }
  const tray = $('tray-weather');
  if (tray) tray.title = info.label + ', ' + temp + '°C — ' + cityName;

  const detailEl = $('weather-detail');
  if (detailEl){
    detailEl.innerHTML =
      '<div class="weather-hero">' +
        '<div class="weather-hero-icon">' + weatherSvg(info.key, 56) + '</div>' +
        '<div class="weather-hero-text">' +
          '<div class="weather-hero-temp">' + temp + '°C</div>' +
          '<div class="weather-hero-label">' + escapeHtml(info.label) + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="weather-grid">' +
        '<div class="weather-stat"><div class="ws-label">Ощущается</div><div class="ws-value">' + Math.round(cur.apparent_temperature) + '°C</div></div>' +
        '<div class="weather-stat"><div class="ws-label">Влажность</div><div class="ws-value">' + Math.round(cur.relative_humidity_2m) + '%</div></div>' +
        '<div class="weather-stat"><div class="ws-label">Ветер</div><div class="ws-value">' + Math.round(cur.wind_speed_10m) + ' км/ч</div></div>' +
        '<div class="weather-stat"><div class="ws-label">Часовой пояс</div><div class="ws-value tz">' + escapeHtml(data.timezone || '—') + '</div></div>' +
      '</div>';
  }
}

async function fetchWeather(){
  const detailEl = $('weather-detail');
  const cityLabel = $('weather-city-label');
  const city = (State.settings.city || '').trim();

  if (!city){
    if (cityLabel) cityLabel.textContent = '—';
    if (detailEl) detailEl.innerHTML = '<div class="weather-error">Город не задан. Укажите его в «Панели управления» или нажмите «Определить город автоматически».</div>';
    const t = $('tray-weather-temp'); if (t) t.textContent = '--°C';
    const i = $('tray-weather-icon'); if (i) i.innerHTML = '';
    return;
  }

  if (cityLabel) cityLabel.textContent = city;
  if (detailEl) detailEl.innerHTML = '<div class="weather-loading">Загрузка данных о погоде…</div>';

  try {
    const geo = await geocodeCity(city);
    if (geo.name) State.settings.city = geo.name;
    if (cityLabel) cityLabel.textContent = State.settings.city;

    const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + geo.lat + '&longitude=' + geo.lon +
      '&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code' +
      '&timezone=auto';
    const res = await fetch(url);
    if (!res.ok) throw new Error('Сервис погоды недоступен');
    const data = await res.json();
    applyWeather(data, State.settings.city);
    saveSettings();
  } catch(e){
    if (detailEl) detailEl.innerHTML = '<div class="weather-error">Не удалось получить погоду: ' + escapeHtml(e.message) + '</div>';
    const t = $('tray-weather-temp'); if (t) t.textContent = '--°C';
    const i = $('tray-weather-icon'); if (i) i.innerHTML = '';
  }
}

/* Определение города по геолокации браузера */
function getPosition(){
  return new Promise(function(resolve, reject){
    if (!navigator.geolocation){ reject(new Error('Геолокация не поддерживается браузером')); return; }
    navigator.geolocation.getCurrentPosition(
      function(pos){ resolve(pos.coords); },
      function(err){
        reject(new Error(err.code === 1 ? 'Доступ к геолокации запрещён' : 'Не удалось определить местоположение'));
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 600000 }
    );
  });
}

async function detectCityByGeolocation(){
  const coords = await getPosition();
  const place = await reverseGeocode(coords.latitude, coords.longitude);
  if (!place.city) throw new Error('Не удалось определить город');
  State.settings.city = place.city;
  saveSettings();
  return place.city;
}

/* Погода по «сырым» координатам — быстрый путь при первом визите:
   один запрос сразу даёт и погоду, и IANA-часовой пояс. */
async function fetchWeatherByCoords(lat, lon, cityName){
  const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon +
    '&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code' +
    '&timezone=auto';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Сервис погоды недоступен');
  applyWeather(await res.json(), cityName);
  const cityLabel = $('weather-city-label');
  if (cityLabel) cityLabel.textContent = cityName;
}

function initAutoDetectCity(){
  const btn = $('detect-city-btn');
  if (!btn) return;
  btn.addEventListener('click', async function(){
    const original = btn.textContent;
    btn.textContent = 'Определяю…';
    btn.disabled = true;
    try {
      const city = await detectCityByGeolocation();
      const input = $('set-city');
      if (input) input.value = city;
      await fetchWeather();
      showToast('Определён город: ' + city);
    } catch(e){
      showToast(e.message + '. Введите город вручную.', true);
    } finally {
      btn.textContent = original;
      btn.disabled = false;
    }
  });
}

/* Первый визит без сохранённого города — молча пробуем геолокацию */
async function autoDetectOnFirstVisit(){
  try {
    const coords = await getPosition();
    let cityName = '';
    try { cityName = (await reverseGeocode(coords.latitude, coords.longitude)).city; } catch(e){}
    if (cityName){
      State.settings.city = cityName;
      saveSettings();
      const input = $('set-city');
      if (input) input.value = cityName;
    }
    await fetchWeatherByCoords(coords.latitude, coords.longitude, cityName || 'Ваше местоположение');
  } catch(e){
    const detailEl = $('weather-detail');
    if (detailEl) detailEl.innerHTML = '<div class="weather-error">Укажите город в «Панели управления», чтобы видеть погоду и точное время.</div>';
  }
}

/* ---------------------------------------------------------
   11. Пробки (TomTom): Дом → Учёба
   --------------------------------------------------------- */
async function fetchTraffic(){
  const el = $('traffic-detail');
  if (!el) return;
  const s = State.settings;
  if (!s.homeLat || !s.homeLon || !s.studyLat || !s.studyLon){
    el.innerHTML = '<div class="weather-loading">Задайте адреса «Дом» и «Учёба» в панели управления.</div>';
    return;
  }
  el.innerHTML = '<div class="weather-loading">Считаю маршрут…</div>';
  try {
    const url = 'https://api.tomtom.com/routing/1/calculateRoute/' +
      s.homeLat + ',' + s.homeLon + ':' + s.studyLat + ',' + s.studyLon +
      '/json?key=' + TOMTOM_API_KEY + '&traffic=true&travelMode=car&routeType=fastest';
    const res = await fetch(url);
    if (!res.ok) throw new Error('Сервис маршрутов недоступен (' + res.status + ')');
    const data = await res.json();
    const sum = data.routes && data.routes[0] && data.routes[0].summary;
    if (!sum) throw new Error('Маршрут не найден');

    const withTraffic = Math.round(sum.travelTimeInSeconds / 60);
    const noTraffic = Math.round((sum.noTrafficTravelTimeInSeconds || sum.travelTimeInSeconds) / 60);
    const delay = Math.max(0, withTraffic - noTraffic);
    const km = (sum.lengthInMeters / 1000).toFixed(1);

    el.innerHTML =
      '<div class="traffic-route">' + escapeHtml(s.homeAddress || 'Дом') + ' → ' + escapeHtml(s.studyAddress || 'Учёба') + '</div>' +
      '<div class="weather-grid">' +
        '<div class="weather-stat"><div class="ws-label">В пути</div><div class="ws-value">' + withTraffic + ' мин</div></div>' +
        '<div class="weather-stat"><div class="ws-label">Без пробок</div><div class="ws-value">' + noTraffic + ' мин</div></div>' +
        '<div class="weather-stat"><div class="ws-label">Расстояние</div><div class="ws-value">' + km + ' км</div></div>' +
      '</div>' +
      '<p style="margin-top:.4rem;">Задержка из-за трафика: ' +
        '<span class="traffic-delay ' + (delay > 7 ? 'bad' : 'ok') + '">' +
        (delay > 0 ? '+' + delay + ' мин' : 'нет') + '</span></p>';
  } catch(e){
    el.innerHTML = '<div class="weather-error">Не удалось получить данные о пробках: ' + escapeHtml(e.message) + '</div>';
  }
}

/* ---------------------------------------------------------
   11b. Всплывающий календарь (клик по часам в трее)
   --------------------------------------------------------- */
State.calendarViewDate = new Date();

/* Периоды, покрывающие дату (обычно один, но на границах дат бывает
   формально совпадение по краю — на этот случай возвращаем все). */
function periodsForDate(dateStr){
  return State.calendarPeriods.filter(function(p){ return dateStr >= p.start && dateStr <= p.end; });
}

function renderCalendarGrid(){
  const grid = $('cal-grid'); const label = $('cal-month-label');
  if (!grid || !label) return;

  const view = State.calendarViewDate;
  const year = view.getFullYear(); const month = view.getMonth();
  label.textContent = MONTH_NAMES[month].replace(/^./, function(c){ return c.toUpperCase(); }) + ' ' + year;

  const today = now(); today.setHours(0,0,0,0);
  const selected = getDisplayedDate(); selected.setHours(0,0,0,0);

  const firstOfMonth = new Date(year, month, 1);
  // Понедельник = 0 … воскресенье = 6
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - startOffset);

  grid.innerHTML = '';
  const monthLabelsSeen = {};
  for (let i = 0; i < 42; i++){
    const cellDate = new Date(gridStart);
    cellDate.setDate(gridStart.getDate() + i);
    const iso = formatIsoDate(cellDate);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cal-cell';
    if (cellDate.getMonth() !== month) btn.classList.add('is-outside');
    if (cellDate.getTime() === today.getTime()) btn.classList.add('is-today');
    if (cellDate.getTime() === selected.getTime()) btn.classList.add('is-selected');
    if (cellDate.getDay() === 0 || cellDate.getDay() === 6) btn.classList.add('is-weekend');

    const periods = periodsForDate(iso);
    if (periods.length){
      btn.classList.add('has-period');
      btn.style.setProperty('--period-color', periods[0].color);
      btn.title = periods.map(function(p){ return p.label; }).join(', ');
      if (cellDate.getMonth() === month) monthLabelsSeen[periods[0].label] = periods[0].color;
    }

    btn.textContent = cellDate.getDate();
    btn.addEventListener('click', function(){ selectCalendarDate(cellDate); });
    grid.appendChild(btn);
  }

  renderCalendarLegend(monthLabelsSeen);
}

function renderCalendarLegend(labelsMap){
  const legend = $('cal-legend');
  if (!legend) return;
  const entries = Object.keys(labelsMap);
  if (!entries.length){ legend.innerHTML = ''; legend.classList.add('hidden'); return; }
  legend.classList.remove('hidden');
  legend.innerHTML = entries.map(function(label){
    return '<span class="cal-legend-item"><span class="cal-legend-dot" style="background:' + labelsMap[label] + '"></span>' + escapeHtml(label) + '</span>';
  }).join('');
}

/* Клик по дате в календаре двигает то же смещение, что и стрелки
   виджета, и открывает расписание на нужной чётности/дне. */
function selectCalendarDate(date){
  const today = now(); today.setHours(0,0,0,0);
  const target = new Date(date); target.setHours(0,0,0,0);
  State.widgetOffsetDays = Math.round((target - today) / 86400000);
  renderWidget();

  State.scheduleActiveParity = getParityForDate(target);
  syncScheduleTabs();
  renderScheduleWindow();
  openApp('schedule');
  closeCalendarPopup();
}

function openCalendarPopup(){
  const popup = $('calendar-popup'); const overlay = $('calendar-overlay');
  if (!popup) return;
  State.calendarViewDate = new Date(getDisplayedDate());
  renderCalendarGrid();
  popup.classList.remove('hidden');
  if (overlay) overlay.classList.remove('hidden');
}
function closeCalendarPopup(){
  const popup = $('calendar-popup'); const overlay = $('calendar-overlay');
  if (popup) popup.classList.add('hidden');
  if (overlay) overlay.classList.add('hidden');
}
function toggleCalendarPopup(){
  const popup = $('calendar-popup');
  if (!popup) return;
  if (popup.classList.contains('hidden')) openCalendarPopup(); else closeCalendarPopup();
}

function initCalendarPopup(){
  const trayClock = $('tray-clock');
  if (trayClock){
    trayClock.addEventListener('click', function(e){ e.stopPropagation(); toggleCalendarPopup(); });
    trayClock.addEventListener('keydown', function(e){
      if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); toggleCalendarPopup(); }
    });
  }

  const closeBtn = $('cal-close');
  if (closeBtn) closeBtn.addEventListener('click', closeCalendarPopup);
  const overlay = $('calendar-overlay');
  if (overlay) overlay.addEventListener('click', closeCalendarPopup);

  const prev = $('cal-prev'); const next = $('cal-next');
  if (prev) prev.addEventListener('click', function(){
    State.calendarViewDate = new Date(State.calendarViewDate.getFullYear(), State.calendarViewDate.getMonth() - 1, 1);
    renderCalendarGrid();
  });
  if (next) next.addEventListener('click', function(){
    State.calendarViewDate = new Date(State.calendarViewDate.getFullYear(), State.calendarViewDate.getMonth() + 1, 1);
    renderCalendarGrid();
  });

  const todayBtn = $('cal-today');
  if (todayBtn) todayBtn.addEventListener('click', function(){ selectCalendarDate(now()); });

  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape') closeCalendarPopup();
  });
}

function initWeatherWindow(){
  const wr = $('weather-refresh');
  if (wr) wr.addEventListener('click', fetchWeather);
  const tr = $('traffic-refresh');
  if (tr) tr.addEventListener('click', fetchTraffic);
}

/* ---------------------------------------------------------
   12. Виджет расписания на рабочем столе
   --------------------------------------------------------- */
function getDisplayedDate(){
  const d = now();
  d.setDate(d.getDate() + State.widgetOffsetDays);
  return d;
}

function lessonsFor(date){
  const parity = getParityForDate(date);
  const dayKey = dayKeyForDate(date);
  const list = (State.schedule[parity] && State.schedule[parity][dayKey]) || [];
  return list.slice().sort(function(a, b){ return a.start.localeCompare(b.start); });
}

function renderWidget(){
  const date = getDisplayedDate();
  const dayKey = dayKeyForDate(date);
  const parity = getParityForDate(date);

  const nameEl = $('widget-day-name');
  const dateEl = $('widget-date-full');
  const parityEl = $('widget-parity-label');
  const badgeEl = $('widget-today-badge');
  const listEl = $('widget-lessons');
  if (!listEl) return;

  if (nameEl) nameEl.textContent = DAY_LABELS[dayKey];
  if (dateEl) dateEl.textContent = formatDateFull(date);
  if (parityEl) parityEl.textContent = parity === 'even' ? 'Чётная неделя' : 'Нечётная неделя';
  if (badgeEl) badgeEl.classList.toggle('hidden', State.widgetOffsetDays !== 0);

  const lessons = lessonsFor(date);
  listEl.innerHTML = '';

  if (!lessons.length){
    const empty = document.createElement('div');
    empty.className = 'widget-empty';
    empty.textContent = dayKey === 'sun' ? 'Воскресенье — пар нет' : 'Пар нет';
    listEl.appendChild(empty);
  } else {
    lessons.forEach(function(lesson){
      const item = document.createElement('div');
      item.className = 'widget-lesson type-' + lesson.type;
      const hasNote = (lesson.note || '').trim();
      item.innerHTML =
        '<div class="widget-lesson-time">' + escapeHtml(lesson.start) + '—' + escapeHtml(lesson.end) + '</div>' +
        '<div class="widget-lesson-subject">' + escapeHtml(lesson.subject) + '</div>' +
        '<div class="widget-lesson-meta">' +
          escapeHtml(lesson.room || '') +
          (lesson.room && lesson.teacher ? ' · ' : '') +
          escapeHtml(lesson.teacher || '') +
        '</div>' +
        (hasNote || lesson.due
          ? '<div class="widget-hw"><span class="widget-hw-label">ДЗ</span> ' +
              escapeHtml(hasNote || '—') + renderDueBadge(lesson.due) + '</div>'
          : '');
      listEl.appendChild(item);
    });
  }
}

/* На телефоне число строк с ярлыками зависит от ширины экрана,
   поэтому верх виджета считаем по фактической высоте блока иконок —
   так они не перекрываются ни при каком разрешении. */
function layoutDesktop(){
  const icons = $('desktop-icons');
  const widget = document.querySelector('.glass-widget');
  if (!icons || !widget) return;
  if (!isMobile()){ widget.style.top = ''; widget.style.maxHeight = ''; return; }

  const iconsBottom = icons.getBoundingClientRect().bottom;
  const top = Math.round(iconsBottom + 8);
  widget.style.top = top + 'px';

  const bottomIcons = $('desktop-icons-bottom');
  const floor = bottomIcons
    ? bottomIcons.getBoundingClientRect().top - 8
    : window.innerHeight - 56;
  widget.style.maxHeight = Math.max(120, floor - top) + 'px';
}

function initWidgetNav(){
  const prev = $('widget-prev');
  const next = $('widget-next');
  const edit = $('widget-edit-btn');
  if (prev) prev.addEventListener('click', function(){ State.widgetOffsetDays -= 1; renderWidget(); });
  if (next) next.addEventListener('click', function(){ State.widgetOffsetDays += 1; renderWidget(); });
  if (edit) edit.addEventListener('click', function(){
    State.scheduleActiveParity = getParityForDate(getDisplayedDate());
    syncScheduleTabs();
    openApp('schedule');
  });
}

/* ---------------------------------------------------------
   13. Окно «Расписание»
   --------------------------------------------------------- */
function syncScheduleTabs(){
  document.querySelectorAll('.xp-tab[data-parity]').forEach(function(tab){
    tab.classList.toggle('active', tab.dataset.parity === State.scheduleActiveParity);
  });
}

function initScheduleTabs(){
  document.querySelectorAll('.xp-tab[data-parity]').forEach(function(tab){
    tab.addEventListener('click', function(){
      State.scheduleActiveParity = tab.dataset.parity;
      syncScheduleTabs();
      renderScheduleWindow();
    });
  });
  syncScheduleTabs();
}

function renderScheduleWindow(){
  const container = $('schedule-days');
  if (!container) return;
  container.innerHTML = '';

  // «Выбранный» день — тот же, что показан в виджете на рабочем столе
  // (стрелки виджета и клик по календарю двигают одно и то же смещение)
  const focused = getDisplayedDate();
  const focusedKey = dayKeyForDate(focused);
  const focusedParity = getParityForDate(focused);
  const isRealToday = State.widgetOffsetDays === 0;
  const editable = canEdit();

  SCHOOL_DAY_KEYS.forEach(function(dayKey){
    const col = document.createElement('div');
    col.className = 'schedule-day-col';
    if (dayKey === focusedKey && State.scheduleActiveParity === focusedParity){
      col.classList.add(isRealToday ? 'is-today' : 'is-focused');
    }

    const title = document.createElement('div');
    title.className = 'schedule-day-title';
    title.innerHTML = '<span>' + DAY_LABELS[dayKey] + '</span>';
    if (editable){
      const addBtn = document.createElement('button');
      addBtn.className = 'day-add-btn';
      addBtn.type = 'button';
      addBtn.textContent = '+';
      addBtn.title = 'Добавить пару';
      addBtn.addEventListener('click', function(){
        openLessonForm(null, State.scheduleActiveParity, dayKey);
      });
      title.appendChild(addBtn);
    }
    col.appendChild(title);

    const lessons = ((State.schedule[State.scheduleActiveParity] || {})[dayKey] || [])
      .slice().sort(function(a, b){ return a.start.localeCompare(b.start); });

    if (!lessons.length){
      const empty = document.createElement('div');
      empty.className = 'day-empty';
      empty.textContent = 'Пар нет';
      col.appendChild(empty);
    }

    lessons.forEach(function(lesson){
      const card = document.createElement('div');
      card.className = 'lesson-card type-' + lesson.type;
      const hasNote = (lesson.note || '').trim();
      const dueBadge = lesson.due ? renderDueBadge(lesson.due) : '';
      card.innerHTML =
        (editable
          ? '<div class="lc-actions">' +
              '<button type="button" class="lc-edit" title="Редактировать">&#9998;</button>' +
              '<button type="button" class="lc-delete" title="Удалить">&#10005;</button>' +
            '</div>'
          : '') +
        '<div class="lc-time">' + escapeHtml(lesson.start) + '—' + escapeHtml(lesson.end) +
          '<span class="lc-badge">' + (lesson.type === 'lecture' ? 'Лекция' : 'Семинар') + '</span></div>' +
        '<div class="lc-subject">' + escapeHtml(lesson.subject) + '</div>' +
        '<div class="lc-meta">' + escapeHtml(lesson.room || '') +
          (lesson.room && lesson.teacher ? ' · ' : '') + escapeHtml(lesson.teacher || '') + '</div>' +
        (hasNote || dueBadge
          ? '<div class="lc-note">' +
              '<span class="lc-note-label">ДЗ</span> ' + escapeHtml(hasNote || '—') + dueBadge +
            '</div>'
          : '');
      if (editable){
        card.querySelector('.lc-edit').addEventListener('click', function(){
          openLessonForm(lesson, State.scheduleActiveParity, dayKey);
        });
        card.querySelector('.lc-delete').addEventListener('click', function(){
          confirmDelete('Удалить пару «' + lesson.subject + '»?', function(){
            deleteLesson(State.scheduleActiveParity, dayKey, lesson.id);
          });
        });
      }
      col.appendChild(card);
    });

    container.appendChild(col);
  });
}

/* ---------------------------------------------------------
   14. ДЗ / заметки к конкретной паре (редактируются в форме пары,
       см. openLessonForm / initLessonForm — поля lf-note / lf-due)
   --------------------------------------------------------- */
function renderDueBadge(due){
  if (!due) return '';
  const today = now(); today.setHours(0,0,0,0);
  const dueDate = new Date(due + 'T00:00:00');
  if (isNaN(dueDate.getTime())) return '';
  const diffDays = Math.round((dueDate - today) / 86400000);
  let cls = 'lc-due';
  if (diffDays < 0) cls += ' overdue'; else if (diffDays <= 2) cls += ' soon';
  return '<span class="' + cls + '">до ' + escapeHtml(formatDateFull(dueDate)) + '</span>';
}

/* ---------------------------------------------------------
   15. Форма пары
   --------------------------------------------------------- */
function openLessonForm(lesson, parity, dayKey){
  const titleEl = $('lesson-form-title');
  if (titleEl) titleEl.textContent = lesson ? 'Изменить пару' : 'Новая пара — ' + DAY_LABELS[dayKey];
  $('lf-id').value = lesson ? lesson.id : '';
  $('lf-parity').value = parity;
  $('lf-day').value = dayKey;
  $('lf-start').value = lesson ? lesson.start : '09:00';
  $('lf-end').value = lesson ? lesson.end : '10:30';
  $('lf-type').value = lesson ? lesson.type : 'seminar';
  $('lf-subject').value = lesson ? lesson.subject : '';
  $('lf-room').value = lesson ? (lesson.room || '') : '';
  $('lf-teacher').value = lesson ? (lesson.teacher || '') : '';
  if ($('lf-note')) $('lf-note').value = lesson ? (lesson.note || '') : '';
  if ($('lf-due')) $('lf-due').value = lesson ? (lesson.due || '') : '';
  openApp('lesson-form');
  setTimeout(function(){ $('lf-subject').focus(); }, 60);
}

function initLessonForm(){
  const form = $('lesson-form');
  if (!form) return;

  form.addEventListener('submit', function(e){
    e.preventDefault();
    const id = $('lf-id').value;
    const parity = $('lf-parity').value;
    const dayKey = $('lf-day').value;
    const start = $('lf-start').value;
    const end = $('lf-end').value;

    if (start && end && end <= start){
      showToast('Окончание пары должно быть позже начала', true);
      return;
    }

    const lesson = {
      id: id || uid('lesson'),
      start: start, end: end,
      type: $('lf-type').value,
      subject: $('lf-subject').value.trim(),
      room: $('lf-room').value.trim(),
      teacher: $('lf-teacher').value.trim(),
      note: ($('lf-note') ? $('lf-note').value.trim() : ''),
      due: ($('lf-due') ? $('lf-due').value : '')
    };
    if (!lesson.subject){ showToast('Укажите дисциплину', true); return; }

    const list = State.schedule[parity][dayKey];
    const idx = list.findIndex(function(l){ return l.id === lesson.id; });
    if (idx >= 0) list[idx] = lesson; else list.push(lesson);

    saveSchedule();
    renderScheduleWindow();
    renderWidget();
    closeWindowByApp('lesson-form');
    showToast(idx >= 0 ? 'Пара обновлена' : 'Пара добавлена');
  });

  const cancel = $('lf-cancel');
  if (cancel) cancel.addEventListener('click', function(){ closeWindowByApp('lesson-form'); });
}

function deleteLesson(parity, dayKey, id){
  const list = State.schedule[parity][dayKey];
  const idx = list.findIndex(function(l){ return l.id === id; });
  if (idx < 0) return;
  list.splice(idx, 1);
  saveSchedule();
  renderScheduleWindow();
  renderWidget();
  showToast('Пара удалена');
}

/* ---------------------------------------------------------
   16. Экспорт / импорт расписания
   --------------------------------------------------------- */
function downloadFile(filename, content, mime){
  const blob = new Blob([content], { type: mime || 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
}

function initScheduleImportExport(){
  const exportBtn = $('sched-export');
  const importBtn = $('sched-import');
  const input = $('sched-import-input');

  if (exportBtn) exportBtn.addEventListener('click', function(){
    downloadFile('schedule.json', JSON.stringify(State.schedule, null, 2), 'application/json');
    showToast('Файл schedule.json скачан');
  });

  if (importBtn && input){
    importBtn.addEventListener('click', function(){ input.click(); });
    input.addEventListener('change', function(e){
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(){
        try {
          const data = JSON.parse(reader.result);
          if (!data || !data.even || !data.odd) throw new Error('В файле нет разделов even/odd');
          State.schedule = normalizeSchedule(data);
          saveSchedule();
          renderScheduleWindow();
          renderWidget();
          showToast('Расписание импортировано');
        } catch(err){
          showToast('Не удалось прочитать файл: ' + err.message, true);
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    });
  }
}

/* ---------------------------------------------------------
   17. XP-модалка подтверждения
   --------------------------------------------------------- */
let pendingConfirm = null;

function confirmDelete(text, onYes){
  const overlay = $('delete-modal-overlay');
  const textEl = $('delete-modal-text');
  if (!overlay){ if (window.confirm(text)) onYes(); return; }
  if (textEl) textEl.textContent = text;
  pendingConfirm = onYes;
  overlay.classList.remove('hidden');
}

function closeConfirm(){
  const overlay = $('delete-modal-overlay');
  if (overlay) overlay.classList.add('hidden');
  pendingConfirm = null;
}

function initDeleteModal(){
  const yes = $('delete-modal-yes');
  const no = $('delete-modal-no');
  const x = $('delete-modal-x');
  if (yes) yes.addEventListener('click', function(){
    const fn = pendingConfirm;
    closeConfirm();
    if (fn) fn();
  });
  if (no) no.addEventListener('click', closeConfirm);
  if (x) x.addEventListener('click', closeConfirm);
}

/* ---------------------------------------------------------
   18. Конспекты (Markdown)
   --------------------------------------------------------- */
function renderMarkdown(src){
  const lines = String(src || '').replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let inCode = false, listType = null, paragraph = [];

  function flushParagraph(){
    if (paragraph.length){
      out.push('<p>' + inline(paragraph.join(' ')) + '</p>');
      paragraph = [];
    }
  }
  function closeList(){
    if (listType){ out.push(listType === 'ul' ? '</ul>' : '</ol>'); listType = null; }
  }
  function inline(text){
    return escapeHtml(text)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
      .replace(/~~([^~]+)~~/g, '<del>$1</del>')
      .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  }

  lines.forEach(function(rawLine){
    const line = rawLine.replace(/\s+$/, '');

    if (/^```/.test(line)){
      flushParagraph(); closeList();
      out.push(inCode ? '</code></pre>' : '<pre><code>');
      inCode = !inCode;
      return;
    }
    if (inCode){ out.push(escapeHtml(rawLine)); return; }

    if (!line.trim()){ flushParagraph(); closeList(); return; }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading){
      flushParagraph(); closeList();
      const level = heading[1].length;
      out.push('<h' + level + '>' + inline(heading[2]) + '</h' + level + '>');
      return;
    }
    if (/^\s*([-*_])\1{2,}\s*$/.test(line)){
      flushParagraph(); closeList();
      out.push('<hr>');
      return;
    }
    const quote = line.match(/^>\s?(.*)$/);
    if (quote){
      flushParagraph(); closeList();
      out.push('<blockquote>' + inline(quote[1]) + '</blockquote>');
      return;
    }
    const ul = line.match(/^\s*[-*+]\s+(.*)$/);
    if (ul){
      flushParagraph();
      if (listType !== 'ul'){ closeList(); out.push('<ul>'); listType = 'ul'; }
      out.push('<li>' + inline(ul[1]) + '</li>');
      return;
    }
    const ol = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (ol){
      flushParagraph();
      if (listType !== 'ol'){ closeList(); out.push('<ol>'); listType = 'ol'; }
      out.push('<li>' + inline(ol[1]) + '</li>');
      return;
    }
    closeList();
    paragraph.push(line.trim());
  });

  flushParagraph();
  closeList();
  if (inCode) out.push('</code></pre>');
  return out.join('\n');
}

function currentNote(){
  return State.notes.find(function(n){ return n.id === State.selectedNoteId; }) || null;
}

function renderNotesList(){
  const list = $('notes-list');
  if (!list) return;
  list.innerHTML = '';
  if (!State.notes.length){
    const empty = document.createElement('div');
    empty.className = 'notes-empty';
    empty.textContent = 'Конспектов пока нет';
    list.appendChild(empty);
    return;
  }
  State.notes.forEach(function(note){
    const item = document.createElement('div');
    item.className = 'note-item' + (note.id === State.selectedNoteId ? ' active' : '');
    item.textContent = note.title || 'Без названия';
    item.title = note.title || 'Без названия';
    item.addEventListener('click', function(){ selectNote(note.id); });
    list.appendChild(item);
  });
}

function selectNote(id){
  State.selectedNoteId = id;
  const note = currentNote();
  const titleInput = $('notes-title-input');
  const editor = $('notes-editor');
  if (titleInput) titleInput.value = note ? note.title : '';
  if (editor) editor.value = note ? note.body : '';
  updateNotesPreview();
  renderNotesList();
}

function updateNotesPreview(){
  const preview = $('notes-preview');
  const editor = $('notes-editor');
  if (!preview) return;
  const src = editor ? editor.value : '';
  preview.innerHTML = src.trim()
    ? renderMarkdown(src)
    : '<div class="notes-empty">Здесь появится оформленный текст конспекта</div>';
}

function persistCurrentNote(){
  const note = currentNote();
  if (!note) return;
  const titleInput = $('notes-title-input');
  const editor = $('notes-editor');
  note.title = titleInput ? titleInput.value.trim() : note.title;
  note.body = editor ? editor.value : note.body;
  note.updatedAt = Date.now();
  saveNotes();
}

function createNote(){
  const note = { id: uid('note'), title: 'Новый конспект', body: '# Новый конспект\n\n', updatedAt: Date.now() };
  State.notes.unshift(note);
  saveNotes();
  selectNote(note.id);
  const titleInput = $('notes-title-input');
  if (titleInput) titleInput.select();
}

function initNotes(){
  const newBtn = $('notes-new');
  const editor = $('notes-editor');
  const titleInput = $('notes-title-input');
  const exportBtn = $('notes-export');
  const deleteBtn = $('notes-delete');
  const importBtn = $('notes-import');
  const importInput = $('notes-import-input');

  if (newBtn) newBtn.addEventListener('click', createNote);

  if (editor) editor.addEventListener('input', function(){
    updateNotesPreview();
    persistCurrentNote();
  });
  if (titleInput) titleInput.addEventListener('input', function(){
    persistCurrentNote();
    renderNotesList();
  });

  if (exportBtn) exportBtn.addEventListener('click', function(){
    const note = currentNote();
    if (!note){ showToast('Сначала выберите конспект', true); return; }
    const safe = (note.title || 'konspekt').replace(/[^\wа-яА-ЯёЁ\- ]+/g, '').trim() || 'konspekt';
    downloadFile(safe + '.md', note.body, 'text/markdown;charset=utf-8');
  });

  if (deleteBtn) deleteBtn.addEventListener('click', function(){
    const note = currentNote();
    if (!note){ showToast('Сначала выберите конспект', true); return; }
    confirmDelete('Удалить конспект «' + (note.title || 'Без названия') + '» без возможности восстановления?', function(){
      State.notes = State.notes.filter(function(n){ return n.id !== note.id; });
      saveNotes();
      State.selectedNoteId = State.notes.length ? State.notes[0].id : null;
      selectNote(State.selectedNoteId);
      showToast('Конспект удалён');
    });
  });

  if (importBtn && importInput){
    importBtn.addEventListener('click', function(){ importInput.click(); });
    importInput.addEventListener('change', function(e){
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(){
        const note = {
          id: uid('note'),
          title: file.name.replace(/\.md$/i, ''),
          body: String(reader.result),
          updatedAt: Date.now()
        };
        State.notes.unshift(note);
        saveNotes();
        selectNote(note.id);
        showToast('Конспект импортирован');
      };
      reader.readAsText(file);
      e.target.value = '';
    });
  }

  renderNotesList();
  if (State.selectedNoteId) selectNote(State.selectedNoteId);
  else updateNotesPreview();
}

/* ---------------------------------------------------------
   19. Панель управления (настройки)
   --------------------------------------------------------- */
function fillSettingsForm(){
  const s = State.settings;
  const city = $('set-city');
  const home = $('set-home-address');
  const study = $('set-study-address');
  if (city) city.value = s.city || '';
  if (home) home.value = s.homeAddress || '';
  if (study) study.value = s.studyAddress || '';
  showResolved('home-resolved', s.homeLat, s.homeLon);
  showResolved('study-resolved', s.studyLat, s.studyLon);
}

function showResolved(elId, lat, lon){
  const el = $(elId);
  if (!el) return;
  el.textContent = (lat && lon) ? ('Координаты: ' + Number(lat).toFixed(5) + ', ' + Number(lon).toFixed(5)) : '';
}

/* Адрес -> координаты через TomTom Search */
async function geocodeAddress(query){
  const url = 'https://api.tomtom.com/search/2/geocode/' + encodeURIComponent(query) +
              '.json?key=' + TOMTOM_API_KEY + '&limit=1&language=ru-RU';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Сервис поиска адресов недоступен');
  const data = await res.json();
  if (!data.results || !data.results.length) throw new Error('Адрес не найден');
  const r = data.results[0];
  return { lat: r.position.lat, lon: r.position.lon, address: r.address.freeformAddress };
}

async function resolveAddressField(which){
  const isHome = which === 'home';
  const input = $(isHome ? 'set-home-address' : 'set-study-address');
  const resolvedId = isHome ? 'home-resolved' : 'study-resolved';
  const query = input ? input.value.trim() : '';
  if (!query){ showToast('Сначала введите адрес', true); return; }

  const el = $(resolvedId);
  if (el) el.textContent = 'Ищу адрес…';
  try {
    const found = await geocodeAddress(query);
    if (isHome){
      State.settings.homeLat = found.lat; State.settings.homeLon = found.lon;
      State.settings.homeAddress = found.address;
    } else {
      State.settings.studyLat = found.lat; State.settings.studyLon = found.lon;
      State.settings.studyAddress = found.address;
    }
    if (input) input.value = found.address;
    saveSettings();
    showResolved(resolvedId, found.lat, found.lon);
  } catch(e){
    if (el) el.textContent = 'Не найдено: ' + e.message;
  }
}

async function gpsAddressField(which){
  const isHome = which === 'home';
  const resolvedId = isHome ? 'home-resolved' : 'study-resolved';
  const input = $(isHome ? 'set-home-address' : 'set-study-address');
  const el = $(resolvedId);
  if (el) el.textContent = 'Определяю местоположение…';
  try {
    const coords = await getPosition();
    let label = '';
    try { label = (await reverseGeocode(coords.latitude, coords.longitude)).freeform; } catch(e){}
    if (isHome){
      State.settings.homeLat = coords.latitude; State.settings.homeLon = coords.longitude;
      if (label) State.settings.homeAddress = label;
    } else {
      State.settings.studyLat = coords.latitude; State.settings.studyLon = coords.longitude;
      if (label) State.settings.studyAddress = label;
    }
    if (input && label) input.value = label;
    saveSettings();
    showResolved(resolvedId, coords.latitude, coords.longitude);
  } catch(e){
    if (el) el.textContent = e.message;
  }
}

function initSettingsWindow(){
  const form = $('settings-form');
  if (!form) return;

  const bind = function(id, fn){ const b = $(id); if (b) b.addEventListener('click', fn); };
  bind('home-find-btn',  function(){ resolveAddressField('home'); });
  bind('home-gps-btn',   function(){ gpsAddressField('home'); });
  bind('study-find-btn', function(){ resolveAddressField('study'); });
  bind('study-gps-btn',  function(){ gpsAddressField('study'); });

  form.addEventListener('submit', async function(e){
    e.preventDefault();
    const cityInput = $('set-city');
    const newCity = cityInput ? cityInput.value.trim() : '';
    const cityChanged = newCity !== State.settings.city;
    State.settings.city = newCity;

    // Адрес введён, но координаты ещё не найдены — досчитываем на лету
    const homeInput = $('set-home-address');
    const studyInput = $('set-study-address');
    if (homeInput && homeInput.value.trim() && !State.settings.homeLat) await resolveAddressField('home');
    if (studyInput && studyInput.value.trim() && !State.settings.studyLat) await resolveAddressField('study');

    saveSettings();
    closeWindowByApp('settings');
    showToast('Настройки применены');

    if (cityChanged || !State.weather) await fetchWeather();
    if (State.settings.homeLat && State.settings.studyLat) fetchTraffic();
  });

  const cancel = $('settings-cancel');
  if (cancel) cancel.addEventListener('click', function(){
    fillSettingsForm();
    closeWindowByApp('settings');
  });
}

/* ---------------------------------------------------------
   20. Папка «Щитпост»
   --------------------------------------------------------- */
function renderShitpostGallery(){
  const gallery = $('shitpost-gallery');
  if (!gallery) return;
  gallery.innerHTML = '';

  const addBtn = $('shitpost-add-btn');
  if (addBtn) addBtn.style.display = State.isAdmin ? 'inline-block' : 'none';

  if (!State.memes.length){
    gallery.innerHTML = '<div class="shitpost-empty">' +
      (State.isAdmin ? 'Мемов пока нет. Нажмите «+ Добавить мем».' : 'Мемов пока нет.') +
      '</div>';
    return;
  }

  State.memes.forEach(function(meme){
    const item = document.createElement('div');
    item.className = 'meme-item';
    item.innerHTML =
      '<img src="' + escapeHtml(meme.url) + '" alt="' + escapeHtml(meme.caption || 'мем') + '" loading="lazy">' +
      (meme.caption ? '<div class="meme-caption">' + escapeHtml(meme.caption) + '</div>' : '') +
      (State.isAdmin ? '<div class="meme-actions"><button type="button" title="Удалить">&#10005;</button></div>' : '');

    item.querySelector('img').addEventListener('click', function(){
      window.open(meme.url, '_blank', 'noopener');
    });
    if (State.isAdmin){
      item.querySelector('.meme-actions button').addEventListener('click', function(e){
        e.stopPropagation();
        confirmDelete('Удалить этот мем?', function(){ removeMeme(meme); });
      });
    }
    gallery.appendChild(item);
  });
}

async function addMemeByUrl(url, caption){
  url = String(url || '').trim();
  if (!url) return;
  if (!/^https?:\/\//i.test(url)){ showToast('Ссылка должна начинаться с http:// или https://', true); return; }

  let record = { id: uid('meme'), url: url, caption: caption || '' };
  if (DB.ready){
    try {
      const saved = await DB.addMeme(url, caption);
      if (saved) record = saved;
    } catch(e){ showToast('Не удалось записать в общую базу: ' + e.message, true); return; }
  }
  State.memes.unshift(record);
  Store.save(LS_KEYS.memes, State.memes);
  renderShitpostGallery();
  renderAdminMemes();
  showToast('Мем добавлен');
}

async function removeMeme(meme){
  if (DB.ready && meme.id && String(meme.id).indexOf('meme-') !== 0){
    try { await DB.deleteMeme(meme.id); }
    catch(e){ showToast('Не удалось удалить из базы: ' + e.message, true); return; }
  }
  State.memes = State.memes.filter(function(m){ return m !== meme; });
  Store.save(LS_KEYS.memes, State.memes);
  renderShitpostGallery();
  renderAdminMemes();
  showToast('Мем удалён');
}

async function uploadMeme(file){
  if (!file) return;
  if (!DB.ready){
    showToast('Загрузка файлов требует подключённой базы. Добавьте мем по ссылке.', true);
    return;
  }
  showToast('Загружаю ' + file.name + '…');
  try {
    const url = await DB.uploadMemeFile(file);
    await addMemeByUrl(url, file.name.replace(/\.[^.]+$/, ''));
  } catch(e){
    showToast('Ошибка загрузки: ' + e.message, true);
  }
}

function promptMemeUrl(){
  const url = window.prompt('Ссылка на картинку (https://…):', '');
  if (url === null) return;
  const caption = window.prompt('Подпись (можно оставить пустой):', '') || '';
  addMemeByUrl(url, caption.trim());
}

function initShitpost(){
  const refresh = $('shitpost-refresh');
  const addBtn = $('shitpost-add-btn');
  const fileInput = $('shitpost-file-input');

  if (refresh) refresh.addEventListener('click', async function(){
    await loadMemes();
    renderShitpostGallery();
    showToast('Список мемов обновлён');
  });

  if (addBtn) addBtn.addEventListener('click', function(){
    if (DB.ready && fileInput) fileInput.click();
    else promptMemeUrl();
  });

  if (fileInput) fileInput.addEventListener('change', function(e){
    uploadMeme(e.target.files[0]);
    e.target.value = '';
  });
}

/* ---------------------------------------------------------
   21. Админ-панель
   --------------------------------------------------------- */
function renderAdminMemes(){
  const list = $('admin-meme-list');
  if (!list) return;
  list.innerHTML = '';
  if (!State.memes.length){
    const li = document.createElement('li');
    li.textContent = 'Список пуст';
    list.appendChild(li);
    return;
  }
  State.memes.forEach(function(meme){
    const li = document.createElement('li');
    const span = document.createElement('span');
    span.className = 'admin-meme-url';
    span.textContent = meme.caption || meme.url;
    span.title = meme.url;
    li.appendChild(span);
    const del = document.createElement('button');
    del.type = 'button';
    del.textContent = '✕';
    del.title = 'Удалить';
    del.addEventListener('click', function(){
      confirmDelete('Удалить этот мем?', function(){ removeMeme(meme); });
    });
    li.appendChild(del);
    list.appendChild(li);
  });
}

/* ---------------------------------------------------------
   21b. Электронный журнал посещаемости (только для старосты)

   Ключевое решение: запись НЕ ссылается на id пары из расписания.
   При сохранении в неё «снимком» кладутся предмет/время/кабинет —
   поэтому переименование или удаление пары в расписании никогда
   не портит уже сохранённую историю. Ключ записи — дата + время
   начала (у группы не бывает двух разных пар одновременно).
   --------------------------------------------------------- */
State.attendanceLoaded = null; // текущая загруженная запись (снимок + present)

function attendanceLocalKey(date, start){ return date + '|' + start; }

function attendanceLocalAll(){ return Store.load(LS_KEYS.attendance, {}); }

/* Список пар выбранного дня/четности в select #att-lesson — только
   чтобы удобно выбрать предмет/время, на сохранённые записи не влияет */
function initAttendanceLessonOptions(){
  const daySel = $('att-day'); const paritySel = $('att-parity'); const lessonSel = $('att-lesson');
  if (!daySel || !paritySel || !lessonSel) return;
  const dayKey = daySel.value; const parity = paritySel.value;
  const lessons = ((State.schedule[parity] || {})[dayKey] || [])
    .slice().sort(function(a, b){ return a.start.localeCompare(b.start); });
  lessonSel.innerHTML = '';
  if (!lessons.length){
    lessonSel.innerHTML = '<option value="">Пар нет</option>';
    return;
  }
  lessons.forEach(function(lesson){
    const opt = document.createElement('option');
    opt.value = lesson.id;
    opt.textContent = lesson.start + ' — ' + lesson.subject;
    lessonSel.appendChild(opt);
  });
}

/* Снимок текущей выбранной в select'е пары (не запись из БД) */
function currentLessonSnapshot(){
  const lessonSel = $('att-lesson'); const daySel = $('att-day'); const paritySel = $('att-parity');
  if (!lessonSel || !lessonSel.value) return null;
  const lessons = ((State.schedule[paritySel.value] || {})[daySel.value] || []);
  const lesson = lessons.find(function(l){ return l.id === lessonSel.value; });
  if (!lesson) return null;
  return { start: lesson.start, end: lesson.end, subject: lesson.subject, room: lesson.room, teacher: lesson.teacher, type: lesson.type };
}

function renderAttendanceMeta(snapshot){
  const meta = $('att-meta');
  if (!meta) return;
  if (!snapshot){ meta.textContent = ''; meta.classList.add('hidden'); return; }
  meta.classList.remove('hidden');
  meta.innerHTML = '<b>' + escapeHtml(snapshot.subject || '—') + '</b> · ' +
    escapeHtml(snapshot.start || '') + (snapshot.end ? '—' + escapeHtml(snapshot.end) : '') +
    (snapshot.room ? ' · ' + escapeHtml(snapshot.room) : '') +
    (snapshot.teacher ? ' · ' + escapeHtml(snapshot.teacher) : '');
}

/* presentSet — имена, отмеченные ПРИСУТСТВУЮЩИМИ в записи (так и хранится
   в БД/локально, формат не меняется). На экране же теперь крестиком
   отмечают только ОТСУТСТВУЮЩИХ — так быстрее, когда почти вся группа
   на месте. hasRecord=false (новая, ещё не сохранённая запись) значит
   «по умолчанию считаем, что присутствуют все», а не «никто не отмечен». */
function renderAttendanceList(presentSet, hasRecord){
  const list = $('att-student-list');
  if (!list) return;
  list.innerHTML = '';
  GROUP_STUDENTS.forEach(function(name){
    const li = document.createElement('li');
    const isAbsent = hasRecord ? !presentSet.has(name) : false;
    li.classList.toggle('is-absent', isAbsent);

    const label = document.createElement('label');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = isAbsent;
    cb.dataset.student = name;
    cb.addEventListener('change', function(){ li.classList.toggle('is-absent', cb.checked); });

    const nameSpan = document.createElement('span');
    nameSpan.className = 'att-student-name';
    nameSpan.textContent = name;

    label.appendChild(cb);
    label.appendChild(nameSpan);
    li.appendChild(label);
    list.appendChild(li);
  });
}

/* Загружает запись для текущей выбранной в дропдауне пары (по дате+времени) */
async function loadAttendanceForSelection(){
  const dateInput = $('att-date');
  const snapshot = currentLessonSnapshot();
  const date = (dateInput && dateInput.value) || formatIsoDate(now());
  if (!dateInput || !snapshot){
    State.attendanceLoaded = null; renderAttendanceMeta(null); renderAttendanceList(new Set(), false);
    renderAttendanceHistory(date);
    return;
  }
  const key = attendanceLocalKey(date, snapshot.start);

  let record = attendanceLocalAll()[key] || null;
  if (DB.ready && State.isAdmin){
    try {
      const remote = await DB.loadAttendance(date, snapshot.start);
      if (remote) record = { present: remote.present, subject: remote.subject, room: remote.room, teacher: remote.teacher, type: remote.lesson_type, end: remote.end_time };
    } catch(e){ showToast('Журнал загружен только локально: ' + e.message, true); }
  }
  State.attendanceLoaded = { date: date, start: snapshot.start };
  renderAttendanceMeta(snapshot);
  renderAttendanceList(new Set((record && record.present) || []), !!record);
  renderAttendanceHistory(date);
}

/* Список уже сохранённых записей за выбранную дату — виден и когда
   соответствующая пара уже переименована/удалена из расписания */
async function renderAttendanceHistory(date){
  const box = $('att-history');
  if (!box) return;

  const localAll = attendanceLocalAll();
  const localEntries = Object.keys(localAll)
    .filter(function(k){ return k.indexOf(date + '|') === 0; })
    .map(function(k){ const rec = localAll[k]; return Object.assign({ start: k.split('|')[1] }, rec); });

  let remoteEntries = [];
  if (DB.ready && State.isAdmin){
    try { remoteEntries = await DB.listAttendanceByDate(date); } catch(e){ /* тихо игнорируем, локальный список всё равно есть */ }
  }
  // сливаем, БД в приоритете при совпадении времени
  const byStart = {};
  localEntries.forEach(function(e){ byStart[e.start] = e; });
  remoteEntries.forEach(function(e){
    byStart[e.start_time] = { start: e.start_time, subject: e.subject, present: e.present };
  });
  const entries = Object.values(byStart).sort(function(a, b){ return a.start.localeCompare(b.start); });

  box.innerHTML = '';
  if (!entries.length){ box.innerHTML = '<div class="att-history-empty">За эту дату записей ещё нет</div>'; return; }
  entries.forEach(function(e){
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'att-history-item';
    btn.innerHTML = '<b>' + escapeHtml(e.start) + '</b> ' + escapeHtml(e.subject || 'без названия') +
      ' <span class="att-history-count">' + ((e.present || []).length) + '/' + GROUP_STUDENTS.length + '</span>';
    btn.addEventListener('click', function(){ loadAttendanceRecordDirectly(date, e); });
    box.appendChild(btn);
  });
}

/* Открыть конкретную сохранённую запись напрямую — даже если пары
   с таким названием/временем больше нет в расписании */
function loadAttendanceRecordDirectly(date, entry){
  State.attendanceLoaded = { date: date, start: entry.start };
  renderAttendanceMeta({ start: entry.start, subject: entry.subject, end: entry.end, room: entry.room, teacher: entry.teacher });
  renderAttendanceList(new Set(entry.present || []), true);
  showToast('Открыта запись ' + entry.start + ' за ' + date);
}

function initAttendanceLogin(){
  const loginBtn = $('att-login-btn');
  const passwordInput = $('att-password');
  const errorDiv = $('att-login-error');
  if (!loginBtn || !passwordInput) return;

  const doLogin = async function(){
    loginBtn.disabled = true;
    const res = await attemptAdminLogin(passwordInput.value);
    loginBtn.disabled = false;
    if (!res.ok){
      if (errorDiv) errorDiv.textContent = res.error;
      passwordInput.select();
      return;
    }
    if (errorDiv) errorDiv.textContent = '';
    passwordInput.value = '';
    setAdminMode(true);
    showToast('Вы вошли как староста');
  };

  loginBtn.addEventListener('click', doLogin);
  passwordInput.addEventListener('keydown', function(e){
    if (e.key === 'Enter'){ e.preventDefault(); doLogin(); }
  });

  const logout = $('att-logout');
  if (logout) logout.addEventListener('click', async function(){
    await DB.signOutAdmin();
    setAdminMode(false);
    showToast('Вы вышли из режима старосты');
  });
}

/* ---------------------------------------------------------
   21b-2. Сводка по группе и экспорт в CSV — чтобы старосте не
   приходилось заходить в Supabase вообще, всё видно и скачивается
   прямо в окне «Журнал».
   --------------------------------------------------------- */
State.attendanceAllRecords = [];      // вся история — для полного CSV
State.attendanceSummaryRecords = [];  // то, что реально попало в сводку/картинку (с учётом периода)

function pluralPairs(n){
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'пара';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'пары';
  return 'пар';
}

function attendanceSummaryRange(){
  const fromEl = $('att-summary-from');
  const toEl = $('att-summary-to');
  return { from: (fromEl && fromEl.value) || '', to: (toEl && toEl.value) || '' };
}

function filterRecordsByRange(records, range){
  if (!range.from && !range.to) return records;
  return records.filter(function(r){
    if (range.from && r.date < range.from) return false;
    if (range.to && r.date > range.to) return false;
    return true;
  });
}

function attendanceRangeLabel(records, range){
  if (!records.length) return 'Нет данных за период';
  const dates = records.map(function(r){ return r.date; });
  const from = range.from || dates.reduce(function(a, b){ return a < b ? a : b; });
  const to = range.to || dates.reduce(function(a, b){ return a > b ? a : b; });
  return from === to ? formatDateHuman(from) : formatDateHuman(from) + ' — ' + formatDateHuman(to);
}

function csvEscapeCell(v){
  v = String(v == null ? '' : v);
  if (/[;\n"]/.test(v)) v = '"' + v.replace(/"/g, '""') + '"';
  return v;
}

function downloadTextFile(filename, text){
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
}

function normalizeAttendanceRecord(r){
  // приводит и локальную, и Supabase-запись к одному виду
  return {
    date: r.date || r.lesson_date,
    start: r.start || r.start_time,
    subject: r.subject || '',
    present: r.present || []
  };
}

async function loadAttendanceSummary(){
  const box = $('att-summary-table');
  if (box) box.innerHTML = '<div class="att-summary-loading">Считаю…</div>';

  let records = [];
  if (DB.ready && State.isAdmin){
    try { records = (await DB.listAllAttendance()).map(normalizeAttendanceRecord); }
    catch(e){ showToast('Сводка из БД недоступна: ' + e.message, true); }
  }
  if (!records.length){
    const all = attendanceLocalAll();
    records = Object.keys(all).map(function(k){
      const rec = normalizeAttendanceRecord(all[k]);
      if (!rec.date) rec.date = k.split('|')[0];
      if (!rec.start) rec.start = k.split('|')[1];
      return rec;
    });
  }
  records.sort(function(a, b){ return (a.date + a.start).localeCompare(b.date + b.start); });
  State.attendanceAllRecords = records;
  const range = attendanceSummaryRange();
  const filtered = filterRecordsByRange(records, range);
  State.attendanceSummaryRecords = filtered;
  renderAttendanceSummaryTable(filtered, range);
}

function attendanceStudentStats(records){
  return GROUP_STUDENTS.map(function(name){
    const count = records.filter(function(r){ return (r.present || []).indexOf(name) !== -1; }).length;
    const missed = records.length - count;
    const pct = records.length ? Math.round((count / records.length) * 100) : 0;
    return { name: name, count: count, missed: missed, pct: pct };
  }).sort(function(a, b){ return a.pct - b.pct; }); // сначала те, у кого хуже с посещаемостью
}

function renderAttendanceSummaryTable(records, range){
  const box = $('att-summary-table');
  if (!box) return;
  if (!records.length){
    box.innerHTML = '<div class="att-summary-empty">За выбранный период сохранённых пар нет</div>';
    return;
  }
  const rows = attendanceStudentStats(records);

  let html = '<div class="att-summary-period">' + escapeHtml(attendanceRangeLabel(records, range || {})) +
    ' · ' + records.length + ' ' + pluralPairs(records.length) + '</div>';
  html += '<table class="att-summary"><thead><tr>' +
    '<th>Студент</th><th>Был(а)</th><th>Пропусков</th><th>%</th></tr></thead><tbody>';
  rows.forEach(function(r){
    const cls = r.pct < 50 ? 'is-bad' : (r.pct < 80 ? 'is-mid' : 'is-good');
    html += '<tr class="' + cls + '"><td>' + escapeHtml(r.name) + '</td>' +
      '<td>' + r.count + '/' + records.length + '</td>' +
      '<td>' + r.missed + '</td><td>' + r.pct + '%</td></tr>';
  });
  html += '</tbody></table>';
  box.innerHTML = html;
}

function exportAttendanceCSV(){
  const records = (State.attendanceSummaryRecords && State.attendanceSummaryRecords.length)
    ? State.attendanceSummaryRecords : State.attendanceAllRecords;
  if (!records || !records.length){ showToast('Сначала нажмите «Обновить сводку»', true); return; }

  let csv = 'Дата;Время;Предмет;Присутствовало;Список присутствовавших\n';
  records.forEach(function(r){
    csv += [r.date, r.start, r.subject, (r.present || []).length, (r.present || []).join(', ')]
      .map(csvEscapeCell).join(';') + '\n';
  });
  csv += '\nСтудент;Посещений;Пропусков;Всего пар;%\n';
  attendanceStudentStats(records).forEach(function(r){
    csv += [r.name, r.count, r.missed, records.length, r.pct + '%'].map(csvEscapeCell).join(';') + '\n';
  });

  downloadTextFile('poseshaemost_' + formatIsoDate(now()) + '.csv', '\uFEFF' + csv);
}

/* Готовая «карточка» сводки в виде PNG — можно сразу кинуть в чат группы,
   без вставки таблицы руками. Рисуется на canvas, без внешних библиотек. */
function exportAttendanceImage(){
  const records = State.attendanceSummaryRecords;
  if (!records || !records.length){ showToast('Сначала нажмите «Обновить сводку»', true); return; }

  const rows = attendanceStudentStats(records);
  const range = attendanceSummaryRange();
  const periodLabel = attendanceRangeLabel(records, range);

  const rowH = 34, headH = 108, padX = 24, width = 560;
  const height = headH + rows.length * rowH + 30;

  const canvas = document.createElement('canvas');
  const scale = 2; // чётче на ретине/телефонах
  canvas.width = width * scale; canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);

  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, '#eaf3ff'); bg.addColorStop(1, '#d7e6fb');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#12305e';
  ctx.font = '700 20px "Segoe UI", Arial, sans-serif';
  ctx.fillText('Посещаемость группы', padX, 34);
  ctx.fillStyle = '#4a6a9a';
  ctx.font = '600 13px "Segoe UI", Arial, sans-serif';
  ctx.fillText(periodLabel + ' · ' + records.length + ' ' + pluralPairs(records.length), padX, 54);

  const colName = padX, colCount = width - 210, colMissed = width - 130, colPct = width - 58;
  ctx.fillStyle = '#6b7d9c';
  ctx.font = '700 11px "Segoe UI", Arial, sans-serif';
  ctx.fillText('СТУДЕНТ', colName, headH - 14);
  ctx.fillText('БЫЛ(А)', colCount, headH - 14);
  ctx.fillText('ПРОПУСК', colMissed, headH - 14);
  ctx.fillText('%', colPct, headH - 14);
  ctx.strokeStyle = 'rgba(74,106,154,.35)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(padX - 12, headH - 6); ctx.lineTo(width - padX + 12, headH - 6); ctx.stroke();

  rows.forEach(function(r, i){
    const y = headH + i * rowH;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.22)';
    ctx.fillRect(padX - 12, y, width - (padX - 12) * 2, rowH - 4);

    const color = r.pct < 50 ? '#a3241a' : (r.pct < 80 ? '#8a5c00' : '#217a34');
    ctx.fillStyle = '#1c2b45';
    ctx.font = '600 13px "Segoe UI", Arial, sans-serif';
    ctx.fillText(r.name, colName, y + rowH / 2 + 2, colCount - colName - 14);
    ctx.fillStyle = color; ctx.font = '700 13px "Segoe UI", Arial, sans-serif';
    ctx.fillText(r.count + '/' + records.length, colCount, y + rowH / 2 + 2);
    ctx.fillText(String(r.missed), colMissed, y + rowH / 2 + 2);
    ctx.fillText(r.pct + '%', colPct, y + rowH / 2 + 2);
  });

  ctx.fillStyle = '#7d95c0';
  ctx.font = '600 10px "Segoe UI", Arial, sans-serif';
  ctx.fillText('Study OS', padX, height - 10);

  canvas.toBlob(function(blob){
    if (!blob){ showToast('Не удалось собрать картинку', true); return; }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'poseshaemost_' + formatIsoDate(now()) + '.png';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
  }, 'image/png');
}

function initAttendanceSummary(){
  const refreshBtn = $('att-summary-refresh');
  const exportBtn = $('att-summary-export');
  const imageBtn = $('att-summary-image');
  const fromEl = $('att-summary-from');
  const toEl = $('att-summary-to');
  if (refreshBtn) refreshBtn.addEventListener('click', loadAttendanceSummary);
  if (exportBtn) exportBtn.addEventListener('click', exportAttendanceCSV);
  if (imageBtn) imageBtn.addEventListener('click', exportAttendanceImage);
  [fromEl, toEl].forEach(function(el){ if (el) el.addEventListener('change', loadAttendanceSummary); });
}

function initAttendancePanel(){
  const dateInput = $('att-date'); const paritySel = $('att-parity');
  const daySel = $('att-day'); const lessonSel = $('att-lesson');
  const markAllBtn = $('att-mark-all'); const saveBtn = $('att-save');
  if (!dateInput) return;

  const today = now();
  dateInput.value = formatIsoDate(today);
  paritySel.value = getParityForDate(today);
  daySel.value = dayKeyForDate(today) === 'sun' ? 'mon' : dayKeyForDate(today);

  initAttendanceLessonOptions();
  if (State.isAdmin) loadAttendanceForSelection();

  [paritySel, daySel].forEach(function(el){
    el.addEventListener('change', function(){
      initAttendanceLessonOptions();
      loadAttendanceForSelection();
    });
  });
  lessonSel.addEventListener('change', loadAttendanceForSelection);
  dateInput.addEventListener('change', loadAttendanceForSelection);

  // Крестиком отмечают отсутствующих, поэтому «отметить всех» — это
  // на самом деле два разных действия: сбросить все отметки (все на
  // месте) или, наоборот, отметить отсутствие всей группы (пара отменена).
  if (markAllBtn) markAllBtn.addEventListener('click', function(){
    document.querySelectorAll('#att-student-list input[type=checkbox]').forEach(function(cb){
      cb.checked = false;
      cb.dispatchEvent(new Event('change'));
    });
  });
  const markAllAbsentBtn = $('att-mark-all-absent');
  if (markAllAbsentBtn) markAllAbsentBtn.addEventListener('click', function(){
    document.querySelectorAll('#att-student-list input[type=checkbox]').forEach(function(cb){
      cb.checked = true;
      cb.dispatchEvent(new Event('change'));
    });
  });

  if (saveBtn) saveBtn.addEventListener('click', async function(){
    const snapshot = currentLessonSnapshot() ||
      (State.attendanceLoaded ? { start: State.attendanceLoaded.start } : null);
    if (!snapshot){ showToast('Нет пары для выбранного дня', true); return; }
    const date = dateInput.value || formatIsoDate(now());
    // Чекбокс = «отсутствует», присутствующие — все остальные из группы
    const absentNames = Array.from(document.querySelectorAll('#att-student-list input[type=checkbox]:checked'))
      .map(function(cb){ return cb.dataset.student; });
    const present = GROUP_STUDENTS.filter(function(name){ return absentNames.indexOf(name) === -1; });

    const record = {
      date: date, start: snapshot.start, end: snapshot.end || '',
      subject: snapshot.subject || '', room: snapshot.room || '', teacher: snapshot.teacher || '',
      type: snapshot.type || 'seminar', present: present
    };

    const key = attendanceLocalKey(date, snapshot.start);
    const all = attendanceLocalAll();
    all[key] = record;
    Store.save(LS_KEYS.attendance, all);
    State.attendanceLoaded = { date: date, start: snapshot.start };

    if (DB.ready){
      saveBtn.disabled = true;
      try {
        await DB.saveAttendance(record);
        showToast('Посещаемость сохранена в общей базе');
      } catch(e){
        showToast('Сохранено только локально: ' + e.message, true);
      }
      saveBtn.disabled = false;
    } else {
      showToast('Посещаемость сохранена локально');
    }
    renderAttendanceHistory(date);
  });
}

/* ---------------------------------------------------------
   21c. Периоды календаря (сессия/каникулы/практика) — правит админ
   --------------------------------------------------------- */
function renderAdminPeriods(){
  const list = $('admin-period-list');
  if (!list) return;
  list.innerHTML = '';
  if (!State.calendarPeriods.length){
    list.innerHTML = '<li class="admin-period-empty">Периодов пока нет</li>';
    return;
  }
  State.calendarPeriods
    .slice()
    .sort(function(a, b){ return a.start.localeCompare(b.start); })
    .forEach(function(p){
      const li = document.createElement('li');
      li.innerHTML =
        '<span class="admin-period-dot" style="background:' + escapeHtml(p.color) + '"></span>' +
        '<span class="admin-period-text">' + escapeHtml(p.label) + ' &nbsp;<i>' +
          formatDateHuman(p.start) + ' — ' + formatDateHuman(p.end) + '</i></span>' +
        '<button type="button" class="admin-period-delete" title="Удалить">&#10005;</button>';
      li.querySelector('.admin-period-delete').addEventListener('click', function(){
        deleteCalendarPeriod(p);
      });
      list.appendChild(li);
    });
}

function formatDateHuman(iso){
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return iso;
  return pad2(d.getDate()) + '.' + pad2(d.getMonth() + 1) + '.' + d.getFullYear();
}

async function deleteCalendarPeriod(period){
  State.calendarPeriods = State.calendarPeriods.filter(function(p){ return p !== period; });
  Store.save(LS_KEYS.calendarPeriods, State.calendarPeriods);
  renderAdminPeriods();
  renderCalendarGrid();
  if (DB.ready && period.id){
    try { await DB.deletePeriod(period.id); }
    catch(e){ showToast('Удалено только локально: ' + e.message, true); }
  }
}

function initAdminPeriods(){
  const colorSel = $('period-color');
  if (colorSel && !colorSel.options.length){
    PERIOD_COLOR_PRESETS.forEach(function(c){
      const opt = document.createElement('option');
      opt.value = c.value; opt.textContent = c.name;
      colorSel.appendChild(opt);
    });
  }
  renderAdminPeriods();

  const addBtn = $('period-add');
  if (!addBtn) return;
  addBtn.addEventListener('click', async function(){
    const label = $('period-label').value.trim();
    const color = $('period-color').value;
    const start = $('period-start').value;
    const end = $('period-end').value;
    if (!label || !start || !end){ showToast('Заполните название и обе даты', true); return; }
    if (end < start){ showToast('Дата конца раньше даты начала', true); return; }

    const period = { label: label, color: color, start: start, end: end };
    addBtn.disabled = true;
    if (DB.ready){
      try {
        const saved = await DB.addPeriod(period);
        period.id = saved.id;
        showToast('Период сохранён в общей базе');
      } catch(e){
        showToast('Сохранено только локально: ' + e.message, true);
      }
    } else {
      showToast('Период сохранён локально');
    }
    addBtn.disabled = false;

    State.calendarPeriods.push(period);
    Store.save(LS_KEYS.calendarPeriods, State.calendarPeriods);
    renderAdminPeriods();
    renderCalendarGrid();

    $('period-label').value = '';
    $('period-start').value = '';
    $('period-end').value = '';
  });
}

function setAdminMode(on){
  State.isAdmin = on;
  const loginDiv = $('admin-login');
  const panelDiv = $('admin-panel');
  if (loginDiv) loginDiv.style.display = on ? 'none' : 'block';
  if (panelDiv) panelDiv.style.display = on ? 'block' : 'none';
  const attLogin = $('att-login');
  const attPanel = $('att-panel');
  if (attLogin) attLogin.style.display = on ? 'none' : 'block';
  if (attPanel) attPanel.style.display = on ? 'block' : 'none';
  const addBtn = $('shitpost-add-btn');
  if (addBtn) addBtn.style.display = on ? 'inline-block' : 'none';
  document.body.classList.toggle('is-admin', on);
  renderScheduleWindow();
  renderShitpostGallery();
  if (on){ renderAdminMemes(); initAttendanceLessonOptions(); loadAttendanceForSelection(); loadAttendanceSummary(); }
  document.dispatchEvent(new CustomEvent('study-os:admin-mode-changed', { detail: { on: on } }));
}

/* Общая проверка пароля для обоих окон (админка и журнал) —
   один и тот же вход открывает сессию Supabase на обоих. */
async function attemptAdminLogin(password){
  if (password !== ADMIN_PASSWORD) return { ok: false, error: 'Неверный пароль' };
  if (DB.ready){
    try { await DB.signInAdmin(password); }
    catch(e){ return { ok: false, error: 'База отклонила вход: ' + e.message }; }
  }
  return { ok: true };
}

function initAdminPanel(){
  const loginBtn = $('admin-login-btn');
  const passwordInput = $('admin-password');
  const errorDiv = $('admin-login-error');
  if (!loginBtn || !passwordInput) return;

  const doLogin = async function(){
    loginBtn.disabled = true;
    const res = await attemptAdminLogin(passwordInput.value);
    loginBtn.disabled = false;
    if (!res.ok){
      if (errorDiv) errorDiv.textContent = res.error;
      passwordInput.select();
      return;
    }
    if (errorDiv) errorDiv.textContent = '';
    passwordInput.value = '';
    setAdminMode(true);
    showToast('Вы вошли как администратор');
  };

  loginBtn.addEventListener('click', doLogin);
  passwordInput.addEventListener('keydown', function(e){
    if (e.key === 'Enter'){ e.preventDefault(); doLogin(); }
  });

  const logout = $('admin-logout');
  if (logout) logout.addEventListener('click', async function(){
    await DB.signOutAdmin();
    setAdminMode(false);
    showToast('Вы вышли из админ-режима');
  });

  const openAtt = $('admin-open-attendance');
  if (openAtt) openAtt.addEventListener('click', function(){ openApp('attendance'); });

  initAdminPeriods();

  const sync = $('admin-sync-schedule');
  if (sync) sync.addEventListener('click', async function(){
    if (!DB.ready){ showToast('Общая база не подключена — расписание хранится локально.', true); return; }
    sync.disabled = true;
    try {
      await DB.saveSchedule(State.schedule);
      showToast('Расписание выгружено в общую базу');
    } catch(e){
      showToast('Ошибка: ' + e.message, true);
    }
    sync.disabled = false;
  });

  const addMemeBtn = $('admin-add-meme-btn');
  const memeFile = $('admin-meme-file');
  if (addMemeBtn && memeFile){
    addMemeBtn.addEventListener('click', function(){
      if (DB.ready) memeFile.click();
      else showToast('Загрузка файлов требует базы. Используйте «Добавить по ссылке».', true);
    });
    memeFile.addEventListener('change', function(e){
      uploadMeme(e.target.files[0]);
      e.target.value = '';
    });
  }
  const addUrlBtn = $('admin-add-meme-url');
  if (addUrlBtn) addUrlBtn.addEventListener('click', promptMemeUrl);

  const clearBtn = $('admin-clear-memes');
  if (clearBtn) clearBtn.addEventListener('click', function(){
    confirmDelete('Удалить все мемы из папки «Щитпост»?', async function(){
      const copy = State.memes.slice();
      for (let i = 0; i < copy.length; i++) await removeMeme(copy[i]);
      showToast('Папка очищена');
    });
  });

  renderAdminMemes();
}

/* ---------------------------------------------------------
   22. Оконный менеджер
   --------------------------------------------------------- */
function bringToFront(win){
  State.zCounter += 1;
  win.style.zIndex = State.zCounter;
}

/* Не даём окну вылезти за экран — важно на телефонах и при повороте */
function clampWindow(win){
  if (isMobile()) return;                       // на мобильных размеры задаёт CSS
  const taskbarH = 48;
  const maxW = window.innerWidth - 8;
  const maxH = window.innerHeight - taskbarH - 8;
  const rect = win.getBoundingClientRect();

  if (rect.width > maxW) win.style.width = maxW + 'px';
  if (rect.height > maxH) win.style.height = maxH + 'px';

  const w = win.getBoundingClientRect();
  let left = w.left, top = w.top;
  left = Math.min(left, window.innerWidth - Math.min(w.width, maxW) - 4);
  top = Math.min(top, window.innerHeight - taskbarH - 40);
  win.style.left = Math.max(0, left) + 'px';
  win.style.top = Math.max(0, top) + 'px';
}

let cascadeStep = 0;
function placeWindow(win){
  if (isMobile() || win.dataset.placed === '1') return;
  const offset = (cascadeStep % 6) * 18;
  cascadeStep += 1;
  win.style.left = (40 + offset) + 'px';
  win.style.top = (28 + offset) + 'px';
  win.dataset.placed = '1';
}

function showWindow(win){
  if (!win) return;
  win.classList.remove('hidden');
  placeWindow(win);
  clampWindow(win);
  bringToFront(win);
}

function closeWindowByApp(appKey){
  const win = $(APP_WINDOW_IDS[appKey]);
  if (!win) return;
  win.classList.add('hidden');
  State.openApps.delete(appKey);
  removeTaskbarButton(appKey);
}

function openApp(appKey){
  const winId = APP_WINDOW_IDS[appKey];
  if (!winId) return;
  const win = $(winId);
  if (!win) return;

  showWindow(win);
  closeStartMenu();

  if (appKey !== 'lesson-form'){
    State.openApps.add(appKey);
    addTaskbarButton(appKey);
    setActiveTaskbarButton(appKey);
  }

  if (appKey === 'schedule'){ syncScheduleTabs(); renderScheduleWindow(); }
  if (appKey === 'notes'){ renderNotesList(); if (State.selectedNoteId) selectNote(State.selectedNoteId); }
  if (appKey === 'weather'){ fetchWeather(); fetchTraffic(); }
  if (appKey === 'settings'){ fillSettingsForm(); }
  if (appKey === 'shitpost'){ renderShitpostGallery(); }
  if (appKey === 'admin'){ if (State.isAdmin){ renderAdminMemes(); } }
  if (appKey === 'attendance'){ if (State.isAdmin){ initAttendanceLessonOptions(); loadAttendanceForSelection(); loadAttendanceSummary(); } }
}

/* ---- Панель задач ---- */
function addTaskbarButton(appKey){
  const bar = $('taskbar-apps');
  if (!bar || bar.querySelector('[data-app="' + appKey + '"]')) return;
  const btn = document.createElement('button');
  btn.className = 'taskbar-app-btn';
  btn.dataset.app = appKey;
  btn.innerHTML = '<img src="' + APP_ICONS[appKey] + '" alt=""><span>' + APP_TITLES[appKey] + '</span>';
  btn.addEventListener('click', function(){
    const win = $(APP_WINDOW_IDS[appKey]);
    if (!win) return;
    if (win.classList.contains('hidden')){
      win.classList.remove('hidden');
      bringToFront(win);
      setActiveTaskbarButton(appKey);
    } else if (btn.classList.contains('active')){
      win.classList.add('hidden');              // повторный клик — свернуть
      btn.classList.remove('active');
    } else {
      bringToFront(win);
      setActiveTaskbarButton(appKey);
    }
  });
  bar.appendChild(btn);
}

function removeTaskbarButton(appKey){
  const bar = $('taskbar-apps');
  if (!bar) return;
  const btn = bar.querySelector('[data-app="' + appKey + '"]');
  if (btn) bar.removeChild(btn);
}

function setActiveTaskbarButton(appKey){
  const bar = $('taskbar-apps');
  if (!bar) return;
  bar.querySelectorAll('.taskbar-app-btn').forEach(function(b){
    b.classList.toggle('active', b.dataset.app === appKey);
  });
}

/* ---- Заголовок окна: свернуть / развернуть / закрыть + перетаскивание ---- */
function initWindowChrome(){
  document.querySelectorAll('.xp-window').forEach(function(win){
    const appKey = win.dataset.app;

    win.addEventListener('mousedown', function(){ bringToFront(win); });
    win.addEventListener('touchstart', function(){ bringToFront(win); }, { passive: true });

    const min = win.querySelector('.xp-btn-min');
    if (min) min.addEventListener('click', function(e){
      e.stopPropagation();
      win.classList.add('hidden');
      const btn = document.querySelector('.taskbar-app-btn[data-app="' + appKey + '"]');
      if (btn) btn.classList.remove('active');
    });

    const max = win.querySelector('.xp-btn-max');
    if (max) max.addEventListener('click', function(e){
      e.stopPropagation();
      win.classList.toggle('maximized');
    });

    const close = win.querySelector('.xp-btn-close');
    if (close) close.addEventListener('click', function(e){
      e.stopPropagation();
      if (appKey === 'lesson-form') win.classList.add('hidden');
      else closeWindowByApp(appKey);
    });

    const titlebar = win.querySelector('.xp-titlebar');
    if (titlebar){
      makeDraggable(win, titlebar);
      titlebar.addEventListener('dblclick', function(){
        if (!isMobile()) win.classList.toggle('maximized');
      });
    }
    win.querySelectorAll('.resize-handle').forEach(function(handle){
      makeResizable(win, handle);
    });
  });

  window.addEventListener('resize', function(){
    document.querySelectorAll('.xp-window:not(.hidden)').forEach(clampWindow);
  });
}

function pointerFrom(e){
  const p = e.touches && e.touches.length ? e.touches[0] : e;
  return { x: p.clientX, y: p.clientY };
}

function makeDraggable(win, handle){
  let startX = 0, startY = 0, startLeft = 0, startTop = 0, dragging = false;

  function onDown(e){
    // На телефоне окна и так во весь экран — перетаскивание только мешает.
    if (isMobile() || win.classList.contains('maximized')) return;
    if (e.target.closest('.xp-titlebar-buttons')) return;
    const p = pointerFrom(e);
    const rect = win.getBoundingClientRect();
    startX = p.x; startY = p.y;
    startLeft = rect.left; startTop = rect.top;
    dragging = true;
    bringToFront(win);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onUp);
  }
  function onMove(e){
    if (!dragging) return;
    if (e.cancelable) e.preventDefault();
    const p = pointerFrom(e);
    const maxLeft = window.innerWidth - 60;
    const maxTop = window.innerHeight - 60;
    win.style.left = Math.max(-win.offsetWidth + 80, Math.min(maxLeft, startLeft + p.x - startX)) + 'px';
    win.style.top = Math.max(0, Math.min(maxTop, startTop + p.y - startY)) + 'px';
    win.dataset.placed = '1';
  }
  function onUp(){
    dragging = false;
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    document.removeEventListener('touchmove', onMove);
    document.removeEventListener('touchend', onUp);
  }

  handle.addEventListener('mousedown', onDown);
  handle.addEventListener('touchstart', onDown, { passive: true });
}

function makeResizable(win, handle){
  const dirs = handle.className.replace('resize-handle', '').replace('rh-', '').trim();
  let startX = 0, startY = 0, startW = 0, startH = 0, startLeft = 0, startTop = 0, active = false;

  function onDown(e){
    if (isMobile() || win.classList.contains('maximized')) return;
    e.stopPropagation();
    const p = pointerFrom(e);
    const rect = win.getBoundingClientRect();
    startX = p.x; startY = p.y;
    startW = rect.width; startH = rect.height;
    startLeft = rect.left; startTop = rect.top;
    active = true;
    bringToFront(win);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onUp);
  }
  function onMove(e){
    if (!active) return;
    if (e.cancelable) e.preventDefault();
    const p = pointerFrom(e);
    const dx = p.x - startX, dy = p.y - startY;
    const minW = 260, minH = 180;

    if (dirs.indexOf('e') !== -1) win.style.width = Math.max(minW, startW + dx) + 'px';
    if (dirs.indexOf('s') !== -1) win.style.height = Math.max(minH, startH + dy) + 'px';
    if (dirs.indexOf('w') !== -1){
      const w = Math.max(minW, startW - dx);
      win.style.width = w + 'px';
      win.style.left = (startLeft + (startW - w)) + 'px';
    }
    if (dirs.indexOf('n') !== -1){
      const h = Math.max(minH, startH - dy);
      win.style.height = h + 'px';
      win.style.top = (startTop + (startH - h)) + 'px';
    }
    win.dataset.placed = '1';
  }
  function onUp(){
    active = false;
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    document.removeEventListener('touchmove', onMove);
    document.removeEventListener('touchend', onUp);
  }

  handle.addEventListener('mousedown', onDown);
  handle.addEventListener('touchstart', onDown, { passive: true });
}

/* ---- Ярлыки рабочего стола ---- */
function initDesktopIcons(){
  document.querySelectorAll('.desktop-icon[data-app]').forEach(function(icon){
    icon.addEventListener('click', function(){ openApp(icon.dataset.app); });
  });
}

/* ---- Меню «Пуск» ---- */
function closeStartMenu(){
  const menu = $('start-menu');
  const btn = $('start-button');
  if (menu) menu.classList.add('hidden');
  if (btn) btn.classList.remove('active');
}

function initStartMenu(){
  const btn = $('start-button');
  const menu = $('start-menu');
  if (!btn || !menu) return;

  btn.addEventListener('click', function(e){
    e.stopPropagation();
    const willOpen = menu.classList.contains('hidden');
    menu.classList.toggle('hidden', !willOpen);
    btn.classList.toggle('active', willOpen);
  });

  menu.addEventListener('click', function(e){ e.stopPropagation(); });
  document.addEventListener('click', closeStartMenu);

  menu.querySelectorAll('[data-app]').forEach(function(item){
    item.addEventListener('click', function(){ openApp(item.dataset.app); });
  });

  const shutdown = $('shutdown-btn');
  if (shutdown) shutdown.addEventListener('click', function(){
    closeStartMenu();
    const screen = $('shutdown-screen');
    if (screen) screen.classList.remove('hidden');
    setTimeout(function(){
      const desktop = $('desktop');
      if (desktop) desktop.style.display = 'none';
    }, 1600);
  });

  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape'){ closeStartMenu(); closeConfirm(); }
  });
}

/* ---------------------------------------------------------
   23. Инициализация
   --------------------------------------------------------- */
async function init(){
  loadInitialSettings();
  loadInitialNotes();

  // Восстановление админ-сессии Supabase (после перезагрузки страницы)
  const hadSession = await DB.restoreSession();

  await loadInitialSchedule();
  await Promise.all([loadDayNotes(), loadMemes(), loadCalendarPeriods()]);

  State.scheduleActiveParity = getParityForDate(now());

  tickClock();
  setInterval(tickClock, 1000);

  renderWidget();
  initWidgetNav();

  initCalendarPopup();

  initScheduleTabs();
  initLessonForm();
  initScheduleImportExport();
  renderScheduleWindow();

  initNotes();
  initDeleteModal();
  initWeatherWindow();
  initSettingsWindow();
  initAutoDetectCity();
  fillSettingsForm();

  initShitpost();
  initAdminPanel();
  initAttendanceLogin();
  initAttendancePanel();
  initAttendanceSummary();

  initWindowChrome();
  initDesktopIcons();
  initStartMenu();

  if (hadSession) setAdminMode(true);

  initRealtimeSync();

  const cityLabel = $('weather-city-label');
  if (cityLabel) cityLabel.textContent = State.settings.city || '—';

  // Погода: по сохранённому городу, иначе — разовая попытка геолокации
  if (State.settings.city) fetchWeather();
  else autoDetectOnFirstVisit();

  if (State.settings.homeLat && State.settings.studyLat) fetchTraffic();

  // Перерисовка при повороте экрана / смене размера
  layoutDesktop();
  let resizeTimer = null;
  window.addEventListener('resize', function(){
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function(){ renderWidget(); layoutDesktop(); }, 150);
  });
  window.addEventListener('orientationchange', function(){
    setTimeout(layoutDesktop, 300);
  });
  // иконки могут догрузиться позже и изменить высоту ряда
  window.addEventListener('load', layoutDesktop);

  setTimeout(function(){
    const boot = $('boot-screen');
    if (boot) boot.classList.add('fade-out');
  }, 500);
  setTimeout(function(){
    const boot = $('boot-screen');
    if (boot) boot.classList.add('hidden');
  }, 1200);
}

document.addEventListener('DOMContentLoaded', function(){
  init().catch(function(e){
    console.error('Ошибка инициализации:', e);
    const boot = $('boot-screen');
    if (boot) boot.classList.add('hidden');   // не оставляем пользователя на вечной загрузке
    showToast('Ошибка запуска: ' + e.message, true);
  });
});
