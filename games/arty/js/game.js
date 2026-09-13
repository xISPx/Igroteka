'use strict';

if (typeof window.t === 'undefined') window.t = s => s; // до загрузки i18n.js

/* Пушка: дуэль с ИИ. Задай угол и силу, учти ветер — попади по врагу.
   Ветер меняется каждый выстрел. */
Shell.init({
  rules: `↑ ↓ — угол ствола, ← → — сила, Пробел — огонь. На телефоне: левая часть экрана — угол, правая — сила, центр — огонь.
Стрелка сверху показывает ветер — он сносит снаряд в полёте и меняется после каждого выстрела.
Попади по красной пушке раньше, чем ИИ попадёт по тебе. ИИ целится с погрешностью — шансы есть всегда.`,
  id: 'arty',
  icon: '💥',
  title: 'ПУШКА',
  tagline: 'Дуэль артиллерии: угадай угол, силу и учти ветер. Кто первый попал — тот и молодец',
  stats: [['best', 'Победы']],
  bestKey: 'arty.wins',
  bestLabel: 'Побед в дуэлях',
  hints: ['↑ ↓ угол · ← → сила · Пробел — огонь'],
  menuHint: 'Стрелка над пушками показывает силу ветра',
  onPlay() { startRound(); },
  onMenu() { Shell.showMenu(); },
});

const W = 560, H = 380;
let cv, ctx, scale;
let angle, power, terrainY, wind, bullet, aiThink, over, wins;

const GX_P = 60, GX_A = W - 60;

function buildBoard() {
  const c = Shell.canvas(W, H, { maxW: 600 });
  cv = c.cv; ctx = c.ctx; scale = c.scale;
  window.addEventListener('keydown', e => {
    SFX.ensure();
    if (over || bullet) return;
    if (e.code === 'ArrowUp') { angle = Math.min(88, angle + 2); e.preventDefault(); }
    if (e.code === 'ArrowDown') { angle = Math.max(5, angle - 2); e.preventDefault(); }
    if (e.code === 'ArrowLeft') { power = Math.max(30, power - 3); e.preventDefault(); }
    if (e.code === 'ArrowRight') { power = Math.min(100, power + 3); e.preventDefault(); }
    if (e.code === 'Space') { e.preventDefault(); fire(); }
  });
  cv.addEventListener('pointerdown', e => {
    SFX.ensure();
    if (over || bullet) return;
    const r = cv.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    // левая половина — угол, правая — сила, тап — огонь в центре
    if (x < 0.3) angle = Shell.clamp(Math.round(y * 88), 5, 88);
    else if (x > 0.7) power = Shell.clamp(Math.round((1 - y) * 100), 30, 100);
    else fire();
  });
  requestAnimationFrame(loop);
}

function hAt(x) {
  // рельеф: две возвышенности
  return H - 70 - 34 * Math.sin(x / W * Math.PI * 2 + 1) - 14 * Math.sin(x / W * Math.PI * 5);
}

function startRound() {
  angle = 45; power = 65; bullet = null; over = false;
  wind = (Math.random() * 2 - 1) * 55;
  if (wins === undefined) wins = 0;
  requestAnimationFrame(() => {}); // noop
  aiThink = null;
}

function fire() {
  if (over || bullet) return;
  const a = angle * Math.PI / 180;
  bullet = {
    x: GX_P + Math.cos(a) * 26, y: hAt(GX_P) - Math.sin(a) * 26,
    vx: Math.cos(a) * power * 6.2, vy: -Math.sin(a) * power * 6.2,
    mine: true,
  };
  SFX.shoot();
}

