'use strict';

/* Аим-тренер: 20 мишеней появляются по одной. Сбей все как можно быстрее. */
Shell.init({
  rules: `Мишени появляются по одной — кликай по ним, всего 20 штук.
Промах добавляет штраф +0,2 секунды к итогу.
Рекорд — минимальное общее время. Курсор — прицел: не суетись, но и не медли.`,
  id: 'aim',
  icon: '🎯',
  title: 'АИМ',
  tagline: '20 мишеней по одной. Сбей все за минимальное время',
  stats: [['left', 'Осталось'], ['best', 'Рекорд']],
  bestKey: 'aim.best',
  bestLower: true,
  bestZero: '—',
  bestFmt: v => (v / 1000).toFixed(1) + ' с',
  hints: ['Клик по мишени — попадание', 'Промахи добавляют штраф 0,2 с'],
  onPlay() { start(); },
  onMenu() { Shell.showMenu(); },
});

const W = 520, H = 420, TOTAL = 20;
let cv = null, ctx = null, scale = null;
let target = null, left = TOTAL, tStart = 0, misses = 0, running = false;
let ripples = [];

function buildBoard() {
  const c = Shell.canvas(W, H, { maxW: 560 });
  cv = c.cv; ctx = c.ctx; scale = c.scale;
  cv.addEventListener('pointerdown', e => {
    SFX.ensure();
    if (!running || !target) return;
    const r = cv.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width * W;
    const y = (e.clientY - r.top) / r.height * H;
    const dx = x - target.x, dy = y - target.y;
    if (dx * dx + dy * dy <= target.r * target.r) {
      ripples.push({ x: target.x, y: target.y, born: performance.now() });
      SFX.good();
      spawn();
    } else {
      misses++;
      SFX.bad();
    }
  });
  requestAnimationFrame(loop);
}

function spawn() {
  left--;
  Shell.setStat('left', left);
  if (left <= 0) {
    running = false;
    const ms = performance.now() - tStart + misses * 200;
    const record = Shell.tryRecord(ms);
    SFX.win();
    Shell.showOver({
      won: true,
      cause: 'Все мишени сбиты' + (misses ? ' (+' + (misses * 0.2).toFixed(1) + ' с штрафа)' : ''),
      score: (ms / 1000).toFixed(1) + ' с',
      rows: [['Промахи', misses]],
      record,
    });
    target = null;
    return;
  }
  target = {
    x: 50 + Math.random() * (W - 100),
    y: 50 + Math.random() * (H - 100),
    r: 22 + Math.random() * 12,
    born: performance.now(),
  };
}

function loop(now) {
  requestAnimationFrame(loop);
  if (!cv) return;
  ctx.setTransform(scale(), 0, 0, scale(), 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0b101e';
  ctx.fillRect(0, 0, W, H);
  if (target) {
    const grow = Math.max(0, Math.min(1, (now - target.born) / 140));
    const r = target.r * grow;
    ctx.save();
    ctx.shadowColor = 'rgba(255,93,108,.7)';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#ff5d6c';
    ctx.beginPath(); ctx.arc(target.x, target.y, r, 0, 7); ctx.fill();
    ctx.fillStyle = '#eaf2ff';
    ctx.beginPath(); ctx.arc(target.x, target.y, r * 0.62, 0, 7); ctx.fill();
    ctx.fillStyle = '#ff5d6c';
    ctx.beginPath(); ctx.arc(target.x, target.y, r * 0.3, 0, 7); ctx.fill();
    ctx.restore();
  }
  ripples = ripples.filter(p => now - p.born < 350);
  for (const p of ripples) {
    const k = (now - p.born) / 350;
    ctx.globalAlpha = 1 - k;
    ctx.strokeStyle = '#34f5a5';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(p.x, p.y, 20 + k * 40, 0, 7); ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function start() {
  left = TOTAL + 1; misses = 0; ripples = [];
  tStart = performance.now();
  running = true;
  spawn();
}

buildBoard();
