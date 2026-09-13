'use strict';

/* ================== КОНСТАНТЫ ================== */
const DIFFS = {
  easy:   { w: 9,  h: 9,  m: 10 },
  medium: { w: 16, h: 16, m: 40 },
  hard:   { w: 30, h: 16, m: 99 },
};

/* ================== УТИЛИТЫ ================== */
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const Store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};
const fmtTime = s => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');

/* ================== СОСТОЯНИЕ ================== */
const S = {
  diff: Store.get('saper.diff', 'easy'),
  w: 0, h: 0, m: 0,
  cells: [], els: [],
  started: false, over: false,
  flags: 0, revealed: 0,
  time: 0, timerId: null,
  flagMode: false,
};
if (!DIFFS[S.diff]) S.diff = 'easy';

const boardEl = $('msboard');
const winOverlay = $('winOverlay'), loseOverlay = $('loseOverlay');
function show(el) { el.classList.remove('hidden'); }
function hide(el) { el.classList.add('hidden'); }

/* ================== ПОСТРОЕНИЕ ПОЛЯ ================== */
function newGame() {
  const d = DIFFS[S.diff];
  S.w = d.w; S.h = d.h; S.m = d.m;
  S.cells = Array.from({ length: S.w * S.h }, () => ({ mine: false, rev: false, flag: false, n: 0 }));
  S.started = false; S.over = false;
  S.flags = 0; S.revealed = 0;
  S.time = 0;
  clearInterval(S.timerId);
  S.timerId = null;

  hide(winOverlay); hide(loseOverlay);
  $('faceBtn').textContent = '🙂';

  // размер клетки под окно
  const availW = Math.min(window.innerWidth - 60, 980);
  const cs = clamp(Math.floor(availW / S.w), 14, 34);
  boardEl.style.setProperty('--cs', cs + 'px');
  boardEl.style.gridTemplateColumns = `repeat(${S.w}, ${cs}px)`;

  boardEl.innerHTML = '';
  S.els = [];
  const frag = document.createDocumentFragment();
  for (let i = 0; i < S.w * S.h; i++) {
    const el = document.createElement('div');
    el.className = 'cell hid';
    el.dataset.i = i;
    frag.appendChild(el);
    S.els.push(el);
  }
  boardEl.appendChild(frag);
  syncHud();
}

function neighbors(i) {
  const x = i % S.w, y = (i / S.w) | 0;
  const out = [];
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < S.w && ny < S.h) out.push(ny * S.w + nx);
    }
  return out;
}

function placeMines(safe) {
  const banned = new Set([safe, ...neighbors(safe)]);
  const pool = [];
  for (let i = 0; i < S.w * S.h; i++) if (!banned.has(i)) pool.push(i);
  for (let k = 0; k < S.m && pool.length; k++) {
    const j = (Math.random() * pool.length) | 0;
    S.cells[pool[j]].mine = true;
    pool.splice(j, 1);
  }
  for (let i = 0; i < S.w * S.h; i++)
    S.cells[i].n = neighbors(i).filter(j => S.cells[j].mine).length;
}

/* ================== ХОДЫ ================== */
function startTimer() {
  S.timerId = setInterval(() => {
    S.time++;
    $('time').textContent = fmtTime(S.time);
  }, 1000);
}

function reveal(i) {
  const c = S.cells[i];
  if (S.over || c.rev || c.flag) return;
  if (!S.started) { placeMines(i); S.started = true; startTimer(); }
  if (c.mine) return boom(i);
  floodReveal(i);
  SFX.reveal();
  syncHud();
  checkWin();
}

function floodReveal(start) {
  const stack = [start];
  while (stack.length) {
    const i = stack.pop();
    const c = S.cells[i];
    if (c.rev || c.flag) continue;
    c.rev = true;
    S.revealed++;
    const el = S.els[i];
    el.classList.remove('hid', 'flag');
    el.classList.add('rev');
    if (c.n > 0) {
      el.textContent = c.n;
      el.classList.add('n' + c.n);
    } else {
      for (const j of neighbors(i)) if (!S.cells[j].rev) stack.push(j);
    }
  }
}

function chord(i) {
  const c = S.cells[i];
  if (S.over || !c.rev || !c.n) return;
  const nb = neighbors(i);
  if (nb.filter(j => S.cells[j].flag).length !== c.n) return;
  for (const j of nb) {
    const n = S.cells[j];
    if (!n.flag && !n.rev) {
      if (n.mine) return boom(j);
      floodReveal(j);
    }
  }
  SFX.reveal();
  syncHud();
  checkWin();
}

function toggleFlag(i) {
  const c = S.cells[i];
  if (S.over || c.rev) return;
  c.flag = !c.flag;
  S.flags += c.flag ? 1 : -1;
  S.els[i].classList.toggle('flag', c.flag);
  SFX.flag(c.flag);
  syncHud();
}

function boom(i) {
  S.over = true;
  clearInterval(S.timerId);
  for (let j = 0; j < S.cells.length; j++) {
    const c = S.cells[j];
    if (c.mine && !c.flag) {
      S.els[j].classList.remove('hid');
      S.els[j].classList.add('mine');
    }
    if (!c.mine && c.flag) S.els[j].classList.add('wrong');
  }
  S.els[i].classList.add('boom');
  boardEl.classList.add('shake');
  setTimeout(() => boardEl.classList.remove('shake'), 450);
  SFX.boom();
  $('faceBtn').textContent = '😵';
  $('loseSub').textContent = 'Время: ' + fmtTime(S.time) + ' · открыто ' + Math.round(100 * S.revealed / (S.w * S.h - S.m)) + '% поля';
  setTimeout(show, 600, loseOverlay);
}

