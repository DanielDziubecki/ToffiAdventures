/* =========================================================================
   Gra 1: "Wyścig po ziarenka" – endless runner in a night-time kitchen.

   Jump over spoons, cups and crumbs, collect sunflower seeds. A golden seed
   gives a short seed magnet. Sometimes the cat wakes up – Toffi must hide
   in a paper tube until the cat falls asleep again.
   ========================================================================= */
(function () {
  'use strict';

  var UI = ToffiUI, Sound = ToffiSound;

  // ---------------------------------------------------------------------
  // DIFFICULTY – tweak these numbers to make the game easier or harder
  // ---------------------------------------------------------------------
  var CONFIG = {
    lives: 3,               // hearts at the start
    startSpeed: 250,        // running speed at the start (pixels / second)
    maxSpeed: 500,          // the speed never goes above this
    speedUp: 3,             // how much faster every second
    gravity: 2100,          // higher = falls faster
    jumpPower: 800,         // higher = jumps higher
    doubleJump: true,       // allow a second jump in the air
    obstacleEvery: [1.6, 2.7], // seconds between obstacles (random in range)
    hitboxForgiveness: 0.65,   // 1 = exact obstacle size, smaller = more forgiving
    invulnerableTime: 1.8,  // seconds of safety after a bump
    magnetTime: 5,          // seconds the golden seed magnet lasts
    magnetRadius: 280,      // how far the magnet reaches
    goldenChance: 0.12,     // chance that a seed group contains a golden seed
    catEvery: [20, 30],     // seconds between cat wake-ups
    catLookTime: 2.4,       // how long the cat looks around
    hideBonus: 5            // seeds for hiding well
  };

  var stage = UI.createStage();
  var ctx = stage.ctx, W = stage.W, H = stage.H;
  var GROUND = 452;          // y of the kitchen counter surface
  var TOFFI_X = 200;
  var TOFFI_SIZE = 82;

  var particles = new UI.Particles();
  var speech = new UI.Speech();
  var catSpeech = new UI.Speech();
  var state = 'start';       // start | playing | paused | over
  var best = ToffiStore.get('wyscig.best', 0);
  var animT = 0;             // always-running animation clock
  var g = null;              // current game state (see newGame)

  // ---------------------------------------------------------------------
  // Game state
  // ---------------------------------------------------------------------
  function newGame() {
    g = {
      speed: CONFIG.startSpeed,
      baseSpeed: CONFIG.startSpeed,
      scroll: 0,
      seeds: 0,
      lives: CONFIG.lives,
      elapsed: 0,
      toffi: { y: GROUND, vy: 0, onGround: true, jumps: 0, hurt: 0, invuln: 0, buffer: 0, coyote: 0, inTube: false },
      obstacles: [],
      seedList: [],
      spawnT: 1.8,
      magnet: 0,
      cat: { mode: 'sleep', timer: UI.rand(CONFIG.catEvery[0], CONFIG.catEvery[1]), t: 0 },
      tube: null,
      banner: null,
      nextPraise: 10
    };
  }

  // ---------------------------------------------------------------------
  // Spawning obstacles and seeds
  // ---------------------------------------------------------------------
  var OBSTACLES = {
    spoon: { w: 96, h: 20 },
    cup:   { w: 56, h: 56 },
    crumb: { w: 46, h: 26 }
  };

  function spawnObstacle() {
    var types = ['spoon', 'cup', 'crumb'];
    var type = UI.pick(types);
    var x = W + 60;
    g.obstacles.push({ type: type, x: x, w: OBSTACLES[type].w, h: OBSTACLES[type].h });

    // Seeds in an arc over the obstacle (follow the jump) – half of the time
    if (Math.random() < 0.55) {
      var cx = x + OBSTACLES[type].w / 2;
      addSeedGroup([-80, -40, 0, 40, 80].map(function (dx) {
        return { x: cx + dx, y: GROUND - 70 - 95 * Math.cos(dx / 80 * Math.PI / 2) };
      }));
    }
    // Seeds on the ground between this obstacle and the next one
    var next = UI.rand(CONFIG.obstacleEvery[0], CONFIG.obstacleEvery[1]);
    g.spawnT = next;
    var gapX = x + OBSTACLES[type].w + g.speed * next / 2;
    if (Math.random() < 0.8) {
      var high = Math.random() < 0.3;
      addSeedGroup([-60, -20, 20, 60].map(function (dx) {
        return { x: gapX + dx, y: high ? GROUND - 170 : GROUND - 34 };
      }));
    }
  }

  function addSeedGroup(points) {
    var goldenIdx = (g.magnet <= 0 && Math.random() < CONFIG.goldenChance) ? Math.floor(Math.random() * points.length) : -1;
    points.forEach(function (p, i) {
      g.seedList.push({ x: p.x, y: p.y, golden: i === goldenIdx, rot: Math.random() * 6, phase: Math.random() * 6 });
    });
  }

  // ---------------------------------------------------------------------
  // Input
  // ---------------------------------------------------------------------
  function pressJump() {
    if (state !== 'playing' || !g) return;
    g.toffi.buffer = 0.14;   // jump buffering makes timing forgiving
  }

  window.addEventListener('keydown', function (e) {
    if (e.code === 'Space' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      e.preventDefault();
      if (!e.repeat) pressJump();
    } else if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
      togglePause();
    }
  });
  stage.canvas.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    pressJump();
  });

  // ---------------------------------------------------------------------
  // Screens
  // ---------------------------------------------------------------------
  var topbar = UI.createTopBar(stage, { onPause: togglePause });

  function showStart() {
    state = 'start';
    UI.showScreen(stage, {
      title: 'Wyścig po ziarenka',
      toffi: 'run',
      text: 'Nocą w kuchni leżą ziarenka! Skacz nad <b>łyżkami</b>, <b>kubkami</b> i <b>okruszkami</b>.<br>' +
        'Złote ziarenko to magnes. Gdy <b>kot się budzi</b>, wbiegnij do rurki!',
      controls: [
        { keys: ['↑', 'Spacja'], tap: true, label: 'Skok' },
        { html: seedIconHTML(), label: 'Zbieraj!' }
      ],
      buttons: [{ label: 'Graj!', icon: 'play', onClick: startGame }]
    });
  }

  function seedIconHTML() {
    // tiny inline drawing of a seed and a golden seed
    var c = document.createElement('canvas');
    c.width = 120; c.height = 60;
    var x = c.getContext('2d');
    UI.drawSeed(x, 30, 30, 34, 0.3, false);
    UI.drawSeed(x, 85, 30, 34, -0.3, true);
    return '<img src="' + c.toDataURL() + '" width="90" height="45" alt="">';
  }

  function startGame() {
    UI.hideScreen(stage);
    newGame();
    state = 'playing';
    speech.say('Biegnę!', 1.2);
  }

  function togglePause() {
    if (state === 'playing') {
      state = 'paused';
      UI.showScreen(stage, {
        title: 'Pauza',
        toffi: 'sleep',
        text: 'Toffi chwilę odpoczywa.',
        buttons: [
          { label: 'Graj dalej', icon: 'play', onClick: resume },
          { label: 'Od nowa', icon: 'restart', color: 'sky', onClick: startGame },
          { label: 'Menu', icon: 'home', color: 'orange', onClick: goMenu }
        ]
      });
    } else if (state === 'paused') {
      resume();
    }
  }
  function resume() { UI.hideScreen(stage); state = 'playing'; }
  function goMenu() { window.location.href = '../../index.html'; }
  UI.onHidden(function () { if (state === 'playing') togglePause(); });

  function gameOver() {
    state = 'over';
    var newBest = g.seeds > best;
    if (newBest) { best = g.seeds; ToffiStore.set('wyscig.best', best); }
    Sound.play(newBest ? 'win' : 'over');
    var word = UI.plural(g.seeds, 'ziarenko', 'ziarenka', 'ziarenek');
    UI.showScreen(stage, {
      title: newBest ? 'Nowy rekord! Brawo!' : 'Spróbuj jeszcze raz!',
      toffi: newBest ? 'wiggle' : 'eat',
      cheeks: 1,
      text: 'Toffi zebrała <b>' + g.seeds + '</b> ' + word + '. Mniam!<br>Rekord: <b>' + best + '</b>',
      buttons: [
        { label: 'Zagraj ponownie', icon: 'restart', onClick: startGame },
        { label: 'Menu', icon: 'home', color: 'orange', onClick: goMenu }
      ]
    });
  }

  // ---------------------------------------------------------------------
  // Update
  // ---------------------------------------------------------------------
  function hit() {
    var t = g.toffi;
    if (t.invuln > 0) return;
    g.lives--;
    t.hurt = 0.5;
    t.invuln = CONFIG.invulnerableTime;
    Sound.play('bump');
    speech.say(UI.pick(['Ojej!', 'Ups!', 'Auć!']), 1);
    particles.burst(TOFFI_X, t.y - 40, { colors: ['#FFFFFF', '#FFD1DC'], n: 10, shape: 'circle', speed: 140 });
    if (g.lives <= 0) {
      setTimeout(gameOver, 600);
      state = 'ending';
    }
  }

  function collectSeed(s) {
    s.dead = true;
    if (s.golden) {
      g.magnet = CONFIG.magnetTime;
      g.seeds += 3;
      Sound.play('golden');
      speech.say('Magnes na ziarenka!', 1.6);
      particles.burst(s.x, s.y, { n: 24, colors: ['#FFE066', '#FFF6B0', '#FFB347'], speed: 220 });
      particles.text(s.x, s.y - 20, '+3', { color: '#FFE066' });
    } else {
      g.seeds += 1;
      Sound.play('seed');
      particles.burst(s.x, s.y, { n: 8, speed: 120 });
    }
    if (g.seeds >= g.nextPraise) {
      g.nextPraise += 10;
      speech.say(UI.pick(['Mniam!', 'Brawo!', 'Super!', 'Pycha!']), 1.2);
    }
  }

  function updateCat(dt) {
    var cat = g.cat, t = g.toffi;
    cat.t += dt;
    if (cat.mode === 'sleep') {
      cat.timer -= dt;
      if (cat.timer <= 0) {
        // The cat wakes up: show a warning and send a tube
        cat.mode = 'waking'; cat.t = 0;
        g.banner = { text: 'Kot się budzi!', t: 0 };
        Sound.play('meow');
        catSpeech.say('Mrrr...', 1.5);
        var lastX = g.obstacles.reduce(function (m, o) { return Math.max(m, o.x + o.w); }, 0);
        g.tube = { x: Math.max(W + 120, lastX + 360), w: 230, h: 92, entered: false };
        // no seeds inside the tube area
        g.seedList = g.seedList.filter(function (s) { return s.x < g.tube.x - 40 || s.x > g.tube.x + g.tube.w + 40; });
      }
    } else if (cat.mode === 'waking') {
      var tube = g.tube;
      if (tube && !tube.entered && t.inTube) {
        tube.entered = true;
        cat.mode = 'look'; cat.t = 0;
        g.baseSpeedBefore = g.baseSpeed;
        Sound.play('whoosh');
        speech.say('Cicho...', 1.4);
        catSpeech.say('Gdzie jest chomik?', 2);
      } else if (tube && tube.x + tube.w < TOFFI_X - 50) {
        // Toffi missed the tube – the cat sees her
        cat.mode = 'spotted'; cat.t = 0;
        Sound.play('meow');
        catSpeech.say('Miau! Widzę cię!', 1.6);
        hit();
      }
    } else if (cat.mode === 'look') {
      if (cat.t > CONFIG.catLookTime) {
        cat.mode = 'sleep'; cat.t = 0;
        cat.timer = UI.rand(CONFIG.catEvery[0], CONFIG.catEvery[1]);
        g.seeds += CONFIG.hideBonus;
        Sound.play('win');
        speech.say('Uff! Kot śpi.', 1.6);
        particles.text(TOFFI_X, GROUND - 120, 'Brawo! +' + CONFIG.hideBonus, { color: '#FFE066', size: 34 });
        catSpeech.say('Zzz...', 1.5);
      }
    } else if (cat.mode === 'spotted') {
      if (cat.t > 1.8) {
        cat.mode = 'sleep'; cat.t = 0;
        cat.timer = UI.rand(CONFIG.catEvery[0], CONFIG.catEvery[1]);
        catSpeech.say('Zzz...', 1.5);
      }
    }
  }

  function update(dt) {
    var t = g.toffi;
    g.elapsed += dt;

    // Speed: grows slowly; stops while hiding from the cat
    g.baseSpeed = Math.min(CONFIG.maxSpeed, g.baseSpeed + CONFIG.speedUp * dt);
    var target = g.cat.mode === 'look' ? 0 : g.baseSpeed;
    g.speed += (target - g.speed) * Math.min(1, dt * 4);
    var dx = g.speed * dt;
    g.scroll += dx;

    // --- Toffi physics ---
    t.buffer -= dt;
    t.coyote = t.onGround ? 0.1 : t.coyote - dt;
    var canHide = g.cat.mode === 'look';
    if (t.buffer > 0 && !canHide && state === 'playing') {
      if (t.onGround || t.coyote > 0) {
        t.vy = -CONFIG.jumpPower; t.onGround = false; t.jumps = 1; t.buffer = 0; t.coyote = 0;
        Sound.play('jump');
        particles.burst(TOFFI_X, GROUND, { n: 6, colors: ['#E8D3B8', '#FFFFFF'], shape: 'circle', speed: 80, gravity: 100 });
      } else if (CONFIG.doubleJump && t.jumps < 2) {
        t.vy = -CONFIG.jumpPower * 0.85; t.jumps = 2; t.buffer = 0;
        Sound.play('jump');
        particles.burst(TOFFI_X, t.y, { n: 8, colors: ['#FFFFFF', '#FFE066'], speed: 100 });
      }
    }
    t.vy += CONFIG.gravity * dt;
    t.y += t.vy * dt;
    if (t.y >= GROUND) { t.y = GROUND; t.vy = 0; if (!t.onGround) { t.onGround = true; t.jumps = 0; } }
    t.hurt -= dt;
    t.invuln -= dt;

    // --- Obstacles ---
    var blockSpawns = g.cat.mode !== 'sleep' || g.cat.timer < 2.5;
    g.spawnT -= dt;
    if (g.spawnT <= 0 && !blockSpawns) spawnObstacle();
    else if (g.spawnT <= 0) g.spawnT = 0.5;

    var forgive = CONFIG.hitboxForgiveness;
    g.obstacles.forEach(function (o) {
      o.x -= dx;
      // generous hitbox: shrink the obstacle, and Toffi's box is small too
      var ow = o.w * forgive, oh = o.h * (0.5 + forgive / 2);
      var ox = o.x + (o.w - ow) / 2;
      var tx1 = TOFFI_X - 26, tx2 = TOFFI_X + 26, ty1 = t.y - 56, ty2 = t.y - 4;
      if (state === 'playing' && tx2 > ox && tx1 < ox + ow && ty2 > GROUND - oh) hit();
    });
    g.obstacles = g.obstacles.filter(function (o) { return o.x + o.w > -50; });

    // --- Tube ---
    if (g.tube) {
      g.tube.x -= dx;
      t.inTube = TOFFI_X > g.tube.x + 30 && TOFFI_X < g.tube.x + g.tube.w - 10 && t.y > GROUND - 40;
      if (g.tube.x + g.tube.w < -60) g.tube = null;
    } else {
      t.inTube = false;
    }

    // --- Seeds ---
    g.magnet = Math.max(0, g.magnet - dt);
    var tcx = TOFFI_X, tcy = t.y - 40;
    g.seedList.forEach(function (s) {
      s.x -= dx;
      s.rot += dt * 1.5;
      if (g.magnet > 0) {
        var ddx = tcx - s.x, ddy = tcy - s.y;
        var d = Math.sqrt(ddx * ddx + ddy * ddy);
        if (d < CONFIG.magnetRadius && d > 1) {
          var pull = Math.min(d, 750 * dt);
          s.x += ddx / d * pull; s.y += ddy / d * pull;
        }
      }
      var ex = s.x - tcx, ey = s.y - tcy;
      if (ex * ex + ey * ey < 52 * 52 && state === 'playing') collectSeed(s);
    });
    g.seedList = g.seedList.filter(function (s) { return !s.dead && s.x > -40; });

    updateCat(dt);
    if (g.banner) { g.banner.t += dt; if (g.banner.t > 3) g.banner = null; }
  }

  // ---------------------------------------------------------------------
  // Drawing
  // ---------------------------------------------------------------------
  function wrap(v, m) { return ((v % m) + m) % m; }

  function drawBackground(scroll) {
    // wall
    var wall = ctx.createLinearGradient(0, 0, 0, GROUND);
    wall.addColorStop(0, '#2F2A55');
    wall.addColorStop(1, '#4B3F72');
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, W, GROUND);
    // wallpaper dots
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    var off = wrap(-scroll * 0.2, 60);
    for (var y = 20; y < GROUND; y += 60) {
      for (var x = -60; x < W + 60; x += 60) {
        ctx.beginPath(); ctx.arc(x + off + (y % 120 ? 30 : 0), y, 4, 0, Math.PI * 2); ctx.fill();
      }
    }

    // far layer (slow parallax): windows with moon and stars, then cabinets
    var gap = 620, off2 = wrap(-scroll * 0.25, gap);
    for (var wx = off2 - gap; wx < W + gap; wx += gap) {
      drawWindow(wx + 30, 70);
      drawCabinet(wx + 360, 0);
    }

    // warm lamp glow
    var glow = ctx.createRadialGradient(480, 0, 10, 480, 0, 420);
    glow.addColorStop(0, 'rgba(255,214,140,0.22)');
    glow.addColorStop(1, 'rgba(255,214,140,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, GROUND);

    // backsplash tiles
    ctx.fillStyle = '#5A4C7E';
    ctx.fillRect(0, GROUND - 46, W, 46);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 2;
    var tOff = wrap(-scroll, 46);
    for (var tx = tOff - 46; tx < W; tx += 46) {
      ctx.beginPath(); ctx.moveTo(tx, GROUND - 46); ctx.lineTo(tx, GROUND); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(0, GROUND - 23); ctx.lineTo(W, GROUND - 23); ctx.stroke();
  }

  function drawWindow(x, y) {
    ctx.save();
    ctx.fillStyle = '#E9D8C4';
    UI.roundRect(ctx, x - 10, y - 10, 240, 200, 18); ctx.fill();
    var sky = ctx.createLinearGradient(0, y, 0, y + 180);
    sky.addColorStop(0, '#1C2457'); sky.addColorStop(1, '#3E4C99');
    ctx.fillStyle = sky;
    UI.roundRect(ctx, x, y, 220, 180, 12); ctx.fill();
    ctx.save();
    UI.roundRect(ctx, x, y, 220, 180, 12); ctx.clip();
    for (var i = 0; i < 9; i++) {
      var sx = x + (i * 71) % 210 + 6, sy = y + (i * 47) % 150 + 12;
      var tw = 2 + Math.sin(animT * 3 + i) * 1.2;
      UI.drawStar(ctx, sx, sy, tw + 2, '#FFF6C8');
    }
    ctx.fillStyle = '#FFF6C8';
    ctx.beginPath(); ctx.arc(x + 160, y + 52, 26, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,246,200,0.2)';
    ctx.beginPath(); ctx.arc(x + 160, y + 52, 40, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // window cross
    ctx.fillStyle = '#E9D8C4';
    ctx.fillRect(x + 106, y, 8, 180);
    ctx.fillRect(x, y + 86, 220, 8);
    // curtains
    ctx.fillStyle = '#F2A7BD';
    ctx.beginPath(); ctx.moveTo(x - 18, y - 16); ctx.quadraticCurveTo(x + 30, y + 80, x - 4, y + 200); ctx.lineTo(x - 22, y + 200); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + 238, y - 16); ctx.quadraticCurveTo(x + 190, y + 80, x + 224, y + 200); ctx.lineTo(x + 242, y + 200); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawCabinet(x, y) {
    ctx.fillStyle = '#7B67A6';
    UI.roundRect(ctx, x, y - 20, 170, 130, 12); ctx.fill();
    ctx.fillStyle = '#8D79B8';
    UI.roundRect(ctx, x + 10, y - 10, 70, 110, 8); ctx.fill();
    UI.roundRect(ctx, x + 90, y - 10, 70, 110, 8); ctx.fill();
    ctx.fillStyle = '#FFD45C';
    ctx.beginPath(); ctx.arc(x + 72, y + 70, 5, 0, Math.PI * 2); ctx.arc(x + 98, y + 70, 5, 0, Math.PI * 2); ctx.fill();
    // shelf with jars
    ctx.fillStyle = '#A0815E';
    ctx.fillRect(x - 10, y + 240, 190, 12);
    var jars = ['#FFB5C8', '#B8E6C9', '#FFE29A'];
    for (var i = 0; i < 3; i++) {
      ctx.fillStyle = jars[i];
      UI.roundRect(ctx, x + 10 + i * 56, y + 192, 40, 48, 10); ctx.fill();
      ctx.fillStyle = '#C79B6D';
      ctx.fillRect(x + 12 + i * 56, y + 186, 36, 10);
    }
  }

  function drawCounter(scroll) {
    // counter top
    ctx.fillStyle = '#D7A06D';
    ctx.fillRect(0, GROUND, W, 22);
    ctx.fillStyle = '#E8BA87';
    ctx.fillRect(0, GROUND, W, 5);
    // cabinet doors below
    ctx.fillStyle = '#8E6A9E';
    ctx.fillRect(0, GROUND + 22, W, H - GROUND - 22);
    var dOff = wrap(-scroll, 200);
    for (var x = dOff - 200; x < W + 200; x += 200) {
      ctx.fillStyle = '#A07FB0';
      UI.roundRect(ctx, x + 10, GROUND + 34, 180, H - GROUND - 34, 10); ctx.fill();
      ctx.fillStyle = '#FFD45C';
      UI.roundRect(ctx, x + 80, GROUND + 46, 40, 8, 4); ctx.fill();
    }
  }

  function drawObstacle(o) {
    var x = o.x, y = GROUND;
    ctx.save();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(60,40,50,0.5)';
    if (o.type === 'spoon') {
      var sg = ctx.createLinearGradient(0, y - 20, 0, y);
      sg.addColorStop(0, '#F4F6FA'); sg.addColorStop(1, '#AEB6C6');
      ctx.fillStyle = sg;
      UI.roundRect(ctx, x, y - 12, 62, 10, 5); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(x + 76, y - 11, 22, 11, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath(); ctx.ellipse(x + 70, y - 15, 8, 3, 0, 0, Math.PI * 2); ctx.fill();
    } else if (o.type === 'cup') {
      ctx.fillStyle = '#FF9FB8';
      ctx.beginPath();
      ctx.moveTo(x, y - 56); ctx.lineTo(x + 56, y - 56); ctx.lineTo(x + 50, y - 4);
      ctx.quadraticCurveTo(x + 48, y, x + 44, y); ctx.lineTo(x + 12, y); ctx.quadraticCurveTo(x + 8, y, x + 6, y - 4);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + 58, y - 32, 12, -Math.PI / 2, Math.PI / 2); ctx.stroke();
      ctx.lineWidth = 6; ctx.strokeStyle = '#FF9FB8';
      ctx.beginPath(); ctx.arc(x + 58, y - 32, 12, -Math.PI / 2, Math.PI / 2); ctx.stroke();
      ctx.fillStyle = '#FFFFFF';
      UI.drawHeart(ctx, x + 28, y - 30, 22, '#FFFFFF', 'rgba(0,0,0,0)');
      ctx.fillStyle = '#7A4A2E';
      ctx.beginPath(); ctx.ellipse(x + 28, y - 56, 26, 5, 0, 0, Math.PI * 2); ctx.fill();
    } else if (o.type === 'crumb') {
      var cols = ['#E9B872', '#D99B55', '#F2C98B'];
      [[0, 0, 16], [22, -2, 14], [11, -16, 13], [34, 2, 10]].forEach(function (c, i) {
        ctx.fillStyle = cols[i % 3];
        ctx.beginPath(); ctx.ellipse(x + 6 + c[0], y - 10 + c[1], c[2], c[2] * 0.8, i, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      });
      ctx.fillStyle = '#B97A3A';
      ctx.beginPath(); ctx.arc(x + 12, y - 12, 2, 0, 7); ctx.arc(x + 30, y - 8, 2, 0, 7); ctx.arc(x + 18, y - 26, 2, 0, 7); ctx.fill();
    }
    ctx.restore();
  }

  function drawTubeBack(tube) {
    // the dark inside of the tube opening
    var x = tube.x, y = GROUND, h = tube.h;
    ctx.fillStyle = '#6B4A2E';
    ctx.beginPath(); ctx.ellipse(x + 18, y - h / 2, 18, h / 2, 0, 0, Math.PI * 2); ctx.fill();
  }

  function drawTubeFront(tube) {
    var x = tube.x, y = GROUND, h = tube.h, w = tube.w;
    var grad = ctx.createLinearGradient(0, y - h, 0, y);
    grad.addColorStop(0, '#E8C9A0'); grad.addColorStop(0.5, '#D4A673'); grad.addColorStop(1, '#B9874F');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(x + 18, y - h);
    ctx.lineTo(x + w - 18, y - h);
    ctx.ellipse(x + w - 18, y - h / 2, 18, h / 2, 0, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(x + 18, y);
    ctx.ellipse(x + 18, y - h / 2, 18, h / 2, 0, Math.PI / 2, -Math.PI / 2, true);
    ctx.closePath();
    ctx.fill();
    // spiral lines of a paper tube
    ctx.strokeStyle = 'rgba(140,90,40,0.35)';
    ctx.lineWidth = 3;
    for (var i = 1; i < 6; i++) {
      var lx = x + i * w / 6;
      ctx.beginPath(); ctx.moveTo(lx - 20, y - h + 2); ctx.lineTo(lx + 20, y - 2); ctx.stroke();
    }
    // opening rims
    ctx.strokeStyle = '#A57846';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(x + 18, y - h / 2, 18, h / 2, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#6B4A2E';
    ctx.beginPath(); ctx.ellipse(x + 18, y - h / 2, 14, h / 2 - 4, 0, Math.PI / 2, -Math.PI / 2); ctx.fill();
  }

  // A cute round cat sleeping on a shelf (fixed on screen)
  function drawCat(mode, t) {
    var x = 790, y = 238;
    ctx.save();
    // shelf + cushion
    ctx.fillStyle = '#A0815E';
    UI.roundRect(ctx, 650, y + 8, 290, 16, 6); ctx.fill();
    ctx.fillStyle = '#F4A7C0';
    ctx.beginPath(); ctx.ellipse(x, y + 2, 120, 18, 0, 0, Math.PI * 2); ctx.fill();

    var awake = mode !== 'sleep';
    var lift = mode === 'waking' ? Math.min(1, t / 1.2) * 10 : (mode === 'look' || mode === 'spotted') ? 14 : 0;
    var breath = Math.sin(animT * 1.8) * 2;
    var fur = '#A9AFC4', dark = '#7E849C';

    // tail
    ctx.strokeStyle = fur; ctx.lineWidth = 16; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + 70, y - 12);
    ctx.quadraticCurveTo(x + 120, y - 10 + Math.sin(animT * 2) * 6, x + 96, y + (awake ? -50 : 0));
    ctx.stroke();
    // body
    ctx.fillStyle = fur;
    ctx.beginPath(); ctx.ellipse(x + 20, y - 26 - breath / 2, 82, 36 + breath / 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = dark; ctx.lineWidth = 6;
    for (var i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.arc(x + 30 + i * 22, y - 50 - breath, 14, 0.3 * Math.PI, 0.8 * Math.PI); ctx.stroke();
    }
    // paws
    ctx.fillStyle = '#F2F2F6';
    ctx.beginPath(); ctx.ellipse(x - 40, y - 4, 16, 9, 0, 0, Math.PI * 2); ctx.ellipse(x - 10, y - 2, 16, 9, 0, 0, Math.PI * 2); ctx.fill();

    // head
    var hx = x - 62, hy = y - 40 - lift;
    ctx.fillStyle = fur;
    ctx.beginPath(); ctx.moveTo(hx - 34, hy - 10); ctx.lineTo(hx - 30, hy - 48); ctx.lineTo(hx - 8, hy - 30); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(hx + 34, hy - 10); ctx.lineTo(hx + 30, hy - 48); ctx.lineTo(hx + 8, hy - 30); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#F7B6C8';
    ctx.beginPath(); ctx.moveTo(hx - 27, hy - 22); ctx.lineTo(hx - 26, hy - 40); ctx.lineTo(hx - 14, hy - 30); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(hx + 27, hy - 22); ctx.lineTo(hx + 26, hy - 40); ctx.lineTo(hx + 14, hy - 30); ctx.closePath(); ctx.fill();
    ctx.fillStyle = fur;
    ctx.beginPath(); ctx.ellipse(hx, hy, 40, 34, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#F2F2F6';
    ctx.beginPath(); ctx.ellipse(hx, hy + 14, 22, 15, 0, 0, Math.PI * 2); ctx.fill();
    // blush
    ctx.fillStyle = 'rgba(255,130,160,0.35)';
    ctx.beginPath(); ctx.ellipse(hx - 24, hy + 8, 8, 5, 0, 0, Math.PI * 2); ctx.ellipse(hx + 24, hy + 8, 8, 5, 0, 0, Math.PI * 2); ctx.fill();

    // eyes
    ctx.strokeStyle = '#3B3350'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
    if (!awake || (mode === 'waking' && t < 0.8)) {
      ctx.beginPath(); ctx.arc(hx - 15, hy - 4, 8, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
      ctx.beginPath(); ctx.arc(hx + 15, hy - 4, 8, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    } else {
      var look = mode === 'spotted' ? -4 : mode === 'look' ? Math.sin(t * 2.5) * 4 : 0;
      var open = mode === 'waking' ? 0.55 : 1;
      [-15, 15].forEach(function (ex) {
        ctx.fillStyle = '#9BE07A';
        ctx.beginPath(); ctx.ellipse(hx + ex, hy - 4, 9, 10 * open, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2B2638';
        ctx.beginPath(); ctx.ellipse(hx + ex + look, hy - 3, 4, 8 * open, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath(); ctx.arc(hx + ex + look + 2, hy - 7 * open, 2.4, 0, Math.PI * 2); ctx.fill();
      });
    }
    // nose + mouth + whiskers
    ctx.fillStyle = '#F07C9C';
    ctx.beginPath(); ctx.moveTo(hx - 5, hy + 6); ctx.lineTo(hx + 5, hy + 6); ctx.lineTo(hx, hy + 11); ctx.closePath(); ctx.fill();
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(hx, hy + 11); ctx.quadraticCurveTo(hx - 5, hy + 17, hx - 9, hy + 13); ctx.moveTo(hx, hy + 11); ctx.quadraticCurveTo(hx + 5, hy + 17, hx + 9, hy + 13); ctx.stroke();
    ctx.strokeStyle = 'rgba(60,50,80,0.5)';
    ctx.beginPath();
    ctx.moveTo(hx - 20, hy + 10); ctx.lineTo(hx - 44, hy + 6); ctx.moveTo(hx - 20, hy + 14); ctx.lineTo(hx - 44, hy + 16);
    ctx.moveTo(hx + 20, hy + 10); ctx.lineTo(hx + 44, hy + 6); ctx.moveTo(hx + 20, hy + 14); ctx.lineTo(hx + 44, hy + 16);
    ctx.stroke();

    // Zzz while sleeping
    if (mode === 'sleep') {
      for (var z = 0; z < 3; z++) {
        var zt = (animT * 0.6 + z / 3) % 1;
        ctx.globalAlpha = 1 - zt;
        UI.text(ctx, 'z', hx + 30 + zt * 40, hy - 40 - zt * 60, { size: 20 + zt * 16, color: '#E9E3FF' });
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    return { x: hx, y: hy - 40 };
  }

  function drawSeeds() {
    g.seedList.forEach(function (s) {
      var bob = Math.sin(animT * 4 + s.phase) * 3;
      if (s.golden) {
        var glow = ctx.createRadialGradient(s.x, s.y + bob, 2, s.x, s.y + bob, 30);
        glow.addColorStop(0, 'rgba(255,230,120,0.8)'); glow.addColorStop(1, 'rgba(255,230,120,0)');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(s.x, s.y + bob, 30, 0, Math.PI * 2); ctx.fill();
        UI.drawSeed(ctx, s.x, s.y + bob, 30, Math.sin(s.rot) * 0.4, true);
      } else {
        UI.drawSeed(ctx, s.x, s.y + bob, 24, Math.sin(s.rot) * 0.4, false);
      }
    });
  }

  function drawToffi() {
    var t = g.toffi;
    var anim = 'run';
    if (t.hurt > 0) anim = 'hurt';
    else if (!t.onGround) anim = t.vy < 0 ? 'jump' : 'fall';
    else if (g.speed < 30) anim = 'idle';
    var blink = t.invuln > 0 && Math.floor(t.invuln * 10) % 2 === 0;
    Toffi.draw(ctx, TOFFI_X, t.y, TOFFI_SIZE, { anim: anim, t: animT, alpha: blink ? 0.4 : 1, shadow: t.onGround });
    if (g.magnet > 0) {
      // magnet aura
      ctx.strokeStyle = 'rgba(255,224,102,' + (0.35 + Math.sin(animT * 10) * 0.15) + ')';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(TOFFI_X, t.y - 40, 56 + Math.sin(animT * 6) * 4, 0, Math.PI * 2); ctx.stroke();
    }
  }

  function drawHUD() {
    // hearts (next to the menu button)
    UI.drawHearts(ctx, 106, 42, g.lives, CONFIG.lives, 34);
    // seed counter
    ctx.fillStyle = 'rgba(255,250,242,0.92)';
    UI.roundRect(ctx, W / 2 - 110, 12, 220, 58, 29); ctx.fill();
    UI.drawSeed(ctx, W / 2 - 70, 41, 30, 0.3);
    UI.text(ctx, String(g.seeds), W / 2 - 44, 43, { size: 40, color: '#5B3A29' });
    UI.text(ctx, 'Rekord: ' + best, W / 2 + 96, 44, { size: 18, color: '#A07A5E', align: 'right', weight: 700 });
    // magnet timer
    if (g.magnet > 0) {
      ctx.fillStyle = 'rgba(255,250,242,0.92)';
      UI.roundRect(ctx, W / 2 - 110, 76, 220, 34, 17); ctx.fill();
      ctx.fillStyle = '#FFD23F';
      UI.roundRect(ctx, W / 2 - 104, 82, 208 * (g.magnet / CONFIG.magnetTime), 22, 11); ctx.fill();
      UI.text(ctx, 'Magnes!', W / 2, 93, { size: 20, color: '#8A5A10', align: 'center' });
    }
  }

  function drawBanner() {
    if (!g.banner) return;
    var b = g.banner;
    var a = Math.min(1, b.t * 4, (3 - b.t) * 3);
    var s = 1 + Math.sin(b.t * 10) * 0.04;
    ctx.save();
    ctx.globalAlpha = Math.max(0, a);
    ctx.translate(W / 2 - 80, 170);
    ctx.scale(s, s);
    ctx.fillStyle = 'rgba(255,250,242,0.95)';
    UI.roundRect(ctx, -230, -42, 460, 84, 42); ctx.fill();
    ctx.strokeStyle = '#FF8FAB'; ctx.lineWidth = 5; ctx.stroke();
    UI.text(ctx, b.text, 0, 2, { size: 46, color: '#E0607E', align: 'center' });
    ctx.restore();
  }

  function drawTubeHint() {
    var tube = g.tube;
    if (!tube || tube.entered || g.cat.mode !== 'waking' || tube.x > W - 20) return;
    var ax = tube.x + 40, ay = GROUND - tube.h - 30 + Math.sin(animT * 8) * 6;
    UI.drawBubble(ctx, ax, ay, 'Wbiegnij tutaj!', { size: 22 });
  }

  function render() {
    stage.begin();
    var scroll = g ? g.scroll : animT * 60;
    drawBackground(scroll);
    var catPos = drawCat(g ? g.cat.mode : 'sleep', g ? g.cat.t : 0);
    drawCounter(scroll);

    if (!g) {
      Toffi.draw(ctx, TOFFI_X, GROUND, TOFFI_SIZE, { anim: 'idle', t: animT });
      return;
    }

    g.obstacles.forEach(drawObstacle);
    if (g.tube) drawTubeBack(g.tube);
    var t = g.toffi;
    if (t.inTube) { drawToffi(); if (g.tube) drawTubeFront(g.tube); }
    else { if (g.tube) drawTubeFront(g.tube); drawToffi(); }
    drawSeeds();
    particles.draw(ctx);

    speech.draw(ctx, TOFFI_X + 10, t.inTube ? GROUND - 100 : t.y - 82);
    catSpeech.draw(ctx, catPos.x, catPos.y, { size: 20 });
    drawTubeHint();
    drawBanner();
    drawHUD();
  }

  // ---------------------------------------------------------------------
  // Main loop
  // ---------------------------------------------------------------------
  UI.loop(function (dt) {
    animT += dt;
    if (state === 'playing' || state === 'ending') {
      update(dt);
      speech.update(dt);
      catSpeech.update(dt);
    }
    if (state !== 'paused') particles.update(dt);
    render();
  });

  // Handy for testing / tweaking from the browser console
  window.__toffiGame = { get state() { return g; }, CONFIG: CONFIG };

  showStart();
})();
