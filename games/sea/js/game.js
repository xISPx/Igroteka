'use strict';

/* Морской бой: потопи флот ИИ раньше, чем он потопит твой.
   Флот: 4-палубный, 3, 3, 2, 2, 1, 1. */
Shell.init({
  rules: `Верхнее поле — флот ИИ: кликай по его клеткам, чтобы стрелять. Твой флот внизу, расставлен случайно.
Флот: 4-палубный, две 3-палубных, две 2-палубных и два одиночных катера.
Потопи весь флот ИИ раньше, чем он потопит твой. ИИ добивает раненые корабли — не подставляй одиночные клетки рядом.`,
  id: 'sea',
  icon: '🚢',
  title: 'МОРСКОЙ БОЙ',
  tagline: 'Потопи все корабли ИИ. Кликай по его полю, стреляй по клеткам',
  stats: [['best', 'Победы']],
  bestKey: 'sea.wins',
  bestLabel: 'Побед над ИИ',
  hints: ['Верхнее поле — флот ИИ (стреляй)', 'Нижнее — твой флот'],
  onPlay() { start(); },
  onMenu() { Shell.showMenu(); },
});

const N = 10;
const FLEET = [4, 3, 3, 2, 2, 1, 1];
let ai, me, aiView, aiQueue = [], over, lock;

function placeFleet() {
  const b = Array(N * N).fill(0); // 0 вода, 1 корабль
  for (const len of FLEET) {
    for (let attempt = 0; attempt < 300; attempt++) {
      const horiz = Math.random() < 0.5;
      const r = Shell.rnd(horiz ? N : N - len + 1);
      const c = Shell.rnd(horiz ? N - len + 1 : N);
      let ok = true;
      for (let k = -1; k <= len && ok; k++) {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const rr = r + (horiz ? 0 : k) + dr, cc = c + (horiz ? k : 0) + dc;
            if (rr >= 0 && cc >= 0 && rr < N && cc < N && b[rr * N + cc]) { ok = false; break; }
          }
          if (!ok) break;
        }
      }
      if (!ok) continue;
      for (let k = 0; k < len; k++) b[(r + (horiz ? 0 : k)) * N + (c + (horiz ? k : 0))] = 1;
      attempt = 999;
    }
  }
  return b;
}

function boardHtml(b, cls, id) {
  return `<div class="sboard ${cls}">
    <span class="slabel">${id === 'enemy' ? 'Флот ИИ' : 'Твой флот'}</span>
    <div class="sgrid">` +
    b.map((cell, i) => {
      let k = 'scell';
      if (cls === 'mine' && cell === 1) k += ' ship';
      if (cell === 2) k += ' miss';
      if (cell === 3) k += ' hit';
      if (cell === 4) k += ' sunk';
      return `<div class="${k}" data-i="${i}"></div>`;
    }).join('') + '</div></div>';
}

function draw() {
  Shell.stage().innerHTML =
    `<p class="status3" id="seaStatus"></p><div class="boards">` +
    boardHtml(aiView, 'enemy', 'enemy') + boardHtml(me, 'mine', 'mine') + '</div>';
  if (!over) {
    Shell.stage().querySelectorAll('.enemy .scell').forEach(el =>
      el.addEventListener('click', () => shoot(+el.dataset.i)));
  }
}

function setStatus(t) { const el = $('seaStatus'); if (el) el.textContent = t; }

function shoot(i) {
  if (over || lock || aiView[i] >= 2) return;
  lock = true;
  applyShot(aiView, ai, i);
  SFX.place();
  draw();
  if (checkFleet(aiView, ai, 'ИИ')) return;
  setStatus('Ход ИИ…');
  setTimeout(aiShoot, 800);
}

function applyShot(view, fleet, i) {
  if (fleet[i] === 1) {
    view[i] = 3;
    // потоплен ли корабль? (его клетки: флот=1 или уже помеченные попадания=3)
    const cells = shipCells(fleet, view, i);
    if (cells.every(c => view[c] >= 3)) {
      for (const c of cells) view[c] = 4;
      SFX.explode();
    } else SFX.good();
  } else {
    view[i] = 2;
    SFX.click();
  }
}

function shipCells(fleet, view, i) {
  const out = [i];
  const r = (i / N) | 0, c = i % N;
  for (const [dr, dc] of [[0, 1], [1, 0]]) {
    const line = [i];
    for (const s of [1, -1]) {
      let rr = r + dr * s, cc = c + dc * s;
      while (rr >= 0 && cc >= 0 && rr < N && cc < N &&
             (fleet[rr * N + cc] === 1 || (view && view[rr * N + cc] === 3))) {
        line.push(rr * N + cc);
        rr += dr * s; cc += dc * s;
      }
    }
    if (line.length > 1) return line;
  }
  return out;
}

function checkFleet(view, fleet, who) {
  if (fleet.some((v, i) => v === 1 && view[i] !== 3 && view[i] !== 4)) return false;
  over = true;
  draw();
  if (who === 'ИИ') {
    const first = Shell.bumpWins();
    SFX.win();
    Shell.showOver({ won: true, cause: 'Флот ИИ уничтожен!', score: null, record: first });
  } else {
    SFX.die();
    Shell.showOver({ cause: 'Твой флот потоплен', score: null });
  }
  return true;
}

function aiShoot() {
  if (over) return;
  let i;
  if (aiQueue.length) {
    i = aiQueue.shift();
    while (me[i] === undefined || me[i] >= 2) i = aiQueue.shift() ?? Shell.rnd(N * N);
  } else {
    do { i = Shell.rnd(N * N); } while (me[i] >= 2);
  }
  const wasShip = me[i] === 1;
  applyShot(me, me, i);
  if (wasShip) {
    // добываем: добавляем соседей в очередь (hunt/target)
    const r = (i / N) | 0, c = i % N;
    for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const rr = r + dr, cc = c + dc;
      if (rr >= 0 && cc >= 0 && rr < N && cc < N && me[rr * N + cc] < 2) aiQueue.push(rr * N + cc);
    }
    // если корабль потоплен — очередь больше не нужна
    const cells = shipCells(me, me, i);
    if (cells.every(c2 => me[c2] === 4)) aiQueue = [];
  }
  draw();
  if (checkFleet(me, me, 'игрок')) return;
  lock = false;
  setStatus('Твой выстрел');
}

function start() {
  ai = placeFleet();
  me = placeFleet();
  aiView = Array(N * N).fill(0);
  aiQueue = [];
  over = false; lock = false;
  draw();
  setStatus('Твой выстрел');
}

start();
