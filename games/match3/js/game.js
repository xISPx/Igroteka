'use strict';

/* Три-в-ряд: меняй соседние кристаллы, собирай линии из трёх и более.
   Каскады дороже. 90 секунд. */
Shell.init({
  rules: `Кликни кристалл, затем соседний — они поменяются местами.
Три и более одинаковых в линию исчезают: верхние падают, сверху сыпятся новые.
Каскады (когда срабатывает само после падения) дают всё больше очков за кристалл.
90 секунд — собери максимум.`,
  id: 'match3',
  icon: '💎',
  title: 'ТРИ-В-РЯД',
  tagline: 'Меняй соседние кристаллы местами и собирай линии из трёх и более',
  stats: [['score', 'Счёт'], ['time', 'Время'], ['best', 'Рекорд']],
  bestKey: 'match3.best',
  hints: ['Клик — выбрать, клик по соседу — поменять'],
  onPlay() { start(); },
  onMenu() { stop(); Shell.showMenu(); },
});

const M = 8;
const GEMS = ['🔴', '🟡', '🟢', '🔵', '🟣', '🟠'];
let grid = [], els = [], sel = -1, busy = false;
let score = 0, tEnd = 0, running = false, timer = null;

function buildDom() {
  Shell.stage().innerHTML = `
    <p class="m3hint" id="m3hint"></p>
    <div class="m3board" id="m3board"></div>`;
}

function newGrid() {
  do {
    grid = Array.from({ length: M * M }, () => Shell.rnd(GEMS.length));
  } while (findMatches().length);
  render();
}

function rc(i) { return { r: (i / M) | 0, c: i % M }; }
function idx(r, c) { return r * M + c; }
function inside(r, c) { return r >= 0 && c >= 0 && r < M && c < M; }

function findMatches() {
  const out = new Set();
  for (let r = 0; r < M; r++)
    for (let c = 0; c < M; c++) {
      const v = grid[idx(r, c)];
      if (v < 0) continue;
      if (c + 2 < M && grid[idx(r, c + 1)] === v && grid[idx(r, c + 2)] === v)
        for (let k = 0; k < 3; k++) out.add(idx(r, c + k));
      if (r + 2 < M && grid[idx(r + 1, c)] === v && grid[idx(r + 2, c)] === v)
        for (let k = 0; k < 3; k++) out.add(idx(r + k, c));
    }
  return [...out];
}

function render() {
  const b = $('m3board');
  b.innerHTML = grid.map((v, i) => {
    const { r, c } = rc(i);
    return `<div class="m3tile ${sel === i ? 'sel' : ''}" data-i="${i}"
      style="left:${c * 12 + 1}%;top:${r * 12 + 1}%">${v >= 0 ? GEMS[v] : ''}</div>`;
  }).join('');
  b.querySelectorAll('.m3tile').forEach(el =>
    el.addEventListener('click', () => click(+el.dataset.i)));
}

function click(i) {
  SFX.ensure();
  if (busy || !running || grid[i] < 0) return;
  if (sel === -1) {
    sel = i;
    SFX.click();
    render();
    return;
  }
  if (sel === i) {
    sel = -1;
    render();
    return;
  }
  const a = rc(sel), b2 = rc(i);
  const adjacent = Math.abs(a.r - b2.r) + Math.abs(a.c - b2.c) === 1;
  if (!adjacent) {
    sel = i;
    SFX.click();
    render();
    return;
  }
  swapAndCheck(sel, i);
}

function swapAndCheck(i1, i2) {
  busy = true;
  sel = -1;
  [grid[i1], grid[i2]] = [grid[i2], grid[i1]];
  render();
  const matches = findMatches();
  if (!matches.length) {
    SFX.bad();
    $('m3hint').textContent = 'Нет линии — возврат';
    setTimeout(() => {
      [grid[i1], grid[i2]] = [grid[i2], grid[i1]];
      render();
      busy = false;
    }, 220);
  } else {
    SFX.good();
    resolve(0);
  }
}

function resolve(cascade) {
  const matches = findMatches();
  if (!matches.length) {
    busy = false;
    return;
  }
  for (const i of matches) {
    const el = $('m3board').children[i];
    if (el) el.classList.add('clear');
  }
  const pts = matches.length * 10 * (cascade + 1);
  score += pts;
  Shell.setStat('score', score);
  if (cascade > 0) $('m3hint').textContent = '🔥 Каскад ×' + (cascade + 1) + ' (+' + pts + ')';
  SFX.tone(400 + cascade * 90, 0.1, { type: 'triangle', vol: 0.5 });
  setTimeout(() => {
    for (const i of matches) grid[i] = -1;
    applyGravity();
    render();
    setTimeout(() => resolve(cascade + 1), 190);
  }, 180);
}

function applyGravity() {
  for (let c = 0; c < M; c++) {
    let write = M - 1;
    for (let r = M - 1; r >= 0; r--) {
      const v = grid[idx(r, c)];
      if (v >= 0) {
        grid[idx(write, c)] = v;
        if (write !== r) grid[idx(r, c)] = -1;
        write--;
      }
    }
    for (let r = write; r >= 0; r--) grid[idx(r, c)] = Shell.rnd(GEMS.length);
  }
}

function tick() {
  const left = Math.max(0, tEnd - performance.now());
  Shell.setStat('time', Math.ceil(left / 1000) + ' с');
  if (left <= 0) {
    running = false;
    clearTimeout(timer);
    const record = Shell.tryRecord(score);
    SFX.win();
    Shell.showOver({ cause: 'Время вышло', score, record });
    return;
  }
  timer = setTimeout(tick, 250);
}

function start() {
  buildDom();
  score = 0;
  Shell.setStat('score', 0);
  tEnd = performance.now() + 90000;
  running = true;
  newGrid();
  tick();
}

function stop() {
  running = false;
  clearTimeout(timer);
}

buildDom();
