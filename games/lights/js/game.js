'use strict';

/* Выключи свет: клик переключает клетку и четырёх соседей.
   Погасить все лампы за минимум ходов. */
Shell.init({
  rules: `Клик по лампе переключает её и четырёх соседей крестом.
Погаси все лампы. Поле всегда решаемо — генерируется обратными ходами.
Рекорд — минимальное число кликов. Если зашли в тупик — «Заново» перемешает новое поле.`,
  id: 'lights',
  icon: '💡',
  title: 'ВЫКЛЮЧИ СВЕТ',
  tagline: 'Каждый клик переключает лампу и её соседей. Погаси все за минимум ходов',
  stats: [['moves', 'Ходы'], ['best', 'Рекорд']],
  bestKey: 'lights.best',
  bestLower: true,
  bestZero: '—',
  bestFmt: v => v + ' ход.',
  hints: ['Клик — переключить плюс-фигуру'],
  onPlay() { build(); },
  onMenu() { Shell.showMenu(); },
});

const N = 5;
let grid = [], moves = 0;

function build() {
  // генерируем решаемое поле случайными кликами
  do {
    grid = Array.from({ length: N * N }, () => false);
    for (let k = 0; k < 10 + Shell.rnd(5); k++) toggleAt(Shell.rnd(N * N), true);
  } while (grid.every(v => !v));
  moves = 0;
  Shell.setStat('moves', 0);
  draw();
}

function draw() {
  const st = Shell.stage();
  st.innerHTML = '<div class="lgrid">' +
    grid.map((on, i) => `<div class="lcell ${on ? 'on' : ''}" data-i="${i}"></div>`).join('') +
    '</div>';
  st.querySelectorAll('.lcell').forEach(el =>
    el.addEventListener('click', () => click(+el.dataset.i)));
}

function toggleAt(i, silent) {
  const x = i % N, y = (i / N) | 0;
  const cells = [[x, y], [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
  for (const [cx, cy] of cells) {
    if (cx >= 0 && cy >= 0 && cx < N && cy < N) grid[cy * N + cx] = !grid[cy * N + cx];
  }
  if (!silent) SFX.flip();
}

function click(i) {
  SFX.ensure();
  toggleAt(i);
  moves++;
  Shell.setStat('moves', moves);
  draw();
  if (grid.every(v => !v)) {
    const record = Shell.tryRecord(moves);
    SFX.win();
    Shell.showOver({
      won: true,
      cause: 'Все лампы погашены!',
      score: null,
      rows: [['Ходы', moves]],
      record,
    });
  }
}

build();
