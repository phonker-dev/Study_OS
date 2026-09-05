'use strict';
/* =========================================================
   raspisanie XP — app.js
   Единый скрипт: часы, расписание, конспекты, погода/пробки, настройки,
   оконный менеджер, меню «Пуск», панель задач.
   ========================================================= */

/* ---------------------------------------------------------
   1. Константы и утилиты
   --------------------------------------------------------- */
// TomTom API-ключ зашит в коде — обычным студентам (пользователям сайта)
// свой ключ вводить не нужно. Ключ бесплатный, но раз сайт публичный
// (GitHub Pages), он будет виден в исходном коде любому желающему —
// ограничьте его в личном кабинете TomTom по домену сайта, чтобы им
// нельзя было пользоваться с чужих проектов.
// Чтобы сменить/отозвать ключ в будущем — поменяйте только эту строку.
const TOMTOM_API_KEY = 'yL8umJnxsyxwO78ZaeqM7g8PmtdVUaWm';

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DAY_LABELS = {
  mon: 'Понедельник', tue: 'Вторник', wed: 'Среда',
  thu: 'Четверг', fri: 'Пятница', sat: 'Суббота', sun: 'Воскресенье'
};
const DAY_LABELS_SHORT = {
  mon: 'Пн', tue: 'Вт', wed: 'Ср', thu: 'Чт', fri: 'Пт', sat: 'Сб', sun: 'Вс'
};
const MONTH_NAMES = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
const SCHOOL_DAY_KEYS = ['mon','tue','wed','thu','fri','sat']; // расписание — Пн–Сб

const LS_KEYS = {
  schedule: 'rxp_schedule',
  notes: 'rxp_notes',
  settings: 'rxp_settings'
};

// Сайт делается под конкретный регион (Иркутск) — «текущее время» должно
// вычисляться по часовому поясу города, а НЕ по системным настройкам
// устройства посетителя. Меняйте только эту константу, если понадобится
// адаптировать сайт под другой город.
const APP_TIMEZONE = 'Asia/Irkutsk';

// Возвращает Date, чьи локальные компоненты (часы/день недели/дата)
// соответствуют текущему времени в APP_TIMEZONE — независимо от того,
// какой часовой пояс выставлен в браузере пользователя.
function getZonedNow(timeZone){
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
  const parts = {};
  fmt.formatToParts(new Date()).forEach(p => { if (p.type !== 'literal') parts[p.type] = p.value; });
  let hour = parseInt(parts.hour, 10);
  if (hour === 24) hour = 0; // некоторые движки в полночь отдают "24" вместо "00"
  return new Date(
    parseInt(parts.year, 10),
    parseInt(parts.month, 10) - 1,
    parseInt(parts.day, 10),
    hour,
    parseInt(parts.minute, 10),
    parseInt(parts.second, 10)
  );
}

// «Сейчас» по времени Иркутска — использовать вместо new Date() везде,
// где речь идёт о текущем моменте (часы, сегодняшний день, чётность недели).
function now(){
  return getZonedNow(APP_TIMEZONE);
}

function pad2(n){ return String(n).padStart(2, '0'); }

