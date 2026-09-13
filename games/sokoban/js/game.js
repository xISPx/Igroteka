'use strict';

/* Сокобан: поставь все ящики на жёлтые цели. Z — отмена, R — заново. */
Shell.init({
  rules: `Стрелки/WASD — движение, на телефоне — свайпы.
Толкай ящики 📦 на жёлтые цели. Толкать можно только по одному и только от себя — тянуть нельзя, ящик у стены не повернуть.
Z — отмена хода (можно много раз), R — уровень заново.
Пройди все 6 уровней; рекорд — ходы на последнем уровне.`,
  id: 'sokoban',
  icon: '📦',
  title: 'СОКОБАН',
  tagline: 'Толкай ящики на цели. Ящик можно только толкать — не тяни в тупик!',
  stats: [['level', 'Уровень'], ['moves', 'Ходы'], ['best', 'Рекорд']],
  bestKey: 'sokoban.best',
  bestLower: true,
  bestZero: '—',
  bestFmt: v => v + ' ход.',
  hints: ['Стрелки/WASD — движение', 'Z — отмена · R — заново · свайпы'],
  onPlay() { startLevel(1); },
  onMenu() { Shell.showMenu(); },
});

/* # стена, @ игрок, $ ящик, . цель, * ящик на цели, + игрок на цели, пробел пол */
const LEVELS = [
  [
    '######',
    '#    #',
    '# $. #',
    '# @  #',
    '######',
  ],
  [
    '#######',
    '#     #',
    '# .$. #',
    '# $@$ #',
    '#  .  #',
    '#######',
  ],
  [
    '########',
    '#      #',
    '# .**@ #',
    '# $  . #',
    '#   #  #',
    '########',
  ],
  [
    '########',
    '#  #   #',
    '# .$ . #',
    '#  $@  #',
    '# .#   #',
    '########',
  ],
  [
    '#########',
    '#   #   #',
    '# $ . $ #',
    '#  ...  #',
    '# @ $ . #',
    '#   #   #',
    '#########',
  ],
  [
    '#########',
    '##  .  ##',
    '#  $$$  #',
    '# .@.$ .#',
    '#  $$$  #',
    '##  .  ##',
    '#########',
  ],
];

let grid = [], px = 0, py = 0, moves = 0, history = [], levelNum = 1, totalBest = null;

function parseLevel(num) {
  const rows = LEVELS[num - 1];
  grid = []; history = []; moves = 0;
  for (let r = 0; r < rows.length; r++) {
    grid[r] = [];
    for (let c = 0; c < rows[r].length; c++) {
      const ch = rows[r][c];
      let cell = { wall: ch === '#', goal: '.=*+'.includes(ch), box: '$*'.includes(ch) };
      if ('@+'.includes(ch)) { px = c; py = r; }
      grid[r][c] = cell;
    }
  }
  Shell.setStat('level', num + ' / ' + LEVELS.length);
  Shell.setStat('moves', 0);
  draw();
}

function draw() {
  const cols = Math.max(...grid.map(r => r.length));
  Shell.stage().innerHTML =
    `<p class="lvlrow" id="skStatus"></p>
     <div class="smap" style="grid-template-columns:repeat(${cols},var(--cs));--cs:${cellSize()}px">` +
    grid.map((row, r) => row.map((cell, c) => {
      let content = '';
      const cls = ['scell2'];
      if (cell.wall) cls.push('wall');
      if (cell.goal) cls.push('goal');
      if (cell.box) content = cell.goal ? '🟡' : '📦';
      else if (r === py && c === px) content = '🧑';
      return `<div class="${cls.join(' ')}">${content}</div>`;
    }).join('')).join('') + '</div>' +
    `<div class="sbtns">
      <button class="btn ghost" id="skUndo">↩ Отмена (Z)</button>
      <button class="btn ghost" id="skReset">R — заново</button>
    </div>`;
  $('skUndo').addEventListener('click', undo);
  $('skReset').addEventListener('click', () => parseLevel(levelNum));
}

