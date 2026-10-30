/* =========================================================================
   Gra 2: "Wielka ucieczka" – top-down puzzle.

   Bring Toffi back to her cage before the owner returns. Push blocks, use
   paper tubes as tunnels and open drawers. 1–3 stars depending on moves.
   Levels are in levels.js, puzzle rules in rules.js.
   ========================================================================= */
(function () {
  'use strict';

  var UI = ToffiUI, Sound = ToffiSound, R = UcieczkaRules;
  var LEVELS = window.UCIECZKA_LEVELS;

  // ---------------------------------------------------------------------
  // DIFFICULTY – tweak these to make the game easier or harder
  // ---------------------------------------------------------------------
  var CONFIG = {
    ownerMoves: function (par) { return par * 2 + 10; },  // moves before the owner is back
    twoStarExtra: function (par) { return Math.max(3, Math.ceil(par * 0.5)); }, // extra moves allowed for 2 stars
    moveTime: 0.13,          // seconds for one step animation
    unlockAll: false         // true = all levels open from the start
  };

  var stage = UI.createStage();
  var ctx = stage.ctx, W = stage.W, H = stage.H;
  var particles = new UI.Particles();
  var speech = new UI.Speech();

  var AREA = { x: 14, y: 86, w: 700, h: 444 };   // where the room is drawn
  var TUBE_COLORS = { 1: '#FF8FAB', 2: '#7DBEFF', 3: '#B49CFF', 4: '#5FCFAE' };

  var progress = ToffiStore.get('ucieczka.progress', null) || { unlocked: 1, stars: [] };
  if (CONFIG.unlockAll) progress.unlocked = LEVELS.length;

  var state = 'menu';    // menu | playing | won | lost
  var levelIdx = 0;
  var P = null;          // parsed level
  var S = null;          // puzzle state
  var history = [];      // for undo
  var cs = 60, ox = 0, oy = 0;   // cell size and room origin
  var animT = 0;
  var facing = 1;
  var anim = null;       // current step animation
  var queued = null;     // one buffered move
  var bump = 0;          // little shake when blocked
  var blockAnim = null;  // pushed block animation
  var drawerAnim = {};   // opening drawers
  var winT = 0;

  // ---------------------------------------------------------------------
  // Level setup
  // ---------------------------------------------------------------------
  function loadLevel(i) {
    levelIdx = i;
    P = R.parse(LEVELS[i]);
    S = R.initialState(P);
    history = [];
    anim = null; queued = null; blockAnim = null; drawerAnim = {};
    facing = 1;
    cs = Math.floor(Math.min(AREA.w / P.w, AREA.h / P.h, 74));
    ox = AREA.x + Math.floor((AREA.w - cs * P.w) / 2);
    oy = AREA.y + Math.floor((AREA.h - cs * P.h) / 2);
    state = 'playing';
    UI.hideScreen(stage);
    speech.say(LEVELS[i].hint, 3.5);
  }

  function par() { return LEVELS[levelIdx].par; }
  function ownerLimit() { return CONFIG.ownerMoves(par()); }
  function starsFor(moves) {
    if (moves <= par()) return 3;
    if (moves <= par() + CONFIG.twoStarExtra(par())) return 2;
    return 1;
  }

  // ---------------------------------------------------------------------
  // Moving
  // ---------------------------------------------------------------------
  function move(dx, dy) {
    if (state !== 'playing') return;
    if (anim) { queued = [dx, dy]; return; }
    if (dx) facing = dx;
    var res = R.tryMove(P, S, dx, dy);
    if (res.event === 'blocked') {
      bump = 0.25;
      Sound.play('nope');
      if (res.push) speech.say('Nie da się pchnąć!', 1.2);
      return;
    }
    history.push(S);
    var from = { x: S.tx, y: S.ty };
    var prev = S;
    S = res.state;

    switch (res.event) {
      case 'move':
        Sound.play('step');
        anim = { type: 'walk', from: from, to: { x: S.tx, y: S.ty }, t: 0, dur: CONFIG.moveTime };
        break;
      case 'push':
        Sound.play('push');
        anim = { type: 'walk', from: from, to: { x: S.tx, y: S.ty }, t: 0, dur: CONFIG.moveTime * 1.3 };
        blockAnim = { i: res.block, from: prev.blocks[res.block], t: 0, dur: CONFIG.moveTime * 1.3 };
        break;
      case 'tube':
        Sound.play('whoosh');
        anim = { type: 'tube', from: from, mid: { x: res.inX, y: res.inY }, to: { x: S.tx, y: S.ty }, t: 0, dur: CONFIG.moveTime * 4 };
        break;
      case 'drawer':
        Sound.play('drawer');
        drawerAnim[res.x + ',' + res.y] = 0;
        anim = { type: 'nudge', from: from, to: from, dx: dx, dy: dy, t: 0, dur: CONFIG.moveTime * 1.5 };
        speech.say('Szuflada otwarta!', 1.2);
        break;
      case 'win':
        anim = { type: 'walk', from: from, to: { x: S.tx, y: S.ty }, t: 0, dur: CONFIG.moveTime, win: true };
        break;
    }
  }

  function finishAnim() {
    var a = anim;
    anim = null;
    if (a.win) { win(); return; }
    if (S.moves >= ownerLimit()) { lose(); return; }
    if (S.moves === ownerLimit() - 5) speech.say('Szybko! Właściciel idzie!', 1.6);
    if (queued) { var q = queued; queued = null; move(q[0], q[1]); }
  }

  function undo() {
    if (state !== 'playing' || !history.length) return;
    S = history.pop();
    anim = null; queued = null; blockAnim = null;
    Sound.play('pop');
  }

  function restart() {
    if (state === 'menu') return;
    loadLevel(levelIdx);
  }

  // ---------------------------------------------------------------------
  // Win / lose / level select screens
  // ---------------------------------------------------------------------
  function win() {
    state = 'won';
    winT = 0;
    var stars = starsFor(S.moves);
    var old = progress.stars[levelIdx] || 0;
    progress.stars[levelIdx] = Math.max(old, stars);
    progress.unlocked = Math.max(progress.unlocked, Math.min(LEVELS.length, levelIdx + 2));
    ToffiStore.set('ucieczka.progress', progress);
    Sound.play('win');
    var cx = ox + (S.tx + 0.5) * cs, cy = oy + (S.ty + 0.5) * cs;
    particles.burst(cx, cy, { n: 30, speed: 240, colors: ['#FFE066', '#FF8FAB', '#7DBEFF', '#FFFFFF'] });
    var last = levelIdx === LEVELS.length - 1;
    setTimeout(function () {
      UI.showScreen(stage, {
        title: last ? 'Wszystkie pokoje! Hurra!' : UI.praise() + ' Toffi w klatce!',
        toffi: 'wiggle',
        stars: stars,
        text: 'Ruchy: <b>' + S.moves + '</b>' + (stars < 3 ? '<br>Na 3 gwiazdki wystarczy ' + par() + ' ' + UI.plural(par(), 'ruch', 'ruchy', 'ruchów') + '.' : ''),
        buttons: (last ? [] : [{ label: 'Dalej', icon: 'next', onClick: function () { loadLevel(levelIdx + 1); } }]).concat([
          { label: 'Jeszcze raz', icon: 'restart', color: 'sky', onClick: restart },
          { label: 'Poziomy', icon: 'list', color: 'orange', onClick: showLevels }
        ])
      });
    }, 900);
  }

  function lose() {
    state = 'lost';
    Sound.play('over');
    UI.showScreen(stage, {
      title: 'Spróbuj jeszcze raz!',
      toffi: 'hurt',
      text: 'Ojej, właściciel wrócił do domu!<br>Spróbuj dojść do klatki w mniej ruchach.',
      buttons: [
        { label: 'Zagraj ponownie', icon: 'restart', onClick: restart },
        { label: 'Menu', icon: 'home', color: 'orange', onClick: function () { location.href = '../../index.html'; } }
      ]
    });
  }

  function showLevels() {
    state = 'menu';
    var html = '<div class="level-grid">';
    LEVELS.forEach(function (lv, i) {
      var locked = i + 1 > progress.unlocked;
      var st = progress.stars[i] || 0;
      html += '<button type="button" class="level-btn' + (locked ? ' locked' : '') + '" data-level="' + i + '"' + (locked ? ' aria-label="Zablokowany"' : '') + '>' +
        (locked ? '<span class="lock">' + UI.ICONS.lock + '</span>' :
          '<span class="num">' + (i + 1) + '</span><span class="lv-stars">' +
          [0, 1, 2].map(function (k) { return '<i class="' + (k < st ? 'on' : '') + '">★</i>'; }).join('') + '</span>') +
        '<span class="lv-name">' + lv.name + '</span></button>';
    });
    html += '</div>';
    var ov = UI.showScreen(stage, {
      title: 'Wielka ucieczka',
      text: 'Toffi uciekła z klatki! Pomóż jej wrócić, zanim wróci właściciel.',
      controls: [
        { keys: ['←', '↑', '↓', '→'], tap: true, label: 'Ruch' },
        { html: '<span class="ctrl-icon">' + UI.ICONS.undo + '</span>', label: 'Cofnij' }
      ],
      html: html,
      cls: 'levels-screen',
      buttons: [{ label: 'Graj!', icon: 'play', onClick: function () { loadLevel(Math.min(progress.unlocked, LEVELS.length) - 1); } }]
    });
    ov.querySelectorAll('.level-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        var i = +b.dataset.level;
        if (i + 1 > progress.unlocked) { Sound.play('nope'); return; }
        Sound.play('click');
        loadLevel(i);
      });
    });
  }

  // ---------------------------------------------------------------------
  // Controls: keyboard, on-screen arrows, swipe / tap on the room
  // ---------------------------------------------------------------------
  var DIRS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] };
  window.addEventListener('keydown', function (e) {
    var d = DIRS[e.key] || DIRS[e.key.toLowerCase && e.key.toLowerCase()];
    if (d) { e.preventDefault(); move(d[0], d[1]); return; }
    if (e.key === 'z' || e.key === 'u' || e.key === 'Backspace') { e.preventDefault(); undo(); }
    if (e.key === 'r' || e.key === 'R') restart();
  });

  // top bar: Menu + levels on the left, undo / restart / mute on the right
  UI.createTopBar(stage, {
    extraLeft: [UI.iconButton(UI.ICONS.list.replace(/#fff/g, '#7A4A2E'), 'Poziomy', showLevels)],
    extra: [UI.iconButton('undo', 'Cofnij', undo), UI.iconButton('reset', 'Od nowa', restart)]
  });

  // On-screen arrow pad (always visible, big buttons)
  function padButton(icon, label, left, top, d) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'touch-btn always pad-btn';
    b.innerHTML = UI.ICONS[icon];
    b.setAttribute('aria-label', label);
    b.style.left = left + 'px'; b.style.top = top + 'px';
    b.addEventListener('pointerdown', function (e) {
      e.preventDefault(); e.stopPropagation();
      b.classList.add('pressed');
      move(d[0], d[1]);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { b.addEventListener(ev, function () { b.classList.remove('pressed'); }); });
    stage.el.appendChild(b);
  }
  var PS = 78, PG = 82, PCX = 836, PCY = 400;
  padButton('up', 'W górę', PCX - PS / 2, PCY - PS / 2 - PG, [0, -1]);
  padButton('down', 'W dół', PCX - PS / 2, PCY - PS / 2 + PG, [0, 1]);
  padButton('left', 'W lewo', PCX - PS / 2 - PG, PCY - PS / 2, [-1, 0]);
  padButton('right', 'W prawo', PCX - PS / 2 + PG, PCY - PS / 2, [1, 0]);

  // Swipe anywhere on the room, or tap next to Toffi
  var down = null;
  stage.canvas.addEventListener('pointerdown', function (e) {
    down = stage.toLogical(e.clientX, e.clientY);
  });
  stage.canvas.addEventListener('pointerup', function (e) {
    if (!down || state !== 'playing') return;
    var up = stage.toLogical(e.clientX, e.clientY);
    var dx = up.x - down.x, dy = up.y - down.y;
    if (Math.abs(dx) < 25 && Math.abs(dy) < 25) {
      // a tap: move towards the tapped spot
      dx = up.x - (ox + (S.tx + 0.5) * cs);
      dy = up.y - (oy + (S.ty + 0.5) * cs);
      if (Math.abs(dx) < cs * 0.5 && Math.abs(dy) < cs * 0.5) { down = null; return; }
    }
    if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 1 : -1, 0);
    else move(0, dy > 0 ? 1 : -1);
    down = null;
  });

  // ---------------------------------------------------------------------
  // Drawing
  // ---------------------------------------------------------------------
  var FLOORS = {
    wood:    { a: '#F1D3A6', b: '#E8C38F', type: 'planks' },
    wood2:   { a: '#E2BE90', b: '#D4AC7B', type: 'planks' },
    carpet:  { a: '#CFE3F7', b: '#BCD6F0', type: 'dots' },
    carpet2: { a: '#F9D6E2', b: '#F2C2D3', type: 'dots' },
    tiles:   { a: '#FFF3DD', b: '#F4DDBB', type: 'check' },
    bath:    { a: '#DDF3F1', b: '#C6E8E5', type: 'check' }
  };

  function drawFloorCell(x, y, f) {
    var px = ox + x * cs, py = oy + y * cs;
    ctx.fillStyle = f.a;
    ctx.fillRect(px, py, cs + 1, cs + 1);
    if (f.type === 'planks') {
      ctx.fillStyle = f.b;
      ctx.fillRect(px, py + cs / 2 - 1, cs, 2);
      ctx.fillRect(px + ((y % 2) ? cs * 0.3 : cs * 0.7), py, 2, cs / 2);
      ctx.fillRect(px + ((y % 2) ? cs * 0.75 : cs * 0.2), py + cs / 2, 2, cs / 2);
    } else if (f.type === 'check') {
      if ((x + y) % 2) { ctx.fillStyle = f.b; ctx.fillRect(px, py, cs, cs); }
    } else {
      ctx.fillStyle = f.b;
      ctx.beginPath(); ctx.arc(px + cs * 0.25, py + cs * 0.25, cs * 0.06, 0, 7); ctx.arc(px + cs * 0.75, py + cs * 0.75, cs * 0.06, 0, 7); ctx.fill();
    }
  }

  function drawWall(x, y) {
    var px = ox + x * cs, py = oy + y * cs;
    var border = x === 0 || y === 0 || x === P.w - 1 || y === P.h - 1;
    if (border) {
      ctx.fillStyle = '#B98F6E';
      ctx.fillRect(px, py, cs + 1, cs + 1);
      ctx.fillStyle = '#CFA684';
      ctx.fillRect(px + 2, py + 2, cs - 4, cs - 8);
      return;
    }
    // inner walls are pieces of furniture
    var kind = (x * 7 + y * 13 + levelIdx) % 4;
    var m = cs * 0.08;
    ctx.fillStyle = 'rgba(80,50,30,0.25)';
    UI.roundRect(ctx, px + m, py + m + 4, cs - 2 * m, cs - 2 * m, cs * 0.18); ctx.fill();
    if (kind === 0) {           // bookshelf
      ctx.fillStyle = '#A9744F';
      UI.roundRect(ctx, px + m, py + m, cs - 2 * m, cs - 2 * m, cs * 0.12); ctx.fill();
      var cols = ['#FF8FAB', '#7DBEFF', '#FFD45C', '#5FCFAE'];
      for (var i = 0; i < 4; i++) {
        ctx.fillStyle = cols[(i + x) % 4];
        ctx.fillRect(px + m * 2 + i * (cs - 4 * m) / 4, py + m * 2, (cs - 4 * m) / 4 - 2, cs - 4 * m);
      }
    } else if (kind === 1) {    // plant in a pot
      ctx.fillStyle = '#E6865A';
      ctx.beginPath(); ctx.arc(px + cs / 2, py + cs / 2, cs * 0.36, 0, 7); ctx.fill();
      ctx.fillStyle = '#6CC56F';
      for (var a = 0; a < 6; a++) {
        ctx.beginPath();
        ctx.ellipse(px + cs / 2 + Math.cos(a) * cs * 0.18, py + cs / 2 + Math.sin(a) * cs * 0.18, cs * 0.16, cs * 0.09, a, 0, 7);
        ctx.fill();
      }
      ctx.fillStyle = '#4FA552';
      ctx.beginPath(); ctx.arc(px + cs / 2, py + cs / 2, cs * 0.1, 0, 7); ctx.fill();
    } else if (kind === 2) {    // toy box
      ctx.fillStyle = '#B49CFF';
      UI.roundRect(ctx, px + m, py + m, cs - 2 * m, cs - 2 * m, cs * 0.16); ctx.fill();
      ctx.fillStyle = '#D2C3FF';
      UI.roundRect(ctx, px + m * 2, py + m * 2, cs - 4 * m, cs * 0.3, cs * 0.1); ctx.fill();
      UI.drawStar(ctx, px + cs / 2, py + cs * 0.62, cs * 0.16, '#FFD45C');
    } else {                    // small table
      ctx.fillStyle = '#C98B5A';
      UI.roundRect(ctx, px + m, py + m, cs - 2 * m, cs - 2 * m, cs * 0.25); ctx.fill();
      ctx.fillStyle = '#DDA574';
      UI.roundRect(ctx, px + m * 2, py + m * 2, cs - 4 * m, cs - 4 * m, cs * 0.2); ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.arc(px + cs / 2, py + cs / 2, cs * 0.14, 0, 7); ctx.fill();
    }
  }

  function drawDrawer(x, y, isOpen, k) {
    var px = ox + x * cs, py = oy + y * cs;
    if (!isOpen) {
      ctx.fillStyle = '#9C6B47';
      UI.roundRect(ctx, px + 2, py + 2, cs - 4, cs - 4, cs * 0.12); ctx.fill();
      ctx.fillStyle = '#C18D62';
      UI.roundRect(ctx, px + cs * 0.12, py + cs * 0.12, cs * 0.76, cs * 0.76, cs * 0.1); ctx.fill();
      ctx.fillStyle = '#FFD45C';
      UI.roundRect(ctx, px + cs * 0.3, py + cs * 0.44, cs * 0.4, cs * 0.12, cs * 0.06); ctx.fill();
      // a hint arrow pulse
      ctx.globalAlpha = 0.35 + Math.sin(animT * 4) * 0.2;
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3;
      UI.roundRect(ctx, px + 4, py + 4, cs - 8, cs - 8, cs * 0.12); ctx.stroke();
      ctx.globalAlpha = 1;
    } else {
      // open drawer seen from above: a wooden box you can walk across
      var s = Math.min(1, k == null ? 1 : k);
      ctx.fillStyle = '#7E5235';
      ctx.fillRect(px, py, cs + 1, cs + 1);
      ctx.fillStyle = '#E0B184';
      UI.roundRect(ctx, px + cs * 0.06, py + cs * 0.06, cs * 0.88, cs * 0.88, cs * 0.08); ctx.fill();
      ctx.fillStyle = '#F3D2A9';
      UI.roundRect(ctx, px + cs * 0.14, py + cs * 0.14, cs * 0.72, cs * 0.72, cs * 0.06); ctx.fill();
      // a sock inside
      ctx.globalAlpha = s;
      ctx.fillStyle = '#FF8FAB';
      ctx.beginPath(); ctx.ellipse(px + cs * 0.4, py + cs * 0.4, cs * 0.14, cs * 0.08, 0.6, 0, 7); ctx.fill();
      ctx.fillStyle = '#7DBEFF';
      ctx.beginPath(); ctx.ellipse(px + cs * 0.64, py + cs * 0.66, cs * 0.12, cs * 0.07, -0.4, 0, 7); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function drawTube(x, y, digit) {
    var cx = ox + (x + 0.5) * cs, cy = oy + (y + 0.5) * cs;
    var r = cs * 0.4;
    ctx.fillStyle = 'rgba(80,50,30,0.2)';
    ctx.beginPath(); ctx.arc(cx, cy + 3, r, 0, 7); ctx.fill();
    ctx.fillStyle = '#D9AE7C';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();
    ctx.lineWidth = cs * 0.08;
    ctx.strokeStyle = TUBE_COLORS[digit] || '#FF8FAB';
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.82, 0, 7); ctx.stroke();
    ctx.fillStyle = '#5A3A22';
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.58, 0, 7); ctx.fill();
    ctx.fillStyle = '#3A2414';
    ctx.beginPath(); ctx.arc(cx, cy + r * 0.1, r * 0.4, 0, 7); ctx.fill();
  }

  function drawTubeLinks() {
    // faint dashed line between tube ends so it's clear they belong together
    ctx.save();
    ctx.setLineDash([6, 10]);
    ctx.lineDashOffset = -animT * 20;
    ctx.lineWidth = 3;
    Object.keys(P.tubes).forEach(function (d) {
      var e = P.tubes[d];
      if (e.length < 2) return;
      ctx.strokeStyle = TUBE_COLORS[d] || '#FF8FAB';
      ctx.globalAlpha = 0.55;
      var x1 = ox + (e[0].x + 0.5) * cs, y1 = oy + (e[0].y + 0.5) * cs;
      var x2 = ox + (e[1].x + 0.5) * cs, y2 = oy + (e[1].y + 0.5) * cs;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo((x1 + x2) / 2, Math.min(y1, y2) - cs * 0.8, x2, y2);
      ctx.stroke();
    });
    ctx.restore();
  }

  function drawCage(x, y) {
    var px = ox + x * cs, py = oy + y * cs;
    var glow = 0.4 + Math.sin(animT * 3) * 0.2;
    ctx.fillStyle = 'rgba(255,220,120,' + glow + ')';
    UI.roundRect(ctx, px - 4, py - 4, cs + 8, cs + 8, cs * 0.25); ctx.fill();
    ctx.fillStyle = '#FFF1C9';
    UI.roundRect(ctx, px + 3, py + 3, cs - 6, cs - 6, cs * 0.2); ctx.fill();
    // wood shavings
    ctx.fillStyle = '#F2D59A';
    for (var i = 0; i < 6; i++) {
      ctx.beginPath(); ctx.ellipse(px + cs * (0.2 + (i * 0.37) % 0.6), py + cs * (0.25 + (i * 0.23) % 0.55), cs * 0.07, cs * 0.03, i, 0, 7); ctx.fill();
    }
    // little house
    ctx.fillStyle = '#FF8FAB';
    UI.roundRect(ctx, px + cs * 0.55, py + cs * 0.15, cs * 0.3, cs * 0.3, cs * 0.06); ctx.fill();
    // bars
    ctx.strokeStyle = '#C48DB8'; ctx.lineWidth = Math.max(2, cs * 0.04);
    UI.roundRect(ctx, px + 3, py + 3, cs - 6, cs - 6, cs * 0.2); ctx.stroke();
    for (var b = 1; b < 5; b++) {
      ctx.beginPath(); ctx.moveTo(px + b * cs / 5, py + 4); ctx.lineTo(px + b * cs / 5, py + cs * 0.12); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px + b * cs / 5, py + cs - 4); ctx.lineTo(px + b * cs / 5, py + cs * 0.88); ctx.stroke();
    }
    UI.drawHeart(ctx, px + cs * 0.3, py + cs * 0.62, cs * 0.3);
  }

  var BLOCK_COLORS = ['#FF8FAB', '#7DBEFF', '#FFD45C', '#5FCFAE', '#B49CFF'];
  function drawBlock(i, bx, by) {
    var px = ox + bx * cs, py = oy + by * cs, m = cs * 0.08;
    var c = BLOCK_COLORS[i % BLOCK_COLORS.length];
    ctx.fillStyle = 'rgba(80,50,30,0.3)';
    UI.roundRect(ctx, px + m, py + m + 5, cs - 2 * m, cs - 2 * m, cs * 0.14); ctx.fill();
    ctx.fillStyle = c;
    UI.roundRect(ctx, px + m, py + m, cs - 2 * m, cs - 2 * m, cs * 0.14); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    UI.roundRect(ctx, px + m * 2, py + m * 2, cs - 4 * m, cs - 4 * m, cs * 0.1); ctx.fill();
    UI.text(ctx, 'ABCDE'[i % 5], px + cs / 2, py + cs / 2 + 2, { size: Math.round(cs * 0.5), color: c, align: 'center', outline: '#FFFFFF', outlineWidth: 4 });
  }

  function easeOut(t) { return 1 - (1 - t) * (1 - t); }

  // Toffi's drawn position, scale and animation for this frame
  function toffiView() {
    var x = S.tx, y = S.ty, scale = 1, a = 'idle';
    if (anim) {
      var k = Math.min(1, anim.t / anim.dur);
      if (anim.type === 'walk') {
        var e = easeOut(k);
        x = anim.from.x + (anim.to.x - anim.from.x) * e;
        y = anim.from.y + (anim.to.y - anim.from.y) * e;
        a = 'run';
      } else if (anim.type === 'nudge') {
        var n = Math.sin(k * Math.PI) * 0.25;
        x = anim.from.x + anim.dx * n; y = anim.from.y + anim.dy * n;
        a = 'jump';
      } else if (anim.type === 'tube') {
        if (k < 0.3) {         // walk into the tube
          var e1 = easeOut(k / 0.3);
          x = anim.from.x + (anim.mid.x - anim.from.x) * e1;
          y = anim.from.y + (anim.mid.y - anim.from.y) * e1;
          a = 'run';
        } else if (k < 0.55) { // shrink into it
          x = anim.mid.x; y = anim.mid.y; scale = 1 - (k - 0.3) / 0.25; a = 'jump';
        } else {               // pop out on the other side
          x = anim.to.x; y = anim.to.y; scale = Math.min(1, (k - 0.55) / 0.3); a = 'wiggle';
        }
      }
    }
    if (state === 'won') a = 'wiggle';
    else if (state === 'lost') a = 'hurt';
    else if (bump > 0) a = 'hurt';
    return { x: x, y: y, scale: scale, anim: a };
  }

  function drawHUD() {
    var lv = LEVELS[levelIdx];
    // level name plate
    ctx.fillStyle = 'rgba(255,250,242,0.95)';
    UI.roundRect(ctx, 236, 12, 470, 62, 26); ctx.fill();
    UI.text(ctx, (levelIdx + 1) + '. ' + lv.name, 254, 33, { size: 24, color: '#E07B1F' });
    // stars still possible
    var st = starsFor(S.moves);
    for (var i = 0; i < 3; i++) UI.drawStar(ctx, 630 + i * 26, 32, 12, i < st ? '#FFC93C' : '#E7DACB');
    // owner meter
    var limit = ownerLimit();
    var frac = Math.min(1, S.moves / limit);
    UI.text(ctx, 'Ruchy: ' + S.moves, 254, 58, { size: 18, color: '#8A6450', weight: 700 });
    ctx.fillStyle = '#EADBC8';
    UI.roundRect(ctx, 360, 50, 214, 14, 7); ctx.fill();
    ctx.fillStyle = frac > 0.8 ? '#FF8FAB' : '#7DBEFF';
    UI.roundRect(ctx, 360, 50, Math.max(14, 214 * frac), 14, 7); ctx.fill();
    // owner icon (a little door) at the end of the bar
    ctx.fillStyle = '#A9744F';
    UI.roundRect(ctx, 584, 44, 18, 26, 4); ctx.fill();
    ctx.fillStyle = '#FFD45C';
    ctx.beginPath(); ctx.arc(598, 58, 2, 0, 7); ctx.fill();
    UI.text(ctx, 'Właściciel', 610, 58, { size: 14, color: '#8A6450', weight: 700 });
  }

  function render() {
    stage.begin();
    // background (wallpaper)
    ctx.fillStyle = '#6E5547';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (var yy = 0; yy < H; yy += 40) for (var xx = (yy / 40 % 2) * 20; xx < W; xx += 40) { ctx.beginPath(); ctx.arc(xx, yy, 4, 0, 7); ctx.fill(); }
    if (!P) return;

    var f = FLOORS[LEVELS[levelIdx].floor] || FLOORS.wood;
    var x, y;
    // floor under everything that isn't a wall
    for (y = 0; y < P.h; y++) for (x = 0; x < P.w; x++) if (P.grid[y][x] !== '#') drawFloorCell(x, y, f);
    // walls, drawers, tubes, cage
    for (y = 0; y < P.h; y++) {
      for (x = 0; x < P.w; x++) {
        var t = P.grid[y][x];
        if (t === '#') drawWall(x, y);
        else if (t === 'S') drawDrawer(x, y, !!S.open[x + ',' + y], drawerAnim[x + ',' + y]);
        else if (t === 'C') drawCage(x, y);
        else if (/[1-9]/.test(t)) drawTube(x, y, t);
      }
    }
    drawTubeLinks();

    // blocks (with push animation)
    S.blocks.forEach(function (b, i) {
      var bx = b[0], by = b[1];
      if (blockAnim && blockAnim.i === i) {
        var k = easeOut(Math.min(1, blockAnim.t / blockAnim.dur));
        bx = blockAnim.from[0] + (b[0] - blockAnim.from[0]) * k;
        by = blockAnim.from[1] + (b[1] - blockAnim.from[1]) * k;
      }
      drawBlock(i, bx, by);
    });

    // Toffi
    var v = toffiView();
    var shake = bump > 0 ? Math.sin(animT * 60) * 3 : 0;
    var tx = ox + (v.x + 0.5) * cs + shake, ty = oy + (v.y + 0.88) * cs;
    if (v.scale > 0.02) Toffi.draw(ctx, tx, ty, cs * 0.92 * v.scale, { anim: v.anim, t: animT, facing: facing });
    particles.draw(ctx);
    speech.draw(ctx, tx, ty - cs * 0.85, { size: 22, maxX: 720 });
    drawHUD();
  }

  // ---------------------------------------------------------------------
  // Main loop
  // ---------------------------------------------------------------------
  UI.loop(function (dt) {
    animT += dt;
    bump = Math.max(0, bump - dt);
    if (anim) { anim.t += dt; if (anim.t >= anim.dur) finishAnim(); }
    if (blockAnim) { blockAnim.t += dt; if (blockAnim.t >= blockAnim.dur) blockAnim = null; }
    Object.keys(drawerAnim).forEach(function (k) { drawerAnim[k] += dt * 3; });
    if (state === 'won') {
      winT += dt;
      if (Math.random() < dt * 8) particles.burst(ox + (S.tx + 0.5) * cs, oy + (S.ty + 0.3) * cs, { n: 3, speed: 120 });
    }
    speech.update(dt);
    particles.update(dt);
    render();
  });

  // Testing / console helper
  window.__toffiGame = { get state() { return { S: S, P: P, state: state, levelIdx: levelIdx }; }, move: move, loadLevel: loadLevel, CONFIG: CONFIG };

  // Start with the level 1 picture behind the level select screen
  loadLevel(Math.min(progress.unlocked, LEVELS.length) - 1);
  showLevels();
})();