function formatTime24(date){
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function formatDateFull(date){
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth()]}`;
}

function escapeHtml(str){
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function uid(prefix){
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

// Номер ISO-недели года — используется для определения чётности недели
function getISOWeekNumber(date){
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7; // Пн=0 ... Вс=6
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const weekNum = 1 + Math.round(((d - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return weekNum;
}

function getParityForDate(date){
  const week = getISOWeekNumber(date);
  return (week % 2 === 0) ? 'even' : 'odd';
}

function dayKeyForDate(date){
  return DAY_KEYS[date.getDay()];
}

/* ---------------------------------------------------------
   2. Хранилище (LocalStorage)
   --------------------------------------------------------- */
const Store = {
  load(key, fallback){
    try{
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    }catch(e){
      console.warn('Store.load failed for', key, e);
      return fallback;
    }
  },
  save(key, value){
    try{
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    }catch(e){
      console.warn('Store.save failed for', key, e);
      return false;
    }
  }
};

function emptySchedule(){
  const mk = () => ({ mon: [], tue: [], wed: [], thu: [], fri: [], sat: [] });
  return { even: mk(), odd: mk() };
}

/* ---------------------------------------------------------
   3. Состояние приложения
   --------------------------------------------------------- */
const State = {
  schedule: emptySchedule(),
  notes: [],
  settings: { city: '', homeLat: '', homeLon: '', homeAddress: '', studyLat: '', studyLon: '', studyAddress: '' },
  widgetOffsetDays: 0,      // смещение просматриваемого дня от «сегодня» (не сохраняется — сбрасывается при перезагрузке)
  scheduleActiveParity: 'even',
  selectedNoteId: null,
  zCounter: 100,
  openApps: new Set()
};

async function loadInitialSchedule(){
  const saved = Store.load(LS_KEYS.schedule, null);
  if (saved && saved.even && saved.odd){
    State.schedule = saved;
    return;
  }
  // LocalStorage пуст — пробуем подтянуть дефолтное расписание из schedule.json
  try{
    const res = await fetch('schedule.json', { cache: 'no-store' });
    if (res.ok){
      const data = await res.json();
      if (data && data.even && data.odd){
        State.schedule = data;
        Store.save(LS_KEYS.schedule, State.schedule);
        return;
      }
    }
  }catch(e){
    console.warn('Не удалось загрузить schedule.json, используем пустое расписание', e);
  }
  State.schedule = emptySchedule();
}

function loadInitialNotes(){
  State.notes = Store.load(LS_KEYS.notes, []);
}

function loadInitialSettings(){
  State.settings = Store.load(LS_KEYS.settings, State.settings);
}

/* ---------------------------------------------------------
   4. Системный трей: часы (строго 24ч) + погода
   --------------------------------------------------------- */
function tickClock(){
  const el = document.getElementById('tray-clock');
  if (el) el.textContent = formatTime24(now());
}

/* ---------------------------------------------------------
   5. Виджет расписания на рабочем столе
   --------------------------------------------------------- */
function getDisplayedDate(){
  const d = now();
  d.setDate(d.getDate() + State.widgetOffsetDays);
  return d;
}

function renderWidget(){
  const date = getDisplayedDate();
  const dayKey = dayKeyForDate(date);
  const parity = getParityForDate(date);

  document.getElementById('widget-day-name').textContent = DAY_LABELS[dayKey];
  document.getElementById('widget-date-full').textContent = formatDateFull(date);
  document.getElementById('widget-parity-label').textContent =
    parity === 'even' ? 'Четная неделя' : 'Нечетная неделя';

  const todayBadge = document.getElementById('widget-today-badge');
  todayBadge.classList.toggle('hidden', State.widgetOffsetDays !== 0);

  const listEl = document.getElementById('widget-lessons');
  listEl.innerHTML = '';

  if (!SCHOOL_DAY_KEYS.includes(dayKey)){
    listEl.innerHTML = '<div class="widget-empty">Выходной — пар нет</div>';
    return;
  }

  const lessons = (State.schedule[parity] && State.schedule[parity][dayKey]) || [];
  if (lessons.length === 0){
    listEl.innerHTML = '<div class="widget-empty">Пар не найдено</div>';
    return;
  }
  const sorted = [...lessons].sort((a, b) => a.start.localeCompare(b.start));
  sorted.forEach(lesson => {
    const card = document.createElement('div');
    card.className = `widget-lesson type-${lesson.type}`;
    card.innerHTML = `
      <div class="widget-lesson-time">${escapeHtml(lesson.start)} — ${escapeHtml(lesson.end)}</div>
      <div class="widget-lesson-subject">${escapeHtml(lesson.subject)}</div>
      <div class="widget-lesson-meta">${escapeHtml(lesson.room || '')}${lesson.room && lesson.teacher ? ' · ' : ''}${escapeHtml(lesson.teacher || '')}</div>
    `;
    listEl.appendChild(card);
  });
}

function initWidgetNav(){
  document.getElementById('widget-prev').addEventListener('click', () => {
    State.widgetOffsetDays -= 1;
    renderWidget();
  });
  document.getElementById('widget-next').addEventListener('click', () => {
    State.widgetOffsetDays += 1;
    renderWidget();
  });
  document.getElementById('widget-edit-btn').addEventListener('click', () => openApp('schedule'));
}

/* ---------------------------------------------------------
   6. Окно «Расписание» (CRUD)
   --------------------------------------------------------- */
function renderScheduleWindow(){
  const container = document.getElementById('schedule-days');
  container.innerHTML = '';
  const todayKey = dayKeyForDate(now());
  const todayParity = getParityForDate(now());

  SCHOOL_DAY_KEYS.forEach(dayKey => {
    const col = document.createElement('div');
    col.className = 'schedule-day-col';
    if (dayKey === todayKey && State.scheduleActiveParity === todayParity){
      col.classList.add('is-today');
    }

    const title = document.createElement('div');
    title.className = 'schedule-day-title';
    title.innerHTML = `<span>${DAY_LABELS[dayKey]}</span>`;
    const addBtn = document.createElement('button');
    addBtn.className = 'day-add-btn';
    addBtn.textContent = '+';
    addBtn.title = 'Добавить пару';
    addBtn.addEventListener('click', () => openLessonForm(null, State.scheduleActiveParity, dayKey));
    title.appendChild(addBtn);
    col.appendChild(title);

    const lessons = (State.schedule[State.scheduleActiveParity][dayKey] || []).slice()
      .sort((a, b) => a.start.localeCompare(b.start));

    if (lessons.length === 0){
      const empty = document.createElement('div');
      empty.className = 'day-empty';
      empty.textContent = 'Пар нет';
      col.appendChild(empty);
    }

    lessons.forEach(lesson => {
      const card = document.createElement('div');
      card.className = `lesson-card type-${lesson.type}`;
      card.innerHTML = `
        <div class="lc-actions">
          <button class="lc-edit" title="Редактировать">&#9998;</button>
          <button class="lc-delete" title="Удалить">&#10005;</button>
        </div>
        <div class="lc-time">${escapeHtml(lesson.start)}—${escapeHtml(lesson.end)}<span class="lc-badge">${lesson.type === 'lecture' ? 'Лекция' : 'Семинар'}</span></div>
        <div class="lc-subject">${escapeHtml(lesson.subject)}</div>
        <div class="lc-meta">${escapeHtml(lesson.room || '')}${lesson.room && lesson.teacher ? ' · ' : ''}${escapeHtml(lesson.teacher || '')}</div>
      `;
      card.querySelector('.lc-edit').addEventListener('click', () => openLessonForm(lesson, State.scheduleActiveParity, dayKey));
      card.querySelector('.lc-delete').addEventListener('click', () => deleteLesson(State.scheduleActiveParity, dayKey, lesson.id));
      col.appendChild(card);
    });

    container.appendChild(col);
  });
}

function deleteLesson(parity, dayKey, lessonId){
  State.schedule[parity][dayKey] = State.schedule[parity][dayKey].filter(l => l.id !== lessonId);
  Store.save(LS_KEYS.schedule, State.schedule);
  renderScheduleWindow();
  renderWidget();
}

function initScheduleTabs(){
  document.querySelectorAll('#window-schedule .xp-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#window-schedule .xp-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      State.scheduleActiveParity = tab.dataset.parity;
      renderScheduleWindow();
    });
  });
  document.getElementById('sched-add-lesson').addEventListener('click', () => {
    openLessonForm(null, State.scheduleActiveParity, 'mon');
  });
}

/* ---------- Форма добавления/редактирования пары ---------- */
function openLessonForm(lesson, parity, dayKey){
  const win = document.getElementById('window-lesson-form');
  document.getElementById('lesson-form-title').textContent = lesson ? 'Редактировать пару' : 'Новая пара';
  document.getElementById('lf-id').value = lesson ? lesson.id : '';
  document.getElementById('lf-parity').value = parity;
  document.getElementById('lf-day').value = dayKey;
  document.getElementById('lf-start').value = lesson ? lesson.start : '08:30';
  document.getElementById('lf-end').value = lesson ? lesson.end : '10:05';
  document.getElementById('lf-type').value = lesson ? lesson.type : 'lecture';
  document.getElementById('lf-subject').value = lesson ? lesson.subject : '';
  document.getElementById('lf-room').value = lesson ? (lesson.room || '') : '';
  document.getElementById('lf-teacher').value = lesson ? (lesson.teacher || '') : '';

  showWindow(win);
  centerWindow(win, 400);
}

function initLessonForm(){
  const win = document.getElementById('window-lesson-form');
  document.getElementById('lesson-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('lf-id').value;
    const parity = document.getElementById('lf-parity').value;
    const dayKey = document.getElementById('lf-day').value;
    const start = document.getElementById('lf-start').value;
    const end = document.getElementById('lf-end').value;
    const type = document.getElementById('lf-type').value;
    const subject = document.getElementById('lf-subject').value.trim();
    const room = document.getElementById('lf-room').value.trim();
    const teacher = document.getElementById('lf-teacher').value.trim();

    if (!subject || !start || !end){ return; }

    if (!State.schedule[parity]) State.schedule[parity] = {};
    if (!State.schedule[parity][dayKey]) State.schedule[parity][dayKey] = [];

    if (id){
      const arr = State.schedule[parity][dayKey];
      const idx = arr.findIndex(l => l.id === id);
      if (idx !== -1){
        arr[idx] = { id, start, end, type, subject, room, teacher };
      }
    } else {
      State.schedule[parity][dayKey].push({ id: uid('lesson'), start, end, type, subject, room, teacher });
    }

    Store.save(LS_KEYS.schedule, State.schedule);
    renderScheduleWindow();
    renderWidget();
    hideWindow(win);
  });

  document.getElementById('lf-cancel').addEventListener('click', () => hideWindow(win));
  win.querySelector('.xp-btn-close').addEventListener('click', () => hideWindow(win));
}

/* ---------- Экспорт / импорт JSON расписания ---------- */
function initScheduleImportExport(){
  document.getElementById('sched-export').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(State.schedule, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'schedule.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  const importInput = document.getElementById('sched-import-input');
  document.getElementById('sched-import').addEventListener('click', () => importInput.click());
  importInput.addEventListener('change', () => {
    const file = importInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try{
        const data = JSON.parse(reader.result);
        if (!data.even || !data.odd) throw new Error('Неверная структура файла');
        State.schedule = data;
        Store.save(LS_KEYS.schedule, State.schedule);
        renderScheduleWindow();
        renderWidget();
      }catch(e){
        alert('Не удалось импортировать файл: ' + e.message);
      }
      importInput.value = '';
    };
    reader.readAsText(file, 'utf-8');
  });
}

/* ---------------------------------------------------------
   7. Конспекты (Markdown)
   --------------------------------------------------------- */
function markdownToHtml(src){
  if (!src) return '';
  let text = escapeHtml(src);

  // Блоки кода ```
  const codeBlocks = [];
  text = text.replace(/```([\s\S]*?)```/g, (m, code) => {
    codeBlocks.push(code.replace(/^\n/, ''));
    return `\u0000CODEBLOCK${codeBlocks.length - 1}\u0000`;
  });

  const lines = text.split('\n');
  let html = '';
  let inList = null; // 'ul' | 'ol'
  let inQuote = false;

  function closeList(){
    if (inList){ html += inList === 'ul' ? '</ul>' : '</ol>'; inList = null; }
  }
  function closeQuote(){
    if (inQuote){ html += '</blockquote>'; inQuote = false; }
  }

  lines.forEach(rawLine => {
    let line = rawLine;

    if (/^\s*$/.test(line)){
      closeList(); closeQuote();
      return;
    }

    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h){
      closeList(); closeQuote();
      const level = h[1].length;
      html += `<h${level}>${inlineMd(h[2])}</h${level}>`;
      return;
    }

    const q = line.match(/^>\s?(.*)$/);
    if (q){
      closeList();
      if (!inQuote){ html += '<blockquote>'; inQuote = true; }
      html += `<p>${inlineMd(q[1])}</p>`;
      return;
    }
    closeQuote();

    const ul = line.match(/^\s*[-*]\s+(.*)$/);
    if (ul){
      if (inList !== 'ul'){ closeList(); html += '<ul>'; inList = 'ul'; }
      html += `<li>${inlineMd(ul[1])}</li>`;
      return;
    }

    const ol = line.match(/^\s*\d+\.\s+(.*)$/);
    if (ol){
      if (inList !== 'ol'){ closeList(); html += '<ol>'; inList = 'ol'; }
      html += `<li>${inlineMd(ol[1])}</li>`;
      return;
    }
    closeList();

    if (/^\u0000CODEBLOCK\d+\u0000$/.test(line.trim())){
      const idx = parseInt(line.trim().match(/\d+/)[0], 10);
      html += `<pre><code>${codeBlocks[idx]}</code></pre>`;
      return;
    }

    html += `<p>${inlineMd(line)}</p>`;
  });
  closeList(); closeQuote();
  return html;
}

