'use strict';

/* Виселица: угадай слово за 7 ошибок. Ошибки — части виселицы. */
Shell.init({
  rules: `Угадай русское слово, открывая буквы: экранная клавиатура или физическая (раскладка не важна).
Каждая ошибка дорисовывает часть виселицы. 7 ошибок — поражение, слово покажут.
Победы копятся в рекорде. Начни с гласных — они чаще встречаются.`,
  id: 'hangman',
  icon: '🎯',
  title: 'ВИСЕЛИЦА',
  tagline: 'Угадай слово по буквам. На ошибки — 7 попыток',
  stats: [['best', 'Победы']],
  bestKey: 'hangman.wins',
  bestLabel: 'Побед',
  hints: ['Клавиатура на экране или физическая'],
  onPlay() { start(); },
  onMenu() { Shell.showMenu(); },
});

const WORDS = ('арбуз берег ветер город дерево жираф закат интерес карта лимон магазин ' +
  'мороз небо облако парус ремонт солнце трактор узор фонтан хлеб цветок человек ' +
  'чайник шарик шкаф щенок экран юг яблоко яхта бумага ведро гитара дельфин ежевика ' +
  'жёлудь зеркало изюм камень лиса медведь носорог орех перо радуга стул троллейбус ' +
  'улитка флаг художник цыплёнок часы черёмуха шёлк щука эскалатор юрта якорь билет ' +
  'волейбол гром домик ёлка жаворонок звезда икра кабинет лампа метро ножницы облака ' +
  'пингвин ручей тюльпан урожай фонарь хлебозавод цапля чайка шампунь щётка экватор ' +
  'янтарь батон виноград горох дудка ёжик журавль зубр индюк кактус лимузин мандарин ' +
  'незабудка овца панда рисунок тигр уксус фиалка хомяк цирк чемодан шапка экипаж ' +
  'бархат гвоздика душ жилет заяц иней крокодил мачта нарцисс обруч пчела ромашка ' +
  'телевизор узел фиолет хвост цемент черепаха шлем').split(' ');

const KEYS = 'йцукенгшщзхъфывапролджэячсмитьбю';
const LAYOUT = ['йцукенгшщзхъ', 'фывапролджэ', 'ячсмитьбю'];
let word = '', used = new Set(), mistakes = 0;
const MAX_ERR = 7;

function buildDom() {
  Shell.stage().innerHTML = `
    <div class="hwrap">
      <canvas class="gal" id="gal" width="260" height="340"></canvas>
      <div style="display:flex;flex-direction:column;gap:10px;align-items:center">
        <div class="word2" id="hword"></div>
        <div class="mist" id="hmist"></div>
        <div class="kb" id="hkb"></div>
      </div>
    </div>`;
  const kb = $('hkb');
  for (const row of LAYOUT) {
    const r = document.createElement('div');
    r.className = 'krow';
    for (const ch of row) {
      const b = document.createElement('button');
      b.className = 'key';
      b.textContent = ch;
      b.addEventListener('click', () => tryLetter(ch));
      r.appendChild(b);
    }
    kb.appendChild(r);
  }
}

function drawGallows() {
  const cv = $('gal'), c = cv.getContext('2d');
  c.clearRect(0, 0, cv.width, cv.height);
  c.strokeStyle = '#8ea0bf';
  c.lineWidth = 7;
  c.lineCap = 'round';
  const L = (x1, y1, x2, y2) => { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); };
  L(30, 320, 230, 320);              // основание
  if (mistakes >= 1) L(70, 320, 70, 40);   // столб
  if (mistakes >= 2) L(70, 40, 180, 40);   // балка
  if (mistakes >= 3) L(180, 40, 180, 75);  // верёвка
  c.strokeStyle = '#34f5a5';
  c.lineWidth = 5;
  if (mistakes >= 4) { c.beginPath(); c.arc(180, 100, 25, 0, 7); c.stroke(); }   // голова
  if (mistakes >= 5) L2(180, 125, 180, 215); // тело
  if (mistakes >= 6) { L2(180, 145, 150, 185); L2(180, 145, 210, 185); } // руки
  if (mistakes >= 7) { L2(180, 215, 155, 270); L2(180, 215, 205, 270); } // ноги
  function L2(x1, y1, x2, y2) { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
}

function paint() {
  $('hword').innerHTML = [...word].map(ch =>
    used.has(ch) ? `<span>${ch}</span>` : '<span class="miss">_</span>').join('');
  $('hmist').textContent = mistakes ? 'Ошибок: ' + mistakes + ' из ' + MAX_ERR : '';
  drawGallows();
}

function tryLetter(ch) {
  SFX.ensure();
  if (!word || used.has(ch)) return;
  if (document.getElementById('overOverlay') && !$('overOverlay').classList.contains('hidden')) return;
  if ($('menuOverlay') && !$('menuOverlay').classList.contains('hidden')) return;
  used.add(ch);
  document.querySelectorAll('.key').forEach(k => {
    if (k.textContent === ch) k.classList.add(word.includes(ch) ? 'hit' : 'miss');
  });
  if (word.includes(ch)) {
    SFX.good();
    paint();
    if ([...word].every(c => used.has(c))) {
      const first = Shell.bumpWins();
      SFX.win();
      Shell.showOver({ won: true, cause: 'Слово: ' + word, score: null, record: first });
    }
  } else {
    mistakes++;
    SFX.bad();
    paint();
    if (mistakes >= MAX_ERR) {
      SFX.die();
      Shell.showOver({ cause: 'Слово было: ' + word, score: null });
    }
  }
}

function start() {
  word = WORDS[Shell.rnd(WORDS.length)];
  used = new Set();
  mistakes = 0;
  buildDom();
  paint();
}

window.addEventListener('keydown', e => {
  SFX.ensure();
  // физическая клавиатура: маппинг раскладки EN → ЙЦУКЕН
  const map = 'qwertyuiopasdfghjklzxcvbnm';
  const ru = 'йцукенгшщзхъфывапролджэячсмитьбю';
  const i = map.indexOf(e.key.toLowerCase());
  if (i >= 0) tryLetter(ru[i]);
  else if (KEYS.includes(e.key.toLowerCase())) tryLetter(e.key.toLowerCase());
});

start();
