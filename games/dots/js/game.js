'use strict';

/* Точки и квадраты: ставь линии, замыкай квадраты.
   Квадрат = очко и ещё один ход. Побеждает собравший больше. */
Shell.init({
  rules: `Кликай между точками, чтобы ставить линии — по очереди с ИИ.
Замкнул четвёртую сторону квадрата — квадрат твой: +1 очко и ещё один ход подряд.
ИИ не подставляется: бери квадраты, как только они появляются, а свои «три стороны» прячь.
Все линии заняты — у кого больше квадратов, тот победил.`,
  id: 'dots',
  icon: '🔗',
  title: 'ТОЧКИ',
  tagline: 'Соединяй точки линиями. Замкнул квадрат — очко и ещё один ход',
  stats: [['best', 'Победы']],
  bestKey: 'dots.wins',
  bestLabel: 'Побед над ИИ',
  hints: ['Клик между точками — линия'],
  onPlay() { build(); },
  onMenu() { Shell.showMenu(); },
});

const D = 5;                    // точек в ряду → 4×4 квадратов
let hE, vE, boxes, scores, turn, over, lock;

function build() {
  hE = Array((D + 1) * D).fill(0);   // 0 нет, 1 игрок, 2 ИИ
  vE = Array(D * (D + 1)).fill(0);
  boxes = Array(D * D).fill(0);
  scores = [0, 0];
  turn = 1; over = false; lock = false;
  draw();
}

function boxAt(r, c) { return boxes[r * D + c]; }

/* Приносит ли линия квадраты с 3 сторонами */
function completesH(i) {
  const r = (i / D) | 0, c = i % D;
  let got = [];
  if (r < D && hE[i] === 0 && countSides(r, c) === 3) got.push([r, c]);
  if (r > 0 && hE[i] === 0 && countSides(r - 1, c) === 3) got.push([r - 1, c]);
  return got;
}
function completesV(i) {
  const r = (i / D) | 0, c = i % D;
  let got = [];
  if (c < D && vE[i] === 0 && countSides(r, c) === 3) got.push([r, c]);
  if (c > 0 && vE[i] === 0 && countSides(r, c - 1) === 3) got.push([r, c - 1]);
  return got;
}
function countSides(r, c) {
  return (hE[r * D + c] ? 1 : 0) + (hE[(r + 1) * D + c] ? 1 : 0) +
         (vE[r * D + c] ? 1 : 0) + (vE[r * D + (c + 1)] ? 1 : 0);
}

function draw() {
  const cells = [];
  for (let rr = 0; rr < 2 * D + 1; rr++) {
    for (let cc = 0; cc < 2 * D + 1; cc++) {
      if (rr % 2 === 0 && cc % 2 === 0) {
        cells.push('<div class="dot"></div>');
      } else if (rr % 2 === 0) {
        const i = (rr / 2) * D + (cc - 1) / 2;
        const v = hE[i];
        cells.push(`<div class="edge h ${v === 1 ? 'taken-p' : v === 2 ? 'taken-a' : ''}" data-k="h" data-i="${i}"></div>`);
      } else if (cc % 2 === 0) {
        const i = ((rr - 1) / 2) * (D + 1) + cc / 2;
        const v = vE[i];
        cells.push(`<div class="edge v ${v === 1 ? 'taken-p' : v === 2 ? 'taken-a' : ''}" data-k="v" data-i="${i}"></div>`);
      } else {
        const b = boxAt((rr - 1) / 2, (cc - 1) / 2);
        const n = scores[0] + '+' + scores[1];
        cells.push(`<div class="box ${b === 1 ? 'p' : b === 2 ? 'a' : ''}">${b ? (b === 1 ? '🟢' : '🔴') : ''}</div>`);
      }
    }
  }
  Shell.stage().innerHTML =
    `<p class="status5" id="dStatus"></p><div class="dgrid">${cells.join('')}</div>`;
  Shell.stage().querySelectorAll('.edge').forEach(el => {
    el.addEventListener('click', () => {
      const k = el.dataset.k, i = +el.dataset.i;
      playerMove(k, i);
    });
  });
  setStatus(over ? '' : lock ? 'Ход ИИ…' : 'Твой ход');
}

function setStatus(t) { const el = $('dStatus'); if (el) el.textContent = t; }

function playerMove(k, i) {
  if (over || lock || turn !== 1) return;
  if ((k === 'h' && hE[i]) || (k === 'v' && vE[i])) return;
  applyMove(k, i, 1);
}

function applyMove(k, i, p) {
  if (k === 'h') hE[i] = p; else vE[i] = p;
  SFX.place();
  const r0 = k === 'h' ? (i / D) | 0 : (i / (D + 1)) | 0;
  const c0 = k === 'h' ? i % D : i % (D + 1);
  const closed = [];
  if (k === 'h') {
    if (r0 < D && countSides(r0, c0) === 4) closed.push([r0, c0]);
    if (r0 > 0 && countSides(r0 - 1, c0) === 4) closed.push([r0 - 1, c0]);
  } else {
    if (c0 < D && countSides(r0, c0) === 4) closed.push([r0, c0]);
    if (c0 > 0 && countSides(r0, c0 - 1) === 4) closed.push([r0, c0 - 1]);
  }
  for (const [r, c] of closed) {
    boxes[r * D + c] = p;
    scores[p - 1]++;
    SFX.good();
  }
  draw();
  // конец игры?
  const total = hE.filter(v => v).length + vE.filter(v => v).length;
  if (total === hE.length + vE.length) return finish();
  if (closed.length) {
    // замкнул — ход остаётся
    if (p === 2) setTimeout(aiMove, 500);
    return;
  }
  if (p === 1) {
    turn = 2; lock = true; draw();
    setTimeout(aiMove, 600);
  } else {
    turn = 1; lock = false; draw();
  }
}

function aiMove() {
  if (over) return;
  const freeH = hE.map((v, i) => v ? -1 : i).filter(i => i >= 0);
  const freeV = vE.map((v, i) => v ? -1 : i).filter(i => i >= 0);
  // 1) достроить квадрат
  for (const i of freeH) if (completesH(i).length) return applyMove('h', i, 2);
  for (const i of freeV) if (completesV(i).length) return applyMove('v', i, 2);
  // 2) не давать третью сторону
  const safeH = freeH.filter(i => completesH(i).length === 0);
  const safeV = freeV.filter(i => completesV(i).length === 0);
  const safe = [...safeH.map(i => ['h', i]), ...safeV.map(i => ['v', i])];
  if (safe.length) {
    const [k, i] = safe[Shell.rnd(safe.length)];
    return applyMove(k, i, 2);
  }
  // 3) жертвуем минимальную «цепочку»: просто случайная линия
  const all = [...freeH.map(i => ['h', i]), ...freeV.map(i => ['v', i])];
  if (!all.length) return finish();
  const [k, i] = all[Shell.rnd(all.length)];
  applyMove(k, i, 2);
}

function finish() {
  over = true;
  draw();
  const [p, a] = scores;
  if (p > a) {
    const first = Shell.bumpWins();
    SFX.win();
    Shell.showOver({ won: true, cause: `${p} : ${a} — больше квадратов у тебя`, score: null, record: first });
  } else if (p < a) {
    SFX.bad();
    Shell.showOver({ cause: `ИИ собрал больше: ${a} : ${p}`, score: null });
  } else {
    SFX.click();
    Shell.showOver({ cause: 'Ничья: ' + p + ' : ' + a, score: null });
  }
}

build();
