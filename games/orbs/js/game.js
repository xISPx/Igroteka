'use strict';

/* Пожиратель: ешь шары меньше себя, убегай от больших. Медленно таять — не останавливайся! */
Shell.init({
  rules: `Веди шар мышью или пальцем.
Зелёные шары меньше тебя — ешь их: очки и рост. Красные больше — они съедят тебя при касании.
Шар медленно тает сам по себе: без добычи долго не проживёшь. Съел слишком большой — конец.`,
  id: 'orbs',
  icon: '🟢',
  title: 'ПОЖИРАТЕЛЬ',
  tagline: 'Ешь шары меньше себя и не попадись большим. Шар медленно тает',
  stats: [['score', 'Счёт'], ['best', 'Рекорд']],
  bestKey: 'orbs.best',
  hints: ['Мышь / палец — веди шар', 'Зелёные можно есть, красные опасны'],
  onPlay() { start(); },
  onMenu() { Shell.showMenu(); },
  onHidden() { if (running) Shell.pause(); },
  onResume() { last = performance.now(); },
});

const W = 520, H = 520;
let cv, ctx, scale;
let px, py, pr, orbs, score, running = false, last = 0;
let mx = W / 2, my = H / 2;

function buildBoard() {
  const c = Shell.canvas(W, H, { maxW: 560 });
  cv = c.cv; ctx = c.ctx; scale = c.scale;
  const move = e => {
    const r = cv.getBoundingClientRect();
    mx = (e.clientX - r.left) / r.width * W;
    my = (e.clientY - r.top) / r.height * H;
  };
  cv.addEventListener('mousemove', move);
  cv.addEventListener('touchmove', e => { e.preventDefault(); move(e); }, { passive: false });
  cv.addEventListener('touchstart', e => { move(e); }, { passive: true });
  requestAnimationFrame(loop);
}

function spawnOrb() {
  const r = 4 + Math.random() * (pr * 1.6);
  orbs.push({
    x: 14 + Math.random() * (W - 28),
    y: 14 + Math.random() * (H - 28),
    r,
    vx: (Math.random() * 2 - 1) * 40,
    vy: (Math.random() * 2 - 1) * 40,
    ph: Math.random() * 6,
  });
}

function start() {
  px = W / 2; py = H / 2; pr = 15;
  orbs = []; score = 0;
  for (let i = 0; i < 26; i++) spawnOrb();
  running = true;
  last = performance.now();
  syncHud();
}

function update(dt) {
  const s = dt / 1000;
  // плавное следование за курсором
  px += Shell.clamp(mx - px, -260 * s, 260 * s);
  py += Shell.clamp(my - py, -260 * s, 260 * s);
  px = Shell.clamp(px, pr, W - pr);
  py = Shell.clamp(py, pr, H - pr);

  // таяние
  pr -= s * 0.55;
  if (pr < 6) {
    running = false;
    SFX.die();
    const sc = Math.floor(score);
    const record = Shell.tryRecord(sc);
    Shell.showOver({ cause: 'Растворился…', score: sc, record });
    return;
  }

  for (const o of orbs) {
    o.x += o.vx * s;
    o.y += o.vy * s;
    if (o.x < o.r || o.x > W - o.r) o.vx *= -1;
    if (o.y < o.r || o.y > H - o.r) o.vy *= -1;
    o.x = Shell.clamp(o.x, o.r, W - o.r);
    o.y = Shell.clamp(o.y, o.r, H - o.r);
    const d = Math.hypot(o.x - px, o.y - py);
    if (d < o.r + pr) {
      if (o.r < pr * 0.92) {
        // съедаем
        o.dead = true;
        pr = Math.min(46, pr + o.r * 0.16);
        score += Math.round(o.r);
        SFX.tone(300 + o.r * 14, 0.07, { type: 'triangle', vol: 0.4 });
        syncHud();
      } else if (o.r > pr * 1.08) {
        // съели нас
        running = false;
        SFX.die();
        const sc = Math.floor(score);
        const record = Shell.tryRecord(sc);
        Shell.showOver({ cause: 'Тебя съел шар побольше', score: sc, record });
        return;
      }
    }
  }
  orbs = orbs.filter(o => !o.dead);
  while (orbs.length < 26) spawnOrb();
}

function syncHud() {
  Shell.setStat('score', Math.floor(score));
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
  for (const o of orbs) {
    const edible = o.r < pr * 0.92;
    const danger = o.r > pr * 1.08;
    ctx.save();
    ctx.globalAlpha = 0.9;
    if (edible) {
      ctx.fillStyle = '#34f5a5';
      ctx.shadowColor = 'rgba(52,245,165,.5)';
    } else if (danger) {
      ctx.fillStyle = '#ff5d6c';
      ctx.shadowColor = 'rgba(255,93,108,.6)';
    } else {
      ctx.fillStyle = '#8ea0bf';
      ctx.shadowBlur = 0;
    }
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(o.x, o.y, o.r, 0, 7);
    ctx.fill();
    ctx.restore();
  }
  // игрок
  ctx.save();
  ctx.shadowColor = 'rgba(255,233,168,.9)';
  ctx.shadowBlur = 16;
  const g = ctx.createRadialGradient(px - pr * 0.3, py - pr * 0.3, pr * 0.2, px, py, pr);
  g.addColorStop(0, '#fff3c9');
  g.addColorStop(1, '#f4b23e');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(px, py, pr, 0, 7); ctx.fill();
  ctx.restore();
  // глаза
  const dx = mx - px, dy = my - py;
  const L = Math.hypot(dx, dy) || 1;
  ctx.fillStyle = '#0b101e';
  ctx.beginPath();
  ctx.arc(px + dx / L * pr * 0.35 - pr * 0.22, py + dy / L * pr * 0.35 - pr * 0.1, pr * 0.14, 0, 7);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(px + dx / L * pr * 0.35 + pr * 0.22, py + dy / L * pr * 0.35 - pr * 0.1, pr * 0.14, 0, 7);
  ctx.fill();
}

buildBoard();
