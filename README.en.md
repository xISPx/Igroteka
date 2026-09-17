<div align="center">

<img src="docs/screenshots/hub-en.png" alt="Igroteka — main page" width="100%">

# 🕹️ IGROTEKA

**15 mini-games in pure JavaScript. Neon hub, two languages, records, sound — and zero dependencies.**

[![Play online](https://img.shields.io/badge/%E2%96%B6_PLAY_ONLINE-xispx.github.io%2FIgroteka-34f5a5?style=for-the-badge&labelColor=0d1117)](https://xispx.github.io/Igroteka/)

![games](https://img.shields.io/badge/mini--games-15-b388ff?style=flat-square&labelColor=0d1117)
![lang](https://img.shields.io/badge/languages-RU%20%2F%20EN-4da3ff?style=flat-square&labelColor=0d1117)
![tech](https://img.shields.io/badge/vanilla-JavaScript-f7df1e?style=flat-square&labelColor=0d1117)
![deps](https://img.shields.io/badge/dependencies-0-34f5a5?style=flat-square&labelColor=0d1117)
![offline](https://img.shields.io/badge/works-offline-4dd7ff?style=flat-square&labelColor=0d1117)
![build](https://img.shields.io/badge/build-none-ff9f43?style=flat-square&labelColor=0d1117)
![license](https://img.shields.io/badge/license-MIT-ff5d8f?style=flat-square&labelColor=0d1117)

</div>

**Language / Язык:** **[Русский](README.md)** · English

---

## 🎮 Play

**Online** — open [**xispx.github.io/Igroteka**](https://xispx.github.io/Igroteka/) and pick a game.

**Locally** — download the repository and double-click `index.html`: the project runs
without a server and without any build step. If you prefer a local server:

```bash
python -m http.server 8000
# → http://localhost:8000
```

## ✨ Highlights

| | |
| --- | --- |
| 🗂 **Single hub** | All 15 games on one page: sections, descriptions, records right on the cards |
| 🌐 **Two languages** | Russian and English — a switcher on the main page, the choice is remembered |
| 🌗 **Neon theme** | Dark background, glowing accents, smooth animations — custom design, no frameworks |
| 🏆 **Records** | localStorage per game: points, moves, wins, time |
| 🔊 **Sound** | Synthesized with the Web Audio API — not a single audio file, mute with `M` |
| 📜 **Rules** | Every game has a rules screen with full controls description |
| 📱 **Responsive** | Keyboard, mouse and swipes; auto-pause when the tab is hidden |

## 🖼 Screenshots

| Snake | Tetris | 2048 |
| --- | --- | --- |
| <img src="docs/screenshots/snake.png" width="280"> | <img src="docs/screenshots/tetris.png" width="280"> | <img src="docs/screenshots/2048.png" width="280"> |

## 🎯 Game catalog

### Classics

| Game | Description | Features |
| --- | --- | --- |
| 🐍 **[Snake](games/zmeyka/index.html)** | Eat apples, catch golden bonuses — don't bite yourself | 3 modes · combo |
| 🧱 **[Tetris](games/tetris/index.html)** | Stack falling pieces and clear lines | 10×20 well |
| 🎯 **[2048](games/2048/index.html)** | Merge tiles with equal numbers up to 2048 | undo |
| 💣 **[Minesweeper](games/saper/index.html)** | Clear the field and defuse every mine against the clock | 3 difficulties |
| 🕹️ **[Breakout](games/arkanoid/index.html)** | Smash bricks with the ball, catch power-ups, keep the streak | power-ups · multiball |

### Arcade

| Game | Description | Features |
| --- | --- | --- |
| 🐦 **[Flappy](games/flappy/index.html)** | Fly between the pipes — one tap, one flap | one tap |
| 🏓 **[Pong](games/pong/index.html)** | Paddle duel — beat the AI to 7 points | vs AI |
| 🦖 **[Dino](games/dino/index.html)** | Run the desert, jump cacti, duck under birds | runner |
| 🚀 **[Asteroids](games/asteroids/index.html)** | Pilot a ship with inertia physics and smash rocks | waves |

### Logic & Board

| Game | Description | Features |
| --- | --- | --- |
| 🔢 **[15 Puzzle](games/fifteen/index.html)** | Sort the tiles in order in as few moves as possible | puzzle |
| ⭕ **[Tic-tac-toe](games/tictac/index.html)** | Beat the unbeatable AI — or hold it to a draw | vs AI |
| ⚫ **[Reversi](games/reversi/index.html)** | Sandwich AI discs, flip them and take over the board | vs AI |

### Reaction & Skills

| Game | Description | Features |
| --- | --- | --- |
| 🃏 **[Memory](games/pairs/index.html)** | Find every matching pair, memorizing positions | memory |
| 🔨 **[Whack-a-Mole](games/moles/index.html)** | 30 seconds to whack as many moles as you can | reaction |
| 🎵 **[Simon](games/simon/index.html)** | Memorize and repeat the growing note sequence | memory · sound |

## 🧩 Architecture

```
index.html            — main page (4 sections, 15 cards)
css/common.css        — shared theme: header, HUD, overlays, buttons
css/hub.css           — main page styles
js/audio.js           — sound engine on the Web Audio API
js/rules.js           — «Rules» button and overlay
js/hub.js             — records on the main-page cards
js/i18n.js            — RU/EN switcher and live UI translation
js/lang-en.js         — English dictionary
games/<name>/         — game folder: index.html + css/style.css + js/game.js
```

Russian is the source language of the UI: the strings in the markup are Russian, and
`js/lang-en.js` holds their English counterparts. Translation is applied to the DOM
automatically — including overlays games create at runtime. Every game is
self-contained: its own markup and styles; shared only the sound (`js/audio.js`),
the rules overlay (`js/rules.js`) and the records for the main page (`js/hub.js`).

## 🛠 Technologies

- **HTML5 Canvas** — all graphics are drawn in code, no sprites or images
- **Web Audio API** — sounds are synthesized on the fly
- **localStorage** — records and settings
- Zero dependencies, zero build, zero network requests

## 📄 License

[MIT](LICENSE) — play, study and take it with you.