function inlineMd(str){
  return str
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}

function renderNotesList(){
  const listEl = document.getElementById('notes-list');
  listEl.innerHTML = '';
  if (State.notes.length === 0){
    listEl.innerHTML = '<div class="notes-empty">Нет конспектов</div>';
    return;
  }
  const sorted = [...State.notes].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  sorted.forEach(note => {
    const item = document.createElement('div');
    item.className = 'note-item' + (note.id === State.selectedNoteId ? ' active' : '');
    item.textContent = note.title || 'Без названия';
    item.addEventListener('click', () => selectNote(note.id));
    listEl.appendChild(item);
  });
}

function selectNote(id){
  State.selectedNoteId = id;
  const note = State.notes.find(n => n.id === id);
  document.getElementById('notes-title-input').value = note ? note.title : '';
  document.getElementById('notes-editor').value = note ? note.content : '';
  document.getElementById('notes-preview').innerHTML = markdownToHtml(note ? note.content : '');
  renderNotesList();
}

function saveCurrentNoteField(){
  if (!State.selectedNoteId) return;
  const note = State.notes.find(n => n.id === State.selectedNoteId);
  if (!note) return;
  note.title = document.getElementById('notes-title-input').value;
  note.content = document.getElementById('notes-editor').value;
  note.updatedAt = Date.now();
  Store.save(LS_KEYS.notes, State.notes);
}

