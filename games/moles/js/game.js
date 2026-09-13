'use strict';

/* ================== КОНСТАНТЫ ================== */
const ROUND_MS = 30000;
const HOLES_N = 9;

/* ================== УТИЛИТЫ ================== */
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const Store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};

/* ================== СОСТОЯНИЕ ================== */
const M = {
  state: 'menu', // menu | playing | over
  score: 0,
  best: Store.get('moles.best', 0),
  newRecord: false,
  endAt: 0,
  spawnTimer: null, hideTimers: [],
};

const holesEl = $('holes');
const menuOverlay = $('menuOverlay'), overOverlay = $('overOverlay');
const show = el => el.classList.remove('hidden');
const hide = el => el.classList.add('hidden');
let holes = [];

/* ================== ПОСТРОЕНИЕ ================== */
function buildHoles() {
  holesEl.innerHTML = '';
  holes = [];
  for (let i = 0; i < HOLES_N; i++) {
    const h = document.createElement('div');
    h.className = 'hole';
    const mole = document.createElement('div');
    mole.className = 'mole';
    mole.textContent = '🕳️';
    h.appendChild(mole);
    h.addEventListener('pointerdown', () => whack(i), { passive: true });
    holesEl.appendChild(h);
    holes.push({ el: h, mole, up: false, gold: false });
  }
}

/* ================== ПОТОК ИГРЫ ================== */
function startGame() {
  M.score = 0; M.newRecord = false;
  M.endAt = performance.now() + ROUND_MS;
  for (const h of holes) {
    h.up = false; h.gold = false;
    h.el.classList.remove('up', 'hit');
    h.mole.className = 'mole';
    h.mole.textContent = '🕳️';
  }
  hide(menuOverlay); hide(overOverlay);
  M.state = 'playing';
  clearTimers();
  scheduleSpawn(400);
  syncHud();
}

function toMenu() {
  M.state = 'menu';
  clearTimers();
  for (const h of holes) h.el.classList.remove('up', 'hit');
  show(menuOverlay); hide(overOverlay);
  $('menuBest').textContent = M.best;
}

function clearTimers() {
  clearTimeout(M.spawnTimer);
  M.spawnTimer = null;
  for (const t of M.hideTimers) clearTimeout(t);
  M.hideTimers = [];
}

function scheduleSpawn(delay) {
  M.spawnTimer = setTimeout(() => {
    if (M.state !== 'playing') return;
    spawnMole();
    const progress = 1 - clamp((M.endAt - performance.now()) / ROUND_MS, 0, 1);
    scheduleSpawn(clamp(900 - progress * 420, 420, 900) + Math.random() * 250);
  }, delay);
}

function spawnMole() {
  const free = holes.filter(h => !h.up);
  if (!free.length) return;
  const count = Math.random() < 0.3 ? Math.min(2, free.length) : 1;
  for (let k = 0; k < count; k++) {
    const h = free.splice((Math.random() * free.length) | 0, 1)[0];
    h.up = true;
    h.gold = Math.random() < 0.15;
    h.mole.className = 'mole' + (h.gold ? ' gold' : '');
    h.mole.textContent = h.gold ? '🐹' : '🦔';
    h.el.classList.add('up');
    const progress = 1 - clamp((M.endAt - performance.now()) / ROUND_MS, 0, 1);
    const life = clamp(1050 - progress * 450, 500, 1050) + Math.random() * 250;
    M.hideTimers.push(setTimeout(() => hideMole(h), life));
  }
}

function hideMole(h) {
  if (!h.up) return;
  h.up = false;
  h.el.classList.remove('up');
}

function whack(i) {
  SFX.ensure();
  if (M.state !== 'playing') return;
  const h = holes[i];
  if (!h.up) return;
  const pts = h.gold ? 3 : 1;
  M.score += pts;
  h.up = false;
  h.el.classList.remove('up');
  h.el.classList.add('hit');
  setTimeout(() => h.el.classList.remove('hit'), 180);
  h.mole.textContent = '💥';
  SFX.whack();
  syncHud();
}

function endGame() {
  M.state = 'over';
  clearTimers();
  for (const h of holes) h.el.classList.remove('up');
  SFX.die();
  M.newRecord = M.score > M.best && M.score > 0;
  if (M.newRecord) { M.best = M.score; Store.set('moles.best', M.best); }
  syncHud();
  setTimeout(() => {
    if (M.state !== 'over') return;
    $('finalScore').textContent = M.score;
    $('recordBadge').classList.toggle('show', M.newRecord);
    show(overOverlay);
  }, 400);
}

/* ================== HUD ================== */
function syncHud() {
  $('score').textContent = M.score;
  $('best').textContent = Math.max(M.best, M.score);
  const left = M.state === 'playing' ? Math.max(0, M.endAt - performance.now()) : M.state === 'over' ? 0 : ROUND_MS;
  $('time').textContent = '0:' + String(Math.ceil(left / 1000)).padStart(2, '0');
}
setInterval(() => {
  if (M.state === 'playing') {
    syncHud();
    if (performance.now() >= M.endAt) endGame();
  }
}, 200);

/* ================== СОБЫТИЯ ================== */
window.addEventListener('keydown', e => {
  SFX.ensure();
  if (e.code === 'Space' || e.code === 'Enter') {
    if (M.state === 'menu') startGame();
    else if (M.state === 'over') startGame();
  }
  if (e.code === 'KeyM') toggleSound();
});

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

document.addEventListener('visibilitychange', () => {
  // при скрытии вкладки раунд честно завершается
  if (document.hidden && M.state === 'playing') endGame();
});

/* ================== СТАРТ ================== */
SFX.enabled = Store.get('zmeyka.sound', true);
$('soundBtn').textContent = SFX.enabled ? '🔊' : '🔇';
buildHoles();
$('menuBest').textContent = M.best;
syncHud();
