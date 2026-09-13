'use strict';

/* Код: угадай комбинацию из 4 цветов за 10 попыток.
   🟢 — цвет на своём месте, 🟡 — цвет есть, но не здесь. Повторы возможны. */
Shell.init({
  rules: `Секретный код — 4 цвета из шести, повторы возможны.
Выбирай цвета в палитре и заполняй ряд, затем «Проверить».
🟢 — цвет угадан и стоит на своём месте, 🟡 — цвет есть, но в другой клетке.
10 попыток. Рекорд — минимальное число попыток.`,
  id: 'code',
  icon: '🔐',
  title: 'КОД',
  tagline: 'Угадай комбинацию из 4 цветов за минимум попыток',
  stats: [['try', 'Попытка'], ['best', 'Рекорд']],
  bestKey: 'code.best',
  bestLower: true,
  bestZero: null,
  hints: ['Палитра внизу · 10 попыток'],
  menuHint: '🟢 на месте · 🟡 есть, но не здесь',
  onPlay() { start(); },
  onMenu() { Shell.showMenu(); },
});

const PEGS = 4, TRIES = 10;
const COLORS = ['#ff5d6c', '#ffd166', '#34f5a5', '#4da3ff', '#b388ff', '#ff9f43'];
let secret = [], cur = [], rows = [], attempt = 0, done = false;
let wrap, rowsEl;

function build() {
  wrap = document.createElement('div');
  wrap.className = 'code-wrap';
  rowsEl = document.createElement('div');
  wrap.appendChild(rowsEl);
  const legend = document.createElement('p');
  legend.className = 'legend';
  legend.innerHTML = `<span><i class="dotd" style="background:#34f5a5"></i>${t('на месте')}</span>` +
    `<span><i class="dotd" style="background:#ffd166"></i>${t('есть, но не здесь')}</span>`;
  wrap.appendChild(legend);
  const pal = document.createElement('div');
  pal.className = 'palette';
  COLORS.forEach((c, i) => {
    const b = document.createElement('button');
    b.className = 'pal';
    b.style.background = c;
    b.addEventListener('click', () => pick(i));
    pal.appendChild(b);
  });
  wrap.appendChild(pal);
  const row = document.createElement('div');
  row.className = 'row';
  const check = document.createElement('button');
  check.className = 'btn primary';
  check.id = 'checkBtn';
  check.textContent = '✓ ' + t('Проверить');
  check.addEventListener('click', check);
  const back = document.createElement('button');
  back.className = 'btn ghost';
  back.textContent = '⌫';
  back.addEventListener('click', () => { if (!done && cur.length) { cur.pop(); paint(); } });
  row.appendChild(check);
  row.appendChild(back);
  wrap.appendChild(row);
  Shell.stage().appendChild(wrap);
}

function paint() {
  rowsEl.innerHTML = '';
  for (let r = 0; r < attempt; r++) {
    const row = rows[r];
    const el = document.createElement('div');
    el.className = 'crow';
    el.innerHTML = `<span class="num">${r + 1}</span>` + row.guess.map(i =>
      `<span class="peg"><span class="fill" style="background:${COLORS[i]}"></span></span>`).join('');
    el.innerHTML += `<span class="hints4">${'<span class="hp hit"></span>'.repeat(row.hit)}${'<span class="hp near"></span>'.repeat(row.near)}</span>`;
    rowsEl.appendChild(el);
  }
  if (!done) {
    const el = document.createElement('div');
    el.className = 'crow act';
    el.innerHTML = `<span class="num">${attempt + 1}</span>`;
    for (let i = 0; i < PEGS; i++) {
      el.innerHTML += `<span class="peg">${cur[i] !== undefined ? `<span class="fill" style="background:${COLORS[cur[i]]}"></span>` : ''}</span>`;
    }
    rowsEl.appendChild(el);
  }
  const cb = document.getElementById('checkBtn');
  if (cb) cb.disabled = done || cur.length < PEGS;
}

function pick(i) {
  if (done || cur.length >= PEGS) return;
  SFX.ensure();
  cur.push(i);
  SFX.click();
  paint();
}

function check() {
  if (done || cur.length < PEGS) return;
  let hit = 0, near = 0;
  const rest = {};
  for (let i = 0; i < PEGS; i++) {
    if (cur[i] === secret[i]) hit++;
    else rest[secret[i]] = (rest[secret[i]] || 0) + 1;
  }
  for (let i = 0; i < PEGS; i++) {
    if (cur[i] !== secret[i] && rest[cur[i]] > 0) { near++; rest[cur[i]]--; }
  }
  rows.push({ guess: [...cur], hit, near });
  attempt++;
  cur = [];
  Shell.setStat('try', attempt);
  if (hit === PEGS) {
    done = true;
    const record = Shell.tryRecord(attempt);
    SFX.win();
    paint();
    Shell.showOver({ won: true, cause: t('Код взломан!'), score: attempt, record, rows: [[t('Попытки'), attempt]] });
    return;
  }
  if (attempt >= TRIES) {
    done = true;
    SFX.die();
    // показываем секрет
    const el = document.createElement('div');
    el.className = 'crow';
    el.innerHTML = `<span class="num">🔒</span>` + secret.map(i =>
      `<span class="peg"><span class="fill" style="background:${COLORS[i]}"></span></span>`).join('');
    rowsEl.appendChild(el);
    paint();
    Shell.showOver({ cause: t('Попытки кончились'), score: null });
    return;
  }
  SFX.place();
  paint();
}

function start() {
  secret = [];
  for (let i = 0; i < PEGS; i++) secret.push(Shell.rnd(COLORS.length));
  cur = []; rows = []; attempt = 0; done = false;
  Shell.setStat('try', 1);
  if (wrap) wrap.remove();
  build();
  paint();
}
