'use strict';

if (typeof window.t === 'undefined') window.t = s => s; // до загрузки i18n.js

/* ================== КОНСТАНТЫ ================== */
const LW = 520, LH = 600;          // логический размер поля
const COLS = 12, GAP = 4;
const MARGIN = 16, BRICK_TOP = 64, BH = 17;
const BW = (LW - MARGIN * 2 - GAP * (COLS - 1)) / COLS;
const PADDLE_Y = LH - 40, PADDLE_H = 12, PADDLE_W = 88, WIDE_W = 150;
const BALL_R = 7;
const COLORS = ['#ff5d6c', '#ff9f43', '#ffd166', '#34f5a5', '#38e0c8', '#4da3ff', '#b388ff', '#ff5d8f'];
const POWERS = { W: '#34f5a5', S: '#4da3ff', M: '#ffd166' };

/* ================== УТИЛИТЫ ================== */
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const Store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};

/* ================== СОСТОЯНИЕ ================== */
const A = {
  state: 'menu', // menu | playing | paused | gameover
  bricks: [], balls: [], powers: [], particles: [], floats: [],
  paddle: { x: LW / 2 - PADDLE_W / 2, w: PADDLE_W, wideUntil: 0 },
  slowUntil: 0,
  score: 0, level: 1, lives: 3, bricksBroken: 0,
  best: Store.get('arkanoid.best', 0), newRecord: false,
  flashGreen: 0, shake: 0,
  keys: { left: false, right: false },
};

const canvas = $('game'), ctx = canvas.getContext('2d');
const menuOverlay = $('menuOverlay'), pauseOverlay = $('pauseOverlay'), overOverlay = $('overOverlay');
function show(el) { el.classList.remove('hidden'); }
function hide(el) { el.classList.add('hidden'); }

/* ================== РАЗМЕРЫ ================== */
let scale = 1;
function resize() {
  const availH = window.innerHeight - 235;
  const availW = Math.min(window.innerWidth - 24, 560);
  let cssH = clamp(availH, 320, 640);
  let cssW = cssH * LW / LH;
  if (cssW > availW) { cssW = availW; cssH = cssW * LH / LW; }
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  scale = canvas.width / LW;
}

/* ================== ПОСТРОЕНИЕ УРОВНЯ ================== */
function buildBricks(level) {
  const kind = (level - 1) % 4;
  const list = [];
  const rows = level === 1 ? 6 : 8;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < COLS; c++) {
      let place = true;
      let hp = r < 2 ? 2 : 1;
      if (kind === 1) place = (r + c) % 2 === 0;
      else if (kind === 2) place = Math.abs(c - 5.5) <= r * 0.75 + 1;
      else if (kind === 3) {
        const border = r === 0 || r === rows - 1 || c === 0 || c === COLS - 1;
        const center = (r === 3 || r === 4) && c >= 4 && c <= 7;
        place = border || center;
        hp = center ? 2 : r === 0 ? 2 : 1;
      }
      if (level === 1) hp = 1;
      if (place) list.push({
        x: MARGIN + c * (BW + GAP), y: BRICK_TOP + r * (BH + GAP),
        r, hp, color: COLORS[r % COLORS.length], alive: true,
      });
    }
  return list;
}

function baseSpeed() { return Math.min(470, 320 + (A.level - 1) * 25); }

function makeBall(stuck) {
  return {
    x: A.paddle.x + A.paddle.w / 2, y: PADDLE_Y - BALL_R - 1,
    vx: 0, vy: 0, speed: baseSpeed(), stuck,
    trail: [],
  };
}

function launchBalls() {
  let launched = false;
  for (const b of A.balls) {
    if (!b.stuck) continue;
    const a = (-90 + (Math.random() * 50 - 25)) * Math.PI / 180;
    b.vx = Math.cos(a); b.vy = Math.sin(a);
    b.stuck = false;
    launched = true;
  }
  if (launched) SFX.bounce(true);
}

