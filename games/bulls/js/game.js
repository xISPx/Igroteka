'use strict';

/* Быки и коровы: угадай 4 разные цифры.
   Бык — цифра на своём месте, корова — есть, но не на месте. */
Shell.init({
  rules: `Компьютер загадал 4 разные цифры от 0 до 9. Вводи варианты: 4 цифры без повторов.
🐂 Бык — цифра угадана и стоит на своём месте. 🐄 Корова — цифра есть, но на другом месте.
Цель — 4 быка. Все попытки с ответами видны в журнале — анализируй. Рекорд — минимум попыток.`,
  id: 'bulls',
  icon: '🐄',
  title: 'БЫКИ И КОРОВЫ',
  tagline: 'Загаданы 4 разные цифры. Бык — цифра на своём месте, корова — не на своём',
  stats: [['tries', 'Попытки'], ['best', 'Рекорд']],
  bestKey: 'bulls.best',
  bestLower: true,
  bestZero: '—',
  bestFmt: v => v + ' поп.',
  hints: ['Вводи 4 цифры без повторов', 'Меньше попыток — лучше'],
  onPlay() { start(); },
  onMenu() { Shell.showMenu(); },
});

let secret = '', tries = 0;

function makeSecret() {
  const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
  secret = digits.slice(0, 4).join('');
}

function buildDom() {
  Shell.stage().innerHTML = `
    <div class="row">
      <input class="binput" id="bIn" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="????">
      <button class="btn primary" id="bGo">Проверить</button>
    </div>
    <p class="bhint" id="bHint">Например: 0123</p>
    <div class="blog" id="bLog"></div>`;
  $('bGo').addEventListener('click', guess);
  $('bIn').addEventListener('keydown', e => { if (e.key === 'Enter') guess(); });
}

function score(guessStr) {
  let bulls = 0, cows = 0;
  for (let i = 0; i < 4; i++) {
    if (guessStr[i] === secret[i]) bulls++;
    else if (secret.includes(guessStr[i])) cows++;
  }
  return { bulls, cows };
}

function guess() {
  const val = $('bIn').value.trim();
  if (!/^\d{4}$/.test(val)) { $('bHint').textContent = 'Нужно ровно 4 цифры'; SFX.bad(); return; }
  if (new Set(val).size !== 4) { $('bHint').textContent = 'Цифры не должны повторяться'; SFX.bad(); return; }
  $('bHint').textContent = 'Например: 0123';
  tries++;
  Shell.setStat('tries', tries);
  const s = score(val);
  const log = $('bLog');
  log.insertAdjacentHTML('afterbegin',
    `<div class="brow"><span class="bg">${val}</span>
     <span class="bscore"><b>🐂 ${s.bulls}</b> · <span class="cow">🐄 ${s.cows}</span></span></div>`);
  $('bIn').value = '';
  if (s.bulls === 4) {
    const record = Shell.tryRecord(tries);
    SFX.win();
    Shell.showOver({ won: true, cause: 'Число ' + val + ' разгадано!', score: null, rows: [['Попытки', tries]], record });
  } else {
    SFX.place();
    $('bIn').focus();
  }
}

function start() {
  makeSecret();
  tries = 0;
  Shell.setStat('tries', 0);
  buildDom();
  $('bIn').focus();
}

start();
