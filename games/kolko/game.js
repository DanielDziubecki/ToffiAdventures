/* =========================================================================
   Gra 4: "Kółko Toffi" – idle / clicker game.

   Click or tap the wheel to make Toffi run and earn "energia". Buy upgrades
   in the shop; each purchase visibly changes the cage. Progress is saved
   automatically (also while away – friends keep running the wheel).
   ========================================================================= */
(function () {
  'use strict';

  var UI = ToffiUI, Sound = ToffiSound;

  // ---------------------------------------------------------------------
  // UPGRADES & BALANCE – tweak costs and effects here
  //   cost of the next level = base * growth ^ level
  // ---------------------------------------------------------------------
  var UPGRADES = [
    { id: 'kolko', name: 'Większe kółko', desc: '+1 energii za klik', max: 5, base: 15, growth: 2.2 },
    { id: 'hamak', name: 'Hamak', desc: 'Odpoczynek: +50% za klik', max: 3, base: 60, growth: 3 },
    { id: 'domek', name: 'Domek', desc: '+1 energii co sekundę', max: 3, base: 100, growth: 3 },
    { id: 'przyjaciel', name: 'Przyjaciel chomik', desc: 'Sam kręci kółkiem: +3 co sekundę', max: 3, base: 200, growth: 3 },
    { id: 'zloto', name: 'Złote ziarenko', desc: 'Podwaja całą energię!', max: 3, base: 1000, growth: 5 }
  ];
  var CONFIG = {
    offlineMaxSeconds: 3600,     // energy earned while away is capped at 1 hour
    bonusSeedEvery: [18, 35],    // seconds between golden bonus seeds
    milestones: [25, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000]
  };

  var stage = UI.createStage();
  var ctx = stage.ctx, W = stage.W, H = stage.H;
  var CAGE_W = 600;            // the cage is drawn on the left, the shop is on the right
  var FLOOR = 472;

  var particles = new UI.Particles();
  var speech = new UI.Speech();
  var animT = 0;

  // ---------------------------------------------------------------------
  // Saved state
  // ---------------------------------------------------------------------
  var save = ToffiStore.get('kolko.save', null) || {};
  var S = {
    energy: save.energy || 0,
    total: save.total || 0,
    levels: save.levels || {},
    milestone: save.milestone || 0,
    lastTime: save.lastTime || Date.now()
  };
  UPGRADES.forEach(function (u) { S.levels[u.id] = S.levels[u.id] || 0; });

  function lvl(id) { return S.levels[id] || 0; }
  function goldMult() { return Math.pow(2, lvl('zloto')); }
  function clickPower() { return (1 + lvl('kolko')) * (1 + 0.5 * lvl('hamak')) * goldMult(); }
  function perSecond() { return (lvl('domek') * 1 + lvl('przyjaciel') * 3) * goldMult(); }
  function cost(u) { return Math.round(u.base * Math.pow(u.growth, lvl(u.id))); }

  function persist() {
    S.lastTime = Date.now();
    ToffiStore.set('kolko.save', S);
  }

  // Energy earned while the game was closed
  var away = Math.min(CONFIG.offlineMaxSeconds, Math.max(0, (Date.now() - S.lastTime) / 1000));
  var offlineGain = Math.floor(away * perSecond());

  function addEnergy(n) {
    S.energy += n;
    S.total += n;
    while (S.milestone < CONFIG.milestones.length && S.total >= CONFIG.milestones[S.milestone]) {
      S.milestone++;
      speech.say(UI.praise() + ' ' + UI.formatNumber(CONFIG.milestones[S.milestone - 1]) + ' energii!', 2);
      Sound.play('star');
    }
  }

  // ---------------------------------------------------------------------
  // Wheel physics
  // ---------------------------------------------------------------------
  var wheel = { angle: 0, omega: 0 };
  var lastClick = -10;
  var runT = 0;              // running animation clock (faster with a faster wheel)
  var frac = 0;              // fractional passive energy
  var bonusSeed = null;
  var bonusTimer = UI.rand(CONFIG.bonusSeedEvery[0], CONFIG.bonusSeedEvery[1]);
  var started = false;

  function wheelRadius() { return 92 + lvl('kolko') * 11; }
  function wheelCenter() { return { x: 300, y: FLOOR - wheelRadius() - 26 }; }

  function clickWheel(px, py) {
    if (!started) return;
    // the golden bonus seed has priority
    if (bonusSeed) {
      var dx = px - bonusSeed.x, dy = py - bonusSeed.y;
      if (dx * dx + dy * dy < 50 * 50) { collectBonus(); return; }
    }
    var gain = clickPower();
    addEnergy(gain);
    wheel.omega = Math.min(14, wheel.omega + 2.6);
    lastClick = animT;
    Sound.play('pop');
    particles.text(px, py - 10, '+' + UI.formatNumber(gain), { color: '#FFE066', size: 30, life: 0.9 });
    particles.burst(px, py, { n: 5, speed: 100, colors: ['#FFE066', '#FFFFFF'] });
    updateShop();
  }

  function collectBonus() {
    var gain = Math.max(10, Math.round(perSecond() * 15 + clickPower() * 10));
    addEnergy(gain);
    Sound.play('golden');
    particles.burst(bonusSeed.x, bonusSeed.y, { n: 26, speed: 220, colors: ['#FFE066', '#FFF6B0', '#FFB347'] });
    particles.text(bonusSeed.x, bonusSeed.y - 20, 'Złoty bonus! +' + UI.formatNumber(gain), { color: '#FFE066', size: 30, life: 1.6 });
    bonusSeed = null;
    bonusTimer = UI.rand(CONFIG.bonusSeedEvery[0], CONFIG.bonusSeedEvery[1]);
    updateShop();
  }

  stage.canvas.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    var p = stage.toLogical(e.clientX, e.clientY);
    if (p.x < CAGE_W) clickWheel(p.x, p.y);
  });
  window.addEventListener('keydown', function (e) {
    if ((e.code === 'Space' || e.key === 'Enter') && started && !e.repeat) {
      e.preventDefault();
      var c = wheelCenter();
      clickWheel(c.x + UI.rand(-40, 40), c.y + UI.rand(-40, 40));
    }
  });

  // ---------------------------------------------------------------------
  // Shop (HTML panel on the right)
  // ---------------------------------------------------------------------
  var BOLT = '<svg class="bolt" viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2 4 14h6l-1 8 9-12h-6z" fill="#FFC93C" stroke="#C98A0E" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  var shop = document.createElement('div');
  shop.className = 'shop';
  shop.innerHTML = '<h2>Sklepik</h2><div class="shop-list"></div><button type="button" class="reset-link">Zacznij od nowa</button>';
  stage.el.appendChild(shop);
  var list = shop.querySelector('.shop-list');
  ['pointerdown', 'touchstart'].forEach(function (ev) {
    shop.addEventListener(ev, function (e) { e.stopPropagation(); }, { passive: true });
  });

  UPGRADES.forEach(function (u) {
    var row = document.createElement('button');
    row.type = 'button';
    row.className = 'shop-item';
    row.dataset.id = u.id;
    var icon = document.createElement('canvas');
    icon.width = 120; icon.height = 120;
    icon.className = 'shop-icon';
    drawShopIcon(icon.getContext('2d'), u.id);
    row.appendChild(icon);
    var info = document.createElement('div');
    info.className = 'shop-info';
    info.innerHTML = '<div class="shop-name">' + u.name + '</div><div class="shop-desc">' + u.desc + '</div>';
    row.appendChild(info);
    var side = document.createElement('div');
    side.className = 'shop-side';
    side.innerHTML = '<span class="shop-cost"></span><span class="shop-dots"></span>';
    row.appendChild(side);
    row.addEventListener('click', function () { buy(u); });
    list.appendChild(row);
  });

  shop.querySelector('.reset-link').addEventListener('click', function () {
    if (window.confirm('Na pewno zacząć od nowa? Cała energia i ulepszenia znikną.')) {
      S = { energy: 0, total: 0, levels: {}, milestone: 0, lastTime: Date.now() };
      UPGRADES.forEach(function (u) { S.levels[u.id] = 0; });
      persist();
      updateShop();
    }
  });

  function updateShop() {
    UPGRADES.forEach(function (u) {
      var row = list.querySelector('[data-id="' + u.id + '"]');
      var l = lvl(u.id), maxed = l >= u.max, c = cost(u);
      var dots = '';
      for (var i = 0; i < u.max; i++) dots += '<i class="' + (i < l ? 'on' : '') + '"></i>';
      row.querySelector('.shop-dots').innerHTML = dots;
      row.querySelector('.shop-cost').innerHTML = maxed ? 'Gotowe!' : BOLT + UI.formatNumber(c);
      row.classList.toggle('maxed', maxed);
      row.classList.toggle('can', !maxed && S.energy >= c);
      row.disabled = false;
    });
  }

  function buy(u) {
    var l = lvl(u.id), c = cost(u);
    if (l >= u.max) { Sound.play('click'); return; }
    if (S.energy < c) {
      Sound.play('nope');
      speech.say('Jeszcze trochę energii!', 1.4);
      return;
    }
    S.energy -= c;
    S.levels[u.id] = l + 1;
    Sound.play('buy');
    var msgs = {
      kolko: 'Większe kółko! Hurra!',
      hamak: lvl('hamak') === 1 ? 'Hamak! Ale wygodnie!' : 'Jeszcze ładniejszy hamak!',
      domek: lvl('domek') === 1 ? 'Mój własny domek!' : 'Domek rośnie!',
      przyjaciel: 'Nowy przyjaciel!',
      zloto: 'Złote ziarenko! Błyszczy!'
    };
    speech.say(msgs[u.id], 1.8);
    particles.burst(300, 260, { n: 30, speed: 260, colors: ['#FFE066', '#FF8FAB', '#7DBEFF', '#FFFFFF'] });
    persist();
    updateShop();
    var allDone = UPGRADES.every(function (x) { return lvl(x.id) >= x.max; });
    if (allDone) {
      setTimeout(function () {
        Sound.play('win');
        UI.showScreen(stage, {
          title: 'Wszystko kupione!',
          toffi: 'wiggle',
          text: 'Toffi ma najpiękniejszą klatkę na świecie! Brawo!<br>Możesz dalej zbierać energię.',
          buttons: [{ label: 'Super!', icon: 'play', onClick: function () { UI.hideScreen(stage); } }]
        });
      }, 800);
    }
  }

  // Little pictures for the shop buttons
  function drawShopIcon(c, id) {
    c.fillStyle = '#FFF4E0';
    c.beginPath(); c.arc(60, 60, 58, 0, 7); c.fill();
    if (id === 'kolko') {
      c.strokeStyle = '#FF8FAB'; c.lineWidth = 10;
      c.beginPath(); c.arc(60, 58, 38, 0, 7); c.stroke();
      c.lineWidth = 4; c.strokeStyle = '#F06D90';
      for (var i = 0; i < 8; i++) { var a = i / 8 * Math.PI * 2; c.beginPath(); c.moveTo(60, 58); c.lineTo(60 + Math.cos(a) * 38, 58 + Math.sin(a) * 38); c.stroke(); }
      c.fillStyle = '#5FCFAE'; c.beginPath(); c.moveTo(88, 20); c.lineTo(106, 20); c.lineTo(97, 8); c.closePath(); c.fill();
      c.fillRect(94, 20, 6, 12);
    } else if (id === 'hamak') {
      drawHammock(c, 60, 50, 90, 1);
    } else if (id === 'domek') {
      drawHouse(c, 60, 98, 0.9, 1);
    } else if (id === 'przyjaciel') {
      Toffi.draw(c, 60, 100, 76, { anim: 'idle', palette: 'grey', t: 1 });
    } else if (id === 'zloto') {
      UI.drawSeed(c, 60, 60, 66, 0.3, true);
      UI.drawStar(c, 92, 26, 10, '#FFE066');
      UI.drawStar(c, 28, 90, 7, '#FFE066');
    }
  }

  // ---------------------------------------------------------------------
  // Cage drawing
  // ---------------------------------------------------------------------
  function drawHammock(c, x, y, w, level) {
    var colors = ['#7DBEFF', '#FF8FAB', '#B49CFF'];
    var col = colors[Math.max(0, level - 1) % 3];
    c.strokeStyle = '#A9744F'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(x - w / 2, y - 26); c.lineTo(x - w / 2 + 12, y); c.moveTo(x + w / 2, y - 26); c.lineTo(x + w / 2 - 12, y); c.stroke();
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(x - w / 2 + 8, y);
    c.quadraticCurveTo(x, y + 46, x + w / 2 - 8, y);
    c.quadraticCurveTo(x, y + 22, x - w / 2 + 8, y);
    c.fill();
    if (level >= 2) {
      c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(x - w / 3, y + 10); c.quadraticCurveTo(x, y + 36, x + w / 3, y + 10); c.stroke();
    }
    if (level >= 3) {
      UI.drawStar(c, x - w / 4, y + 18, 6, '#FFE066');
      UI.drawStar(c, x + w / 4, y + 18, 6, '#FFE066');
    }
  }

  function drawHouse(c, x, y, s, level) {
    c.save();
    c.translate(x, y); c.scale(s, s);
    var wdt = 90 + (level - 1) * 20, hgt = 56 + (level - 1) * 26;
    c.fillStyle = '#FFE0B0';
    UI.roundRect(c, -wdt / 2, -hgt, wdt, hgt, 10); c.fill();
    c.strokeStyle = '#C98B5A'; c.lineWidth = 3; c.stroke();
    // door
    c.fillStyle = '#8A5A3B';
    c.beginPath(); c.arc(0, -22, 18, Math.PI, 0); c.lineTo(18, 0); c.lineTo(-18, 0); c.closePath(); c.fill();
    // roof
    c.fillStyle = '#FF8FAB';
    c.beginPath(); c.moveTo(-wdt / 2 - 12, -hgt + 4); c.lineTo(0, -hgt - 44 - level * 4); c.lineTo(wdt / 2 + 12, -hgt + 4); c.closePath(); c.fill();
    c.strokeStyle = '#E0607E'; c.stroke();
    if (level >= 2) {
      c.fillStyle = '#BEE6FF';
      c.beginPath(); c.arc(-wdt / 4 - 4, -hgt + 26, 11, 0, 7); c.fill();
      c.beginPath(); c.arc(wdt / 4 + 4, -hgt + 26, 11, 0, 7); c.fill();
      c.fillStyle = '#C98B5A'; c.fillRect(wdt / 4 - 4, -hgt - 34, 12, 22);
    }
    if (level >= 3) {
      c.strokeStyle = '#7A4A2E'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(0, -hgt - 56); c.lineTo(0, -hgt - 82); c.stroke();
      c.fillStyle = '#5FCFAE';
      c.beginPath(); c.moveTo(0, -hgt - 82); c.lineTo(24, -hgt - 75); c.lineTo(0, -hgt - 68); c.closePath(); c.fill();
      UI.drawHeart(c, 0, -hgt + 2 - 14, 18);
    }
    c.restore();
  }

  function drawWheel() {
    var r = wheelRadius(), c = wheelCenter();
    var colors = ['#FF8FAB', '#7DBEFF', '#5FCFAE', '#B49CFF', '#FFB347', '#FFC93C'];
    var col = colors[lvl('kolko') % colors.length];
    // stand
    ctx.fillStyle = '#9A86D8';
    ctx.beginPath();
    ctx.moveTo(c.x - 12, c.y); ctx.lineTo(c.x - 50, FLOOR); ctx.lineTo(c.x - 30, FLOOR); ctx.lineTo(c.x, c.y + 10);
    ctx.lineTo(c.x + 30, FLOOR); ctx.lineTo(c.x + 50, FLOOR); ctx.lineTo(c.x + 12, c.y); ctx.closePath(); ctx.fill();
    // back rim
    ctx.strokeStyle = col; ctx.globalAlpha = 0.45; ctx.lineWidth = 10;
    ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, 7); ctx.stroke();
    ctx.globalAlpha = 1;
    // spokes and hub (behind Toffi)
    ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.globalAlpha = 0.75;
    for (var sp = 0; sp < 6; sp++) {
      var sa = wheel.angle + sp / 6 * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(c.x + Math.cos(sa) * r, c.y + Math.sin(sa) * r); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#FFD45C';
    ctx.beginPath(); ctx.arc(c.x, c.y, 13, 0, 7); ctx.fill();
    ctx.strokeStyle = '#E0A12A'; ctx.lineWidth = 3; ctx.stroke();
    // rungs
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 3;
    var n = 22;
    for (var i = 0; i < n; i++) {
      var a = wheel.angle + i / n * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(c.x + Math.cos(a) * (r - 8), c.y + Math.sin(a) * (r - 8)); ctx.lineTo(c.x + Math.cos(a) * (r + 4), c.y + Math.sin(a) * (r + 4)); ctx.stroke();
    }
  }

  function drawWheelFront() {
    var r = wheelRadius(), c = wheelCenter();
    var colors = ['#FF8FAB', '#7DBEFF', '#5FCFAE', '#B49CFF', '#FFB347', '#FFC93C'];
    var col = colors[lvl('kolko') % colors.length];
    ctx.strokeStyle = col; ctx.lineWidth = 12;
    ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, 7); ctx.stroke();
    // speed lines when fast (spokes are drawn behind Toffi in drawWheel)
    if (wheel.omega > 4) {
      ctx.strokeStyle = 'rgba(255,255,255,' + Math.min(0.8, (wheel.omega - 4) / 8) + ')';
      ctx.lineWidth = 4; ctx.lineCap = 'round';
      for (var k = 0; k < 3; k++) {
        var y = c.y - 30 + k * 30;
        ctx.beginPath(); ctx.moveTo(c.x - r - 20 - k * 6, y); ctx.lineTo(c.x - r - 50 - k * 6, y); ctx.stroke();
      }
    }
  }

  function drawCage() {
    // wall
    var wall = ctx.createLinearGradient(0, 0, 0, FLOOR);
    wall.addColorStop(0, '#E7DDFF'); wall.addColorStop(1, '#F6F0FF');
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, W, FLOOR);
    // wallpaper hearts
    for (var y = 110; y < FLOOR - 40; y += 90) {
      for (var x = 40 + (y / 90 % 2) * 45; x < CAGE_W; x += 90) UI.drawHeart(ctx, x, y, 14, 'rgba(255,143,171,0.18)', 'rgba(0,0,0,0)');
    }
    // floor with wood shavings
    ctx.fillStyle = '#F6DDB0';
    ctx.fillRect(0, FLOOR, W, H - FLOOR);
    ctx.fillStyle = '#EBC98E';
    ctx.fillRect(0, FLOOR, W, 5);
    for (var s = 0; s < 30; s++) {
      ctx.fillStyle = s % 2 ? '#F0CF98' : '#FCEACB';
      ctx.beginPath(); ctx.ellipse((s * 83) % CAGE_W, FLOOR + 16 + (s * 29) % 46, 13, 4, (s % 5) * 0.6, 0, 7); ctx.fill();
    }
    // water bottle on the wall
    ctx.fillStyle = 'rgba(160,210,255,0.8)';
    UI.roundRect(ctx, 548, 120, 34, 90, 14); ctx.fill();
    ctx.fillStyle = '#9A86D8'; ctx.fillRect(560, 210, 10, 30);
    // food bowl
    ctx.fillStyle = '#FF8FAB';
    ctx.beginPath(); ctx.ellipse(110, FLOOR + 4, 46, 14, 0, 0, Math.PI); ctx.fill();
    ctx.fillRect(64, FLOOR - 12, 92, 16);
    ctx.fillStyle = '#FFE0B0';
    ctx.beginPath(); ctx.ellipse(110, FLOOR - 12, 46, 9, 0, 0, 7); ctx.fill();
    for (var i = 0; i < 5; i++) UI.drawSeed(ctx, 82 + i * 14, FLOOR - 16, 12, 1.4 + i);
  }

  function drawBars() {
    // cage bars along the top and the separator to the shop
    ctx.fillStyle = '#C9B7EE';
    ctx.fillRect(0, 0, CAGE_W, 8);
    ctx.strokeStyle = 'rgba(155,135,210,0.55)'; ctx.lineWidth = 4;
    for (var x = 20; x < CAGE_W; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 8); ctx.lineTo(x, 26); ctx.stroke();
    }
  }

  function render() {
    stage.begin();
    drawCage();

    // Hammock (top-left) with a friend sleeping in it if there are 2+ friends
    if (lvl('hamak') > 0) {
      drawHammock(ctx, 110, 150, 150, lvl('hamak'));
      if (lvl('przyjaciel') >= 2) Toffi.draw(ctx, 110, 186, 52, { anim: 'sleep', palette: 'snow', t: animT, shadow: false });
    }
    // House (right)
    if (lvl('domek') > 0) drawHouse(ctx, 490, FLOOR + 2, 1, lvl('domek'));
    // Golden seed on a cushion
    if (lvl('zloto') > 0) {
      ctx.fillStyle = '#B49CFF';
      ctx.beginPath(); ctx.ellipse(196, FLOOR - 4, 34, 12, 0, 0, 7); ctx.fill();
      var glow = ctx.createRadialGradient(196, FLOOR - 34, 4, 196, FLOOR - 34, 46);
      glow.addColorStop(0, 'rgba(255,230,120,0.8)'); glow.addColorStop(1, 'rgba(255,230,120,0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(196, FLOOR - 34, 46, 0, 7); ctx.fill();
      for (var gs = 0; gs < lvl('zloto'); gs++) UI.drawSeed(ctx, 180 + gs * 16, FLOOR - 32 + Math.sin(animT * 2 + gs) * 3, 34, -0.3 + gs * 0.3, true);
    }

    drawWheel();

    // Who runs the wheel: Toffi when you click (or no friends yet), otherwise a friend
    var friends = lvl('przyjaciel');
    var toffiRuns = animT - lastClick < 1.6 || friends === 0;
    var r = wheelRadius(), c = wheelCenter();
    var runner = toffiRuns ? 'toffi' : 'grey';
    var fast = wheel.omega > 0.6;
    Toffi.draw(ctx, c.x, c.y + r - 8, 80, { anim: fast ? 'run' : 'idle', t: fast ? runT : animT, palette: runner, shadow: false });
    if (!toffiRuns) {
      // Toffi rests by the food bowl
      Toffi.draw(ctx, 110, FLOOR + 2, 80, { anim: 'eat', t: animT, cheeks: 0.6 });
    }
    // extra friends
    if (friends >= 3) Toffi.draw(ctx, 420, FLOOR + 2, 66, { anim: 'wave', palette: 'choco', t: animT + 1, facing: -1 });
    drawWheelFront();

    // golden bonus seed
    if (bonusSeed) {
      var bs = bonusSeed;
      var gl = ctx.createRadialGradient(bs.x, bs.y, 3, bs.x, bs.y, 44);
      gl.addColorStop(0, 'rgba(255,230,120,0.9)'); gl.addColorStop(1, 'rgba(255,230,120,0)');
      ctx.fillStyle = gl;
      ctx.beginPath(); ctx.arc(bs.x, bs.y, 44, 0, 7); ctx.fill();
      UI.drawSeed(ctx, bs.x, bs.y + Math.sin(animT * 4) * 5, 40, Math.sin(animT * 3) * 0.4, true);
    }

    drawBars();
    particles.draw(ctx);
    speech.draw(ctx, c.x, c.y - r - 14, { size: 24, maxX: CAGE_W });

    // energy counter
    ctx.fillStyle = 'rgba(255,250,242,0.95)';
    UI.roundRect(ctx, 150, 12, 300, 64, 32); ctx.fill();
    drawBolt(186, 44, 1.3);
    UI.text(ctx, UI.formatNumber(S.energy), 212, 38, { size: 34, color: '#5B3A29' });
    UI.text(ctx, 'energii' + (perSecond() > 0 ? '  •  +' + UI.formatNumber(perSecond()) + ' na sekundę' : ''), 212, 63, { size: 15, color: '#8A6FE0', weight: 700 });
  }

  function drawBolt(x, y, s) {
    ctx.save();
    ctx.translate(x - 12 * s, y - 12 * s); ctx.scale(s, s);
    ctx.beginPath();
    ctx.moveTo(13, 2); ctx.lineTo(4, 14); ctx.lineTo(10, 14); ctx.lineTo(9, 22); ctx.lineTo(18, 10); ctx.lineTo(12, 10); ctx.closePath();
    ctx.fillStyle = '#FFC93C'; ctx.fill();
    ctx.strokeStyle = '#C98A0E'; ctx.lineWidth = 1.6; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.restore();
  }

  // ---------------------------------------------------------------------
  // Main loop
  // ---------------------------------------------------------------------
  var saveTimer = 0, shopTimer = 0;
  UI.loop(function (dt) {
    animT += dt;
    if (started) {
      // friends keep the wheel turning when nobody clicks
      var friends = lvl('przyjaciel');
      if (friends > 0 && animT - lastClick > 1.6) wheel.omega += ((2.5 + friends) - wheel.omega) * Math.min(1, dt * 2);
      else wheel.omega *= Math.exp(-dt * 0.9);
      wheel.angle += wheel.omega * dt;
      runT += dt * (0.4 + wheel.omega / 7);

      // passive energy
      frac += perSecond() * dt;
      if (frac >= 1) { var whole = Math.floor(frac); frac -= whole; addEnergy(whole); }

      // golden bonus seed appears now and then
      if (!bonusSeed) {
        bonusTimer -= dt;
        if (bonusTimer <= 0) { bonusSeed = { x: UI.rand(80, 520), y: UI.rand(120, 300), life: 8 }; Sound.play('seed'); }
      } else {
        bonusSeed.life -= dt;
        if (bonusSeed.life <= 0) { bonusSeed = null; bonusTimer = UI.rand(CONFIG.bonusSeedEvery[0], CONFIG.bonusSeedEvery[1]); }
      }

      saveTimer += dt; shopTimer += dt;
      if (saveTimer > 3) { saveTimer = 0; persist(); }
      if (shopTimer > 0.25) { shopTimer = 0; updateShop(); }
    }
    speech.update(dt);
    particles.update(dt);
    render();
  });

  window.addEventListener('pagehide', persist);
  UI.onHidden(persist);

  // ---------------------------------------------------------------------
  // Start screen
  // ---------------------------------------------------------------------
  UI.createTopBar(stage, {});

  function start() {
    UI.hideScreen(stage);
    started = true;
    if (offlineGain > 0) {
      addEnergy(offlineGain);
      speech.say('Przyjaciele zebrali ' + UI.formatNumber(offlineGain) + ' energii!', 3);
      offlineGain = 0;
    } else {
      speech.say('Kliknij kółko!', 2);
    }
    persist();
    updateShop();
  }

  updateShop();
  var welcome = S.total > 0;
  UI.showScreen(stage, {
    title: 'Kółko Toffi',
    toffi: 'run',
    text: welcome ?
      'Witaj z powrotem!' + (offlineGain > 0 ? '<br>Gdy cię nie było, przyjaciele zebrali <b>' + UI.formatNumber(offlineGain) + '</b> energii!' : '') :
      'Klikaj <b>kółko</b>, a Toffi będzie biegać i zbierać <b>energię</b>.<br>Za energię kupisz w sklepiku piękne rzeczy do klatki!',
    controls: [
      { mouse: true, tap: true, keys: ['Spacja'], label: 'Kręć kółkiem' }
    ],
    buttons: [{ label: welcome ? 'Graj dalej' : 'Graj!', icon: 'play', onClick: start }]
  });

  window.__toffiGame = { get state() { return S; }, addEnergy: function (n) { addEnergy(n); updateShop(); }, UPGRADES: UPGRADES };
})();
