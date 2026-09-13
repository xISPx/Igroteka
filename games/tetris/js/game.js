'use strict';

/* ================== КОНСТАНТЫ ================== */
const COLS = 10, ROWS = 20;
const PIECES = {
  I: { m: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], c: '#4dd7ff' },
  J: { m: [[1,0,0],[1,1,1],[0,0,0]], c: '#64a0ff' },
  L: { m: [[0,0,1],[1,1,1],[0,0,0]], c: '#ff9f43' },
  O: { m: [[1,1],[1,1]], c: '#ffd166' },
  S: { m: [[0,1,1],[1,1,0],[0,0,0]], c: '#58d68d' },
  T: { m: [[0,1,0],[1,1,1],[0,0,0]], c: '#b388ff' },
  Z: { m: [[1,1,0],[0,1,1],[0,0,0]], c: '#ff5d6c' },
};
const CLEAR_MS = 180;
const COUNTDOWN_MS = 700;
const LINE_POINTS = [0, 100, 300, 500, 800];

/* ================== УТИЛИТЫ ================== */
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const Store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = clamp(((n >> 16) & 255) + amt, 0, 255);
  const g = clamp(((n >> 8) & 255) + amt, 0, 255);
  const b = clamp((n & 255) + amt, 0, 255);
  return `rgb(${r},${g},${b})`;
}

/* ================== СОСТОЯНИЕ ================== */
const T = {
  state: 'menu', // menu | countdown | playing | paused | clearing | gameover
  board: [], piece: null,
  nextType: null, holdType: null, canHold: true, bag: [],
  score: 0, lines: 0, level: 1,
  best: Store.get('tetris.best', 0), newRecord: false,
  interval: 800, lastTick: 0,
  clearing: null, floats: [], shake: 0, flashGreen: 0,
  countdownStart: 0, countdownLast: 0,
};

/* ================== ХОЛСТ ================== */
const canvas = $('game'), ctx = canvas.getContext('2d');
const nextCv = $('next'), nextCtx = nextCv.getContext('2d');
const holdCv = $('hold'), holdCtx = holdCv.getContext('2d');
let cell = 24;

function resize() {
  const availH = window.innerHeight - 250;
  const availW = window.innerWidth - 150;
  const hPx = clamp(Math.min(availH, 620), 300, 620);
  const cellCss = Math.max(12, Math.min(hPx / ROWS, availW / COLS, 31));
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = cellCss * COLS + 'px';
  canvas.style.height = cellCss * ROWS + 'px';
  canvas.width = Math.round(cellCss * COLS * dpr);
  canvas.height = Math.round(cellCss * ROWS * dpr);
  cell = canvas.width / COLS;
}

/* ================== ЛОГИКА ================== */
function emptyBoard() { return Array.from({ length: ROWS }, () => Array(COLS).fill(null)); }

function nextFromBag() {
  if (!T.bag.length) {
    T.bag = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
    for (let i = T.bag.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [T.bag[i], T.bag[j]] = [T.bag[j], T.bag[i]];
    }
  }
  return T.bag.pop();
}

function collides(m, px, py) {
  for (let y = 0; y < m.length; y++)
    for (let x = 0; x < m.length; x++) {
      if (!m[y][x]) continue;
      const bx = px + x, by = py + y;
      if (bx < 0 || bx >= COLS || by >= ROWS) return true;
      if (by >= 0 && T.board[by][bx]) return true;
    }
  return false;
}

function makePiece(type) {
  const src = PIECES[type];
  return { type, m: src.m.map(r => r.slice()), x: ((COLS - src.m.length) / 2) | 0, y: type === 'I' ? -1 : 0 };
}

function spawn() {
  T.piece = makePiece(T.nextType);
  T.nextType = nextFromBag();
  T.canHold = true;
  drawMini(nextCtx, T.nextType);
  if (collides(T.piece.m, T.piece.x, T.piece.y)) gameOver();
}

function ghostY() {
  const p = T.piece;
  let gy = p.y;
  while (!collides(p.m, p.x, gy + 1)) gy++;
  return gy;
}