/* ================== ПОТОК ИГРЫ ================== */
function resetWorld() {
  A.bricks = buildBricks(A.level = 1);
  A.paddle.w = PADDLE_W; A.paddle.wideUntil = 0;
  A.slowUntil = 0;
  A.score = 0; A.lives = 3; A.bricksBroken = 0; A.newRecord = false;
  A.powers = []; A.particles = []; A.floats = [];
  A.balls = [makeBall(true)];
  A.flashGreen = 0; A.shake = 0;
  syncHud();
}

function startGame() {
  resetWorld();
  hide(menuOverlay); hide(pauseOverlay); hide(overOverlay);
  A.state = 'playing';
}

function pauseGame() {
  if (A.state !== 'playing') return;
  A.state = 'paused';
  show(pauseOverlay);
}

function resumeGame() {
  if (A.state !== 'paused') return;
  hide(pauseOverlay);
  A.state = 'playing';
}

function toMenu() {
  A.state = 'menu';
  resetWorld();
  show(menuOverlay); hide(pauseOverlay); hide(overOverlay);
  $('menuBest').textContent = A.best;
}

function gameOver() {
  A.state = 'gameover';
  SFX.die();
  A.shake = 8;
  A.newRecord = A.score > A.best && A.score > 0;
  if (A.newRecord) { A.best = A.score; Store.set('arkanoid.best', A.best); }
  syncHud();
  setTimeout(() => {
    if (A.state !== 'gameover') return;
    $('finalScore').textContent = A.score;
    $('statLevel').textContent = A.level;
    $('statBricks').textContent = A.bricksBroken;
    $('recordBadge').classList.toggle('show', A.newRecord);
    show(overOverlay);
  }, 700);
}

/* ================== ОБНОВЛЕНИЕ ================== */
function loseBall() {
  SFX.lifeLost();
  A.lives--;
  A.paddle.w = PADDLE_W; A.paddle.wideUntil = 0;
  A.slowUntil = 0;
  A.powers = [];
  if (A.lives <= 0) return gameOver();
  A.balls = [makeBall(true)];
  syncHud();
}

function levelCleared() {
  SFX.level();
  A.flashGreen = 0.5;
  addFloat('УРОВЕНЬ ' + (A.level + 1), '#34f5a5');
  A.level++;
  A.bricks = buildBricks(A.level);
  A.powers = [];
  A.balls = [makeBall(true)];
  A.paddle.w = PADDLE_W; A.paddle.wideUntil = 0;
  A.slowUntil = 0;
  syncHud();
}

function applyPower(type) {
  SFX.power();
  A.score += 25;
  const now = performance.now();
  if (type === 'W') A.paddle.wideUntil = now + 12000;
  else if (type === 'S') A.slowUntil = now + 8000;
  else if (type === 'M') {
    const src = A.balls.find(b => !b.stuck);
    if (src && A.balls.length < 6) {
      for (const da of [-0.45, 0.45]) {
        const a = Math.atan2(src.vy, src.vx) + da;
        A.balls.push({ x: src.x, y: src.y, vx: Math.cos(a), vy: Math.sin(a), speed: src.speed, stuck: false, trail: [] });
      }
    }
  }
  syncHud();
}

