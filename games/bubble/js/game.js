'use strict';

/* Пузыри: стреляй шаром снизу, собирай группы из 3+ одинаковых — они лопаются.
   Отвязавшиеся от потолка пузыри падают. Пузырь дошёл до линии — конец. */
Shell.init({
  rules: `Мышь — прицел, клик — выстрел. Стрелки — поворот, Пробел — выстрел.
Собери 3+ пузыря одного цвета — они лопаются: +10 очков за каждый.
Пузыри, отвалившиеся от потолка, падают — +20 за каждый. Каждые 8 выстрелов потолок опускается на ряд.
Лопнул весь потолок — новый уровень. Пузырь пересёк линию — конец.`,
  id: 'bubble',
  icon: '💧',
  title: 'ПУЗЫРИ',
  tagline: 'Стреляй шаром и лопай группы из трёх и более',
  stats: [['score', 'Счёт'], ['level', 'Уровень'], ['best', 'Рекорд']],
  bestKey: 'bubble.best',
  hints: ['Мышь — прицел · клик — выстрел'],
  menuHint: 'Каждые 8 выстрелов потолок опускается',
  onPlay() { start(); },
  onMenu() { stopLoop(); Shell.showMenu(); },
});

const COLS = 11, R = 19, W = 460, H = 620;
const COLORS = ['#ff5d6c', '#ffd166', '#34f5a5', '#4da3ff', '#b388ff'];
const DROP_EVERY = 8;
let ui, ctx, scene = 'menu';
let grid, flying = [], popped = [], shots = 0, score = 0, level = 1;
let curColor = 0, nextColor = 0;
let aimA = -Math.PI / 2, shotsLeft = DROP_EVERY;

const ROWS_MAX = () => Math.floor((H - 170) / (R * 1.72));

function idx(r, c) { return r * COLS + c; }
function offRow(r) { return r % 2 ? R : 0; }
function rowY(r) { return 30 + r * R * 1.72; }
function colX(r, c) { return 20 + c * R * 2 + offRow(r); }
function colsInRow() { return COLS; }

function neighbors(r, c) {
  const even = r % 2 === 0;
  const list = [
    [r, c - 1], [r, c + 1],
    [r - 1, even ? c - 1 : c], [r - 1, even ? c : c + 1],
    [r + 1, even ? c - 1 : c], [r + 1, even ? c : c + 1],
  ];
  return list.filter(([rr, cc]) => rr >= 0 && rr < ROWS_MAX() + 6 && cc >= 0 && cc < COLS).map(([rr, cc]) => idx(rr, cc));
}

function newBoard() {
  grid = new Array((ROWS_MAX() + 6) * COLS).fill(-1);
  const rowsN = Math.min(4 + level, 7);
  for (let r = 0; r < rowsN; r++) {
    for (let c = 0; c < COLS; c++) {
      if (r > 2 && Math.random() < 0.12) continue;
      grid[idx(r, c)] = Shell.rnd(Math.min(COLORS.length, 3 + level));
    }
  }
}

function pickColor() {
  const used = new Set(grid.filter(v => v >= 0));
  const arr = [...used];
  return arr.length ? arr[Shell.rnd(arr.length)] : Shell.rnd(COLORS.length);
}

function start() {
  if (!ui) {
    ui = Shell.canvas(W, H, { pad: 230, maxW: 520 });
    ctx = ui.ctx;
    const cv = ui.cv;
    const aim = (e) => {
      const b = cv.getBoundingClientRect();
      const s = W / b.width;
      const x = ((e.clientX ?? 0) - b.left) * s, y = ((e.clientY ?? 0) - b.top) * s;
      aimA = Math.atan2(y - (H - 46), x - W / 2);
      aimA = Shell.clamp(aimA, -Math.PI + 0.35, -0.35);
    };
    cv.addEventListener('pointermove', (e) => { if (e.buttons || e.pointerType === 'mouse') aim(e); });
    cv.addEventListener('pointerdown', (e) => {
      SFX.ensure();
      if (scene !== 'play') return;
      aim(e);
      shoot();
    });
    window.addEventListener('keydown', (e) => {
      if (Shell.paused || scene !== 'play') return;
      if (e.code === 'ArrowLeft') aimA = Math.max(aimA - 0.06, -Math.PI + 0.35);
      if (e.code === 'ArrowRight') aimA = Math.min(aimA + 0.06, -0.35);
      if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); shoot(); }
    });
  }
  score = 0; level = 1; shots = 0; shotsLeft = DROP_EVERY;
  flying = []; popped = [];
  newBoard();
  curColor = pickColor(); nextColor = pickColor();
  Shell.setStat('score', 0);
  Shell.setStat('level', 1);
  scene = 'play';
  loop();
}

let last = 0;
function loop(t = 0) {
  if (scene !== 'play') return;
  const dt = Math.min(32, t - last); last = t;
  update(dt / 16.7);
  draw();
  requestAnimationFrame(loop);
}
function stopLoop() { scene = 'menu'; }

