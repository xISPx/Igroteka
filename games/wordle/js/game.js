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

const WORDS_RU = ('абзац адрес алмаз ангел арена бамбук барон басня батон бегун берег билет ' +
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

const WORDS_EN = ('about above abuse actor acute admit adopt adult after again agent agree ahead alarm album alert alien alike alive allow alone along alter among angel anger angle angry ankle apart apple apply arena argue arise armor aroma array arrow aside asset atlas audio avoid awake award aware badly baker basic beach beard beast began begin being belly below bench berry birth black blade blame blank blast blaze bleak blend bless blind blink block blood bloom blown blues blunt blush board boast bonus boost booth bound brain brake brand brass brave bread break breed brick bride brief bring brisk broad broke bronze brook brown brush build built bunch burst cabin cable camel cameo canal candy canoe cargo carry carve catch cause cease cedar chain chair chalk charm chart chase cheap cheat check cheek cheer chess chest chief child chill china choir chord chose chunk churn cider cigar civic civil claim clamp clash clasp class clean clear clerk click cliff climb cling cloak clock close cloth cloud clown coach coast cobra cocoa colon color comet coral couch cough could count court cover crack craft crane crash crate crawl crazy cream creed creek creep crest crime crisp cross crowd crown crude cruel crush crust cubic curly curve cycle daily dairy daisy dance dated dealt debut decor delay delta demon dense depth diary dirty dodge doing donor doubt dozen draft drain drama drank drape dream dress dried drift drill drink drive drone drove drown drunk dusty dwarf dwell dying eager eagle early earth easel eaten ebony eight elbow elder elect elite empty enact ended enemy enjoy enter entry envoy equal equip erase erode error essay ethic evade event every evict exact exert exile exist extra fable facet faint fairy faith false fancy fatal fault favor feast fence ferry fetch fever fewer fiber field fiery fifth fifty fight final first fixed flair flame flash flank flare fleet flesh flick fling flint float flock flood floor flora flour fluid flush flute foamy focal focus foggy foray force forge forth forty forum found foyer frame fraud freak fresh friar fried front frost froth fruit fudge fully funny gauge gecko ghost giant given giver glade gland glare glass glaze gleam glide gloss glove gnome going goose gorge grace grade grain grand grant grape graph grasp grass grave gravy great green greet grief grill grind groan groom grope gross group grove growl grown gruel guard guess guest guide guild guilt habit handy happy hardy harsh haste hasty hatch haunt haven havoc hazel heart heavy hedge hefty hello hence heron hobby holly honey honor horse hotel hound house hover human humid humor hurry husky hydro hyena icing ideal idiom idiot igloo image imply index inner input intro irony issue ivory jelly jewel joint jolly judge juice jumbo jumpy juror karma kayak kiosk kneel knife knock known koala label labor lance large larva laser latch later latte laugh layer leafy leaky learn lease leash least leave ledge legal lemon level lever light liken lilac limit liner liver llama lobby local lodge lofty logic loose lorry lotus loyal lucid lucky lunar lunch lurch lying macro madam magic magma maize major mango manor maple march match medal media melon mercy merge merit merry metal meter midst might mimic mince minor minus mirth mixed mixer model moist molar money month moody moral motor mound mount mourn mouse mouth mover movie muddy multi mummy mural murky music naive nasal navel needy nerve never newer newly night ninja ninth noble noise noisy north notch novel nudge nurse nylon oasis occur ocean octet offer often olive onion onset opera orbit order organ other otter ought ounce outer overt oxide ozone paint panda panel panic paper parka party pasta paste patch patio pause peace peach pearl pedal penny perch peril petal phase phone photo piano picnic piece piety piggy pilot pinch pitch pixel pixie place plaid plain plane plank plant plate plaza plead pleat pluck plumb plume plush point polar polka porch pouch pound power prank press price pride prime print prior prism privy prize probe prone prong proof prose proud prove prowl prune pulse punch pupil puppy purse pushy queen query quest queue quick quiet quill quilt quirk quite quota quote rabid radar radio rainy raise rally ranch range rapid raspy ratio raven rayon reach react ready realm rebel refer regal reign relax relay renew repay reply rerun reset resin retro rhyme rider ridge rifle right rigid rinse risky rival river roast robin robot rocky rodeo rogue roomy rotor rouge rough round route royal rugby ruler rumor rural rusty salad salsa salty sandy sassy sauce sauna saute savor savvy scald scale scalp scaly scarf scene scent scoff scold scoop scope score scout scrap screw scrub sedan seedy seize sense serve setup shark sharp shell shine shiny shirt shock shore short shout shown shrub sight silly since siren sixth sixty skate skier skill skirt skull slate sleek sleep sleet slice slick slide slime slimy sling slope sloppy sloth small smart smash smear smell smelt smile smirk smoky snack snail snake sneak snowy soapy sober solar solid solve sonar sonic sooty sorry sound south space spade spare spark spawn speak spear speed spell spend spice spicy spike spine spiny split spoil spoke spoof spook spool spoon spore sport spout spray spree sprig spurn spurt squad squat stack staff stage stain stair stake stale stalk stall stamp stand stank stare start state stead steak steal steam steed steel steep steer stern stick stiff still stilt sting stink stint stock stoic stoke stone stony stood stool stoop store stork storm story stout stove strap straw stray strip strut stuck study stuff stump stung style suave sugar suite sulky sunny super surge sushi swamp swarm sweat sweep sweet swell swift swirl swish sword swore table taboo tacit tacky taffy taunt tawny teach teary tease teddy teeth tempo tenet tenor tense tenth thank theft their theme there these thick thief thigh thing think third thorn those three threw throb throw thumb thump tiara tidal tiger tight timer tipsy title toast today token tonic tooth topaz topic torch total totem touch tough towel tower toxic trace track tract trade trail train trait trash tread treat trend triad trial tribe trick tried trite troll troop trope trout truce truck truly trunk truss trust truth tulip tumor tunic turbo tutor twang tweak tweed tweet twice twine twist tying udder ulcer ultra umber uncle uncut under undid undue unfit unify union unite unity untie until upper upset urban usage usher usual utter vague valid valor value valve vapor vault vegan venom venue verge verse video vigor villa vinyl viola viper viral virus visit visor vista vital vivid vocal vodka vogue voice vomit voter vouch vowel wacky wafer wager wagon waist waltz waste watch water weary weave wedge weedy weigh weird whale wharf wheat wheel where which whiff while whirl whisk white whole whose widen widow width wield wince winch windy wiser wispy witch witty woken woman women woody world worry worse worst worth would wound woven wrath wreck wrist write wrong wrote xenon yacht yearn yeast yield young youth zebra zesty').split(' ').filter(w => w.length === 5);

const LAYOUT_RU = ['йцукенгшщзхъ', 'фывапролджэ', 'ячсмитьбю'];
const LAYOUT_EN = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
let WORDS = WORDS_RU, LAYOUT = LAYOUT_RU;

function pickWordLang() {
  const en = window.LANG && LANG() === 'en';
  WORDS = en ? WORDS_EN : WORDS_RU;
  LAYOUT = en ? LAYOUT_EN : LAYOUT_RU;
}
window.addEventListener('langchange', () => {
  pickWordLang();
  if ($('menuOverlay') && !$('menuOverlay').classList.contains('hidden')) start();
});
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
  pickWordLang();
  secret = WORDS[Shell.rnd(WORDS.length)];
  cur = ''; at = 0;
  buildDom();
}

window.addEventListener('keydown', e => {
  SFX.ensure();
  if ($('menuOverlay') && !$('menuOverlay').classList.contains('hidden')) return;
  const map = 'qwertyuiopasdfghjklzxcvbnm';
  const ru = 'йцукенгшщзхъфывапролджэячсмитьбю';
  const i = (window.LANG && LANG() === 'en') ? -1 : map.indexOf(e.key.toLowerCase());
  if (i >= 0) type(ru[i]);
  else if (LAYOUT.join('').includes(e.key.toLowerCase()) && e.key.length === 1) type(e.key.toLowerCase());
  else if (e.key === 'Enter') submit();
  else if (e.key === 'Backspace') back();
});

start();