function rotated(m) {
  const n = m.length;
  const r = Array.from({ length: n }, () => Array(n).fill(0));
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++)
      r[x][n - 1 - y] = m[y][x];
  return r;
}

function tryMove(dx, dy) {
  const p = T.piece;
  if (!collides(p.m, p.x + dx, p.y + dy)) {
    p.x += dx; p.y += dy;
    return true;
  }
  return false;
}

function doLock() {
  const p = T.piece;
  for (let y = 0; y < p.m.length; y++)
    for (let x = 0; x < p.m.length; x++) {
      if (!p.m[y][x]) continue;
      const by = p.y + y;
      if (by >= 0) T.board[by][p.x + x] = PIECES[p.type].c;
    }
  SFX.lock();
  const rows = [];
  for (let y = 0; y < ROWS; y++) if (T.board[y].every(v => v)) rows.push(y);
  if (rows.length) {
    T.state = 'clearing';
    T.clearing = { rows, start: performance.now() };
    SFX.clearLines(rows.length);
    if (rows.length >= 4) T.shake = 8;
  } else {
    spawn();
  }
}

function finishClear() {
  const n = T.clearing.rows.length;
  for (const r of T.clearing.rows) {
    T.board.splice(r, 1);
    T.board.unshift(Array(COLS).fill(null));
  }
  T.clearing = null;
  const pts = LINE_POINTS[n] * T.level;
  T.score += pts;
  T.lines += n;
  addFloat(n >= 4 ? 'ТЕТРИС! +' + pts : '+' + pts, n >= 4 ? '#ffd166' : '#eaf2ff');
  const lvl = 1 + Math.floor(T.lines / 10);
  if (lvl !== T.level) {
    T.level = lvl;
    T.interval = Math.max(60, 800 - (T.level - 1) * 70);
    T.flashGreen = 0.35;
    SFX.level();
  }
  syncHud();
  T.state = 'playing';
  spawn();
}

function hardDrop() {
  const gy = ghostY();
  T.score += (gy - T.piece.y) * 2;
  T.piece.y = gy;
  SFX.drop();
  T.shake = Math.max(T.shake, 3);
  doLock();
  syncHud();
}

function doHold() {
  if (!T.canHold || !T.piece) return;
  SFX.hold();
  const cur = T.piece.type;
  if (T.holdType === null) {
    T.holdType = cur;
    spawn();
  } else {
    const t = T.holdType;
    T.holdType = cur;
    T.piece = makePiece(t);
    if (collides(T.piece.m, T.piece.x, T.piece.y)) gameOver();
  }
  T.canHold = false;
  drawMini(holdCtx, T.holdType);
}

function gameOver() {
  T.state = 'gameover';
  SFX.die();
  T.shake = 10;
  T.newRecord = T.score > T.best && T.score > 0;
  if (T.newRecord) { T.best = T.score; Store.set('tetris.best', T.best); }
  syncHud();
  setTimeout(() => {
    if (T.state !== 'gameover') return;
    $('finalScore').textContent = T.score;
    $('statLines').textContent = T.lines;
    $('statLevel').textContent = T.level;
    $('recordBadge').classList.toggle('show', T.newRecord);
    show(overOverlay);
  }, 700);
}

/* ================== ПОТОК ИГРЫ ================== */
const menuOverlay = $('menuOverlay'), pauseOverlay = $('pauseOverlay'), overOverlay = $('overOverlay');
function show(el) { el.classList.remove('hidden'); }
function hide(el) { el.classList.add('hidden'); }

function toMenu() {
  T.state = 'menu';
  resetWorld();
  show(menuOverlay); hide(pauseOverlay); hide(overOverlay);
  $('menuBest').textContent = T.best;
  syncHud();
}

function resetWorld() {
  T.board = emptyBoard();
  T.piece = null;
  T.bag = [];
  T.holdType = null;
  T.nextType = nextFromBag();
  T.score = 0; T.lines = 0; T.level = 1;
  T.interval = 800;
  T.clearing = null; T.floats = [];
  T.shake = 0; T.flashGreen = 0; T.newRecord = false;
  drawMini(holdCtx, null);
  drawMini(nextCtx, T.nextType);
}

