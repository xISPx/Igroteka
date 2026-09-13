'use strict';

/* Струп-тест: слово-цвет написано другим цветом.
   Задание меняется: выбрать ЦВЕТ текста или СМЫСЛ слова. 45 секунд. */
Shell.init({
  rules: `Читай задание сверху: «Выбери ЦВЕТ текста» или «Выбери СМЫСЛ слова».
Слово «КРАСНЫЙ», написанное синим: цвет — синий, смысл — красный. Мозг будет путаться — в этом и игра.
45 секунд; верный ответ +1, ошибка −1. Клавиши 1–4 равны цветным кнопкам.`,
  id: 'stroop',
  icon: '🎨',
  title: 'СТРУП',
  tagline: 'Выбирай цвет текста или смысл слова — задание меняется само. 45 секунд',
  stats: [['score', 'Счёт'], ['time', 'Время'], ['best', 'Рекорд']],
  bestKey: 'stroop.best',
  hints: ['1–4 или клик по цвету'],
  menuHint: 'Внимательно читай задание сверху!',
  onPlay() { start(); },
  onMenu() { stop(); Shell.showMenu(); },
});

const COLORS_RU = [
  { name: 'КРАСНЫЙ', hex: '#ff5d6c' },
  { name: 'ЗЕЛЁНЫЙ', hex: '#34f5a5' },
  { name: 'СИНИЙ', hex: '#4da3ff' },
  { name: 'ЖЁЛТЫЙ', hex: '#ffd166' },
];
const COLORS_EN = [
  { name: 'RED', hex: '#ff5d6c' },
  { name: 'GREEN', hex: '#34f5a5' },
  { name: 'BLUE', hex: '#4da3ff' },
  { name: 'YELLOW', hex: '#ffd166' },
];
let COLORS = COLORS_RU;
let playing = false, score = 0, tEnd = 0, timer = null;
let task = 'color', word = COLORS[0], inkIdx = 0;

function buildDom() {
  Shell.stage().innerHTML = `
    <p class="task" id="task"></p>
    <div class="word" id="word"></div>
    <div class="answers" id="answers"></div>
    <p class="scoreline" id="scoreline"></p>`;
}

function next() {
  if (!playing) return;
  task = Math.random() < 0.5 ? 'color' : 'meaning';
  word = COLORS[Shell.rnd(4)];
  inkIdx = Shell.rnd(4);
  $('task').textContent = task === 'color' ? 'Выбери ЦВЕТ текста:' : 'Выбери СМЫСЛ слова:';
  const w = $('word');
  w.textContent = word.name;
  w.style.color = COLORS[inkIdx].hex;
  $('answers').innerHTML = COLORS.map((c, i) =>
    `<button class="ansbtn c${i}" data-i="${i}">${c.name}</button>`).join('');
  $('answers').querySelectorAll('.ansbtn').forEach(b =>
    b.addEventListener('click', () => answer(+b.dataset.i)));
}

function answer(i) {
  if (!playing) return;
  const correct = task === 'color'
    ? i === inkIdx
    : COLORS[i].name === word.name;
  if (correct) { score++; SFX.good(); } else { score = Math.max(0, score - 1); SFX.bad(); }
  Shell.setStat('score', score);
  next();
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
  COLORS = window.LANG && LANG() === 'en' ? COLORS_EN : COLORS_RU;
  buildDom();
  score = 0;
  Shell.setStat('score', 0);
  tEnd = performance.now() + 45000;
  playing = true;
  next();
  tick();
}

function stop() {
  playing = false;
  clearTimeout(timer);
}

window.addEventListener('keydown', e => {
  SFX.ensure();
  const map = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3 };
  if (map[e.code] !== undefined) answer(map[e.code]);
});

buildDom();