function aiFire() {
  // ИИ целится с ошибкой, уменьшающейся с каждым выстрелом
  const dist = GX_A - GX_P;
  const guessWind = wind + (Math.random() * 2 - 1) * 26;
  const v0 = 5.4 * Math.sqrt(dist * 9.8) / Math.sqrt(2) * (1 - guessWind / 900);
  const a = (42 + Math.random() * 8) * Math.PI / 180;
  bullet = {
    x: GX_A - Math.cos(a) * 26, y: hAt(GX_A) - Math.sin(a) * 26,
    vx: -Math.cos(a) * v0, vy: -Math.sin(a) * v0,
    mine: false,
  };
  SFX.shoot();
}

function update(dt) {
  const s = dt / 1000;
  if (bullet) {
    bullet.vy += 260 * s;                       // гравитация
    bullet.vx += wind * 0.9 * s;                // ветер
    bullet.x += bullet.vx * s;
    bullet.y += bullet.vy * s;
    // попадание в пушки
    if (bullet.mine && Math.abs(bullet.x - GX_A) < 22 && bullet.y > hAt(GX_A) - 30) {
      bullet = null;
      return winRound();
    }
    if (!bullet.mine && Math.abs(bullet.x - GX_P) < 22 && bullet.y > hAt(GX_P) - 30) {
      bullet = null;
      return loseRound();
    }
    // земля
    if (bullet.x < 0 || bullet.x > W || (bullet.y > hAt(bullet.x) && bullet.vy > 0)) {
      bullet = null;
      SFX.click();
      if (!over) {
        // ход переходит к ИИ
        setTimeout(() => { if (!over) aiFire(); }, 900);
      }
    }
  }
}

function winRound() {
  over = true;
  wins++;
  Shell.store.set('arty.wins', wins);
  Shell.setStat('best', wins);
  SFX.win();
  const first = wins === 1;
  Shell.showOver({ won: true, cause: 'Прямое попадание!', score: null, record: first });
}

function loseRound() {
  over = true;
  SFX.bad();
  Shell.showOver({ cause: 'Тебя подбили', score: null });
}

function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(50, now - (loop.last || now));
  loop.last = now;
  if (!Shell.paused) update(dt);
  render(now);
}

function render(now) {
  if (!cv) return;
  ctx.setTransform(scale(), 0, 0, scale(), 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0b101e';
  ctx.fillRect(0, 0, W, H);
  // луна и звёзды
  ctx.fillStyle = 'rgba(201,212,238,.4)';
  for (let i = 0; i < 26; i++) ctx.fillRect((i * 83) % W, (i * 47) % 160, 1.6, 1.6);
  // рельеф
  ctx.fillStyle = '#1c2a48';
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 6) ctx.lineTo(x, hAt(x));
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();
  // пушки
  drawCannon(GX_P, angle, '#34f5a5');
  drawCannon(GX_A, aiThink ?? 135, '#ff5d6c');
  // ветер
  ctx.fillStyle = 'rgba(234,242,255,0.85)';
  ctx.font = '700 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  const wAbs = Math.abs(wind);
  const arrows = wind > 0 ? '→'.repeat(Math.ceil(wAbs / 18)) : '←'.repeat(Math.ceil(wAbs / 18));
  ctx.fillText(t('Ветер: ') + arrows + ' ' + Math.round(wAbs), W / 2, 26);
  // телеметрия игрока
  ctx.fillText(t('Угол ' + angle + '°  ·  Сила ' + power), GX_P + 20, H - 14);
  // снаряд
  if (bullet) {
    ctx.save();
    ctx.shadowColor = '#ffe9a8';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath(); ctx.arc(bullet.x, bullet.y, 4.5, 0, 7); ctx.fill();
    ctx.restore();
  }
  // предпросмотр ствола игрока
}

function drawCannon(x, angleDeg, color) {
  const a = angleDeg * Math.PI / 180;
  const y = hAt(x);
  ctx.save();
  ctx.translate(x, y - 6);
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(0, 0, 13, Math.PI, 0);
  ctx.fill();
  ctx.rotate(-a);
  ctx.fillRect(0, -4, 28, 8);
  ctx.restore();
}

buildBoard();
startRound();
