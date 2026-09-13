'use strict';

/* Ханойская башня: перенеси все диски на правый стержень.
   Клик — выбрать стержень, второй клик — перенести верхний диск. */
Shell.init({
  rules: `Клик по стержню — взять верхний диск, клик по другому стержню — перенести его туда.
Класть можно только меньший диск на больший, по одному за ход.
Перенеси всю башню на правый стержень. Минимум ходов — 31; рекорд считается по ходам.`,
  id: 'hanoy',
  icon: '🗼',
  title: 'ХАНОЙ',
  tagline: 'Перенеси башню на правый стержень. Класть можно только меньший диск на больший',
  stats: [['moves', 'Ходы'], ['best', 'Рекорд']],
  bestKey: 'hanoy.best',
  bestLower: true,
  bestZero: '—',
  bestFmt: v => v + ' ход.',
  hints: ['Клик — выбрать/перенести', 'Минимум ходов: 31'],
  onPlay() { build(); },
  onMenu() { Shell.showMenu(); },
});

const N = 5;
const COLORS = ['#ff5d6c', '#ff9f43', '#ffd166', '#34f5a5', '#4da3ff'];
let rods = [], sel = -1, moves = 0;

function build() {
  rods = [Array.from({ length: N }, (_, i) => N - i), [], []];
  sel = -1; moves = 0;
  Shell.setStat('moves', 0);
  draw();
}

function draw() {
  const st = Shell.stage();
  st.innerHTML = '<div class="towers">' + rods.map((disks, r) =>
    `<div class="tower ${sel === r ? 'sel' : ''}" data-r="${r}">
       ${disks.map((d, k) =>
         `<div class="disc" style="bottom:${k * 28 + 4}px;width:${34 + d * 15}px;background:linear-gradient(135deg,${COLORS[d - 1]},rgba(0,0,0,.35)),${COLORS[d - 1]}"></div>`).join('')}
       <span class="tname">${['A', 'B', 'C'][r]}</span>
     </div>`).join('') + '</div>';
  st.querySelectorAll('.tower').forEach(el =>
    el.addEventListener('click', () => click(+el.dataset.r)));
}

function click(r) {
  SFX.ensure();
  if (sel === -1) {
    if (!rods[r].length) return;
    sel = r;
    SFX.click();
  } else if (sel === r) {
    sel = -1;
  } else {
    const from = rods[sel], to = rods[r];
    const d = from[from.length - 1];
    if (!to.length || to[to.length - 1] > d) {
      to.push(from.pop());
      moves++;
      Shell.setStat('moves', moves);
      SFX.place();
      sel = -1;
      if (rods[2].length === N) win();
    } else {
      SFX.bad();
      sel = -1;
    }
  }
  draw();
}

function win() {
  const record = Shell.tryRecord(moves);
  SFX.win();
  Shell.showOver({
    won: true,
    cause: 'Башня перенесена!',
    score: null,
    rows: [['Ходы', moves], ['Минимум', '31']],
    record,
  });
}

build();
