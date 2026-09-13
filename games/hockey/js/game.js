'use strict';

/* Аэрохоккей: ракетка следует за мышью/пальцем (нижняя половина).
   Забей 7 шайб раньше ИИ. Шайба ускоряется от ударов. */
Shell.init({
  rules: `Мышь, палец или ← → — твоя ракетка в нижней половине стола.
Забей 7 шайб в верхние ворота раньше, чем ИИ забьёт тебе.
Шайба ускоряется от ударов и слегка тормозит о воздух. ИИ играет аккуратно — выигрывай за счёт скорости.`,
  id: 'hockey',
  icon: '🏒',
  title: 'АЭРОХОККЕЙ',
  tagline: 'Забей ИИ семь шайб — ракетка следует за пальцем',
  stats: [['score', 'Счёт'], ['best', 'Победы']],
  bestKey: 'hockey.wins',
  hints: ['Мышь / палец / ← → — ракетка'],
  menuHint: 'Матч до 7 шайб',
  onPlay() { start(); },
  onMenu() { stopLoop(); Shell.showMenu(); },
});

const W = 460, H = 640, GOAL_W = 170, PR = 30, PU = 13;
let ui, ctx, scene = 'menu';
let me, ai, puck, myScore = 0, aiScore = 0, serveT = 0;

function resetPuck(toMe) {
  puck = { x: W / 2, y: H / 2, vx: (toMe ? -2.4 : 2.4) * (0.8 + Math.random() * 0.4), vy: (toMe ? 1.6 : -1.6) * (0.8 + Math.random() * 0.4) };
  serveT = 40;
}

function start() {
  if (!ui) {
    ui = Shell.canvas(W, H, { pad: 230, maxW: 500 });
    ctx = ui.ctx;
    const aim = (e) => {
      const b = ui.cv.getBoundingClientRect();
      const s = W / b.width;
      const x = ((e.clientX ?? 0) - b.left) * s, y = ((e.clientY ?? 0) - b.top) * s;
      me.x = Shell.clamp(x, PR, W - PR);
      me.y = Shell.clamp(y, H / 2 + PR, H - PR - 2);
    };
    ui.cv.addEventListener('pointermove', aim);
    ui.cv.addEventListener('pointerdown', aim);
    window.addEventListener('keydown', (e) => {
      if (scene !== 'play') return;
      const v = 26;
      if (e.code === 'ArrowLeft') me.x = Math.max(PR, me.x - v);
      if (e.code === 'ArrowRight') me.x = Math.min(W - PR, me.x + v);
      if (e.code === 'ArrowUp') me.y = Math.max(H / 2 + PR, me.y - v);
      if (e.code === 'ArrowDown') me.y = Math.min(H - PR - 2, me.y + v);
    });
  }
  me = { x: W / 2, y: H - 110, px: W / 2, py: H - 110, vx: 0, vy: 0 };
  ai = { x: W / 2, y: 110 };
  myScore = 0; aiScore = 0;
  Shell.setStat('score', '0 : 0');
  resetPuck(false);
  scene = 'play';
  requestAnimationFrame(loop);
}

function stopLoop() { scene = 'menu'; }

function goal(top) {
  if (top) { aiScore++; SFX.bad(); } else { myScore++; SFX.good(); }
  Shell.setStat('score', myScore + ' : ' + aiScore);
  if (myScore >= 7 || aiScore >= 7) {
    scene = 'over';
    const won = myScore >= 7;
    const record = won ? Shell.bumpWins() : false;
    Shell.showOver({ won, cause: won ? t('Матч твой!') : t('ИИ забил седьмую'), score: myScore + ' : ' + aiScore, record });
    return;
  }
  resetPuck(top);
}