function initNotes(){
  document.getElementById('notes-new').addEventListener('click', () => {
    const note = { id: uid('note'), title: 'Новый конспект', content: '', updatedAt: Date.now() };
    State.notes.push(note);
    Store.save(LS_KEYS.notes, State.notes);
    selectNote(note.id);
  });

  document.getElementById('notes-editor').addEventListener('input', () => {
    document.getElementById('notes-preview').innerHTML = markdownToHtml(document.getElementById('notes-editor').value);
    saveCurrentNoteField();
    renderNotesList();
  });
  document.getElementById('notes-title-input').addEventListener('input', () => {
    saveCurrentNoteField();
    renderNotesList();
  });

  document.getElementById('notes-export').addEventListener('click', () => {
    if (!State.selectedNoteId) return;
    const note = State.notes.find(n => n.id === State.selectedNoteId);
    if (!note) return;
    const blob = new Blob([note.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(note.title || 'conspect').replace(/[\\/:*?"<>|]+/g, '_')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  const importInput = document.getElementById('notes-import-input');
  document.getElementById('notes-import').addEventListener('click', () => importInput.click());
  importInput.addEventListener('change', () => {
    const file = importInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const note = {
        id: uid('note'),
        title: file.name.replace(/\.md$/i, ''),
        content: reader.result,
        updatedAt: Date.now()
      };
      State.notes.push(note);
      Store.save(LS_KEYS.notes, State.notes);
      selectNote(note.id);
      importInput.value = '';
    };
    reader.readAsText(file, 'utf-8');
  });

  document.getElementById('notes-delete').addEventListener('click', () => {
    if (!State.selectedNoteId) return;
    const note = State.notes.find(n => n.id === State.selectedNoteId);
    if (!note) return;
    openDeleteModal(`Удалить конспект «${note.title || 'Без названия'}» без возможности восстановления?`, () => {
      State.notes = State.notes.filter(n => n.id !== note.id);
      Store.save(LS_KEYS.notes, State.notes);
      State.selectedNoteId = State.notes.length ? State.notes[0].id : null;
      if (State.selectedNoteId) selectNote(State.selectedNoteId);
      else {
        document.getElementById('notes-title-input').value = '';
        document.getElementById('notes-editor').value = '';
        document.getElementById('notes-preview').innerHTML = '';
        renderNotesList();
      }
    });
  });

  renderNotesList();
  if (State.notes.length){
    selectNote(State.notes[0].id);
  }
}

/* ---------------------------------------------------------
   8. Модальное окно удаления (XP-стиль, Да/Нет)
   --------------------------------------------------------- */
let pendingDeleteCallback = null;

function openDeleteModal(text, onConfirm){
  document.getElementById('delete-modal-text').textContent = text;
  pendingDeleteCallback = onConfirm;
  document.getElementById('delete-modal-overlay').classList.remove('hidden');
}

function closeDeleteModal(){
  document.getElementById('delete-modal-overlay').classList.add('hidden');
  pendingDeleteCallback = null;
}

function initDeleteModal(){
  document.getElementById('delete-modal-yes').addEventListener('click', () => {
    const cb = pendingDeleteCallback;
    closeDeleteModal();
    if (cb) cb();
  });
  document.getElementById('delete-modal-no').addEventListener('click', closeDeleteModal);
  document.getElementById('delete-modal-x').addEventListener('click', closeDeleteModal);
}

/* ---------------------------------------------------------
   9. Погода (Open-Meteo) и пробки (TomTom Routing API)
   --------------------------------------------------------- */
const WEATHER_CODE_MAP = {
  0: 'Ясно', 1: 'Преимущественно ясно', 2: 'Переменная облачность', 3: 'Пасмурно',
  45: 'Туман', 48: 'Изморозь',
  51: 'Легкая морось', 53: 'Морось', 55: 'Сильная морось',
  61: 'Небольшой дождь', 63: 'Дождь', 65: 'Сильный дождь',
  71: 'Небольшой снег', 73: 'Снег', 75: 'Сильный снегопад',
  80: 'Ливень', 81: 'Сильный ливень', 82: 'Очень сильный ливень',
  95: 'Гроза', 96: 'Гроза с градом', 99: 'Сильная гроза с градом'
};

async function geocodeCity(city){
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=ru&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Ошибка геокодирования города');
  const data = await res.json();
  if (!data.results || !data.results.length) throw new Error('Город не найден');
  return { lat: data.results[0].latitude, lon: data.results[0].longitude, name: data.results[0].name };
}

async function fetchWeather(){
  const trayTemp = document.getElementById('tray-weather-temp');
  const detailEl = document.getElementById('weather-detail');
  const cityLabel = document.getElementById('weather-city-label');

  const city = (State.settings.city || '').trim();
  if (!city){
    detailEl.innerHTML = '<div class="weather-error">Укажите город в настройках.</div>';
    cityLabel.textContent = '—';
    return;
  }
  cityLabel.textContent = city;
  detailEl.innerHTML = '<div class="weather-loading">Загрузка данных о погоде…</div>';

  try{
    const { lat, lon, name } = await geocodeCity(city);
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Сервис погоды недоступен');
    const data = await res.json();
    const cur = data.current;
    const tempInt = Math.round(cur.temperature_2m);
    const desc = WEATHER_CODE_MAP[cur.weather_code] || 'Погодные условия';

    trayTemp.textContent = `${tempInt}°C`;
    cityLabel.textContent = name;
    detailEl.innerHTML = `
      <div class="weather-grid">
        <div class="weather-stat"><div class="ws-label">Температура</div><div class="ws-value">${tempInt}°C</div></div>
        <div class="weather-stat"><div class="ws-label">Ощущается как</div><div class="ws-value">${Math.round(cur.apparent_temperature)}°C</div></div>
        <div class="weather-stat"><div class="ws-label">Влажность</div><div class="ws-value">${Math.round(cur.relative_humidity_2m)}%</div></div>
        <div class="weather-stat"><div class="ws-label">Ветер</div><div class="ws-value">${Math.round(cur.wind_speed_10m)} км/ч</div></div>
      </div>
      <p style="margin-top:.5rem;">${escapeHtml(desc)}</p>
    `;
  }catch(e){
    detailEl.innerHTML = `<div class="weather-error">Не удалось получить погоду: ${escapeHtml(e.message)}</div>`;
    trayTemp.textContent = '--°C';
  }
}

// Поиск координат по обычному текстовому адресу (TomTom Geocoding API) —
// пользователь вводит человеко-понятный адрес, координаты определяются сами.
async function geocodeAddress(query){
  const q = (query || '').trim();
  if (!q) throw new Error('Введите адрес');
  const url = `https://api.tomtom.com/search/2/geocode/${encodeURIComponent(q)}.json?key=${encodeURIComponent(TOMTOM_API_KEY)}&limit=1&language=ru-RU`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Ошибка геокодирования (${res.status})`);
  const data = await res.json();
  if (!data.results || !data.results.length) throw new Error('Адрес не найден');
  const r = data.results[0];
  return {
    lat: r.position.lat,
    lon: r.position.lon,
    label: (r.address && r.address.freeformAddress) || q
  };
}

// Определение адреса по координатам (для кнопки «Определить автоматически» —
// показываем пользователю понятную подпись вместо голых цифр).
async function reverseGeocodeAddress(lat, lon){
  try{
    const url = `https://api.tomtom.com/search/2/reverseGeocode/${lat},${lon}.json?key=${encodeURIComponent(TOMTOM_API_KEY)}&language=ru-RU`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return (data.addresses && data.addresses[0] && data.addresses[0].address.freeformAddress) || null;
  }catch(e){
    return null;
  }
}

async function fetchTraffic(){
  const detailEl = document.getElementById('traffic-detail');
  const { homeLat, homeLon, studyLat, studyLon } = State.settings;

  if (!TOMTOM_API_KEY || TOMTOM_API_KEY.includes('ВСТАВЬТЕ')){
    detailEl.innerHTML = '<div class="weather-error">В коде не задан API-ключ TomTom (переменная TOMTOM_API_KEY в начале app.js).</div>';
    return;
  }
  if (!homeLat || !homeLon || !studyLat || !studyLon){
    detailEl.innerHTML = '<div class="weather-error">Укажите адреса «Дом» и «Учеба» в настройках.</div>';
    return;
  }

  detailEl.innerHTML = '<div class="weather-loading">Загрузка данных о пробках…</div>';

  try{
    const url = `https://api.tomtom.com/routing/1/calculateRoute/${homeLat},${homeLon}:${studyLat},${studyLon}/json?key=${encodeURIComponent(TOMTOM_API_KEY)}&traffic=true`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Ошибка TomTom API (${res.status})`);
    const data = await res.json();
    const summary = data.routes && data.routes[0] && data.routes[0].summary;
    if (!summary) throw new Error('Маршрут не найден');

    const travelMin = Math.round(summary.travelTimeInSeconds / 60);
    const delayMin = Math.round((summary.trafficDelayInSeconds || 0) / 60);
    const km = (summary.lengthInMeters / 1000).toFixed(1);
    const delayClass = delayMin >= 10 ? 'bad' : 'ok';

    detailEl.innerHTML = `
      <div class="traffic-route">Дом → Учеба · ${km} км</div>
      <div class="weather-grid">
        <div class="weather-stat"><div class="ws-label">В пути</div><div class="ws-value">${travelMin} мин</div></div>
        <div class="weather-stat"><div class="ws-label">Задержка из-за пробок</div><div class="ws-value traffic-delay ${delayClass}">${delayMin} мин</div></div>
      </div>
    `;
  }catch(e){
    detailEl.innerHTML = `<div class="weather-error">Не удалось получить данные о пробках: ${escapeHtml(e.message)}</div>`;
  }
}

function initWeatherWindow(){
  document.getElementById('weather-refresh').addEventListener('click', fetchWeather);
  document.getElementById('traffic-refresh').addEventListener('click', fetchTraffic);
}

/* ---------------------------------------------------------
   10. Настройки (Панель управления)
   --------------------------------------------------------- */
function fillSettingsForm(){
  document.getElementById('set-city').value = State.settings.city || '';
  document.getElementById('set-home-address').value = State.settings.homeAddress || '';
  document.getElementById('set-study-address').value = State.settings.studyAddress || '';
  document.getElementById('home-resolved').textContent = '';
  document.getElementById('study-resolved').textContent = '';
  document.getElementById('home-resolved').className = 'settings-resolved';
  document.getElementById('study-resolved').className = 'settings-resolved';
}

// Общая логика для полей «Дом» и «Учёба»: поиск координат по адресу
// и определение текущего местоположения через геолокацию браузера.
function initAddressField(prefix, latKey, lonKey, addrKey){
  const addressInput = document.getElementById(`set-${prefix}-address`);
  const resolvedEl = document.getElementById(`${prefix}-resolved`);
  const findBtn = document.getElementById(`${prefix}-find-btn`);
  const gpsBtn = document.getElementById(`${prefix}-gps-btn`);

  findBtn.addEventListener('click', async () => {
    resolvedEl.className = 'settings-resolved';
    resolvedEl.textContent = 'Ищу адрес…';
    try{
      const { lat, lon, label } = await geocodeAddress(addressInput.value);
      State.settings[latKey] = String(lat);
      State.settings[lonKey] = String(lon);
      State.settings[addrKey] = label;
      addressInput.value = label;
      resolvedEl.className = 'settings-resolved ok';
      resolvedEl.textContent = `Найдено: ${label}`;
    }catch(e){
      resolvedEl.className = 'settings-resolved error';
      resolvedEl.textContent = e.message;
    }
  });

  gpsBtn.addEventListener('click', () => {
    if (!navigator.geolocation){
      resolvedEl.className = 'settings-resolved error';
      resolvedEl.textContent = 'Геолокация не поддерживается браузером';
      return;
    }
    resolvedEl.className = 'settings-resolved';
    resolvedEl.textContent = 'Определяю местоположение…';
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      const label = (await reverseGeocodeAddress(lat, lon)) || `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
      State.settings[latKey] = String(lat);
      State.settings[lonKey] = String(lon);
      State.settings[addrKey] = label;
      addressInput.value = label;
      resolvedEl.className = 'settings-resolved ok';
      resolvedEl.textContent = `Определено: ${label}`;
    }, (err) => {
      resolvedEl.className = 'settings-resolved error';
      resolvedEl.textContent = 'Не удалось определить местоположение: ' + err.message;
    }, { enableHighAccuracy: true, timeout: 10000 });
  });
}

// Если пользователь вписал адрес руками, но не нажал «Найти» — досчитываем
// координаты автоматически при сохранении формы.
async function resolveAddressIfNeeded(prefix, latKey, lonKey, addrKey){
  const input = document.getElementById(`set-${prefix}-address`);
  const value = input.value.trim();
  if (!value) return;
  if (State.settings[addrKey] === value && State.settings[latKey]) return; // уже сопоставлено
  try{
    const { lat, lon, label } = await geocodeAddress(value);
    State.settings[latKey] = String(lat);
    State.settings[lonKey] = String(lon);
    State.settings[addrKey] = label;
    input.value = label;
  }catch(e){
    console.warn(`Не удалось автоматически определить координаты (${prefix}):`, e.message);
  }
}

function initSettingsWindow(){
  initAddressField('home', 'homeLat', 'homeLon', 'homeAddress');
  initAddressField('study', 'studyLat', 'studyLon', 'studyAddress');

  document.getElementById('settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    State.settings.city = document.getElementById('set-city').value.trim();

    await resolveAddressIfNeeded('home', 'homeLat', 'homeLon', 'homeAddress');
    await resolveAddressIfNeeded('study', 'studyLat', 'studyLon', 'studyAddress');

    Store.save(LS_KEYS.settings, State.settings);
    document.getElementById('weather-city-label').textContent = State.settings.city || '—';
    fetchWeather();
    fetchTraffic();
    hideWindow(document.getElementById('window-settings'));
  });
  document.getElementById('settings-cancel').addEventListener('click', () => {
    fillSettingsForm();
    hideWindow(document.getElementById('window-settings'));
  });
}