function cellSize() {
  const cols = Math.max(...grid.map(r => r.length));
  const rows = grid.length;
  return Shell.clamp(Math.floor(Math.min(window.innerWidth - 60, 560) / cols), 22, 46);
}

function tryMove(dx, dy) {
  if (Shell.paused) return;
  const nx = px + dx, ny = py + dy;
  const cell = grid[ny] && grid[ny][nx];
  if (!cell || cell.wall) return;
  history.push({
    px, py,
    boxFrom: cell.box ? { x: nx, y: ny } : null,
    boxTo: cell.box ? { x: nx + dx, y: ny + dy } : null,
  });
  if (cell.box) {
    const bx2 = nx + dx, by2 = ny + dy;
    const next = grid[by2] && grid[by2][bx2];
    if (!next || next.wall || next.box) { history.pop(); SFX.bad(); return; }
    next.box = true;
    cell.box = false;
    SFX.whack();
  } else {
    SFX.move();
  }
  px = nx; py = ny;
  moves++;
  Shell.setStat('moves', moves);
  draw();
  checkWin();
}

function undo() {
  const h = history.pop();
  if (!h) return;
  if (h.boxTo) {
    grid[h.boxTo.y][h.boxTo.x].box = false;
    grid[h.boxFrom.y][h.boxFrom.x].box = true;
  }
  px = h.px; py = h.py;
  moves++;
  Shell.setStat('moves', moves);
  SFX.click();
  draw();
}

function checkWin() {
  for (const row of grid)
    for (const cell of row)
      if (cell.box && !cell.goal) return;
  SFX.good();
  if (levelNum < LEVELS.length) {
    levelNum++;
    setTimeout(() => {
      Shell.showOver({
        won: true,
        cause: 'Уровень ' + (levelNum - 1) + ' пройден за ' + moves + ' ходов',
        score: null,
        rows: [['Уровень', levelNum - 1], ['Ходы', moves]],
        delay: 250,
      });
      // «Заново» ведёт к следующему уровню: подменяем обработчик через onPlay
      Shell.cfg.onPlay = () => startLevel(levelNum);
    }, 100);
  } else {
    const record = Shell.tryRecord(moves);
    setTimeout(() => Shell.showOver({
      won: true,
      cause: 'Все уровни пройдены! Последний — за ' + moves + ' ходов',
      score: null,
      rows: [['Ходы', moves]],
      record,
    }), 100);
  }
}

function startLevel(n) {
  levelNum = n;
  parseLevel(n);
}

window.addEventListener('keydown', e => {
  SFX.ensure();
  if ($('menuOverlay') && !$('menuOverlay').classList.contains('hidden')) return;
  const map = {
    ArrowUp: [0, -1], KeyW: [0, -1],
    ArrowDown: [0, 1], KeyS: [0, 1],
    ArrowLeft: [-1, 0], KeyA: [-1, 0],
    ArrowRight: [1, 0], KeyD: [1, 0],
  };
  if (map[e.code]) { e.preventDefault(); tryMove(...map[e.code]); }
  else if (e.code === 'KeyZ') undo();
  else if (e.code === 'KeyR') parseLevel(levelNum);
});

let tstart = null;
Shell.stage(); // touch
document.getElementById('stage').addEventListener('touchstart', e => {
  if (e.touches.length === 1) tstart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
}, { passive: true });
document.getElementById('stage').addEventListener('touchend', e => {
  if (!tstart) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - tstart.x, dy = t.clientY - tstart.y;
  tstart = null;
  if (Math.hypot(dx, dy) < 24) return;
  if (Math.abs(dx) > Math.abs(dy)) tryMove(dx > 0 ? 1 : -1, 0);
  else tryMove(0, dy > 0 ? 1 : -1);
});

startLevel(1);