function loop() {
  if (scene !== 'play') return;
  // скорость ракетки игрока — для силы удара
  if (me) {
    me.vx = me.x - (me.px ?? me.x);
    me.vy = me.y - (me.py ?? me.y);
    me.px = me.x; me.py = me.y;
  }
  // ИИ
  const target = puck.y < H / 2 ? puck : { x: W / 2, y: 110 };
  const spd = 3.4 + aiScore * 0.12;
  ai.x += Shell.clamp(target.x - ai.x, -spd, spd);
  ai.y += Shell.clamp(target.y - ai.y, -spd, spd) * 0.8;
  ai.x = Shell.clamp(ai.x, PR, W - PR);
  ai.y = Shell.clamp(ai.y, PR + 2, H / 2 - PR);
  // шайба
  if (serveT > 0) serveT--;
  else {
    puck.x += puck.vx; puck.y += puck.vy;
    puck.vx *= 0.998; puck.vy *= 0.998;
  }
  // стены
  if (puck.x < PU) { puck.x = PU; puck.vx = Math.abs(puck.vx); SFX.click(); }
  if (puck.x > W - PU) { puck.x = W - PU; puck.vx = -Math.abs(puck.vx); SFX.click(); }
  // ворота
  const g0 = (W - GOAL_W) / 2, g1 = (W + GOAL_W) / 2;
  if (puck.y < PU) {
    if (puck.x > g0 && puck.x < g1) { goal(true); }
    else { puck.y = PU; puck.vy = Math.abs(puck.vy); SFX.click(); }
  }
  if (puck.y > H - PU) {
    if (puck.x > g0 && puck.x < g1) { goal(false); }
    else { puck.y = H - PU; puck.vy = -Math.abs(puck.vy); SFX.click(); }
  }
  // удары
  hit(me, 1);
  hit(ai, -1);
  draw();
  requestAnimationFrame(loop);
}

function hit(m, dirY) {
  const dx = puck.x - m.x, dy = puck.y - m.y;
  const d2 = dx * dx + dy * dy;
  const rr = PR + PU;
  if (d2 < rr * rr && d2 > 0.01) {
    const d = Math.sqrt(d2);
    const nx = dx / d, ny = dy / d;
    puck.x = m.x + nx * rr;
    puck.y = m.y + ny * rr;
    const power = Math.hypot(m.vx || 0, m.vy || 0);
    const push = 7.5 + Math.min(6, power * 0.4);
    puck.vx = nx * push;
    puck.vy = ny * push;
    puck.vy += dirY * 2.2; // толчок к чужим воротам
    SFX.shoot();
  }
}

function draw() {
  const s = ui.scale();
  ctx.save();
  ctx.scale(s, s);
  ctx.clearRect(0, 0, W, H);
  // разметка
  ctx.strokeStyle = 'rgba(142,160,191,.25)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(12, H / 2); ctx.lineTo(W - 12, H / 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(W / 2, H / 2, 46, 0, 7); ctx.stroke();
  const g0 = (W - GOAL_W) / 2, g1 = (W + GOAL_W) / 2;
  ctx.fillStyle = 'rgba(255,93,108,.30)';
  ctx.fillRect(g0, 0, GOAL_W, 10);
  ctx.fillStyle = 'rgba(52,245,165,.30)';
  ctx.fillRect(g0, H - 10, GOAL_W, 10);
  // шайба
  ctx.beginPath();
  ctx.fillStyle = '#c9d4ee';
  ctx.shadowColor = '#c9d4ee'; ctx.shadowBlur = 14;
  ctx.arc(puck.x, puck.y, PU, 0, 7);
  ctx.fill();
  ctx.shadowBlur = 0;
  // ракетки
  mallet(ai.x, ai.y, '#ff5d6c');
  mallet(me.x, me.y, '#34f5a5');
  ctx.restore();
}

function mallet(x, y, color) {
  ctx.beginPath();
  ctx.fillStyle = color;
  ctx.shadowColor = color; ctx.shadowBlur = 16;
  ctx.arc(x, y, PR, 0, 7);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(0,0,0,.28)';
  ctx.beginPath(); ctx.arc(x, y, PR * 0.45, 0, 7); ctx.fill();
}
