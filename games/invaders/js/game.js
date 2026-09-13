'use strict';

/* Инвейдеры: отстреливай волны пришельцев, пока они не приземлились. */
Shell.init({
  rules: `← → — движение, Пробел — выстрел (не больше трёх в воздухе). Тап по краям экрана — движение, по центру — огонь.
Рой движется из стороны в сторону и спускается. Чем меньше пришельцев, тем быстрее рой — не дайте им приземлиться.
Пришельцы стреляют в ответ. Три попадания по тебе или приземление роя — конец.
Верхние ряды дороже: 50/40/30/20/10 очков. Волны сменяют друг друга бесконечно.`,
  id: 'invaders',
  icon: '👾',
  title: 'ИНВЕЙДЕРЫ',
  tagline: 'Отбивай волны пришельцев. Чем меньше их остаётся — тем быстрее они двигаются',
  stats: [['score', 'Счёт'], ['wave', 'Волна'], ['lives', 'Жизни'], ['best', 'Рекорд']],
  bestKey: 'invaders.best',
  hints: ['← → движение · Пробел — огонь', 'Тап по половинам экрана'],
  onPlay() { start(); },
  onMenu() { Shell.showMenu(); },
  onHidden() { if (running) Shell.pause(); },
  onResume() { last = performance.now(); },
});

const W = 480, H = 520;
let cv, ctx, scale;
let ship, bullets, bombs, aliens, parts;
let dir, speed, shootTimer, wave, score, lives, running = false, last = 0;

function buildBoard() {
  const c = Shell.canvas(W, H, { maxW: 500 });
  cv = c.cv; ctx = c.ctx; scale = c.scale;
  window.addEventListener('keydown', e => {
    SFX.ensure();
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.l = true;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.r = true;
    if (e.code === 'Space') {
      e.preventDefault();
      if (Shell.paused) Shell.resume();
      else fire();
    }
  });
  window.addEventListener('keyup', e => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.l = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.r = false;
  });
  cv.addEventListener('pointerdown', e => {
    SFX.ensure();
    if (Shell.paused) { Shell.resume(); return; }
    const r = cv.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    if (x < 0.35) keys.l = true;
    else if (x > 0.65) keys.r = true;
    else fire();
    setTimeout(() => { keys.l = keys.r = false; }, 260);
  });
  requestAnimationFrame(loop);
}

const keys = { l: false, r: false };

function spawnWave() {
  aliens = [];
  const rowsN = Math.min(5, 3 + ((wave / 2) | 0));
  const colsN = 8;
  for (let r = 0; r < rowsN; r++)
    for (let c = 0; c < colsN; c++)
      aliens.push({
        x: 60 + c * 46, y: 50 + r * 40,
        w: 28, h: 20, row: r, alive: true,
        ph: Math.random() * 6,
      });
  dir = 1;
  speed = 24 + wave * 7;
}

function start() {
  ship = { x: W / 2, w: 40, h: 18 };
  bullets = []; bombs = []; parts = [];
  wave = 1; score = 0; lives = 3;
  shootTimer = 0;
  spawnWave();
  running = true;
  last = performance.now();
  syncHud();
}

function fire() {
  if (!running || bullets.length >= 3) return;
  bullets.push({ x: ship.x, y: H - 52, vy: -430 });
  SFX.shoot();
}

function alienFire() {
  const alive = aliens.filter(a => a.alive);
  if (!alive.length) return;
  const a = alive[Shell.rnd(alive.length)];
  bombs.push({ x: a.x, y: a.y + 12, vy: 150 + wave * 12 });
}

function burst(x, y, color) {
  for (let i = 0; i < 10; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 40 + Math.random() * 130;
    parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, born: performance.now(), life: 400, color });
  }
}

