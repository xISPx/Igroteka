'use strict';

/* Печать: набирай фразы ровно и быстро. 60 секунд. Рекорд — знаков в минуту. */
Shell.init({
  rules: `Печатай показанный текст в поле: фразы идут одна за другой, всего 60 секунд.
Счёт — знаки в минуту БЕЗ ошибок; отдельно считается точность в процентах.
Ошибочная буква подчёркивается, но не блокирует дальнейший набор — исправляться можно на ходу.`,
  id: 'typing',
  icon: '⌨️',
  title: 'ПЕЧАТЬ',
  tagline: 'Набирай текст быстро и без ошибок. 60 секунд на всё',
  stats: [['cpm', 'Зн/мин'], ['acc', 'Точность'], ['best', 'Рекорд']],
  bestKey: 'typing.best',
  bestFmt: v => v + ' з/м',
  hints: ['Текст печатается в поле ниже', 'Ошибки снижают точность'],
  onPlay() { start(); },
  onMenu() { stop(); Shell.showMenu(); },
});

const PHRASES = (
  'сорока на хвосте принесла новость,без труда не вытащишь и рыбку из пруда,' +
  'тише едешь дальше будешь,в гостях хорошо а дома лучше,' +
  'не имей сто рублей а имей сто друзей,слово не воробей вылетит не поймаешь,' +
  'под лежачий камень вода не течёт,готовь сани летом а телегу зимой,' +
  'один в поле не воин,семь раз отмерь один раз отрежь,' +
  'не всё то золото что блестит,старый друг лучше новых двух,' +
  'век живи век учись,тихие воды глубоки,' +
  'любишь кататься люби и саночки возить,что написано пером не вырубишь топором,' +
  'первый блин комом,всяк кулик своё болото хвалит,' +
  'яблоко от яблони недалеко падает,Москва слезам не верит,' +
  'терпение и труд всё перетрут,кто рано встаёт тому бог подаёт,' +
  'слово серебро молчание золото,без муки нет науки'
).split(',');

let text = '', pos = 0, typed = '', errors = 0, tStart = 0, running = false, timer = null;

function buildDom() {
  Shell.stage().innerHTML = `
    <p class="ttext" id="ttext"></p>
    <input class="tinput" id="tin" autocomplete="off" spellcheck="false" placeholder="Печатай здесь…">
    <p class="tstats" id="tstat"></p>`;
  $('tin').addEventListener('input', onInput);
}

function pickText() {
  text = PHRASES[Shell.rnd(PHRASES.length)];
  pos = 0;
  typed = '';
  $('tin').value = '';
  paint();
}

function paint() {
  const done = [...text.slice(0, pos)].map((ch, i) =>
    typed[i] === ch ? `<span class="done">${ch}</span>` : `<span class="err">${ch}</span>`).join('');
  const cur = text[pos] ?? '';
  $('ttext').innerHTML = done + `<span class="cur">${cur}</span>` + text.slice(pos + 1);
}

function onInput() {
  if (!running) return;
  typed = $('tin').value;
  pos = typed.length;
  if (typed[pos - 1] !== text[pos - 1]) {
    errors++;
    SFX.bad();
  } else {
    SFX.place();
  }
  paint();
  const elapsedMin = (performance.now() - tStart) / 60000;
  const correct = pos - errors;
  const cpm = elapsedMin > 0.02 ? Math.max(0, Math.round(correct / elapsedMin)) : 0;
  const acc = pos ? Math.max(0, Math.round(100 * correct / pos)) : 100;
  Shell.setStat('cpm', cpm);
  Shell.setStat('acc', acc + '%');
  if (pos >= text.length) {
    SFX.good();
    pickText();
  }
}

function tick() {
  const left = Math.max(0, 60000 - (performance.now() - tStart));
  if (left <= 0) {
    running = false;
    clearInterval(timer);
    $('tin').disabled = true;
    const elapsedMin = (performance.now() - tStart) / 60000;
    const cpm = Math.max(0, Math.round((pos - errors) / elapsedMin));
    const acc = pos ? Math.max(0, Math.round(100 * (pos - errors) / pos)) : 100;
    const record = Shell.tryRecord(cpm);
    SFX.win();
    Shell.showOver({
      cause: 'Знаков в минуту (без ошибок)',
      score: cpm,
      rows: [['Точность', acc + '%']],
      record,
    });
    return;
  }
  timer = setTimeout(tick, 200);
}

function start() {
  buildDom();
  errors = 0;
  tStart = performance.now();
  running = true;
  Shell.setStat('cpm', 0);
  Shell.setStat('acc', '100%');
  pickText();
  $('tin').disabled = false;
  $('tin').focus();
  tick();
}

function stop() {
  running = false;
  clearInterval(timer);
}

buildDom();
