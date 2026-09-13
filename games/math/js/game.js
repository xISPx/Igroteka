'use strict';

/* Счёт: математический спринт на 60 секунд. Серия верных ответов — комбо-множитель. */
Shell.init({
  rules: `60 секунд: решай примеры, выбирая ответ из четырёх (клавиши 1–4).
Серия верных ответов растит комбо — чем оно выше, тем больше очков за каждый пример.
Ошибка сбрасывает комбо и отнимает очко. После 15 очков появляются примеры на умножение.`,
  id: 'math',
  icon: '🧮',
  title: 'СЧЁТ',
  tagline: 'Реши как можно больше примеров за 60 секунд. Серия верных даёт комбо',
  stats: [['score', 'Счёт'], ['time', 'Время'], ['best', 'Рекорд']],
  bestKey: 'math.best',
  hints: ['1–4 — выбрать ответ', 'Комбо растёт с серией верных ответов'],
  onPlay() { start(); },
  onMenu() { stop(); Shell.showMenu(); },
});

let playing = false, score = 0, combo = 0, tEnd = 0, timer = null, answer = 0;

function buildDom() {
  Shell.stage().innerHTML = `
    <div class="expr" id="expr"></div>
    <div class="mopts" id="mopts"></div>
    <p class="combo2" id="mline"></p>`;
}

function makeProblem() {
  const kinds = ['+', '-', '×'];
  const kind = kinds[Shell.rnd(playing && score > 15 ? 3 : 2)];
  let a, b;
  if (kind === '×') { a = 2 + Shell.rnd(9); b = 2 + Shell.rnd(9); }
  else { a = 2 + Shell.rnd(48); b = 2 + Shell.rnd(30); }
  answer = kind === '+' ? a + b : kind === '-' ? a - b : a * b;
  if (answer < 0) { const t = a; a = b; b = t; answer = a - b; }
  $('expr').textContent = `${a} ${kind} ${b} = ?`;
  const opts = new Set([answer]);
  while (opts.size < 4) {
    const delta = 1 + Shell.rnd(9);
    const v = answer + (Math.random() < 0.5 ? delta : -delta);
    if (v >= 0) opts.add(v);
  }
  const arr = [...opts].sort(() => Math.random() - 0.5);
  $('mopts').innerHTML = arr.map((v, i) =>
    `<button class="mopt" data-v="${v}">${v}</button>`).join('');
  $('mopts').querySelectorAll('.mopt').forEach(b =>
    b.addEventListener('click', () => pick(+b.dataset.v)));
}

function pick(v) {
  if (!playing) return;
  if (v === answer) {
    combo++;
    score += 1 + Math.min(4, (combo / 3) | 0);
    SFX.good();
  } else {
    combo = 0;
    score = Math.max(0, score - 1);
    SFX.bad();
  }
  Shell.setStat('score', score);
  $('mline').textContent = combo > 1 ? `🔥 Серия: ${combo}` : '';
  makeProblem();
}

function tick() {
  const left = Math.max(0, tEnd - performance.now());
  Shell.setStat('time', Math.ceil(left / 1000) + ' с');
  if (left <= 0) {
    playing = false;
    clearTimeout(timer);
    const record = Shell.tryRecord(score);
    SFX.win();
    Shell.showOver({ cause: 'Время вышло', score, record });
    return;
  }
  timer = setTimeout(tick, 200);
}

function start() {
  buildDom();
  score = 0; combo = 0;
  Shell.setStat('score', 0);
  tEnd = performance.now() + 60000;
  playing = true;
  makeProblem();
  tick();
}

function stop() { playing = false; clearTimeout(timer); }

window.addEventListener('keydown', e => {
  SFX.ensure();
  const map = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3 };
  if (map[e.code] !== undefined) {
    const b = $('mopts') && $('mopts').children[map[e.code]];
    if (b) pick(+b.dataset.v);
  }
});

buildDom();
