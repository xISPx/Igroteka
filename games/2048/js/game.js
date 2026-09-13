'use strict';

/* ================== УТИЛИТЫ ================== */
const $ = id => document.getElementById(id);
const Store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};
const VECTORS = { left: { x: -1, y: 0 }, right: { x: 1, y: 0 }, up: { x: 0, y: -1 }, down: { x: 0, y: 1 } };

/* ================== СОСТОЯНИЕ ================== */
const G = {
  grid: [], tiles: [], nextId: 1,
  score: 0,
  best: Store.get('g2048.best', 0),
  prevBest: Store.get('g2048.best', 0),
  state: 'playing', // playing | won | over
  won: false,
  undoStack: [],
  moving: false,
};

const tilesEl = $('tiles'), bgEl = $('bgCells'), gboard = $('gboard');
const winOverlay = $('winOverlay'), loseOverlay = $('loseOverlay');
const show = el => el.classList.remove('hidden');
const hide = el => el.classList.add('hidden');

/* ================== ПЛИТКИ ================== */
function tilePos(t) {
  t.el.style.left = t.c * 25 + 1 + '%';
  t.el.style.top = t.r * 25 + 1 + '%';
}

function tileClass(t) {
  const v = t.val;
  const vc = v > 2048 ? 'vbig' : 'v' + v;
  return 'tile ' + vc + ' d' + String(v).length;
}

function refreshTile(t) {
  t.el.className = tileClass(t);
  t.el.firstChild.textContent = t.val;
}

function createTile(r, c, val, isNew) {
  const el = document.createElement('div');
  el.appendChild(document.createElement('div')).className = 'tin';
  const t = { id: G.nextId++, r, c, val, el, merged: false, alive: true };
  el.className = tileClass(t);
  if (isNew) el.classList.add('new');
  el.firstChild.textContent = val;
  tilePos(t);
  tilesEl.appendChild(el);
  G.tiles.push(t);
  G.grid[r][c] = t;
  return t;
}

function spawnRandom() {
  const empty = [];
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++)
      if (!G.grid[r][c]) empty.push({ r, c });
  if (!empty.length) return;
  const p = empty[(Math.random() * empty.length) | 0];
  createTile(p.r, p.c, Math.random() < 0.9 ? 2 : 4, true);
}

/* ================== ИГРОВОЙ ЦИКЛ ================== */
function newGame() {
  G.grid = Array.from({ length: 4 }, () => Array(4).fill(null));
  G.tiles = [];
  tilesEl.innerHTML = '';
  G.score = 0;
  G.state = 'playing';
  G.won = false;
  G.undoStack = [];
  G.moving = false;
  G.prevBest = G.best;
  hide(winOverlay); hide(loseOverlay);
  spawnRandom();
  spawnRandom();
  syncHud();
}

function snapshot() {
  G.undoStack.push({
    vals: G.grid.map(row => row.map(t => (t ? t.val : 0))),
    score: G.score,
  });
  if (G.undoStack.length > 8) G.undoStack.shift();
}

function undo() {
  if (!G.undoStack.length || G.moving) return;
  const s = G.undoStack.pop();
  G.tiles = [];
  tilesEl.innerHTML = '';
  G.grid = Array.from({ length: 4 }, () => Array(4).fill(null));
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++)
      if (s.vals[r][c]) createTile(r, c, s.vals[r][c], false);
  G.score = s.score;
  G.state = 'playing';
  hide(loseOverlay);
  SFX.click();
  syncHud();
}

function canMove() {
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++) {
      const t = G.grid[r][c];
      if (!t) return true;
      if (c < 3 && G.grid[r][c + 1] && G.grid[r][c + 1].val === t.val) return true;
      if (r < 3 && G.grid[r + 1][c] && G.grid[r + 1][c].val === t.val) return true;
    }
  return false;
}

function move(dir) {
  if (G.state !== 'playing' || G.moving) return;
  const v = VECTORS[dir];
  const order = G.tiles.filter(t => t.alive);
  order.sort((a, b) => (v.x === 1 ? b.c - a.c : v.x === -1 ? a.c - b.c : v.y === 1 ? b.r - a.r : a.r - b.r));

  snapshot();
  let moved = false;
  const merges = [];

  for (const t of order) {
    if (!t.alive) continue;
    let nr = t.r, nc = t.c, target = null;
    for (;;) {
      const tr = nr + v.y, tc = nc + v.x;
      if (tr < 0 || tr > 3 || tc < 0 || tc > 3) break;
      const occ = G.grid[tr][tc];
      if (!occ) { nr = tr; nc = tc; continue; }
      if (occ.val === t.val && !occ.merged) { target = occ; nr = tr; nc = tc; }
      break;
    }
    if (target) {
      G.grid[t.r][t.c] = null;
      target.merged = true;
      target.newVal = target.val * 2;
      G.score += target.newVal;
      t.r = nr; t.c = nc;
      tilePos(t);
      t.alive = false;
      merges.push({ t, target });
      moved = true;
    } else if (nr !== t.r || nc !== t.c) {
      G.grid[t.r][t.c] = null;
      t.r = nr; t.c = nc;
      G.grid[nr][nc] = t;
      tilePos(t);
      moved = true;
    }
  }

  if (!moved) { G.undoStack.pop(); return; }

  G.moving = true;
  SFX.slide();
  setTimeout(() => finalizeMove(merges), 140);
}

