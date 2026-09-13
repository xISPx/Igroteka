'use strict';

/* Лунный модуль: посади мягко и ровно на посадочную площадку.
   Топливо ограничено — планируй. */
Shell.init({
  rules: `← → — поворот модуля, ↑ — двигатель (жжёт топливо).
Цель — жёлтая площадка: скорость снижения ≤ 55, боковой снос ≤ 30, корпус вертикально.
Мягкая посадка даёт очки + бонус за плавность и остаток топлива. Сади сериями — счёт копится.
Мимо площадки, слишком быстро или на бок — крах.`,
  id: 'moon',
  icon: '🌕',
  title: 'ЛУНА',
  tagline: 'Посади модуль на площадку: медленно и вертикально. Топливо ограничено',
  stats: [['score', 'Очки'], ['landed', 'Посадки'], ['best', 'Рекорд']],
  bestKey: 'moon.best',
  hints: ['← → поворот · ↑ тяга', 'Скорость ≤ 55 по вертикали, ≤ 30 по горизонтали'],
  onPlay() { start(); },
  onMenu() { Shell.showMenu(); },
  onHidden() { if (running) Shell.pause(); },
  onResume() { last = performance.now(); },
});

const W = 520, H = 440;
const GRAV = 60, THRUST = 130, ROT = 2.6;
let cv, ctx, scale;
let lander, terrain, pad, fuel, score = 0, landed = 0, running = false, last = 0;
let keys = { l: false, r: false, up: false };

function buildBoard() {
  const c = Shell.canvas(W, H, { maxW: 560 });
  cv = c.cv; ctx = c.ctx; scale = c.scale;
  window.addEventListener('keydown', e => {
    SFX.ensure();
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.l = true;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.r = true;
    if (e.code === 'ArrowUp' || e.code === 'KeyW') { keys.up = true; e.preventDefault(); }
  });
  window.addEventListener('keyup', e => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.l = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.r = false;
    if (e.code === 'ArrowUp' || e.code === 'KeyW') keys.up = false;
  });
  cv.addEventListener('pointerdown', e => {
    SFX.ensure();
    const r = cv.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    keys.up = true;
    if (x < 0.3) keys.l = true;
    if (x > 0.7) keys.r = true;
    setTimeout(() => { keys.up = keys.l = keys.r = false; }, 240);
  });
  requestAnimationFrame(loop);
}

function makeTerrain() {
  const n = 10;
  const pts = [];
  for (let i = 0; i <= n; i++) pts.push({ x: i * W / n, y: H - 40 - Math.random() * 90 });
  // плоская площадка на случайном сегменте
  const pi = 2 + Shell.rnd(n - 4);
  pts[pi].y = H - 55 - Shell.rnd(35);
  pts[pi + 1].y = pts[pi].y;
  return { pts, pi };
}

function start() {
  lander = { x: 60, y: 50, vx: 20 + Math.random() * 25, vy: 0, a: 0 };
  terrain = makeTerrain();
  pad = terrain.pi;
  fuel = 100;
  running = true;
  last = performance.now();
  syncHud();
}

function update(dt) {
  const s = dt / 1000;
  if (keys.l) lander.a -= ROT * s;
  if (keys.r) lander.a += ROT * s;
  if (keys.up && fuel > 0) {
    lander.vx += Math.sin(lander.a) * THRUST * s;
    lander.vy -= Math.cos(lander.a) * THRUST * s;
    fuel -= 9 * s;
    if (Shell.rnd(3) === 0) SFX.tone(90 + Math.random() * 30, 0.06, { type: 'sawtooth', vol: 0.15 });
  }
  lander.vx -= lander.vx * 0.05 * s; // лёгкое сопротивление
  lander.vy += GRAV * s;
  lander.x += lander.vx * s;
  lander.y += lander.vy * s;
  syncHud();

  if (lander.x < 8) { lander.x = 8; lander.vx = Math.abs(lander.vx) * 0.5; }
  if (lander.x > W - 8) { lander.x = W - 8; lander.vx = -Math.abs(lander.vx) * 0.5; }

  // касание поверхности?
  const pts = terrain.pts;
  for (let i = 0; i < pts.length - 1; i++) {
    if (lander.x >= pts[i].x && lander.x <= pts[i + 1].x) {
      const gy = pts[i].y + (pts[i + 1].y - pts[i].y) * (lander.x - pts[i].x) / (pts[i + 1].x - pts[i].x);
      if (lander.y + 10 >= gy) {
        return touchdown(i);
      }
    }
  }
  if (lander.y > H + 30) return touchdown(-1);
}