function startGame() {
  resetWorld();
  hide(menuOverlay); hide(pauseOverlay); hide(overOverlay);
  T.state = 'countdown';
  T.countdownStart = performance.now();
  T.countdownLast = 0;
  syncHud();
}

function pauseGame() {
  if (T.state !== 'playing' && T.state !== 'clearing') return;
  T.state = 'paused';
  show(pauseOverlay);
}

function resumeGame() {
  if (T.state !== 'paused') return;
  hide(pauseOverlay);
  T.state = T.clearing ? 'clearing' : 'playing';
  T.lastTick = performance.now();
}

/* ================== ЭФФЕКТЫ ================== */
function addFloat(text, color) {
  T.floats.push({ text, color, born: performance.now(), life: 1000 });
}

/* ================== РЕНДЕР ================== */
function block(c2d, bx, by, size, color, alpha = 1) {
  const pad = size * 0.06;
  const x = bx * size + pad, y = by * size + pad, s = size - pad * 2;
  const r = s * 0.18;
  c2d.save();
  c2d.globalAlpha = alpha;
  const g = c2d.createLinearGradient(x, y, x + s, y + s);
  g.addColorStop(0, shade(color, 55));
  g.addColorStop(1, shade(color, -25));
  c2d.fillStyle = g;
  c2d.beginPath();
  c2d.moveTo(x + r, y);
  c2d.arcTo(x + s, y, x + s, y + s, r);
  c2d.arcTo(x + s, y + s, x, y + s, r);
  c2d.arcTo(x, y + s, x, y, r);
  c2d.arcTo(x, y, x + s, y, r);
  c2d.closePath();
  c2d.fill();
  c2d.strokeStyle = 'rgba(0,0,0,0.35)';
  c2d.lineWidth = Math.max(1, s * 0.05);
  c2d.stroke();
  c2d.fillStyle = 'rgba(255,255,255,0.35)';
  c2d.fillRect(x + s * 0.18, y + s * 0.14, s * 0.28, s * 0.1);
  c2d.restore();
}

function render(now) {
  const W = canvas.width, H = canvas.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, H);
  if (T.shake > 0.3) ctx.translate((Math.random() * 2 - 1) * T.shake, (Math.random() * 2 - 1) * T.shake);
  // фон и сетка
  ctx.fillStyle = '#0b101e';
  ctx.fillRect(-20, -20, W + 40, H + 40);
  ctx.strokeStyle = 'rgba(120,140,190,0.07)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 1; x < COLS; x++) { ctx.moveTo(x * cell, 0); ctx.lineTo(x * cell, H); }
  for (let y = 1; y < ROWS; y++) { ctx.moveTo(0, y * cell); ctx.lineTo(W, y * cell); }
  ctx.stroke();
  // стакан
  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < COLS; x++)
      if (T.board[y][x]) block(ctx, x, y, cell, T.board[y][x]);
  // вспышка очищаемых линий
  if (T.clearing) {
    const p = (now - T.clearing.start) / CLEAR_MS;
    ctx.fillStyle = `rgba(255,255,255,${0.5 + 0.5 * Math.sin(p * Math.PI * 3)})`;
    for (const r of T.clearing.rows) ctx.fillRect(0, r * cell, W, cell);
  }
  // призрак и текущая фигура
  if (T.piece && (T.state === 'playing' || T.state === 'paused' || T.state === 'countdown')) {
    const p = T.piece, gy = ghostY();
    const c = PIECES[p.type].c;
    for (let y = 0; y < p.m.length; y++)
      for (let x = 0; x < p.m.length; x++) {
        if (!p.m[y][x]) continue;
        if (gy + y >= 0) {
          ctx.strokeStyle = c;
          ctx.globalAlpha = 0.35;
          ctx.lineWidth = Math.max(1.5, cell * 0.07);
          ctx.strokeRect((p.x + x) * cell + cell * 0.14, (gy + y) * cell + cell * 0.14, cell * 0.72, cell * 0.72);
          ctx.globalAlpha = 1;
        }
      }
    ctx.save();
    ctx.shadowColor = c;
    ctx.shadowBlur = cell * 0.4;
    for (let y = 0; y < p.m.length; y++)
      for (let x = 0; x < p.m.length; x++)
        if (p.m[y][x] && p.y + y >= 0) block(ctx, p.x + x, p.y + y, cell, c);
    ctx.restore();
  }
  // всплывающий текст
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const f of T.floats) {
    const p = (now - f.born) / f.life;
    ctx.globalAlpha = 1 - p;
    ctx.font = `800 ${cell * 0.9}px system-ui, 'Segoe UI', sans-serif`;
    ctx.lineWidth = cell * 0.16;
    ctx.strokeStyle = 'rgba(5,10,18,0.8)';
    ctx.strokeText(f.text, W / 2, H * 0.3 - p * cell * 1.5);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, W / 2, H * 0.3 - p * cell * 1.5);
  }
  ctx.globalAlpha = 1;
  if (T.flashGreen > 0.01) { ctx.fillStyle = `rgba(52,245,165,${T.flashGreen * 0.14})`; ctx.fillRect(0, 0, W, H); }
  if (T.state === 'countdown') drawCountdown(now);
}