function shoot() {
  if (flying.length) return;
  flying.push({ x: W / 2, y: H - 46, vx: Math.cos(aimA) * 11, vy: Math.sin(aimA) * 11, color: curColor });
  curColor = nextColor; nextColor = pickColor();
  SFX.shoot();
}

function snap(x, y) {
  const r = Math.max(0, Math.round((y - 30) / (R * 1.72)));
  const c = Shell.clamp(Math.round((x - 20 - offRow(r)) / (R * 2)), 0, COLS - 1);
  return [r, c];
}

function popGroup(startIdxList, color) {
  const seen = new Set(startIdxList);
  const q = [...startIdxList];
  while (q.length) {
    const i = q.pop();
    const r = (i / COLS) | 0, c = i % COLS;
    for (const n of neighbors(r, c)) {
      if (!seen.has(n) && grid[n] === color) { seen.add(n); q.push(n); }
    }
  }
  if (seen.size < 3) return 0;
  let gained = 0;
  for (const i of seen) { grid[i] = -1; gained += 10; }
  // отвязанные
  const connected = new Set();
  const q2 = [];
  for (let c = 0; c < COLS; c++) if (grid[idx(0, c)] >= 0) { connected.add(idx(0, c)); q2.push(idx(0, c)); }
  while (q2.length) {
    const i = q2.pop();
    const r = (i / COLS) | 0, c = i % COLS;
    for (const n of neighbors(r, c)) {
      if (!connected.has(n) && grid[n] >= 0) { connected.add(n); q2.push(n); }
    }
  }
  let dropped = 0;
  for (let i = 0; i < grid.length; i++) {
    if (grid[i] >= 0 && !connected.has(i)) {
      grid[i] = -1; dropped++;
      const r = (i / COLS) | 0, c = i % COLS;
      popped.push({ x: colX(r, c), y: rowY(r), vy: -2 - Math.random() * 2, color: COLORS[0], life: 40 });
    }
  }
  gained += dropped * 20;
  if (gained) { score += gained; SFX.good(); Shell.setStat('score', score); }
  return seen.size;
}

function dropCeiling() {
  const max = ROWS_MAX() + 6;
  for (let r = max - 1; r > 0; r--) {
    for (let c = 0; c < COLS; c++) grid[idx(r, c)] = grid[idx(r - 1, c)];
  }
  for (let c = 0; c < COLS; c++) grid[idx(0, c)] = Shell.rnd(COLORS.length);
}

function update(k) {
  for (let fi = flying.length - 1; fi >= 0; fi--) {
    const b = flying[fi];
    let steps = 3;
    while (steps--) {
      b.x += b.vx * k / 3; b.y += b.vy * k / 3;
      if (b.x < 20 + R) { b.x = 20 + R; b.vx *= -1; }
      if (b.x > W - 20 - R) { b.x = W - 20 - R; b.vx *= -1; }
      if (b.y - R < 30) {
        const [r, c] = snap(b.x, 30 + R);
        grid[idx(r, c)] = b.color; flying.splice(fi, 1); SFX.click(); landChecks(); break;
      }
      // столкновение с сеткой
      const rr = Math.round((b.y - 30) / (R * 1.72));
      let hit = false;
      for (let dr = -1; dr <= 1 && !hit; dr++) {
        const r2 = rr + dr; if (r2 < 0) continue;
        for (let dc = -2; dc <= 2 && !hit; dc++) {
          const c2 = Shell.clamp(Math.round((b.x - 20 - offRow(r2)) / (R * 2)) + 0, 0, COLS - 1) + 0;
          for (const cc of new Set([c2, c2 - 1, c2 + 1])) {
            if (cc < 0 || cc >= COLS) continue;
            if (grid[idx(r2, cc)] < 0) continue;
            const dx = b.x - colX(r2, cc), dy = b.y - rowY(r2);
            if (dx * dx + dy * dy < (2 * R - 4) * (2 * R - 4)) hit = true;
          }
        }
      }
      if (hit) {
        const [r, c] = snap(b.x, b.y);
        grid[idx(r, c)] = b.color; flying.splice(fi, 1); SFX.click(); landChecks(); break;
      }
      if (b.y - R > H) { // улетела за нижний край (страховка)
        flying.splice(fi, 1);
      }
    }
  }
  for (let i = popped.length - 1; i >= 0; i--) {
    const p = popped[i];
    p.y += p.vy * k; p.vy += 0.3 * k; p.life -= k;
    if (p.life <= 0) popped.splice(i, 1);
  }
  // победа: пусто
  if (scene === 'play' && grid.every(v => v < 0)) {
    level++;
    Shell.setStat('level', level);
    shots = 0; shotsLeft = DROP_EVERY;
    newBoard();
    curColor = pickColor(); nextColor = pickColor();
    SFX.win();
  }
}

