'use strict';

/* Общая оболочка игр Игротеки: шапка, HUD, оверлеи, звук, рекорды.
   Игра вызывает Shell.init(cfg) и реализует только логику. */
const $ = id => document.getElementById(id);

const Shell = {
  cfg: null,
  bestVal: null,
  hudCache: {},
  paused: false,

  store: {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  },
  clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
  rnd: n => (Math.random() * n) | 0,

  init(cfg) {
    this.cfg = cfg;
    this.bestVal = this.store.get(cfg.bestKey, cfg.bestLower ? null : 0);
    document.title = cfg.title + ' — Игротека';
    const stats = (cfg.stats || []).map(([id, label]) =>
      `<div class="stat"><span class="label">${label}</span><span class="value" id="st-${id}">${id === 'best' ? this.bestText() : 0}</span></div>`).join('');

    document.body.innerHTML = `
      <main class="wrap">
        <header class="top">
          <a class="back-btn" href="../../index.html">← Игры</a>
          <h1 class="logo">${cfg.icon} ${cfg.title}</h1>
          <div class="nav-right">
            <button id="soundBtn" class="icon-btn" title="Звук (M)">🔊</button>
          </div>
        </header>
        <section class="hud">${stats}</section>
        <section class="board" id="board">
          <div id="stage"></div>
          <div class="overlay" id="menuOverlay">
            <div class="panel">
              <h2 class="menu-title">${cfg.title}</h2>
              <p class="subtitle">${cfg.tagline}</p>
              <p class="best-line">${cfg.bestLabel || 'Рекорд'}: <b id="menuBest">${this.bestText()}</b></p>
              <button class="btn primary" id="playBtn">▶ Играть</button>
              ${cfg.menuHint ? `<p class="tiny-hint">${cfg.menuHint}</p>` : ''}
            </div>
          </div>
          <div class="overlay hidden" id="pauseOverlay">
            <div class="panel">
              <h2 class="pause-title">ПАУЗА</h2>
              <div class="row">
                <button class="btn primary" id="resumeBtn">Продолжить</button>
                <button class="btn ghost" id="menuBtn">В меню</button>
              </div>
            </div>
          </div>
          <div class="overlay hidden" id="overOverlay">
            <div class="panel">
              <h2 class="over-title" id="overTitle">ИГРА ОКОНЧЕНА</h2>
              <p class="cause" id="overCause"></p>
              <div class="record" id="recordBadge">🏆 Новый рекорд!</div>
              <div class="final-score" id="finalScore"></div>
              <div class="over-stats" id="overStats"></div>
              <div class="row">
                <button class="btn primary" id="restartBtn">Заново</button>
                <button class="btn ghost" id="overMenuBtn">В меню</button>
              </div>
            </div>
          </div>
        </section>
        <footer class="hints">${(cfg.hints || []).map(h => `<span>${h}</span>`).join('')}</footer>
      </main>
      <style>#stage{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:10px;width:100%}</style>`;

    // кнопки
    $('playBtn').addEventListener('click', () => { SFX.ensure(); SFX.click(); this.hideOverlays(); this.cfg.onPlay(); });
    $('restartBtn').addEventListener('click', () => { SFX.click(); this.hideOverlays(); this.cfg.onPlay(); });
    $('resumeBtn').addEventListener('click', () => { SFX.click(); this.resume(); });
    $('menuBtn').addEventListener('click', () => { SFX.click(); this.cfg.onMenu(); });
    $('overMenuBtn').addEventListener('click', () => { SFX.click(); this.cfg.onMenu(); });
    $('soundBtn').addEventListener('click', () => this.toggleSound());
    SFX.enabled = this.store.get('zmeyka.sound', true);
    $('soundBtn').textContent = SFX.enabled ? '🔊' : '🔇';

    window.addEventListener('keydown', e => { if (e.code === 'KeyM') this.toggleSound(); });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.cfg.onHidden && !this.paused) this.cfg.onHidden();
    });
    if (cfg.rules && typeof Rules !== 'undefined') Rules.init(cfg.rules);
    this.hideOverlays();
    this.showMenu();
  },

  el: id => $(id),
  stage() { return $('stage'); },

  setStat(id, v) {
    if (this.hudCache[id] === v) return;
    this.hudCache[id] = v;
    const el = $('st-' + id);
    if (!el) return;
    el.textContent = v;
    el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
  },

  bestText() {
    const v = this.bestVal;
    if (v === null || v === 0) return this.cfg.bestZero ?? 0;
    return this.cfg.bestFmt ? this.cfg.bestFmt(v) : v;
  },

  /* Сохраняет результат, если он лучше прежнего; возвращает true при новом рекорде */
  tryRecord(v) {
    if (this.cfg.bestLower) {
      if (this.bestVal === null || v < this.bestVal) {
        this.bestVal = v;
        this.store.set(this.cfg.bestKey, v);
        this.setStat('best', this.bestText());
        $('menuBest').textContent = this.bestText();
        return true;
      }
      return false;
    }
    if (v > this.bestVal && v > 0) {
      this.bestVal = v;
      this.store.set(this.cfg.bestKey, v);
      this.setStat('best', this.bestText());
      $('menuBest').textContent = this.bestText();
      return true;
    }
    return false;
  },

  /* Для игр со счётом побед: +1 к рекорду-победам; бейдж — при первой победе */
  bumpWins() {
    const v = (this.bestVal || 0) + 1;
    this.bestVal = v;
    this.store.set(this.cfg.bestKey, v);
    this.setStat('best', v);
    $('menuBest').textContent = this.bestText();
    return v === 1;
  },

  showMenu() {
    this.paused = false;
    this.hideOverlays();
    $('menuOverlay').classList.remove('hidden');
  },

  hideOverlays() {
    for (const id of ['menuOverlay', 'pauseOverlay', 'overOverlay']) $(id).classList.add('hidden');
  },

  pause() {
    if (this.paused) return;
    this.paused = true;
    $('pauseOverlay').classList.remove('hidden');
  },

  resume() {
    if (!this.paused) return;
    this.paused = false;
    $('pauseOverlay').classList.add('hidden');
    if (this.cfg.onResume) this.cfg.onResume();
  },

  showOver({ won = false, cause = '', score = null, rows = [], record = false, delay = 450 }) {
    const t = $('overTitle');
    t.textContent = won ? 'ПОБЕДА!' : 'ИГРА ОКОНЧЕНА';
    t.classList.toggle('win', won);
    $('overCause').textContent = cause;
    $('recordBadge').classList.toggle('show', !!record);
    const fs = $('finalScore');
    if (score === null) fs.style.display = 'none';
    else { fs.style.display = ''; fs.textContent = score; }
    $('overStats').innerHTML = rows.map(([l, v]) =>
      `<div class="stat"><span class="label">${l}</span><span class="value">${v}</span></div>`).join('');
    setTimeout(() => { $('overOverlay').classList.remove('hidden'); }, delay);
  },

  /* Холст с масштабированием под окно; возвращает {cv, ctx, scale()} */
  canvas(w, h, opts = {}) {
    const cv = document.createElement('canvas');
    this.stage().appendChild(cv);
    const fit = () => {
      const availH = window.innerHeight - (opts.pad ?? 250);
      const availW = Math.min(window.innerWidth - 24, opts.maxW ?? 640);
      let ch = Shell.clamp(availH, 220, opts.maxH ?? 640);
      let cw = ch * w / h;
      if (cw > availW) { cw = availW; ch = cw * h / w; }
      const dpr = window.devicePixelRatio || 1;
      cv.style.width = cw + 'px';
      cv.style.height = ch + 'px';
      cv.width = Math.round(cw * dpr);
      cv.height = Math.round(ch * dpr);
      cv._scale = cv.width / w;
    };
    fit();
    window.addEventListener('resize', fit);
    return { cv, ctx: cv.getContext('2d'), scale: () => cv._scale };
  },

  fmtTime(s) { return Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0'); },

  toggleSound() {
    SFX.ensure();
    SFX.enabled = !SFX.enabled;
    this.store.set('zmeyka.sound', SFX.enabled);
    $('soundBtn').textContent = SFX.enabled ? '🔊' : '🔇';
    if (SFX.enabled) SFX.click();
  },
};
