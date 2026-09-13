'use strict';

/* Судоку: генератор с единственным решением. Конфликты подсвечиваются сразу. */
Shell.init({
  rules: `Выбери пустую клетку, затем цифру 1–9 (кнопки внизу); ✕ — стереть.
В каждой строке, столбце и блоке 3×3 все цифры разные — конфликты сразу краснеют.
У каждой головоломки ровно одно решение. Победа — полное поле без конфликтов; рекорд — время решения.`,
  id: 'sudoku',
  icon: '🔟',
  title: 'СУДОКУ',
  tagline: 'Заполни поле 9×9: в строках, столбцах и блоках 3×3 — цифры 1–9 без повторов',
  stats: [['time', 'Время'], ['best', 'Рекорд']],
  bestKey: 'sudoku.best',
  bestLower: true,
  bestZero: '—',
  bestFmt: v => Shell.fmtTime(v),
  hints: ['Выбери клетку, затем цифру', 'Красное — конфликт'],
  onPlay() { start(); },
  onMenu() { Shell.showMenu(); },
});

let puzzle, fixed, cells, sel = -1, t0 = 0, timer = null, done = false;

function okAt(b, r, c, v) {
  for (let k = 0; k < 9; k++) {
    if (k !== c && b[r * 9 + k] === v) return false;
    if (k !== r && b[k * 9 + c] === v) return false;
  }
  const br = ((r / 3) | 0) * 3, bc = ((c / 3) | 0) * 3;
  for (let rr = br; rr < br + 3; rr++)
    for (let cc = bc; cc < bc + 3; cc++)
      if ((rr !== r || cc !== c) && b[rr * 9 + cc] === v) return false;
  return true;
}

function solveCount(b, limit = 2) {
  // число решений (не более limit)
  const i = b.indexOf(0);
  if (i === -1) return 1;
  let count = 0;
  for (let v = 1; v <= 9; v++) {
    if (okAt(b, (i / 9) | 0, i % 9, v)) {
      b[i] = v;
      count += solveCount(b, limit - count);
      b[i] = 0;
      if (count >= limit) break;
    }
  }
  return count;
}

function generate() {
  // базовое решение случайным заполнением
  const b = Array(81).fill(0);
  (function fill(i) {
    if (i === 81) return true;
    const r = (i / 9) | 0, c = i % 9;
    const vals = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
    for (const v of vals) {
      if (okAt(b, r, c, v)) {
        b[i] = v;
        if (fill(i + 1)) return true;
        b[i] = 0;
      }
    }
    return false;
  })(0);
  // выкалываем клетки, сохраняя единственность
  const order = [...Array(81).keys()].sort(() => Math.random() - 0.5);
  let removed = 0;
  for (const i of order) {
    if (removed >= 45) break;
    const save = b[i];
    b[i] = 0;
    if (solveCount([...b]) !== 1) b[i] = save;
    else removed++;
  }
  return b;
}

function buildDom() {
  const st = Shell.stage();
  st.innerHTML = `
    <p class="timerow" id="sTime"></p>
    <div class="sgrid" id="sgrid"></div>
    <div class="snum" id="snum">
      ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(v => `<button data-v="${v}">${v}</button>`).join('')}
      <button class="del" data-v="0">✕</button>
    </div>`;
  st.querySelectorAll('.snum button').forEach(b =>
    b.addEventListener('click', () => put(+b.dataset.v)));
}

function draw() {
  const g = $('sgrid');
  g.innerHTML = cells.map((v, i) => {
    const r = (i / 9) | 0, c = i % 9;
    const bad = v && !okAt(cells, r, c, v);
    const cls = [
      'scell',
      fixed[i] ? 'fix' : 'user',
      bad ? 'bad' : '',
      sel === i ? 'sel' : '',
      c === 2 || c === 5 ? 'br' : '',
      r === 2 || r === 5 ? 'bb' : '',
    ].join(' ');
    return `<div class="${cls}" data-i="${i}">${v || ''}</div>`;
  }).join('');
  g.querySelectorAll('.scell').forEach(el =>
    el.addEventListener('click', () => {
      const i = +el.dataset.i;
      if (!fixed[i]) {
        sel = sel === i ? -1 : i;
        draw();
      }
    }));
}

function put(v) {
  SFX.ensure();
  if (sel === -1 || done) return;
  cells[sel] = v === 0 ? 0 : v;
  SFX.place();
  draw();
  if (cells.every(x => x) && cells.every((x, i) => okAt(cells, (i / 9) | 0, i % 9, x))) {
    done = true;
    clearInterval(timer);
    const secs = Math.round((performance.now() - t0) / 1000);
    const record = Shell.tryRecord(secs);
    SFX.win();
    Shell.showOver({
      won: true,
      cause: 'Судоку решено!',
      score: null,
      rows: [['Время', Shell.fmtTime(secs)]],
      record,
    });
  }
}

function start() {
  puzzle = generate();
  cells = [...puzzle];
  fixed = puzzle.map(v => v > 0);
  sel = -1; done = false;
  t0 = performance.now();
  clearInterval(timer);
  timer = setInterval(() => {
    Shell.setStat('time', Shell.fmtTime((performance.now() - t0) / 1000));
  }, 500);
  buildDom();
  draw();
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) clearInterval(timer);
  else if (!done) {
    timer = setInterval(() => {
      Shell.setStat('time', Shell.fmtTime((performance.now() - t0) / 1000));
    }, 500);
  }
});

start();
