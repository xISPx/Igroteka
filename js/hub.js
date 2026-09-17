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
  fifteen: { v: numOr('fifteen.best', null), f: v => '🏆 ' + v + ' ' + plural(v, 'ход', 'хода', 'ходов') },
  tictac: { v: num('tictac.wins'), f: winsLabel },
  reversi: { v: num('reversi.wins'), f: winsLabel },
  pairs: { v: numOr('pairs.best', null), f: v => '🏆 ' + v + ' ' + plural(v, 'ход', 'хода', 'ходов') },
  moles: { v: num('moles.best'), f: v => '🏆 ' + v },
  simon: { v: num('simon.best'), f: v => '🏆 уровень ' + v },
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
