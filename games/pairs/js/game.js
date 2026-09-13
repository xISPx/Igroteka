'use strict';

/* ================== УТИЛИТЫ ================== */
const $ = id => document.getElementById(id);
const Store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};
const fmtTime = s => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
const EMOJI = ['🐳', '🍎', '🚀', '🌵', '🐙', '🎈', '🍕', '🦊'];
const winOverlay = $('winOverlay');
const show = el => el.classList.remove('hidden');
const hide = el => el.classList.add('hidden');

/* ================== СОСТОЯНИЕ ================== */
const G = {
  deck: [], open: [], lock: false,
  moves: 0, found: 0, time: 0, timerId: null, started: false,
  best: Store.get('pairs.best', null),
};

const gridEl = $('pgrid');

/* ================== ИГРА ================== */
function newGame() {
  G.deck = [...EMOJI, ...EMOJI];
  for (let i = G.deck.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [G.deck[i], G.deck[j]] = [G.deck[j], G.deck[i]];
  }
  G.open = []; G.lock = false;
  G.moves = 0; G.found = 0; G.time = 0; G.started = false;
  clearInterval(G.timerId);
  G.timerId = null;
  hide(winOverlay);
  buildDom();
  syncHud();
}

function buildDom() {
  gridEl.innerHTML = '';
  G.deck.forEach((em, i) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.i = i;
    card.innerHTML = '<div class="cin"><div class="face back">★</div><div class="face front">' + em + '</div></div>';
    card.addEventListener('click', () => flip(card, i));
    gridEl.appendChild(card);
  });
}

function flip(card, i) {
  if (G.lock || card.classList.contains('open') || card.classList.contains('matched')) return;
  SFX.ensure();
  if (!G.started) { G.started = true; startTimer(); }
  card.classList.add('open');
  G.open.push({ card, i });
  SFX.flip();

  if (G.open.length === 2) {
    G.moves++;
    syncHud();
    const [a, b] = G.open;
    if (G.deck[a.i] === G.deck[b.i]) {
      G.open = [];
      G.found++;
      a.card.classList.add('matched');
      b.card.classList.add('matched');
      SFX.good();
      syncHud();
      if (G.found === EMOJI.length) win();
    } else {
      G.lock = true;
      setTimeout(() => {
        a.card.classList.remove('open');
        b.card.classList.remove('open');
        G.open = [];
        G.lock = false;
        SFX.bad();
      }, 750);
    }
  }
}

function win() {
  clearInterval(G.timerId);
  SFX.win();
  const isRecord = G.best === null || G.moves < G.best;
  if (isRecord) { G.best = G.moves; Store.set('pairs.best', G.best); }
  $('recordBadge').classList.toggle('show', isRecord);
  $('finalMoves').textContent = G.moves;
  $('finalTime').textContent = 'Время: ' + fmtTime(G.time);
  syncHud();
  setTimeout(show, 500, winOverlay);
}

function startTimer() {
  G.timerId = setInterval(() => {
    G.time++;
    $('time').textContent = fmtTime(G.time);
  }, 1000);
}

/* ================== HUD ================== */
function syncHud() {
  $('moves').textContent = G.moves;
  $('found').textContent = G.found + '/' + EMOJI.length;
  $('time').textContent = fmtTime(G.time);
  $('best').textContent = G.best === null ? '—' : G.best + ' ход.';
}

/* ================== СОБЫТИЯ ================== */
window.addEventListener('keydown', e => {
  SFX.ensure();
  if (e.code === 'KeyM') toggleSound();
  if (e.code === 'Enter' && !winOverlay.classList.contains('hidden')) newGame();
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

document.addEventListener('visibilitychange', () => {
  if (document.hidden && G.started && G.found < EMOJI.length) {
    clearInterval(G.timerId);
    G.timerId = null;
  } else if (!document.hidden && G.started && G.found < EMOJI.length && !G.timerId) {
    startTimer();
  }
});

/* ================== СТАРТ ================== */
SFX.enabled = Store.get('zmeyka.sound', true);
$('soundBtn').textContent = SFX.enabled ? '🔊' : '🔇';
newGame();
