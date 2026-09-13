'use strict';

/* Реакция: 5 попыток. Как только фон станет зелёным — кликай.
   Ложный старт = попытка провалена. Рекорд — лучшее среднее. */
Shell.init({
  rules: `Клик — начало раунда. Жди: как только фон станет зелёным — кликай немедленно.
5 раундов, итог — среднее время в миллисекундах.
Клик раньше зелёного — фальстарт, раунд придётся переигрывать. Рекорд — лучшее среднее.`,
  id: 'reaction',
  icon: '⚡',
  title: 'РЕАКЦИЯ',
  tagline: '5 раундов: дожидайся зелёного и кликай как можно быстрее',
  stats: [['round', 'Раунд'], ['last', 'Прошлый'], ['best', 'Рекорд']],
  bestKey: 'reaction.best',
  bestLower: true,
  bestZero: '—',
  bestFmt: v => v + ' мс',
  hints: ['Клик — старт/реакция', 'Рано кликнул — раунд сгорает'],
  bestLabel: 'Лучшее среднее',
  onPlay() { times = []; Shell.setStat('round', 1); phase = 'idle'; paint('Реакция', 'Кликни, чтобы начать', ''); },
  onMenu() { clearTimeout(timer); phase = 'idle'; times = []; Shell.showMenu(); paint('Реакция', 'Кликни, чтобы начать', ''); },
});

const ROUNDS = 5;
let phase = 'idle', times = [], goAt = 0, timer = null;

const pad = () => {
  let el = document.getElementById('rpad');
  if (!el) {
    el = document.createElement('div');
    el.id = 'rpad';
    el.className = 'rpad';
    Shell.stage().appendChild(el);
    el.addEventListener('pointerdown', () => hit());
  }
  return el;
};

function paint(title, sub, cls, log) {
  const el = pad();
  el.className = 'rpad ' + (cls || '');
  el.innerHTML = `<div class="rtitle">${title}</div><div class="rsub">${sub}</div>` +
    (log ? `<div class="rlog">${log}</div>` : '');
}

function arm() {
  phase = 'wait';
  paint('Приготовься…', 'Кликни, когда фон станет зелёным', 'wait',
    times.length ? 'Результаты: ' + times.map(t => t + ' мс').join(', ') : '');
  timer = setTimeout(() => {
    phase = 'go';
    goAt = performance.now();
    pad().classList.add('go');
    paint('ЖМИ!', '', 'go');
    SFX.scoreUp();
  }, 1500 + Math.random() * 2800);
}

function hit() {
  SFX.ensure();
  if (phase === 'idle' || phase === 'done') {
    if (times.length >= ROUNDS) { finish(); return; }
    phase = 'arm';
    arm();
  } else if (phase === 'wait') {
    clearTimeout(timer);
    phase = 'idle';
    SFX.bad();
    paint('Ложный старт!', 'Кликни, чтобы попробовать снова', '');
  } else if (phase === 'go') {
    const ms = Math.round(performance.now() - goAt);
    times.push(ms);
    Shell.setStat('round', Math.min(times.length + 1, ROUNDS));
    Shell.setStat('last', ms + ' мс');
    SFX.good();
    phase = 'done';
    if (times.length >= ROUNDS) {
      paint('Готово!', 'Кликни для итогов', '', 'Результаты: ' + times.join(', ') + ' мс');
    } else {
      paint(ms + ' мс', 'Кликни для следующего раунда', '');
    }
  }
}

function finish() {
  const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
  const record = Shell.tryRecord(avg);
  times = [];
  Shell.setStat('round', 1);
  Shell.showOver({
    won: true,
    cause: 'Средняя реакция: ' + avg + ' мс',
    score: avg,
    rows: [['Среднее', avg + ' мс']],
    record,
    delay: 200,
  });
  phase = 'idle';
}

paint('Реакция', 'Кликни, чтобы начать', '');
