'use strict';

/* Поток: соедини пары одинаковых точек линиями и заполни всё поле.
   Линии не пересекаются. Поле заполнено целиком — уровень пройден.
   Уровни генерируются детерминированно (змейка, разрезанная на сегменты). */
Shell.init({
  rules: `Тяни от точки её цвета — за курсором потянется линия. Соедини две одинаковые точки.
Линии не пересекаются; клик по линии стирает её. Уровень решён, когда поле заполнено целиком.
12 уровней: от 5×5 до 7×7. Рекорд — максимальный уровень за партию.`,
  id: 'flow',
  icon: '🌈',
  title: 'ПОТОК',
  tagline: 'Соедини пары цветных точек, заполнив всё поле',
  stats: [['level', 'Уровень'], ['best', 'Рекорд']],
  bestKey: 'flow.best',
  hints: ['Тяни от точки к паре · линии не пересекаются'],
  menuHint: 'Поле должно быть заполнено целиком',
  onPlay() { start(); },
  onMenu() { Shell.showMenu(); },
});

function rng(seed) {
  let s = seed * 1103515245 + 12345;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function makePuzzle(n, k, seed) {
  const rand = rng(seed);
  const cells = [];
  for (let r = 0; r < n; r++) {
    if (r % 2 === 0) for (let c = 0; c < n; c++) cells.push([r, c]);
    else for (let c = n - 1; c >= 0; c--) cells.push([r, c]);
  }
  // k-1 разрезов, сегменты длиной >= 2
  let cuts = [];
  for (let tries = 0; tries < 200; tries++) {
    cuts = [];
    while (cuts.length < k - 1) {
      const p = 2 + ((rand() * (cells.length - 4)) | 0);
      if (!cuts.includes(p)) cuts.push(p);
    }
    cuts.sort((a, b) => a - b);
    const bounds = [0, ...cuts, cells.length];
    let ok = true;
    for (let i = 0; i < bounds.length - 1; i++) {
      if (bounds[i + 1] - bounds[i] < 2) { ok = false; break; }
    }
    if (ok) break;
  }
  const bounds = [0, ...cuts, cells.length];
  const grid = Array.from({ length: n }, () => Array(n).fill('.'));
  const letters = 'ABCDEFGHIJ';
  for (let s = 0; s < bounds.length - 1; s++) {
    const seg = cells.slice(bounds[s], bounds[s + 1]);
    if (seg.length < 2) continue;
    const ch = letters[s % letters.length];
    grid[seg[0][0]][seg[0][1]] = ch;
    grid[seg[seg.length - 1][0]][seg[seg.length - 1][1]] = ch;
  }
  return grid.map(row => row.join(''));
}

const LEVEL_SIZES = [[5, 3], [5, 4], [5, 4], [6, 4], [6, 5], [6, 5], [6, 6], [7, 5], [7, 6], [7, 6], [7, 7], [7, 7]];
const LEVELS = LEVEL_SIZES.map(([n, k], i) => makePuzzle(n, k, i * 977 + 13));

let size = 5, pairs = {}, paths = {}, cur = null, levelIdx = 0;
let boardEl = null;

function parseLevel(i) {
  const rows = LEVELS[i];
  size = rows[0].length;
  pairs = {}; paths = {};
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const ch = rows[r][c];
      if (ch === '.') continue;
      (pairs[ch] = pairs[ch] || []).push([r, c]);
      paths[ch] = [];
    }
  }
}

function cellColorAt(r, c) {
  for (const ch in paths) {
    if ((paths[ch] || []).some(([rr, cc]) => rr === r && cc === c)) return ch;
  }
  return null;
}

function build() {
  if (boardEl) boardEl.remove();
  boardEl = document.createElement('div');
  boardEl.className = 'flowboard';
  boardEl.style.gridTemplateColumns = `repeat(${size}, 44px)`;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const d = document.createElement('div');
      d.className = 'cell';
      d.dataset.r = r; d.dataset.c = c;
      boardEl.appendChild(d);
    }
  }
  boardEl.addEventListener('pointerdown', onDown);
  boardEl.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  Shell.stage().appendChild(boardEl);
  paint();
}

