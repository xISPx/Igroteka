'use strict';

/* Ритм: ноты падают по 4 дорожкам. Лови на линии клавишами D F J K или тапами. */
Shell.init({
  rules: `Ноты падают по четырём дорожкам — жми D, F, J, K или тапай по дорожке, когда нота на линии.
Чем точнее попадание и длиннее серия (комбо), тем больше очков за ноту.
Пропущенная нота отнимает здоровье. Здоровье на нуле — игра окончена.`,
  id: 'rhythm',
  icon: '🥁',
  title: 'РИТМ',
  tagline: 'Ноты падают по четырём дорожкам — лови их на линии. Промахи отнимают здоровье',
  stats: [['score', 'Счёт'], ['combo', 'Комбо'], ['best', 'Рекорд']],
  bestKey: 'rhythm.best',
  hints: ['D F J K — дорожки', 'Тап по дорожке на телефоне'],
  onPlay() { start(); },
  onMenu() { Shell.showMenu(); },
});

const W = 400, H = 520, LANES = 4, LW = W / LANES, HIT_Y = 460;
const KEYMAP = { KeyD: 0, KeyF: 1, KeyJ: 2, KeyK: 3 };
const LANE_COLORS = ['#34f5a5', '#ff5d6c', '#ffd166', '#4da3ff'];
const NOTE_TONES = [329.63, 415.3, 523.25, 659.25];
const NOTE_SPEED0 = 260, SPAWN0 = 620;
let cv, ctx, scale;
let notes = [], effects = [], running = false, score = 0, combo = 0, hp = 100;
let speed = NOTE_SPEED0, spawnEvery = SPAWN0, nextSpawn = 0, t0 = 0;
let flash = [0, 0, 0, 0];

function buildBoard() {
  const c = Shell.canvas(W, H, { maxW: 440 });
  cv = c.cv; ctx = c.ctx; scale = c.scale;
  cv.addEventListener('pointerdown', e => {
    if (!running) return;
    const r = cv.getBoundingClientRect();
    const lane = Shell.clamp(((e.clientX - r.left) / r.width * LANES) | 0, 0, 3);
    hit(lane);
  });
  window.addEventListener('keydown', e => {
    SFX.ensure();
    if (KEYMAP[e.code] !== undefined) { e.preventDefault(); hit(KEYMAP[e.code]); }
  });
  requestAnimationFrame(loop);
}

function start() {
  notes = []; effects = [];
  score = 0; combo = 0; hp = 100;
  speed = NOTE_SPEED0; spawnEvery = SPAWN0;
  t0 = performance.now();
  nextSpawn = t0 + 800;
  running = true;
  Shell.setStat('score', 0);
  Shell.setStat('combo', 0);
}

function spawnNote() {
  notes.push({ lane: Shell.rnd(LANES), y: -30, hit: false });
}

function hit(lane) {
  if (!running) return;
  flash[lane] = performance.now();
  // ближайшая нота в зоне
  let best = -1, bestDist = 1e9;
  notes.forEach((n, i) => {
    if (n.lane !== lane || n.hit) return;
    const d = Math.abs(n.y - HIT_Y);
    if (d < bestDist) { bestDist = d; best = i; }
  });
  if (best >= 0 && bestDist < 55) {
    const n = notes[best];
    n.hit = true;
    combo++;
    score += 10 + Math.min(40, combo);
    Shell.setStat('score', score);
    Shell.setStat('combo', combo);
    SFX.tone(NOTE_TONES[lane], 0.15, { type: 'triangle', vol: 0.55 });
    effects.push({ lane, y: HIT_Y, born: performance.now(), good: true });
  } else {
    combo = 0;
    Shell.setStat('combo', 0);
    SFX.bad();
  }
}

function loop(now) {
  requestAnimationFrame(loop);
  if (!cv) return;
  const dt = Math.min(40, now - (loop.last || now));
  loop.last = now;
  if (running) {
    if (now >= nextSpawn) {
      spawnNote();
      const progress = (now - t0) / 60000;
      speed = Math.min(520, NOTE_SPEED0 + progress * 2600);
      spawnEvery = Math.max(300, SPAWN0 - progress * 2400);
      nextSpawn = now + spawnEvery * (0.7 + Math.random() * 0.6);
    }
    for (const n of notes) n.y += speed * dt / 1000;
    // пропущенные
    for (const n of notes) {
      if (!n.hit && n.y > H + 20) {
        n.dead = true;
        combo = 0;
        hp -= 9;
        Shell.setStat('combo', 0);
        SFX.bad();
      }
    }
    notes = notes.filter(n => !n.dead && !n.hit);
    if (hp <= 0) {
      running = false;
      const record = Shell.tryRecord(score);
      SFX.die();
      Shell.showOver({ cause: 'Здоровье кончилось', score, record });
    }
  }
  render(now);
}

function render(now) {
  ctx.setTransform(scale(), 0, 0, scale(), 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0b101e';
  ctx.fillRect(0, 0, W, H);
  // дорожки
  for (let l = 0; l < LANES; l++) {
    ctx.fillStyle = l % 2 ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.045)';
    ctx.fillRect(l * LW, 0, LW, H);
    // зона нажатия
    const f = Math.max(0, 1 - (now - flash[l]) / 160);
    ctx.save();
    ctx.globalAlpha = 0.25 + 0.5 * f;
    ctx.fillStyle = LANE_COLORS[l];
    ctx.fillRect(l * LW + 4, HIT_Y - 4, LW - 8, 56);
    ctx.restore();
    ctx.fillStyle = 'rgba(234,242,255,0.85)';
    ctx.font = '900 17px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('DFJK'[l], l * LW + LW / 2, HIT_Y + 24);
  }
  // линия
  ctx.strokeStyle = 'rgba(234,242,255,0.3)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, HIT_Y + 28); ctx.lineTo(W, HIT_Y + 28); ctx.stroke();
  // ноты
  for (const n of notes) {
    ctx.save();
    ctx.shadowColor = LANE_COLORS[n.lane];
    ctx.shadowBlur = 14;
    ctx.fillStyle = LANE_COLORS[n.lane];
    ctx.beginPath();
    ctx.roundRect(n.lane * LW + 10, n.y - 13, LW - 20, 26, 13);
    ctx.fill();
    ctx.restore();
  }
  // эффекты попаданий
  effects = effects.filter(e => now - e.born < 300);
  for (const e of effects) {
    const k = (now - e.born) / 300;
    ctx.globalAlpha = 1 - k;
    ctx.strokeStyle = e.good ? '#eaf2ff' : '#ff5d6c';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(e.lane * LW + LW / 2, e.y, 16 + k * 30, 0, 7); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  // здоровье
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(0, 0, W, 8);
  ctx.fillStyle = hp > 35 ? '#34f5a5' : '#ff5d6c';
  ctx.fillRect(0, 0, W * Shell.clamp(hp, 0, 100) / 100, 8);
}

buildBoard();
