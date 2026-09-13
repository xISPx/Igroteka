'use strict';

/* ================== КОНСТАНТЫ ================== */
const LW = 560, LH = 560;
const TURN = 4.2, THRUST = 340, DAMP = 0.4, MAX_V = 400;
const BULLET_SPEED = 520, BULLET_LIFE = 0.9, COOLDOWN = 0.2;
const SIZES = { 3: { r: 44, score: 20 }, 2: { r: 25, score: 50 }, 1: { r: 13, score: 100 } };

/* ================== УТИЛИТЫ ================== */
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const Store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};
const wrap = (v, max) => (v % max + max) % max;
const dist2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };

/* ================== СОСТОЯНИЕ ================== */
const A = {
  state: 'menu', // menu | playing | paused | over
  ship: null, bullets: [], rocks: [], parts: [], floats: [],
  keys: { left: false, right: false, up: false },
  cooldown: 0, lives: 3, wave: 1, score: 0,
  best: Store.get('asteroids.best', 0), newRecord: false,
  shake: 0,
};

const canvas = $('game'), ctx = canvas.getContext('2d');
const menuOverlay = $('menuOverlay'), pauseOverlay = $('pauseOverlay'), overOverlay = $('overOverlay');
function show(el) { el.classList.remove('hidden'); }
function hide(el) { el.classList.add('hidden'); }

const stars = Array.from({ length: 40 }, () => ({
  x: Math.random() * LW, y: Math.random() * LH,
  r: 0.5 + Math.random() * 1.4, tw: Math.random() * Math.PI * 2,
}));

let scale = 1;
function resize() {
  const availH = window.innerHeight - 245;
  const availW = Math.min(window.innerWidth - 24, 600);
  let cssH = clamp(availH, 320, 580);
  let cssW = cssH;
  if (cssW > availW) { cssW = availW; cssH = cssW; }
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  scale = canvas.width / LW;
}

/* ================== ОБЪЕКТЫ ================== */
function makeShip() {
  return { x: LW / 2, y: LH / 2, vx: 0, vy: 0, a: -Math.PI / 2, inv: 2.5 };
}

function makeRock(x, y, size, speedMul = 1) {
  const s = SIZES[size];
  const verts = [];
  const n = 9 + ((Math.random() * 3) | 0);
  for (let i = 0; i < n; i++) verts.push(0.72 + Math.random() * 0.5);
  const a = Math.random() * Math.PI * 2;
  const sp = (55 + Math.random() * 90) * speedMul * (4 - size) * 0.5;
  return {
    x, y, size, r: s.r, verts,
    vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
    rot: Math.random() * 6, rotV: (Math.random() - 0.5) * 1.6,
  };
}

function spawnWave() {
  const n = 2 + A.wave;
  for (let i = 0; i < n; i++) {
    // не спавним рядом с кораблём
    let x, y;
    do {
      x = Math.random() * LW;
      y = Math.random() * LH;
    } while (dist2(x, y, LW / 2, LH / 2) < 190 * 190);
    A.rocks.push(makeRock(x, y, 3, 1 + (A.wave - 1) * 0.08));
  }
}

function burst(x, y, color, n, power = 150) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = power * (0.3 + Math.random());
    A.parts.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      r: 1 + Math.random() * 2.5, color, born: performance.now(), life: 350 + Math.random() * 450,
    });
  }
}

function addFloat(text, color) {
  A.floats.push({ text, color, x: LW / 2, y: LH * 0.3, born: performance.now(), life: 1100 });
}

/* ================== ПОТОК ИГРЫ ================== */
function startGame() {
  A.ship = makeShip();
  A.bullets = []; A.rocks = []; A.parts = []; A.floats = [];
  A.cooldown = 0; A.lives = 3; A.wave = 1; A.score = 0; A.newRecord = false;
  A.shake = 0;
  spawnWave();
  hide(menuOverlay); hide(pauseOverlay); hide(overOverlay);
  A.state = 'playing';
  syncHud();
}

