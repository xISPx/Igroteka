'use strict';

/* ================== КОНСТАНТЫ ================== */
const LW = 420, LH = 560;
const BX = 110, BR = 13;          // x и радиус птицы
const GROUND = LH - 64;
const GRAV = 1500, FLAP_V = -400;
const SPEED = 175, GAP = 152, PW = 66, PIPE_DIST = 195;

/* ================== УТИЛИТЫ ================== */
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const Store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};

/* ================== СОСТОЯНИЕ ================== */
const F = {
  state: 'menu', // menu | playing | paused | over
  y: LH * 0.42, vy: 0, wing: 0,
  pipes: [], score: 0, newRecord: false,
  best: Store.get('flappy.best', 0),
  shake: 0, groundOff: 0, dieAt: 0,
};
const stars = Array.from({ length: 26 }, () => ({
  x: Math.random() * LW, y: Math.random() * (GROUND - 40), r: 0.6 + Math.random() * 1.4,
  tw: Math.random() * Math.PI * 2,
}));

const canvas = $('game'), ctx = canvas.getContext('2d');
const menuOverlay = $('menuOverlay'), pauseOverlay = $('pauseOverlay'), overOverlay = $('overOverlay');
function show(el) { el.classList.remove('hidden'); }
function hide(el) { el.classList.add('hidden'); }

