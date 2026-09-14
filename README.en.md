<div align="center">

<img src="docs/screenshots/hub-en.png" alt="Igroteka — main page" width="100%">

# 🕹️ IGROTEKA

**50 mini-games in pure JavaScript. Neon hub, two languages, records, sound — and zero dependencies.**

[![Play online](https://img.shields.io/badge/%E2%96%B6_PLAY_ONLINE-xispx.github.io%2Figroteka-34f5a5?style=for-the-badge&labelColor=0d1117)](https://xispx.github.io/igroteka/)

![games](https://img.shields.io/badge/mini--games-50-b388ff?style=flat-square&labelColor=0d1117)
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

**Online** — open [**xispx.github.io/igroteka**](https://xispx.github.io/igroteka/) and pick a game.

**Locally** — download the repository and double-click `index.html`: the project runs
without a server and without any build step. If you prefer a local server:

```bash
python -m http.server 8000
# → http://localhost:8000
```

## ✨ Highlights

| | |
| --- | --- |
| 🗂 **Single hub** | All 50 games on one page: sections, descriptions, records right on the cards |
| 🌐 **Two languages** | Russian and English — a switcher in every game, the choice is remembered |
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
| 👾 **[Invaders](games/invaders/index.html)** | Fight off alien waves before they land | waves |
| 🦘 **[Doodle](games/doodle/index.html)** | Bounce ever higher — don't fall down | jumps |
| 🚁 **[Copter](games/copter/index.html)** | Hold thrust and guide the copter through the cave | one button |
| 🌕 **[Lunar Lander](games/moon/index.html)** | Land the lunar module softly, straight, on the pad | physics |
| 💥 **[Artillery](games/arty/index.html)** | Artillery duel vs AI: angle, power and shifting wind | duel |
| ☄️ **[Meteors](games/meteors/index.html)** | Meteor shower — dodge for as long as you can | dodging |
| 🏎️ **[Traffic](games/traffic/index.html)** | Weave through cars at ever-growing speed | 3 lanes |
| 🟢 **[Orbs](games/orbs/index.html)** | Eat orbs smaller than you, avoid bigger ones — and don't melt | arcade · growth |
| 💧 **[Bubbles](games/bubble/index.html)** | Shoot a bubble, match groups of three and pop them | shooter · groups |
| 🏒 **[Air Hockey](games/hockey/index.html)** | Score seven past the AI — the paddle follows your finger | vs AI |

### Logic & Board

| Game | Description | Features |
| --- | --- | --- |
| 🔢 **[15 Puzzle](games/fifteen/index.html)** | Sort the tiles in order in as few moves as possible | puzzle |
| ⭕ **[Tic-tac-toe](games/tictac/index.html)** | Beat the unbeatable AI — or hold it to a draw | vs AI |
| ⚫ **[Reversi](games/reversi/index.html)** | Sandwich AI discs, flip them and take over the board | vs AI |
| 🔵 **[Connect 4](games/connect4/index.html)** | Drop discs into columns and line up four before the AI | minimax AI |
| ⚫ **[Gomoku](games/gomoku/index.html)** | Five in a row on a 15×15 board against a cunning AI | 15×15 |
| 🥢 **[Nim](games/nim/index.html)** | Take sticks from rows. Whoever takes the last one wins | perfect AI |
| 🚢 **[Battleship](games/sea/index.html)** | Sink the AI fleet before it sinks yours | classic |
| 🃏 **[Blackjack](games/bj/index.html)** | Blackjack vs the dealer: get closer to 21 without busting | cards · bank |
| 🫘 **[Mancala](games/mancala/index.html)** | Sow stones around the board and collect the most in your store | ancient game |
| 🔗 **[Dots & Boxes](games/dots/index.html)** | Draw lines, close boxes — a point and an extra turn | tactics |
| 🔟 **[Sudoku](games/sudoku/index.html)** | Classic 9×9 with a generator and a unique solution | timed |
| 🗼 **[Tower of Hanoi](games/hanoy/index.html)** | Move the tower to the right rod in as few moves as possible | puzzle |
| 💡 **[Lights Out](games/lights/index.html)** | Each click flips a plus-shape. Turn every light off | puzzle |
| 💎 **[Match 3](games/match3/index.html)** | Swap crystals, line them up and catch cascades | 90 seconds |
| 📦 **[Sokoban](games/sokoban/index.html)** | Push crates onto targets: 6 levels, undo | 6 levels |
| 🌈 **[Flow](games/flow/index.html)** | Connect pairs of colored dots, filling the whole board | 6×6 · 12 levels |
| 🔐 **[Codebreaker](games/code/index.html)** | Crack the 4-color code in as few tries as possible | logic |

### Words

| Game | Description | Features |
| --- | --- | --- |
| 🎯 **[Hangman](games/hangman/index.html)** | Guess the word letter by letter before attempts run out | 7 tries |
| 🔤 **[Wordly](games/wordle/index.html)** | Guess the 5-letter word in 6 tries — like Wordle | 6 tries |
| 🐄 **[Bulls & Cows](games/bulls/index.html)** | Guess 4 digits: bull — right place, cow — present | number logic |
| ⌨️ **[Typing](games/typing/index.html)** | Type phrases fast and clean — characters per minute | speed |

### Reaction & Skills

| Game | Description | Features |
| --- | --- | --- |
| 🃏 **[Memory](games/pairs/index.html)** | Find every matching pair, memorizing positions | memory |
| 🔨 **[Whack-a-Mole](games/moles/index.html)** | 30 seconds to whack as many moles as you can | reaction |
| 🎵 **[Simon](games/simon/index.html)** | Memorize and repeat the growing note sequence | memory · sound |
| ⚡ **[Reaction](games/reaction/index.html)** | 5 rounds: as soon as the background turns green — click | milliseconds |
| 🎯 **[Aim Trainer](games/aim/index.html)** | 20 targets one by one — hit them all in minimal time | precision |
| 🥁 **[Rhythm](games/rhythm/index.html)** | Notes fall down four lanes — catch them on the D F J K line | 4 lanes |
| 🔢 **[Number Span](games/span/index.html)** | Memorize the number and type it — longer every level | number memory |
| 🎨 **[Stroop](games/stroop/index.html)** | Color or meaning? Your brain gets confused — beat it in 45 seconds | cognitive |
| 🧮 **[Math Sprint](games/math/index.html)** | Math sprint: the longer the streak, the more points | 60 seconds |
| 🏗️ **[Stack Tower](games/stack/index.html)** | Drop blocks precisely on each other — height wins | one button |

## 🧩 Architecture

```
index.html            — main page (5 sections, 50 cards)
css/common.css        — shared theme: header, HUD, overlays, buttons
css/hub.css           — main page styles
js/audio.js           — sound engine on the Web Audio API
js/rules.js           — «Rules» button and overlay
js/hub.js             — records on the main-page cards
js/shell.js           — shell for newer games: header, HUD, records, pause, sound
js/i18n.js            — RU/EN switcher and live UI translation
js/lang-en.js         — English dictionary (generated from the source strings)
games/<name>/         — game folder: index.html + css/ + js/game.js
```

Russian is the source language of the UI: all strings in the code are Russian, and
`js/lang-en.js` holds their English counterparts. Translation is applied to the DOM
automatically — including overlays games create at runtime. The switcher is the EN/РУ
button in the header of every game. In the word games (Hangman, Wordly, Typing) the
word lists switch together with the language.

The first 15 games are self-contained (their own markup and styles), the rest are built
on a shared `Shell.init({...})` shell: the config sets the title, stats and hooks, and
the game implements only the logic. New canvas — `Shell.canvas()`, records —
`Shell.tryRecord()`.

## 🛠 Technologies

- **HTML5 Canvas** — all graphics are drawn in code, no sprites or images
- **Web Audio API** — sounds are synthesized on the fly
- **localStorage** — records and settings
- Zero dependencies, zero build, zero network requests

## 📄 License

[MIT](LICENSE) — play, study and take it with you.
