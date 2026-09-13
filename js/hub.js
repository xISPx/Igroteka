'use strict';

/* Рекорды на карточках главной страницы — читаем те же ключи localStorage, что и игры */
const HubStore = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
};

const fmtTime = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
const num = k => {
  const v = HubStore.get(k, 0);
  return typeof v === 'number' ? v : 0;
};
const numOr = (k, d) => {
  const v = HubStore.get(k, d);
  return typeof v === 'number' ? v : null;
};

function plural(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}
const winsLabel = v => '🏆 ' + v + ' ' + plural(v, 'победа', 'победы', 'побед');

/* Текст рекорда для каждой игры */
const LABELS = {
  zmeyka: { v: Math.max(num('zmeyka.best.classic'), num('zmeyka.best.portal'), num('zmeyka.best.arcade')), f: v => '🏆 ' + v },
  tetris: { v: num('tetris.best'), f: v => '🏆 ' + v },
  g2048: { v: num('g2048.best'), f: v => '🏆 ' + v },
  saper: { v: ['easy', 'medium', 'hard'].map(d => HubStore.get('saper.best.' + d, null)).filter(x => typeof x === 'number'), f: arr => '🏆 время: ' + fmtTime(Math.min(...arr)) },
  arkanoid: { v: num('arkanoid.best'), f: v => '🏆 ' + v },
  flappy: { v: num('flappy.best'), f: v => '🏆 ' + v },
  pong: { v: num('pong.wins'), f: winsLabel },
  dino: { v: num('dino.best'), f: v => '🏆 ' + v },
  asteroids: { v: num('asteroids.best'), f: v => '🏆 ' + v },
  invaders: { v: num('invaders.best'), f: v => '🏆 ' + v },
  doodle: { v: num('doodle.best'), f: v => '🏆 ' + v },
  copter: { v: num('copter.best'), f: v => '🏆 ' + v },
  moon: { v: num('moon.best'), f: v => '🏆 ' + v },
  arty: { v: num('arty.wins'), f: winsLabel },
  meteors: { v: num('meteors.best'), f: v => '🏆 ' + v },
  traffic: { v: num('traffic.best'), f: v => '🏆 ' + v + ' м' },
  orbs: { v: num('orbs.best'), f: v => '🏆 ' + v },
  fifteen: { v: numOr('fifteen.best', null), f: v => '🏆 ' + v + ' ' + plural(v, 'ход', 'хода', 'ходов') },
  tictac: { v: num('tictac.wins'), f: winsLabel },
  reversi: { v: num('reversi.wins'), f: winsLabel },
  connect4: { v: num('connect4.wins'), f: winsLabel },
  gomoku: { v: num('gomoku.wins'), f: winsLabel },
  nim: { v: num('nim.wins'), f: winsLabel },
  sea: { v: num('sea.wins'), f: winsLabel },
  bj: { v: num('bj.best'), f: v => '🏆 банк ' + v },
  mancala: { v: num('mancala.wins'), f: winsLabel },
  dots: { v: num('dots.wins'), f: winsLabel },
  sudoku: { v: numOr('sudoku.best', null), f: v => '🏆 время: ' + fmtTime(v) },
  hanoy: { v: numOr('hanoy.best', null), f: v => '🏆 ' + v + ' ' + plural(v, 'ход', 'хода', 'ходов') },
  lights: { v: numOr('lights.best', null), f: v => '🏆 ' + v + ' ' + plural(v, 'ход', 'хода', 'ходов') },
  match3: { v: num('match3.best'), f: v => '🏆 ' + v },
  sokoban: { v: numOr('sokoban.best', null), f: v => '🏆 ' + v + ' ' + plural(v, 'ход', 'хода', 'ходов') },
  hangman: { v: num('hangman.wins'), f: winsLabel },
  wordle: { v: num('wordle.wins'), f: winsLabel },
  bulls: { v: numOr('bulls.best', null), f: v => '🏆 ' + v + ' ' + plural(v, 'попытка', 'попытки', 'попыток') },
  typing: { v: num('typing.best'), f: v => '🏆 ' + v + ' з/м' },
  pairs: { v: numOr('pairs.best', null), f: v => '🏆 ' + v + ' ' + plural(v, 'ход', 'хода', 'ходов') },
  moles: { v: num('moles.best'), f: v => '🏆 ' + v },
  simon: { v: num('simon.best'), f: v => '🏆 уровень ' + v },
  reaction: { v: numOr('reaction.best', null), f: v => '🏆 ' + v + ' мс' },
  aim: { v: numOr('aim.best', null), f: v => '🏆 ' + (v / 1000).toFixed(1) + ' с' },
  rhythm: { v: num('rhythm.best'), f: v => '🏆 ' + v },
  span: { v: num('span.best'), f: v => '🏆 уровень ' + v },
  stroop: { v: num('stroop.best'), f: v => '🏆 ' + v },
  math: { v: num('math.best'), f: v => '🏆 ' + v },
  bubble: { v: num('bubble.best'), f: v => '🏆 ' + v },
  flow: { v: num('flow.best'), f: v => '🏆 уровень ' + v },
  stack: { v: num('stack.best'), f: v => '🏆 ' + v },
  code: { v: numOr('code.best', null), f: v => '🏆 ' + v + ' ' + plural(v, 'попытка', 'попытки', 'попыток') },
  hockey: { v: num('hockey.wins'), f: winsLabel },
};

document.querySelectorAll('[data-game]').forEach(el => {
  const cfg = LABELS[el.dataset.game];
  if (!cfg) return;
  if (typeof cfg.v === 'number') {
    if (cfg.v > 0) el.textContent = cfg.f(cfg.v);
  } else if (Array.isArray(cfg.v)) {
    if (cfg.v.length) el.textContent = cfg.f(cfg.v);
  } else if (cfg.v !== null) {
    el.textContent = cfg.f(cfg.v);
  }
});
