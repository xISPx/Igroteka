'use strict';

/* Слово: угадай слово из 5 букв за 6 попыток.
   Зелёный — буква на месте, жёлтый — есть в слове, серый — нет. */
Shell.init({
  rules: `Угадай слово из 5 букв за 6 попыток. Только существительные из словаря (в единственном числе).
После попытки буквы красятся: зелёный — на своём месте, жёлтый — есть в слове, но не здесь, серый — нет в слове.
Клавиатура снизу повторяет подсказки. Слова без повторов информативнее для первого хода.`,
  id: 'wordle',
  icon: '🔤',
  title: 'СЛОВО',
  tagline: 'Угадай слово из 5 букв за 6 попыток',
  stats: [['best', 'Победы']],
  bestKey: 'wordle.wins',
  bestLabel: 'Побед',
  hints: ['Зелёный — на месте · жёлтый — есть в слове · серый — нет'],
  menuHint: 'Только существительные в единственном числе',
  onPlay() { start(); },
  onMenu() { Shell.showMenu(); },
});

const WORDS = ('абзац адрес алмаз ангел арена бамбук барон басня батон бегун берег билет ' +
  'бисер блины блузка болото борец бочка бровь будка бумага буран бухта вагон валик ' +
  'ватра веник вексель весло ветер вилка вирус витрина вобла вода водопад воздух вокзал ' +
  'волан волна ворона восемь впадина время вулкан вымел выпад выстрел выступ газон ' +
  'галера гамак гараж гвоздь герой гигант гипс глагол глина голос голубь гонка гость ' +
  'грач гребень гриб гроза груша гуашь гудок гуляш гусар дебют декан дерево десерт ' +
  'десяток диван диктант динамо диплом длина дневник дождь доклад дорога досуг дракон ' +
  'дрель дробь друг дубление дупло дышло дюна дятел ежик елка ершик жабра жасминжелоб ' +
  'жесть жилет жираф жокей журнал забег забор завод загар задумка закат закон замок ' +
  'запас заряд затея захват звезда зверь зебра зелень земля зеркало зима знак знамя ' +
  'зонт зубр зыбь игла игра иллюзия индюк интерес икра искра истина кабинет каблук ' +
  'кадка камыш канал капот карта касса катер кашне квартал кедр кисть китель кладь ' +
  'класс клен клещ клумба ключ книга кобра ковш когда колба колено комар компот конец ' +
  'конь копейка корень корма коса котел кофта кочка кравать кран кресло кровь крыло ' +
  'кубик кузнец кукла купол курс кусок лампа лапта лебедь лейка лекция лемур лента ' +
  'лепесток лето ливень лимон линия листок лужа лыжи львица Любовь магия мазок майка ' +
  'макет малина манго марш масса мастер матрос мачта маяк мебель медаль мельница мешок ' +
  'метро мечта мидия мираж молот момент море мороз мозаика молодец монах мости ' +
  'мотив мошка мрамор музей музыка мусор мыло мышка мягкий мята наблюдение налим ' +
  'напев напор народ насос натиск наука нация небо невод неделя нейрон нож нырок ' +
  'обвал обед облако оборот образ овца огонь огурец одежда окно окорок олень оркестр ' +
  'орех осада остров отвага отваротель отель отзыв охота очаг папка парус паста паук ' +
  'пауза песня печаль пижама пирог письмо плата плечо пломба победа подарок покой ' +
  'полка помидор порог посёлок поток почта поэма права приз напом проверить простор ' +
  'пруд пуля пурга путник пчела пшено пятно работа радуга ракета рампа раскат расход ' +
  'реванш рекорд ремень репка решето ринг риски рисунок родник рояль рубеж рыбак ' +
  'рынок рябина салат салют сапог сарай свеча сцена сирень сказка скала скрепка ' +
  'слава словарь смета смола снежок сокол солнце сосна спектр стадо станок стакан ' +
  'стекло столб странник стрела струна ступня сугроб сумка сурок схема сырок сыпь ' +
  'табун тайга талант танец тариф творог темп театр тезис тело тема тень топор торг ' +
  'торт точка трава тревога трюмо туман тундра тупик турне тюлень тюльпан угол ' +
  'ужин узел уклон улитка уровень урожай утюг утка фабрика фазан фанат фарш фасоль ' +
  'февраль фиалка финал флаг флейта фонарь форма фрегат фрукт футбол халат хвост ' +
  'хмель хлеб хобби ходок холод хомяк хребет худоба цапля цветок цемент цирк цитата ' +
  'цифра цыплёнок чайка чайник чашка чердак черта чехол чижик число чтение чудак ' +
  'шампур шарик шарада швея шелест шёпот шинель шифр школа шпага шрифт штука щедрость ' +
  'щенок щётка экватор эклер эксперимент эллипс эмаль эпоха эхо юмор юрта яблоко ' +
  'ягода ядро яхта ячмень ящик').split(' ').filter(w => w.length === 5);

