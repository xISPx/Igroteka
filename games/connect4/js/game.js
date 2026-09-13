'use strict';

/* Соедини 4: собери четыре фишки в линию раньше ИИ (minimax, глубина 4). */
Shell.init({
  rules: `Кликни по колонке — фишка упадёт в нижнюю свободную клетку.
Собери четыре свои фишки подряд: по горизонтали, вертикали или диагонали — раньше ИИ.
ИИ просчитывает на несколько ходов вперёд и сразу блокирует три твоих в ряд — начинай с центральных колонок.`,
  id: 'connect4',
  icon: '🔵',
  title: 'СОЕДИНИ 4',
  tagline: 'Бросай фишки в колонки и собери четыре в ряд раньше ИИ',
  stats: [['best', 'Победы']],
  bestKey: 'connect4.wins',
  bestLabel: 'Побед над ИИ',
  hints: ['Клик по колонке — бросить фишку'],
  onPlay() { start(); },
  onMenu() { Shell.showMenu(); },
});

const CW = 7, CH = 6;
let board, over, lock;

function lowest(b, c) {
  for (let r = CH - 1; r >= 0; r--) if (!b[r][c]) return r;
  return -1;
}

function winLine(b, p) {
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (let r = 0; r < CH; r++)
    for (let c = 0; c < CW; c++) {
      if (b[r][c] !== p) continue;
      for (const [dr, dc] of dirs) {
        const line = [[r, c]];
        for (let k = 1; k < 4; k++) {
          const rr = r + dr * k, cc = c + dc * k;
          if (rr < 0 || rr >= CH || cc < 0 || cc >= CW || b[rr][cc] !== p) break;
          line.push([rr, cc]);
        }
        if (line.length === 4) return line;
      }
    }
  return null;
}

function evalBoard(b) {
  let score = 0;
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (let r = 0; r < CH; r++)
    for (let c = 0; c < CW; c++)
      for (const [dr, dc] of dirs) {
        const er = r + dr * 3, ec = c + dc * 3;
        if (er < 0 || er >= CH || ec < 0 || ec >= CW) continue;
        let ai = 0, pl = 0;
        for (let k = 0; k < 4; k++) {
          const v = b[r + dr * k][c + dc * k];
          if (v === 2) ai++; else if (v === 1) pl++;
        }
        if (ai && !pl) score += [0, 1, 5, 40][ai];
        if (pl && !ai) score -= [0, 1, 6, 50][pl];
      }
  return score;
}

function minimax(b, depth, alpha, beta, aiTurn) {
  const wAi = winLine(b, 2), wPl = winLine(b, 1);
  if (wAi) return 10000 + depth * 10;
  if (wPl) return -10000 - depth * 10;
  let moves = 0;
  for (let c = 0; c < CW; c++) if (b[0][c] === 0) moves++;
  if (!moves || depth === 0) return evalBoard(b);
  let best = aiTurn ? -Infinity : Infinity;
  // сначала центральные колонки — лучше отсечение
  const order = [3, 2, 4, 1, 5, 0, 6];
  for (const c of order) {
    const r = lowest(b, c);
    if (r === -1) continue;
    b[r][c] = aiTurn ? 2 : 1;
    const v = minimax(b, depth - 1, alpha, beta, !aiTurn);
    b[r][c] = 0;
    if (aiTurn) {
      if (v > best) best = v;
      alpha = Math.max(alpha, best);
    } else {
      if (v < best) best = v;
      beta = Math.min(beta, best);
    }
    if (beta <= alpha) break;
  }
  return best;
}

function aiMove() {
  if (over) return;
  let bestV = -Infinity, picks = [];
  const order = [3, 2, 4, 1, 5, 0, 6];
  for (const c of order) {
    const r = lowest(board, c);
    if (r === -1) continue;
    board[r][c] = 2;
    const v = minimax(board, 3, -Infinity, Infinity, false);
    board[r][c] = 0;
    if (v > bestV) { bestV = v; picks = [c]; }
    else if (v === bestV) picks.push(c);
  }
  drop(picks[Shell.rnd(picks.length)], 2, false);
}

function draw(highlight = []) {
  const hs = new Set(highlight.map(([r, c]) => r * CW + c));
  Shell.stage().innerHTML = '<div class="c4board">' +
    board.map((row, r) => row.map((v, c) => {
      const i = r * CW + c;
      return `<div class="c4cell ${hs.has(i) ? 'win' : ''}" data-c="${c}">
        ${v ? `<div class="disc4 ${v === 1 ? 'd4p' : 'd4a'}"></div>` : ''}</div>`;
    }).join('')).join('') + '</div>';
  Shell.stage().querySelectorAll('.c4cell').forEach(el =>
    el.addEventListener('click', () => drop(+el.dataset.c, 1)));
}

function drop(c, p) {
  if (over) return;
  if (p === 1 && lock) return;
  const r = lowest(board, c);
  if (r === -1) { SFX.bad(); return; }
  board[r][c] = p;
  SFX.place();
  const line = winLine(board, p);
  if (line) { draw(line); return finish(p); }
  if (board[0].every(v => v)) { draw(); return finish(0); }
  draw();
  if (p === 1) {
    lock = true;
    setTimeout(() => {
      if (over) return;
      aiMove();
    }, 450);
  } else {
    lock = false;
  }
}

function finish(winner) {
  over = true;
  if (winner === 1) {
    const first = Shell.bumpWins();
    SFX.win();
    Shell.showOver({ won: true, cause: 'Четыре в ряд!', score: null, record: first });
  } else if (winner === 2) {
    SFX.bad();
    Shell.showOver({ cause: 'ИИ собрал четыре', score: null });
  } else {
    SFX.click();
    Shell.showOver({ cause: 'Ничья — поле заполнено', score: null });
  }
}

function start() {
  board = Array.from({ length: CH }, () => Array(CW).fill(0));
  over = false; lock = false;
  draw();
}

start();
