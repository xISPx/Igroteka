'use strict';

/* Башня: блок ездит влево-вправо — клик или Пробел роняют его на башню.
   Свес отрезается; промах целиком — конец. Идеальная укладка расширяет блок. */
Shell.init({
  rules: `Блок движется влево-вправо. Клик, тап или Пробел — сбросить его на башню.
Всё, что свисает над краем, отрезается — башня становится уже. Промах целиком — конец.
Идеальная укладка (без смещения) слегка расширяет блок и даёт бонус. Скорость растёт с высотой.`,
  id: 'stack',
  icon: '🏗️',
  title: 'БАШНЯ',
  tagline: 'Роняй блоки точно друг на друга — высота решает',
  stats: [['score', 'Высота'], ['best', 'Рекорд']],
  bestKey: 'stack.best',
  hints: ['Клик / тап / Пробел — сброс'],
  menuHint: 'Идеальная укладка расширяет блок',
  onPlay() { start(); },
  onMenu() { stopLoop(); Shell.showMenu(); },
});

const W = 420, H = 600;
const LAYER_H = 26, BASE_Y = H - 60;
let ui, ctx, scene = 'menu';
let layers = [], curBlock = null, dir = 1, speed = 3.2, score = 0;
let cameraY = 0, flash = null;

function hue(i) { return (i * 26) % 360; }

function start() {
  if (!ui) {
    ui = Shell.canvas(W, H, { pad: 230, maxW: 460 });
    ctx = ui.ctx;
    ui.cv.addEventListener('pointerdown', () => drop());
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.code === 'ArrowDown') { e.preventDefault(); drop(); }
    });
  }
  layers = [{ x: W / 2 - 90, w: 180 }];
  score = 0; dir = 1; speed = 3.2; cameraY = 0; flash = null;
  Shell.setStat('score', 0);
  spawn();
  scene = 'play';
  requestAnimationFrame(loop);
}

function stopLoop() { scene = 'menu'; }

function topY() { return BASE_Y - (layers.length - 1) * LAYER_H; }

function spawn() {
  const w = layers[layers.length - 1].w;
  curBlock = { x: dir === 1 ? -w : W, w };
}

function drop() {
  if (scene !== 'play' || !curBlock) return;
  const top = layers[layers.length - 1];
  const dx = curBlock.x - top.x;
  if (Math.abs(dx) >= curBlock.w) {
    // промах целиком
    SFX.die();
    gameOver();
    return;
  }
  let w = curBlock.w, x = curBlock.x;
  if (Math.abs(dx) <= 5) {
    x = top.x; // идеал
    w = Math.min(top.w + 6, 180);
    flash = { t: 14 };
    SFX.good();
  } else {
    w = curBlock.w - Math.abs(dx);
    if (dx > 0) x = curBlock.x; else x = top.x;
    SFX.place();
  }
  layers.push({ x, w });
  score++;
  Shell.setStat('score', score);
  speed = Math.min(7, 3.2 + score * 0.12);
  dir = Math.random() < 0.5 ? 1 : -1;
  // камера следует вниз, когда башня уходит за экран
  const y = topY();
  if (y < 120) cameraY += 120 - y;
  spawn();
}

function loop() {
  if (scene !== 'play') return;
  if (curBlock) {
    curBlock.x += dir * speed;
    if (dir === 1 && curBlock.x + curBlock.w > W) dir = -1;
    if (dir === -1 && curBlock.x < 0) dir = 1;
  }
  if (flash && flash.t-- <= 0) flash = null;
  draw();
  requestAnimationFrame(loop);
}

function gameOver() {
  if (scene !== 'play') return;
  scene = 'over';
  const record = Shell.tryRecord(score);
  Shell.showOver({ cause: t('Башня рухнула'), score, record });
}

function draw() {
  const s = ui.scale();
  ctx.save();
  ctx.scale(s, s);
  ctx.clearRect(0, 0, W, H);
  ctx.translate(0, cameraY);
  // слои
  layers.forEach((l, i) => {
    ctx.fillStyle = `hsl(${hue(i)} 85% 62%)`;
    ctx.fillRect(l.x, BASE_Y - i * LAYER_H, l.w, LAYER_H - 2);
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    ctx.fillRect(l.x, BASE_Y - i * LAYER_H, l.w, 6);
  });
  // текущий блок
  if (curBlock && scene === 'play') {
    ctx.fillStyle = `hsl(${hue(layers.length)} 85% 62%)`;
    ctx.fillRect(curBlock.x, topY() - LAYER_H, curBlock.w, LAYER_H - 2);
  }
  if (flash) {
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.font = 'bold 20px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(t('ИДЕАЛЬНО!'), W / 2, topY() - LAYER_H - 12);
  }
  ctx.restore();
}
