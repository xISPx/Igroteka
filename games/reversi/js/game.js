'use strict';

/* ================== УТИЛИТЫ ================== */
const $ = id => document.getElementById(id);
const Store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};
const DIRS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
const WEIGHTS = [
  120, -20,  20,   5,   5,  20, -20, 120,
  -20, -40,  -5,  -5,  -5,  -5, -40, -20,
   20,  -5,  15,   3,   3,  15,  -5,  20,
    5,  -5,   3,   3,   3,   3,  -5,   5,
    5,  -5,   3,   3,   3,   3,  -5,   5,
   20,  -5,  15,   3,   3,  15,  -5,  20,
  -20, -40,  -5,  -5,  -5,  -5, -40, -20,
  120, -20,  20,   5,   5,  20, -20, 120,
];
const overOverlay = $('overOverlay');
const statusEl = $('status');
const show = el => el.classList.remove('hidden');
const hide = el => el.classList.add('hidden');

/* ================== СОСТОЯНИЕ ================== */
const R = {
  board: [],                       // 0 пусто, 1 чёрные (игрок), 2 белые (ИИ)
  turn: 1,
  lock: false, over: false,
  wins: Store.get('reversi.wins', 0), newRecord: false,
};
const gridEl = $('rgrid');
let cells = [];

/* ================== ПРАВИЛА ================== */
function flipsFor(board, i, p) {
  if (board[i]) return [];
  const opp = 3 - p;
  const x = i % 8, y = (i / 8) | 0;
  const all = [];
  for (const [dx, dy] of DIRS) {
    const line = [];
    let cx = x + dx, cy = y + dy;
    while (cx >= 0 && cy >= 0 && cx < 8 && cy < 8 && board[cy * 8 + cx] === opp) {
      line.push(cy * 8 + cx);
      cx += dx; cy += dy;
    }
    if (line.length && cx >= 0 && cy >= 0 && cx < 8 && cy < 8 && board[cy * 8 + cx] === p) {
      all.push(...line);
    }
  }
  return all;
}

function validMoves(board, p) {
  const out = [];
  for (let i = 0; i < 64; i++) if (flipsFor(board, i, p).length) out.push(i);
  return out;
}

function counts(board) {
  let b = 0, w = 0;
  for (const v of board) { if (v === 1) b++; else if (v === 2) w++; }
  return { b, w };
}

/* ================== ИГРА ================== */
function newGame() {
  R.board = Array(64).fill(0);
  R.board[27] = 2; R.board[28] = 1; R.board[35] = 1; R.board[36] = 2;
  R.turn = 1;
  R.over = false; R.lock = false; R.newRecord = false;
  hide(overOverlay);
  buildDom();
  refresh();
}

function buildDom() {
  gridEl.innerHTML = '';
  cells = [];
  for (let i = 0; i < 64; i++) {
    const c = document.createElement('div');
    c.className = 'rcell';
    c.addEventListener('click', () => onCell(i));
    gridEl.appendChild(c);
    cells.push(c);
  }
}

function refresh(lastMove = -1, flipped = []) {
  for (let i = 0; i < 64; i++) {
    const c = cells[i];
    const v = R.board[i];
    const cur = c.firstChild;
    if (v) {
      const want = v === 1 ? 'b' : 'w';
      if (cur && cur.dataset && cur.dataset.k === want) {
        // без изменений
      } else {
        if (cur) cur.remove();
        const d = document.createElement('div');
        d.className = 'disc ' + want;
        d.dataset.k = want;
        if (flipped.includes(i)) d.classList.add('flip');
        c.appendChild(d);
      }
    } else if (cur) cur.remove();
    c.classList.toggle('last', i === lastMove);
    const can = !R.over && R.turn === 1 && !R.lock && flipsFor(R.board, i, 1).length > 0;
    c.classList.toggle('can', can);
  }
  const { b, w } = counts(R.board);
  $('scB').textContent = b;
  $('scW').textContent = w;
  $('wins').textContent = R.wins;
}

