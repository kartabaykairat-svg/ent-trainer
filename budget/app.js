(function () {
  'use strict';

  // ================= Общие настройки =================
  const CFG = window.BUDGET_CONFIG || {};
  const USE_CLOUD = !!(CFG.supabaseUrl && CFG.supabaseAnonKey);
  const SEED_BY = 'Начальные данные';
  const CACHE_KEY = 'budget-cache-v1';
  const USER_KEY = 'budget-user-v1';

  const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  const ST_NAME = { paid: 'оплачено', unpaid: 'не оплачено', partial: 'частично' };
  const GROUP_LABEL = { green: 'связь и комм.', blue: 'еда и быт', lilac: 'дети', orange: 'долги' };

  // Колонки расходов в нужном порядке.
  const BASE_COLS = [
    { key: 'kvartira', title: 'квартира' },
    { key: 'ofis', title: 'офис' },
    { key: 'telefon', title: 'телефон', group: 'green', hint: 'Tele2' },
    { key: 'komm', title: 'комм', group: 'green', hint: 'коммуналка' },
    { key: 'komm_alisa', title: 'комм. Алиса', group: 'green' },
    { key: 'kredity', title: 'кредиты', hint: 'кредит Freedom' },
    { key: 'myaso', title: 'мясо', group: 'blue' },
    { key: 'produkty', title: 'продукты', group: 'blue' },
    { key: 'mylo', title: 'мыло/мойка', group: 'blue' },
    { key: 'taksi', title: 'такси/дорога', group: 'blue' },
    { key: 'muzyka', title: 'Музыкалка', group: 'lilac', paint: true, hint: 'Медина, 16 000 в месяц' },
    { key: 'angl', title: 'Англ. Медина', group: 'lilac', paint: true },
    { key: 'lulua', title: 'Колледж Лулуа', group: 'lilac', paint: true },
    { key: 'batyi', title: 'Колледж Батый', group: 'lilac', paint: true },
    { key: 'kredit_batyi', title: 'Кредит Батый', group: 'lilac', paint: true, hint: 'платить до 20-го' },
    { key: 'nalogi', title: 'налоги', hint: 'Акмарал' },
    { key: 'raznoe', title: 'разное' },
    { key: 'lekarstva', title: 'лекарства' },
    { key: 'otdyh', title: 'отдых', akm: true, hint: 'вводится только в строке Акмарал' },
    { key: 'dolg_zh', title: 'Долг Жалалдин', group: 'orange' },
    { key: 'dolg_ai', title: 'Долг Айсулу', group: 'orange' },
    { key: 'dolg_sab', title: 'Долг Сабыржан', group: 'orange' },
    { key: 'azheke', title: 'Отправить Ажеке', group: 'yellow', akm: true, hint: 'вводится только в строке Акмарал' },
    { key: 'reklama', title: 'реклама' },
  ];

  // ================= Помощники =================
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function fmt(n) {
    n = Math.round(Number(n) || 0);
    const s = String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return (n < 0 ? '−' : '') + s;
  }
  const money = (n) => fmt(n) + ' ₸';
  const fmtOpt = (n) => (n ? fmt(n) : '');
  function parseNum(s) {
    if (s == null) return null;
    s = String(s).replace(/[\s  ₸]/g, '').replace(/−/g, '-').replace(',', '.');
    if (s === '') return null;
    const n = Number(s);
    return isFinite(n) ? Math.round(n) : NaN;
  }
  function ymTitle(ym, withYear) {
    if (!ym) return '';
    const [y, m] = ym.split('-').map(Number);
    const showYear = withYear || y !== new Date().getFullYear();
    return MONTHS[m - 1] + (showYear ? ' ' + y : '');
  }
  function nextYm(ym) {
    let [y, m] = ym.split('-').map(Number);
    m += 1;
    if (m > 12) { m = 1; y += 1; }
    return y + '-' + String(m).padStart(2, '0');
  }
  function fmtWhen(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const hm = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) return 'сегодня в ' + hm;
    return d.getDate() + ' ' + MONTHS_GEN[d.getMonth()] + (d.getFullYear() !== now.getFullYear() ? ' ' + d.getFullYear() : '') + ' в ' + hm;
  }
  const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
  const cellId = (rowId, key) => 'c|' + rowId + '|' + key;
  const colId = (ym, key) => 'k|' + ym + '|' + key;
  const titleHtml = (t) => esc(t).replace(/\//g, '/<wbr>');
  function lsGet(key, def) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
  function lsSet(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* нет места или запрещено */ } }

  async function hashPin(pin, salt) {
    const text = 'budget:' + salt + ':' + pin;
    if (window.crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
    }
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
    return 'f' + (h >>> 0).toString(16);
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src; s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  // ================= Хранилище =================
  // Все данные — это «записи» (items): месяц, строка, колонка, ячейка, долг, участник, настройки.
  const items = new Map();
  const list = (kind, month) => {
    const out = [];
    for (const it of items.values()) if (it.kind === kind && (month === undefined || it.month === month)) out.push(it);
    return out;
  };

  // Демо-режим: данные в браузере, другие вкладки видят изменения сразу.
  const Local = {
    bc: ('BroadcastChannel' in window) ? new BroadcastChannel('budget-demo') : null,
    async init() {},
    async load() { return lsGet('budget-demo-items', []); },
    async save(rows) {
      const all = new Map(lsGet('budget-demo-items', []).map((r) => [r.id, r]));
      const hist = lsGet('budget-demo-history', []);
      let hid = hist.length ? hist[0].id : 0;
      for (const r of rows) {
        const old = all.get(r.id);
        if (old && JSON.stringify(old.data) === JSON.stringify(r.data) && !!old.deleted === !!r.deleted) continue;
        hist.unshift({
          id: ++hid, item_id: r.id, kind: r.kind, month: r.month,
          old_data: old ? old.data : null, new_data: r.data,
          old_deleted: old ? !!old.deleted : null, new_deleted: !!r.deleted,
          changed_by: r.updated_by, changed_at: r.updated_at,
        });
        if (r.deleted) all.delete(r.id); else all.set(r.id, r);
      }
      lsSet('budget-demo-items', Array.from(all.values()));
      lsSet('budget-demo-history', hist.slice(0, 500));
      if (this.bc) this.bc.postMessage(rows);
    },
    async history() { return lsGet('budget-demo-history', []).slice(0, 300); },
    subscribe(cb) { if (this.bc) this.bc.onmessage = (e) => e.data.forEach(cb); },
  };

  // Общая база Supabase с обновлением в реальном времени.
  const Cloud = {
    client: null,
    channel: null,
    async init() {
      if (this.client) return;
      if (!window.supabase) await loadScript('./vendor/supabase.js');
      this.client = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, { auth: { persistSession: false } });
    },
    async load() {
      const out = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await this.client.from('items').select('*').eq('deleted', false).range(from, from + 999);
        if (error) throw error;
        out.push(...data);
        if (data.length < 1000) break;
      }
      return out;
    },
    async save(rows) {
      const { error } = await this.client.from('items').upsert(rows.map((r) => ({
        id: r.id, kind: r.kind, month: r.month, data: r.data, deleted: !!r.deleted, updated_by: r.updated_by,
      })));
      if (error) throw error;
    },
    async history() {
      const { data, error } = await this.client.from('history').select('*').order('id', { ascending: false }).limit(300);
      if (error) throw error;
      return data;
    },
    subscribe(cb, onStatus) {
      if (this.channel) return;
      this.channel = this.client.channel('items-live')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, (p) => { if (p.new && p.new.id) cb(p.new); })
        .subscribe((status) => onStatus && onStatus(status));
    },
  };

  const backend = USE_CLOUD ? Cloud : Local;

  // ================= Состояние =================
  const state = {
    user: null,
    tab: 'table',
    month: null,
    cloudOk: !USE_CLOUD,
    loaded: false,
    flash: new Set(),
    loginPick: null,
    installPrompt: null,
    history: null,
  };

  function saveCache() { if (USE_CLOUD) lsSet(CACHE_KEY, Array.from(items.values())); }

  function applyRemote(it) {
    if (it.deleted) items.delete(it.id); else items.set(it.id, it);
    if (state.user && it.updated_by && it.updated_by !== state.user.name) {
      state.flash.add(it.id);
      setTimeout(() => { state.flash.delete(it.id); }, 3000);
    }
    saveCache();
    scheduleRender();
  }

  function isOnline() { return !USE_CLOUD || (navigator.onLine !== false && state.cloudOk); }

  function canEdit() {
    if (!isOnline()) {
      toast('Нет интернета — изменения не сохранятся. Подключитесь и попробуйте снова.', true);
      return false;
    }
    return true;
  }

  async function saveItems(changes, opts) {
    opts = opts || {};
    if (!opts.force && !canEdit()) return false;
    const by = opts.by || (state.user ? state.user.name : SEED_BY);
    const now = new Date().toISOString();
    const rows = changes.map((c) => ({ id: c.id, kind: c.kind, month: c.month || null, data: c.data || {}, deleted: !!c.deleted, updated_by: by, updated_at: now }));
    const prev = rows.map((r) => items.get(r.id));
    rows.forEach((r) => { if (r.deleted) items.delete(r.id); else items.set(r.id, r); });
    scheduleRender();
    try {
      await backend.save(rows);
      saveCache();
      return true;
    } catch (e) {
      console.error(e);
      rows.forEach((r, i) => { if (prev[i]) items.set(r.id, prev[i]); else items.delete(r.id); });
      scheduleRender();
      toast('Не удалось сохранить. Проверьте интернет и попробуйте ещё раз.', true);
      return false;
    }
  }

  // ================= Начальные данные (октябрь и ноябрь) =================
  function seedItems() {
    const out = [];
    const put = (id, kind, month, data) => out.push({ id, kind, month, data });
    put('settings', 'settings', null, { halykPct: 50 });
    put('akmaral', 'akmaral', null, { rate: 5000, rate2: 10000, products: 250000, payments: [30000, 60000, 80000, 150000] });
    [['Жалалдин', 285000, 'dolg_zh'], ['Садыржан', 100000, null], ['Айсулу', 500000, 'dolg_ai'],
      ['Русский', 50000, null], ['Сабыржан', 180000, 'dolg_sab'], ['Иван', 50000, null]]
      .forEach(([name, amount, col], i) => put('d|seed' + i, 'debt', null, { name, amount, col, pos: (i + 1) * 10 }));

    const plan = {
      bus: { kvartira: 200000, telefon: 26000, komm: 30000, kredity: 18000, lulua: 50000, batyi: 36000, dolg_zh: 15000 },
      tep: { muzyka: 16000, angl: 20000, dolg_zh: 4000 },
      euro: { ofis: 100000, nalogi: 22000, kredit_batyi: 17000, reklama: 10000, dolg_zh: 101000 },
      akm: { produkty: 250000, dolg_zh: 50000 },
    };
    const octStatus = {
      kvartira: { st: 'paid' }, ofis: { st: 'paid' }, telefon: { st: 'paid' }, kredity: { st: 'paid' }, nalogi: { st: 'paid' },
      muzyka: { st: 'partial', paid: 8000 }, angl: { st: 'unpaid' }, lulua: { st: 'unpaid' }, batyi: { st: 'unpaid' },
      kredit_batyi: { st: 'paid' },
    };
    for (const ym of ['2026-10', '2026-11']) {
      const oct = ym === '2026-10';
      put('m|' + ym, 'month', ym, { ym });
      BASE_COLS.forEach((c, i) => {
        const d = Object.assign({}, c, { pos: (i + 1) * 10 });
        if (oct && c.key === 'kredity') d.title = 'фридом';
        if (oct && c.key === 'muzyka') d.hint = 'Медина, в октябре 32 000';
        put(colId(ym, c.key), 'col', ym, d);
      });
      const rows = {
        bus: { name: 'Bus Logistic', note: '5–10-е', income: 750000, halyk: true, fact: null, pos: 10 },
        tep: { name: 'теплица', note: 'до 10-е', income: 80000, halyk: true, fact: null, pos: 20 },
        euro: { name: 'Евробетон', note: '15–25-е', income: null, halyk: false, fact: 250000, pos: 30 },
        akm: { name: 'Акмарал', note: oct ? 'в плане 300 000' : '', income: null, halyk: false, fact: oct ? 435000 : 300000, akmaral: true, pos: 1000 },
      };
      for (const r in rows) {
        const rowId = 'r|' + ym + '|' + r;
        put(rowId, 'row', ym, rows[r]);
        for (const key in plan[r]) {
          const v = (oct && key === 'muzyka') ? 32000 : plan[r][key];
          put(cellId(rowId, key), 'cell', ym, Object.assign({ v }, oct ? (octStatus[key] || {}) : {}));
        }
      }
    }
    return out;
  }

  // ================= Расчёты =================
  const settings = () => Object.assign({ halykPct: 50 }, (items.get('settings') || {}).data);
  const months = () => list('month').map((m) => m.month).sort();

  function model(ym) {
    const pct = Number(settings().halykPct) || 0;
    const cols = list('col', ym).map((it) => Object.assign({ id: it.id }, it.data)).sort((a, b) => a.pos - b.pos);
    const rowsRaw = list('row', ym).map((it) => Object.assign({ id: it.id, _it: it }, it.data))
      .sort((a, b) => ((a.akmaral ? 1 : 0) - (b.akmaral ? 1 : 0)) || (a.pos - b.pos));
    const tot = { income: 0, halyk: 0, fact: 0, exp: 0, rest: 0, paid: 0 };
    const colTot = {}; const colPaid = {};
    cols.forEach((c) => { colTot[c.key] = 0; colPaid[c.key] = 0; });
    const rows = rowsRaw.map((r) => {
      const income = Number(r.income) || 0;
      const halyk = r.halyk ? Math.round(income * pct / 100) : 0;
      const manual = r.fact != null && r.fact !== '';
      const fact = manual ? Number(r.fact) : income - halyk;
      let exp = 0;
      const cells = {};
      cols.forEach((c) => {
        if (c.akm && !r.akmaral) return;
        const it = items.get(cellId(r.id, c.key));
        if (!it) return;
        const d = it.data || {};
        const v = Number(d.v) || 0;
        const paid = d.st === 'paid' ? v : d.st === 'partial' ? Math.min(Number(d.paid) || 0, v) : 0;
        cells[c.key] = Object.assign({}, d, { v, paidAmt: paid, it });
        exp += v; colTot[c.key] += v; colPaid[c.key] += paid; tot.paid += paid;
      });
      const rest = fact - exp;
      tot.income += income; tot.halyk += halyk; tot.fact += fact; tot.exp += exp; tot.rest += rest;
      return Object.assign({}, r, { income, halyk, fact, manual, exp, rest, cells });
    });
    return { ym, pct, cols, rows, tot, colTot, colPaid };
  }

  function debtModel(ym) {
    const M = ym ? model(ym) : null;
    const debts = list('debt').map((it) => Object.assign({ id: it.id }, it.data)).sort((a, b) => a.pos - b.pos);
    const colTitle = {};
    let monthly = 0;
    if (M) M.cols.forEach((c) => { colTitle[c.key] = c.title; if (c.group === 'orange') monthly += M.colTot[c.key]; });
    let total = 0;
    const rows = debts.map((d) => {
      const pay = (M && d.col && M.colTot[d.col] != null) ? M.colTot[d.col] : 0;
      const amount = Number(d.amount) || 0;
      total += amount;
      return Object.assign({}, d, { amount, pay, colTitle: colTitle[d.col], left: Math.max(0, amount - pay), monthsN: pay > 0 ? Math.ceil(amount / pay) : null });
    });
    return { rows, total, monthly, monthsAll: monthly > 0 ? Math.ceil(total / monthly) : null, M };
  }

  // ================= Отрисовка =================
  const $app = document.getElementById('app');
  let renderQueued = false;
  let renderPending = false;

  function scheduleRender() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => { renderQueued = false; render(); });
  }

  function render() {
    // Не мешаем вводу: если человек печатает в поле, обновим экран после.
    const ae = document.activeElement;
    if (ae && ae.closest && ae.closest('#view') && /INPUT|SELECT|TEXTAREA/.test(ae.tagName)) { renderPending = true; return; }
    renderPending = false;

    if (!state.user) { $app.innerHTML = renderLogin(); return; }
    const ms = months();
    if (!state.month || !ms.includes(state.month)) state.month = pickDefaultMonth(ms);

    const wrap = document.querySelector('.tbl-wrap');
    const scrollLeft = wrap ? wrap.scrollLeft : 0;
    const scrollY = window.scrollY;

    const showMonths = ['table', 'debts', 'itog'].includes(state.tab);
    let body = '';
    if (state.tab === 'table') body = renderTable();
    else if (state.tab === 'debts') body = renderDebts();
    else if (state.tab === 'akm') body = renderAkmaral();
    else if (state.tab === 'itog') body = renderItog();
    else body = renderMore();

    $app.innerHTML = `
      <header class="top">
        <div class="top-inner">
          <div class="top-row"><h1>Семейный бюджет</h1><span class="who-chip">${esc(state.user.name)}</span></div>
          ${showMonths ? renderMonths(ms) : ''}
        </div>
      </header>
      ${renderTabs()}
      ${renderBanner()}
      <main id="view">${body}</main>
      <div id="toast-root"></div>`;

    const w2 = document.querySelector('.tbl-wrap');
    if (w2) w2.scrollLeft = scrollLeft;
    window.scrollTo(0, scrollY);
  }

  function pickDefaultMonth(ms) {
    const d = new Date();
    const cur = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    if (ms.includes(cur)) return cur;
    return ms[ms.length - 1] || null;
  }

  function renderMonths(ms) {
    return `<div class="months">${ms.map((m) => `<button class="m-btn ${m === state.month ? 'on' : ''}" data-act="month" data-m="${m}">${ymTitle(m)}</button>`).join('')}
      <button class="m-btn add" data-act="newmonth">＋ Новый месяц</button></div>`;
  }

  function renderTabs() {
    const t = [['table', '▦', 'Таблица'], ['debts', '⚖', 'Долги'], ['akm', '🧮', 'Акмарал'], ['itog', '∑', 'Итог'], ['more', '☰', 'Ещё']];
    return `<nav class="tabs">${t.map(([k, ic, l]) => `<button class="tab ${state.tab === k ? 'on' : ''}" data-act="tab" data-tab="${k}"><span class="ic">${ic}</span>${l}</button>`).join('')}</nav>`;
  }

  function renderBanner() {
    if (!USE_CLOUD) return '<div class="banner">Демо-режим: данные хранятся только на этом устройстве. Чтобы семья работала вместе, подключите общую базу (инструкция в README).</div>';
    if (!isOnline()) return '<div class="banner off">Нет интернета. Показаны последние сохранённые данные. Изменения сейчас не сохранятся.</div>';
    return '';
  }

  // ---------- Таблица ----------
  function lastChangeLine(ym) {
    let last = null;
    for (const it of items.values()) {
      if (it.month !== ym || !it.updated_by || it.updated_by === SEED_BY) continue;
      if (!last || it.updated_at > last.updated_at) last = it;
    }
    if (!last) return '';
    return `<p class="last-change">Последнее изменение: <b>${esc(last.updated_by)}</b>, ${fmtWhen(last.updated_at)} — ${esc(itemLabel(last))}</p>`;
  }

  function itemLabel(it) {
    if (it.kind === 'cell') {
      const { rowId, key } = splitCellId(it.id);
      const row = items.get(rowId); const col = items.get(colId(it.month, key));
      return (row ? row.data.name : 'строка') + ' · ' + (col ? col.data.title : key);
    }
    if (it.kind === 'row') return 'строка «' + (it.data.name || '') + '»';
    if (it.kind === 'col') return 'колонка «' + (it.data.title || '') + '»';
    if (it.kind === 'month') return 'новый месяц';
    return '';
  }

  function splitCellId(id) {
    const i = id.lastIndexOf('|');
    return { rowId: id.slice(2, i), key: id.slice(i + 1) };
  }

  function renderTable() {
    if (!state.month) return '<div class="card">Пока нет ни одного месяца. Нажмите «Новый месяц».</div>';
    const M = model(state.month);
    const cols = M.cols;

    let r1 = `<th rowspan="2" class="sticky">статья</th><th rowspan="2">приход</th><th rowspan="2">халык<br><span class="small">${M.pct}%</span></th><th rowspan="2">фактический<br>приход</th>`;
    let r2 = '';
    const thCol = (c, rs) => `<th ${rs ? 'rowspan="2"' : ''} class="ed ${c.group ? 'g-' + c.group : ''}" data-act="col" data-col="${esc(c.key)}" title="${esc(c.hint || '')}">${titleHtml(c.title)}</th>`;
    for (let i = 0; i < cols.length;) {
      const g = cols[i].group;
      if (g && GROUP_LABEL[g]) {
        let j = i;
        while (j < cols.length && cols[j].group === g) j++;
        r1 += `<th colspan="${j - i}" class="grp g-${g}">${GROUP_LABEL[g]}</th>`;
        for (let k = i; k < j; k++) r2 += thCol(cols[k], false);
        i = j;
      } else { r1 += thCol(cols[i], true); i++; }
    }
    r1 += '<th rowspan="2" class="rest">Остаток</th>';

    const rowHtml = (r) => {
      let h = `<tr><th class="sticky ed" data-act="row" data-row="${esc(r.id)}"><b>${esc(r.name)}</b>${r.note ? `<small>${esc(r.note)}</small>` : ''}</th>`;
      h += `<td class="num ed" data-act="row" data-row="${esc(r.id)}">${fmtOpt(r.income)}</td>`;
      h += `<td class="num ed" data-act="row" data-row="${esc(r.id)}">${fmtOpt(r.halyk)}</td>`;
      h += `<td class="num ed ${r.manual ? 'manual' : ''}" data-act="row" data-row="${esc(r.id)}" title="${r.manual ? 'введено вручную' : 'приход − халык'}">${(r.manual || r.fact) ? fmt(r.fact) : ''}</td>`;
      cols.forEach((c) => {
        if (c.akm && !r.akmaral) { h += '<td class="num closed" data-act="closed"></td>'; return; }
        const d = r.cells[c.key];
        const id = cellId(r.id, c.key);
        let cls = 'num ed';
        let inner = '';
        let title = '';
        if (d) {
          inner = fmtOpt(d.v);
          if (d.st) {
            if (c.paint) cls += ' st-' + d.st;
            else inner += `<span class="dot ${d.st}"></span>`;
          }
          if (d.st === 'partial') {
            title = `оплачено ${fmt(d.paidAmt)} из ${fmt(d.v)}, осталось ${fmt(d.v - d.paidAmt)}`;
            inner += `<small class="sub">ост. ${fmt(d.v - d.paidAmt)}</small>`;
          }
          if (d.it && d.it.updated_by && d.it.updated_by !== SEED_BY) title += (title ? '\n' : '') + d.it.updated_by + ', ' + fmtWhen(d.it.updated_at);
          if (state.flash.has(id)) cls += ' flash';
        }
        h += `<td class="${cls}" data-act="cell" data-row="${esc(r.id)}" data-col="${esc(c.key)}" title="${esc(title)}">${inner}</td>`;
      });
      h += `<td class="num rest">${fmt(r.rest)}</td></tr>`;
      return h;
    };

    const regular = M.rows.filter((r) => !r.akmaral);
    const akm = M.rows.filter((r) => r.akmaral);
    let body = regular.map(rowHtml).join('');
    const emptyCells = '<td class="ed" data-act="newrow"></td>'.repeat(cols.length + 4);
    for (let i = 0; i < 2; i++) body += `<tr class="empty"><th class="sticky ed" data-act="newrow">＋ строка</th>${emptyCells}</tr>`;
    body += akm.map(rowHtml).join('');

    const foot = (label, cls, get, rest) =>
      `<tr class="${cls}"><th class="sticky">${label}</th>${get('income')}${get('halyk')}${get('fact')}${cols.map((c) => get(c.key, true)).join('')}<td class="num rest">${rest}</td></tr>`;
    const td = (v) => `<td class="num">${fmtOpt(v)}</td>`;
    const tTotal = foot('итого', 'total', (k, isCol) => td(isCol ? M.colTot[k] : M.tot[k]), fmt(M.tot.rest));
    const tPaid = foot('оплачено', 'pay', (k, isCol) => isCol ? td(M.colPaid[k]) : '<td></td>', '');
    const tLeft = foot('осталось оплатить', 'pay', (k, isCol) => isCol ? td(M.colTot[k] - M.colPaid[k]) : '<td></td>', '');

    return `
      ${installBanner()}
      ${lastChangeLine(state.month)}
      <p class="hint">Нажмите на ячейку, чтобы ввести сумму или отметить оплату. Таблица листается вбок. Суммы в тенге (₸).</p>
      <div class="tbl-wrap">
        <table class="xl">
          <thead><tr>${r1}</tr><tr>${r2}</tr></thead>
          <tbody>${body}</tbody>
          <tfoot>${tTotal}${tPaid}${tLeft}</tfoot>
        </table>
      </div>
      <div class="legend">
        <span><i class="sw paid"></i>оплачено</span>
        <span><i class="sw unpaid"></i>не оплачено</span>
        <span><i class="sw partial"></i>частично</span>
        <span><i class="sw closed"></i>только в строке Акмарал</span>
      </div>
      <p class="hint">Цветом закрашиваются Музыкалка, Англ. Медина, колледжи и Кредит Батый. В других колонках отметка — маленькая точка в углу. Синяя точка слева — фактический приход введён вручную.</p>
      <div class="row-btns"><button class="btn" data-act="excel">⬇ Скачать в Excel</button></div>
      <button class="mic-fab" data-act="voice" aria-label="Голосовой ввод">🎤</button>`;
  }

  // ---------- Долги ----------
  function renderDebts() {
    const D = debtModel(state.month);
    return `<div class="narrow">
      <h2>Долги</h2>
      <div class="stats">
        <div class="stat main"><div class="lbl">Общий долг</div><div class="val">${money(D.total)}</div></div>
        <div class="stat"><div class="lbl">Платим в месяц (${ymTitle(state.month)})</div><div class="val">${money(D.monthly)}</div><div class="sub">из колонок «Долг …» таблицы</div></div>
        <div class="stat"><div class="lbl">Весь долг погасим</div><div class="val">${D.monthsAll ? 'за ' + D.monthsAll + ' мес.' : '—'}</div><div class="sub">${D.monthsAll ? 'если каждый месяц платить ' + money(D.monthly) : 'в таблице нет платежей по долгам'}</div></div>
      </div>
      <div class="card">
        <h3>Кому и сколько</h3>
        ${D.rows.map((d) => `<button class="list-item" data-act="debt" data-id="${esc(d.id)}">
            <div><div class="t">${esc(d.name)}</div>
              <div class="d">${d.pay ? 'платим ' + money(d.pay) + ' в месяц · после платежа ' + money(d.left) + ' · погасим за ' + d.monthsN + ' мес.' : (d.col ? 'в этом месяце платежа нет' : 'платёж не привязан к колонке')}</div></div>
            <div class="v">${money(d.amount)}</div></button>`).join('') || '<p class="muted">Пока никого нет.</p>'}
        <div class="row-btns"><button class="btn primary" data-act="debt-add">＋ Добавить человека</button></div>
      </div>
      <p class="hint">Нажмите на человека, чтобы изменить сумму. Платёж в месяц считается сам из колонки «Долг …» выбранного месяца.</p>
    </div>`;
  }

  // ---------- Платежи Акмарал ----------
  function akmData() { return Object.assign({ rate: 5000, rate2: 10000, products: 250000, payments: [] }, (items.get('akmaral') || {}).data); }

  function akmCalc(rate, products, payments) {
    let prod = 0;
    let debt = 0; let top = 0;
    const rows = payments.map((p) => {
      p = Number(p) || 0;
      const toDebt = Math.min(rate, p);
      const rest = p - toDebt;
      const toProd = Math.max(0, Math.min(rest, products - prod));
      prod += toProd;
      const over = rest - toProd;
      debt += toDebt; top += over;
      return { p, toDebt, rest, toProd, over };
    });
    return { rows, debt, prod, top, total: payments.reduce((s, p) => s + (Number(p) || 0), 0), shortage: Math.max(0, products - prod) };
  }

  function renderAkmaral() {
    const A = akmData();
    const C = akmCalc(A.rate, A.products, A.payments);
    const D = debtModel(state.month);
    // Платежи по долгам из таблицы, кроме строки Акмарал.
    let otherDebt = 0;
    if (D.M) D.M.rows.forEach((r) => { if (r.akmaral) return; D.M.cols.forEach((c) => { if (c.group === 'orange' && r.cells[c.key]) otherDebt += r.cells[c.key].v; }); });
    const variant = (rate) => {
      const X = akmCalc(rate, A.products, A.payments);
      const only = X.debt > 0 ? Math.ceil(D.total / X.debt) : null;
      const withTable = (X.debt + otherDebt) > 0 ? Math.ceil(D.total / (X.debt + otherDebt)) : null;
      return `<div class="stat"><div class="lbl">Ставка ${money(rate)}</div>
        <div class="sub">на долг в месяц</div><div class="val">${money(X.debt)}</div>
        <div class="sub">на продукты: ${money(X.prod)}<br>сверху: ${money(X.top)}</div>
        <div class="sub" style="margin-top:8px">Долг ${money(D.total)} гасится:</div>
        <div class="val">${only ? only + ' мес.' : '—'}</div><div class="sub">только с этих платежей</div>
        <div class="val">${withTable ? withTable + ' мес.' : '—'}</div><div class="sub">вместе с другими платежами по долгам из таблицы (${money(otherDebt)})</div>
      </div>`;
    };
    return `<div class="narrow">
      <h2>Платежи Акмарал</h2>
      <div class="card">
        <label class="f">Ставка на долг с каждого платежа клиента, ₸<input data-akm="rate" inputmode="numeric" value="${fmt(A.rate)}"></label>
        <label class="f">Нужно на продукты в месяц, ₸<input data-akm="products" inputmode="numeric" value="${fmt(A.products)}"></label>
      </div>
      <div class="card">
        <h3>Платежи клиентов</h3>
        <div class="pay-list">
          ${A.payments.map((p, i) => `<div class="pay-row"><span class="n">${i + 1}.</span><input data-akm-pay="${i}" inputmode="numeric" value="${fmt(p)}"><button class="x" data-act="akm-del" data-i="${i}" aria-label="Удалить">✕</button></div>`).join('')}
        </div>
        <div class="row-btns"><button class="btn" data-act="akm-add">＋ Добавить платёж</button></div>
      </div>
      <div class="card scroll-x">
        <h3>Куда идут деньги (ставка ${money(A.rate)})</h3>
        <table class="plain">
          <thead><tr><th>Платёж</th><th>На долг</th><th>Остаётся</th><th>На продукты</th><th>Сверху</th></tr></thead>
          <tbody>${C.rows.map((r) => `<tr><td>${fmt(r.p)}</td><td>${fmt(r.toDebt)}</td><td>${fmt(r.rest)}</td><td>${fmt(r.toProd)}</td><td>${fmt(r.over)}</td></tr>`).join('')}</tbody>
          <tfoot><tr><td>${fmt(C.total)}</td><td>${fmt(C.debt)}</td><td>${fmt(C.total - C.debt)}</td><td>${fmt(C.prod)}</td><td>${fmt(C.top)}</td></tr></tfoot>
        </table>
        <p class="hint" style="margin-top:10px">${C.shortage > 0 ? 'На продукты пока не хватает ' + money(C.shortage) + '.' : 'Продукты покрыты полностью.'}</p>
      </div>
      <h3>Сравнение ставок</h3>
      <div class="cmp">${variant(A.rate)}${variant(A.rate2)}</div>
      <div class="card" style="margin-top:12px">
        <label class="f">Вторая ставка для сравнения, ₸<input data-akm="rate2" inputmode="numeric" value="${fmt(A.rate2)}"></label>
      </div>
    </div>`;
  }

  // ---------- Итог месяца ----------
  function renderItog() {
    if (!state.month) return '';
    const M = model(state.month);
    const got = M.tot.fact;
    const paid = M.tot.paid;
    const hands = got - paid;
    const left = M.tot.exp - paid;
    const enough = hands - left;
    return `<div class="narrow">
      <h2>Итог: ${ymTitle(state.month, true)}</h2>
      <div class="stats">
        <div class="stat"><div class="lbl">Получено</div><div class="val">${money(got)}</div><div class="sub">фактический приход по всем строкам</div></div>
        <div class="stat"><div class="lbl">Уже оплачено</div><div class="val">${money(paid)}</div></div>
        <div class="stat"><div class="lbl">Деньги на руках</div><div class="val">${money(hands)}</div><div class="sub">получено − оплачено</div></div>
        <div class="stat"><div class="lbl">Осталось оплатить</div><div class="val">${money(left)}</div></div>
        <div class="stat main"><div class="lbl">Хватит ли?</div><div class="val">${money(enough)}</div><div class="sub">${enough >= 0 ? 'Хватает, останется ' + money(enough) : 'Не хватает ' + money(-enough)} (на руках − осталось оплатить)</div></div>
        <div class="stat"><div class="lbl">Удержано на Халык</div><div class="val">${money(M.tot.halyk)}</div><div class="sub">${M.pct}% с Bus Logistic и теплицы</div></div>
      </div>
      <p class="hint">«Оплачено» считается по отметкам в таблице: жёлтая — вся сумма, фиолетовая — сколько указано.</p>
    </div>`;
  }

  // ---------- Ещё: участники, халык, история ----------
  function renderMore() {
    const S = settings();
    const members = list('member').sort((a, b) => (a.data.name || '').localeCompare(b.data.name || '', 'ru'));
    const hist = state.history;
    return `<div class="narrow">
      <h2>Ещё</h2>
      <div class="card">
        <h3>Вы вошли как ${esc(state.user.name)}</h3>
        <div class="row-btns"><button class="btn" data-act="pin-change">Сменить PIN</button><button class="btn" data-act="logout">Выйти</button></div>
      </div>
      ${renderInstallCard()}
      <div class="card">
        <h3>Участники</h3>
        ${members.map((m) => `<div class="list-item"><div class="t">${esc(m.data.name)}</div><div class="d">${m.id === state.user.id ? 'это вы' : ''}</div></div>`).join('')}
        <div class="row-btns"><button class="btn primary" data-act="member-add">＋ Добавить участника</button></div>
        <p class="hint" style="margin-top:10px">У всех одинаковые права: смотреть, вводить и менять.</p>
      </div>
      <div class="card">
        <h3>Халык</h3>
        <label class="f">Процент, который удерживается, %<input id="f-pct" inputmode="decimal" value="${esc(S.halykPct)}"></label>
        <button class="btn block" data-act="pct-save">Сохранить процент</button>
      </div>
      <div class="card">
        <h3>История изменений</h3>
        <p class="hint">Кто и когда менял данные. Кнопка «Вернуть» ставит прежнее значение.</p>
        ${hist == null ? '<button class="btn block" data-act="hist-load">Показать историю</button>' : renderHistory(hist)}
      </div>
      <div class="card">
        <h3>Подключение</h3>
        <p class="muted small">${USE_CLOUD ? (isOnline() ? 'Общая база подключена. Изменения видны всем сразу.' : 'Нет связи с общей базой.') : 'Демо-режим: данные только на этом устройстве. Подключите Supabase — инструкция в файле budget/README.md.'}</p>
      </div>
    </div>`;
  }

  const isStandalone = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

  function renderInstallCard() {
    if (isStandalone()) return '<div class="card"><h3>Приложение на телефоне</h3><p class="muted small">Приложение установлено на главный экран.</p></div>';
    let how;
    if (state.installPrompt) how = '<button class="btn primary block" data-act="install">📲 Установить на главный экран</button>';
    else if (isIos()) how = '<p class="small">В Safari нажмите кнопку «Поделиться» <b>⬆</b> внизу экрана, затем «На экран „Домой“» и «Добавить».</p>';
    else how = '<p class="small">В Chrome нажмите меню <b>⋮</b> справа вверху, затем «Установить приложение» или «Добавить на главный экран».</p>';
    return `<div class="card"><h3>Установить на телефон</h3><p class="hint">Иконка «Бюджет» появится на главном экране, приложение откроется без адресной строки.</p>${how}</div>`;
  }

  function installBanner() {
    if (!state.installPrompt || isStandalone() || lsGet('budget-install-hide', false)) return '';
    return `<div class="install-bar"><span>Установить «Бюджет» на главный экран?</span>
      <button class="btn small-btn primary" data-act="install">Установить</button><button class="x" data-act="install-hide" aria-label="Скрыть">✕</button></div>`;
  }

  function cellText(d) {
    if (!d) return 'пусто';
    let s = d.v ? fmt(d.v) : 'пусто';
    if (d.st) s += ' (' + ST_NAME[d.st] + (d.st === 'partial' ? ' ' + fmt(d.paid) : '') + ')';
    return s;
  }

  function describe(h) {
    const o = h.old_data; const n = h.new_data || {};
    const removed = h.new_deleted && !h.old_deleted;
    const restored = h.old_deleted && !h.new_deleted;
    const mt = h.month ? ymTitle(h.month) + ' · ' : '';
    switch (h.kind) {
      case 'cell': {
        const { rowId, key } = splitCellId(h.item_id);
        const row = items.get(rowId); const col = items.get(colId(h.month, key));
        const where = mt + (row ? row.data.name : 'строка') + ' · ' + (col ? col.data.title : key);
        if (removed) return where + ': очищено (было ' + cellText(o) + ')';
        return where + ': ' + cellText(o) + ' → ' + cellText(n);
      }
      case 'row':
        if (!o) return mt + 'добавлена строка «' + n.name + '»';
        if (removed) return mt + 'удалена строка «' + n.name + '»';
        if (restored) return mt + 'возвращена строка «' + n.name + '»';
        return mt + 'строка «' + n.name + '»: приход ' + fmt(o.income) + ' → ' + fmt(n.income) + ', факт ' + (o.fact != null ? fmt(o.fact) : 'авто') + ' → ' + (n.fact != null ? fmt(n.fact) : 'авто') + (o.name !== n.name ? ', название «' + o.name + '»' : '');
      case 'col':
        if (!o) return mt + 'добавлена колонка «' + n.title + '»';
        return mt + 'колонка «' + o.title + '» → «' + n.title + '»';
      case 'debt':
        if (!o) return 'добавлен долг: ' + n.name + ' ' + money(n.amount);
        if (removed) return 'удалён долг: ' + n.name;
        return 'долг ' + n.name + ': ' + money(o.amount) + ' → ' + money(n.amount);
      case 'settings': return 'халык: ' + (o ? o.halykPct : '—') + '% → ' + n.halykPct + '%';
      case 'akmaral': return 'калькулятор Акмарал: ставка ' + fmt(o ? o.rate : 0) + ' → ' + fmt(n.rate) + ', платежей ' + (o ? (o.payments || []).length : 0) + ' → ' + (n.payments || []).length;
      case 'member': return o ? 'участник ' + n.name + ': изменён PIN' : 'добавлен участник ' + n.name;
      case 'month': return removed ? 'удалён месяц ' + ymTitle(h.month) : 'создан месяц ' + ymTitle(h.month);
      default: return h.item_id;
    }
  }

  function renderHistory(hist) {
    // Копии строк, колонок и сумм при создании нового месяца показываем одной записью «создан месяц».
    const monthMade = new Set(hist.filter((h) => h.kind === 'month' && !h.old_data).map((h) => h.month + '|' + h.changed_at));
    const rows = hist.filter((h) => h.changed_by !== SEED_BY &&
      !(h.kind !== 'month' && !h.old_data && monthMade.has(h.month + '|' + h.changed_at)));
    if (!rows.length) return '<p class="muted">Изменений пока нет.</p><button class="btn block" data-act="hist-load">Обновить</button>';
    return rows.slice(0, 150).map((h) => `<div class="hist-item"><div class="body">${esc(describe(h))}<div class="meta">${esc(h.changed_by || '')} · ${fmtWhen(h.changed_at)}</div></div>
        ${h.kind !== 'member' ? `<button class="btn small-btn" data-act="hist-undo" data-hid="${h.id}">Вернуть</button>` : ''}</div>`).join('') +
      '<div class="row-btns"><button class="btn" data-act="hist-load">Обновить</button></div>';
  }

  // ---------- Вход ----------
  function renderLogin() {
    const members = list('member').sort((a, b) => (a.data.name || '').localeCompare(b.data.name || '', 'ru'));
    const banner = renderBanner();
    if (USE_CLOUD && !state.loaded) {
      return `<div class="login"><h1>Семейный бюджет</h1><p class="muted">Нет связи с общей базой. Проверьте интернет и обновите страницу.</p><button class="btn primary block" data-act="reload">Обновить</button></div>`;
    }
    if (!members.length) {
      return `${banner}<div class="login"><h1>Семейный бюджет</h1>
        <p class="muted">Первый вход. Введите своё имя и придумайте PIN-код (от 4 цифр). Остальных членов семьи добавите потом в разделе «Ещё».</p>
        <form data-form="first">
          <label class="f">Имя<input name="name" autocomplete="name" required></label>
          <label class="f">PIN-код<input name="pin" type="password" inputmode="numeric" autocomplete="new-password" required></label>
          <label class="f">Повторите PIN<input name="pin2" type="password" inputmode="numeric" autocomplete="new-password" required></label>
          <p class="err-text" id="login-err" hidden></p>
          <button class="btn primary block">Войти</button>
        </form></div>`;
    }
    const pick = state.loginPick && members.find((m) => m.id === state.loginPick);
    return `${banner}<div class="login"><h1>Семейный бюджет</h1>
      <p class="muted">Кто вы?</p>
      <div class="names">${members.map((m) => `<button class="btn ${pick && pick.id === m.id ? 'on' : ''}" data-act="pick" data-id="${esc(m.id)}">${esc(m.data.name)}</button>`).join('')}</div>
      ${pick ? `<form data-form="login">
          <label class="f">PIN-код для «${esc(pick.data.name)}»<input name="pin" type="password" inputmode="numeric" autocomplete="current-password" required autofocus></label>
          <p class="err-text" id="login-err" hidden></p>
          <button class="btn primary block">Войти</button>
        </form>` : '<p class="hint">Вас нет в списке? Попросите члена семьи добавить вас в разделе «Ещё → Участники».</p>'}
    </div>`;
  }

  // ================= Окна редактирования =================
  function openSheet(title, html, onMount) {
    closeSheet();
    const root = document.createElement('div');
    root.className = 'sheet-bg';
    root.id = 'sheet';
    root.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><div class="sheet-head"><h2>${esc(title)}</h2><button class="x" data-close aria-label="Закрыть">✕</button></div><div class="sheet-body">${html}</div></div>`;
    root.addEventListener('click', (e) => { if (e.target === root || e.target.closest('[data-close]')) closeSheet(); });
    document.body.appendChild(root);
    document.body.style.overflow = 'hidden';
    root.querySelectorAll('input[inputmode="numeric"]:not([type="password"])').forEach(liveFormat);
    if (onMount) onMount(root);
  }
  // Своё окно подтверждения вместо системного confirm().
  function askConfirm(text, okLabel) {
    return new Promise((resolve) => {
      let done = false;
      openSheet('Подтвердите', `<p>${esc(text)}</p>
        <div class="row-btns"><button class="btn primary" id="b-yes">${esc(okLabel || 'Да')}</button><button class="btn" id="b-no">Отмена</button></div>`, (root) => {
        const finish = (v) => { if (done) return; done = true; closeSheet(); resolve(v); };
        root.querySelector('#b-yes').addEventListener('click', () => finish(true));
        root.querySelector('#b-no').addEventListener('click', () => finish(false));
        root.addEventListener('click', (e) => { if (e.target === root || e.target.closest('[data-close]')) finish(false); });
      });
    });
  }
  function closeSheet() {
    const s = document.getElementById('sheet');
    if (s) s.remove();
    document.body.style.overflow = '';
  }
  function liveFormat(inp) {
    inp.addEventListener('input', () => {
      const n = parseNum(inp.value);
      if (n == null || isNaN(n)) return;
      const f = fmt(n);
      if (inp.value !== f) inp.value = f;
    });
  }
  function showErr(root, msg) {
    const e = root.querySelector('.err-text');
    if (e) { e.textContent = msg; e.hidden = false; } else toast(msg, true);
  }
  const whoLine = (it) => (it && it.updated_by ? `<p class="who">Изменил(а): ${esc(it.updated_by)}, ${fmtWhen(it.updated_at)}</p>` : '');

  function editCell(rowId, key) {
    const M = model(state.month);
    const r = M.rows.find((x) => x.id === rowId);
    const c = M.cols.find((x) => x.key === key);
    if (!r || !c) return;
    const id = cellId(rowId, key);
    const it = items.get(id);
    const d = Object.assign({}, it ? it.data : {});
    let st = d.st || '';
    openSheet(r.name + ' · ' + c.title, `
      ${c.hint ? `<p class="hint">${esc(c.hint)}</p>` : ''}
      <label class="f">Сумма, ₸<input id="f-v" inputmode="numeric" value="${fmtOpt(d.v)}" placeholder="0"></label>
      <div class="small muted">Отметка оплаты</div>
      <div class="st-btns">
        <button class="st-btn paid" data-st="paid">Оплачено</button>
        <button class="st-btn unpaid" data-st="unpaid">Не оплачено</button>
        <button class="st-btn partial" data-st="partial">Частично</button>
        <button class="st-btn none" data-st="">Без отметки</button>
      </div>
      <div id="partial-box" hidden>
        <label class="f">Сколько уже оплачено, ₸<input id="f-paid" inputmode="numeric" value="${fmtOpt(d.paid)}"></label>
        <p class="info-box" id="partial-info"></p>
      </div>
      ${c.paint ? '' : '<p class="hint">В этой колонке ячейка не закрашивается, отметка видна точкой в углу.</p>'}
      <p class="err-text" hidden></p>
      <div class="row-btns"><button class="btn primary" id="b-save">Сохранить</button>${it ? '<button class="btn danger" id="b-clear">Очистить</button>' : ''}</div>
      ${whoLine(it)}`, (root) => {
      const $v = root.querySelector('#f-v'); const $p = root.querySelector('#f-paid');
      const sync = () => {
        root.querySelectorAll('.st-btn').forEach((b) => b.classList.toggle('on', b.dataset.st === st));
        root.querySelector('#partial-box').hidden = st !== 'partial';
        const v = parseNum($v.value) || 0; const p = parseNum($p.value) || 0;
        root.querySelector('#partial-info').textContent = `оплачено ${fmt(p)} из ${fmt(v)}, осталось ${fmt(Math.max(0, v - p))}`;
      };
      root.querySelectorAll('.st-btn').forEach((b) => b.addEventListener('click', () => { st = b.dataset.st; sync(); if (st === 'partial') $p.focus(); }));
      $v.addEventListener('input', sync); $p.addEventListener('input', sync);
      sync();
      if (!it) setTimeout(() => $v.focus(), 50);
      root.querySelector('#b-save').addEventListener('click', async () => {
        const v = parseNum($v.value);
        if (isNaN(v)) return showErr(root, 'Введите сумму цифрами, например 25 000');
        if (v != null && v < 0) return showErr(root, 'Сумма не может быть меньше нуля');
        const data = { v: v || 0 };
        if (st) data.st = st;
        if (st === 'partial') {
          const p = parseNum($p.value);
          if (p == null || isNaN(p) || p <= 0) return showErr(root, 'Укажите, сколько уже оплачено');
          if (p > data.v) return showErr(root, 'Оплачено не может быть больше суммы');
          data.paid = p;
        }
        if (!data.v && !st) { if (it) await saveItems([{ id, kind: 'cell', month: state.month, data: it.data, deleted: true }]); closeSheet(); return; }
        if (await saveItems([{ id, kind: 'cell', month: state.month, data }])) closeSheet();
      });
      const cl = root.querySelector('#b-clear');
      if (cl) cl.addEventListener('click', async () => { if (await saveItems([{ id, kind: 'cell', month: state.month, data: it.data, deleted: true }])) closeSheet(); });
    });
  }

  function editRow(rowId) {
    const it = rowId ? items.get(rowId) : null;
    const d = Object.assign({ name: '', note: '', income: null, halyk: false, fact: null }, it ? it.data : {});
    const pct = settings().halykPct;
    openSheet(it ? 'Строка: ' + d.name : 'Новая строка прихода', `
      <label class="f">Название<input id="f-name" value="${esc(d.name)}" placeholder="например, Евробетон"></label>
      <label class="f">Когда приходит<input id="f-note" value="${esc(d.note)}" placeholder="например, 15–25-е"></label>
      <label class="f">Приход, ₸<input id="f-inc" inputmode="numeric" value="${fmtOpt(d.income)}" placeholder="0"></label>
      ${d.akmaral ? '' : `<label class="chk"><input type="checkbox" id="f-hal" ${d.halyk ? 'checked' : ''}> Удерживать халык (${esc(pct)}%)</label>`}
      <label class="f">Фактический приход, ₸<input id="f-fact" inputmode="numeric" value="${d.fact != null ? fmt(d.fact) : ''}" placeholder="посчитается сам"></label>
      <p class="info-box" id="row-info"></p>
      <p class="err-text" hidden></p>
      <div class="row-btns"><button class="btn primary" id="b-save">Сохранить</button>${it && !d.akmaral ? '<button class="btn danger" id="b-del">Удалить строку</button>' : ''}</div>
      ${whoLine(it)}`, (root) => {
      const q = (s) => root.querySelector(s);
      const info = () => {
        const inc = parseNum(q('#f-inc').value) || 0;
        const hal = q('#f-hal') && q('#f-hal').checked ? Math.round(inc * pct / 100) : 0;
        const f = parseNum(q('#f-fact').value);
        q('#row-info').textContent = (f != null && !isNaN(f))
          ? 'Фактический приход введён вручную: ' + money(f) + '. Сотрите его, чтобы считалось само.'
          : 'Посчитается само: ' + money(inc) + ' − халык ' + money(hal) + ' = ' + money(inc - hal);
      };
      root.querySelectorAll('input').forEach((i) => i.addEventListener('input', info));
      info();
      if (!it) setTimeout(() => q('#f-name').focus(), 50);
      q('#b-save').addEventListener('click', async () => {
        const name = q('#f-name').value.trim();
        if (!name) return showErr(root, 'Напишите название строки');
        const inc = parseNum(q('#f-inc').value); const fact = parseNum(q('#f-fact').value);
        if (isNaN(inc) || isNaN(fact)) return showErr(root, 'Введите сумму цифрами, например 250 000');
        const data = Object.assign({}, d, { name, note: q('#f-note').value.trim(), income: inc, fact, halyk: q('#f-hal') ? q('#f-hal').checked : false });
        if (!it) {
          const rows = list('row', state.month).filter((x) => !x.data.akmaral);
          data.pos = rows.reduce((m, x) => Math.max(m, x.data.pos || 0), 0) + 10;
        }
        const id = rowId || 'r|' + state.month + '|' + uid();
        if (await saveItems([{ id, kind: 'row', month: state.month, data }])) closeSheet();
      });
      const del = q('#b-del');
      if (del) del.addEventListener('click', async () => {
        if (!await askConfirm('Удалить строку «' + d.name + '»? Её можно вернуть в «Ещё → История».', 'Удалить')) return;
        await saveItems([{ id: rowId, kind: 'row', month: state.month, data: it.data, deleted: true }]);
      });
    });
  }

  function editCol(key) {
    const id = colId(state.month, key);
    const it = items.get(id);
    if (!it) return;
    const d = it.data;
    openSheet('Колонка', `
      <label class="f">Название<input id="f-title" value="${esc(d.title)}"></label>
      <label class="f">Подсказка<input id="f-hint" value="${esc(d.hint || '')}" placeholder="например, платить до 20-го"></label>
      <p class="hint">Меняется только в месяце «${ymTitle(state.month)}». Новые месяцы берут названия из предыдущего.</p>
      <p class="err-text" hidden></p>
      <div class="row-btns"><button class="btn primary" id="b-save">Сохранить</button></div>
      ${whoLine(it)}`, (root) => {
      root.querySelector('#b-save').addEventListener('click', async () => {
        const title = root.querySelector('#f-title').value.trim();
        if (!title) return showErr(root, 'Напишите название колонки');
        const data = Object.assign({}, d, { title, hint: root.querySelector('#f-hint').value.trim() });
        if (await saveItems([{ id, kind: 'col', month: state.month, data }])) closeSheet();
      });
    });
  }

  function editDebt(id) {
    const it = id ? items.get(id) : null;
    const d = Object.assign({ name: '', amount: 0, col: null }, it ? it.data : {});
    const M = state.month ? model(state.month) : { cols: [] };
    const debtCols = M.cols.filter((c) => c.group === 'orange');
    openSheet(it ? 'Долг: ' + d.name : 'Новый долг', `
      <label class="f">Кому<input id="f-name" value="${esc(d.name)}"></label>
      <label class="f">Сумма долга, ₸<input id="f-amount" inputmode="numeric" value="${fmtOpt(d.amount)}"></label>
      <label class="f">Платёж в месяц берётся из колонки
        <select id="f-col"><option value="">— нет колонки —</option>
          ${debtCols.map((c) => `<option value="${esc(c.key)}" ${c.key === d.col ? 'selected' : ''}>${esc(c.title)}</option>`).join('')}
          ${it ? '' : '<option value="__new">＋ создать колонку «Долг …»</option>'}
        </select></label>
      <p class="err-text" hidden></p>
      <div class="row-btns"><button class="btn primary" id="b-save">Сохранить</button>${it ? '<button class="btn danger" id="b-del">Удалить</button>' : ''}</div>
      ${whoLine(it)}`, (root) => {
      const q = (s) => root.querySelector(s);
      q('#b-save').addEventListener('click', async () => {
        const name = q('#f-name').value.trim();
        const amount = parseNum(q('#f-amount').value);
        if (!name) return showErr(root, 'Напишите, кому долг');
        if (amount == null || isNaN(amount) || amount < 0) return showErr(root, 'Введите сумму долга цифрами');
        let col = q('#f-col').value || null;
        const changes = [];
        if (col === '__new') {
          col = 'dolg_' + uid();
          // Новая колонка — в выбранный месяц и все следующие, после последней колонки долгов.
          months().filter((m) => m >= state.month).forEach((ym) => {
            const cs = list('col', ym).map((x) => x.data).sort((a, b) => a.pos - b.pos);
            const lastOrange = cs.filter((c) => c.group === 'orange').pop();
            const pos = lastOrange ? lastOrange.pos + 1 : (cs.length ? cs[cs.length - 1].pos + 1 : 10);
            changes.push({ id: colId(ym, col), kind: 'col', month: ym, data: { key: col, title: 'Долг ' + name, group: 'orange', pos } });
          });
        }
        const pos = it ? d.pos : list('debt').reduce((m, x) => Math.max(m, x.data.pos || 0), 0) + 10;
        changes.push({ id: id || 'd|' + uid(), kind: 'debt', data: Object.assign({}, d, { name, amount, col, pos }) });
        if (await saveItems(changes)) closeSheet();
      });
      const del = q('#b-del');
      if (del) del.addEventListener('click', async () => {
        if (!await askConfirm('Удалить долг «' + d.name + '»?', 'Удалить')) return;
        await saveItems([{ id, kind: 'debt', data: it.data, deleted: true }]);
      });
    });
  }

  function newMonthDialog() {
    const ms = months();
    const last = ms[ms.length - 1];
    if (!last) return;
    const ym = nextYm(last);
    openSheet('Новый месяц', `
      <p>Создать <b>${ymTitle(ym, true)}</b>?</p>
      <p class="hint">Скопируются строки, колонки и суммы из месяца «${ymTitle(last)}». Отметки оплаты начнутся заново.</p>
      <div class="row-btns"><button class="btn primary" id="b-ok">Создать</button><button class="btn" data-close>Отмена</button></div>`, (root) => {
      root.querySelector('#b-ok').addEventListener('click', async () => {
        const ch = [{ id: 'm|' + ym, kind: 'month', month: ym, data: { ym } }];
        list('col', last).forEach((c) => ch.push({ id: colId(ym, c.data.key), kind: 'col', month: ym, data: Object.assign({}, c.data) }));
        const rowMap = {};
        list('row', last).forEach((r) => {
          const nid = 'r|' + ym + '|' + r.id.slice(r.id.lastIndexOf('|') + 1);
          rowMap[r.id] = nid;
          ch.push({ id: nid, kind: 'row', month: ym, data: Object.assign({}, r.data) });
        });
        list('cell', last).forEach((c) => {
          const { rowId, key } = splitCellId(c.id);
          if (!rowMap[rowId] || !c.data.v) return;
          ch.push({ id: cellId(rowMap[rowId], key), kind: 'cell', month: ym, data: { v: c.data.v } });
        });
        if (await saveItems(ch)) { state.month = ym; closeSheet(); render(); toast('Месяц «' + ymTitle(ym) + '» создан'); }
      });
    });
  }

  function memberDialog(changeOwn) {
    openSheet(changeOwn ? 'Сменить PIN' : 'Новый участник', `
      ${changeOwn ? '' : '<label class="f">Имя<input id="f-name"></label>'}
      <label class="f">${changeOwn ? 'Новый PIN-код' : 'PIN-код (от 4 цифр)'}<input id="f-pin" type="password" inputmode="numeric" autocomplete="new-password"></label>
      <label class="f">Повторите PIN<input id="f-pin2" type="password" inputmode="numeric" autocomplete="new-password"></label>
      <p class="err-text" hidden></p>
      <div class="row-btns"><button class="btn primary" id="b-save">Сохранить</button></div>
      ${changeOwn ? '' : '<p class="hint">Скажите этот PIN новому участнику — он войдёт со своего телефона по той же ссылке.</p>'}`, (root) => {
      const q = (s) => root.querySelector(s);
      q('#b-save').addEventListener('click', async () => {
        const name = changeOwn ? state.user.name : q('#f-name').value.trim();
        const pin = q('#f-pin').value.trim();
        if (!name) return showErr(root, 'Напишите имя');
        if (!changeOwn && list('member').some((m) => m.data.name.toLowerCase() === name.toLowerCase())) return showErr(root, 'Такое имя уже есть');
        if (!/^\d{4,}$/.test(pin)) return showErr(root, 'PIN — это минимум 4 цифры');
        if (pin !== q('#f-pin2').value.trim()) return showErr(root, 'PIN-коды не совпадают');
        const id = changeOwn ? state.user.id : 'u|' + uid();
        const ok = await saveItems([{ id, kind: 'member', data: { name, pinHash: await hashPin(pin, id) } }]);
        if (ok) { closeSheet(); toast(changeOwn ? 'PIN изменён' : 'Участник «' + name + '» добавлен'); }
      });
    });
  }

  // ================= Голосовой ввод =================
  // Человек говорит фразу («квартира 200 тысяч Bus Logistic оплачено»),
  // приложение находит строку, колонку, сумму и отметку и просит подтвердить.
  const NUM_WORDS = {
    ноль: 0, один: 1, одна: 1, одну: 1, два: 2, две: 2, три: 3, четыре: 4, пять: 5, шесть: 6, семь: 7, восемь: 8, девять: 9,
    десять: 10, одиннадцать: 11, двенадцать: 12, тринадцать: 13, четырнадцать: 14, пятнадцать: 15, шестнадцать: 16,
    семнадцать: 17, восемнадцать: 18, девятнадцать: 19, двадцать: 20, тридцать: 30, сорок: 40, пятьдесят: 50,
    шестьдесят: 60, семьдесят: 70, восемьдесят: 80, девяносто: 90, сто: 100, двести: 200, триста: 300, четыреста: 400,
    пятьсот: 500, шестьсот: 600, семьсот: 700, восемьсот: 800, девятьсот: 900, полтора: 1.5, полторы: 1.5,
  };
  const COL_WORDS = {
    kvartira: ['квартир'], ofis: ['офис'], telefon: ['телефон', 'теле2', 'tele2', 'теле 2'],
    komm: ['коммун', 'комм'], komm_alisa: ['комм алис', 'коммуналка алис', 'алис'],
    kredity: ['кредит', 'фридом', 'freedom'], myaso: ['мясо'], produkty: ['продукт'],
    mylo: ['мыло', 'мойк'], taksi: ['такси', 'дорог'], muzyka: ['музык'],
    angl: ['англ', 'английск'], lulua: ['лулу'], batyi: ['колледж батый', 'батый колледж', 'батый', 'батыя'],
    kredit_batyi: ['кредит батый', 'кредит батыя', 'батый кредит'], nalogi: ['налог'], raznoe: ['разное', 'разные'],
    lekarstva: ['лекарств'], otdyh: ['отдых'], dolg_zh: ['жалалдин'], dolg_ai: ['айсулу'], dolg_sab: ['сабыржан'],
    azheke: ['ажеке', 'ажека'], reklama: ['реклам'],
  };
  const ROW_WORDS = { bus: ['bus', 'бас', 'басс', 'логист'], tep: ['теплиц'], euro: ['евробетон', 'евро бетон', 'бетон'], akm: ['акмарал'] };
  const MONTH_STEMS = ['январ', 'феврал', 'март', 'апрел', 'ма[йяе]', 'июн', 'июл', 'август', 'сентябр', 'октябр', 'ноябр', 'декабр'];

  const norm = (s) => ' ' + String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[^0-9a-zа-я]+/g, ' ').trim() + ' ';
  const stems = (title) => norm(title).trim().split(' ').filter((w) => w.length >= 3).map((w) => (w.length > 5 ? w.slice(0, w.length - 2) : w));

  function speechNumbers(text) {
    const t = String(text).toLowerCase().replace(/ё/g, 'е')
      .replace(/(\d)[\s  ]+(?=\d{3}(?!\d))/g, '$1').replace(/(\d),(\d)/g, '$1.$2');
    const tokens = t.split(/[^0-9a-zа-я.]+/).filter(Boolean);
    const out = [];
    let total = 0; let cur = 0; let has = false; let lastDigit = false;
    const flush = () => { if (has) out.push(Math.round(total + cur)); total = 0; cur = 0; has = false; lastDigit = false; };
    for (const tok of tokens) {
      if (/^\d+(\.\d+)?$/.test(tok)) {
        if (has && lastDigit) flush();
        cur += parseFloat(tok); has = true; lastDigit = true;
      } else if (NUM_WORDS[tok] != null) {
        if (has && lastDigit) flush();
        cur += NUM_WORDS[tok]; has = true; lastDigit = false;
      } else if (/^(тыс|тысяч|тысяча|тысячи|тыщ|тыщи|тыщу|тысячу|к)$/.test(tok)) {
        total += (has ? cur : 1) * 1000; cur = 0; has = true; lastDigit = false;
      } else if (/^(миллион|миллиона|миллионов|млн)$/.test(tok)) {
        total += (has ? cur : 1) * 1000000; cur = 0; has = true; lastDigit = false;
      } else if (/^(тенге|тг)$/.test(tok)) {
        // «тенге» после суммы ничего не меняет
      } else flush();
    }
    flush();
    // «8 из 32 тысяч» — маленькое число рядом с тысячами тоже в тысячах.
    if (out.some((n) => n >= 1000)) return out.map((n) => (n > 0 && n < 1000 ? n * 1000 : n));
    return out;
  }

  function bestMatch(text, candidates) {
    let best = null; let score = 0; let tie = false;
    for (const c of candidates) {
      let s = 0;
      for (const w of c.words) if (text.includes(' ' + w) && w.length > s) s = w.length;
      if (s > score) { best = c; score = s; tie = false; } else if (s && s === score && c !== best) tie = true;
    }
    return tie ? null : best;
  }

  function parseSpeech(text) {
    const t = norm(text);
    // Месяц
    let ym = state.month;
    const ms = months();
    MONTH_STEMS.forEach((st, i) => {
      if (new RegExp(' ' + st).test(t)) {
        const found = ms.filter((m) => Number(m.split('-')[1]) === i + 1).pop();
        if (found) ym = found;
      }
    });
    const M = model(ym);
    const col = bestMatch(t, M.cols.map((c) => ({ key: c.key, c, words: (COL_WORDS[c.key] || []).concat(stems(c.title)) })));
    const row = bestMatch(t, M.rows.map((r) => ({ id: r.id, r, words: (ROW_WORDS[r.id.slice(r.id.lastIndexOf('|') + 1)] || []).concat(stems(r.name)) })));
    let rowId = row ? row.id : null;
    const c = col ? col.c : null;
    if (c && !rowId) {
      if (c.akm) { const a = M.rows.find((r) => r.akmaral); rowId = a ? a.id : null; } else {
        const filled = M.rows.filter((r) => r.cells[c.key] && r.cells[c.key].v);
        if (filled.length === 1) rowId = filled[0].id;
      }
    }
    let st = null;
    if (/ не (оплач|заплат|оплат)/.test(t)) st = 'unpaid';
    else if (/ (частич|половин)/.test(t)) st = 'partial';
    else if (/ (оплач|заплат|оплатил|оплатила|оплатили)/.test(t)) st = 'paid';
    const nums = speechNumbers(text);
    let v = null; let paid = null;
    if (st === 'partial') {
      if (nums.length >= 2) { v = Math.max(...nums); paid = Math.min(...nums); } else if (nums.length === 1) paid = nums[0];
    } else if (nums.length) v = nums[0];
    const add = / (плюс|добав|прибав|еще|ещё)/.test(t);
    return { ym, colKey: c ? c.key : null, rowId, v, st, paid, add };
  }

  function openVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    let rec = null;
    openSheet('Голосовой ввод', `
      <div class="voice-top">
        <button class="mic-big" id="v-mic" aria-label="Говорить">🎤</button>
        <p class="voice-status" id="v-status">${SR ? 'Нажмите на микрофон и скажите, что записать' : 'Нажмите в поле ниже и продиктуйте с клавиатуры (значок 🎤 на клавиатуре)'}</p>
      </div>
      <p class="hint">Например: «квартира 200 тысяч Bus Logistic оплачено», «Музыкалка частично 8 тысяч из 32 тысяч», «продукты плюс 15 тысяч».</p>
      <label class="f">Что записать<input id="v-text" placeholder="скажите или напишите"></label>
      <button class="btn block" id="v-parse">Разобрать</button>
      <div id="v-result"></div>`, (root) => {
      const q = (s) => root.querySelector(s);
      if (!SR) q('#v-mic').hidden = true;
      const showResult = (text) => {
        if (!text.trim()) return;
        if (rec) { rec.onend = null; rec.onerror = null; try { rec.abort(); } catch (e) { /* уже остановлен */ } }
        q('#v-mic').classList.remove('on');
        q('#v-status').textContent = 'Проверьте и нажмите «Сохранить»';
        q('#v-text').value = text;
        renderVoiceResult(q('#v-result'), parseSpeech(text), text);
        q('#v-result').scrollIntoView({ behavior: 'smooth', block: 'start' });
      };
      q('#v-parse').addEventListener('click', () => showResult(q('#v-text').value));
      q('#v-text').addEventListener('keydown', (e) => { if (e.key === 'Enter') showResult(q('#v-text').value); });
      const listen = () => {
        if (!SR) return;
        if (rec) { try { rec.stop(); } catch (e) { /* уже остановлен */ } }
        rec = new SR();
        rec.lang = 'ru-RU';
        rec.interimResults = true;
        rec.maxAlternatives = 1;
        let finalText = '';
        q('#v-mic').classList.add('on');
        q('#v-status').textContent = 'Слушаю… говорите';
        rec.onresult = (e) => {
          let s = '';
          for (let i = 0; i < e.results.length; i++) s += e.results[i][0].transcript;
          q('#v-text').value = s;
          if (e.results[e.results.length - 1].isFinal) finalText = s;
        };
        rec.onerror = (e) => {
          const msg = {
            'not-allowed': 'Нет доступа к микрофону. Разрешите его в настройках браузера или продиктуйте с клавиатуры.',
            'service-not-allowed': 'Микрофон недоступен. Продиктуйте с клавиатуры (значок 🎤).',
            'no-speech': 'Ничего не услышал. Нажмите на микрофон и попробуйте ещё раз.',
            network: 'Для распознавания речи нужен интернет.',
          }[e.error] || 'Не получилось распознать. Попробуйте ещё раз.';
          q('#v-status').textContent = msg;
        };
        rec.onend = () => {
          q('#v-mic').classList.remove('on');
          const text = finalText || q('#v-text').value;
          if (text.trim()) { q('#v-status').textContent = 'Проверьте и нажмите «Сохранить»'; showResult(text); }
        };
        try { rec.start(); } catch (e) { q('#v-status').textContent = 'Не получилось включить микрофон. Попробуйте ещё раз.'; }
      };
      q('#v-mic').addEventListener('click', listen);
      listen();
    });
  }

  function renderVoiceResult(box, p, text) {
    const M = model(p.ym);
    const opt = (val, label, sel) => `<option value="${esc(val)}" ${sel ? 'selected' : ''}>${esc(label)}</option>`;
    let st = p.st || '';
    box.innerHTML = `
      <div class="voice-heard">Услышал: «${esc(text)}»</div>
      ${!p.colKey || !p.rowId ? '<p class="err-text" style="margin:0 0 10px">Не всё понял — выберите, куда записать.</p>' : ''}
      <label class="f">Месяц<select id="v-ym">${months().map((m) => opt(m, ymTitle(m, true), m === p.ym)).join('')}</select></label>
      <label class="f">Из какой строки платим<select id="v-row">${opt('', '— выберите —', !p.rowId)}${M.rows.map((r) => opt(r.id, r.name, r.id === p.rowId)).join('')}</select></label>
      <label class="f">Колонка<select id="v-col">${opt('', '— выберите —', !p.colKey)}${M.cols.map((c) => opt(c.key, c.title, c.key === p.colKey)).join('')}</select></label>
      <label class="f">Сумма, ₸<input id="v-sum" inputmode="numeric" value="${p.v ? fmt(p.v) : ''}" placeholder="оставьте пустым, чтобы не менять"></label>
      <div id="v-mode"></div>
      <div class="small muted">Отметка оплаты</div>
      <div class="st-btns">
        <button class="st-btn paid" data-st="paid">Оплачено</button>
        <button class="st-btn unpaid" data-st="unpaid">Не оплачено</button>
        <button class="st-btn partial" data-st="partial">Частично</button>
        <button class="st-btn none" data-st="">Без отметки</button>
      </div>
      <div id="v-pbox" hidden><label class="f">Сколько уже оплачено, ₸<input id="v-paid" inputmode="numeric" value="${p.paid ? fmt(p.paid) : ''}"></label></div>
      <p class="err-text" id="v-err" hidden></p>
      <button class="btn primary block" id="v-save">Сохранить</button>`;
    const q = (s) => box.querySelector(s);
    box.querySelectorAll('input[inputmode="numeric"]').forEach(liveFormat);
    let add = p.add;
    const existing = () => {
      const it = items.get(cellId(q('#v-row').value, q('#v-col').value));
      return it ? it.data : null;
    };
    const sync = () => {
      const ex = existing();
      const n = parseNum(q('#v-sum').value);
      const mode = q('#v-mode');
      if (ex && ex.v && n) {
        mode.innerHTML = `<div class="st-btns one">
          <button class="st-btn none ${!add ? 'on' : ''}" data-mode="set">Заменить (было ${fmt(ex.v)})</button>
          <button class="st-btn none ${add ? 'on' : ''}" data-mode="add">Прибавить: ${fmt(ex.v + n)}</button></div>`;
        mode.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => { add = b.dataset.mode === 'add'; sync(); }));
      } else mode.innerHTML = '';
      box.querySelectorAll('[data-st]').forEach((b) => b.classList.toggle('on', b.dataset.st === st));
      q('#v-pbox').hidden = st !== 'partial';
    };
    box.querySelectorAll('[data-st]').forEach((b) => b.addEventListener('click', () => { st = b.dataset.st; sync(); }));
    q('#v-ym').addEventListener('change', () => renderVoiceResult(box, Object.assign({}, p, { ym: q('#v-ym').value, rowId: null }), text));
    ['#v-row', '#v-col', '#v-sum'].forEach((s) => q(s).addEventListener(s === '#v-sum' ? 'input' : 'change', sync));
    sync();
    q('#v-save').addEventListener('click', async () => {
      const err = (m) => { const e = q('#v-err'); e.textContent = m; e.hidden = false; };
      const ym = q('#v-ym').value; const rowId = q('#v-row').value; const key = q('#v-col').value;
      if (!rowId || !key) return err('Выберите строку и колонку');
      const Mm = model(ym);
      const r = Mm.rows.find((x) => x.id === rowId); const c = Mm.cols.find((x) => x.key === key);
      if (c.akm && !r.akmaral) return err('Колонка «' + c.title + '» заполняется только в строке Акмарал');
      const ex = existing() || {};
      const n = parseNum(q('#v-sum').value);
      if (isNaN(n) || (n != null && n < 0)) return err('Введите сумму цифрами, например 25 000');
      const data = Object.assign({}, ex);
      if (n != null) data.v = (add && ex.v ? ex.v : 0) + n;
      data.v = data.v || 0;
      if (st) data.st = st; else delete data.st;
      delete data.paid;
      if (st === 'partial') {
        const pd = parseNum(q('#v-paid').value);
        if (pd == null || isNaN(pd) || pd <= 0) return err('Укажите, сколько уже оплачено');
        if (pd > data.v) return err('Оплачено не может быть больше суммы');
        data.paid = pd;
      }
      if (!data.v && !st) return err('Скажите сумму или отметку оплаты');
      const ok = await saveItems([{ id: cellId(rowId, key), kind: 'cell', month: ym, data }]);
      if (ok) {
        closeSheet();
        state.month = ym; state.tab = 'table'; render();
        toast('Записано: ' + r.name + ' · ' + c.title + ' — ' + money(data.v));
      }
    });
  }

  // ================= Скачать в Excel =================
  async function exportExcel() {
    const ym = state.month;
    if (!ym) return;
    toast('Готовлю файл…');
    try {
      if (!window.ExcelJS) await loadScript('./vendor/exceljs.min.js');
    } catch (e) {
      toast('Не получилось подготовить файл. Проверьте интернет и попробуйте ещё раз.', true);
      return;
    }
    const M = model(ym);
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(ymTitle(ym, true), { views: [{ state: 'frozen', xSplit: 1, ySplit: 4 }] });
    const L = (n) => { let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
    const fill = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
    const GC = { green: 'FFE2F0D9', blue: 'FFDDEBF7', lilac: 'FFE4DFEC', orange: 'FFFCE4D6', yellow: 'FFFFF2CC' };
    const SC = { paid: 'FFFFEB3B', unpaid: 'FFFF8A80', partial: 'FFC99CF0' };
    const border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    const NUM = '#,##0';
    const cols = M.cols;
    const firstExp = 5; const lastExp = 4 + cols.length; const restCol = lastExp + 1;

    ws.getCell('A1').value = 'Семейный бюджет — ' + ymTitle(ym, true);
    ws.getCell('A1').font = { bold: true, size: 14 };
    ws.getCell('A2').value = 'Суммы в тенге (₸). Халык ' + M.pct + '%.';

    const hdr = (r, c, text, argb) => {
      const cell = ws.getCell(r, c);
      cell.value = text;
      cell.font = { bold: true, size: 10 };
      cell.alignment = { wrapText: true, horizontal: 'center', vertical: 'middle' };
      if (argb) cell.fill = fill(argb);
    };
    const span2 = (c, text, argb) => { hdr(3, c, text, argb); hdr(4, c, '', argb); ws.mergeCells(3, c, 4, c); };
    span2(1, 'статья'); span2(2, 'приход'); span2(3, 'халык ' + M.pct + '%'); span2(4, 'фактический\nприход');
    for (let i = 0; i < cols.length;) {
      const g = cols[i].group;
      if (g && GROUP_LABEL[g]) {
        let j = i;
        while (j < cols.length && cols[j].group === g) j++;
        for (let k = i; k < j; k++) { hdr(3, firstExp + k, k === i ? GROUP_LABEL[g] : '', GC[g]); hdr(4, firstExp + k, cols[k].title, GC[g]); }
        if (j - i > 1) ws.mergeCells(3, firstExp + i, 3, firstExp + j - 1);
        i = j;
      } else { span2(firstExp + i, cols[i].title, g ? GC[g] : null); i++; }
    }
    span2(restCol, 'Остаток');
    ws.getRow(3).height = 20; ws.getRow(4).height = 30;

    const regular = M.rows.filter((r) => !r.akmaral);
    const akm = M.rows.filter((r) => r.akmaral);
    const order = regular.concat([null, null], akm);
    let rn = 5;
    const firstData = rn;
    order.forEach((r) => {
      const row = ws.getRow(rn);
      if (r) {
        row.getCell(1).value = r.name + (r.note ? ' (' + r.note + ')' : '');
        if (r.income) row.getCell(2).value = r.income;
        if (r.halyk) row.getCell(3).value = { formula: `B${rn}*${M.pct / 100}`, result: r.halyk };
        if (r.manual) row.getCell(4).value = r.fact;
        else if (r.income) row.getCell(4).value = { formula: `B${rn}-C${rn}`, result: r.fact };
        cols.forEach((c, i) => {
          const cell = row.getCell(firstExp + i);
          if (c.akm && !r.akmaral) { cell.fill = fill('FFD9D9D9'); return; }
          const d = r.cells[c.key];
          if (!d) return;
          if (d.v) cell.value = d.v;
          if (d.st && c.paint) cell.fill = fill(SC[d.st]);
          if (d.st) cell.note = d.st === 'partial' ? `оплачено ${fmt(d.paidAmt)} из ${fmt(d.v)}, осталось ${fmt(d.v - d.paidAmt)}` : ST_NAME[d.st];
        });
        row.getCell(restCol).value = { formula: `D${rn}-SUM(${L(firstExp)}${rn}:${L(lastExp)}${rn})`, result: r.rest };
      } else {
        cols.forEach((c, i) => { if (c.akm) row.getCell(firstExp + i).fill = fill('FFD9D9D9'); });
      }
      rn++;
    });
    const lastData = rn - 1;
    const totRow = rn;
    ws.getCell(totRow, 1).value = 'итого';
    const totVals = [M.tot.income, M.tot.halyk, M.tot.fact].concat(cols.map((c) => M.colTot[c.key]), [M.tot.rest]);
    for (let c = 2; c <= restCol; c++) ws.getCell(totRow, c).value = { formula: `SUM(${L(c)}${firstData}:${L(c)}${lastData})`, result: totVals[c - 2] };
    ws.getRow(totRow).font = { bold: true };
    ws.getCell(totRow + 1, 1).value = 'оплачено';
    ws.getCell(totRow + 2, 1).value = 'осталось оплатить';
    cols.forEach((c, i) => {
      const col = firstExp + i;
      ws.getCell(totRow + 1, col).value = M.colPaid[c.key];
      ws.getCell(totRow + 2, col).value = { formula: `${L(col)}${totRow}-${L(col)}${totRow + 1}`, result: M.colTot[c.key] - M.colPaid[c.key] };
    });

    for (let r = 3; r <= totRow + 2; r++) {
      for (let c = 1; c <= restCol; c++) {
        const cell = ws.getCell(r, c);
        cell.border = border;
        if (r >= firstData && c > 1) cell.numFmt = NUM;
        if (r >= firstData && c === restCol) cell.font = { bold: true, color: { argb: 'FF000000' } };
        if (r >= firstData && c === 1) cell.alignment = { wrapText: true, vertical: 'middle' };
      }
    }
    for (let c = 1; c <= restCol; c++) ws.getCell(totRow, c).fill = fill('FFF2F2F2');

    const lg = totRow + 4;
    [['оплачено', SC.paid], ['не оплачено', SC.unpaid], ['частично', SC.partial], ['только в строке Акмарал', 'FFD9D9D9']].forEach(([t, color], i) => {
      ws.getCell(lg + i, 1).fill = fill(color);
      ws.getCell(lg + i, 1).border = border;
      ws.getCell(lg + i, 2).value = t;
    });

    ws.getColumn(1).width = 22;
    for (let c = 2; c <= restCol; c++) ws.getColumn(c).width = 11.5;

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'budget-' + ym + '.xlsx';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    toast('Файл скачан');
  }

  // ================= Сообщения =================
  let toastTimer = null;
  function toast(msg, isErr) {
    let t = document.getElementById('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
    t.className = 'toast' + (isErr ? ' err' : '');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, isErr ? 4500 : 2500);
  }

  // ================= Действия =================
  $app.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-act]');
    if (!t) return;
    const a = t.dataset.act;
    if (a === 'tab') { state.tab = t.dataset.tab; window.scrollTo(0, 0); render(); return; }
    if (a === 'month') { state.month = t.dataset.m; render(); return; }
    if (a === 'reload') { location.reload(); return; }
    if (a === 'install-hide') { lsSet('budget-install-hide', true); render(); return; }
    if (a === 'install') {
      const p = state.installPrompt;
      if (!p) return;
      p.prompt();
      try { const r = await p.userChoice; if (r && r.outcome === 'accepted') toast('Готово! Ищите иконку «Бюджет» на главном экране'); } catch (err) { /* окно закрыли */ }
      state.installPrompt = null;
      render();
      return;
    }
    if (a === 'pick') { state.loginPick = t.dataset.id; render(); return; }
    if (a === 'logout') { state.user = null; state.loginPick = null; lsSet(USER_KEY, null); render(); return; }
    if (a === 'excel') { exportExcel().catch((err) => { console.error(err); toast('Не получилось подготовить файл. Попробуйте ещё раз.', true); }); return; }
    if (a === 'hist-load') {
      try { state.history = await backend.history(); } catch (err) { console.error(err); toast('Не удалось загрузить историю. Проверьте интернет.', true); }
      render(); return;
    }
    if (a === 'hist-undo') {
      const h = (state.history || []).find((x) => String(x.id) === t.dataset.hid);
      if (!h || !await askConfirm('Вернуть прежнее значение? ' + describe(h), 'Вернуть')) return;
      const ch = h.old_data
        ? { id: h.item_id, kind: h.kind, month: h.month, data: h.old_data, deleted: !!h.old_deleted }
        : { id: h.item_id, kind: h.kind, month: h.month, data: h.new_data || {}, deleted: true };
      if (await saveItems([ch])) {
        toast('Прежнее значение возвращено');
        try { state.history = await backend.history(); } catch (err) { /* обновится позже */ }
        render();
      }
      return;
    }
    if (!state.user) return;
    if (a === 'closed') { toast('Эта колонка заполняется только в строке Акмарал'); return; }
    if (a === 'cell') { editCell(t.dataset.row, t.dataset.col); return; }
    if (a === 'row') { editRow(t.dataset.row); return; }
    if (a === 'newrow') { editRow(null); return; }
    if (a === 'col') { editCol(t.dataset.col); return; }
    if (a === 'newmonth') { newMonthDialog(); return; }
    if (a === 'voice') { openVoice(); return; }
    if (a === 'debt') { editDebt(t.dataset.id); return; }
    if (a === 'debt-add') { editDebt(null); return; }
    if (a === 'member-add') { memberDialog(false); return; }
    if (a === 'pin-change') { memberDialog(true); return; }
    if (a === 'pct-save') {
      const v = Number(String(document.getElementById('f-pct').value).replace(',', '.'));
      if (!isFinite(v) || v < 0 || v > 100) { toast('Процент — число от 0 до 100', true); return; }
      if (await saveItems([{ id: 'settings', kind: 'settings', data: Object.assign({}, settings(), { halykPct: v }) }])) toast('Процент халыка сохранён');
      return;
    }
    if (a === 'akm-add') {
      const A = akmData();
      await saveItems([{ id: 'akmaral', kind: 'akmaral', data: Object.assign({}, A, { payments: A.payments.concat([0]) }) }]);
      render();
      const inputs = document.querySelectorAll('[data-akm-pay]');
      if (inputs.length) { const last = inputs[inputs.length - 1]; last.focus(); last.select(); }
      return;
    }
    if (a === 'akm-del') {
      const A = akmData();
      const p = A.payments.slice(); p.splice(Number(t.dataset.i), 1);
      await saveItems([{ id: 'akmaral', kind: 'akmaral', data: Object.assign({}, A, { payments: p }) }]);
    }
  });

  // Поля калькулятора Акмарал сохраняются, когда человек закончил ввод.
  $app.addEventListener('change', async (e) => {
    const t = e.target;
    if (!t.matches('[data-akm], [data-akm-pay]')) return;
    const n = parseNum(t.value);
    if (n == null || isNaN(n) || n < 0) { toast('Введите сумму цифрами, например 30 000', true); render(); return; }
    const A = akmData();
    const data = Object.assign({}, A, { payments: A.payments.slice() });
    if (t.dataset.akm) data[t.dataset.akm] = n; else data.payments[Number(t.dataset.akmPay)] = n;
    t.blur();
    await saveItems([{ id: 'akmaral', kind: 'akmaral', data }]);
  });
  $app.addEventListener('input', (e) => {
    const t = e.target;
    if (t.matches('[data-akm], [data-akm-pay]')) {
      const n = parseNum(t.value);
      if (n != null && !isNaN(n) && t.value !== fmt(n)) t.value = fmt(n);
    }
  });
  $app.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.matches('[data-akm], [data-akm-pay], #f-pct')) e.target.blur();
  });
  document.addEventListener('focusout', () => { setTimeout(() => { if (renderPending) render(); }, 0); });

  $app.addEventListener('submit', async (e) => {
    const f = e.target.closest('form[data-form]');
    if (!f) return;
    e.preventDefault();
    const err = (m) => { const el = document.getElementById('login-err'); el.textContent = m; el.hidden = false; };
    const pin = f.pin.value.trim();
    if (f.dataset.form === 'first') {
      const name = f.name.value.trim();
      if (!name) return err('Напишите своё имя');
      if (!/^\d{4,}$/.test(pin)) return err('PIN — это минимум 4 цифры');
      if (pin !== f.pin2.value.trim()) return err('PIN-коды не совпадают');
      const id = 'u|' + uid();
      const ok = await saveItems([{ id, kind: 'member', data: { name, pinHash: await hashPin(pin, id) } }], { by: name });
      if (ok) login({ id, name });
    } else {
      const m = items.get(state.loginPick);
      if (!m) return err('Выберите своё имя');
      if (await hashPin(pin, m.id) !== m.data.pinHash) return err('Неверный PIN-код. Попробуйте ещё раз.');
      login({ id: m.id, name: m.data.name });
    }
  });

  function login(u) {
    state.user = u;
    lsSet(USER_KEY, u);
    render();
  }

  // ================= Запуск =================
  async function refresh() {
    try {
      await backend.init();
      const rows = await backend.load();
      items.clear();
      rows.forEach((r) => items.set(r.id, r));
      state.loaded = true;
      state.cloudOk = true;
      if (!list('month').length) await saveItems(seedItems(), { by: SEED_BY, force: true });
      saveCache();
      backend.subscribe(applyRemote, (status) => {
        if (status === 'SUBSCRIBED') { if (!state.cloudOk) refresh(); }
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') { /* переподключится само */ }
      });
    } catch (e) {
      console.error(e);
      state.cloudOk = false;
    }
    // Проверяем, что сохранённый вход всё ещё действителен.
    if (state.user && state.loaded && !items.get(state.user.id)) { state.user = null; lsSet(USER_KEY, null); }
    scheduleRender();
  }

  async function start() {
    if (USE_CLOUD) {
      const cached = lsGet(CACHE_KEY, []);
      cached.forEach((r) => items.set(r.id, r));
      if (cached.length) state.loaded = true;
    }
    state.user = lsGet(USER_KEY, null);
    if (items.size) render();
    await refresh();
    window.addEventListener('online', () => { refresh(); });
    window.addEventListener('offline', () => scheduleRender());
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && USE_CLOUD) refresh(); });
  }

  // Установка на главный экран.
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); state.installPrompt = e; scheduleRender(); });
  window.addEventListener('appinstalled', () => { state.installPrompt = null; scheduleRender(); });
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* без офлайн-режима приложение тоже работает */ });
  }

  start();
})();
