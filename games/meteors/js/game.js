'use strict';

/* Метеоритный дождь: уворачивайся от падающих камней. Три жизни. */
Shell.init({
  rules: `Мышь, палец или ← → — корабль внизу экрана.
Уворачивайся от метеоритов: очки капают за время полёта, +5 за каждый улетевший мимо камень.
Три жизни, после попадания — короткое мигание-неуязвимость. Чем дольше живёшь, тем гуще дождь и крупнее камни.`,
  id: 'meteors',
  icon: '☄️',
  title: 'МЕТЕОРЫ',
  tagline: 'Дождь из метеоритов: уворачивайся как можно дольше. Три жизни',
  stats: [['score', 'Счёт'], ['lives', 'Жизни'], ['best', 'Рекорд']],
  bestKey: 'meteors.best',
  hints: ['← → / мышь / палец — движение'],
  onPlay() { start(); },
  onMenu() { Shell.showMenu(); },
  onHidden() { if (running) Shell.pause(); },
  onResume() { last = performance.now(); },
});

const W = 420, H = 560;
let cv, ctx, scale;
let px, meteors, parts, score, lives, inv, spawnIn, running = false, last = 0;
let targetX = null;

function buildBoard() {
  const c = Shell.canvas(W, H, { maxW: 460 });
  cv = c.cv; ctx = c.ctx; scale = c.scale;
  window.addEventListener('keydown', e => {
    SFX.ensure();
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') targetX = null, keys.l = true;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') targetX = null, keys.r = true;
  });
  window.addEventListener('keyup', e => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.l = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.r = false;
  });
  const move = e => {
    const r = cv.getBoundingClientRect();
    targetX = (e.clientX - r.left) / r.width * W;
  };
  cv.addEventListener('mousemove', move);
  cv.addEventListener('touchmove', e => { e.preventDefault(); move(e); }, { passive: false });
  cv.addEventListener('touchstart', e => { move(e); }, { passive: true });
  requestAnimationFrame(loop);
}

const keys = { l: false, r: false };

function start() {
  px = W / 2;
  meteors = []; parts = [];
  score = 0; lives = 3; inv = 1.5; spawnIn = 300;
  running = true;
  last = performance.now();
  syncHud();
}

function burst(x, y, color) {
  for (let i = 0; i < 12; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 50 + Math.random() * 150;
    parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, born: performance.now(), life: 450, color });
  }
}

function update(dt) {
  const s = dt / 1000;
  score += s * 12;
  if (inv > 0) inv -= s;
  syncHud();

  if (keys.l) px -= 340 * s;
  else if (keys.r) px += 340 * s;
  else if (targetX !== null) px += Shell.clamp(targetX - px, -420 * s, 420 * s);
  px = Shell.clamp(px, 18, W - 18);

  spawnIn -= dt;
  if (spawnIn <= 0) {
    meteors.push({
      x: 20 + Math.random() * (W - 40), y: -20,
      r: 10 + Math.random() * 18,
      vy: 170 + Math.random() * 130 + score * 0.25,
      vx: (Math.random() * 2 - 1) * 60,
      rot: Math.random() * 6, rotV: (Math.random() - 0.5) * 3,
    });
    spawnIn = Math.max(160, 520 - score * 1.6) + Math.random() * 300;
  }

  const py = H - 52;
  for (const m of meteors) {
    m.y += m.vy * s;
    m.x += m.vx * s;
    m.rot += m.rotV * s;
    if (inv <= 0 && Math.hypot(m.x - px, m.y - py) < m.r + 13) {
      m.dead = true;
      lives--;
      inv = 1.6;
      burst(px, py, '#ff5d6c');
      SFX.explode();
      syncHud();
      if (lives <= 0) {
        running = false;
        const sc = Math.floor(score);
        const record = Shell.tryRecord(sc);
        Shell.showOver({ cause: 'Корабль разбит метеоритом', score: sc, record });
        return;
      }
    }
    if (m.y > H + 30) {
      m.dead = true;
      score += 5;
    }
  }
  meteors = meteors.filter(m => !m.dead);
  parts = parts.filter(p => now() - p.born < p.life);
}

function now() { return performance.now(); }

function syncHud() {
  Shell.setStat('score', Math.floor(score));
  Shell.setStat('lives', '●'.repeat(Math.max(0, lives)) || '—');
  Shell.setStat('best', Shell.bestText());
}

function loop(t) {
  requestAnimationFrame(loop);
  const dt = Math.min(50, t - last);
  last = t;
  if (running && !Shell.paused) update(dt);
  render(t);
}

function render(t) {
  if (!cv) return;
  ctx.setTransform(scale(), 0, 0, scale(), 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0b101e';
  ctx.fillRect(0, 0, W, H);
  // метеоры
  for (const m of meteors) {
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.rotate(m.rot);
    ctx.strokeStyle = '#9fb2d8';
    ctx.fillStyle = 'rgba(35,46,72,.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let k = 0; k < 8; k++) {
      const a = k / 8 * Math.PI * 2;
      const rr = m.r * (0.75 + 0.25 * Math.sin(k * 3 + m.rot));
      const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
      if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    // хвост
    ctx.strokeStyle = 'rgba(255,159,67,0.4)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(m.x, m.y - m.r);
    ctx.lineTo(m.x - m.vx * 0.12, m.y - m.r - 24);
    ctx.stroke();
  }
  // корабль
  const py = H - 52;
  const blink = inv > 0 && Math.floor(t / 110) % 2 === 0;
  if (!blink) {
    ctx.save();
    ctx.translate(px, py);
    ctx.shadowColor = 'rgba(77,215,255,.8)';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#4dd7ff';
    ctx.beginPath();
    ctx.moveTo(0, -16); ctx.lineTo(13, 10); ctx.lineTo(0, 4); ctx.lineTo(-13, 10);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  // частицы
  for (const p of parts) {
    const a = 1 - (t - p.born) / p.life;
    ctx.globalAlpha = Math.max(0, a);
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

buildBoard();