function drawCountdown(now) {
  const el = now - T.countdownStart;
  const num = 3 - Math.floor(el / COUNTDOWN_MS);
  if (num < 1) return;
  const p = (el % COUNTDOWN_MS) / COUNTDOWN_MS;
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(1.5 - 0.5 * Math.min(1, p * 3.2), 1.5 - 0.5 * Math.min(1, p * 3.2));
  ctx.font = `900 ${cell * 2.4}px system-ui, 'Segoe UI', sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.globalAlpha = p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3;
  ctx.fillStyle = '#34f5a5';
  ctx.shadowColor = 'rgba(52,245,165,0.8)';
  ctx.shadowBlur = cell;
  ctx.fillText(String(num), 0, 0);
  ctx.restore();
}

function drawMini(c2d, type) {
  const size = c2d.canvas.width;
  c2d.setTransform(1, 0, 0, 1, 0, 0);
  c2d.clearRect(0, 0, size, size);
  if (!type) return;
  const m = PIECES[type].m;
  // границы фигуры для центрирования
  let minX = 4, maxX = -1, minY = 4, maxY = -1;
  for (let y = 0; y < m.length; y++)
    for (let x = 0; x < m.length; x++)
      if (m[y][x]) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  const w = maxX - minX + 1, h = maxY - minY + 1;
  const cs = size / 4.6;
  const ox = (size - w * cs) / 2 - minX * cs;
  const oy = (size - h * cs) / 2 - minY * cs;
  c2d.save();
  c2d.translate(ox, oy);
  for (let y = 0; y < m.length; y++)
    for (let x = 0; x < m.length; x++)
      if (m[y][x]) block(c2d, x, y, cs, PIECES[type].c);
  c2d.restore();
}

/* ================== HUD ================== */
const hudCache = { score: -1, best: -1, level: -1, lines: -1 };
function syncHud() {
  for (const [id, v] of [['score', T.score], ['best', Math.max(T.best, T.score)], ['level', T.level], ['lines', T.lines]]) {
    if (hudCache[id] === v) continue;
    hudCache[id] = v;
    const el = $(id);
    el.textContent = v;
    el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
  }
}

/* ================== УПРАВЛЕНИЕ ================== */
function act(name) {
  if (T.state !== 'playing' || !T.piece) return;
  if (name === 'left') { if (tryMove(-1, 0)) SFX.move(); }
  else if (name === 'right') { if (tryMove(1, 0)) SFX.move(); }
  else if (name === 'down') { if (tryMove(0, 1)) { T.score += 1; syncHud(); } }
  else if (name === 'rotate') {
    if (T.piece.type === 'O') return;
    const rm = rotated(T.piece.m);
    for (const k of [0, -1, 1, -2, 2]) {
      if (!collides(rm, T.piece.x + k, T.piece.y)) {
        T.piece.m = rm; T.piece.x += k;
        SFX.rotate();
        return;
      }
    }
  }
  else if (name === 'drop') hardDrop();
  else if (name === 'hold') doHold();
}

window.addEventListener('keydown', e => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  SFX.ensure();
  if (T.state === 'playing') {
    const map = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowDown: 'down', KeyS: 'down', ArrowUp: 'rotate', KeyW: 'rotate', Space: 'drop', KeyC: 'hold' };
    if (map[e.code]) { act(map[e.code]); return; }
  }
  switch (e.code) {
    case 'Space':
    case 'Enter':
      if (T.state === 'menu') startGame();
      else if ((T.state === 'playing' || T.state === 'clearing') && e.code === 'Space') { /* уже сброс */ }
      else if (T.state === 'paused') resumeGame();
      else if (T.state === 'gameover') startGame();
      break;
    case 'Escape':
      if (T.state === 'playing' || T.state === 'clearing') pauseGame();
      else if (T.state === 'paused' || T.state === 'gameover') toMenu();
      break;
    case 'KeyP':
      if (T.state === 'playing' || T.state === 'clearing') pauseGame();
      else if (T.state === 'paused') resumeGame();
      break;
    case 'KeyM':
      toggleSound();
      break;
  }
});

document.querySelectorAll('#touch button').forEach(btn =>
  btn.addEventListener('click', () => { SFX.ensure(); act(btn.dataset.act); }));

document.addEventListener('visibilitychange', () => {
  if (document.hidden && (T.state === 'playing' || T.state === 'clearing')) pauseGame();
});

/* ================== КНОПКИ ================== */
$('playBtn').addEventListener('click', () => { SFX.ensure(); SFX.click(); startGame(); });
$('resumeBtn').addEventListener('click', () => { SFX.click(); resumeGame(); });
$('pauseMenuBtn').addEventListener('click', () => { SFX.click(); toMenu(); });
$('restartBtn').addEventListener('click', () => { SFX.click(); startGame(); });
$('overMenuBtn').addEventListener('click', () => { SFX.click(); toMenu(); });
$('soundBtn').addEventListener('click', () => { SFX.ensure(); toggleSound(); });

function toggleSound() {
  SFX.enabled = !SFX.enabled;
  Store.set('zmeyka.sound', SFX.enabled);
  $('soundBtn').textContent = SFX.enabled ? '🔊' : '🔇';
  if (SFX.enabled) { SFX.ensure(); SFX.click(); }
}

/* ================== ГЛАВНЫЙ ЦИКЛ ================== */
let lastFrame = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(100, now - lastFrame);
  lastFrame = now;
  T.shake = Math.max(0, T.shake - dt * 0.03);
  T.flashGreen = Math.max(0, T.flashGreen - dt * 0.0014);
  T.floats = T.floats.filter(f => now - f.born < f.life);

  if (T.state === 'countdown') {
    const el = now - T.countdownStart;
    const num = 3 - Math.floor(el / COUNTDOWN_MS);
    if (num !== T.countdownLast) { T.countdownLast = num; if (num >= 1) SFX.count(false); }
    if (el >= 3 * COUNTDOWN_MS) {
      T.state = 'playing';
      T.lastTick = now;
      spawn();
      SFX.count(true);
    }
  }

  if (T.state === 'playing') {
    while (now - T.lastTick >= T.interval && T.state === 'playing') {
      T.lastTick += T.interval;
      if (T.piece && !tryMove(0, 1)) doLock();
    }
    if (now - T.lastTick >= T.interval) T.lastTick = now;
  } else if (T.state === 'clearing' && T.clearing && now - T.clearing.start >= CLEAR_MS) {
    finishClear();
  }

  render(now);
}

/* ================== СТАРТ ================== */
SFX.enabled = Store.get('zmeyka.sound', true);
$('soundBtn').textContent = SFX.enabled ? '🔊' : '🔇';
resize();
window.addEventListener('resize', resize);
resetWorld();
$('menuBest').textContent = T.best;
syncHud();
requestAnimationFrame(loop);
