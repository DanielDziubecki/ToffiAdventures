/* =========================================================================
   Gra 3: "Pełne policzki" – arcade catching game.

   Food falls from the top. Toffi catches it and stores it in her cheeks:
   she gets rounder and slower. Run to the nest on the left to unload for
   bonus points. Avoid pebbles and rotten food.
   ========================================================================= */
(function () {
  'use strict';

  var UI = ToffiUI, Sound = ToffiSound;

  // ---------------------------------------------------------------------
  // DIFFICULTY – tweak these numbers
  // ---------------------------------------------------------------------
  var CONFIG = {
    lives: 3,               // hearts at the start
    maxLives: 5,            // hearts can be refilled up to this
    cheekCapacity: 10,      // how much food fits in the cheeks
    speed: 440,             // Toffi's running speed with empty cheeks
    fullSlowdown: 0.5,      // 0.5 = half speed with full cheeks
    spawnStart: 1.2,        // seconds between falling items at the start
    spawnMin: 0.6,          // ... and at the hardest
    fallStart: 120,         // falling speed at the start (pixels / second)
    fallMax: 270,           // ... and at the hardest
    rampTime: 150,          // seconds until the hardest level is reached
    badStart: 0.12,         // share of pebbles / rotten food at the start
    badMax: 0.27,           // ... and at the hardest
    heartEvery: 22,         // seconds between bonus hearts (when a heart is missing)
    unloadPerUnit: 5,       // bonus points for each food unit unloaded in the nest
    fullBonus: 50,          // extra bonus for unloading completely full cheeks
    catchWidth: 62          // half-width of the catching area (bigger = easier)
  };

  // Food types: units = how much cheek space, pts = points for catching
  var FOODS = {
    seed:     { units: 1, pts: 10, size: 30 },
    carrot:   { units: 2, pts: 20, size: 54 },
    apple:    { units: 2, pts: 20, size: 50 },
    broccoli: { units: 2, pts: 20, size: 50 },
    pebble:   { bad: true, size: 40 },
    rotten:   { bad: true, size: 48 },
    heart:    { heart: true, size: 42 }
  };

  var stage = UI.createStage();
  var ctx = stage.ctx, W = stage.W, H = stage.H;
  var GROUND = 474;
  var NEST_X = 150;          // Toffi unloads when she is left of this
  var TOFFI_SIZE = 94;

  var particles = new UI.Particles();
  var speech = new UI.Speech();
  var state = 'start';
  var best = ToffiStore.get('policzki.best', 0);
  var animT = 0;
  var g = null;

  var input = { left: false, right: false, targetX: null };

  function newGame() {
    g = {
      x: 480, vx: 0, facing: 1,
      lives: CONFIG.lives,
      score: 0,
      units: 0,
      cheekPts: 0,
      items: [],
      spawnT: 1.2,
      elapsed: 0,
      heartT: CONFIG.heartEvery,
      eatT: 0, hurtT: 0, invuln: 0,
      unloadT: 0,
      stored: 0,          // food in the nest (for drawing the pile)
      toldNest: false,
      fullWarnT: 0
    };
    input.targetX = null;
  }

  function difficulty() { return Math.min(1, g.elapsed / CONFIG.rampTime); }
  function fill() { return g.units / CONFIG.cheekCapacity; }

  // ---------------------------------------------------------------------
  // Spawning
  // ---------------------------------------------------------------------
  function spawn() {
    var d = difficulty();
    var type;
    if (g.lives < CONFIG.maxLives && g.heartT <= 0) {
      type = 'heart';
      g.heartT = CONFIG.heartEvery;
    } else if (Math.random() < UI.lerp(CONFIG.badStart, CONFIG.badMax, d)) {
      type = Math.random() < 0.5 ? 'pebble' : 'rotten';
    } else {
      var r = Math.random();
      type = r < 0.45 ? 'seed' : r < 0.65 ? 'carrot' : r < 0.85 ? 'apple' : 'broccoli';
    }
    var fall = UI.lerp(CONFIG.fallStart, CONFIG.fallMax, d) * UI.rand(0.85, 1.15);
    g.items.push({
      type: type, x: UI.rand(NEST_X + 70, W - 50), y: -40,
      vy: fall, rot: UI.rand(-0.5, 0.5), spin: UI.rand(-1.5, 1.5),
      sway: UI.rand(0, 6), landed: 0
    });
    g.spawnT = UI.lerp(CONFIG.spawnStart, CONFIG.spawnMin, d) * UI.rand(0.8, 1.2);
  }

  // ---------------------------------------------------------------------
  // Input: arrows / A D, mouse movement, touch drag, on-screen buttons
  // ---------------------------------------------------------------------
  window.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { input.left = true; input.targetX = null; e.preventDefault(); }
    else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { input.right = true; input.targetX = null; e.preventDefault(); }
    else if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') togglePause();
  });
  window.addEventListener('keyup', function (e) {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') input.left = false;
    else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') input.right = false;
  });

  var pointerDown = false;
  stage.canvas.addEventListener('pointerdown', function (e) {
    pointerDown = true;
    input.targetX = stage.toLogical(e.clientX, e.clientY).x;
  });
  stage.canvas.addEventListener('pointermove', function (e) {
    // the mouse steers just by moving; a finger only while touching
    if (e.pointerType === 'mouse' || pointerDown) input.targetX = stage.toLogical(e.clientX, e.clientY).x;
  });
  window.addEventListener('pointerup', function () { pointerDown = false; });

  function holdButton(icon, label, left, key) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'touch-btn';
    b.innerHTML = UI.ICONS[icon];
    b.setAttribute('aria-label', label);
    b.style.left = left + 'px';
    b.style.top = '420px';
    function set(v) { input[key] = v; b.classList.toggle('pressed', v); if (v) input.targetX = null; }
    b.addEventListener('pointerdown', function (e) { e.preventDefault(); e.stopPropagation(); set(true); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { b.addEventListener(ev, function () { set(false); }); });
    stage.el.appendChild(b);
  }
  holdButton('left', 'W lewo', 176, 'left');
  holdButton('right', 'W prawo', W - 122, 'right');

  // ---------------------------------------------------------------------
  // Screens
  // ---------------------------------------------------------------------
  UI.createTopBar(stage, { onPause: togglePause });

  function foodPicHTML() {
    var c = document.createElement('canvas');
    c.width = 220; c.height = 70;
    var x = c.getContext('2d');
    UI.drawSeed(x, 22, 35, 30, 0.3);
    UI.drawCarrot(x, 68, 37, 50, 0.3);
    UI.drawApple(x, 115, 37, 46);
    drawBroccoli(x, 165, 37, 46);
    return '<img src="' + c.toDataURL() + '" width="165" height="52" alt="">';
  }
  function badPicHTML() {
    var c = document.createElement('canvas');
    c.width = 120; c.height = 70;
    var x = c.getContext('2d');
    drawPebble(x, 30, 40, 40);
    UI.drawApple(x, 88, 37, 46, 0, true);
    x.strokeStyle = '#E0607E'; x.lineWidth = 6; x.lineCap = 'round';
    x.beginPath(); x.moveTo(8, 8); x.lineTo(112, 62); x.stroke();
    return '<img src="' + c.toDataURL() + '" width="90" height="52" alt="">';
  }

  function showStart() {
    state = 'start';
    UI.showScreen(stage, {
      title: 'Pełne policzki',
      toffi: 'eat',
      cheeks: 1,
      text: 'Łap jedzenie do policzków! Gdy są pełne, biegnij do <b>gniazdka</b> po lewej – dostaniesz bonus.<br>Uważaj na <b>kamyki</b> i <b>zepsute jedzenie</b>!',
      controls: [
        { keys: ['←', '→'], mouse: true, tap: true, label: 'Ruch' },
        { html: foodPicHTML(), label: 'Łap!' },
        { html: badPicHTML(), label: 'Unikaj!' }
      ],
      buttons: [{ label: 'Graj!', icon: 'play', onClick: startGame }]
    });
  }

  function startGame() {
    UI.hideScreen(stage);
    newGame();
    state = 'playing';
    speech.say('Łap jedzenie!', 1.6);
  }

  function togglePause() {
    if (state === 'playing') {
      state = 'paused';
      UI.showScreen(stage, {
        title: 'Pauza',
        toffi: 'sleep',
        text: 'Toffi chwilkę odpoczywa.',
        buttons: [
          { label: 'Graj dalej', icon: 'play', onClick: resume },
          { label: 'Od nowa', icon: 'restart', color: 'sky', onClick: startGame },
          { label: 'Menu', icon: 'home', color: 'orange', onClick: goMenu }
        ]
      });
    } else if (state === 'paused') resume();
  }
  function resume() { UI.hideScreen(stage); state = 'playing'; }
  function goMenu() { location.href = '../../index.html'; }
  UI.onHidden(function () { if (state === 'playing') togglePause(); });

  function gameOver() {
    state = 'over';
    var newBest = g.score > best;
    if (newBest) { best = g.score; ToffiStore.set('policzki.best', best); }
    Sound.play(newBest ? 'win' : 'over');
    UI.showScreen(stage, {
      title: newBest ? 'Nowy rekord! Super!' : 'Spróbuj jeszcze raz!',
      toffi: newBest ? 'wiggle' : 'eat',
      cheeks: 1,
      text: 'Punkty: <b>' + g.score + '</b><br>Rekord: <b>' + best + '</b>',
      buttons: [
        { label: 'Zagraj ponownie', icon: 'restart', onClick: startGame },
        { label: 'Menu', icon: 'home', color: 'orange', onClick: goMenu }
      ]
    });
  }

  // ---------------------------------------------------------------------
  // Update
  // ---------------------------------------------------------------------
  function catchItem(it) {
    var f = FOODS[it.type];
    it.dead = true;
    var mx = g.x, my = GROUND - 70;
    if (f.heart) {
      g.lives = Math.min(CONFIG.maxLives, g.lives + 1);
      Sound.play('golden');
      particles.burst(mx, my, { n: 16, colors: ['#FF5C8A', '#FFD1DC', '#FFFFFF'] });
      speech.say('Serduszko!', 1.2);
      return;
    }
    if (f.bad) {
      if (g.invuln > 0) return;
      g.lives--;
      g.hurtT = 0.6;
      g.invuln = 1.2;
      Sound.play('yuck');
      speech.say(it.type === 'pebble' ? 'Ała! Kamyk!' : 'Fuj!', 1.1);
      particles.burst(mx, my, { n: 10, colors: ['#B9B3A8', '#8E8A4E'], shape: 'circle', speed: 140 });
      if (g.lives <= 0) { state = 'ending'; setTimeout(gameOver, 700); }
      return;
    }
    if (g.units + f.units > CONFIG.cheekCapacity) {
      // cheeks are full: the food bounces off
      it.dead = false;
      it.vy = -260; it.bounced = true;
      if (g.fullWarnT <= 0) { speech.say('Pełne policzki! Do gniazdka!', 1.8); g.fullWarnT = 2.5; Sound.play('nope'); }
      return;
    }
    g.units += f.units;
    g.score += f.pts;
    g.eatT = 0.45;
    Sound.play('eat');
    particles.burst(mx, my, { n: 8, speed: 110 });
    particles.text(it.x, it.y - 10, '+' + f.pts, { color: '#FFE066', size: 28 });
    if (Math.random() < 0.35) speech.say(UI.pick(['Mniam!', 'Pycha!', 'Mniam, mniam!']), 0.9);
    if (!g.toldNest && fill() >= 0.6) {
      g.toldNest = true;
      speech.say('Do gniazdka po bonus!', 2);
    }
  }

  function unload() {
    var bonus = g.units * CONFIG.unloadPerUnit + (g.units >= CONFIG.cheekCapacity ? CONFIG.fullBonus : 0);
    g.score += bonus;
    g.stored += g.units;
    g.units = 0;
    Sound.play('unload');
    speech.say(bonus >= CONFIG.fullBonus ? 'Pełne gniazdko! Super!' : UI.praise(), 1.4);
    particles.text(170, GROUND - 190, 'Bonus +' + bonus, { color: '#FFE066', size: 34, life: 1.5 });
    particles.burst(80, GROUND - 40, { n: 26, speed: 200, colors: ['#FFE066', '#FFB347', '#FFFFFF', '#FF8FAB'] });
  }

  function update(dt) {
    g.elapsed += dt;
    g.heartT -= dt;
    g.eatT -= dt; g.hurtT -= dt; g.invuln -= dt; g.fullWarnT -= dt;

    // --- Movement (slower with full cheeks) ---
    var speed = CONFIG.speed * (1 - CONFIG.fullSlowdown * fill());
    var dir = 0;
    if (input.left) dir -= 1;
    if (input.right) dir += 1;
    if (!dir && input.targetX != null) {
      var diff = input.targetX - g.x;
      if (Math.abs(diff) > 8) dir = diff > 0 ? 1 : -1;
      if (Math.abs(diff) < speed * dt) { g.x = input.targetX; dir = 0; }
    }
    g.vx = dir * speed;
    if (dir) g.facing = dir;
    g.x = UI.clamp(g.x + g.vx * dt, 62, W - 50);

    // --- Unload in the nest ---
    if (g.x < NEST_X && g.units > 0 && g.unloadT <= 0) g.unloadT = 0.6;
    if (g.unloadT > 0) {
      g.unloadT -= dt;
      if (g.unloadT <= 0) unload();
    }

    // --- Items ---
    g.spawnT -= dt;
    if (g.spawnT <= 0) spawn();
    var cw = CONFIG.catchWidth * (1 + fill() * 0.3);
    g.items.forEach(function (it) {
      if (it.landed) { it.landed += dt; return; }
      it.vy += (it.bounced ? 900 : 0) * dt;
      it.y += it.vy * dt;
      it.x += Math.sin(animT * 2 + it.sway) * 12 * dt;
      it.rot += it.spin * dt;
      // catching zone: around Toffi's head
      if (!it.bounced && state === 'playing') {
        var dy = it.y - (GROUND - 80);
        if (Math.abs(it.x - g.x) < cw && dy > -50 && dy < 40) catchItem(it);
      }
      if (it.y > GROUND - 14) { it.y = GROUND - 14; it.landed = 0.01; }
    });
    g.items = g.items.filter(function (it) { return !it.dead && it.landed < 0.8 && it.y < H + 60; });
  }

  // ---------------------------------------------------------------------
  // Drawing
  // ---------------------------------------------------------------------
  function drawBroccoli(c, x, y, s, rot) {
    c.save();
    c.translate(x, y); c.rotate(rot || 0); c.scale(s / 40, s / 40);
    c.fillStyle = '#9BD77A';
    c.beginPath(); c.moveTo(-5, 0); c.lineTo(5, 0); c.lineTo(4, 18); c.lineTo(-4, 18); c.closePath(); c.fill();
    c.fillStyle = '#4FAA4F';
    [[-9, -4, 10], [9, -4, 10], [0, -12, 11], [-4, -2, 9], [5, -2, 9]].forEach(function (b) {
      c.beginPath(); c.arc(b[0], b[1], b[2], 0, Math.PI * 2); c.fill();
    });
    c.fillStyle = '#6BC46B';
    c.beginPath(); c.arc(-3, -12, 4, 0, 7); c.arc(8, -7, 3, 0, 7); c.fill();
    c.restore();
  }

  function drawPebble(c, x, y, s, rot) {
    c.save();
    c.translate(x, y); c.rotate(rot || 0); c.scale(s / 40, s / 40);
    c.fillStyle = '#A9A39A';
    c.beginPath();
    c.moveTo(-16, 4); c.quadraticCurveTo(-18, -12, -2, -14); c.quadraticCurveTo(16, -14, 18, 2);
    c.quadraticCurveTo(18, 14, 0, 14); c.quadraticCurveTo(-14, 14, -16, 4);
    c.fill();
    c.strokeStyle = '#7D776E'; c.lineWidth = 2; c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.4)';
    c.beginPath(); c.ellipse(-6, -6, 5, 3, -0.4, 0, 7); c.fill();
    c.restore();
  }

  function drawItem(it) {
    var f = FOODS[it.type];
    var a = it.landed ? Math.max(0, 1 - it.landed / 0.8) : 1;
    ctx.globalAlpha = a;
    // soft shadow on the ground while falling
    if (!it.landed) {
      var sh = Math.max(0, 1 - (GROUND - it.y) / 500);
      ctx.fillStyle = 'rgba(60,40,20,' + (0.2 * sh) + ')';
      ctx.beginPath(); ctx.ellipse(it.x, GROUND + 4, 18 * sh + 4, 5, 0, 0, 7); ctx.fill();
    }
    switch (it.type) {
      case 'seed': UI.drawSeed(ctx, it.x, it.y, f.size, it.rot); break;
      case 'carrot': UI.drawCarrot(ctx, it.x, it.y, f.size, it.rot); break;
      case 'apple': UI.drawApple(ctx, it.x, it.y, f.size, it.rot); break;
      case 'broccoli': drawBroccoli(ctx, it.x, it.y, f.size, it.rot); break;
      case 'pebble': drawPebble(ctx, it.x, it.y, f.size, it.rot); break;
      case 'rotten':
        UI.drawApple(ctx, it.x, it.y, f.size, it.rot, true);
        // smelly lines
        ctx.strokeStyle = 'rgba(120,140,60,0.7)'; ctx.lineWidth = 3;
        for (var i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.moveTo(it.x + i * 10, it.y - 30);
          ctx.quadraticCurveTo(it.x + i * 10 + 6, it.y - 38, it.x + i * 10, it.y - 46 - Math.sin(animT * 6 + i) * 3);
          ctx.stroke();
        }
        break;
      case 'heart':
        UI.drawHeart(ctx, it.x, it.y, f.size + Math.sin(animT * 8) * 3);
        break;
    }
    ctx.globalAlpha = 1;
  }

  function drawBackground() {
    // wall with soft stripes
    var wall = ctx.createLinearGradient(0, 0, 0, GROUND);
    wall.addColorStop(0, '#CDEFE3'); wall.addColorStop(1, '#E9F8F0');
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, W, GROUND);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (var x = 0; x < W; x += 80) ctx.fillRect(x, 0, 40, GROUND);
    // clouds drifting (gentle parallax)
    for (var i = 0; i < 4; i++) {
      var cx = ((i * 290 + animT * (10 + i * 4)) % (W + 240)) - 120, cy = 110 + (i % 2) * 70;
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath(); ctx.arc(cx, cy, 26, 0, 7); ctx.arc(cx + 30, cy - 10, 32, 0, 7); ctx.arc(cx + 62, cy, 24, 0, 7); ctx.fill();
    }
    // floor: wood shavings
    ctx.fillStyle = '#F6DDB0';
    ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.fillStyle = '#EBC98E';
    ctx.fillRect(0, GROUND, W, 6);
    for (var s = 0; s < 40; s++) {
      ctx.fillStyle = s % 2 ? '#F0CF98' : '#FCEACB';
      ctx.beginPath(); ctx.ellipse((s * 97) % W, GROUND + 18 + (s * 37) % 50, 14, 4, (s % 5) * 0.6, 0, 7); ctx.fill();
    }
  }

  function drawNest() {
    var x = 78, y = GROUND + 6;
    // nest glow when Toffi has food to unload
    if (g && g.units > 0) {
      var a = 0.25 + Math.sin(animT * 5) * 0.15;
      ctx.fillStyle = 'rgba(255,224,102,' + a + ')';
      ctx.beginPath(); ctx.ellipse(x, y - 30, 92, 64, 0, 0, 7); ctx.fill();
    }
    // back of the nest
    ctx.fillStyle = '#C99A5B';
    ctx.beginPath(); ctx.ellipse(x, y - 30, 74, 34, 0, 0, 7); ctx.fill();
    // stored food pile
    var pile = g ? Math.min(30, g.stored) : 0;
    for (var i = 0; i < pile; i++) {
      UI.drawSeed(ctx, x - 40 + (i * 23) % 80, y - 32 - Math.floor(i / 4) * 3 - (i % 3) * 2, 18, i);
    }
    // front of the nest with straw
    ctx.fillStyle = '#E3B76E';
    ctx.beginPath(); ctx.ellipse(x, y - 14, 80, 26, 0, 0, Math.PI); ctx.fill();
    ctx.strokeStyle = '#B98642'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (var s = 0; s < 14; s++) {
      var sx = x - 70 + s * 10;
      ctx.beginPath(); ctx.moveTo(sx, y - 18 + (s % 3) * 4); ctx.quadraticCurveTo(sx + 8, y - 30, sx + 16, y - 14 + (s % 2) * 6); ctx.stroke();
    }
    // sign
    ctx.fillStyle = '#A9744F';
    ctx.fillRect(x - 4, y - 150, 8, 90);
    ctx.fillStyle = '#FFE7C2';
    UI.roundRect(ctx, x - 64, y - 172, 128, 40, 14); ctx.fill();
    ctx.strokeStyle = '#A9744F'; ctx.lineWidth = 3; ctx.stroke();
    UI.text(ctx, 'Gniazdko', x, y - 151, { size: 22, color: '#7A4A2E', align: 'center' });
  }

  function drawNestArrow() {
    if (!g || fill() < 0.6 || g.x < NEST_X + 40) return;
    var ax = 200 + Math.sin(animT * 8) * 10, ay = GROUND - 210;
    ctx.fillStyle = '#FF8FAB';
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(ax - 40, ay); ctx.lineTo(ax, ay - 28); ctx.lineTo(ax, ay - 12); ctx.lineTo(ax + 40, ay - 12);
    ctx.lineTo(ax + 40, ay + 12); ctx.lineTo(ax, ay + 12); ctx.lineTo(ax, ay + 28); ctx.closePath();
    ctx.fill(); ctx.stroke();
  }

  function drawHUD() {
    UI.drawHearts(ctx, 106, 42, g.lives, Math.max(CONFIG.lives, g.lives), 34);
    // cheek meter
    var mx = W / 2 - 150, my = 14;
    ctx.fillStyle = 'rgba(255,250,242,0.95)';
    UI.roundRect(ctx, mx, my, 300, 60, 30); ctx.fill();
    UI.text(ctx, 'Policzki', mx + 18, my + 30, { size: 22, color: '#E07B1F' });
    var cap = CONFIG.cheekCapacity;
    for (var i = 0; i < cap; i++) {
      var on = i < g.units;
      ctx.fillStyle = on ? (g.units >= cap ? '#FF8FAB' : '#FFC24B') : '#EFE2D0';
      ctx.beginPath(); ctx.arc(mx + 122 + i * 16.5, my + 30, 7.5, 0, 7); ctx.fill();
    }
    // score
    ctx.fillStyle = 'rgba(255,250,242,0.95)';
    UI.roundRect(ctx, W / 2 + 162, 14, 170, 60, 30); ctx.fill();
    UI.text(ctx, String(g.score), W / 2 + 247, 37, { size: 30, color: '#5B3A29', align: 'center' });
    UI.text(ctx, 'Rekord: ' + best, W / 2 + 247, 61, { size: 15, color: '#A07A5E', align: 'center', weight: 700 });
  }

  function render() {
    stage.begin();
    drawBackground();
    drawNest();
    if (!g) {
      Toffi.draw(ctx, 480, GROUND, TOFFI_SIZE, { anim: 'idle', t: animT });
      return;
    }
    g.items.forEach(drawItem);

    var f = fill();
    var anim = 'idle';
    if (g.hurtT > 0) anim = 'hurt';
    else if (g.unloadT > 0) anim = 'wiggle';
    else if (g.eatT > 0) anim = 'eat';
    else if (Math.abs(g.vx) > 5) anim = 'run';
    var blink = g.invuln > 0 && Math.floor(g.invuln * 10) % 2 === 0;
    Toffi.draw(ctx, g.x, GROUND, TOFFI_SIZE, {
      anim: anim, t: animT, facing: g.facing,
      cheeks: g.unloadT > 0 ? f * (g.unloadT / 0.6) : f,
      round: f * 0.9,
      alpha: blink ? 0.45 : 1
    });
    drawNestArrow();
    particles.draw(ctx);
    speech.draw(ctx, g.x, GROUND - 98 - f * 14, { size: 24 });
    drawHUD();
  }

  UI.loop(function (dt) {
    animT += dt;
    if (state === 'playing' || state === 'ending') { update(dt); speech.update(dt); }
    if (state !== 'paused') particles.update(dt);
    render();
  });

  window.__toffiGame = { get state() { return g; }, CONFIG: CONFIG };
  showStart();
})();