function update(dtMs, now) {
  const dt = Math.min(40, dtMs) / 1000;
  const p = A.paddle;

  // платформа
  const kv = (A.keys.right ? 1 : 0) - (A.keys.left ? 1 : 0);
  if (kv) p.x += kv * 520 * dt;
  p.x = clamp(p.x, 6, LW - p.w - 6);
  p.w = now < p.wideUntil ? WIDE_W : PADDLE_W;

  const mul = now < A.slowUntil ? 0.68 : 1;

  // шары
  for (const b of A.balls) {
    if (b.stuck) {
      b.x = p.x + p.w / 2;
      b.y = PADDLE_Y - BALL_R - 1;
      continue;
    }
    const dist = b.speed * mul * dt;
    const steps = Math.max(1, Math.ceil(dist / 4));
    const stepLen = dist / steps;
    for (let s = 0; s < steps; s++) {
      b.x += b.vx * stepLen;
      b.y += b.vy * stepLen;
      // стены
      if (b.x - BALL_R < 0) { b.x = BALL_R; b.vx = Math.abs(b.vx); SFX.bounce(true); }
      else if (b.x + BALL_R > LW) { b.x = LW - BALL_R; b.vx = -Math.abs(b.vx); SFX.bounce(true); }
      if (b.y - BALL_R < 0) { b.y = BALL_R; b.vy = Math.abs(b.vy); SFX.bounce(true); }
      // платформа
      if (b.vy > 0 && b.y + BALL_R >= PADDLE_Y && b.y - BALL_R <= PADDLE_Y + PADDLE_H &&
          b.x >= p.x - BALL_R && b.x <= p.x + p.w + BALL_R) {
        const rel = clamp((b.x - (p.x + p.w / 2)) / (p.w / 2), -1, 1);
        const ang = rel * (60 * Math.PI / 180);
        b.speed = Math.min(520, b.speed + 4);
        b.vx = Math.sin(ang); b.vy = -Math.cos(ang);
        b.y = PADDLE_Y - BALL_R - 0.5;
        SFX.bounce(false);
        break;
      }
      // блоки
      for (const br of A.bricks) {
        if (!br.alive) continue;
        const cx = clamp(b.x, br.x, br.x + BW), cy = clamp(b.y, br.y, br.y + BH);
        const dx = b.x - cx, dy = b.y - cy;
        if (dx * dx + dy * dy > BALL_R * BALL_R) continue;
        if (Math.abs(dx) > Math.abs(dy)) b.vx = dx > 0 ? Math.abs(b.vx) : -Math.abs(b.vx);
        else b.vy = dy > 0 ? Math.abs(b.vy) : -Math.abs(b.vy);
        br.hp--;
        if (br.hp <= 0) {
          br.alive = false;
          A.bricksBroken++;
          A.score += 10 + A.level;
          burst(br.x + BW / 2, br.y + BH / 2, br.color, 8);
          if (A.powers.length < 2 && Math.random() < 0.22) {
            const types = ['W', 'S', 'M'];
            A.powers.push({ x: br.x + BW / 2, y: br.y + BH / 2, type: types[(Math.random() * 3) | 0] });
          }
          SFX.brick(br.r);
        } else {
          A.score += 4;
          SFX.bounce(true);
        }
        syncHud();
        break;
      }
      if (b.y - BALL_R > LH + 8) { b.dead = true; break; }
    }
    b.trail.push({ x: b.x, y: b.y });
    if (b.trail.length > 9) b.trail.shift();
  }
  A.balls = A.balls.filter(b => !b.dead);
  if (!A.balls.length && A.state === 'playing') return loseBall();

  // бонусы
  for (const pw of A.powers) {
    pw.y += 150 * dt;
    if (pw.y > PADDLE_Y - 6 && pw.y < PADDLE_Y + PADDLE_H + 10 && pw.x > p.x - 12 && pw.x < p.x + p.w + 12) {
      pw.dead = true;
      applyPower(pw.type);
      addFloat('+25 БОНУС', POWERS[pw.type], pw.x, pw.y);
    }
  }
  A.powers = A.powers.filter(pw => !pw.dead && pw.y < LH + 20);

  // частицы
  for (const pt of A.particles) {
    pt.x += pt.vx * dt; pt.y += pt.vy * dt;
    pt.vy += 320 * dt;
  }
  A.particles = A.particles.filter(pt => now - pt.born < pt.life);
  A.floats = A.floats.filter(f => now - f.born < f.life);
  A.shake = Math.max(0, A.shake - dt * 26);
  A.flashGreen = Math.max(0, A.flashGreen - dt * 1.4);

  if (A.bricks.every(br => !br.alive)) levelCleared();
}

