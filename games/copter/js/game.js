'use strict';

/* Вертолёт: держи тягу (пробел/клик), лети через сужающуюся пещеру. */
Shell.init({
  rules: `Держи Пробел, клик или палец — вертолёт набирает высоту; отпусти — плавно снижается.
Пролетай через пещеру: проход постепенно сужается.
Касание стены — конец. Счёт — пройденная дистанция: главное — ровный ритм нажатий.`,
  id: 'copter',
  icon: '🚁',
  title: 'ВЕРТОЛЁТ',
  tagline: 'Держи тягу, чтобы подниматься, и отпускай, чтобы снижаться. Не касайся стен',
  stats: [['score', 'Дистанция'], ['best', 'Рекорд']],
  bestKey: 'copter.best',
  hints: ['Пробел / клик / тап — держать тягу'],
  onPlay() { start(); },
  onMenu() { Shell.showMenu(); },
  onHidden() { if (running) Shell.pause(); },
  onResume() { last = performance.now(); },
});

const W = 560, H = 380;
let cv, ctx, scale;
let y, vy, terrain, offset, dist, running = false, last = 0, thrust = false, dead = false;
const SPEED = 190, GRAV = 1250, LIFT = -2050;
const STEP = 8; // шаг генерации пещеры в px

function buildBoard() {
  const c = Shell.canvas(W, H, { maxW: 600 });
  cv = c.cv; ctx = c.ctx; scale = c.scale;
  const down = () => { SFX.ensure(); thrust = true; };
  const up = () => { thrust = false; };
  window.addEventListener('keydown', e => {
    if (e.code === 'Space') { e.preventDefault(); down(); }
  });
  window.addEventListener('keyup', e => { if (e.code === 'Space') up(); });
  cv.addEventListener('pointerdown', down);
  window.addEventListener('pointerup', up);
  requestAnimationFrame(loop);
}

function genCol() {
  // высоты потолка и пола, между ними проход
  const t = terrain;
  const lastTop = t.top[t.top.length - 1], lastBot = t.bot[t.bot.length - 1];
  const gap = Math.max(105, 190 - dist / 60);
  let top = lastTop + (Math.random() * 2 - 1) * 26;
  let bot = lastBot + (Math.random() * 2 - 1) * 26;
  // держим проход в границах
  if (bot - top < gap) { const mid = (top + bot) / 2; top = mid - gap / 2; bot = mid + gap / 2; }
  top = Shell.clamp(top, 14, H - gap - 14);
  bot = Shell.clamp(bot, top + gap, H - 14);
  t.top.push(top);
  t.bot.push(bot);
}

function start() {
  terrain = { top: [], bot: [] };
  for (let i = 0; i < W / STEP + 2; i++) {
    const gap = 190;
    terrain.top.push(H / 2 - gap / 2 + Math.sin(i / 5) * 20);
    terrain.bot.push(H / 2 + gap / 2 + Math.sin(i / 5) * 20);
  }
  y = H / 2; vy = 0; offset = 0; dist = 0; dead = false;
  running = true;
  last = performance.now();
  syncHud();
}

function update(dt) {
  const s = dt / 1000;
  vy += (thrust ? LIFT : GRAV) * s;
  vy = Shell.clamp(vy, -420, 420);
  y += vy * s;
  offset += SPEED * s;
  dist += SPEED * s;
  syncHud();

  // подгружаем пещеру
  while (terrain.top.length < offset / STEP + W / STEP + 2) genCol();

  // столкновение
  const idx = Math.floor(offset / STEP);
  const frac = (offset % STEP) / STEP;
  const top = terrain.top[idx] + (terrain.top[idx + 1] - terrain.top[idx]) * frac;
  const bot = terrain.bot[idx] + (terrain.bot[idx + 1] - terrain.bot[idx]) * frac;
  if (y - 11 < top || y + 11 > bot) {
    running = false;
    dead = true;
    SFX.die();
    const d = Math.floor(dist / 10);
    const record = Shell.tryRecord(d);
    Shell.showOver({ cause: 'Столкновение со стеной', score: d, rows: [['Дистанция', d]], record });
  }
}

function syncHud() {
  Shell.setStat('score', Math.floor(dist / 10));
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
  if (!cv || !terrain) return;
  ctx.setTransform(scale(), 0, 0, scale(), 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0b101e';
  ctx.fillRect(0, 0, W, H);
  const startIdx = Math.floor(offset / STEP);
  // пещера
  ctx.fillStyle = '#1a2540';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  for (let i = 0; i <= W / STEP + 1; i++) {
    ctx.lineTo(i * STEP - (offset % STEP), terrain.top[startIdx + i] || 0);
  }
  ctx.lineTo(W, 0);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let i = 0; i <= W / STEP + 1; i++) {
    ctx.lineTo(i * STEP - (offset % STEP), terrain.bot[startIdx + i] || H);
  }
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(52,245,165,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i <= W / STEP + 1; i++) {
    const x = i * STEP - (offset % STEP);
    const yv = terrain.top[startIdx + i] || 0;
    if (i === 0) ctx.moveTo(x, yv); else ctx.lineTo(x, yv);
  }
  ctx.stroke();
  ctx.beginPath();
  for (let i = 0; i <= W / STEP + 1; i++) {
    const x = i * STEP - (offset % STEP);
    const yv = terrain.bot[startIdx + i] || H;
    if (i === 0) ctx.moveTo(x, yv); else ctx.lineTo(x, yv);
  }
  ctx.stroke();
  // вертолёт
  ctx.save();
  ctx.translate(90, y);
  ctx.shadowColor = thrust ? 'rgba(255,233,168,.8)' : 'rgba(52,245,165,.6)';
  ctx.shadowBlur = 12;
  ctx.fillStyle = '#4dd7ff';
  ctx.beginPath();
  ctx.roundRect(-14, -8, 28, 16, 8);
  ctx.fill();
  ctx.fillRect(8, -2, 16, 4);
  ctx.restore();
  // винт
  const rot = Math.sin(now / 22) * 16;
  ctx.strokeStyle = 'rgba(234,242,255,0.85)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(90 - rot, y - 11);
  ctx.lineTo(90 + rot, y - 11);
  ctx.stroke();
  // факел тяги
  if (thrust && running) {
    ctx.fillStyle = 'rgba(255,233,168,0.7)';
    ctx.beginPath();
    ctx.moveTo(84, y + 8); ctx.lineTo(90, y + 8 + 10 + Math.random() * 8); ctx.lineTo(96, y + 8);
    ctx.closePath(); ctx.fill();
  }
}

buildBoard();