function touchdown(seg) {
  running = false;
  const vSpeed = Math.abs(lander.vy);
  const hSpeed = Math.abs(lander.vx);
  const upright = Math.abs(lander.a % (Math.PI * 2)) < 0.35 || Math.abs(lander.a % (Math.PI * 2)) > Math.PI * 2 - 0.35;
  const onPad = seg === pad;
  const pts = terrain.pts;
  const inPadX = onPad && lander.x >= pts[pad].x && lander.x <= pts[pad + 1].x;
  if (onPad && inPadX && vSpeed <= 55 && hSpeed <= 30 && upright) {
    landed++;
    const bonus = Math.round((100 - vSpeed) + fuel);
    score += 100 + bonus;
    SFX.win();
    const record = Shell.tryRecord(score);
    Shell.showOver({
      won: true,
      cause: 'Мягкая посадка! Бонус ' + bonus,
      score: null,
      rows: [['Очки', score], ['Посадки', landed]],
      record,
    });
  } else {
    SFX.die();
    const why = !onPad || !inPadX ? 'Мимо площадки'
      : vSpeed > 55 ? 'Слишком быстро: ' + Math.round(vSpeed)
      : hSpeed > 30 ? 'Слишком боковой снос' : 'Модуль опрокинулся';
    Shell.showOver({ cause: why + '. Очки: ' + score, score: null, rows: [['Посадки', landed]] });
    score = 0; landed = 0;
  }
  syncHud();
}

function syncHud() {
  Shell.setStat('score', score);
  Shell.setStat('landed', landed);
  Shell.setStat('best', Shell.bestText());
}

function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(50, now - last);
  last = now;
  if (running && !Shell.paused) update(dt);
  render(now);
}

function render(now) {
  if (!cv) return;
  ctx.setTransform(scale(), 0, 0, scale(), 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0b101e';
  ctx.fillRect(0, 0, W, H);
  // звёзды
  ctx.fillStyle = 'rgba(201,212,238,.5)';
  for (let i = 0; i < 30; i++) {
    const sx = (i * 97) % W, sy = (i * 61) % (H - 120);
    ctx.fillRect(sx, sy, 1.6, 1.6);
  }
  // поверхность
  const pts = terrain.pts;
  ctx.fillStyle = '#182342';
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (const p of pts) ctx.lineTo(p.x, p.y);
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();
  // площадка
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 4;
  ctx.shadowColor = 'rgba(255,209,102,.6)';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.moveTo(pts[pad].x, pts[pad].y);
  ctx.lineTo(pts[pad + 1].x, pts[pad + 1].y);
  ctx.stroke();
  ctx.shadowBlur = 0;
  // модуль
  ctx.save();
  ctx.translate(lander.x, lander.y);
  ctx.rotate(lander.a);
  ctx.shadowColor = 'rgba(77,215,255,.7)';
  ctx.shadowBlur = 10;
  ctx.fillStyle = '#4dd7ff';
  ctx.beginPath();
  ctx.moveTo(0, -12); ctx.lineTo(9, 4); ctx.lineTo(-9, 4);
  ctx.closePath(); ctx.fill();
  ctx.restore();
  // пламя
  if (keys.up && fuel > 0 && running) {
    ctx.save();
    ctx.translate(lander.x, lander.y);
    ctx.rotate(lander.a);
    ctx.fillStyle = 'rgba(255,233,168,.8)';
    ctx.beginPath();
    ctx.moveTo(-4, 5); ctx.lineTo(0, 14 + Math.random() * 8); ctx.lineTo(4, 5);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  // топливо
  ctx.fillStyle = 'rgba(255,255,255,.08)';
  ctx.fillRect(10, 10, 110, 8);
  ctx.fillStyle = fuel > 25 ? '#34f5a5' : '#ff5d6c';
  ctx.fillRect(10, 10, 110 * Shell.clamp(fuel, 0, 100) / 100, 8);
}
