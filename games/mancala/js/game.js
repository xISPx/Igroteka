'use strict';

/* Манкала (калах): сей камни против часовой.
   Последний камень в свой магазин —_extra ход; в пустую свою яму — захват. */
Shell.init({
  rules: `Клик по своей яме (нижний ряд) — камни раскладываются по одному против часовой стрелки; свой магазин пропускаешь, магазин ИИ — тоже.
Последний камень упал в твой магазин — ещё один ход подряд.
Последний камень упал в пустую свою яму — забираешь камни из ямы напротив.
Ямы у кого-то опустели — второй забирает остаток. У кого больше в магазине — победа.`,
  id: 'mancala',
  icon: '🫘',
  title: 'МАНКАЛА',
  tagline: 'Кто соберёт больше камней в свой магазин. Последний камень в магазин даёт ещё ход',
  stats: [['best', 'Победы']],
  bestKey: 'mancala.wins',
  bestLabel: 'Побед над ИИ',
  hints: ['Клик по своей яме — посеять', 'Ходи по часовой (вверх → вправо → вниз → влево)'],
  onPlay() { start(); },
  onMenu() { Shell.showMenu(); },
});

/* Ямы: 0..5 — игрок (нижние, справа налево при севе), 6 — магазин игрока,
   7..12 — ИИ (верхние), 13 — магазин ИИ. Сев против часовой: i+1 по кругу. */
let pits, over, lock;

function draw() {
  const aiPits = [12, 11, 10, 9, 8, 7];   // вид слева направо
  const myPits = [0, 1, 2, 3, 4, 5];      // вид слева направо
  const pit = (i, mine) => {
    const empty = pits[i] === 0;
    return `<div class="pit ${mine ? 'mine' : 'ai'} ${empty ? 'empty' : ''}" data-i="${i}">
      <span class="pnum">${pits[i]}</span></div>`;
  };
  Shell.stage().innerHTML = `
    <p class="status4" id="mStatus"></p>
    <div class="mwrap">
      <div class="store"><span class="num">${pits[13]}</span><span class="who">ИИ</span></div>
      <div class="mcols">
        <div class="mrow">${aiPits.map(i => pit(i, false)).join('')}</div>
        <div class="mrow">${myPits.map(i => pit(i, true)).join('')}</div>
      </div>
      <div class="store"><span class="num">${pits[6]}</span><span class="who">Ты</span></div>
    </div>`;
  Shell.stage().querySelectorAll('.pit.mine').forEach(el =>
    el.addEventListener('click', () => move(+el.dataset.i, 1)));
  setStatus(over ? '' : lock ? 'Ход ИИ…' : 'Твой ход');
}

function setStatus(t) { const el = $('mStatus'); if (el) el.textContent = t; }

function move(i, who) {
  if (over || lock) return;
  const isMine = who === 1;
  if (isMine ? (i > 5 || pits[i] === 0) : (i < 7 || i > 12 || pits[i] === 0)) return;
  let stones = pits[i];
  pits[i] = 0;
  let pos = i;
  const store = isMine ? 6 : 13;
  const skip = isMine ? 13 : 6; // чужой магазин пропускаем
  while (stones > 0) {
    pos = (pos + 1) % 14;
    if (pos === skip) continue;
    pits[pos]++;
    stones--;
  }
  SFX.place();
  let extra = false;
  if (pos === store) {
    extra = true;
    SFX.scoreUp();
  } else if (isMine && pos <= 5 && pits[pos] === 1 && pits[12 - pos] > 0) {
    // захват: последний камень в пустую свою яму
    pits[6] += pits[12 - pos] + 1;
    pits[12 - pos] = 0;
    pits[pos] = 0;
    SFX.good();
  } else if (!isMine && pos >= 7 && pos <= 12 && pits[pos] === 1 && pits[12 - pos] > 0) {
    pits[13] += pits[12 - pos] + 1;
    pits[12 - pos] = 0;
    pits[pos] = 0;
    SFX.good();
  }
  // конец: у кого-то пустые все ямы
  const mySum = pits[0] + pits[1] + pits[2] + pits[3] + pits[4] + pits[5];
  const aiSum = pits[7] + pits[8] + pits[9] + pits[10] + pits[11] + pits[12];
  if (mySum === 0 || aiSum === 0) {
    pits[6] += mySum;
    pits[13] += aiSum;
    for (let k = 0; k < 14; k++) if (k !== 6 && k !== 13) pits[k] = 0;
    return finish();
  }
  draw();
  if (extra) {
    if (isMine) { setStatus('Ещё ход!'); return; }
    setTimeout(() => aiTurn(), 600);
    return;
  }
  if (isMine) {
    lock = true;
    draw();
    setTimeout(aiTurn, 700);
  } else {
    lock = false;
    draw();
  }
}

function aiTurn() {
  if (over) return;
  // жадный ИИ: доп.ход > захват > больше в магазин
  const cands = [];
  for (let i = 7; i <= 12; i++) {
    if (!pits[i]) continue;
    let stones = pits[i], pos = i, score = 0;
    while (stones > 0) {
      pos = (pos + 1) % 14;
      if (pos === 6) continue;
      stones--;
    }
    if (pos === 13) score += 100;            // доп. ход
    if (pos >= 7 && pos <= 12 && pits[pos] === 0 && pits[12 - pos] > 0) score += 50 + pits[12 - pos];
    score += pits[i] + Shell.rnd(4);
    cands.push([i, score]);
  }
  cands.sort((a, b) => b[1] - a[1]);
  if (!cands.length) return finish();
  move(cands[0][0], 2);
}

function finish() {
  over = true;
  lock = false;
  draw();
  const my = pits[6], aiS = pits[13];
  if (my > aiS) {
    const first = Shell.bumpWins();
    SFX.win();
    Shell.showOver({ won: true, cause: `${my} : ${aiS} в твою пользу`, score: null, record: first });
  } else if (my < aiS) {
    SFX.bad();
    Shell.showOver({ cause: `ИИ собрал больше: ${aiS} : ${my}`, score: null });
  } else {
    SFX.click();
    Shell.showOver({ cause: 'Ничья: ' + my + ' : ' + aiS, score: null });
  }
}

function start() {
  pits = Array(14).fill(4);
  pits[6] = 0; pits[13] = 0;
  over = false; lock = false;
  draw();
}

start();