function update(dt) {
  const s = dt / 1000;
  if (keys.l) ship.x -= 300 * s;
  if (keys.r) ship.x += 300 * s;
  ship.x = Shell.clamp(ship.x, 30, W - 30);

  for (const b of bullets) b.y += b.vy * s;
  bullets = bullets.filter(b => b.y > -10);
  for (const b of bombs) b.y += b.vy * s;

  // движение роя
  let minX = 1e9, maxX = -1e9, maxY = -1e9;
  for (const a of aliens) {
    if (!a.alive) continue;
    minX = Math.min(minX, a.x); maxX = Math.max(maxX, a.x); maxY = Math.max(maxY, a.y);
  }
  if (maxX > -1e9) {
    let edge = false;
    for (const a of aliens) {
      if (!a.alive) continue;
      a.x += dir * speed * s;
      if (a.x < 34 || a.x > W - 34) edge = true;
    }
    if (edge) {
      dir *= -1;
      for (const a of aliens) if (a.alive) a.y += 16;
    }
  }
  shootTimer -= dt;
  if (shootTimer <= 0) {
    alienFire();
    shootTimer = Math.max(350, 1400 - wave * 60) + Math.random() * 600;
  }

  // пули игрока × пришельцы
  for (const b of bullets) {
    for (const a of aliens) {
      if (!a.alive) continue;
      if (Math.abs(b.x - a.x) < a.w / 2 + 3 && Math.abs(b.y - a.y) < a.h / 2 + 5) {
        a.alive = false;
        b.dead = true;
        score += (5 - a.row) * 10;
        burst(a.x, a.y, '#34f5a5');
        SFX.explode();
        syncHud();
      }
    }
  }
  bullets = bullets.filter(b => !b.dead);

  // бомбы × игрок
  for (const b of bombs) {
    if (Math.abs(b.x - ship.x) < 22 && b.y > H - 56 && b.y < H - 26) {
      b.dead = true;
      lives--;
      burst(ship.x, H - 40, '#ff5d6c');
      SFX.explode();
      syncHud();
      if (lives <= 0) return gameOver();
    }
  }
  bombs = bombs.filter(b => !b.dead && b.y < H + 10);

  // вторжение
  if (maxY > H - 80) return gameOver();

  // волна зачищена
  if (!aliens.some(a => a.alive)) {
    wave++;
    SFX.level();
    spawnWave();
    syncHud();
  }
}

function gameOver() {
  running = false;
  SFX.die();
  const record = Shell.tryRecord(score);
  Shell.showOver({ cause: 'Флот отступил', score, rows: [['Волна', wave]], record });
}

function syncHud() {
  Shell.setStat('score', score);
  Shell.setStat('wave', wave);
  Shell.setStat('lives', '●'.repeat(Math.max(0, lives)) || '—');
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
  // пришельцы
  for (const a of aliens) {
    if (!a.alive) continue;
    const wig = Math.sin(now / 220 + a.ph) > 0 ? 1 : -1;
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.fillStyle = ['#ff5d6c', '#ff9f43', '#ffd166', '#34f5a5', '#4da3ff'][a.row];
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 8;
    // тело пришельца
    ctx.fillRect(-11, -6, 22, 10);
    ctx.fillRect(-14, -2, 28, 6);
    // глаза
    ctx.fillStyle = '#0b101e';
    ctx.fillRect(-7 + wig, -3, 4, 4);
    ctx.fillRect(3 + wig, -3, 4, 4);
    // лапки
    ctx.fillRect(-9, 4, 4, 5 * wig);
    ctx.fillRect(5, 4, 4, 5 * wig);
    ctx.restore();
  }
  // корабль
  ctx.save();
  ctx.translate(ship.x, H - 38);
  ctx.shadowColor = 'rgba(77,215,255,.8)';
  ctx.shadowBlur = 12;
  ctx.fillStyle = '#4dd7ff';
  ctx.beginPath();
  ctx.moveTo(0, -14); ctx.lineTo(16, 8); ctx.lineTo(6, 8); ctx.lineTo(0, 2);
  ctx.lineTo(-6, 8); ctx.lineTo(-16, 8);
  ctx.closePath(); ctx.fill();
  ctx.restore();
  // пули
  ctx.fillStyle = '#ffe9a8';
  for (const b of bullets) ctx.fillRect(b.x - 2, b.y - 8, 4, 12);
  ctx.fillStyle = '#ff5d6c';
  for (const b of bombs) ctx.fillRect(b.x - 3, b.y - 5, 6, 10);
  // частицы
  parts = parts.filter(p => now - p.born < p.life);
  for (const p of parts) {
    const a = 1 - (now - p.born) / p.life;
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, 2.4, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

buildBoard();
