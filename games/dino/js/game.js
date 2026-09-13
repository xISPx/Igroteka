'use strict';

/* ================== КОНСТАНТЫ ================== */
const LW = 720, LH = 260;
const GROUND_Y = 212;
const GRAV = 1900, JUMP_V = -640;
const DINO_X = 72, STAND_H = 44, DUCK_H = 26, DINO_W = 32;

/* ================== УТИЛИТЫ ================== */
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const Store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};

/* ================== СОСТОЯНИЕ ================== */
const D = {
  state: 'menu', // menu | playing | paused | over
  y: GROUND_Y, vy: 0, duck: false, legT: 0,
  obstacles: [], nextIn: 400,
  speed: 310, score: 0, newRecord: false,
  best: Store.get('dino.best', 0),
  shake: 0, groundOff: 0,
};
const stars = Array.from({ length: 20 }, () => ({
  x: Math.random() * LW, y: 20 + Math.random() * 130,
  r: 0.6 + Math.random() * 1.3, tw: Math.random() * Math.PI * 2,
}));

const canvas = $('game'), ctx = canvas.getContext('2d');
const menuOverlay = $('menuOverlay'), pauseOverlay = $('pauseOverlay'), overOverlay = $('overOverlay');
function show(el) { el.classList.remove('hidden'); }
function hide(el) { el.classList.add('hidden'); }

let scale = 1;
function resize() {
  const availH = window.innerHeight - 235;
  const availW = Math.min(window.innerWidth - 24, 760);
  let cssH = clamp(availH, 200, 300);
  let cssW = cssH * LW / LH;
  if (cssW > availW) { cssW = availW; cssH = cssW * LH / LW; }
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  scale = canvas.width / LW;
}

/* ================== ПОТОК ИГРЫ ================== */
function startGame() {
  D.y = GROUND_Y; D.vy = 0; D.duck = false;
  D.obstacles = []; D.nextIn = 500;
  D.speed = 310; D.score = 0; D.newRecord = false;
  D.shake = 0;
  hide(menuOverlay); hide(pauseOverlay); hide(overOverlay);
  D.state = 'playing';
  syncHud();
}

function toMenu() {
  D.state = 'menu';
  D.y = GROUND_Y; D.vy = 0; D.obstacles = [];
  show(menuOverlay); hide(pauseOverlay); hide(overOverlay);
  $('menuBest').textContent = D.best;
}

function pauseGame() {
  if (D.state !== 'playing') return;
  D.state = 'paused';
  show(pauseOverlay);
}

function resumeGame() {
  if (D.state !== 'paused') return;
  hide(pauseOverlay);
  D.state = 'playing';
}

function die() {
  D.state = 'over';
  D.shake = 9;
  SFX.die();
  D.newRecord = D.score > D.best && D.score > 0;
  if (D.newRecord) { D.best = Math.floor(D.score); Store.set('dino.best', D.best); }
  syncHud();
  setTimeout(() => {
    if (D.state !== 'over') return;
    $('finalScore').textContent = Math.floor(D.score);
    $('recordBadge').classList.toggle('show', D.newRecord);
    show(overOverlay);
  }, 500);
}

/* ================== ПРЕПЯТСТВИЯ ================== */
function spawnObstacle() {
  const canBird = D.score > 200;
  if (canBird && Math.random() < 0.28) {
    const high = Math.random() < 0.5;
    D.obstacles.push({
      kind: 'bird', x: LW + 30, w: 38, h: 28,
      y: GROUND_Y - (high ? 86 : 40), flap: Math.random() * 6,
    });
    D.nextIn = 420 + Math.random() * 300;
  } else {
    const n = 1 + ((Math.random() * 3) | 0);
    const w = 16, h = 30 + Math.random() * 18;
    D.obstacles.push({
      kind: 'cactus', x: LW + 30, w: w * n + (n - 1) * 4, h,
      y: GROUND_Y - h, n,
    });
    D.nextIn = 380 + Math.random() * 420;
  }
}

/* ================== ОБНОВЛЕНИЕ ================== */
function jump() {
  if (D.state === 'menu') { startGame(); return; }
  if (D.state !== 'playing') return;
  if (D.y >= GROUND_Y - 0.5) {
    D.vy = JUMP_V;
    D.duck = false;
    SFX.jump();
  }
}

