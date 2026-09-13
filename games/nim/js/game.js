'use strict';

/* Ним: три ряда палочек, берём любое число из одного ряда.
   Взявший последнюю палочку побеждает. ИИ играет идеально (ним-сумма). */
Shell.init({
  rules: `Клик по палочке берёт её и все правее в этом ряду (ходить можно только в одном ряду).
Ходы чередуются с ИИ. Кто возьмёт ПОСЛЕДНЮЮ палочку — тот победил.
ИИ играет безошибочно (ним-сумма): выиграть можно, только передав ему сначала проигрышную позицию.`,
  id: 'nim',
  icon: '🥢',
  title: 'НИМ',
  tagline: 'Бери любое число палочек из одного ряда. Кто возьмёт последнюю — тот победил',
  stats: [['best', 'Победы']],
  bestKey: 'nim.wins',
  bestLabel: 'Побед над ИИ',
  hints: ['Клик по палочке берёт её и все правее в этом ряду', 'Ходят по очереди с ИИ'],
  onPlay() { newRound(); },
  onMenu() { busy = false; Shell.showMenu(); },
});

const rows = [3, 5, 7];
let myTurn = true, busy = false;

function nimXor() { return rows.reduce((a, b) => a ^ b, 0); }

function render() {
  const st = Shell.stage();
  const status = document.getElementById('nimStatus');
  st.innerHTML = (status ? '<p id="nimStatus" class="rlabel" style="margin-bottom:0"></p>' : '<p id="nimStatus" class="rlabel" style="margin-bottom:0"></p>') +
    rows.map((n, r) =>
      `<div class="rlabel">Ряд ${r + 1} — ${n}</div>
       <div class="nrow" data-r="${r}">${
         Array.from({ length: n }, () => '<div class="stick"></div>').join('')
       }</div>`).join('');
  st.querySelectorAll('.nrow').forEach(el => {
    el.addEventListener('click', e => {
      const sticks = [...el.children];
      const i = sticks.indexOf(e.target);
      if (i >= 0) playerTake(+el.dataset.r, sticks.length - i);
    });
  });
}

function setStatus(t) {
  const el = document.getElementById('nimStatus');
  if (el) el.textContent = t;
}

function playerTake(r, count) {
  if (!myTurn || busy || count > rows[r]) return;
  busy = true;
  rows[r] -= count;
  SFX.place();
  render();
  if (checkEnd(true)) return;
  myTurn = false;
  setStatus('Ход ИИ…');
  setTimeout(aiMove, 750);
}

function aiMove() {
  let r = -1, take = 0;
  const x = nimXor();
  if (x !== 0) {
    for (let i = 0; i < rows.length; i++) {
      const target = rows[i] ^ x;
      if (target < rows[i]) { r = i; take = rows[i] - target; break; }
    }
  } else {
    const nonEmpty = rows.map((n, i) => n > 0 ? i : -1).filter(i => i >= 0);
    r = nonEmpty[Shell.rnd(nonEmpty.length)];
    take = 1 + Shell.rnd(rows[r]);
  }
  rows[r] -= take;
  SFX.place();
  render();
  if (checkEnd(false)) return;
  myTurn = true;
  busy = false;
  setStatus('Ваш ход');
}

function checkEnd(afterPlayer) {
  if (rows.reduce((a, b) => a + b, 0) > 0) return false;
  busy = false;
  if (afterPlayer) {
    const first = Shell.bumpWins();
    SFX.win();
    Shell.showOver({ won: true, cause: 'Вы взяли последнюю палочку!', score: null, record: first });
  } else {
    SFX.bad();
    Shell.showOver({ cause: 'ИИ взял последнюю палочку', score: null });
  }
  return true;
}

function newRound() {
  rows.length = 0;
  rows.push(3, 5, 7);
  myTurn = true; busy = false;
  render();
  setStatus('Ваш ход — кликните палочку, возьмёте её и все правее');
}

newRound();
