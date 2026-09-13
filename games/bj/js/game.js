'use strict';

/* Очко (блэкджек): набери ближе к 21, чем дилер, не пережав.
   Туз = 1 или 11. Блэкджек платит 3:2. Дилер добирает до 17. */
Shell.init({
  rules: `Выбери ставку (10/25/50). «Ещё» (H) — взять карту, «Хватит» (S) — остановиться.
Набери ближе к 21, чем дилер, не пережав. 2–10 — по номиналу, картинки — по 10, туз — 1 или 11.
Дилер добирает до 17. Блэкджек (21 с двух карт) платит 3:2, равные суммы — пуш (возврат ставки).
Банк кончился — получишь новый, но рекорд банка сохраняется.`,
  id: 'bj',
  icon: '🃏',
  title: 'ОЧКО',
  tagline: 'Набери ближе к 21, чем дилер, и не пережги. Стартовый банк: 100',
  stats: [['bank', 'Банк'], ['best', 'Рекорд банка']],
  bestKey: 'bj.best',
  hints: ['1–3 — ставка, H — ещё, S — хватит'],
  onPlay() { startRound(); },
  onMenu() { Shell.showMenu(); render(); },
});

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = [
  ['2', 2], ['3', 3], ['4', 4], ['5', 5], ['6', 6], ['7', 7], ['8', 8],
  ['9', 9], ['10', 10], ['В', 10], ['Д', 10], ['К', 10], ['Т', 11],
];
let deck = [], player = [], dealer = [], bank = 100, bet = 10, phase = 'bet';

function shoe() {
  const d = [];
  for (let n = 0; n < 4; n++)
    for (const s of SUITS)
      for (const [r, v] of RANKS) d.push({ r, v, s });
  for (let i = d.length - 1; i > 0; i--) {
    const j = Shell.rnd(i + 1);
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

function handVal(h) {
  let v = h.reduce((a, c) => a + c.v, 0);
  let aces = h.filter(c => c.r === 'Т').length;
  while (v > 21 && aces > 0) { v -= 10; aces--; }
  return v;
}

function cardHtml(c, hidden) {
  if (hidden) return '<div class="card2 back"></div>';
  const red = c.s === '♥' || c.s === '♦';
  return `<div class="card2 ${red ? 'red' : ''}"><span class="rank">${c.r}</span><span class="suit">${c.s}</span></div>`;
}

function render(msg = '') {
  const pv = handVal(player), dv = handVal(dealer);
  Shell.stage().innerHTML = `
    <span class="hlabel">Дилер — ${phase === 'player' ? '?' : dv}</span>
    <div class="hand">${dealer.map((c, i) => cardHtml(c, phase === 'player' && i === 0)).join('') || '<div class="hval">—</div>'}</div>
    <span class="hlabel">Ты — ${phase === 'player' || phase === 'over' ? pv : '—'}</span>
    <div class="hand">${player.map(c => cardHtml(c)).join('') || '<div class="hval">—</div>'}</div>
    ${msg ? `<p class="cause">${msg}</p>` : ''}
    <div id="bjctl"></div>`;
  const ctl = $('bjctl');
  if (phase === 'bet') {
    ctl.innerHTML = `<div class="betrow">
      <button class="betbtn" data-b="10">10</button>
      <button class="betbtn" data-b="25">25</button>
      <button class="betbtn" data-b="50">50</button>
    </div><p class="tiny-hint">Выбери ставку</p>`;
    ctl.querySelectorAll('.betbtn').forEach(b =>
      b.addEventListener('click', () => { bet = +b.dataset.b; deal(); }));
  } else if (phase === 'player') {
    ctl.innerHTML = `<div class="actions">
      <button class="btn primary" id="hitB">Ещё (H)</button>
      <button class="btn ghost" id="standB">Хватит (S)</button>
    </div>`;
    $('hitB').addEventListener('click', hit);
    $('standB').addEventListener('click', stand);
  }
}

function draw2() { return deck.pop(); }

function deal() {
  if (bet > bank) bet = bank;
  deck = shoe();
  player = [draw2(), draw2()];
  dealer = [draw2(), draw2()];
  phase = 'player';
  SFX.flip();
  render();
  // блэкджек сразу
  if (handVal(player) === 21) { stand(); }
}

function hit() {
  if (phase !== 'player') return;
  player.push(draw2());
  SFX.flip();
  if (handVal(player) > 21) {
    phase = 'over';
    settle('Пережог! Ставка проиграна', -bet);
  } else {
    render();
  }
}

function stand() {
  if (phase !== 'player') return;
  // открываем дилера, добираем до 17
  while (handVal(dealer) < 17) dealer.push(draw2());
  phase = 'over';
  const pv = handVal(player), dv = handVal(dealer);
  if (dv > 21) settle('Дилер пережог — ты выиграл!', pv === 21 && player.length === 2 ? Math.round(bet * 1.5) : bet);
  else if (pv > dv) settle('Ты ближе к 21 — победа!', pv === 21 && player.length === 2 ? Math.round(bet * 1.5) : bet);
  else if (pv === dv) settle('Пуш — ставка возвращается', 0);
  else settle('Дилер сильнее', -bet);
}

function settle(msg, delta) {
  bank += delta;
  if (bank <= 0) {
    bank = 100;
    const record = Shell.tryRecord(Shell.bestVal);
    SFX.die();
    Shell.showOver({ cause: 'Банк опустел. Новая сотня уже ждёт', score: null, record });
    phase = 'bet';
    player = []; dealer = [];
    render();
    return;
  }
  const record = delta > 0 ? Shell.tryRecord(bank) : false;
  SFX.good();
  Shell.setStat('bank', bank);
  render(msg);
  phase = 'bet';
  setTimeout(() => render(), 1400);
  player = []; dealer = [];
}

function startRound() {
  if (phase === 'over') phase = 'bet';
  render();
}

function renderInit() {
  Shell.setStat('bank', bank);
  Shell.setStat('best', Shell.bestText());
}

window.addEventListener('keydown', e => {
  SFX.ensure();
  if (phase === 'player') {
    if (e.code === 'KeyH') hit();
    if (e.code === 'KeyS') stand();
  }
});

renderInit();
render();