function update(dtMs) {
  const dt = Math.min(40, dtMs) / 1000;
  D.groundOff = (D.groundOff + (D.state === 'playing' ? D.speed : 310) * dt) % 28;
  D.shake = Math.max(0, D.shake - dt * 26);
  if (D.state !== 'playing') return;

  D.speed = Math.min(640, 310 + D.score * 0.14);
  D.score += D.speed * dt * 0.055;
  syncHud();

  // прыжок и приседание
  D.vy += GRAV * dt;
  D.y += D.vy * dt;
  if (D.y > GROUND_Y) { D.y = GROUND_Y; D.vy = 0; }
  D.legT += dt * D.speed * 0.05;
  const dh = D.duck && D.y >= GROUND_Y - 0.5 ? DUCK_H : STAND_H;
  const dinoTop = D.y - dh;

  // препятствия
  D.nextIn -= D.speed * dt;
  if (D.nextIn <= 0) spawnObstacle();
  for (const o of D.obstacles) {
    o.x -= D.speed * dt;
    if (o.kind === 'bird') {
      o.flap += dt * 10;
      o.y += Math.sin(o.flap * 0.8) * 10 * dt;
    }
  }
  D.obstacles = D.obstacles.filter(o => o.x + o.w > -20);

  // столкновения (AABB с зазором)
  for (const o of D.obstacles) {
    if (DINO_X + DINO_W - 6 > o.x + 3 && DINO_X + 4 < o.x + o.w - 3 &&
        dinoTop + 4 < o.y + o.h - 3 && D.y - 2 > o.y + 3) {
      return die();
    }
  }
}

/* ================== РЕНДЕР ================== */
function render(now) {
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, LW, LH);
  if (D.shake > 0.3) ctx.translate((Math.random() * 2 - 1) * D.shake, (Math.random() * 2 - 1) * D.shake);
  ctx.fillStyle = '#0b101e';
  ctx.fillRect(-20, -20, LW + 40, LH + 40);

  for (const s of stars) {
    ctx.globalAlpha = 0.3 + 0.3 * Math.sin(now / 900 + s.tw);
    ctx.fillStyle = '#8ea0bf';
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // далёкие горы
  ctx.fillStyle = '#111a2c';
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  for (let i = 0; i <= 6; i++) {
    const bx = ((i * 140 - (D.groundOff * 0.25)) % (LW + 140) + LW + 140) % (LW + 140) - 70;
    ctx.lineTo(bx, GROUND_Y);
    ctx.lineTo(bx + 70, GROUND_Y - 34 - (i % 3) * 12);
    ctx.lineTo(bx + 140, GROUND_Y);
  }
  ctx.closePath();
  ctx.fill();

  // земля
  ctx.strokeStyle = 'rgba(52,245,165,0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, GROUND_Y + 1); ctx.lineTo(LW, GROUND_Y + 1); ctx.stroke();
  ctx.strokeStyle = 'rgba(142,160,191,0.25)';
  ctx.lineWidth = 1.5;
  for (let x = -D.groundOff; x < LW; x += 28) {
    ctx.beginPath(); ctx.moveTo(x, GROUND_Y + 7); ctx.lineTo(x + 14, GROUND_Y + 7); ctx.stroke();
  }

  // препятствия
  for (const o of D.obstacles) {
    if (o.kind === 'cactus') {
      ctx.fillStyle = '#58d68d';
      ctx.shadowColor = 'rgba(88,214,141,0.4)';
      ctx.shadowBlur = 8;
      const cw = (o.w - (o.n - 1) * 4) / o.n;
      for (let i = 0; i < o.n; i++) {
        const cx = o.x + i * (cw + 4);
        ctx.beginPath();
        ctx.roundRect(cx, o.y, cw, o.h, 4);
        ctx.fill();
        // боковые отростки
        ctx.fillRect(cx - 4, o.y + o.h * 0.35, 4, cw * 0.6);
        ctx.fillRect(cx + cw, o.y + o.h * 0.5, 4, cw * 0.5);
      }
      ctx.shadowBlur = 0;
    } else {
      const up = Math.sin(o.flap) > 0;
      ctx.fillStyle = '#ff9f43';
      ctx.shadowColor = 'rgba(255,159,67,0.4)';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.roundRect(o.x, o.y, o.w, o.h * 0.5, 6);
      ctx.fill();
      const wy = up ? o.y - 2 : o.y + o.h * 0.4;
      ctx.beginPath();
      ctx.moveTo(o.x + 8, wy + 6);
      ctx.lineTo(o.x + 20, wy - 6);
      ctx.lineTo(o.x + 30, wy + 6);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#0b101e';
      ctx.beginPath(); ctx.arc(o.x + o.w - 8, o.y + 6, 2, 0, 7); ctx.fill();
    }
  }

  // дино
  const dh = D.duck && D.y >= GROUND_Y - 0.5 ? DUCK_H : STAND_H;
  const dead = D.state === 'over';
  ctx.save();
  ctx.shadowColor = dead ? 'rgba(160,170,185,0.5)' : 'rgba(52,245,165,0.6)';
  ctx.shadowBlur = 12;
  ctx.fillStyle = dead ? '#9aa3b2' : '#34f5a5';
  const bodyY = D.y - dh;
  ctx.beginPath();
  ctx.roundRect(DINO_X, bodyY + 8, DINO_W - 6, dh - 8, 5);
  ctx.fill();
  // голова
  ctx.beginPath();
  ctx.roundRect(DINO_X + DINO_W - 16, bodyY, 18, 14, 4);
  ctx.fill();
  ctx.shadowBlur = 0;
  // глаз
  ctx.fillStyle = '#0b101e';
  ctx.beginPath(); ctx.arc(DINO_X + DINO_W - 6, bodyY + 5, 2.2, 0, 7); ctx.fill();
  // хвост
  ctx.fillStyle = dead ? '#9aa3b2' : '#34f5a5';
  ctx.beginPath();
  ctx.moveTo(DINO_X, bodyY + 12);
  ctx.lineTo(DINO_X - 12, bodyY + 4);
  ctx.lineTo(DINO_X - 2, bodyY + 22);
  ctx.closePath(); ctx.fill();
  // ноги
  const run = Math.sin(D.legT * 6) > 0;
  if (D.y >= GROUND_Y - 0.5 && D.state === 'playing') {
    ctx.fillRect(DINO_X + 3, D.y - 4, 6, 5);
    ctx.fillRect(DINO_X + 16, D.y - 4, 6, 5);
    ctx.fillStyle = 'rgba(11,16,30,0.9)';
    if (run) ctx.fillRect(DINO_X + 16, D.y - 6, 6, 3);
    else ctx.fillRect(DINO_X + 3, D.y - 6, 6, 3);
  } else {
    ctx.fillRect(DINO_X + 3, D.y - 5, 6, 6);
    ctx.fillRect(DINO_X + 16, D.y - 5, 6, 6);
  }
  ctx.restore();

  // счёт справа сверху
  ctx.font = '800 18px system-ui, sans-serif';
  ctx.textAlign = 'right'; ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(234,242,255,0.85)';
  ctx.fillText(String(Math.floor(D.score)).padStart(5, '0'), LW - 16, 12);
}