/* ================== ЭФФЕКТЫ ================== */
function burst(x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 60 + Math.random() * 160;
    A.particles.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40,
      r: 1.5 + Math.random() * 2.5, color, born: performance.now(), life: 400 + Math.random() * 300,
    });
  }
}

function addFloat(text, color, x, y) {
  A.floats.push({ text, color, x: x ?? LW / 2, y: y ?? LH * 0.4, born: performance.now(), life: 950 });
}

/* ================== РЕНДЕР ================== */
function rr(c2d, x, y, w, h, r) {
  c2d.beginPath();
  c2d.moveTo(x + r, y);
  c2d.arcTo(x + w, y, x + w, y + h, r);
  c2d.arcTo(x + w, y + h, x, y + h, r);
  c2d.arcTo(x, y + h, x, y, r);
  c2d.arcTo(x, y, x + w, y, r);
  c2d.closePath();
}

function render(now) {
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, LW, LH);
  if (A.shake > 0.3) ctx.translate((Math.random() * 2 - 1) * A.shake, (Math.random() * 2 - 1) * A.shake);
  ctx.fillStyle = '#0b101e';
  ctx.fillRect(-20, -20, LW + 40, LH + 40);

  // блоки
  for (const br of A.bricks) {
    if (!br.alive) continue;
    const g = ctx.createLinearGradient(br.x, br.y, br.x + BW, br.y + BH);
    if (br.hp >= 2) {
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.25, br.color);
      g.addColorStop(1, br.color);
    } else {
      g.addColorStop(0, br.color);
      g.addColorStop(1, 'rgba(0,0,0,0.45)');
    }
    ctx.fillStyle = g;
    rr(ctx, br.x, br.y, BW, BH, 5);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillRect(br.x + 4, br.y + 2.5, BW - 8, 2.5);
  }

  // бонусы
  for (const pw of A.powers) {
    ctx.save();
    ctx.shadowColor = POWERS[pw.type];
    ctx.shadowBlur = 10;
    ctx.fillStyle = 'rgba(13,20,36,0.95)';
    rr(ctx, pw.x - 13, pw.y - 9, 26, 18, 8);
    ctx.fill();
    ctx.strokeStyle = POWERS[pw.type];
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = POWERS[pw.type];
    ctx.font = '900 12px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(pw.type, pw.x, pw.y + 0.5);
    ctx.restore();
  }

  // платформа
  const p = A.paddle;
  ctx.save();
  ctx.shadowColor = 'rgba(52,245,165,0.7)';
  ctx.shadowBlur = 14;
  const pg = ctx.createLinearGradient(p.x, PADDLE_Y, p.x + p.w, PADDLE_Y + PADDLE_H);
  pg.addColorStop(0, '#b4ffd2');
  pg.addColorStop(1, '#1fc98e');
  ctx.fillStyle = pg;
  rr(ctx, p.x, PADDLE_Y, p.w, PADDLE_H, 6);
  ctx.fill();
  ctx.restore();

  // шары
  for (const b of A.balls) {
    for (let i = 0; i < b.trail.length; i++) {
      const t = b.trail[i];
      ctx.globalAlpha = (i / b.trail.length) * 0.25;
      ctx.fillStyle = '#ffe9a8';
      ctx.beginPath(); ctx.arc(t.x, t.y, BALL_R * 0.6, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.shadowColor = 'rgba(255,233,168,0.9)';
    ctx.shadowBlur = 12;
    const bg = ctx.createRadialGradient(b.x - 2, b.y - 2, 1, b.x, b.y, BALL_R);
    bg.addColorStop(0, '#ffffff');
    bg.addColorStop(1, '#ffd166');
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.arc(b.x, b.y, BALL_R, 0, 7); ctx.fill();
    ctx.restore();
  }

  // частицы
  for (const pt of A.particles) {
    const a = 1 - (now - pt.born) / pt.life;
    ctx.globalAlpha = Math.max(0, a);
    ctx.fillStyle = pt.color;
    ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // всплывающий текст
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const f of A.floats) {
    const pr = (now - f.born) / f.life;
    ctx.globalAlpha = 1 - pr;
    ctx.font = '800 16px system-ui, sans-serif';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(5,10,18,0.8)';
    ctx.strokeText(f.text, f.x, f.y - pr * 26);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y - pr * 26);
  }
  ctx.globalAlpha = 1;

  // подсказка запуска
  if (A.state === 'playing' && A.balls.some(b => b.stuck)) {
    ctx.font = '600 14px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(142,160,191,0.9)';
    ctx.fillText(t('Пробел или клик — запуск'), LW / 2, PADDLE_Y - 40);
  }

  if (A.flashGreen > 0.01) { ctx.fillStyle = `rgba(52,245,165,${A.flashGreen * 0.14})`; ctx.fillRect(0, 0, LW, LH); }
}