function landChecks() {
  shots++;
  shotsLeft = DROP_EVERY - (shots % DROP_EVERY);
  // найти группу вокруг места приземления — упрощённо: пройтись по всем цветам
  for (let r = 0; r < ROWS_MAX() + 6; r++) {
    for (let c = 0; c < COLS; c++) {
      const i = idx(r, c);
      if (grid[i] >= 0 && popGroupFrom(i, grid[i])) { r = ROWS_MAX() + 6; break; }
    }
  }
  if (shots % DROP_EVERY === 0) { dropCeiling(); SFX.bad(); }
  // проигрыш: пузырь на максимальном видимом ряду
  const limit = ROWS_MAX();
  for (let c = 0; c < COLS; c++) {
    if (grid[idx(limit, c)] >= 0) { gameOver(t('Линия достигнута')); return; }
  }
}

function popGroupFrom(i, color) {
  const seen = new Set([i]); const q = [i];
  while (q.length) {
    const j = q.pop();
    const r = (j / COLS) | 0, c = j % COLS;
    for (const n of neighbors(r, c)) {
      if (!seen.has(n) && grid[n] === color) { seen.add(n); q.push(n); }
    }
  }
  if (seen.size < 3) return false;
  let gained = seen.size * 10;
  for (const j of seen) grid[j] = -1;
  // отвязанные
  const conn = new Set(); const q2 = [];
  for (let c = 0; c < COLS; c++) if (grid[idx(0, c)] >= 0) { conn.add(idx(0, c)); q2.push(idx(0, c)); }
  while (q2.length) {
    const j = q2.pop();
    const r = (j / COLS) | 0, c = j % COLS;
    for (const n of neighbors(r, c)) if (!conn.has(n) && grid[n] >= 0) { conn.add(n); q2.push(n); }
  }
  for (let j = 0; j < grid.length; j++) {
    if (grid[j] >= 0 && !conn.has(j)) {
      grid[j] = -1; gained += 20;
      const r = (j / COLS) | 0, c = j % COLS;
      popped.push({ x: colX(r, c), y: rowY(r), vy: -2, life: 40 });
    }
  }
  score += gained;
  Shell.setStat('score', score);
  SFX.good();
  return true;
}

function gameOver(cause) {
  if (scene !== 'play') return;
  scene = 'over';
  const record = Shell.tryRecord(score);
  SFX.die();
  Shell.showOver({ cause, score, record, rows: [[t('Уровень'), level]] });
}

function draw() {
  const s = ui.scale();
  ctx.save();
  ctx.scale(s, s);
  ctx.clearRect(0, 0, W, H);
  // линия смерти
  ctx.strokeStyle = 'rgba(255,93,108,.55)';
  ctx.setLineDash([8, 8]);
  ctx.beginPath(); ctx.moveTo(12, H - 70); ctx.lineTo(W - 12, H - 70); ctx.stroke();
  ctx.setLineDash([]);
  // пузыри
  for (let r = 0; r < ROWS_MAX() + 6; r++) {
    for (let c = 0; c < COLS; c++) {
      const v = grid[idx(r, c)];
      if (v < 0) continue;
      drawBubble(colX(r, c), rowY(r), COLORS[v]);
    }
  }
  // летящие
  for (const b of flying) drawBubble(b.x, b.y, COLORS[b.color]);
  // падающие
  for (const p of popped) { ctx.globalAlpha = Math.max(0, p.life / 40); drawBubble(p.x, p.y, '#8ea0bf'); ctx.globalAlpha = 1; }
  // прицел
  ctx.strokeStyle = 'rgba(142,160,191,.7)';
  ctx.setLineDash([4, 10]);
  ctx.beginPath();
  ctx.moveTo(W / 2, H - 46);
  ctx.lineTo(W / 2 + Math.cos(aimA) * 150, H - 46 + Math.sin(aimA) * 150);
  ctx.stroke();
  ctx.setLineDash([]);
  // пушка и шары
  drawBubble(W / 2, H - 46, COLORS[curColor]);
  ctx.strokeStyle = '#8ea0bf'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(W / 2, H - 46, R + 6, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
  drawBubble(W / 2 + 44, H - 30, COLORS[nextColor], 0.7);
  ctx.fillStyle = '#8ea0bf'; ctx.font = '12px system-ui'; ctx.textAlign = 'center';
  ctx.fillText(t('Выстрелов до спуска: ') + shotsLeft, W / 2, H - 8);
  ctx.restore();
}

function drawBubble(x, y, color, scale = 1) {
  const r = R * 0.92 * scale;
  ctx.beginPath();
  ctx.fillStyle = color;
  ctx.arc(x, y, r, 0, 7);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  ctx.beginPath();
  ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.35, 0, 7);
  ctx.fill();
}

Shell.el('board').addEventListener('contextmenu', e => e.preventDefault());