/* ================== HUD ================== */
function syncHud() {
  $('score').textContent = Math.floor(D.score);
  $('best').textContent = Math.max(D.best, Math.floor(D.score));
}

/* ================== УПРАВЛЕНИЕ ================== */
window.addEventListener('keydown', e => {
  if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
  SFX.ensure();
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
    if (D.state === 'over') { startGame(); return; }
    if (D.state === 'paused') { resumeGame(); return; }
    jump();
  } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
    D.duck = true;
  } else if (e.code === 'Enter' && D.state === 'over') startGame();
  if (e.code === 'KeyM') toggleSound();
});
window.addEventListener('keyup', e => {
  if (e.code === 'ArrowDown' || e.code === 'KeyS') D.duck = false;
});

canvas.addEventListener('pointerdown', e => {
  e.preventDefault();
  SFX.ensure();
  const rect = canvas.getBoundingClientRect();
  const relY = (e.clientY - rect.top) / rect.height;
  if (D.state === 'playing' && relY > 0.6) D.duck = true;
  else jump();
});
window.addEventListener('pointerup', () => { D.duck = false; });

document.addEventListener('visibilitychange', () => {
  if (document.hidden && D.state === 'playing') pauseGame();
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

/* ================== ЦИКЛ ================== */
let lastFrame = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  update(Math.min(100, now - lastFrame));
  lastFrame = now;
  render(now);
}

/* ================== СТАРТ ================== */
SFX.enabled = Store.get('zmeyka.sound', true);
$('soundBtn').textContent = SFX.enabled ? '🔊' : '🔇';
resize();
window.addEventListener('resize', resize);
$('menuBest').textContent = D.best;
syncHud();
requestAnimationFrame(loop);
