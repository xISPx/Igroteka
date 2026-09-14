'use strict';

/* Мини-i18n Игротеки: русский — исходный язык, английский — через словарь I18N_EN
   (файл js/lang-en.js, подключается до этого файла).
   Тексты в DOM переводятся автоматически (MutationObserver), включая оверлеи,
   которые игры создают позже. Оригиналы запоминаются, так что переключение
   RU ↔ EN работает в обе стороны в любой момент. */
(function () {
  const LS_KEY = 'igroteka.lang';
  let lang = 'ru';
  try {
    const saved = localStorage.getItem(LS_KEY);
    if (saved === 'en' || saved === 'ru') lang = saved;
    else lang = (navigator.language || 'ru').toLowerCase().startsWith('ru') ? 'ru' : 'en';
  } catch (e) { /* без localStorage остаётся русский */ }

  const EN = window.I18N_EN || { words: {}, rules: [] };
  const ORIG_TEXT = new WeakMap();
  const ORIG_ATTR = new WeakMap();
  let applying = false;

  /* Перевод произвольной строки: точное совпадение, затем правила-шаблоны */
  function lookup(s) {
    if (lang !== 'en') return null;
    const exact = EN.words[s];
    if (exact !== undefined) return exact;
    for (const [re, rep] of EN.rules) {
      if (re.test(s)) return s.replace(re, rep);
    }
    return null;
  }

  function t(s) {
    const v = lookup(s);
    return v === null ? s : v;
  }
  window.t = t;
  window.LANG = () => lang;

  function trText(node) {
    const orig = ORIG_TEXT.get(node) ?? node.data;
    if (!ORIG_TEXT.has(node)) ORIG_TEXT.set(node, node.data);
    let next = orig;
    if (lang === 'en') {
      const trimmed = orig.trim();
      if (trimmed && /[А-Яа-яЁё]/.test(trimmed)) {
        const tr = lookup(trimmed);
        if (tr !== null) {
          const lead = orig.slice(0, orig.length - orig.trimStart().length);
          const tail = orig.slice(orig.trimEnd().length);
          next = lead + tr + tail;
        }
      }
    }
    // присваиваем только при реальном изменении: идентичная запись .data
    // всё равно создаёт mutation record и зацикливает наблюдателя
    if (node.data !== next) node.data = next;
  }

  const ATTRS = ['title', 'placeholder', 'aria-label'];

  function trAttr(el, name) {
    if (!ATTRS.includes(name)) return;
    const store = ORIG_ATTR.get(el) || {};
    if (!(name in store)) {
      const cur = el.getAttribute(name);
      if (cur === null) return;
      store[name] = cur;
      ORIG_ATTR.set(el, store);
    }
    const orig = store[name];
    const tr = lookup(orig);
    if (tr === null && lang === 'en') return;
    const value = lang === 'en' && tr !== null ? tr : orig;
    if (el.getAttribute(name) !== value) el.setAttribute(name, value);
  }

  function walk(root) {
    if (root.nodeType === Node.TEXT_NODE) { trText(root); return; }
    if (root.nodeType !== Node.ELEMENT_NODE) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) trText(walker.currentNode);
    for (const el of root.querySelectorAll('*')) {
      for (const a of ATTRS) if (el.hasAttribute(a)) trAttr(el, a);
    }
    if (root.nodeType === Node.ELEMENT_NODE) {
      for (const a of ATTRS) if (root.hasAttribute(a)) trAttr(root, a);
    }
  }

  function applyTitle() {
    const key = document.title;
    const tr = lookup(key);
    if (tr !== null) document.title = tr;
  }

  function applyAll() {
    applying = true;
    try {
      walk(document.body);
      document.documentElement.lang = lang;
      applyTitle();
    } finally {
      applying = false;
    }
  }

  const mo = new MutationObserver(muts => {
    if (applying) return;
    applying = true;
    try {
      for (const m of muts) {
        if (m.type === 'characterData') trText(m.target);
        else if (m.type === 'attributes') trAttr(m.target, m.attributeName);
        else if (m.type === 'childList') for (const n of m.addedNodes) walk(n);
      }
    } catch (e) { console.error('i18n observer:', e); }
    finally {
      applying = false;
    }
  });

  function injectToggle() {
    const host = document.querySelector('.nav-right') || document.querySelector('.hero') || document.body;
    const btn = document.createElement('button');
    btn.id = 'langBtn';
    btn.className = 'icon-btn lang-btn';
    btn.title = 'Language / Язык';
    btn.textContent = lang === 'ru' ? 'EN' : 'РУ';
    btn.addEventListener('click', () => setLang(lang === 'ru' ? 'en' : 'ru'));
    if (host.classList && host.classList.contains('nav-right')) host.prepend(btn);
    else { host.appendChild(btn); btn.classList.add('lang-fixed'); }
  }

  function setLang(l) {
    lang = l;
    try { localStorage.setItem(LS_KEY, l); } catch (e) {}
    applyAll();
    const btn = document.getElementById('langBtn');
    if (btn) btn.textContent = lang === 'ru' ? 'EN' : 'РУ';
    window.dispatchEvent(new CustomEvent('langchange'));
  }
  window.setLang = setLang;

  const style = document.createElement('style');
  style.textContent =
    '.lang-btn{font:700 12px/1 system-ui,Segoe UI,sans-serif;letter-spacing:.6px;min-width:40px}' +
    '.lang-fixed{position:fixed;top:14px;right:14px;z-index:999}';
  document.head.appendChild(style);

  function boot() {
    try {
      injectToggle();
      applyAll();
      mo.observe(document.body, {
        childList: true, characterData: true, subtree: true,
        attributes: true, attributeFilter: ATTRS,
      });
    } catch (e) {
      console.error('i18n boot:', e);
      window.__i18nBootErr = e.message;
    }
    window.__i18nBooted = true;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
