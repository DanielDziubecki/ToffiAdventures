# Gry z chomiczką Toffi

A collection of five browser games for a young child, starring Toffi the hamster.
Everything the player sees is in Polish. The code uses plain HTML, CSS and JavaScript, with no build step and no image files.

## How to run

Open `index.html` in a browser by double-clicking it. That's all you need to do.

- Fonts: the "Baloo 2" font loads from Google Fonts. Without internet, the games still work and use a fallback font.
- Sound: there are no audio files. Sounds are generated in code and start after the first click or tap.
- Saved data: scores and progress are kept in `localStorage`, under keys that start with `toffi.`.

## Project structure

```
index.html              main menu (5 game cards with best scores / stars)
shared/toffi.js         Toffi drawing + animations (idle, run, jump, wiggle, eat, wave, sleep, hurt)
shared/sound.js         Web Audio sound effects + mute (remembered)
shared/common.js        storage, stage scaling, top bar, overlay screens, particles, speech bubbles, hearts
shared/style.css        shared look
games/wyscig/           1. Wyścig po ziarenka   (endless runner)
games/ucieczka/         2. Wielka ucieczka      (puzzle) – levels.js + rules.js + game.js
games/policzki/         3. Pełne policzki       (catching)
games/kolko/            4. Kółko Toffi          (clicker)
games/ogrod/            5. Przygoda w ogrodzie  (platformer) – levels.js + game.js
```

Every game draws on a fixed 960×540 stage. The stage scales to fit the screen, so it works on a desktop, a tablet or a phone held sideways.

## Tweaking difficulty

Each `game.js` starts with a `CONFIG` block of commented numbers. You can change them and reload the page.

| Game | Where | Useful knobs |
|---|---|---|
| Wyścig po ziarenka | `games/wyscig/game.js` | `lives`, `startSpeed`, `maxSpeed`, `speedUp`, `jumpPower`, `doubleJump`, `obstacleEvery`, `hitboxForgiveness` (smaller = easier), `magnetTime`, `catEvery`, `catLookTime` |
| Wielka ucieczka | `games/ucieczka/game.js` + `levels.js` | `ownerMoves(par)` (moves before the owner returns), `twoStarExtra(par)`, `unlockAll`. Rooms are ASCII maps in `levels.js` (legend at the top of the file). If you edit a map, update its `par`: `UcieczkaRules.solve(UcieczkaRules.parse(level))` in the browser console gives the minimum number of moves. |
| Pełne policzki | `games/policzki/game.js` | `lives`, `cheekCapacity`, `speed`, `fullSlowdown`, `spawnStart`/`spawnMin`, `fallStart`/`fallMax`, `rampTime`, `badStart`/`badMax`, `heartEvery`, `catchWidth` |
| Kółko Toffi | `games/kolko/game.js` | `UPGRADES` (cost = `base × growth^level`, `max` levels), `offlineMaxSeconds`, `bonusSeedEvery`. The effects are in `clickPower()` and `perSecond()`. |
| Przygoda w ogrodzie | `games/ogrod/game.js` + `levels.js` | `lives`, `runSpeed`, `jumpPower`, `coyoteTime`, `jumpBuffer`, `invulnerableTime`, `hedgehogSpeed`, `crowSpeed`, `crowRange`, `starBerries`. Levels are ASCII maps in `levels.js`. Toffi jumps about 3 tiles high and 4 tiles far, so keep steps at 2 tiles or fewer. |

Testing tip: every game exposes `window.__toffiGame` in the browser console. Its `CONFIG` can be changed while you play, for example `__toffiGame.CONFIG.lives = 9`.

To reset all progress, run `localStorage.clear()` in the console. The clicker also has a "Zacznij od nowa" link in its shop.