/* ================== HUD ================== */
const hudCache = { score: -1, best: -1, level: -1, lives: -1 };
function syncHud() {
  for (const [id, v] of [['score', A.score], ['best', Math.max(A.best, A.score)], ['level', A.level], ['lives', Math.max(0, A.lives)]]) {
    if (hudCache[id] === v) continue;
    hudCache[id] = v;
    const el = $(id);
    el.textContent = id === 'lives' ? '●'.repeat(v) || '—' : v;
    el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
  }
}

/* ================== УПРАВЛЕНИЕ ================== */
window.addEventListener('keydown', e => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  SFX.ensure();
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') A.keys.left = true;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') A.keys.right = true;
  if (e.code === 'Space') {
    if (A.state === 'menu') startGame();
    else if (A.state === 'playing') { if (A.balls.some(b => b.stuck)) launchBalls(); else pauseGame(); }
    else if (A.state === 'paused') resumeGame();
    else if (A.state === 'gameover') startGame();
  }
  switch (e.code) {
    case 'Enter':
      if (A.state === 'menu' || A.state === 'gameover') startGame();
      break;
    case 'Escape':
    case 'KeyP':
      if (A.state === 'playing') pauseGame();
      else if (A.state === 'paused' && e.code !== 'KeyP') toMenu();
      else if (A.state === 'paused' && e.code === 'KeyP') resumeGame();
      break;
    case 'KeyM':
      toggleSound();
      break;
  }
});
window.addEventListener('keyup', e => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') A.keys.left = false;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') A.keys.right = false;
});

function pointerX(clientX) {
  const rect = canvas.getBoundingClientRect();
  return (clientX - rect.left) / rect.width * LW;
}
canvas.addEventListener('mousemove', e => {
  if (A.state !== 'playing') return;
  A.paddle.x = clamp(pointerX(e.clientX) - A.paddle.w / 2, 6, LW - A.paddle.w - 6);
});
canvas.addEventListener('click', () => {
  SFX.ensure();
  if (A.state === 'playing' && A.balls.some(b => b.stuck)) launchBalls();
});
canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  SFX.ensure();
  if (A.state !== 'playing') return;
  A.paddle.x = clamp(pointerX(e.touches[0].clientX) - A.paddle.w / 2, 6, LW - A.paddle.w - 6);
  if (A.balls.some(b => b.stuck)) launchBalls();
}, { passive: false });
canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  if (A.state !== 'playing') return;
  A.paddle.x = clamp(pointerX(e.touches[0].clientX) - A.paddle.w / 2, 6, LW - A.paddle.w - 6);
}, { passive: false });

document.addEventListener('visibilitychange', () => {
  if (document.hidden && A.state === 'playing') pauseGame();
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
  if (A.state === 'playing') update(now - lastFrame, now);
  lastFrame = now;
  render(now);
}

/* ================== СТАРТ ================== */
SFX.enabled = Store.get('zmeyka.sound', true);
$('soundBtn').textContent = SFX.enabled ? '🔊' : '🔇';
resize();
window.addEventListener('resize', resize);
resetWorld();
$('menuBest').textContent = A.best;
requestAnimationFrame(loop);
