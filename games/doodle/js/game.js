'use strict';

/* Дудл-прыг: прыгай по платформам всё выше. ← → или наклон-тап. */
Shell.init({
  rules: `Персонаж сам отскакивает от платформ. ← → или тап по половинам экрана — движение вбок; края экрана связаны: ушёл влево — выехал справа.
Поднимайся как можно выше — счёт равен высоте. Жёлтые платформы двигаются.
Упал ниже экрана — конец. Планируй прыжки: после отскока важно оказаться над следующей платформой.`,
  id: 'doodle',
  icon: '🦘',
  title: 'ДУДЛ',
  tagline: 'Прыгай по платформам как можно выше. Падение внизу — конец',
  stats: [['score', 'Высота'], ['best', 'Рекорд']],
  bestKey: 'doodle.best',
  hints: ['← → движение', 'Тап по половинам экрана'],
  onPlay() { start(); },
  onMenu() { Shell.showMenu(); },
  onHidden() { if (running) Shell.pause(); },
  onResume() { last = performance.now(); },
});

const W = 400, H = 560;
let cv, ctx, scale;
let px, py, vx, vy, plats, height, camY, running = false, last = 0;
let keys = { l: false, r: false };

const GRAV = 1300, JUMP = -620, MOVE = 240;

function buildBoard() {
  const c = Shell.canvas(W, H, { maxW: 440 });
  cv = c.cv; ctx = c.ctx; scale = c.scale;
  window.addEventListener('keydown', e => {
    SFX.ensure();
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.l = true;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.r = true;
  });
  window.addEventListener('keyup', e => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.l = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.r = false;
  });
  cv.addEventListener('pointerdown', e => {
    SFX.ensure();
    const r = cv.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    if (x < 0.4) keys.l = true;
    else if (x > 0.6) keys.r = true;
    setTimeout(() => { keys.l = keys.r = false; }, 300);
  });
  requestAnimationFrame(loop);
}

function newPlat(y) {
  return {
    x: 10 + Math.random() * (W - 110), y,
    w: 60 + Math.random() * 40,
    type: Math.random() < 0.18 && height > 800 ? 'move' : 'static',
    ph: Math.random() * 6,
  };
}

function start() {
  px = W / 2; py = H - 120; vx = 0; vy = JUMP;
  height = 0; camY = 0;
  plats = [{ x: W / 2 - 50, y: H - 60, w: 100, type: 'static', ph: 0 }];
  for (let y = H - 130; y > -2600; y -= 65 + Math.random() * 45) plats.push(newPlat(y));
  running = true;
  last = performance.now();
  syncHud();
}

function update(dt) {
  const s = dt / 1000;
  if (keys.l) vx = -MOVE;
  else if (keys.r) vx = MOVE;
  else vx *= 0.86;
  px += vx * s;
  if (px < -20) px = W + 20;
  if (px > W + 20) px = -20;
  vy += GRAV * s;
  py += vy * s;

  // движущиеся платформы
  for (const p of plats) {
    if (p.type === 'move') {
      p.x += Math.sin(p.ph + performance.now() / 900) * 60 * s;
      p.x = Shell.clamp(p.x, 4, W - p.w - 4);
    }
  }

  // приземление только при падении
  if (vy > 0) {
    for (const p of plats) {
      if (px > p.x - 12 && px < p.x + p.w + 12 && py + 12 > p.y && py + 12 < p.y + 18 + vy * s) {
        vy = JUMP;
        SFX.jump();
      }
    }
  }

  // камера следует вверх
  const targetCam = py - H * 0.55;
  if (targetCam < camY) {
    height += camY - targetCam;
    camY = targetCam;
    syncHud();
  }

  // удаляем ушедшие вниз платформы, добавляем сверху
  plats = plats.filter(p => p.y - camY < H + 80);
  let top = Math.min(...plats.map(p => p.y));
  while (top > camY - 40) {
    top -= 60 + Math.random() * 45;
    plats.push(newPlat(top));
  }

  if (py - camY > H + 40) {
    running = false;
    SFX.die();
    const h = Math.floor(height / 10);
    const record = Shell.tryRecord(h);
    Shell.showOver({ cause: 'Упал с высоты', score: h, rows: [['Высота', h]], record });
  }
}

function syncHud() {
  Shell.setStat('score', Math.floor(height / 10));
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
  if (!cv || !plats) return;
  ctx.setTransform(scale(), 0, 0, scale(), 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0b101e';
  ctx.fillRect(0, 0, W, H);
  // платформы
  for (const p of plats) {
    const y = p.y - camY;
    if (y < -20 || y > H + 20) continue;
    ctx.save();
    if (p.type === 'move') {
      ctx.shadowColor = 'rgba(255,209,102,.6)';
      ctx.fillStyle = '#ffd166';
    } else {
      ctx.shadowColor = 'rgba(52,245,165,.5)';
      ctx.fillStyle = '#34f5a5';
    }
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.roundRect(p.x, y, p.w, 12, 6);
    ctx.fill();
    ctx.restore();
  }
  // персонаж
  const sy = py - camY;
  ctx.save();
  ctx.translate(px, sy);
  ctx.shadowColor = 'rgba(52,245,165,.7)';
  ctx.shadowBlur = 12;
  ctx.fillStyle = '#b4ffd2';
  ctx.beginPath();
  ctx.ellipse(0, 0, 14, 16, 0, 0, 7);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#0b101e';
  // глаза смотрят по направлению
  const dir = vx >= 0 ? 1 : -1;
  ctx.beginPath(); ctx.arc(4 * dir, -4, 2.6, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(-4 * dir, -4, 2.6, 0, 7); ctx.fill();
  ctx.restore();
}

buildBoard();
