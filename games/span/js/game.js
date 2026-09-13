'use strict';

/* Цепочка: запомни число, введи его обратно. С каждым уровнем длиннее. 3 жизни. */
Shell.init({
  rules: `На несколько секунд показывается число — запомни и введи его в поле.
Каждый верный ответ добавляет одну цифру к следующему числу.
3 жизни: третья ошибка — конец. Рекорд — достигнутый уровень (длина числа).`,
  id: 'span',
  icon: '🔢',
  title: 'ЦЕПОЧКА',
  tagline: 'Запомни число и введи его. С каждым уровнем — на цифру длиннее',
  stats: [['level', 'Уровень'], ['lives', 'Жизни'], ['best', 'Рекорд']],
  bestKey: 'span.best',
  hints: ['Число показывается несколько секунд', '3 жизни'],
  onPlay() { start(); },
  onMenu() { stop(); Shell.showMenu(); },
});

let level = 3, lives = 3, secret = '', phase = 'idle', hideTimer = null;

function buildDom() {
  Shell.stage().innerHTML = `
    <p class="status2" id="spStatus"></p>
    <div class="seq" id="seq"></div>
    <div class="row">
      <input class="seqinput" id="spIn" inputmode="numeric" maxlength="16" autocomplete="off">
      <button class="btn primary seqbtn" id="spGo">ОК</button>
    </div>`;
  $('spGo').addEventListener('click', submit);
  $('spIn').addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
}

function start() {
  level = 3; lives = 3;
  Shell.setStat('level', level);
  Shell.setStat('lives', '●●●');
  nextLevel();
}

function nextLevel() {
  phase = 'show';
  secret = '';
  for (let i = 0; i < level; i++) secret += Shell.rnd(10);
  $('spStatus').textContent = 'Запомни!';
  $('seq').textContent = secret;
  $('spIn').value = '';
  $('spIn').disabled = true;
  $('spGo').disabled = true;
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    if (phase !== 'show') return;
    phase = 'input';
    $('seq').textContent = '•'.repeat(level);
    $('spStatus').textContent = 'Введи число по памяти';
    $('spIn').disabled = false;
    $('spGo').disabled = false;
    $('spIn').focus();
  }, 1200 + level * 700);
}

function submit() {
  if (phase !== 'input') return;
  const val = $('spIn').value.trim();
  if (!val) return;
  if (val === secret) {
    SFX.good();
    level++;
    Shell.setStat('level', level);
    nextLevel();
  } else {
    SFX.bad();
    lives--;
    Shell.setStat('lives', '●'.repeat(Math.max(0, lives)) || '—');
    if (lives <= 0) {
      stop();
      const record = Shell.tryRecord(level - 1);
      Shell.showOver({
        cause: 'Было показано: ' + secret,
        score: level - 1,
        rows: [['Уровень', level - 1]],
        record,
      });
    } else {
      $('spStatus').textContent = 'Ошибка! Попробуй ещё раз';
      phase = 'idle';
      setTimeout(() => { if (phase === 'idle') nextLevel(); }, 900);
    }
  }
}

function stop() {
  phase = 'idle';
  clearTimeout(hideTimer);
}

buildDom();