function finalizeMove(merges) {
  for (const { t, target } of merges) {
    t.el.classList.add('fade');
    const dead = t.el;
    setTimeout(() => dead.remove(), 130);
    G.tiles = G.tiles.filter(x => x !== t);
    target.val = target.newVal;
    refreshTile(target);
    target.el.classList.remove('pop'); void target.el.offsetWidth;
    target.el.classList.add('pop');
    SFX.merge(target.val);
    if (target.val === 2048 && !G.won) G.won = true;
  }
  for (const row of G.grid) for (const t of row) if (t) t.merged = false;

  spawnRandom();
  syncHud();

  if (G.won && G.state === 'playing') {
    G.state = 'won';
    saveBest();
    setTimeout(() => show(winOverlay), 250);
  } else if (!canMove()) {
    G.state = 'over';
    saveBest();
    $('finalScore').textContent = G.score;
    $('recordBadge').classList.toggle('show', G.score > G.prevBest && G.score > 0);
    setTimeout(() => show(loseOverlay), 350);
    SFX.die();
  }
  G.moving = false;
}

function saveBest() {
  if (G.score > G.best) {
    G.best = G.score;
    Store.set('g2048.best', G.best);
  }
}

/* ================== HUD ================== */
const hudCache = { score: -1, best: -1 };
function syncHud() {
  if (hudCache.score !== G.score) {
    hudCache.score = G.score;
    const el = $('score');
    el.textContent = G.score;
    el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
  }
  if (hudCache.best !== Math.max(G.best, G.score)) {
    hudCache.best = Math.max(G.best, G.score);
    $('best').textContent = hudCache.best;
  }
  $('undoBtn').disabled = !G.undoStack.length;
}

/* ================== УПРАВЛЕНИЕ ================== */
const KEY_DIRS = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
};

window.addEventListener('keydown', e => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  SFX.ensure();
  const d = KEY_DIRS[e.code];
  if (d) { move(d); return; }
  if (e.code === 'KeyZ') undo();
  else if (e.code === 'KeyM') toggleSound();
  else if (e.code === 'Enter' && G.state === 'over') newGame();
});

/* Свайпы */
let touchStart = null;
gboard.addEventListener('touchstart', e => {
  if (e.touches.length === 1) touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
}, { passive: true });
gboard.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
gboard.addEventListener('touchend', e => {
  if (!touchStart) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStart.x, dy = t.clientY - touchStart.y;
  touchStart = null;
  SFX.ensure();
  if (Math.hypot(dx, dy) < 24) return;
  move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
});

/* ================== КНОПКИ ================== */
$('newBtn').addEventListener('click', () => { SFX.ensure(); SFX.click(); newGame(); });
$('undoBtn').addEventListener('click', () => { SFX.ensure(); undo(); });
$('continueBtn').addEventListener('click', () => { SFX.click(); G.state = 'playing'; hide(winOverlay); });
$('winNewBtn').addEventListener('click', () => { SFX.click(); newGame(); });
$('retryBtn').addEventListener('click', () => { SFX.click(); newGame(); });
$('loseUndoBtn').addEventListener('click', () => { SFX.click(); undo(); });
$('soundBtn').addEventListener('click', () => { SFX.ensure(); toggleSound(); });

function toggleSound() {
  SFX.enabled = !SFX.enabled;
  Store.set('zmeyka.sound', SFX.enabled);
  $('soundBtn').textContent = SFX.enabled ? '🔊' : '🔇';
  if (SFX.enabled) { SFX.ensure(); SFX.click(); }
}

/* ================== СТАРТ ================== */
SFX.enabled = Store.get('zmeyka.sound', true);
$('soundBtn').textContent = SFX.enabled ? '🔊' : '🔇';
$('best').textContent = G.best;
for (let i = 0; i < 16; i++) {
  const cell = document.createElement('div');
  cell.className = 'bcell';
  cell.style.left = (i % 4) * 25 + 1 + '%';
  cell.style.top = ((i / 4) | 0) * 25 + 1 + '%';
  bgEl.appendChild(cell);
}
newGame();