let scale = 1;
function resize() {
  const availH = window.innerHeight - 225;
  const availW = Math.min(window.innerWidth - 24, 460);
  let cssH = clamp(availH, 320, 600);
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
function resetWorld() {
  F.y = LH * 0.42; F.vy = 0;
  F.pipes = []; F.score = 0; F.newRecord = false;
  F.shake = 0;
  syncHud();
}

function startGame() {
  resetWorld();
  hide(menuOverlay); hide(pauseOverlay); hide(overOverlay);
  F.state = 'playing';
}

function pauseGame() {
  if (F.state !== 'playing') return;
  F.state = 'paused';
  show(pauseOverlay);
}

function resumeGame() {
  if (F.state !== 'paused') return;
  hide(pauseOverlay);
  F.state = 'playing';
}

function toMenu() {
  F.state = 'menu';
  resetWorld();
  show(menuOverlay); hide(pauseOverlay); hide(overOverlay);
  $('menuBest').textContent = F.best;
}

function die() {
  F.state = 'over';
  F.dieAt = performance.now();
  F.shake = 10;
  SFX.die();
  F.newRecord = F.score > F.best && F.score > 0;
  if (F.newRecord) { F.best = F.score; Store.set('flappy.best', F.best); }
  syncHud();
  setTimeout(() => {
    if (F.state !== 'over') return;
    $('finalScore').textContent = F.score;
    $('recordBadge').classList.toggle('show', F.newRecord);
    show(overOverlay);
  }, 550);
}

/* ================== ОБНОВЛЕНИЕ ================== */
function flap() {
  if (F.state === 'menu') { startGame(); return; }
  if (F.state !== 'playing') return;
  F.vy = FLAP_V;
  SFX.flap();
}

function spawnPipe() {
  const margin = 70;
  const gapY = margin + Math.random() * (GROUND - GAP - margin * 2);
  F.pipes.push({ x: LW + 20, gapY, passed: false });
}

function update(dtMs) {
  const dt = Math.min(40, dtMs) / 1000;
  F.groundOff = (F.groundOff + SPEED * dt) % 24;
  F.shake = Math.max(0, F.shake - dt * 26);
  if (F.state !== 'playing') return;

  F.vy += GRAV * dt;
  F.y += F.vy * dt;
  F.wing += dt;
  if (F.y - BR < 0) { F.y = BR; F.vy = 0; }
  if (F.y + BR >= GROUND) { F.y = GROUND - BR; return die(); }

  for (const p of F.pipes) p.x -= SPEED * dt;
  if (!F.pipes.length || F.pipes[F.pipes.length - 1].x < LW - PIPE_DIST) spawnPipe();
  F.pipes = F.pipes.filter(p => p.x > -PW - 10);

  for (const p of F.pipes) {
    if (!p.passed && p.x + PW < BX - BR) {
      p.passed = true;
      F.score++;
      SFX.scoreUp();
      syncHud();
    }
    // столкновение с трубой (кружок против двух прямоугольников)
    if (BX + BR > p.x && BX - BR < p.x + PW) {
      if (F.y - BR < p.gapY || F.y + BR > p.gapY + GAP) return die();
    }
  }
}

/* ================== РЕНДЕР ================== */
function render(now) {
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, LW, LH);
  if (F.shake > 0.3) ctx.translate((Math.random() * 2 - 1) * F.shake, (Math.random() * 2 - 1) * F.shake);
  ctx.fillStyle = '#0b101e';
  ctx.fillRect(-20, -20, LW + 40, LH + 40);

  // звёзды
  for (const s of stars) {
    ctx.globalAlpha = 0.35 + 0.3 * Math.sin(now / 900 + s.tw);
    ctx.fillStyle = '#8ea0bf';
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // трубы
  for (const p of F.pipes) {
    const g = ctx.createLinearGradient(p.x, 0, p.x + PW, 0);
    g.addColorStop(0, '#1fc98e'); g.addColorStop(0.5, '#5dffb4'); g.addColorStop(1, '#1fc98e');
    ctx.fillStyle = g;
    ctx.shadowColor = 'rgba(52,245,165,0.35)';
    ctx.shadowBlur = 14;
    ctx.fillRect(p.x, -10, PW, p.gapY + 10);
    ctx.fillRect(p.x, p.gapY + GAP, PW, GROUND - p.gapY - GAP + 10);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#2fe09c';
    const cap = 14;
    ctx.fillRect(p.x - 4, p.gapY - cap, PW + 8, cap);
    ctx.fillRect(p.x - 4, p.gapY + GAP, PW + 8, cap);
    ctx.strokeStyle = 'rgba(4,35,26,0.6)';
    ctx.lineWidth = 2;
    ctx.strokeRect(p.x, -10, PW, p.gapY + 10);
    ctx.strokeRect(p.x, p.gapY + GAP, PW, GROUND - p.gapY - GAP + 10);
  }

  // земля
  ctx.fillStyle = '#101828';
  ctx.fillRect(0, GROUND, LW, LH - GROUND);
  ctx.strokeStyle = '#34f5a5';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, GROUND + 1); ctx.lineTo(LW, GROUND + 1); ctx.stroke();
  ctx.strokeStyle = 'rgba(52,245,165,0.16)';
  for (let x = -F.groundOff; x < LW; x += 24) {
    ctx.beginPath();
    ctx.moveTo(x, GROUND + 6); ctx.lineTo(x + 12, LH);
    ctx.stroke();
  }

  // птица
  const dead = F.state === 'over';
  const tilt = clamp(F.vy / 600, -0.5, 1.1);
  ctx.save();
  ctx.translate(BX, F.y);
  ctx.rotate(tilt);
  ctx.shadowColor = dead ? 'rgba(160,170,185,0.5)' : 'rgba(255,209,102,0.75)';
  ctx.shadowBlur = 16;
  const bg = ctx.createRadialGradient(-4, -4, 2, 0, 0, BR + 3);
  if (dead) { bg.addColorStop(0, '#d6dbe4'); bg.addColorStop(1, '#77808f'); }
  else { bg.addColorStop(0, '#fff3c9'); bg.addColorStop(1, '#f4b23e'); }
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.arc(0, 0, BR, 0, 7); ctx.fill();
  ctx.shadowBlur = 0;
  // крыло
  const wa = dead ? 0.5 : Math.sin(F.wing * 22) * 0.7;
  ctx.save();
  ctx.translate(-3, 1);
  ctx.rotate(wa);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath(); ctx.ellipse(-2, 0, 7, 4, 0, 0, 7); ctx.fill();
  ctx.restore();
  // глаз и клюв
  ctx.fillStyle = '#0a1a12';
  ctx.beginPath(); ctx.arc(5, -4, 2.4, 0, 7); ctx.fill();
  if (!dead) {
    ctx.fillStyle = '#ff5d6c';
    ctx.beginPath();
    ctx.moveTo(BR - 3, 1); ctx.lineTo(BR + 6, 3); ctx.lineTo(BR - 3, 5);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();

  // счёт по центру поля
  if (F.state === 'playing' || F.state === 'paused') {
    ctx.font = '900 44px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(5,10,18,0.7)';
    ctx.strokeText(F.score, LW / 2, 26);
    ctx.fillStyle = '#eaf2ff';
    ctx.fillText(F.score, LW / 2, 26);
  }
}

/* ================== HUD ================== */
function syncHud() {
  $('score').textContent = F.score;
  $('best').textContent = Math.max(F.best, F.score);
}

/* ================== УПРАВЛЕНИЕ ================== */
window.addEventListener('keydown', e => {
  if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
  SFX.ensure();
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
    if (F.state === 'over') { startGame(); return; }
    if (F.state === 'paused') { resumeGame(); return; }
    flap();
    return;
  }
  if (e.code === 'Enter' && F.state === 'over') startGame();
  if (e.code === 'KeyM') toggleSound();
});

canvas.addEventListener('pointerdown', e => {
  e.preventDefault();
  SFX.ensure();
  flap();
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && F.state === 'playing') pauseGame();
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
  const dt = Math.min(100, now - lastFrame);
  lastFrame = now;
  update(dt);
  render(now);
}

/* ================== СТАРТ ================== */
SFX.enabled = Store.get('zmeyka.sound', true);
$('soundBtn').textContent = SFX.enabled ? '🔊' : '🔇';
resize();
window.addEventListener('resize', resize);
$('menuBest').textContent = F.best;
syncHud();
requestAnimationFrame(loop);
