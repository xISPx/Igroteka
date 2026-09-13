'use strict';

/* ================== УТИЛИТЫ ================== */
const $ = id => document.getElementById(id);
const Store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};
const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];
const overOverlay = $('overOverlay');
const show = el => el.classList.remove('hidden');
const hide = el => el.classList.add('hidden');

/* ================== СОСТОЯНИЕ ================== */
const G = {
  board: Array(9).fill(''),
  human: 'X', ai: 'O',
  humanFirst: true,
  over: false,
  you: 0, draw: 0, lose: 0,
  totalWins: Store.get('tictac.wins', 0), newRecord: false,
};

const gridEl = $('tgrid');
let cells = [];

/* ================== ЛОГИКА ================== */
function winnerOf(b) {
  for (const [a, c, d] of LINES) {
    if (b[a] && b[a] === b[c] && b[a] === b[d]) return { p: b[a], line: [a, c, d] };
  }
  return b.every(v => v) ? { p: 'draw', line: [] } : null;
}

/* Минимакс: ИИ максимизирует. Оценка с глубиной — быстрый выигрыш лучше. */
function minimax(b, isAi, depth) {
  const w = winnerOf(b);
  if (w) {
    if (w.p === G.ai) return 10 - depth;
    if (w.p === G.human) return depth - 10;
    return 0;
  }
  let best = isAi ? -Infinity : Infinity;
  for (let i = 0; i < 9; i++) {
    if (b[i]) continue;
    b[i] = isAi ? G.ai : G.human;
    const v = minimax(b, !isAi, depth + 1);
    b[i] = '';
    best = isAi ? Math.max(best, v) : Math.min(best, v);
  }
  return best;
}

function aiMove() {
  let bestV = -Infinity, picks = [];
  for (let i = 0; i < 9; i++) {
    if (G.board[i]) continue;
    G.board[i] = G.ai;
    const v = minimax(G.board, false, 0);
    G.board[i] = '';
    if (v > bestV) { bestV = v; picks = [i]; }
    else if (v === bestV) picks.push(i);
  }
  return picks[(Math.random() * picks.length) | 0];
}

/* ================== ИГРА ================== */
function newRound() {
  G.board = Array(9).fill('');
  G.over = false; G.newRecord = false;
  hide(overOverlay);
  for (const c of cells) { c.className = 'tcell'; c.textContent = ''; }
  const aiStarts = !G.humanFirst;
  G.humanFirst = !G.humanFirst; // чередуем первого игрока в следующей партии
  setStatus(aiStarts ? 'ИИ начинает…' : 'Ваш ход — вы играете ✕');
  if (aiStarts) {
    G.lock = true;
    setTimeout(() => {
      const i = aiMove();
      place(i, G.ai);
      G.lock = false;
      setStatus('Ваш ход');
    }, 450);
  }
}

function place(i, p) {
  if (G.board[i]) return;
  G.board[i] = p;
  const c = cells[i];
  c.textContent = p === 'X' ? '✕' : '◯';
  c.classList.add(p.toLowerCase());
  SFX.place();
}

function onCell(i) {
  SFX.ensure();
  if (G.over || G.lock || G.board[i]) return;
  place(i, G.human);
  const w = winnerOf(G.board);
  if (w) return finish(w);
  setStatus('ИИ думает…');
  G.lock = true;
  setTimeout(() => {
    const m = aiMove();
    place(m, G.ai);
    G.lock = false;
    const w2 = winnerOf(G.board);
    if (w2) finish(w2);
    else setStatus('Ваш ход');
  }, 380);
}

function finish(w) {
  G.over = true;
  for (const i of w.line) cells[i].classList.add('win');
  if (w.p === G.human) {
    G.you++;
    G.totalWins++;
    G.newRecord = G.totalWins === 1;
    Store.set('tictac.wins', G.totalWins);
    SFX.win();
    setStatus('Вы победили! 🎉');
  } else if (w.p === 'draw') {
    G.draw++;
    SFX.click();
    setStatus('Ничья — ИИ непобедим, но и вы непобедимы');
  } else {
    G.lose++;
    SFX.bad();
    setStatus('ИИ победил. Попробуйте ещё!');
  }
  syncHud();
  setTimeout(() => {
    if (!G.over) return;
    $('overTitle').textContent = w.p === G.human ? 'ПОБЕДА!' : w.p === 'draw' ? 'НИЧЬЯ' : 'ИИ ВЫИГРАЛ';
    $('overTitle').style.background = w.p === G.human
      ? 'linear-gradient(90deg,#34f5a5,#ffd166)'
      : w.p === 'draw' ? 'linear-gradient(90deg,#8ea0bf,#c9d4ee)'
      : 'linear-gradient(90deg,#ff8a94,#ff5d6c)';
    $('overTitle').style.webkitBackgroundClip = 'text';
    $('overTitle').style.backgroundClip = 'text';
    $('overTitle').style.color = 'transparent';
    $('causeText').textContent = 'Счёт сессии: вы ' + G.you + ' · ничьи ' + G.draw + ' · ИИ ' + G.lose;
    $('recordBadge').classList.toggle('show', G.newRecord);
    show(overOverlay);
  }, 900);
}

function setStatus(t) {
  $('status').textContent = t;
}

/* ================== HUD ================== */
function syncHud() {
  $('sYou').textContent = G.you;
  $('sDraw').textContent = G.draw;
  $('sAi').textContent = G.lose;
  $('sTotal').textContent = G.totalWins;
}

/* ================== СОБЫТИЯ ================== */
window.addEventListener('keydown', e => {
  SFX.ensure();
  const n = parseInt(e.key, 10);
  if (n >= 1 && n <= 9) onCell(n - 1);
  if (e.code === 'KeyM') toggleSound();
  if (e.code === 'Enter' && G.over) newRound();
});

$('againBtn').addEventListener('click', () => { SFX.click(); newRound(); });
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
for (let i = 0; i < 9; i++) {
  const c = document.createElement('div');
  c.className = 'tcell';
  c.addEventListener('click', () => onCell(i));
  gridEl.appendChild(c);
  cells.push(c);
}
syncHud();
newRound();