function toMenu() {
  A.state = 'menu';
  show(menuOverlay); hide(pauseOverlay); hide(overOverlay);
  $('menuBest').textContent = A.best;
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

function gameOver() {
  A.state = 'over';
  SFX.die();
  A.shake = 12;
  A.newRecord = A.score > A.best && A.score > 0;
  if (A.newRecord) { A.best = A.score; Store.set('asteroids.best', A.best); }
  syncHud();
  setTimeout(() => {
    if (A.state !== 'over') return;
    $('finalScore').textContent = A.score;
    $('statLevel').textContent = A.wave;
    $('recordBadge').classList.toggle('show', A.newRecord);
    show(overOverlay);
  }, 700);
}

function shipHit() {
  const s = A.ship;
  burst(s.x, s.y, '#4dd7ff', 26, 220);
  SFX.explode();
  A.lives--;
  A.shake = 10;
  syncHud();
  if (A.lives <= 0) return gameOver();
  A.ship = makeShip();
}

function splitRock(rock, i) {
  A.rocks.splice(i, 1);
  A.score += SIZES[rock.size].score;
  burst(rock.x, rock.y, '#8ea0bf', rock.size * 7, 120);
  SFX.explode();
  if (rock.size > 1) {
    A.rocks.push(makeRock(rock.x, rock.y, rock.size - 1, 1.15));
    A.rocks.push(makeRock(rock.x, rock.y, rock.size - 1, 1.15));
  }
  syncHud();
}

/* ================== ОБНОВЛЕНИЕ ================== */
function fire() {
  if (A.cooldown > 0 || A.bullets.length >= 6) return;
  const s = A.ship;
  A.bullets.push({
    x: s.x + Math.cos(s.a) * 14, y: s.y + Math.sin(s.a) * 14,
    vx: Math.cos(s.a) * BULLET_SPEED + s.vx * 0.5,
    vy: Math.sin(s.a) * BULLET_SPEED + s.vy * 0.5,
    born: performance.now(),
  });
  A.cooldown = COOLDOWN;
  SFX.shoot();
}

function update(dtMs) {
  const dt = Math.min(40, dtMs) / 1000;
  const now = performance.now();
  A.shake = Math.max(0, A.shake - dt * 30);
  A.parts = A.parts.filter(p => now - p.born < p.life);
  for (const p of A.parts) { p.x += p.vx * dt; p.y += p.vy * dt; }
  A.floats = A.floats.filter(f => now - f.born < f.life);
  if (A.state !== 'playing') return;

  const s = A.ship;
  A.cooldown = Math.max(0, A.cooldown - dt);
  if (A.keys.left) s.a -= TURN * dt;
  if (A.keys.right) s.a += TURN * dt;
  if (A.keys.up) {
    s.vx += Math.cos(s.a) * THRUST * dt;
    s.vy += Math.sin(s.a) * THRUST * dt;
  }
  s.vx -= s.vx * DAMP * dt;
  s.vy -= s.vy * DAMP * dt;
  const sp = Math.hypot(s.vx, s.vy);
  if (sp > MAX_V) { s.vx *= MAX_V / sp; s.vy *= MAX_V / sp; }
  s.x = wrap(s.x + s.vx * dt, LW);
  s.y = wrap(s.y + s.vy * dt, LH);
  s.inv = Math.max(0, s.inv - dt);

  // пули
  A.bullets = A.bullets.filter(b => now - b.born < BULLET_LIFE * 1000);
  for (const b of A.bullets) {
    b.x = wrap(b.x + b.vx * dt, LW);
    b.y = wrap(b.y + b.vy * dt, LH);
  }

  // камни
  for (const r of A.rocks) {
    r.x = wrap(r.x + r.vx * dt, LW);
    r.y = wrap(r.y + r.vy * dt, LH);
    r.rot += r.rotV * dt;
  }

  // пули × камни
  for (let i = A.rocks.length - 1; i >= 0; i--) {
    const r = A.rocks[i];
    for (let j = A.bullets.length - 1; j >= 0; j--) {
      const b = A.bullets[j];
      // кратчайшее расстояние с учётом заворота
      let dx = Math.abs(b.x - r.x); dx = Math.min(dx, LW - dx);
      let dy = Math.abs(b.y - r.y); dy = Math.min(dy, LH - dy);
      if (dx * dx + dy * dy <= r.r * r.r) {
        A.bullets.splice(j, 1);
        splitRock(r, i);
        break;
      }
    }
  }

  // корабль × камни
  if (s.inv <= 0) {
    for (let i = 0; i < A.rocks.length; i++) {
      const r = A.rocks[i];
      let dx = Math.abs(s.x - r.x); dx = Math.min(dx, LW - dx);
      let dy = Math.abs(s.y - r.y); dy = Math.min(dy, LH - dy);
      if (dx * dx + dy * dy <= (r.r + 9) * (r.r + 9)) { shipHit(); break; }
    }
  }

  if (!A.rocks.length) {
    A.wave++;
    addFloat('ВОЛНА ' + A.wave, '#34f5a5');
    SFX.level();
    spawnWave();
    syncHud();
  }
}

/* ================== РЕНДЕР ================== */
function render(now) {
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, LW, LH);
  if (A.shake > 0.3) ctx.translate((Math.random() * 2 - 1) * A.shake, (Math.random() * 2 - 1) * A.shake);
  ctx.fillStyle = '#0b101e';
  ctx.fillRect(-20, -20, LW + 40, LH + 40);
  for (const st of stars) {
    ctx.globalAlpha = 0.3 + 0.3 * Math.sin(now / 800 + st.tw);
    ctx.fillStyle = '#c9d4ee';
    ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // камни
  for (const r of A.rocks) {
    ctx.save();
    ctx.translate(r.x, r.y);
    ctx.rotate(r.rot);
    ctx.strokeStyle = '#9fb2d8';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(159,178,216,0.4)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    for (let i = 0; i < r.verts.length; i++) {
      const a = i / r.verts.length * Math.PI * 2;
      const rr = r.r * r.verts[i];
      const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = 'rgba(30,40,62,0.7)';
    ctx.fill();
    ctx.restore();
  }

  // пули
  ctx.fillStyle = '#ffe9a8';
  ctx.shadowColor = 'rgba(255,233,168,0.9)';
  ctx.shadowBlur = 8;
  for (const b of A.bullets) {
    ctx.beginPath(); ctx.arc(b.x, b.y, 2.6, 0, 7); ctx.fill();
  }
  ctx.shadowBlur = 0;

  // корабль
  if (A.ship && A.state !== 'over') {
    const s = A.ship;
    const blink = s.inv > 0 && Math.floor(now / 110) % 2 === 0;
    if (!blink) {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.a);
      ctx.shadowColor = 'rgba(77,215,255,0.8)';
      ctx.shadowBlur = 12;
      ctx.strokeStyle = '#4dd7ff';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(15, 0); ctx.lineTo(-11, 9); ctx.lineTo(-6, 0); ctx.lineTo(-11, -9);
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = 'rgba(77,215,255,0.16)';
      ctx.fill();
      if (A.keys.up) {
        ctx.strokeStyle = '#ff9f43';
        ctx.beginPath();
        ctx.moveTo(-8, 4); ctx.lineTo(-17 - Math.random() * 7, 0); ctx.lineTo(-8, -4);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  // частицы
  for (const p of A.parts) {
    const a = 1 - (now - p.born) / p.life;
    ctx.globalAlpha = Math.max(0, a);
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r * a + 0.4, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // всплывающий текст
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const f of A.floats) {
    const p = (now - f.born) / f.life;
    ctx.globalAlpha = 1 - p;
    ctx.font = '800 26px system-ui, sans-serif';
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(5,10,18,0.8)';
    ctx.strokeText(f.text, f.x, f.y - p * 30);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y - p * 30);
  }
  ctx.globalAlpha = 1;
}

/* ================== HUD ================== */
function syncHud() {
  $('score').textContent = A.score;
  $('best').textContent = Math.max(A.best, A.score);
  $('level').textContent = A.wave;
  $('lives').textContent = '●'.repeat(Math.max(0, A.lives)) || '—';
}

/* ================== УПРАВЛЕНИЕ ================== */
window.addEventListener('keydown', e => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  SFX.ensure();
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') A.keys.left = true;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') A.keys.right = true;
  if (e.code === 'ArrowUp' || e.code === 'KeyW') A.keys.up = true;
  if (e.code === 'Space') {
    if (A.state === 'playing') fire();
    else if (A.state === 'menu' || A.state === 'over') startGame();
    else if (A.state === 'paused') resumeGame();
  }
  if (e.code === 'Enter' && (A.state === 'menu' || A.state === 'over')) startGame();
  if (e.code === 'KeyP' || e.code === 'Escape') {
    if (A.state === 'playing') pauseGame();
    else if (A.state === 'paused') e.code === 'KeyP' ? resumeGame() : toMenu();
  }
  if (e.code === 'KeyM') toggleSound();
});
window.addEventListener('keyup', e => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') A.keys.left = false;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') A.keys.right = false;
  if (e.code === 'ArrowUp' || e.code === 'KeyW') A.keys.up = false;
});

canvas.addEventListener('pointerdown', () => {
  SFX.ensure();
  if (A.state === 'playing') fire();
});

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
$('menuBest').textContent = A.best;
requestAnimationFrame(loop);