/* ---------------------------------------------------------
   11. Оконный менеджер: drag, resize, z-index, min/max/close, панель задач
   --------------------------------------------------------- */
const APP_WINDOW_IDS = {
  schedule: 'window-schedule',
  notes: 'window-notes',
  weather: 'window-weather',
  settings: 'window-settings'
};
const APP_ICONS = {
  schedule: 'PNG/Raspisanie.png',
  notes: 'PNG/Conspect.png',
  weather: 'PNG/Weather.png',
  settings: 'PNG/Settings.png'
};
const APP_TITLES = {
  schedule: 'Расписание.exe',
  notes: 'Конспекты.exe',
  weather: 'Погода и пробки.exe',
  settings: 'Свойства системы'
};

function bringToFront(win){
  State.zCounter += 1;
  win.style.zIndex = State.zCounter;
}

function centerWindow(win, widthPx){
  // Небольшое смещение по каскаду, чтобы окна не открывались строго друг на друге
  const openCount = document.querySelectorAll('.xp-window:not(.hidden)').length;
  const offset = (openCount % 6) * 18;
  win.style.top = `${3.2}rem`;
  win.style.left = `calc(50% - ${(widthPx || 340) / 2}px + ${offset}px)`;
}

function showWindow(win){
  win.classList.remove('hidden');
  bringToFront(win);
}

