'use strict';

/* ================== КОНСТАНТЫ ================== */
const COLS = 24, ROWS = 24;
const DIRS = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
const MODES = {
  classic: { wrap: false, obstacles: false },
  portal:  { wrap: true,  obstacles: false },
  arcade:  { wrap: false, obstacles: true  },
};
const BASE_INTERVAL = 150;   // мс на клетку на 1-м уровне
const MIN_INTERVAL  = 70;
const LEVEL_STEP    = 9;     // ускорение за уровень
const APPLES_PER_LEVEL = 5;
const COMBO_WINDOW  = 3500;  // мс между яблоками для удержания комбо
const MAX_COMBO     = 8;
const BONUS_EVERY   = 4;     // золотой бонус появляется на каждое 4-е яблоко
const BONUS_LIFE    = 8000;  // мс жизни бонуса
const COUNTDOWN_MS  = 700;
const CAUSES = {
  wall: 'Врезался в стену',
  self: 'Укусил себя за хвост',
  obstacle: 'Врезался в препятствие',
  win: 'Поле заполнено целиком — невероятно!',
};

/* ================== УТИЛИТЫ ================== */
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const Store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};

/* ================== СОСТОЯНИЕ ================== */
const G = {
  state: 'menu', // menu | countdown | playing | paused | gameover
  mode: Store.get('zmeyka.mode', 'classic'),
  snake: [], prev: [], dir: DIRS.right, queue: [],
  grow: 0, food: null, bonus: null,
  obstacles: [],
  score: 0, apples: 0, level: 1, combo: 1, lastEatAt: 0,
  interval: BASE_INTERVAL, lastTick: 0, t: 0, gameTime: 0,
  startedAt: 0, playedMs: 0,
  particles: [], floats: [],
  shake: 0, flashRed: 0, flashGreen: 0,
  dead: false, dieAt: 0, cause: '', won: false, newRecord: false,
  countdownStart: 0, countdownLast: 0,
};
if (!MODES[G.mode]) G.mode = 'classic';
const bests = {
  classic: Store.get('zmeyka.best.classic', 0),
  portal:  Store.get('zmeyka.best.portal', 0),
  arcade:  Store.get('zmeyka.best.arcade', 0),
};

/* ================== ХОЛСТ ================== */
const canvas = $('game');
const ctx = canvas.getContext('2d');
let cell = 20;
let boardPattern = null;

function resize() {
  const availW = Math.min(window.innerWidth - 28, 760);
  const availH = window.innerHeight - 224;
  const size = clamp(Math.min(availW, availH), 240, 720);
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = size + 'px';
  canvas.style.height = size + 'px';
  canvas.width = Math.round(size * dpr);
  canvas.height = Math.round(size * dpr);
  cell = canvas.width / COLS;
  G.particles = [];
  G.floats = [];
  makeBoard();
}

function makeBoard() {
  boardPattern = document.createElement('canvas');
  boardPattern.width = canvas.width;
  boardPattern.height = canvas.height;
  const b = boardPattern.getContext('2d');
  b.fillStyle = '#0b101e';
  b.fillRect(0, 0, boardPattern.width, boardPattern.height);
  b.fillStyle = '#0d1322';
  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < COLS; x++)
      if ((x + y) & 1) b.fillRect(x * cell, y * cell, cell + 0.5, cell + 0.5);
}

/* ================== ПОМОЩНИКИ ПОЛЯ ================== */
const inField = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS;

function occupied(x, y) {
  if (G.snake.some(s => s.x === x && s.y === y)) return true;
  if (G.obstacles.some(o => o.x === x && o.y === y)) return true;
  if (G.food && G.food.x === x && G.food.y === y) return true;
  if (G.bonus && G.bonus.x === x && G.bonus.y === y) return true;
  return false;
}

function randomFreeCell() {
  const cells = [];
  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < COLS; x++)
      if (!occupied(x, y)) cells.push({ x, y });
  return cells.length ? cells[(Math.random() * cells.length) | 0] : null;
}

function spawnFood() {
  const c = randomFreeCell();
  if (!c) { gameOver(CAUSES.win, true); return; }
  G.food = { x: c.x, y: c.y };
}

function spawnBonus() {
  if (G.bonus) return;
  const c = randomFreeCell();
  if (!c) return;
  G.bonus = { x: c.x, y: c.y, total: BONUS_LIFE, remaining: BONUS_LIFE };
}

