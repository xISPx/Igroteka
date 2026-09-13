'use strict';

/* Единый звуковой движок Игротеки — Web Audio API, без внешних файлов.
   Контекст создаётся лениво, по первому жесту пользователя. */
const SFX = {
  ctx: null,
  master: null,
  enabled: true,

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      try { this.ctx = new AC(); } catch (e) { return false; }
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.4;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return true;
  },

  tone(freq, dur, { type = 'square', vol = 1, delay = 0, slide = 0 } = {}) {
    if (!this.enabled || !this.ensure()) return;
    const t0 = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.001, vol * 0.5), t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  },

  /* ---- универсальные ---- */
  click() { this.tone(700, 0.05, { type: 'sine', vol: 0.4 }); },
  count(final) { this.tone(final ? 880 : 440, 0.12, { type: 'sine', vol: 0.5 }); },
  level() {
    [392, 523, 659].forEach((f, i) => this.tone(f, 0.14, { type: 'triangle', vol: 0.6, delay: i * 0.09 }));
  },
  win() {
    [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.14, { type: 'triangle', vol: 0.55, delay: i * 0.1 }));
  },
  die() {
    this.tone(300, 0.5, { type: 'sawtooth', vol: 0.6, slide: -240 });
    this.tone(150, 0.6, { type: 'square', vol: 0.4, delay: 0.08, slide: -110 });
  },

  /* ---- змейка ---- */
  eat(combo) {
    const f = 420 * Math.pow(1.12, Math.min(combo, 8));
    this.tone(f, 0.09, { type: 'square', vol: 0.7 });
    this.tone(f * 1.5, 0.12, { type: 'square', vol: 0.5, delay: 0.06 });
  },
  bonus() {
    [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.12, { type: 'triangle', vol: 0.6, delay: i * 0.07 }));
  },

  /* ---- тетрис ---- */
  move() { this.tone(220, 0.03, { type: 'square', vol: 0.25 }); },
  rotate() { this.tone(340, 0.05, { type: 'sine', vol: 0.4 }); },
  lock() { this.tone(140, 0.06, { type: 'square', vol: 0.5 }); },
  drop() { this.tone(90, 0.09, { type: 'triangle', vol: 0.7, slide: -40 }); },
  clearLines(n) {
    if (n >= 4) {
      [523, 659, 784, 880, 1046, 1318].forEach((f, i) => this.tone(f, 0.13, { type: 'square', vol: 0.55, delay: i * 0.06 }));
    } else {
      [440, 554, 659].slice(0, 2 + n).forEach((f, i) => this.tone(f, 0.1, { type: 'square', vol: 0.5, delay: i * 0.06 }));
    }
  },
  hold() { this.tone(300, 0.06, { type: 'sine', vol: 0.4, slide: 120 }); },

  /* ---- 2048 ---- */
  slide() { this.tone(500, 0.06, { type: 'sine', vol: 0.3, slide: -260 }); },
  merge(val) {
    const f = 300 + Math.log2(val) * 40;
    this.tone(f, 0.09, { type: 'triangle', vol: 0.6 });
    this.tone(f * 1.5, 0.11, { type: 'triangle', vol: 0.4, delay: 0.05 });
  },

  /* ---- сапёр ---- */
  reveal() { this.tone(520, 0.035, { type: 'sine', vol: 0.35 }); },
  flag(on) { this.tone(on ? 640 : 480, 0.05, { type: 'square', vol: 0.35 }); },
  boom() {
    this.tone(120, 0.45, { type: 'sawtooth', vol: 0.8, slide: -80 });
    this.tone(60, 0.5, { type: 'square', vol: 0.6, delay: 0.05, slide: -30 });
  },

  /* ---- арканоид ---- */
  bounce(high) { this.tone(high ? 520 : 300, 0.04, { type: 'sine', vol: 0.45 }); },
  brick(row) { this.tone(400 + row * 45, 0.06, { type: 'square', vol: 0.5 }); },
  power() {
    [660, 880].forEach((f, i) => this.tone(f, 0.08, { type: 'triangle', vol: 0.55, delay: i * 0.06 }));
  },
  lifeLost() {
    [330, 262, 196].forEach((f, i) => this.tone(f, 0.12, { type: 'sawtooth', vol: 0.45, delay: i * 0.09 }));
  },

  /* ---- аркады ---- */
  flap() { this.tone(480, 0.08, { type: 'sine', vol: 0.5, slide: 260 }); },
  jump() { this.tone(300, 0.12, { type: 'square', vol: 0.4, slide: 260 }); },
  shoot() { this.tone(900, 0.06, { type: 'sawtooth', vol: 0.3, slide: -600 }); },
  explode() { this.tone(140, 0.25, { type: 'sawtooth', vol: 0.6, slide: -90 }); },
  whack() { this.tone(170, 0.07, { type: 'square', vol: 0.6, slide: -60 }); },
  scoreUp() { this.tone(760, 0.07, { type: 'sine', vol: 0.45, slide: 220 }); },

  /* ---- головоломки ---- */
  flip() { this.tone(620, 0.05, { type: 'sine', vol: 0.35 }); },
  good() {
    this.tone(660, 0.07, { type: 'triangle', vol: 0.5 });
    this.tone(990, 0.1, { type: 'triangle', vol: 0.45, delay: 0.07 });
  },
  bad() { this.tone(200, 0.16, { type: 'square', vol: 0.4, slide: -70 }); },
  place() { this.tone(430, 0.05, { type: 'sine', vol: 0.4 }); },
  note(i, dur = 0.35) {
    const f = [329.63, 415.3, 523.25, 659.25][i % 4];
    this.tone(f, dur, { type: 'triangle', vol: 0.6 });
  },
};