function hideWindow(win){
  win.classList.add('hidden');
}

function openApp(appKey){
  const winId = APP_WINDOW_IDS[appKey];
  if (!winId) return;
  const win = document.getElementById(winId);
  showWindow(win);
  addTaskbarButton(appKey);
  setActiveTaskbarButton(appKey);
  closeStartMenu();

  if (appKey === 'schedule') renderScheduleWindow();
  if (appKey === 'notes'){ renderNotesList(); if (State.selectedNoteId) selectNote(State.selectedNoteId); }
  if (appKey === 'weather'){ fetchWeather(); fetchTraffic(); }
  if (appKey === 'settings') fillSettingsForm();
}

function closeApp(appKey){
  const winId = APP_WINDOW_IDS[appKey];
  const win = document.getElementById(winId);
  hideWindow(win);
  removeTaskbarButton(appKey);
}

function addTaskbarButton(appKey){
  if (document.getElementById(`taskbtn-${appKey}`)) return;
  const btn = document.createElement('button');
  btn.className = 'taskbar-app-btn active';
  btn.id = `taskbtn-${appKey}`;
  btn.innerHTML = `<img src="${APP_ICONS[appKey]}" alt=""><span>${APP_TITLES[appKey]}</span>`;
  btn.addEventListener('click', () => {
    const win = document.getElementById(APP_WINDOW_IDS[appKey]);
    if (win.classList.contains('hidden')){
      showWindow(win);
      setActiveTaskbarButton(appKey);
    } else {
      // повторный клик по активной кнопке сворачивает окно
      const isTop = parseInt(win.style.zIndex || '0', 10) === State.zCounter;
      if (isTop){ hideWindow(win); btn.classList.remove('active'); }
      else { bringToFront(win); setActiveTaskbarButton(appKey); }
    }
  });
  document.getElementById('taskbar-apps').appendChild(btn);
}