function checkWin() {
  if (S.over || S.revealed !== S.w * S.h - S.m) return;
  S.over = true;
  clearInterval(S.timerId);
  for (let j = 0; j < S.cells.length; j++)
    if (S.cells[j].mine && !S.cells[j].flag) S.els[j].classList.add('flag');
  S.flags = S.m;
  SFX.win();
  $('faceBtn').textContent = '😎';
  const key = 'saper.best.' + S.diff;
  const prev = Store.get(key, null);
  const isRecord = prev === null || S.time < prev;
  if (isRecord) Store.set(key, S.time);
  $('recordBadge').classList.toggle('show', isRecord);
  $('finalTime').textContent = fmtTime(S.time);
  syncHud();
  setTimeout(show, 500, winOverlay);
}

/* ================== HUD ================== */
function syncHud() {
  $('mines').textContent = Math.max(0, S.m - S.flags);
  $('time').textContent = fmtTime(S.time);
  const best = Store.get('saper.best.' + S.diff, null);
  $('best').textContent = best === null ? '—' : fmtTime(best);
}

/* ================== СОБЫТИЯ ================== */
let pressTimer = null;
let longPress = false;

boardEl.addEventListener('click', e => {
  const el = e.target.closest('.cell');
  if (!el || longPress) { longPress = false; return; }
  SFX.ensure();
  const i = +el.dataset.i;
  if (S.flagMode) toggleFlag(i);
  else if (S.cells[i].rev) chord(i);
  else reveal(i);
});
boardEl.addEventListener('contextmenu', e => {
  e.preventDefault();
  const el = e.target.closest('.cell');
  if (!el) return;
  SFX.ensure();
  toggleFlag(+el.dataset.i);
});
boardEl.addEventListener('dblclick', e => {
  const el = e.target.closest('.cell');
  if (!el) return;
  SFX.ensure();
  chord(+el.dataset.i);
});
boardEl.addEventListener('mousedown', e => {
  if (e.button === 1) {
    e.preventDefault();
    const el = e.target.closest('.cell');
    if (el) chord(+el.dataset.i);
  }
});
boardEl.addEventListener('touchstart', e => {
  const el = e.target.closest('.cell');
  if (!el) return;
  longPress = false;
  pressTimer = setTimeout(() => {
    longPress = true;
    SFX.ensure();
    toggleFlag(+el.dataset.i);
  }, 450);
}, { passive: true });
boardEl.addEventListener('touchend', () => clearTimeout(pressTimer), { passive: true });
boardEl.addEventListener('touchmove', e => e.preventDefault(), { passive: false });

/* ================== КНОПКИ ================== */
function setDiff(d) {
  if (!DIFFS[d]) d = 'easy';
  S.diff = d;
  Store.set('saper.diff', d);
  document.querySelectorAll('.diff').forEach(b => b.classList.toggle('active', b.dataset.diff === d));
  newGame();
}

document.querySelectorAll('.diff').forEach(btn =>
  btn.addEventListener('click', () => { SFX.ensure(); SFX.click(); setDiff(btn.dataset.diff); }));
$('faceBtn').addEventListener('click', () => { SFX.ensure(); SFX.click(); newGame(); });
$('againBtn').addEventListener('click', () => { SFX.click(); newGame(); });
$('retryBtn').addEventListener('click', () => { SFX.click(); newGame(); });
$('winMenuBtn').addEventListener('click', () => { SFX.click(); newGame(); });
$('loseMenuBtn').addEventListener('click', () => { SFX.click(); newGame(); });
$('flagBtn').addEventListener('click', () => {
  SFX.ensure(); SFX.click();
  S.flagMode = !S.flagMode;
  $('flagBtn').classList.toggle('on', S.flagMode);
});
$('soundBtn').addEventListener('click', () => { SFX.ensure(); toggleSound(); });

window.addEventListener('keydown', e => {
  if (e.code === 'KeyM') toggleSound();
  if (e.code === 'Enter' && S.over) newGame();
  if (e.code === 'KeyF') {
    S.flagMode = !S.flagMode;
    $('flagBtn').classList.toggle('on', S.flagMode);
  }
});

function toggleSound() {
  SFX.enabled = !SFX.enabled;
  Store.set('zmeyka.sound', SFX.enabled);
  $('soundBtn').textContent = SFX.enabled ? '🔊' : '🔇';
  if (SFX.enabled) { SFX.ensure(); SFX.click(); }
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden && S.started && !S.over) {
    clearInterval(S.timerId);
    S.timerId = null;
  } else if (!document.hidden && S.started && !S.over && !S.timerId) {
    startTimer();
  }
});

/* ================== СТАРТ ================== */
SFX.enabled = Store.get('zmeyka.sound', true);
$('soundBtn').textContent = SFX.enabled ? '🔊' : '🔇';
document.querySelectorAll('.diff').forEach(b => b.classList.toggle('active', b.dataset.diff === S.diff));
newGame();
