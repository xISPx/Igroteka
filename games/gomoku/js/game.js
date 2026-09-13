'use strict';

/* Гомоку: собери 5 фишек в ряд на доске 15×15 раньше ИИ. */
Shell.init({
  rules: `Клик по пустой клетке — ставишь чёрную фишку. ИИ отвечает белой.
Побеждает первый, собравший 5 своих фишек в ряд — по вертикали, горизонтали или диагонали.
ИИ ставит фишки рядом с твоими и перекрывает длинные линии — строй сразу несколько угроз.`,
  id: 'gomoku',
  icon: '⚫',
  title: 'ГОМОКУ',
  tagline: 'Собери пять фишек в ряд по вертикали, горизонтали или диагонали',
  stats: [['best', 'Победы']],
  bestKey: 'gomoku.wins',
  bestLabel: 'Побед над ИИ',
  hints: ['Клик по пустой клетке — поставить фишку'],
  onPlay() { start(); },
  onMenu() { Shell.showMenu(); },
});

const N = 15;
let board, over, lock, lastMove = -1;
const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];

function idx(r, c) { return r * N + c; }
function inB(r, c) { return r >= 0 && c >= 0 && r < N && c < N; }

function lineLen(r, c, p) {
  for (const [dr, dc] of DIRS) {
    let count = 1;
    for (const s of [1, -1]) {
      let rr = r + dr * s, cc = c + dc * s;
      while (inB(rr, cc) && board[idx(rr, cc)] === p) { count++; rr += dr * s; cc += dc * s; }
    }
    if (count >= 5) return true;
  }
  return false;
}

function scoreCell(r, c, p) {
  // оценим клетку для игрока p: суммы длин открытых линий
  let total = 0;
  for (const [dr, dc] of DIRS) {
    let cnt = 1, open = 0;
    for (const s of [1, -1]) {
      let rr = r + dr * s, cc = c + dc * s;
      while (inB(rr, cc) && board[idx(rr, cc)] === p) { cnt++; rr += dr * s; cc += dc * s; }
      if (inB(rr, cc) && board[idx(rr, cc)] === 0) open++;
    }
    if (cnt >= 5) total += 100000;
    else if (cnt === 4) total += open === 2 ? 8000 : open === 1 ? 900 : 0;
    else if (cnt === 3) total += open === 2 ? 500 : open === 1 ? 60 : 0;
    else if (cnt === 2) total += open === 2 ? 30 : 5;
  }
  return total;
}

function aiPick() {
  let best = -1, bestV = -Infinity;
  for (let r = 0; r < N; r++)
    for (let c = 0; c < N; c++) {
      const i = idx(r, c);
      if (board[i]) continue;
      // только рядом с существующими фишками (или центр в начале)
      let near = false;
      for (let dr = -1; dr <= 1 && !near; dr++)
        for (let dc = -1; dc <= 1; dc++)
          if (inB(r + dr, c + dc) && board[idx(r + dr, c + dc)]) { near = true; break; }
      if (!near) continue;
      const v = scoreCell(r, c, 2) * 1.1 + scoreCell(r, c, 1);
      if (v > bestV) { bestV = v; best = i; }
    }
  if (best === -1) best = idx(7, 7);
  return best;
}

function draw() {
  Shell.stage().innerHTML = '<div class="gboard">' +
    board.map((v, i) => {
      const cls = i === lastMove ? 'lastg' : '';
      return `<div class="gcell ${cls}" data-i="${i}">${v ? `<div class="stone ${v === 1 ? 'b' : 'w'}"></div>` : ''}</div>`;
    }).join('') + '</div>';
  Shell.stage().querySelectorAll('.gcell').forEach(el =>
    el.addEventListener('click', () => play(+el.dataset.i)));
}

function play(i) {
  if (over || lock || board[i]) return;
  board[i] = 1;
  lastMove = i;
  SFX.place();
  if (lineLen((i / N) | 0, i % N, 1)) { draw(); return finish(true); }
  draw();
  lock = true;
  setTimeout(() => {
    if (over) return;
    const m = aiPick();
    board[m] = 2;
    lastMove = m;
    SFX.place();
    draw();
    lock = false;
    if (lineLen((m / N) | 0, m % N, 2)) { over = true; finish(false); }
  }, 400);
}

function finish(won) {
  over = true;
  if (won) {
    const first = Shell.bumpWins();
    SFX.win();
    Shell.showOver({ won: true, cause: 'Пять в ряд!', score: null, record: first });
  } else {
    SFX.bad();
    Shell.showOver({ cause: 'ИИ собрал пять', score: null });
  }
}

function start() {
  board = Array(N * N).fill(0);
  over = false; lock = false; lastMove = -1;
  draw();
}

start();