const LAYOUT = ['йцукенгшщзхъ', 'фывапролджэ', 'ячсмитьбю'];
let secret = '', rows = [], cur = '', at = 0;

function buildDom() {
  Shell.stage().innerHTML = `
    <div class="wgrid" id="wgrid"></div>
    <div class="wkb" id="wkb"></div>`;
  const g = $('wgrid');
  g.innerHTML = Array.from({ length: 6 }, () =>
    '<div class="wrow">' + Array.from({ length: 5 }, () => '<div class="wcell"></div>').join('') + '</div>').join('');
  const kb = $('wkb');
  LAYOUT.forEach((row, ri) => {
    const r = document.createElement('div');
    r.className = 'wkrow';
    if (ri === 2) {
      r.appendChild(keyEl('Enter', 'wide', () => submit()));
    }
    for (const ch of row) r.appendChild(keyEl(ch, '', () => type(ch)));
    if (ri === 2) {
      r.appendChild(keyEl('⌫', 'wide', () => back()));
    }
    kb.appendChild(r);
  });
}

function keyEl(label, cls, fn) {
  const b = document.createElement('button');
  b.className = 'wkey ' + cls;
  b.textContent = label;
  b.addEventListener('click', fn);
  return b;
}

function paintRow() {
  const cells = $('wgrid').children[at].children;
  for (let i = 0; i < 5; i++) {
    cells[i].textContent = cur[i] || '';
    cells[i].classList.toggle('fill', !!cur[i]);
  }
}

function type(ch) {
  SFX.ensure();
  if (at >= 6 || cur.length >= 5) return;
  cur += ch;
  SFX.click();
  paintRow();
}

function back() {
  if (at >= 6 || !cur.length) return;
  cur = cur.slice(0, -1);
  paintRow();
}

function submit() {
  if (at >= 6) return;
  if (cur.length !== 5) { SFX.bad(); return; }
  if (!WORDS.includes(cur)) {
    SFX.bad();
    // стряхиваем отклонённую строку и очищаем
    const row = $('wgrid').children[at];
    row.style.animation = 'none'; void row.offsetWidth;
    row.style.animation = 'wshake .3s ease';
    cur = '';
    setTimeout(paintRow, 150);
    return;
  }
  const res = Array(5).fill('bad');
  const rest = {};
  for (let i = 0; i < 5; i++) {
    if (cur[i] === secret[i]) res[i] = 'good';
    else rest[secret[i]] = (rest[secret[i]] || 0) + 1;
  }
  for (let i = 0; i < 5; i++) {
    if (res[i] !== 'good' && rest[cur[i]] > 0) { res[i] = 'mid'; rest[cur[i]]--; }
  }
  const cells = $('wgrid').children[at].children;
  for (let i = 0; i < 5; i++) cells[i].classList.add(res[i]);
  // подсветка клавиатуры
  document.querySelectorAll('.wkey').forEach(k => {
    const ch = k.textContent.toLowerCase();
    const idx = cur.indexOf(ch);
    if (idx === -1 || k.classList.contains('good')) return;
    if (res[idx] === 'good') k.classList.add('good');
    else if (res[idx] === 'mid' && !k.classList.contains('mid')) k.classList.add('mid');
    else if (res[idx] === 'bad' && !k.classList.contains('mid')) k.classList.add('bad');
  });
  SFX.place();
  if (cur === secret) {
    const first = Shell.bumpWins();
    SFX.win();
    Shell.showOver({ won: true, cause: 'Слово: ' + secret, score: null, rows: [['Попытки', at + 1]], record: first });
    at = 6;
    return;
  }
  at++;
  cur = '';
  if (at >= 6) {
    SFX.die();
    Shell.showOver({ cause: 'Не угадали. Слово: ' + secret, score: null });
  }
}

function start() {
  secret = WORDS[Shell.rnd(WORDS.length)];
  cur = ''; at = 0;
  buildDom();
}

window.addEventListener('keydown', e => {
  SFX.ensure();
  if ($('menuOverlay') && !$('menuOverlay').classList.contains('hidden')) return;
  const map = 'qwertyuiopasdfghjklzxcvbnm';
  const ru = 'йцукенгшщзхъфывапролджэячсмитьбю';
  const i = map.indexOf(e.key.toLowerCase());
  if (i >= 0) type(ru[i]);
  else if (LAYOUT.join('').includes(e.key.toLowerCase()) && e.key.length === 1) type(e.key.toLowerCase());
  else if (e.key === 'Enter') submit();
  else if (e.key === 'Backspace') back();
});

start();
