'use strict';

/* Пробка: три полосы встречки — лавируй между машинами на скорости. */
Shell.init({
  rules: `← → или тап по полосе — смена полосы, ↑ — ускориться, ↓ — притормозить.
Скорость растёт сама, машины едут навстречу — обгоняй поток как можно дольше.
Счёт — пройденные метры. Любое касание — авария.`,
  id: 'traffic',
  icon: '🏎️',
  title: 'ПРОБКА',
  tagline: 'Обгоняй поток на трассе: три полосы, скорость растёт сама',
  stats: [['score', 'Метры'], ['best', 'Рекорд']],
  bestKey: 'traffic.best',
  hints: ['← → / A D — смена полосы', '↑ быстрей · ↓ медленней', 'тап по полосе на телефоне'],
  onPlay() { start(); },
  onMenu() { Shell.showMenu(); },
  onHidden() { if (running) Shell.pause(); },
  onResume() { last = performance.now(); },
});

const W = 380, H = 560, LANES = 3, LW = W / LANES;
let cv, ctx, scale;
let lane, carX, speed, dist, cars, roadOff, running = false, last = 0;
let targetLane = 1;

function buildBoard() {
  const c = Shell.canvas(W, H, { maxW: 420 });
  cv = c.cv; ctx = c.ctx; scale = c.scale;
  window.addEventListener('keydown', e => {
    SFX.ensure();
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') { targetLane = Math.max(0, targetLane - 1); }
    if (e.code === 'ArrowRight' || e.code === 'KeyD') { targetLane = Math.min(LANES - 1, targetLane + 1); }
    if (e.code === 'ArrowUp' || e.code === 'KeyW') speed = Math.min(700, speed + 45);
    if (e.code === 'ArrowDown' || e.code === 'KeyS') speed = Math.max(240, speed - 60);
  });
  cv.addEventListener('pointerdown', e => {
    SFX.ensure();
    const r = cv.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    targetLane = Shell.clamp((x / r.width * LANES) | 0, 0, LANES - 1);
  });
  requestAnimationFrame(loop);
}

function laneX(l) { return l * LW + LW / 2; }

function start() {
  lane = 1; carX = laneX(1); targetLane = 1;
  speed = 330; dist = 0;
  cars = [];
  roadOff = 0;
  for (let i = 0; i < 5; i++) spawnCar(true);
  running = true;
  last = performance.now();
  syncHud();
}

function spawnCar(init) {
  const l = Shell.rnd(LANES);
  cars.push({
    lane: l,
    x: laneX(l),
    y: init ? -100 - Math.random() * H : -120,
    color: ['#ff5d6c', '#ffd166', '#b388ff', '#4dd7ff', '#ff9f43'][Shell.rnd(5)],
  });
}

function update(dt) {
  const s = dt / 1000;
  speed = Math.min(700, 330 + dist * 0.02);
  dist += speed * s;
  roadOff = (roadOff + speed * s) % 64;
  syncHud();
  carX += (laneX(targetLane) - carX) * Math.min(1, 12 * s);
  lane = targetLane;

  for (const car of cars) car.y += speed * s;
  cars = cars.filter(c => c.y < H + 120);
  if (cars.length < 6 && Math.random() < dt / 500) spawnCar(false);

  // столкновение: наш игрок y ~ H-90, размеры 34×62
  const py = H - 90;
  for (const car of cars) {
    if (Math.abs(car.x - carX) < 30 && Math.abs(car.y - py) < 58) {
      running = false;
      SFX.die();
      const d = Math.floor(dist);
      const record = Shell.tryRecord(d);
      Shell.showOver({ cause: 'Авария на скорости ' + Math.round(speed / 3) + ' км/ч', score: d, rows: [['Метры', d]], record });
      return;
    }
  }
}

function syncHud() {
  Shell.setStat('score', Math.floor(dist));
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
  // дорога
  ctx.fillStyle = '#10182c';
  ctx.fillRect(0, 0, W, H);
  // обочины
  ctx.fillStyle = '#182330';
  ctx.fillRect(0, 0, 6, H);
  ctx.fillRect(W - 6, 0, 6, H);
  // разметка
  ctx.fillStyle = 'rgba(255,233,168,0.5)';
  for (let l = 1; l < LANES; l++) {
    for (let y = -64 + roadOff; y < H; y += 64) {
      ctx.fillRect(l * LW - 2, y, 4, 32);
    }
  }
  // машины потока
  for (const car of cars) {
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.fillStyle = car.color;
    ctx.shadowColor = car.color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.roundRect(-16, -30, 32, 60, 9);
    ctx.fill();
    ctx.fillStyle = 'rgba(11,16,30,0.85)';
    ctx.beginPath();
    ctx.roundRect(-11, -18, 22, 14, 4);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(-11, 8, 22, 12, 4);
    ctx.fill();
    ctx.restore();
  }
  // машина игрока
  ctx.save();
  ctx.translate(carX, H - 90);
  ctx.shadowColor = 'rgba(52,245,165,.8)';
  ctx.shadowBlur = 14;
  ctx.fillStyle = '#34f5a5';
  ctx.beginPath();
  ctx.roundRect(-17, -32, 34, 64, 10);
  ctx.fill();
  ctx.fillStyle = 'rgba(11,16,30,0.9)';
  ctx.beginPath();
  ctx.roundRect(-12, -20, 24, 15, 4);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(-12, 9, 24, 13, 4);
  ctx.fill();
  ctx.restore();
  // спидометр
  ctx.fillStyle = 'rgba(234,242,255,0.85)';
  ctx.font = '800 15px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(Math.round(speed / 3) + ' км/ч', W - 14, 24);
}

buildBoard();
