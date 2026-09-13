'use strict';

/* ================== УТИЛИТЫ ================== */
const $ = id => document.getElementById(id);
const Store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};

/* ================== СОСТОЯНИЕ ================== */
const S = {
  state: 'menu', // menu | showing | input | over
  seq: [], pos: 0, level: 0,
  best: Store.get('simon.best', 0), newRecord: false,
  timeouts: [],
};

const menuOverlay = $('menuOverlay'), overOverlay = $('overOverlay');
const statusEl = $('status');
const show = el => el.classList.remove('hidden');
const hide = el => el.classList.add('hidden');
const pads = [...document.querySelectorAll('.pad')];

/* ================== ПОТОК ИГРЫ ================== */
function clearTimeouts() {
  for (const t of S.timeouts) clearTimeout(t);
  S.timeouts = [];
}

function startGame() {
  clearTimeouts();
  S.seq = []; S.level = 0; S.newRecord = false;
  hide(menuOverlay); hide(overOverlay);
  nextLevel();
}

function toMenu() {
  S.state = 'menu';
  clearTimeouts();
  for (const p of pads) p.classList.remove('lit', 'locked');
  show(menuOverlay); hide(overOverlay);
  $('menuBest').textContent = S.best;
  statusEl.textContent = 'Нажми «Играть» и слушай';
}

function nextLevel() {
  S.level++;
  S.seq.push((Math.random() * 4) | 0);
  syncHud();
  playSequence();
}

function playSequence() {
  S.state = 'showing';
  statusEl.textContent = 'Слушай…';
  for (const p of pads) p.classList.add('locked');
  const speed = Math.max(300, 640 - S.level * 30);
  S.seq.forEach((note, k) => {
    S.timeouts.push(setTimeout(() => light(note), 500 + k * speed));
  });
  S.timeouts.push(setTimeout(() => {
    S.state = 'input';
    S.pos = 0;
    for (const p of pads) p.classList.remove('locked');
    statusEl.textContent = 'Твой ход — повтори (' + S.seq.length + ' нот)';
  }, 500 + S.seq.length * speed));
}

function light(i, dur = 320) {
  const p = pads[i];
  p.classList.add('lit');
  SFX.note(i, Math.max(0.12, dur / 1000));
  S.timeouts.push(setTimeout(() => p.classList.remove('lit'), dur * 0.8));
}

function press(i) {
  SFX.ensure();
  if (S.state !== 'input') return;
  light(i, 220);
  if (S.seq[S.pos] === i) {
    S.pos++;
    if (S.pos === S.seq.length) {
      S.state = 'wait';
      SFX.good();
      statusEl.textContent = 'Верно! Уровень ' + S.level;
      S.timeouts.push(setTimeout(nextLevel, 800));
    }
  } else {
    fail();
  }
}

function fail() {
  S.state = 'over';
  SFX.bad();
  for (const p of pads) p.classList.add('locked');
  statusEl.textContent = 'Сбой!';
  S.newRecord = S.level > S.best && S.level > 0;
  if (S.newRecord) { S.best = S.level; Store.set('simon.best', S.best); }
  syncHud();
  setTimeout(() => {
    if (S.state !== 'over') return;
    $('finalLevel').textContent = S.level - 1;
    $('recordBadge').classList.toggle('show', S.newRecord);
    show(overOverlay);
  }, 700);
}

/* ================== HUD ================== */
function syncHud() {
  $('level').textContent = S.level;
  $('best').textContent = Math.max(S.best, S.level);
}

/* ================== СОБЫТИЯ ================== */
window.addEventListener('keydown', e => {
  SFX.ensure();
  const map = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, KeyQ: 0, KeyW: 1, KeyA: 2, KeyS: 3 };
  if (map[e.code] !== undefined && S.state === 'input') press(map[e.code]);
  if (e.code === 'Space' || e.code === 'Enter') {
    if (S.state === 'menu' || S.state === 'over') startGame();
  }
  if (e.code === 'KeyM') toggleSound();
});

pads.forEach(p => p.addEventListener('pointerdown', () => press(+p.dataset.i)));

$('playBtn').addEventListener('click', () => { SFX.ensure(); SFX.click(); startGame(); });
$('restartBtn').addEventListener('click', () => { SFX.click(); startGame(); });
$('overMenuBtn').addEventListener('click', () => { SFX.click(); toMenu(); });
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
$('menuBest').textContent = S.best;
