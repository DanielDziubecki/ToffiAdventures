/* =========================================================================
   Gra 5: "Przygoda w ogrodzie" – side-scrolling platformer.

   3 levels (levels.js). Run and jump, collect berries, avoid the crow and
   the grumpy hedgehog (touching them only knocks Toffi back and costs one
   heart). Find the lost hamster friend at the end of each level.
   Checkpoints (sunflowers) remember where Toffi comes back.
   ========================================================================= */
(function () {
  'use strict';

  var UI = ToffiUI, Sound = ToffiSound;
  var LEVELS = window.OGROD_LEVELS;

  // ---------------------------------------------------------------------
  // DIFFICULTY & FEEL – tweak these numbers
  // ---------------------------------------------------------------------
  var CONFIG = {
    lives: 5,                 // hearts per try
    runSpeed: 270,            // max running speed
    accel: 1900,              // how fast Toffi speeds up
    friction: 2200,           // how fast Toffi stops
    gravity: 2200,
    maxFall: 900,
    jumpPower: 830,           // jump height (~3 tiles)
    jumpCut: 0.5,             // releasing jump early makes a smaller hop
    coyoteTime: 0.12,         // can still jump a moment after leaving an edge
    jumpBuffer: 0.15,         // jump pressed a bit early still counts
    mushroomBounce: 1150,     // bouncy mushroom power
    knockback: { x: 360, y: 430 },
    invulnerableTime: 1.6,    // seconds of safety after a bump
    hedgehogSpeed: 45,
    crowSpeed: 75,
    crowRange: 3.5,           // tiles the crow flies left / right
    crowBob: 22,              // how much the crow moves up and down
    starBerries: [0.5, 0.9]   // share of berries needed for 2 and 3 stars
  };

  var T = 48;                 // tile size
  var stage = UI.createStage();
  var ctx = stage.ctx, W = stage.W, H = stage.H;
  var particles = new UI.Particles();
  var speech = new UI.Speech();
  var friendSpeech = new UI.Speech();

  var progress = ToffiStore.get('ogrod.progress', null) || { unlocked: 1, stars: [], berries: [] };
  var state = 'menu';         // menu | playing | paused | over | won
  var levelIdx = 0;
  var L = null;               // current level (parsed + runtime objects)
  var p = null;               // the player
  var cam = { x: 0, y: 0 };
  var animT = 0;
  var input = { left: false, right: false, jumpHeld: false };
  var rain = [];

  // ---------------------------------------------------------------------
  // Level loading
  // ---------------------------------------------------------------------
  function parseLevel(i) {
    var def = LEVELS[i];
    var h = def.map.length, w = 0;
    def.map.forEach(function (r) { w = Math.max(w, r.length); });
    var lv = {
      def: def, w: w, h: h, tiles: [], berries: [], hedgehogs: [], crows: [],
      checkpoints: [], decor: [], friend: null, start: null, bounce: {}, collected: 0
    };
    for (var y = 0; y < h; y++) {
      var row = [];
      for (var x = 0; x < w; x++) {
        var c = def.map[y][x] || ' ';
        var cx = x * T + T / 2, by = (y + 1) * T;
        switch (c) {
          case 'P': lv.start = { x: cx, y: by }; c = ' '; break;
          case 'b': lv.berries.push({ x: cx, y: y * T + T / 2, got: false, ph: Math.random() * 6 }); c = ' '; break;
          case 'h': lv.hedgehogs.push({ x: cx, y: by, vx: -CONFIG.hedgehogSpeed }); c = ' '; break;
          case 'c': lv.crows.push({ x0: cx, y0: y * T + T / 2, x: cx, y: y * T + T / 2, dir: 1, ph: Math.random() * 6 }); c = ' '; break;
          case 'K': lv.checkpoints.push({ x: cx, y: by, active: false, t: 0 }); c = ' '; break;
          case 'F': lv.friend = { x: cx, y: by }; c = ' '; break;
          case 'L': case 'f': lv.decor.push({ type: c, x: cx, y: by, k: x }); c = ' '; break;
        }
        row.push(c);
      }
      lv.tiles.push(row);
    }
    lv.total = lv.berries.length;
    return lv;
  }

  function newPlayer(pos) {
    return { x: pos.x, y: pos.y, vx: 0, vy: 0, w: 40, h: 54, onGround: false, coyote: 0, buffer: 0, facing: 1, hurt: 0, invuln: 0, landedOn: null };
  }

  function startLevel(i) {
    levelIdx = i;
    L = parseLevel(i);
    L.respawn = { x: L.start.x, y: L.start.y };
    L.lives = CONFIG.lives;
    p = newPlayer(L.start);
    L.lastSafe = { x: p.x, y: p.y };
    snapCamera();
    initRain();
    state = 'playing';
    UI.hideScreen(stage);
    speech.say(['Szukam przyjaciółki!', 'Ale kałuże!', 'Wspinam się!'][i] || 'Naprzód!', 2);
  }

  // Continue after "game over": back at the last checkpoint, full hearts
  function continueFromCheckpoint() {
    L.lives = CONFIG.lives;
    p = newPlayer(L.respawn);
    p.invuln = 1;
    L.lastSafe = { x: p.x, y: p.y };
    snapCamera();
    state = 'playing';
    UI.hideScreen(stage);
    speech.say('Jeszcze raz!', 1.4);
  }

  // ---------------------------------------------------------------------
  // Tiles
  // ---------------------------------------------------------------------
  function tile(tx, ty) {
    if (tx < 0 || tx >= L.w) return '#';    // invisible side walls
    if (ty < 0 || ty >= L.h) return ' ';
    return L.tiles[ty][tx];
  }
  function solid(c) { return c === '#'; }
  function topSolid(c) { return c === '=' || c === 'm'; }

  // ---------------------------------------------------------------------
  // Player physics
  // ---------------------------------------------------------------------
  function movePlayer(dt) {
    // horizontal
    p.x += p.vx * dt;
    var top = p.y - p.h + 2, bottom = p.y - 2;
    var ty1 = Math.floor(top / T), ty2 = Math.floor(bottom / T), ty, tx;
    if (p.vx > 0) {
      tx = Math.floor((p.x + p.w / 2) / T);
      for (ty = ty1; ty <= ty2; ty++) if (solid(tile(tx, ty))) { p.x = tx * T - p.w / 2 - 0.01; p.vx = 0; break; }
    } else if (p.vx < 0) {
      tx = Math.floor((p.x - p.w / 2) / T);
      for (ty = ty1; ty <= ty2; ty++) if (solid(tile(tx, ty))) { p.x = (tx + 1) * T + p.w / 2 + 0.01; p.vx = 0; break; }
    }

    // vertical
    var prevBottom = p.y;
    p.y += p.vy * dt;
    p.onGround = false;
    var tx1 = Math.floor((p.x - p.w / 2 + 2) / T), tx2 = Math.floor((p.x + p.w / 2 - 2) / T);
    if (p.vy >= 0) {
      ty = Math.floor(p.y / T);
      for (tx = tx1; tx <= tx2; tx++) {
        var c = tile(tx, ty);
        var tileTop = ty * T;
        if (solid(c) || (topSolid(c) && prevBottom <= tileTop + 2)) {
          p.y = tileTop; p.vy = 0; p.onGround = true; p.landedOn = c;
          if (c === 'm') bounceMushroom(tx, ty);
          break;
        }
      }
    } else {
      ty = Math.floor((p.y - p.h) / T);
      for (tx = tx1; tx <= tx2; tx++) {
        if (solid(tile(tx, ty))) { p.y = (ty + 1) * T + p.h; p.vy = 0; break; }
      }
    }
  }

  function bounceMushroom(tx, ty) {
    p.vy = -CONFIG.mushroomBounce;
    p.onGround = false;
    L.bounce[tx + ',' + ty] = 0.35;
    Sound.play('boing');
    particles.burst(tx * T + T / 2, ty * T, { n: 8, colors: ['#FF7A8A', '#FFFFFF'], shape: 'circle', speed: 120 });
    if (Math.random() < 0.5) speech.say('Hop!', 0.8);
  }

  function hurt(fromX, msg) {
    if (p.invuln > 0) return;
    L.lives--;
    p.hurt = 0.45;
    p.invuln = CONFIG.invulnerableTime;
    p.vx = (p.x < fromX ? -1 : 1) * CONFIG.knockback.x;
    p.vy = -CONFIG.knockback.y;
    p.onGround = false;
    Sound.play('bump');
    speech.say(msg || 'Ojej!', 1.1);
    particles.burst(p.x, p.y - 30, { n: 10, colors: ['#FFFFFF', '#FFD1DC'], shape: 'circle', speed: 140 });
    if (L.lives <= 0) gameOver();
  }

  // Splash in a puddle or fall off: go back to the last safe spot
  function fallBack(splash) {
    if (splash) {
      Sound.play('splash');
      particles.burst(p.x, p.y - 10, { n: 18, colors: ['#8FD3FF', '#FFFFFF', '#5DB4F0'], shape: 'drop', speed: 220, up: 160 });
      speech.say('Plusk! Ale mokro!', 1.4);
    } else {
      Sound.play('bump');
      speech.say('Ups!', 1);
    }
    L.lives--;
    if (L.lives <= 0) { gameOver(); return; }
    p.x = L.lastSafe.x; p.y = L.lastSafe.y; p.vx = 0; p.vy = 0;
    p.invuln = CONFIG.invulnerableTime;
  }

  function updatePlayer(dt) {
    p.hurt -= dt; p.invuln -= dt;
    var control = p.hurt <= 0 && state === 'playing';
    var dir = 0;
    if (control) { if (input.left) dir -= 1; if (input.right) dir += 1; }

    // run
    if (dir) {
      p.vx += dir * CONFIG.accel * dt * (p.onGround ? 1 : 0.85);
      p.vx = UI.clamp(p.vx, -CONFIG.runSpeed, CONFIG.runSpeed);
      p.facing = dir;
    } else if (p.hurt <= 0) {
      var f = CONFIG.friction * dt * (p.onGround ? 1 : 0.4);
      p.vx = Math.abs(p.vx) <= f ? 0 : p.vx - Math.sign(p.vx) * f;
    }

    // jump (with coyote time and buffering)
    p.coyote = p.onGround ? CONFIG.coyoteTime : p.coyote - dt;
    p.buffer -= dt;
    if (control && p.buffer > 0 && p.coyote > 0) {
      p.vy = -CONFIG.jumpPower;
      p.buffer = 0; p.coyote = 0; p.onGround = false;
      Sound.play('jump');
      particles.burst(p.x, p.y, { n: 6, colors: ['#E8D3B8', '#FFFFFF'], shape: 'circle', speed: 80, gravity: 100 });
    }
    // short hop when the jump key is released early
    if (!input.jumpHeld && p.vy < -CONFIG.jumpPower * 0.4 && p.hurt <= 0) p.vy *= CONFIG.jumpCut;

    p.vy = Math.min(CONFIG.maxFall, p.vy + CONFIG.gravity * dt);

    // move in small steps so nothing is skipped
    var steps = Math.ceil(dt / (1 / 120));
    for (var i = 0; i < steps; i++) movePlayer(dt / steps);

    // remember a safe place to come back to (both feet on firm ground)
    if (p.onGround && p.landedOn !== 'm') {
      var fy = Math.floor(p.y / T);
      var l = tile(Math.floor((p.x - p.w / 2) / T), fy), r = tile(Math.floor((p.x + p.w / 2) / T), fy);
      if ((solid(l) || topSolid(l)) && (solid(r) || topSolid(r)) && l !== 'm' && r !== 'm') L.lastSafe = { x: p.x, y: p.y };
    }

    // puddles
    var wt = tile(Math.floor(p.x / T), Math.floor((p.y - 8) / T));
    if (wt === 'w' && state === 'playing') { fallBack(true); return; }
    // fell out of the level
    if (p.y - p.h > L.h * T + 60 && state === 'playing') fallBack(false);
  }

  // ---------------------------------------------------------------------
  // Enemies, berries, checkpoints, friend
  // ---------------------------------------------------------------------
  function overlaps(ax1, ay1, ax2, ay2, bx1, by1, bx2, by2) { return ax1 < bx2 && ax2 > bx1 && ay1 < by2 && ay2 > by1; }

  function updateWorld(dt) {
    // generous (small) player hitbox for enemies
    var px1 = p.x - p.w / 2 + 6, px2 = p.x + p.w / 2 - 6, py1 = p.y - p.h + 10, py2 = p.y - 2;

    L.hedgehogs.forEach(function (e) {
      e.x += e.vx * dt;
      var dir = Math.sign(e.vx);
      var aheadX = Math.floor((e.x + dir * 24) / T), rowY = Math.floor((e.y - 10) / T), belowY = Math.floor((e.y + 4) / T);
      var below = tile(aheadX, belowY);
      if (solid(tile(aheadX, rowY)) || !(solid(below) || topSolid(below))) e.vx = -e.vx;
      if (state === 'playing' && overlaps(px1, py1, px2, py2, e.x - 20, e.y - 28, e.x + 20, e.y)) hurt(e.x, UI.pick(['Ała! Kolce!', 'Ojej, jeż!']));
    });

    L.crows.forEach(function (c) {
      c.ph += dt;
      c.x += c.dir * CONFIG.crowSpeed * dt;
      if (c.x > c.x0 + CONFIG.crowRange * T) c.dir = -1;
      if (c.x < c.x0 - CONFIG.crowRange * T) c.dir = 1;
      c.y = c.y0 + Math.sin(c.ph * 2.2) * CONFIG.crowBob;
      if (state === 'playing' && overlaps(px1, py1, px2, py2, c.x - 20, c.y - 12, c.x + 20, c.y + 14)) hurt(c.x, 'Kra! Ojej!');
    });

    L.berries.forEach(function (b) {
      if (b.got) return;
      var dx = b.x - p.x, dy = b.y - (p.y - 30);
      if (dx * dx + dy * dy < 44 * 44) {
        b.got = true;
        L.collected++;
        Sound.play('seed');
        particles.burst(b.x, b.y, { n: 10, colors: ['#9D8CFF', '#FFFFFF', '#FFE066'], speed: 130 });
        if (L.collected % 5 === 0) speech.say(UI.pick(['Mniam!', 'Pyszne jagody!', 'Super!']), 1);
      }
    });

    L.checkpoints.forEach(function (cp) {
      if (cp.active) { cp.t += dt; return; }
      if (Math.abs(p.x - cp.x) < 44 && Math.abs(p.y - cp.y) < 80) {
        cp.active = true;
        L.respawn = { x: cp.x, y: cp.y };
        Sound.play('star');
        speech.say('Punkt kontrolny!', 1.5);
        particles.burst(cp.x, cp.y - 80, { n: 20, colors: ['#FFE066', '#FFB347', '#FFFFFF'], speed: 180 });
      }
    });

    var fr = L.friend;
    if (fr && state === 'playing') {
      var near = Math.abs(p.x - fr.x) < 520 && Math.abs(p.y - fr.y) < 360;
      if (near && !friendSpeech.str && Math.random() < dt * 0.6) friendSpeech.say(UI.pick(['Toffi! Tutaj!', 'Hej, Toffi!', 'Jestem tutaj!']), 1.8);
      if (Math.abs(p.x - fr.x) < 52 && Math.abs(p.y - fr.y) < 64) win();
    }

    Object.keys(L.bounce).forEach(function (k) { L.bounce[k] -= dt; if (L.bounce[k] <= 0) delete L.bounce[k]; });
  }

  // ---------------------------------------------------------------------
  // Camera
  // ---------------------------------------------------------------------
  function camTarget() {
    var lw = L.w * T, lh = L.h * T;
    var tx = UI.clamp(p.x - W / 2 + p.facing * 60, 0, Math.max(0, lw - W));
    var ty = lh <= H ? lh - H : UI.clamp(p.y - H * 0.6, 0, lh - H);
    return { x: tx, y: ty };
  }
  function snapCamera() { var t = camTarget(); cam.x = t.x; cam.y = t.y; }
  function updateCamera(dt) {
    var t = camTarget();
    cam.x += (t.x - cam.x) * Math.min(1, dt * 5);
    cam.y += (t.y - cam.y) * Math.min(1, dt * 4);
  }

  // ---------------------------------------------------------------------
  // Screens
  // ---------------------------------------------------------------------
  function goMenu() { location.href = '../../index.html'; }

  function showLevels() {
    state = 'menu';
    var html = '<div class="level-grid three">';
    LEVELS.forEach(function (lv, i) {
      var locked = i + 1 > progress.unlocked;
      var st = progress.stars[i] || 0;
      html += '<button type="button" class="level-btn' + (locked ? ' locked' : '') + '" data-level="' + i + '">' +
        (locked ? '<span class="lock">' + UI.ICONS.lock + '</span>' :
          '<span class="num">' + (i + 1) + '</span><span class="lv-stars">' +
          [0, 1, 2].map(function (k) { return '<i class="' + (k < st ? 'on' : '') + '">★</i>'; }).join('') + '</span>') +
        '<span class="lv-name">' + lv.name + '</span></button>';
    });
    html += '</div>';
    var ov = UI.showScreen(stage, {
      title: 'Przygoda w ogrodzie',
      text: 'Przyjaciele Toffi zgubili się w ogrodzie! Zbieraj <b>jagody</b>, omijaj <b>wronę</b> i <b>jeża</b>.',
      controls: [
        { keys: ['←', '→'], label: 'Biegnij' },
        { keys: ['↑', 'Spacja'], label: 'Skok' },
        { tap: true, label: 'Przyciski' }
      ],
      html: html,
      cls: 'levels-screen',
      buttons: [{ label: 'Graj!', icon: 'play', onClick: function () { startLevel(Math.min(progress.unlocked, LEVELS.length) - 1); } }]
    });
    ov.querySelectorAll('.level-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        var i = +b.dataset.level;
        if (i + 1 > progress.unlocked) { Sound.play('nope'); return; }
        Sound.play('click');
        startLevel(i);
      });
    });
  }

  function togglePause() {
    if (state === 'playing') {
      state = 'paused';
      UI.showScreen(stage, {
        title: 'Pauza',
        toffi: 'sleep',
        text: 'Toffi chwilkę odpoczywa.',
        buttons: [
          { label: 'Graj dalej', icon: 'play', onClick: function () { UI.hideScreen(stage); state = 'playing'; } },
          { label: 'Od nowa', icon: 'restart', color: 'sky', onClick: function () { startLevel(levelIdx); } },
          { label: 'Poziomy', icon: 'list', color: 'orange', onClick: showLevels }
        ]
      });
    } else if (state === 'paused') {
      UI.hideScreen(stage); state = 'playing';
    }
  }
  UI.onHidden(function () { if (state === 'playing') togglePause(); });

  function gameOver() {
    state = 'over';
    Sound.play('over');
    setTimeout(function () {
      UI.showScreen(stage, {
        title: 'Spróbuj jeszcze raz!',
        toffi: 'hurt',
        text: 'Nic się nie stało! Toffi zacznie od ostatniego słonecznika.',
        buttons: [
          { label: 'Zagraj ponownie', icon: 'restart', onClick: continueFromCheckpoint },
          { label: 'Menu', icon: 'home', color: 'orange', onClick: goMenu }
        ]
      });
    }, 500);
  }

  function win() {
    state = 'won';
    var ratio = L.total ? L.collected / L.total : 1;
    var stars = ratio >= CONFIG.starBerries[1] ? 3 : ratio >= CONFIG.starBerries[0] ? 2 : 1;
    progress.stars[levelIdx] = Math.max(progress.stars[levelIdx] || 0, stars);
    progress.berries[levelIdx] = Math.max(progress.berries[levelIdx] || 0, L.collected);
    progress.unlocked = Math.max(progress.unlocked, Math.min(LEVELS.length, levelIdx + 2));
    ToffiStore.set('ogrod.progress', progress);
    Sound.play('friend');
    var fname = L.def.friend.name;
    speech.say('Hurra! Znalazłam cię!', 1.1);
    setTimeout(function () { friendSpeech.say('Dziękuję, Toffi!', 1.5); }, 1100);
    var last = levelIdx === LEVELS.length - 1;
    setTimeout(function () {
      UI.showScreen(stage, {
        title: last ? 'Wszyscy przyjaciele są razem!' : 'Hurra! ' + fname + ' się odnalazła!',
        toffi: 'wiggle',
        stars: stars,
        text: 'Jagody: <b>' + L.collected + ' / ' + L.total + '</b>' + (last ? '<br>Jesteś super! Brawo!' : ''),
        buttons: (last ? [] : [{ label: 'Dalej', icon: 'next', onClick: function () { startLevel(levelIdx + 1); } }]).concat([
          { label: 'Jeszcze raz', icon: 'restart', color: 'sky', onClick: function () { startLevel(levelIdx); } },
          { label: 'Poziomy', icon: 'list', color: 'orange', onClick: showLevels }
        ])
      });
    }, 2500);
  }

  // ---------------------------------------------------------------------
  // Input
  // ---------------------------------------------------------------------
  function pressJump() { if (p) p.buffer = CONFIG.jumpBuffer; input.jumpHeld = true; }
  window.addEventListener('keydown', function (e) {
    var k = e.key;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') { input.left = true; e.preventDefault(); }
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') { input.right = true; e.preventDefault(); }
    else if (k === 'ArrowUp' || k === 'w' || k === 'W' || e.code === 'Space') { e.preventDefault(); if (!e.repeat) pressJump(); }
    else if (k === 'p' || k === 'P' || k === 'Escape') togglePause();
  });
  window.addEventListener('keyup', function (e) {
    var k = e.key;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') input.left = false;
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') input.right = false;
    else if (k === 'ArrowUp' || k === 'w' || k === 'W' || e.code === 'Space') input.jumpHeld = false;
  });
  window.addEventListener('blur', function () { input.left = input.right = input.jumpHeld = false; });

  function touchButton(icon, label, left, onDown, onUp) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'touch-btn';
    b.innerHTML = UI.ICONS[icon];
    b.setAttribute('aria-label', label);
    b.style.left = left + 'px'; b.style.top = '420px';
    b.addEventListener('pointerdown', function (e) { e.preventDefault(); e.stopPropagation(); b.classList.add('pressed'); onDown(); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) {
      b.addEventListener(ev, function () { if (b.classList.contains('pressed')) { b.classList.remove('pressed'); onUp(); } });
    });
    stage.el.appendChild(b);
  }
  touchButton('left', 'W lewo', 14, function () { input.left = true; }, function () { input.left = false; });
  touchButton('right', 'W prawo', 134, function () { input.right = true; }, function () { input.right = false; });
  touchButton('jump', 'Skok', W - 122, pressJump, function () { input.jumpHeld = false; });

  UI.createTopBar(stage, { onPause: togglePause });

  // ---------------------------------------------------------------------
  // Drawing: backgrounds
  // ---------------------------------------------------------------------
  function initRain() {
    rain = [];
    for (var i = 0; i < 70; i++) rain.push({ x: Math.random() * W, y: Math.random() * H, s: UI.rand(380, 560) });
  }

  function hills(color, base, amp, freq, parallax, offY) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, H);
    var off = cam.x * parallax;
    for (var x = 0; x <= W + 20; x += 20) {
      var wx = x + off;
      ctx.lineTo(x, base - offY + Math.sin(wx * freq) * amp + Math.sin(wx * freq * 2.7) * amp * 0.35);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
  }

  function clouds(parallax, y, alpha) {
    ctx.fillStyle = 'rgba(255,255,255,' + alpha + ')';
    for (var i = 0; i < 6; i++) {
      var cx = ((i * 260 - cam.x * parallax + animT * 8) % (W + 300) + W + 300) % (W + 300) - 150;
      var cy = y + (i % 3) * 40;
      ctx.beginPath(); ctx.arc(cx, cy, 24, 0, 7); ctx.arc(cx + 28, cy - 12, 30, 0, 7); ctx.arc(cx + 58, cy, 22, 0, 7); ctx.fill();
    }
  }

  function drawBackground() {
    var theme = L.def.theme;
    var g;
    if (theme === 'lettuce') {
      g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#9FD8FF'); g.addColorStop(1, '#FFF4D6');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      // sun
      ctx.save();
      ctx.translate(840, 110);
      ctx.rotate(animT * 0.2);
      ctx.fillStyle = 'rgba(255,220,100,0.35)';
      for (var r = 0; r < 12; r++) { ctx.rotate(Math.PI / 6); ctx.fillRect(-6, 50, 12, 30); }
      ctx.restore();
      ctx.fillStyle = '#FFE066';
      ctx.beginPath(); ctx.arc(840, 110, 44, 0, 7); ctx.fill();
      clouds(0.1, 70, 0.9);
      hills('#B9E6A0', 360, 26, 0.006, 0.2, 0);
      hills('#94D67F', 410, 18, 0.01, 0.4, 0);
      // picket fence
      var fy = 9 * T - cam.y;
      var off = ((-cam.x * 0.7) % 40 + 40) % 40;
      ctx.fillStyle = '#FFFFFF';
      for (var fx = off - 40; fx < W + 40; fx += 40) {
        ctx.beginPath(); ctx.moveTo(fx, fy - 10); ctx.lineTo(fx, fy - 80); ctx.lineTo(fx + 12, fy - 92); ctx.lineTo(fx + 24, fy - 80); ctx.lineTo(fx + 24, fy - 10); ctx.fill();
      }
      ctx.fillRect(0, fy - 66, W, 10); ctx.fillRect(0, fy - 36, W, 10);
    } else if (theme === 'rain') {
      g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#B7C9E2'); g.addColorStop(1, '#E6EEF7');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      // rainbow
      var rx = 700 - cam.x * 0.05;
      ['#FF9AA2', '#FFD3A5', '#FDFD96', '#B5EAD7', '#A0C4FF', '#CDB4FF'].forEach(function (c, i) {
        ctx.strokeStyle = c; ctx.globalAlpha = 0.55; ctx.lineWidth = 12;
        ctx.beginPath(); ctx.arc(rx, 420, 260 - i * 12, Math.PI, 0); ctx.stroke();
      });
      ctx.globalAlpha = 1;
      clouds(0.1, 50, 0.95);
      hills('#A7CFA0', 370, 24, 0.006, 0.2, 0);
      hills('#86BD84', 415, 16, 0.011, 0.4, 0);
    } else {
      // tree: the sky gets brighter higher up
      var hgt = L.h * T;
      var k = UI.clamp(cam.y / (hgt - H), 0, 1);
      g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, k < 0.5 ? '#FFD9E8' : '#A9DBFF');
      g.addColorStop(1, '#E9F7FF');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      clouds(0.05, 80 + (cam.y * 0.05) % 200, 0.85);
      // distant hills at the bottom of the level
      hills('#B9E6A0', 440 + (hgt - H - cam.y) * 0.3, 22, 0.008, 0.1, 0);
    }
  }

  // Big tree trunk + canopy for the tree level (world space)
  function drawTreeTrunk() {
    var x1 = 8.6 * T, x2 = 15.4 * T;
    var topY = 3 * T, botY = (L.h - 2) * T;
    ctx.fillStyle = '#9B6A43';
    ctx.fillRect(x1, topY, x2 - x1, botY - topY);
    ctx.fillStyle = '#87593A';
    for (var y = topY; y < botY; y += 70) {
      ctx.beginPath(); ctx.ellipse(x1 + 60 + (y % 140 ? 140 : 0), y + 30, 12, 26, 0, 0, 7); ctx.fill();
      ctx.fillRect(x1 + 30 + (y % 210) * 0.8, y, 6, 50);
    }
    // canopy at the top
    ctx.fillStyle = '#6CC56F';
    [[12, 2, 160], [6, 3, 120], [18, 3, 120], [3, 6, 90], [21, 6, 90], [12, -1, 120]].forEach(function (c) {
      ctx.beginPath(); ctx.arc(c[0] * T, c[1] * T, c[2], 0, 7); ctx.fill();
    });
    ctx.fillStyle = '#7ED27F';
    [[10, 1, 60], [15, 2, 50], [5, 4, 40]].forEach(function (c) { ctx.beginPath(); ctx.arc(c[0] * T, c[1] * T, c[2], 0, 7); ctx.fill(); });
    // leaf clusters along the trunk
    for (var i = 0; i < 14; i++) {
      var lx = ((i * 7) % 22 + 1) * T, ly = (8 + i * 3.4) * T;
      ctx.fillStyle = i % 2 ? 'rgba(108,197,111,0.55)' : 'rgba(126,210,127,0.55)';
      ctx.beginPath(); ctx.arc(lx, ly, 40, 0, 7); ctx.arc(lx + 34, ly + 10, 30, 0, 7); ctx.fill();
    }
  }

  // ---------------------------------------------------------------------
  // Drawing: tiles and objects (world space)
  // ---------------------------------------------------------------------
  var SOIL = { lettuce: ['#A0703F', '#8A5E33'], rain: ['#8F6747', '#7A563B'], tree: ['#93683F', '#7D5734'] };

  function drawTiles() {
    var theme = L.def.theme;
    var soil = SOIL[theme];
    var tx1 = Math.max(0, Math.floor(cam.x / T) - 1), tx2 = Math.min(L.w - 1, Math.floor((cam.x + W) / T) + 1);
    var ty1 = Math.max(0, Math.floor(cam.y / T) - 1), ty2 = Math.min(L.h - 1, Math.floor((cam.y + H) / T) + 1);
    for (var ty = ty1; ty <= ty2; ty++) {
      for (var tx = tx1; tx <= tx2; tx++) {
        var c = L.tiles[ty][tx];
        var x = tx * T, y = ty * T;
        if (c === '#') {
          ctx.fillStyle = soil[0];
          ctx.fillRect(x, y, T + 1, T + 1);
          ctx.fillStyle = soil[1];
          ctx.beginPath(); ctx.arc(x + 12 + (tx % 3) * 8, y + 30, 4, 0, 7); ctx.arc(x + 36, y + 14 + (tx % 2) * 18, 3, 0, 7); ctx.fill();
          var above = tile(tx, ty - 1);
          if (above === ' ' || above === 'm') {   // grass only where there is open air above
            ctx.fillStyle = theme === 'rain' ? '#6FBF73' : '#7ED36B';
            ctx.fillRect(x, y, T + 1, 13);
            ctx.beginPath();
            for (var b = 0; b < 4; b++) { ctx.moveTo(x + b * 12, y + 12); ctx.lineTo(x + b * 12 + 6, y - 5); ctx.lineTo(x + b * 12 + 12, y + 12); }
            ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.25)';
            ctx.fillRect(x, y + 2, T + 1, 3);
          }
        } else if (c === '=') {
          drawPlatform(x, y, tx, ty, theme);
        } else if (c === 'w') {
          var wg = ctx.createLinearGradient(0, y, 0, y + T);
          wg.addColorStop(0, '#8FD3FF'); wg.addColorStop(1, '#4E9BD6');
          ctx.fillStyle = wg;
          ctx.beginPath();
          ctx.moveTo(x, y + T + 1);
          for (var wx = 0; wx <= T; wx += 8) ctx.lineTo(x + wx, y + 12 + Math.sin(animT * 3 + (x + wx) * 0.08) * 3);
          ctx.lineTo(x + T, y + T + 1);
          ctx.closePath(); ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.ellipse(x + 24, y + 30, 8 + (animT * 10 + tx * 5) % 10, 3, 0, 0, 7); ctx.stroke();
        } else if (c === 'm') {
          drawMushroom(x, y, L.bounce[tx + ',' + ty] || 0);
        }
      }
    }
  }

  function drawPlatform(x, y, tx, ty, theme) {
    var leftEnd = tile(tx - 1, ty) !== '=', rightEnd = tile(tx + 1, ty) !== '=';
    if (theme === 'lettuce') {
      ctx.fillStyle = '#C98B5A';
      UI.roundRect(ctx, x - (leftEnd ? 0 : 2), y, T + (leftEnd ? 0 : 2) + (rightEnd ? 0 : 2), 18, leftEnd || rightEnd ? 7 : 0); ctx.fill();
      ctx.fillStyle = '#A9744F';
      ctx.fillRect(x, y + 13, T, 5);
      ctx.fillStyle = '#E2AD7E';
      ctx.fillRect(x + 4, y + 3, T - 8, 3);
      if (leftEnd) { ctx.fillStyle = '#8A5E3B'; ctx.beginPath(); ctx.arc(x + 8, y + 9, 2.5, 0, 7); ctx.fill(); }
      if (rightEnd) { ctx.fillStyle = '#8A5E3B'; ctx.beginPath(); ctx.arc(x + T - 8, y + 9, 2.5, 0, 7); ctx.fill(); }
    } else if (theme === 'rain') {
      if (tile(tx, ty) === '=' && ty === 9) {
        // lily pad on a puddle
        ctx.fillStyle = '#4E9BD6'; ctx.fillRect(x, y + 12, T, T - 12);
        ctx.fillStyle = '#6FCB6F';
        ctx.beginPath(); ctx.ellipse(x + T / 2, y + 12, 28, 10, 0, 0.3, Math.PI * 2 - 0.3); ctx.lineTo(x + T / 2, y + 12); ctx.fill();
        ctx.strokeStyle = '#4FA552'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x + T / 2, y + 12); ctx.lineTo(x + 6, y + 10); ctx.stroke();
      } else {
        ctx.fillStyle = '#7CCB6A';
        UI.roundRect(ctx, x - 1, y, T + 2, 16, leftEnd || rightEnd ? 8 : 0); ctx.fill();
        ctx.fillStyle = '#5DAF52';
        ctx.fillRect(x, y + 11, T, 5);
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x, y + 6); ctx.lineTo(x + T, y + 6); ctx.stroke();
      }
    } else {
      // tree branch with leaves
      ctx.fillStyle = '#8E5F3B';
      UI.roundRect(ctx, x - 1, y + 2, T + 2, 16, leftEnd || rightEnd ? 8 : 0); ctx.fill();
      ctx.fillStyle = '#A97650';
      ctx.fillRect(x, y + 4, T, 4);
      if ((tx + ty) % 2 === 0) {
        ctx.fillStyle = '#6CC56F';
        ctx.beginPath(); ctx.ellipse(x + 20, y + 2, 10, 5, -0.5, 0, 7); ctx.ellipse(x + 34, y + 20, 9, 4, 0.5, 0, 7); ctx.fill();
      }
    }
  }

  function drawMushroom(x, y, squash) {
    var s = squash > 0 ? 1 - Math.sin(squash / 0.35 * Math.PI) * 0.3 : 1;
    ctx.save();
    ctx.translate(x + T / 2, y + T);
    ctx.scale(1 + (1 - s) * 0.6, s);
    ctx.fillStyle = '#FFF1DC';
    UI.roundRect(ctx, -10, -28, 20, 28, 6); ctx.fill();
    ctx.fillStyle = '#FF6F7F';
    ctx.beginPath(); ctx.ellipse(0, -28, 26, 20, 0, Math.PI, 0); ctx.fill();
    ctx.fillRect(-26, -30, 52, 4);
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.arc(-10, -38, 5, 0, 7); ctx.arc(8, -42, 4, 0, 7); ctx.arc(16, -32, 3, 0, 7); ctx.fill();
    ctx.restore();
  }

  function drawDecor(d) {
    if (d.x < cam.x - 60 || d.x > cam.x + W + 60) return;
    if (d.type === 'L') {
      // lettuce head
      ctx.fillStyle = '#8FD86E';
      ctx.beginPath(); ctx.ellipse(d.x, d.y - 16, 26, 18, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#B5EB8F';
      ctx.beginPath(); ctx.ellipse(d.x - 8, d.y - 22, 14, 12, -0.4, 0, 7); ctx.ellipse(d.x + 10, d.y - 20, 13, 11, 0.4, 0, 7); ctx.fill();
      ctx.strokeStyle = '#6CBF52'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(d.x, d.y - 4); ctx.lineTo(d.x, d.y - 28); ctx.stroke();
    } else {
      // flower
      var sway = Math.sin(animT * 2 + d.k) * 3;
      ctx.strokeStyle = '#5FAF45'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.quadraticCurveTo(d.x + sway, d.y - 16, d.x + sway, d.y - 30); ctx.stroke();
      var cols = ['#FF8FAB', '#FFD45C', '#B49CFF', '#7DBEFF'];
      ctx.fillStyle = cols[d.k % cols.length];
      for (var i = 0; i < 5; i++) {
        var a = i / 5 * Math.PI * 2;
        ctx.beginPath(); ctx.arc(d.x + sway + Math.cos(a) * 7, d.y - 30 + Math.sin(a) * 7, 6, 0, 7); ctx.fill();
      }
      ctx.fillStyle = '#FFF4C2';
      ctx.beginPath(); ctx.arc(d.x + sway, d.y - 30, 4.5, 0, 7); ctx.fill();
    }
  }

  // Sunflower checkpoint: a closed bud that opens when reached
  function drawCheckpoint(cp) {
    var x = cp.x, y = cp.y;
    var sway = Math.sin(animT * 1.5 + x) * 3;
    ctx.strokeStyle = '#5FAF45'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + sway, y - 40, x + sway, y - 80); ctx.stroke();
    ctx.fillStyle = '#6CC56F';
    ctx.beginPath(); ctx.ellipse(x - 12, y - 36, 12, 6, 0.5, 0, 7); ctx.ellipse(x + 12, y - 50, 12, 6, -0.5, 0, 7); ctx.fill();
    var fx = x + sway, fy = y - 88;
    if (cp.active) {
      var open = Math.min(1, cp.t * 3);
      ctx.fillStyle = '#FFD23F';
      for (var i = 0; i < 12; i++) {
        var a = i / 12 * Math.PI * 2 + animT * 0.3;
        ctx.beginPath(); ctx.ellipse(fx + Math.cos(a) * 18 * open, fy + Math.sin(a) * 18 * open, 10 * open + 2, 5, a, 0, 7); ctx.fill();
      }
      ctx.fillStyle = '#7A4A2E';
      ctx.beginPath(); ctx.arc(fx, fy, 13, 0, 7); ctx.fill();
      ctx.strokeStyle = '#FFE7A8'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(fx, fy + 2, 6, 0.2, Math.PI - 0.2); ctx.stroke();
    } else {
      ctx.fillStyle = '#7BC86A';
      ctx.beginPath(); ctx.ellipse(fx, fy, 12, 16, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#FFD23F';
      ctx.beginPath(); ctx.ellipse(fx, fy - 12, 5, 6, 0, 0, 7); ctx.fill();
    }
  }

  // Grumpy (but harmless-looking) hedgehog
  function drawHedgehog(e) {
    var x = e.x, y = e.y, dir = e.vx >= 0 ? 1 : -1;
    var step = Math.sin(animT * 10 + x * 0.1) * 2;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir, 1);
    ctx.fillStyle = 'rgba(40,20,10,0.18)';
    ctx.beginPath(); ctx.ellipse(0, 0, 26, 5, 0, 0, 7); ctx.fill();
    // spikes
    ctx.fillStyle = '#7A5638';
    ctx.beginPath();
    ctx.moveTo(-26, -6);
    for (var i = 0; i <= 8; i++) {
      var a = Math.PI + i / 8 * Math.PI * 0.85;
      var r1 = 24, r2 = 34;
      ctx.lineTo(Math.cos(a) * r1 - 2, -6 + Math.sin(a) * r1 * 0.9);
      ctx.lineTo(Math.cos(a + 0.1) * r2 - 2, -6 + Math.sin(a + 0.1) * r2 * 0.9);
    }
    ctx.lineTo(18, -6);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#9C7350';
    ctx.beginPath(); ctx.ellipse(-2, -12, 24, 15, 0, 0, 7); ctx.fill();
    // face
    ctx.fillStyle = '#F2D7B4';
    ctx.beginPath(); ctx.ellipse(16, -10, 13, 10, 0.2, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(24, -14); ctx.lineTo(34, -8); ctx.lineTo(24, -4); ctx.fill();
    ctx.fillStyle = '#2B1C14';
    ctx.beginPath(); ctx.arc(34, -8, 3.5, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(17, -13, 2.6, 0, 7); ctx.fill();
    // grumpy eyebrow
    ctx.strokeStyle = '#2B1C14'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(12, -20); ctx.lineTo(21, -17); ctx.stroke();
    ctx.fillStyle = 'rgba(255,130,150,0.45)';
    ctx.beginPath(); ctx.arc(14, -6, 3.5, 0, 7); ctx.fill();
    // feet
    ctx.fillStyle = '#5E412A';
    ctx.beginPath(); ctx.ellipse(-10, -2 - step, 5, 3, 0, 0, 7); ctx.ellipse(10, -2 + step, 5, 3, 0, 0, 7); ctx.fill();
    ctx.restore();
  }

  // Round, cartoon crow
  function drawCrow(c) {
    var flap = Math.sin(animT * 12 + c.ph) * 0.6;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.scale(c.dir, 1);
    ctx.fillStyle = '#3B3A4A';
    // wing behind
    ctx.save(); ctx.rotate(-0.4 - flap); ctx.beginPath(); ctx.ellipse(-4, -10, 18, 8, -0.3, 0, 7); ctx.fill(); ctx.restore();
    ctx.beginPath(); ctx.ellipse(0, 0, 22, 16, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-18, -2); ctx.lineTo(-32, -8); ctx.lineTo(-30, 6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#4B4A5E';
    ctx.save(); ctx.rotate(0.2 + flap); ctx.beginPath(); ctx.ellipse(-2, -6, 16, 7, 0.2, 0, 7); ctx.fill(); ctx.restore();
    ctx.fillStyle = '#FFB347';
    ctx.beginPath(); ctx.moveTo(18, -4); ctx.lineTo(32, 0); ctx.lineTo(18, 5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.arc(11, -6, 5, 0, 7); ctx.fill();
    ctx.fillStyle = '#1B1A22';
    ctx.beginPath(); ctx.arc(12, -6, 3, 0, 7); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.arc(13, -7, 1.2, 0, 7); ctx.fill();
    ctx.fillStyle = '#FFB347';
    ctx.fillRect(-4, 14, 3, 6); ctx.fillRect(4, 14, 3, 6);
    ctx.restore();
  }

  function drawRain() {
    if (L.def.theme !== 'rain') return;
    ctx.strokeStyle = 'rgba(110,150,210,0.45)'; ctx.lineWidth = 2;
    ctx.beginPath();
    rain.forEach(function (d) { ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - 3, d.y + 12); });
    ctx.stroke();
  }

  function drawHUD() {
    UI.drawHearts(ctx, 106, 42, L.lives, CONFIG.lives, 30);
    ctx.fillStyle = 'rgba(255,250,242,0.95)';
    UI.roundRect(ctx, W / 2 - 150, 12, 300, 60, 30); ctx.fill();
    UI.drawBerry(ctx, W / 2 - 118, 40, 30);
    UI.text(ctx, L.collected + ' / ' + L.total, W / 2 - 96, 34, { size: 26, color: '#5B3A29' });
    UI.text(ctx, (levelIdx + 1) + '. ' + L.def.name, W / 2 - 96, 58, { size: 15, color: '#A07A5E', weight: 700 });
  }

  function render() {
    stage.begin();
    if (!L) { ctx.fillStyle = '#BEE6FF'; ctx.fillRect(0, 0, W, H); return; }
    drawBackground();
    drawRain();

    ctx.save();
    ctx.translate(-Math.round(cam.x), -Math.round(cam.y));
    if (L.def.theme === 'tree') drawTreeTrunk();
    L.decor.forEach(drawDecor);
    L.checkpoints.forEach(drawCheckpoint);
    drawTiles();

    L.berries.forEach(function (b) {
      if (b.got) return;
      UI.drawBerry(ctx, b.x, b.y + Math.sin(animT * 3 + b.ph) * 4, 28);
    });
    L.hedgehogs.forEach(drawHedgehog);

    // friend
    var fr = L.friend;
    if (fr) {
      var fAnim = state === 'won' ? 'wiggle' : 'wave';
      Toffi.draw(ctx, fr.x, fr.y, 68, { anim: fAnim, t: animT + 0.5, palette: L.def.friend.palette, facing: p.x < fr.x ? -1 : 1 });
    }

    // Toffi
    var anim = 'idle';
    if (p.hurt > 0) anim = 'hurt';
    else if (state === 'won') anim = 'wiggle';
    else if (!p.onGround) anim = p.vy < 0 ? 'jump' : 'fall';
    else if (Math.abs(p.vx) > 20) anim = 'run';
    var blink = p.invuln > 0 && Math.floor(p.invuln * 10) % 2 === 0;
    Toffi.draw(ctx, p.x, p.y, 72, { anim: anim, t: animT, facing: p.facing, alpha: blink ? 0.45 : 1, shadow: p.onGround });

    L.crows.forEach(drawCrow);
    particles.draw(ctx);
    speech.draw(ctx, p.x, p.y - 72, { size: 22, maxX: cam.x + W });
    if (fr) friendSpeech.draw(ctx, fr.x, fr.y - 70, { size: 20, maxX: cam.x + W });
    ctx.restore();

    drawHUD();
  }

  // ---------------------------------------------------------------------
  // Main loop
  // ---------------------------------------------------------------------
  UI.loop(function (dt) {
    animT += dt;
    if (L && state !== 'paused' && state !== 'menu') {
      if (state === 'playing' || state === 'won' || state === 'over') {
        if (state === 'playing') updatePlayer(dt);
        updateWorld(dt);
        updateCamera(dt);
      }
      if (state === 'won' && Math.random() < dt * 10) {
        particles.burst(L.friend.x + UI.rand(-60, 60), L.friend.y - UI.rand(40, 100), { n: 4, colors: ['#FFE066', '#FF8FAB', '#7DBEFF', '#FFFFFF'] });
      }
      speech.update(dt);
      friendSpeech.update(dt);
      particles.update(dt);
      rain.forEach(function (d) { d.y += d.s * dt; d.x -= 30 * dt; if (d.y > H) { d.y = -10; d.x = Math.random() * (W + 40); } });
    }
    render();
  });

  window.__toffiGame = {
    get state() { return { L: L, p: p, state: state, cam: cam }; },
    startLevel: startLevel, input: input, CONFIG: CONFIG
  };

  // Show level 1 behind the level select screen
  startLevel(Math.min(progress.unlocked, LEVELS.length) - 1);
  showLevels();
})();
