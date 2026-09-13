'use strict';

/* Кнопка «Правила» и оверлей с правилами для любой игры Игротеки.
   Rules.init(text) — text поддерживает переносы строк (white-space: pre-line). */
const Rules = {
  init(text) {
    if (!text) return;
    const host = document.getElementById('board') || document.getElementById('boardWrap') || document.querySelector('.board');
    if (!host || document.getElementById('rulesOverlay')) return;

    const ov = document.createElement('div');
    ov.className = 'overlay hidden';
    ov.id = 'rulesOverlay';
    ov.innerHTML = `
      <div class="panel">
        <h2 class="pause-title">ПРАВИЛА</h2>
        <p class="subtitle rules-text">${text}</p>
        <button class="btn primary" id="rulesCloseBtn">Понятно</button>
      </div>`;
    host.appendChild(ov);
    const close = () => ov.classList.add('hidden');
    ov.addEventListener('click', e => { if (e.target === ov) close(); });
    ov.querySelector('#rulesCloseBtn').addEventListener('click', close);

    const open = () => { if (window.SFX) SFX.ensure(); ov.classList.remove('hidden'); };

    // кнопка: в меню игры, а если меню нет — иконка в HUD
    const menuPanel = document.querySelector('#menuOverlay .panel');
    if (menuPanel) {
      const btn = document.createElement('button');
      btn.className = 'btn ghost';
      btn.textContent = '📜 Правила';
      btn.addEventListener('click', open);
      const hint = menuPanel.querySelector('.tiny-hint');
      if (hint) menuPanel.insertBefore(btn, hint);
      else menuPanel.appendChild(btn);
    } else {
      const hud = document.querySelector('.hud');
      if (hud) {
        const b = document.createElement('button');
        b.className = 'icon-btn';
        b.title = 'Правила';
        b.textContent = '📜';
        b.addEventListener('click', open);
        hud.appendChild(b);
      }
    }
  },
};