function addObstacle() {
  const head = G.snake[0];
  const cands = [];
  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < COLS; x++) {
      if (occupied(x, y)) continue;
      if (Math.abs(x - head.x) + Math.abs(y - head.y) < 6) continue; // не рядом с головой
      if (G.food && Math.abs(G.food.x - x) + Math.abs(G.food.y - y) <= 1) continue; // не замуровываем еду
      cands.push({ x, y });
    }
  if (!cands.length) return;
  const c = cands[(Math.random() * cands.length) | 0];
  G.obstacles.push({ x: c.x, y: c.y, solid: false, solidAt: G.gameTime + 1500, solidSince: 0 });
}

function resetWorld() {
  const cy = (ROWS / 2) | 0;
  G.snake = [{ x: 8, y: cy }, { x: 7, y: cy }, { x: 6, y: cy }, { x: 5, y: cy }];
  G.prev = G.snake.map(s => ({ ...s }));
  G.dir = DIRS.right;
  G.queue = [];
  G.grow = 0;
  G.obstacles = [];
  G.bonus = null;
  G.food = null;
  G.score = 0; G.apples = 0; G.level = 1; G.combo = 1; G.lastEatAt = -1e9;
  G.interval = BASE_INTERVAL; G.gameTime = 0; G.playedMs = 0;
  G.particles = []; G.floats = [];
  G.shake = 0; G.flashRed = 0; G.flashGreen = 0;
  G.dead = false; G.won = false; G.newRecord = false; G.cause = '';
  $('combo').classList.remove('show');
  spawnFood();
}

/* ================== ПОТОК ИГРЫ ================== */
function show(el) { el.classList.remove('hidden'); }
function hide(el) { el.classList.add('hidden'); }

function toMenu() {
  G.state = 'menu';
  resetWorld();
  show(menuOverlay); hide(pauseOverlay); hide(overOverlay);
  $('menuBest').textContent = bests[G.mode] || 0;
  syncHud();
}

function startGame() {
  resetWorld();
  hide(menuOverlay); hide(pauseOverlay); hide(overOverlay);
  G.state = 'countdown';
  G.countdownStart = performance.now();
  G.countdownLast = 0;
  syncHud();
}

function pauseGame() {
  if (G.state !== 'playing') return;
  G.state = 'paused';
  show(pauseOverlay);
}

function resumeGame() {
  if (G.state !== 'paused') return;
  hide(pauseOverlay);
  G.state = 'playing';
  G.lastTick = performance.now();
}

function gameOver(cause, won = false) {
  G.state = 'gameover';
  G.dead = !won;
  G.won = won;
  G.cause = cause;
  G.dieAt = performance.now();
  if (!won) { SFX.die(); G.shake = 12; G.flashRed = 0.7; }
  else { SFX.level(); G.flashGreen = 0.5; }
  if (G.score > (bests[G.mode] || 0) && G.score > 0) {
    G.newRecord = true;
    bests[G.mode] = G.score;
    Store.set('zmeyka.best.' + G.mode, G.score);
  }
  syncHud();
  setTimeout(() => {
    if (G.state !== 'gameover') return;
    fillOverOverlay();
    show(overOverlay);
  }, won ? 400 : 750);
}

/* ================== ШАГ ЛОГИКИ ================== */
function step() {
  if (G.queue.length) G.dir = G.queue.shift();
  const head = G.snake[0];
  let nx = head.x + G.dir.x, ny = head.y + G.dir.y;
  const wrap = MODES[G.mode].wrap;
  if (wrap) { nx = (nx + COLS) % COLS; ny = (ny + ROWS) % ROWS; }
  else if (!inField(nx, ny)) return die('wall');

  if (G.obstacles.some(o => o.x === nx && o.y === ny && o.solid)) return die('obstacle');

  const body = G.grow > 0 ? G.snake : G.snake.slice(0, -1); // хвост уходит — клетка свободна
  if (body.some(s => s.x === nx && s.y === ny)) return die('self');

  G.prev = G.snake.map(s => ({ x: s.x, y: s.y }));
  G.snake.unshift({ x: nx, y: ny });
  if (G.grow > 0) G.grow--; else G.snake.pop();
  while (G.prev.length < G.snake.length) G.prev.push({ ...G.prev[G.prev.length - 1] });

  if (G.food && G.food.x === nx && G.food.y === ny) eatApple();
  if (G.bonus && G.bonus.x === nx && G.bonus.y === ny) eatBonus();
}

