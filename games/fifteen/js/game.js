'use strict';

/* ================== УТИЛИТЫ ================== */
const $ = id => document.getElementById(id);
const Store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};
const fmtTime = s => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
const N = 4;
const winOverlay = $('winOverlay');
const show = el => el.classList.remove('hidden');
const hide = el => el.classList.add('hidden');

/* ================== СОСТОЯНИЕ ================== */
const G = {
  cells: [],           // cells[i] = номер фишки 1..15, 0 = пусто
  tiles: {},           // номер -> DOM-элемент
  moves: 0, time: 0, timerId: null, running: false,
  best: Store.get('fifteen.best', null),
  solving: false,
};

const boardEl = $('fboard');

/* ================== ПОСТРОЕНИЕ ================== */
function newGame() {
  G.cells = Array.from({ length: N * N }, (_, i) => (i + 1) % (N * N)); // 0 в конце
  shuffle();
  G.moves = 0; G.time = 0; G.running = false;
  clearInterval(G.timerId);
  G.timerId = null;
  hide(winOverlay);
  buildDom();
  syncHud();
}

function shuffle() {
  let prev = -1;
  for (let k = 0; k < 250; k++) {
    const empty = G.cells.indexOf(0);
    const nb = neighbors(empty).filter(i => i !== prev);
    const pick = nb[(Math.random() * nb.length) | 0];
    G.cells[empty] = G.cells[pick];
    G.cells[pick] = 0;
    prev = pick;
  }
  if (isSolved()) shuffle();
}

function neighbors(i) {
  const x = i % N, y = (i / N) | 0;
  const out = [];
  if (x > 0) out.push(i - 1);
  if (x < N - 1) out.push(i + 1);
  if (y > 0) out.push(i - N);
  if (y < N - 1) out.push(i + N);
  return out;
}

function buildDom() {
  boardEl.innerHTML = '';
  G.tiles = {};
  for (let i = 0; i < N * N; i++) {
    const v = G.cells[i];
    if (!v) continue;
    const el = document.createElement('div');
    el.className = 'ftile';
    el.textContent = v;
    el.addEventListener('click', () => onTile(v));
    boardEl.appendChild(el);
    G.tiles[v] = el;
  }
  layout();
}

function layout() {
  for (let i = 0; i < N * N; i++) {
    const v = G.cells[i];
    if (!v) continue;
    const el = G.tiles[v];
    el.style.left = (i % N) * 24.5 + 2 + '%';
    el.style.top = ((i / N) | 0) * 24.5 + 2 + '%';
    el.classList.toggle('right', v === G.cells[i] && v === i + 1);
  }
}

/* ================== ХОДЫ ================== */
function onTile(v) {
  if (G.solving) return;
  const i = G.cells.indexOf(v);
  const e = G.cells.indexOf(0);
  if (!neighbors(i).includes(e)) return;
  moveTile(i, e);
}

function moveTile(i, e) {
  const v = G.cells[i];
  G.cells[e] = v;
  G.cells[i] = 0;
  G.moves++;
  if (!G.running) { G.running = true; startTimer(); }
  SFX.place();
  layout();
  syncHud();
  if (isSolved()) win();
}

function moveByDir(dir) {
  if (G.solving) return;
  const e = G.cells.indexOf(0);
  const x = e % N, y = (e / N) | 0;
  // стрелка = направление движения фишки, значит пустая клетка уходит в противоположную сторону
  const map = { left: [x + 1, y], right: [x - 1, y], up: [x, y + 1], down: [x, y - 1] };
  const [tx, ty] = map[dir];
  if (tx < 0 || ty < 0 || tx >= N || ty >= N) return;
  moveTile(ty * N + tx, e);
}

function isSolved() {
  for (let i = 0; i < N * N - 1; i++) if (G.cells[i] !== i + 1) return false;
  return true;
}

function win() {
  G.running = false;
  clearInterval(G.timerId);
  SFX.win();
  const isRecord = G.best === null || G.moves < G.best;
  if (isRecord) { G.best = G.moves; Store.set('fifteen.best', G.best); }
  $('recordBadge').classList.toggle('show', isRecord);
  $('finalMoves').textContent = G.moves;
  $('finalTime').textContent = 'Время: ' + fmtTime(G.time);
  syncHud();
  setTimeout(show, 450, winOverlay);
}

function startTimer() {
  G.timerId = setInterval(() => {
    G.time++;
    $('time').textContent = fmtTime(G.time);
  }, 1000);
}

/* ================== HUD ================== */
function syncHud() {
  $('moves').textContent = G.moves;
  $('time').textContent = fmtTime(G.time);
  $('best').textContent = G.best === null ? '—' : G.best + ' ход.';
}

/* ================== СОБЫТИЯ ================== */
window.addEventListener('keydown', e => {
  if (e.code.startsWith('Arrow')) e.preventDefault();
  SFX.ensure();
  const map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
  if (map[e.code]) moveByDir(map[e.code]);
  if (e.code === 'KeyM') toggleSound();
  if (e.code === 'Enter' && !winOverlay.classList.contains('hidden')) newGame();
});

$('newBtn').addEventListener('click', () => { SFX.ensure(); SFX.click(); newGame(); });
$('againBtn').addEventListener('click', () => { SFX.click(); newGame(); });
$('soundBtn').addEventListener('click', () => { SFX.ensure(); toggleSound(); });

function toggleSound() {
  SFX.enabled = !SFX.enabled;
  Store.set('zmeyka.sound', SFX.enabled);
  $('soundBtn').textContent = SFX.enabled ? '🔊' : '🔇';
  if (SFX.enabled) { SFX.ensure(); SFX.click(); }
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden && G.running) {
    clearInterval(G.timerId);
    G.timerId = null;
  } else if (!document.hidden && G.running && !G.timerId) {
    startTimer();
  }
});

/* ================== СТАРТ ================== */
SFX.enabled = Store.get('zmeyka.sound', true);
$('soundBtn').textContent = SFX.enabled ? '🔊' : '🔇';
newGame();
