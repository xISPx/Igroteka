'use strict';

/* ================== КОНСТАНТЫ ================== */
const LW = 560, LH = 420;
const PW_W = 10, PW_H = 82, MARGIN = 14;
const BALL_R = 7;
const WIN_SCORE = 7;

/* ================== УТИЛИТЫ ================== */
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const Store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};

/* ================== СОСТОЯНИЕ ================== */
const P = {
  state: 'menu', // menu | serve | rally | paused | over
  py: LH / 2, ay: LH / 2,
  ball: { x: LW / 2, y: LH / 2, vx: 0, vy: 0, speed: 330 },
  s1: 0, s2: 0,
  wins: Store.get('pong.wins', 0), newRecord: false,
  serveTimer: 0, serveDir: 1, aiErr: 0,
  keys: { up: false, down: false },
  trail: [],
};
const menuOverlay = $('menuOverlay'), pauseOverlay = $('pauseOverlay'), overOverlay = $('overOverlay');
function show(el) { el.classList.remove('hidden'); }
function hide(el) { el.classList.add('hidden'); }

const canvas = $('game'), ctx = canvas.getContext('2d');
let scale = 1;
function resize() {
  const availH = window.innerHeight - 235;
  const availW = Math.min(window.innerWidth - 24, 600);
  let cssH = clamp(availH, 300, 520);
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
function startMatch() {
  P.s1 = 0; P.s2 = 0; P.newRecord = false;
  hide(menuOverlay); hide(pauseOverlay); hide(overOverlay);
  P.state = 'serve';
  P.serveTimer = 900;
  P.serveDir = Math.random() < 0.5 ? 1 : -1;
  syncHud();
}

function toMenu() {
  P.state = 'menu';
  show(menuOverlay); hide(pauseOverlay); hide(overOverlay);
  $('menuWins').textContent = P.wins;
  syncHud();
}

function pauseGame() {
  if (P.state !== 'serve' && P.state !== 'rally') return;
  P.state = 'paused';
  show(pauseOverlay);
}

function resumeGame() {
  if (P.state !== 'paused') return;
  hide(pauseOverlay);
  P.state = P.s1 + P.s2 === 0 || P.ball.vx === 0 ? 'serve' : 'rally';
  if (P.state === 'serve') P.serveTimer = 700;
}

function endMatch(playerWon) {
  P.state = 'over';
  if (playerWon) { SFX.win(); P.wins++; P.newRecord = true; Store.set('pong.wins', P.wins); }
  else SFX.die();
  syncHud();
  setTimeout(() => {
    if (P.state !== 'over') return;
    $('overTitle').textContent = playerWon ? '🏆 ПОБЕДА!' : 'ПОРАЖЕНИЕ';
    $('overTitle').style.background = playerWon
      ? 'linear-gradient(90deg,#34f5a5,#ffd166)'
      : 'linear-gradient(90deg,#ff8a94,#ff5d6c)';
    $('overTitle').style.webkitBackgroundClip = 'text';
    $('overTitle').style.backgroundClip = 'text';
    $('overTitle').style.color = 'transparent';
    $('causeText').textContent = P.s1 + ' : ' + P.s2;
    $('recordBadge').classList.toggle('show', playerWon && P.wins === 1);
    show(overOverlay);
  }, 600);
}

/* ================== ОБНОВЛЕНИЕ ================== */
function serveNow() {
  const b = P.ball;
  b.x = LW / 2; b.y = LH / 2;
  b.speed = 330;
  const a = (Math.random() * 50 - 25) * Math.PI / 180;
  b.vx = Math.cos(a) * b.speed * P.serveDir;
  b.vy = Math.sin(a) * b.speed;
  P.aiErr = (Math.random() * 2 - 1) * 26;
  P.state = 'rally';
}

function point(who) {
  SFX.scoreUp();
  if (who === 1) P.s1++; else P.s2++;
  P.serveDir = who === 1 ? -1 : 1;
  syncHud();
  if (P.s1 >= WIN_SCORE) return endMatch(true);
  if (P.s2 >= WIN_SCORE) return endMatch(false);
  P.state = 'serve';
  P.serveTimer = 800;
}

function update(dtMs) {
  const dt = Math.min(40, dtMs) / 1000;
  if (P.state === 'serve') {
    P.serveTimer -= dtMs;
    if (P.serveTimer <= 0) serveNow();
  }
  if (P.state !== 'serve' && P.state !== 'rally') return;

  // ракетка игрока
  const kv = (P.keys.down ? 1 : 0) - (P.keys.up ? 1 : 0);
  if (kv) P.py += kv * 430 * dt;
  P.py = clamp(P.py, PW_H / 2 + 6, LH - PW_H / 2 - 6);

  // ракетка ИИ: следит за мячом с ограничением скорости
  if (P.state === 'rally') {
    const target = P.ball.vx > 0 ? P.ball.y + P.aiErr : LH / 2;
    const dy = target - P.ay;
    const vmax = 255;
    P.ay += clamp(dy, -vmax * dt, vmax * dt);
  }
  P.ay = clamp(P.ay, PW_H / 2 + 6, LH - PW_H / 2 - 6);

  if (P.state !== 'rally') return;

  // мяч
  const b = P.ball;
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  if (b.y - BALL_R < 0) { b.y = BALL_R; b.vy = Math.abs(b.vy); SFX.bounce(true); }
  if (b.y + BALL_R > LH) { b.y = LH - BALL_R; b.vy = -Math.abs(b.vy); SFX.bounce(true); }

  const plX = MARGIN + PW_W, aiX = LW - MARGIN - PW_W;
  if (b.vx < 0 && b.x - BALL_R <= plX && b.x - BALL_R >= plX - 24 &&
      b.y > P.py - PW_H / 2 - BALL_R && b.y < P.py + PW_H / 2 + BALL_R) {
    const off = clamp((b.y - P.py) / (PW_H / 2), -1, 1);
    b.speed = Math.min(700, b.speed * 1.055);
    const ang = off * (55 * Math.PI / 180);
    b.vx = Math.cos(ang) * b.speed;
    b.vy = Math.sin(ang) * b.speed;
    b.x = plX + BALL_R;
    P.aiErr = (Math.random() * 2 - 1) * 26;
    SFX.bounce(false);
  }
  if (b.vx > 0 && b.x + BALL_R >= aiX && b.x + BALL_R <= aiX + 24 &&
      b.y > P.ay - PW_H / 2 - BALL_R && b.y < P.ay + PW_H / 2 + BALL_R) {
    const off = clamp((b.y - P.ay) / (PW_H / 2), -1, 1);
    b.speed = Math.min(700, b.speed * 1.03);
    const ang = off * (55 * Math.PI / 180);
    b.vx = -Math.cos(ang) * b.speed;
    b.vy = Math.sin(ang) * b.speed;
    b.x = aiX - BALL_R;
    SFX.bounce(false);
  }

  if (b.x < -20) point(2);
  else if (b.x > LW + 20) point(1);

  P.trail.push({ x: b.x, y: b.y });
  if (P.trail.length > 10) P.trail.shift();
}

/* ================== РЕНДЕР ================== */
function render(now) {
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, LW, LH);
  ctx.fillStyle = '#0b101e';
  ctx.fillRect(0, 0, LW, LH);

  // центральная линия
  ctx.strokeStyle = 'rgba(142,160,191,0.25)';
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 12]);
  ctx.beginPath(); ctx.moveTo(LW / 2, 8); ctx.lineTo(LW / 2, LH - 8); ctx.stroke();
  ctx.setLineDash([]);

  // счёт на поле
  ctx.font = '900 56px system-ui, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(52,245,165,0.18)';
  ctx.fillText(P.s1, LW * 0.28, 52);
  ctx.fillStyle = 'rgba(255,93,108,0.18)';
  ctx.fillText(P.s2, LW * 0.72, 52);

  // ракетки
  ctx.save();
  ctx.shadowColor = 'rgba(52,245,165,0.7)';
  ctx.shadowBlur = 12;
  ctx.fillStyle = '#34f5a5';
  ctx.beginPath();
  ctx.roundRect(MARGIN, P.py - PW_H / 2, PW_W, PW_H, 5);
  ctx.fill();
  ctx.shadowColor = 'rgba(255,93,108,0.7)';
  ctx.fillStyle = '#ff5d6c';
  ctx.beginPath();
  ctx.roundRect(LW - MARGIN - PW_W, P.ay - PW_H / 2, PW_W, PW_H, 5);
  ctx.fill();
  ctx.restore();

  // мяч с трейлом
  for (let i = 0; i < P.trail.length; i++) {
    const t = P.trail[i];
    ctx.globalAlpha = (i / P.trail.length) * 0.25;
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath(); ctx.arc(t.x, t.y, BALL_R * 0.7, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (P.state === 'rally' || P.state === 'paused') {
    ctx.save();
    ctx.shadowColor = 'rgba(255,233,168,0.9)';
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath(); ctx.arc(P.ball.x, P.ball.y, BALL_R, 0, 7); ctx.fill();
    ctx.restore();
  } else if (P.state === 'serve') {
    ctx.globalAlpha = 0.35 + 0.3 * Math.sin(now / 150);
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath(); ctx.arc(LW / 2, LH / 2, BALL_R, 0, 7); ctx.fill();
    ctx.globalAlpha = 1;
  }
}

/* ================== HUD ================== */
function syncHud() {
  $('p1').textContent = P.s1;
  $('p2').textContent = P.s2;
  $('wins').textContent = P.wins;
}

/* ================== УПРАВЛЕНИЕ ================== */
window.addEventListener('keydown', e => {
  if (['ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
  SFX.ensure();
  if (e.code === 'ArrowUp' || e.code === 'KeyW') P.keys.up = true;
  if (e.code === 'ArrowDown' || e.code === 'KeyS') P.keys.down = true;
  if (e.code === 'Space' || e.code === 'Enter') {
    if (P.state === 'menu') startMatch();
    else if (P.state === 'over') startMatch();
    else if (P.state === 'paused') resumeGame();
  }
  if (e.code === 'KeyP' || e.code === 'Escape') {
    if (P.state === 'serve' || P.state === 'rally') pauseGame();
    else if (P.state === 'paused') e.code === 'KeyP' ? resumeGame() : toMenu();
  }
  if (e.code === 'KeyM') toggleSound();
});
window.addEventListener('keyup', e => {
  if (e.code === 'ArrowUp' || e.code === 'KeyW') P.keys.up = false;
  if (e.code === 'ArrowDown' || e.code === 'KeyS') P.keys.down = false;
});

function pointerY(clientY) {
  const rect = canvas.getBoundingClientRect();
  return (clientY - rect.top) / rect.height * LH;
}
canvas.addEventListener('mousemove', e => {
  P.py = clamp(pointerY(e.clientY), PW_H / 2 + 6, LH - PW_H / 2 - 6);
});
canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  SFX.ensure();
  P.py = clamp(pointerY(e.touches[0].clientY), PW_H / 2 + 6, LH - PW_H / 2 - 6);
}, { passive: false });
canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  P.py = clamp(pointerY(e.touches[0].clientY), PW_H / 2 + 6, LH - PW_H / 2 - 6);
}, { passive: false });

document.addEventListener('visibilitychange', () => {
  if (document.hidden && (P.state === 'rally' || P.state === 'serve')) pauseGame();
});

/* ================== КНОПКИ ================== */
$('playBtn').addEventListener('click', () => { SFX.ensure(); SFX.click(); startMatch(); });
$('resumeBtn').addEventListener('click', () => { SFX.click(); resumeGame(); });
$('pauseMenuBtn').addEventListener('click', () => { SFX.click(); toMenu(); });
$('restartBtn').addEventListener('click', () => { SFX.click(); startMatch(); });
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
$('menuWins').textContent = P.wins;
syncHud();
requestAnimationFrame(loop);