function cellOf(e) {
  const b = boardEl.getBoundingClientRect();
  const c = Math.floor((e.clientX - b.left) / (b.width / size));
  const r = Math.floor((e.clientY - b.top) / (b.height / size));
  if (r < 0 || c < 0 || r >= size || c >= size) return null;
  return [r, c];
}

function endpointOwner(r, c) {
  for (const ch in pairs) {
    if (pairs[ch].some(([rr, cc]) => rr === r && cc === c)) return ch;
  }
  return null;
}

function onDown(e) {
  const p = cellOf(e);
  if (!p) return;
  SFX.ensure();
  const [r, c] = p;
  const owner = endpointOwner(r, c);
  if (owner) {
    cur = owner;
    paths[owner] = [[r, c]];
    boardEl.setPointerCapture(e.pointerId);
  } else {
    const mid = cellColorAt(r, c);
    if (mid) paths[mid] = [];
    cur = null;
  }
  paint();
}

function onMove(e) {
  if (!cur) return;
  if (e.buttons === 0 && e.pointerType === 'mouse') return;
  const p = cellOf(e);
  if (!p) return;
  const [r, c] = p;
  const path = paths[cur];
  // откат по своей линии
  for (let i = 0; i < path.length; i++) {
    if (path[i][0] === r && path[i][1] === c) {
      while (path.length > i + 1) path.pop();
      paint();
      return;
    }
  }
  const lastCell = path[path.length - 1];
  if (!lastCell) return;
  if (Math.abs(lastCell[0] - r) + Math.abs(lastCell[1] - c) !== 1) return;
  // чужая точка — нельзя
  if (endpointOwner(r, c) && endpointOwner(r, c) !== cur) return;
  // своя вторая точка — соединили
  if (endpointOwner(r, c) === cur) {
    path.push([r, c]);
    cur = null;
    SFX.place();
    paint();
    checkWin();
    return;
  }
  // перекрываем чужую линию в этой клетке
  const other = cellColorAt(r, c);
  if (other && other !== cur) paths[other] = paths[other].filter(([rr, cc]) => !(rr === r && cc === c));
  path.push([r, c]);
  SFX.click();
  paint();
  checkWin();
}

function onUp() { cur = null; }

function paint() {
  for (const d of boardEl.children) {
    const r = +d.dataset.r, c = +d.dataset.c;
    d.className = 'cell';
    d.innerHTML = '';
    const owner = endpointOwner(r, c);
    if (owner) {
      d.classList.add('end');
      const dot = document.createElement('span');
      dot.className = 'dot c' + (owner.charCodeAt(0) - 65) % 6;
      d.appendChild(dot);
      continue;
    }
    const ch = cellColorAt(r, c);
    if (ch) d.classList.add('c' + (ch.charCodeAt(0) - 65) % 6);
  }
}

function checkWin() {
  let filled = 0;
  for (const ch in paths) filled += paths[ch].length;
  if (filled < size * size) return;
  for (const ch in pairs) {
    if (!paths[ch] || paths[ch].length < 2) return;
    const [a, b] = pairs[ch];
    const f = paths[ch][0], l = paths[ch][paths[ch].length - 1];
    const straight = (f[0] === a[0] && f[1] === a[1] && l[0] === b[0] && l[1] === b[1]) ||
                     (f[0] === b[0] && f[1] === b[1] && l[0] === a[0] && l[1] === a[1]);
    if (!straight) return;
  }
  SFX.win();
  levelIdx++;
  Shell.tryRecord(levelIdx);
  Shell.setStat('level', Math.min(levelIdx + 1, LEVELS.length));
  if (levelIdx >= LEVELS.length) {
    Shell.showOver({ won: true, cause: t('Все 12 уровней пройдены!'), score: null, record: true });
  } else {
    parseLevel(levelIdx);
    build();
  }
}

function start() {
  levelIdx = 0;
  Shell.setStat('level', 1);
  parseLevel(0);
  build();
}