function die(key) { gameOver(CAUSES[key]); }

function eatApple() {
  const now = performance.now();
  G.apples++;
  G.combo = (now - G.lastEatAt <= COMBO_WINDOW) ? Math.min(G.combo + 1, MAX_COMBO) : 1;
  G.lastEatAt = now;
  const pts = 10 * G.combo;
  G.score += pts;
  G.grow += 1;
  burst(G.food.x, G.food.y, '#ff5d6c', 12);
  addFloat(G.food.x, G.food.y, '+' + pts, G.combo > 1 ? '#ffd166' : '#eaf2ff');
  SFX.eat(G.combo);
  if (G.combo > 1) showCombo();
  G.food = null;
  spawnFood();
  if (G.apples % BONUS_EVERY === 0) spawnBonus();
  const lvl = 1 + Math.floor(G.apples / APPLES_PER_LEVEL);
  if (lvl !== G.level) {
    G.level = lvl;
    G.interval = Math.max(MIN_INTERVAL, BASE_INTERVAL - (G.level - 1) * LEVEL_STEP);
    G.flashGreen = 0.35;
    addFloat(COLS / 2 - 0.5, ROWS / 2 - 2, 'УРОВЕНЬ ' + G.level, '#34f5a5');
    SFX.level();
  }
  if (MODES[G.mode].obstacles && G.apples % 3 === 0 && G.obstacles.length < 14) addObstacle();
  syncHud();
}

function eatBonus() {
  const pts = 50 + (G.level - 1) * 10;
  G.score += pts;
  G.grow += 2;
  burst(G.bonus.x, G.bonus.y, '#ffd166', 22);
  addFloat(G.bonus.x, G.bonus.y, '+' + pts, '#ffd166');
  SFX.bonus();
  G.bonus = null;
  syncHud();
}

/* ================== ЭФФЕКТЫ ================== */
function burst(cx, cy, color, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = cell * (1.5 + Math.random() * 4);
    G.particles.push({
      x: (cx + 0.5) * cell, y: (cy + 0.5) * cell,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      r: cell * (0.05 + Math.random() * 0.08),
      color, born: performance.now(), life: 450 + Math.random() * 350,
    });
  }
}

function addFloat(cx, cy, text, color) {
  G.floats.push({ x: (cx + 0.5) * cell, y: cy * cell, text, color, born: performance.now(), life: 950 });
}

function updateFx(dtMs) {
  const dt = dtMs / 1000;
  const now = performance.now();
  for (const p of G.particles) {
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vy += cell * 3.5 * dt;
  }
  G.particles = G.particles.filter(p => now - p.born < p.life);
  G.floats = G.floats.filter(f => now - f.born < f.life);
  G.shake = Math.max(0, G.shake - dt * 22);
  G.flashRed = Math.max(0, G.flashRed - dt * 1.6);
  G.flashGreen = Math.max(0, G.flashGreen - dt * 1.4);
}