function removeTaskbarButton(appKey){
  const btn = document.getElementById(`taskbtn-${appKey}`);
  if (btn) btn.remove();
}

function setActiveTaskbarButton(appKey){
  document.querySelectorAll('.taskbar-app-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById(`taskbtn-${appKey}`);
  if (btn) btn.classList.add('active');
}

function appKeyFromWindow(win){
  return win.dataset.app;
}

function initWindowChrome(){
  document.querySelectorAll('.xp-window').forEach(win => {
    const appKey = appKeyFromWindow(win);

    // Клик по окну поднимает его наверх
    win.addEventListener('mousedown', () => bringToFront(win));

    const closeBtn = win.querySelector('.xp-btn-close');
    if (closeBtn){
      closeBtn.addEventListener('click', () => {
        if (APP_WINDOW_IDS[appKey]) closeApp(appKey);
        else hideWindow(win);
      });
    }
    const minBtn = win.querySelector('.xp-btn-min');
    if (minBtn){
      minBtn.addEventListener('click', () => hideWindow(win));
    }
    const maxBtn = win.querySelector('.xp-btn-max');
    if (maxBtn){
      maxBtn.addEventListener('click', () => win.classList.toggle('maximized'));
    }

    initDrag(win);
    initResize(win);
  });
}

function initDrag(win){
  const titlebar = win.querySelector('.xp-titlebar');
  if (!titlebar) return;
  let dragging = false;
  let startX = 0, startY = 0, startTop = 0, startLeft = 0;

  function onPointerDown(e){
    if (win.classList.contains('maximized')) return;
    if (e.target.closest('.xp-titlebar-buttons')) return;
    dragging = true;
    bringToFront(win);
    const point = e.touches ? e.touches[0] : e;
    startX = point.clientX; startY = point.clientY;
    const rect = win.getBoundingClientRect();
    startTop = rect.top; startLeft = rect.left;
    document.addEventListener('mousemove', onPointerMove);
    document.addEventListener('mouseup', onPointerUp);
    document.addEventListener('touchmove', onPointerMove, { passive: false });
    document.addEventListener('touchend', onPointerUp);
  }
  function onPointerMove(e){
    if (!dragging) return;
    if (e.cancelable) e.preventDefault();
    const point = e.touches ? e.touches[0] : e;
    const dx = point.clientX - startX;
    const dy = point.clientY - startY;
    let newTop = startTop + dy;
    let newLeft = startLeft + dx;
    newTop = Math.max(0, Math.min(newTop, window.innerHeight - 40));
    newLeft = Math.max(-win.offsetWidth + 80, Math.min(newLeft, window.innerWidth - 80));
    win.style.top = `${newTop}px`;
    win.style.left = `${newLeft}px`;
  }
  function onPointerUp(){
    dragging = false;
    document.removeEventListener('mousemove', onPointerMove);
    document.removeEventListener('mouseup', onPointerUp);
    document.removeEventListener('touchmove', onPointerMove);
    document.removeEventListener('touchend', onPointerUp);
  }
  titlebar.addEventListener('mousedown', onPointerDown);
  titlebar.addEventListener('touchstart', onPointerDown, { passive: true });
}

function initResize(win){
  const handles = win.querySelectorAll('.resize-handle');
  const MIN_W = 260, MIN_H = 200;

  handles.forEach(handle => {
    let resizing = false;
    let dir = '';
    let startX = 0, startY = 0, startW = 0, startH = 0, startTop = 0, startLeft = 0;

    handles.forEach(h => { if (h === handle) dir = [...h.classList].find(c => c.startsWith('rh-')).replace('rh-', ''); });

    handle.addEventListener('mousedown', (e) => {
      if (win.classList.contains('maximized')) return;
      e.stopPropagation();
      resizing = true;
      dir = [...handle.classList].find(c => c.startsWith('rh-')).replace('rh-', '');
      bringToFront(win);
      const rect = win.getBoundingClientRect();
      startX = e.clientX; startY = e.clientY;
      startW = rect.width; startH = rect.height; startTop = rect.top; startLeft = rect.left;
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });

    function onMove(e){
      if (!resizing) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      let newW = startW, newH = startH, newTop = startTop, newLeft = startLeft;

      if (dir.includes('e')) newW = Math.max(MIN_W, startW + dx);
      if (dir.includes('s')) newH = Math.max(MIN_H, startH + dy);
      if (dir.includes('w')){ newW = Math.max(MIN_W, startW - dx); newLeft = startLeft + (startW - newW); }
      if (dir.includes('n')){ newH = Math.max(MIN_H, startH - dy); newTop = startTop + (startH - newH); }

      win.style.width = `${newW}px`;
      win.style.height = `${newH}px`;
      win.style.top = `${newTop}px`;
      win.style.left = `${newLeft}px`;
    }
    function onUp(){
      resizing = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }
  });
}

/* ---------------------------------------------------------
   12. Иконки рабочего стола (одинарный клик)
   --------------------------------------------------------- */
function initDesktopIcons(){
  document.querySelectorAll('.desktop-icon').forEach(icon => {
    icon.addEventListener('click', () => openApp(icon.dataset.app));
  });
}

/* ---------------------------------------------------------
   13. Меню «Пуск» и панель задач
   --------------------------------------------------------- */
function openStartMenu(){
  document.getElementById('start-menu').classList.remove('hidden');
  document.getElementById('start-button').classList.add('active');
}
function closeStartMenu(){
  document.getElementById('start-menu').classList.add('hidden');
  document.getElementById('start-button').classList.remove('active');
}
function toggleStartMenu(){
  const menu = document.getElementById('start-menu');
  if (menu.classList.contains('hidden')) openStartMenu();
  else closeStartMenu();
}

function initStartMenu(){
  document.getElementById('start-button').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleStartMenu();
  });

  document.querySelectorAll('.start-menu-item, .start-menu-item-right').forEach(item => {
    item.addEventListener('click', () => openApp(item.dataset.app));
  });

  document.addEventListener('click', (e) => {
    const menu = document.getElementById('start-menu');
    const startBtn = document.getElementById('start-button');
    if (!menu.classList.contains('hidden') && !menu.contains(e.target) && e.target !== startBtn && !startBtn.contains(e.target)){
      closeStartMenu();
    }
  });

  document.getElementById('shutdown-btn').addEventListener('click', () => {
    closeStartMenu();
    document.getElementById('shutdown-screen').classList.remove('hidden');
    setTimeout(() => {
      document.getElementById('shutdown-screen').classList.add('hidden');
      document.getElementById('boot-screen').classList.remove('hidden', 'fade-out');
      setTimeout(() => document.getElementById('boot-screen').classList.add('fade-out'), 900);
    }, 1600);
  });
}

/* ---------------------------------------------------------
   14. Инициализация приложения
   --------------------------------------------------------- */
async function init(){
  loadInitialSettings();
  loadInitialNotes();
  await loadInitialSchedule();

  tickClock();
  setInterval(tickClock, 1000);

  renderWidget();
  initWidgetNav();

  initScheduleTabs();
  initLessonForm();
  initScheduleImportExport();
  renderScheduleWindow();

  initNotes();
  initDeleteModal();
  initWeatherWindow();
  initSettingsWindow();
  fillSettingsForm();
  document.getElementById('weather-city-label').textContent = State.settings.city || '—';

  initWindowChrome();
  initDesktopIcons();
  initStartMenu();

  if (State.settings.city) fetchWeather();
  if (State.settings.homeLat && State.settings.studyLat) fetchTraffic();

  setTimeout(() => document.getElementById('boot-screen').classList.add('fade-out'), 500);
  setTimeout(() => document.getElementById('boot-screen').classList.add('hidden'), 1200);
}

document.addEventListener('DOMContentLoaded', init);