function onCell(i) {
  SFX.ensure();
  if (R.over || R.lock || R.turn !== 1) return;
  const flips = flipsFor(R.board, i, 1);
  if (!flips.length) return;
  R.board[i] = 1;
  for (const f of flips) R.board[f] = 1;
  SFX.place();
  R.turn = 2;
  refresh(i, flips);
  setTimeout(aiTurn, 550);
}

function aiTurn() {
  if (R.over) return;
  const moves = validMoves(R.board, 2);
  if (!moves.length) {
    // ИИ пропускает ход
    if (!validMoves(R.board, 1).length) return finish();
    statusEl.textContent = 'ИИ пропустил ход — ваш снова';
    R.turn = 1;
    refresh();
    return;
  }
  // жадный ИИ с позиционными весами
  let best = -Infinity, picks = [];
  for (const m of moves) {
    const flips = flipsFor(R.board, m, 2);
    const score = WEIGHTS[m] + flips.length * 2 + Math.random() * 3;
    if (score > best) { best = score; picks = [m]; }
    else if (score === best) picks.push(m);
  }
  const move = picks[(Math.random() * picks.length) | 0];
  const flips = flipsFor(R.board, move, 2);
  R.board[move] = 2;
  for (const f of flips) R.board[f] = 2;
  SFX.place();
  R.turn = 1;
  refresh(move, flips);
  // ход игрока?
  if (!validMoves(R.board, 1).length) {
    if (!validMoves(R.board, 2).length) return finish();
    statusEl.textContent = 'Нет ходов — вы пропускаете';
    R.turn = 2;
    refresh();
    setTimeout(aiTurn, 700);
  } else {
    statusEl.textContent = 'Ваш ход — вы чёрные ⚫';
  }
}

function finish() {
  R.over = true;
  const { b, w } = counts(R.board);
  const won = b > w;
  const draw = b === w;
  if (won) {
    R.wins++;
    R.newRecord = R.wins === 1;
    Store.set('reversi.wins', R.wins);
    SFX.win();
  } else if (draw) SFX.click();
  else SFX.bad();
  refresh();
  statusEl.textContent = draw ? 'Ничья!' : won ? 'Вы победили! 🎉' : 'ИИ победил';
  setTimeout(() => {
    if (!R.over) return;
    $('overTitle').textContent = won ? 'ПОБЕДА!' : draw ? 'НИЧЬЯ' : 'ИИ ВЫИГРАЛ';
    $('overTitle').style.background = won
      ? 'linear-gradient(90deg,#34f5a5,#ffd166)'
      : draw ? 'linear-gradient(90deg,#8ea0bf,#c9d4ee)'
      : 'linear-gradient(90deg,#ff8a94,#ff5d6c)';
    $('overTitle').style.webkitBackgroundClip = 'text';
    $('overTitle').style.backgroundClip = 'text';
    $('overTitle').style.color = 'transparent';
    $('causeText').textContent = 'Счёт: ⚫ ' + b + ' : ' + w + ' ⚪';
    $('recordBadge').classList.toggle('show', R.newRecord);
    show(overOverlay);
  }, 800);
}

/* ================== СОБЫТИЯ ================== */
window.addEventListener('keydown', e => {
  SFX.ensure();
  if (e.code === 'KeyM') toggleSound();
  if (e.code === 'Enter' && R.over) newGame();
});

$('newBtn').addEventListener('click', () => { SFX.ensure(); SFX.click(); newGame(); });
$('againBtn').addEventListener('click', () => { SFX.click(); newGame(); });
$('soundBtn').addEventListener('click', () => { SFX.ensure(); toggleSound(); });

function toggleSound() {
  SFX.enabled = !SFX.enabled;
  Store.set('zmeyka.sound', SFX.enabled);
  $('soundBtn').textContent = SFX.enabled ? '🔊' : '🔇';
  if (SFX.enabled) { SFX.ensure(); SFX.click(); }
}

/* ================== СТАРТ ================== */
SFX.enabled = Store.get('zmeyka.sound', true);
$('soundBtn').textContent = SFX.enabled ? '🔊' : '🔇';
newGame();