/* ================== РЕНДЕР ================== */
function rr(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function starPath(cx, cy, R, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5;
    const rad = i % 2 ? r : R;
    const x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function bodyColor(k, now, dead) {
  const c1 = dead ? [168, 176, 190] : [126, 255, 178];
  const c2 = dead ? [92, 100, 116] : [18, 148, 158];
  const sh = dead ? 0 : Math.sin(now / 170 - k * 5.2) * 0.06;
  const r = (c1[0] + (c2[0] - c1[0]) * k) * (1 + sh);
  const g = (c1[1] + (c2[1] - c1[1]) * k) * (1 + sh);
  const b = (c1[2] + (c2[2] - c1[2]) * k) * (1 + sh);
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

function drawObstacles(now) {
  for (const o of G.obstacles) {
    const x = o.x * cell, y = o.y * cell;
    ctx.save();
    if (!o.solid) ctx.globalAlpha = 0.3 + 0.2 * Math.sin(now / 85);
    else {
      const gr = o.solidSince ? (now - o.solidSince) / 180 : 1;
      ctx.globalAlpha = 0.6 + 0.4 * clamp(gr, 0, 1);
    }
    const pad = cell * 0.10, r = cell * 0.18;
    rr(x + pad, y + pad, cell - pad * 2, cell - pad * 2, r);
    ctx.fillStyle = '#2b3752'; ctx.fill();
    ctx.strokeStyle = '#4a5b85'; ctx.lineWidth = Math.max(1, cell * 0.045); ctx.stroke();
    rr(x + pad * 2.4, y + pad * 2.4, cell - pad * 4.8, cell - pad * 4.8, r * 0.6);
    ctx.fillStyle = '#232d45'; ctx.fill();
    ctx.restore();
  }
}

function drawFood(now) {
  if (!G.food) return;
  const cx = (G.food.x + 0.5) * cell, cy = (G.food.y + 0.5) * cell;
  const pulse = 1 + 0.07 * Math.sin(now / 280);
  const r = cell * 0.32 * pulse;
  const g = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 2.1);
  g.addColorStop(0, 'rgba(255,93,108,0.35)');
  g.addColorStop(1, 'rgba(255,93,108,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(cx, cy, r * 2.1, 0, 7); ctx.fill();
  const body = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.35, r * 0.15, cx, cy, r);
  body.addColorStop(0, '#ff8a94');
  body.addColorStop(0.55, '#ff5d6c');
  body.addColorStop(1, '#d63b52');
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();
  ctx.strokeStyle = '#8b5a2b'; ctx.lineWidth = Math.max(1, cell * 0.05);
  ctx.beginPath();
  ctx.moveTo(cx, cy - r * 0.8);
  ctx.quadraticCurveTo(cx + r * 0.15, cy - r * 1.1, cx + r * 0.3, cy - r * 1.2);
  ctx.stroke();
  ctx.save();
  ctx.translate(cx + r * 0.25, cy - r * 1.05);
  ctx.rotate(-0.6);
  ctx.fillStyle = '#58d68d';
  ctx.beginPath(); ctx.ellipse(0, 0, r * 0.45, r * 0.2, 0, 0, 7); ctx.fill();
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath(); ctx.arc(cx - r * 0.35, cy - r * 0.4, r * 0.16, 0, 7); ctx.fill();
}

function drawBonus(now) {
  if (!G.bonus) return;
  const cx = (G.bonus.x + 0.5) * cell, cy = (G.bonus.y + 0.5) * cell;
  const frac = clamp(G.bonus.remaining / G.bonus.total, 0, 1);
  const pulse = 1 + 0.09 * Math.sin(now / 180);
  const R = cell * 0.40 * pulse;
  ctx.save();
  ctx.globalAlpha = frac < 0.28 ? 0.55 + 0.45 * Math.sin(now / 90) : 1;
  const g = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 2.4);
  g.addColorStop(0, 'rgba(255,209,102,0.4)');
  g.addColorStop(1, 'rgba(255,209,102,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(cx, cy, R * 2.4, 0, 7); ctx.fill();
  ctx.shadowColor = 'rgba(255,209,102,0.8)'; ctx.shadowBlur = cell * 0.5;
  const gg = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
  gg.addColorStop(0, '#ffe9a8');
  gg.addColorStop(1, '#f4b23e');
  ctx.fillStyle = gg;
  starPath(cx, cy, R, R * 0.5); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,209,102,0.9)';
  ctx.lineWidth = Math.max(1.5, cell * 0.06);
  ctx.beginPath();
  ctx.arc(cx, cy, cell * 0.72, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
  ctx.stroke();
  ctx.restore();
}

function drawSnake(now, t) {
  const n = G.snake.length;
  const pts = [];
  const wrap = MODES[G.mode].wrap;
  for (let i = 0; i < n; i++) {
    const a = G.prev[i], b = G.snake[i];
    let dx = b.x - a.x, dy = b.y - a.y;
    if (wrap) {
      if (dx > 1) dx -= COLS; else if (dx < -1) dx += COLS;
      if (dy > 1) dy -= ROWS; else if (dy < -1) dy += ROWS;
    }
    let x = a.x + dx * t, y = a.y + dy * t;
    x = ((x % COLS) + COLS) % COLS;
    y = ((y % ROWS) + ROWS) % ROWS;
    pts.push({ x: (x + 0.5) * cell, y: (y + 0.5) * cell, i });
  }
  // разрываем цепочку на «портальных» переходах
  const runs = [[pts[0]]];
  for (let i = 1; i < n; i++) {
    const a = pts[i - 1], b = pts[i];
    if (Math.abs(a.x - b.x) > cell * 1.5 || Math.abs(a.y - b.y) > cell * 1.5) runs.push([b]);
    else runs[runs.length - 1].push(b);
  }
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // мягкое свечение
  ctx.strokeStyle = G.dead ? 'rgba(150,160,175,0.10)' : 'rgba(61,220,132,0.14)';
  ctx.lineWidth = cell;
  for (const run of runs) {
    ctx.beginPath();
    ctx.moveTo(run[0].x, run[0].y);
    for (let i = 1; i < run.length; i++) ctx.lineTo(run[i].x, run[i].y);
    ctx.stroke();
  }
  // тело с сужением к хвосту
  for (const run of runs) {
    for (let i = 1; i < run.length; i++) {
      const k = run[i].i / Math.max(1, n - 1);
      ctx.strokeStyle = bodyColor(k, now, G.dead);
      ctx.lineWidth = cell * (0.74 - 0.18 * k);
      ctx.beginPath();
      ctx.moveTo(run[i - 1].x, run[i - 1].y);
      ctx.lineTo(run[i].x, run[i].y);
      ctx.stroke();
    }
  }
  drawHead(now, pts);
}

function drawHead(now, pts) {
  let hx = pts[0].x, hy = pts[0].y;
  if (G.dead) {
    const e = (now - G.dieAt) / 240;
    if (e >= 0 && e < 1) {
      const m = Math.sin(e * Math.PI) * cell * 0.3;
      hx += G.dir.x * m; hy += G.dir.y * m;
    }
  }
  let vx = hx - (pts[1] ? pts[1].x : hx - cell);
  let vy = hy - (pts[1] ? pts[1].y : hy);
  const L = Math.hypot(vx, vy);
  if (L < 0.001) { vx = G.dir.x; vy = G.dir.y; } else { vx /= L; vy /= L; }
  const px = -vy, py = vx;
  const R = cell * 0.46;
  ctx.save();
  ctx.shadowColor = G.dead ? 'rgba(160,170,185,0.5)' : 'rgba(61,220,132,0.65)';
  ctx.shadowBlur = cell * 0.55;
  const g = ctx.createRadialGradient(hx - R * 0.3, hy - R * 0.3, R * 0.1, hx, hy, R);
  if (G.dead) { g.addColorStop(0, '#c2c9d6'); g.addColorStop(1, '#6d7689'); }
  else { g.addColorStop(0, '#b4ffd2'); g.addColorStop(1, '#2fd883'); }
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(hx, hy, R, 0, 7); ctx.fill();
  ctx.restore();
  // язычок
  if (!G.dead && (now % 2800) < 300) {
    const wig = Math.sin(now / 40) * cell * 0.05;
    const mx = hx + vx * R * 0.8, my = hy + vy * R * 0.8;
    const tx = hx + vx * (R * 1.55 + wig), ty = hy + vy * (R * 1.55 + wig);
    ctx.strokeStyle = '#ff6b81';
    ctx.lineWidth = Math.max(1.5, cell * 0.07);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(mx, my); ctx.lineTo(tx, ty);
    ctx.moveTo(tx, ty); ctx.lineTo(tx + (vx * 0.35 + px * 0.3) * cell * 0.18, ty + (vy * 0.35 + py * 0.3) * cell * 0.18);
    ctx.moveTo(tx, ty); ctx.lineTo(tx + (vx * 0.35 - px * 0.3) * cell * 0.18, ty + (vy * 0.35 - py * 0.3) * cell * 0.18);
    ctx.stroke();
  }
  // глаза
  const eo = cell * 0.19, ef = cell * 0.13, er = cell * 0.105;
  for (const s of [-1, 1]) {
    const ex = hx + vx * ef + px * eo * s, ey = hy + vy * ef + py * eo * s;
    if (G.dead) {
      ctx.strokeStyle = '#3a1220';
      ctx.lineWidth = Math.max(1.5, cell * 0.055);
      ctx.lineCap = 'round';
      const q = er * 0.9;
      ctx.beginPath();
      ctx.moveTo(ex - q, ey - q); ctx.lineTo(ex + q, ey + q);
      ctx.moveTo(ex + q, ey - q); ctx.lineTo(ex - q, ey + q);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(ex, ey, er, 0, 7); ctx.fill();
      ctx.fillStyle = '#0a1a12';
      ctx.beginPath(); ctx.arc(ex + vx * er * 0.45, ey + vy * er * 0.45, er * 0.5, 0, 7); ctx.fill();
    }
  }
}

function drawParticles(now) {
  for (const p of G.particles) {
    const a = 1 - (now - p.born) / p.life;
    ctx.globalAlpha = Math.max(0, a);
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (0.5 + 0.5 * a), 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawFloats(now) {
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const f of G.floats) {
    const p = (now - f.born) / f.life;
    ctx.globalAlpha = 1 - p;
    ctx.font = `800 ${cell * 0.62}px system-ui, 'Segoe UI', sans-serif`;
    ctx.lineWidth = cell * 0.12;
    ctx.strokeStyle = 'rgba(5,10,18,0.8)';
    const y = f.y - p * cell * 1.3;
    ctx.strokeText(f.text, f.x, y);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, y);
  }
  ctx.globalAlpha = 1;
}

function drawCountdown(now) {
  const el = now - G.countdownStart;
  const num = 3 - Math.floor(el / COUNTDOWN_MS);
  if (num < 1) return;
  const p = (el % COUNTDOWN_MS) / COUNTDOWN_MS;
  const scale = 1.5 - 0.5 * Math.min(1, p * 3.2);
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(scale, scale);
  ctx.font = `900 ${cell * 4}px system-ui, 'Segoe UI', sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.globalAlpha = p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3;
  ctx.fillStyle = '#34f5a5';
  ctx.shadowColor = 'rgba(52,245,165,0.8)';
  ctx.shadowBlur = cell;
  ctx.fillText(String(num), 0, 0);
  ctx.restore();
}

function render(now) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (G.shake > 0.3) ctx.translate((Math.random() * 2 - 1) * G.shake, (Math.random() * 2 - 1) * G.shake);
  ctx.drawImage(boardPattern, 0, 0);
  drawObstacles(now);
  drawFood(now);
  drawBonus(now);
  drawSnake(now, G.t);
  drawParticles(now);
  drawFloats(now);
  if (G.flashRed > 0.01) { ctx.fillStyle = `rgba(255,70,90,${G.flashRed * 0.32})`; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  if (G.flashGreen > 0.01) { ctx.fillStyle = `rgba(52,245,165,${G.flashGreen * 0.16})`; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  if (G.state === 'countdown') drawCountdown(now);
}

/* ================== HUD ================== */
const hudCache = { score: -1, best: -1, level: -1, len: -1 };
function setStat(id, v, key) {
  if (hudCache[key] === v) return;
  hudCache[key] = v;
  const el = $(id);
  el.textContent = v;
  el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
}
function syncHud() {
  setStat('score', G.score, 'score');
  setStat('best', Math.max(bests[G.mode] || 0, G.score), 'best');
  setStat('level', G.level, 'level');
  setStat('len', G.snake.length, 'len');
}
function showCombo() {
  const c = $('combo');
  c.textContent = '×' + G.combo;
  c.classList.add('show');
  c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop');
}
function fillOverOverlay() {
  $('overTitle').textContent = G.won ? 'ПОБЕДА!' : 'ИГРА ОКОНЧЕНА';
  $('overTitle').classList.toggle('win', G.won);
  $('causeText').textContent = G.cause;
  $('recordBadge').classList.toggle('show', G.newRecord);
  $('finalScore').textContent = G.score;
  $('statApples').textContent = G.apples;
  $('statLen').textContent = G.snake.length;
  $('statLevel').textContent = G.level;
  const s = Math.floor(G.playedMs / 1000);
  $('statTime').textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

/* ================== УПРАВЛЕНИЕ ================== */
function queueDir(d) {
  const last = G.queue.length ? G.queue[G.queue.length - 1] : G.dir;
  if (d === last) return;
  if (d.x === -last.x && d.y === -last.y) return; // разворот запрещён
  if (G.queue.length < 2) G.queue.push(d);
}

const KEY_DIRS = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
};

window.addEventListener('keydown', e => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  SFX.ensure();
  const d = KEY_DIRS[e.code];
  if (d && G.state === 'playing') { queueDir(DIRS[d]); return; }
  switch (e.code) {
    case 'Space':
    case 'Enter':
      if (G.state === 'menu') startGame();
      else if (G.state === 'playing' && e.code === 'Space') pauseGame();
      else if (G.state === 'paused') resumeGame();
      else if (G.state === 'gameover') startGame();
      break;
    case 'Escape':
      if (G.state === 'playing') pauseGame();
      else if (G.state === 'paused' || G.state === 'gameover') toMenu();
      break;
    case 'KeyP':
      if (G.state === 'playing') pauseGame();
      else if (G.state === 'paused') resumeGame();
      break;
    case 'KeyM':
      toggleSound();
      break;
  }
});

/* Свайпы и тапы на телефоне */
let touchStart = null;
const boardEl = $('board');
boardEl.addEventListener('touchstart', e => {
  if (e.touches.length === 1) touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
}, { passive: true });
boardEl.addEventListener('touchmove', e => {
  e.preventDefault();
  if (!touchStart || G.state !== 'playing') return;
  const t = e.touches[0];
  const dx = t.clientX - touchStart.x, dy = t.clientY - touchStart.y;
  if (Math.hypot(dx, dy) > 28) {
    queueDir(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? DIRS.right : DIRS.left) : (dy > 0 ? DIRS.down : DIRS.up));
    touchStart = { x: t.clientX, y: t.clientY };
  }
}, { passive: false });
boardEl.addEventListener('touchend', e => {
  if (!touchStart) return;
  const t = e.changedTouches[0];
  const dist = Math.hypot(t.clientX - touchStart.x, t.clientY - touchStart.y);
  touchStart = null;
  SFX.ensure();
  if (dist > 28) return; // это был свайп
  if (G.state === 'menu' || G.state === 'gameover') startGame();
  else if (G.state === 'playing') pauseGame();
  else if (G.state === 'paused') resumeGame();
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && G.state === 'playing') pauseGame();
});

/* ================== КНОПКИ ================== */
const menuOverlay = $('menuOverlay');
const pauseOverlay = $('pauseOverlay');
const overOverlay = $('overOverlay');

function selectMode(m) {
  if (!MODES[m]) m = 'classic';
  G.mode = m;
  Store.set('zmeyka.mode', m);
  document.querySelectorAll('.mode').forEach(b => b.classList.toggle('active', b.dataset.mode === m));
  $('menuBest').textContent = bests[m] || 0;
  syncHud();
}

document.querySelectorAll('.mode').forEach(btn =>
  btn.addEventListener('click', () => { SFX.ensure(); SFX.click(); selectMode(btn.dataset.mode); }));
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
  updateFx(dt);

  if (G.state === 'countdown') {
    const el = now - G.countdownStart;
    const num = 3 - Math.floor(el / COUNTDOWN_MS);
    if (num !== G.countdownLast) { G.countdownLast = num; if (num >= 1) SFX.count(false); }
    if (el >= 3 * COUNTDOWN_MS) {
      G.state = 'playing';
      G.lastTick = now;
      G.startedAt = now;
      SFX.count(true);
    }
  }

  if (G.state === 'playing') {
    G.playedMs += dt;
    G.gameTime += dt;
    if (G.bonus) {
      G.bonus.remaining -= dt;
      if (G.bonus.remaining <= 0) G.bonus = null;
    }
    for (const o of G.obstacles) {
      if (!o.solid && G.gameTime >= o.solidAt) {
        if (!G.snake.some(s => s.x === o.x && s.y === o.y)) { o.solid = true; o.solidSince = performance.now(); }
        else o.solidAt += 500;
      }
    }
    let guard = 0;
    while (G.state === 'playing' && now - G.lastTick >= G.interval && guard < 4) {
      G.lastTick += G.interval;
      step();
      guard++;
    }
    if (now - G.lastTick >= G.interval) G.lastTick = now;
    if (G.combo > 1 && now - G.lastEatAt > COMBO_WINDOW) {
      G.combo = 1;
      $('combo').classList.remove('show');
    }
  }

  G.t = clamp((now - G.lastTick) / G.interval, 0, 1);
  render(now);
}

/* ================== СТАРТ ================== */
SFX.enabled = Store.get('zmeyka.sound', true);
$('soundBtn').textContent = SFX.enabled ? '🔊' : '🔇';
resize();
window.addEventListener('resize', resize);
selectMode(G.mode);
resetWorld();
syncHud();
requestAnimationFrame(loop);
