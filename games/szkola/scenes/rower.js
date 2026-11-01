/* =========================================================================
   Scena 3: Rowerem z mamą – riding to school on Mama's bike.
   Toffi sits in the child seat. Buttons: STOP, JEDŹ and the bell.
   On the way: red lights, a duck family crossing and pigeons on the path.
   Mama always stops safely by herself, so nothing bad can happen – but
   the child earns a star for stopping (or ringing the bell) first.
   ========================================================================= */
(function () {
  'use strict';
  var S = Szkola, UI = S.UI, Sound = S.Sound;

  var CONFIG = {
    speed: 180,              // riding speed (pixels / second)
    greenAfter: 2.2,         // seconds of waiting at a red light
    duckSpeed: 24,           // how fast the ducks cross
    route: [                 // events along the way (world x)
      { type: 'light', x: 1300 },
      { type: 'ducks', x: 2300 },
      { type: 'pigeons', x: 3100 },
      { type: 'light', x: 3900 },
      { type: 'pigeons', x: 4600 },
      { type: 'school', x: 5400 }
    ]
  };

  var BIKE_X = 480;          // bike centre on screen
  var FRONT = 100;           // from the bike centre to the front wheel
  var GY = 472;              // where the wheels touch the path
  var BTN = {
    stop: { x: 18, y: 418, w: 132, h: 104 },
    go: { x: 162, y: 418, w: 132, h: 104 },
    bell: { x: 810, y: 418, w: 132, h: 104 }
  };

  var sc = {
    id: 'rower', title: 'Rowerem do szkoły', time: '8:00', icon: 'rower',
    sticker: { item: 'rower', label: 'Bezpieczna jazda', color: '#BFE6FF' },
    intro: {
      text: 'Toffi jedzie z mamą na rowerze! Na czerwonym świetle i przy kaczuszkach naciśnij <b>STOP</b>. Gołębie przegoni <b>dzwonek</b>.',
      controls: [
        { keys: ['↓'], tap: true, label: 'Stop' },
        { keys: ['→'], tap: true, label: 'Jedź' },
        { keys: ['Spacja'], tap: true, label: 'Dzwonek' }
      ],
      say: 'Jedziemy do szkoły! Na czerwonym świetle naciśnij stop.',
      toffi: 'wave'
    }
  };
  var st;

  sc.start = function () {
    st = {
      dist: 0, speed: 0, wheel: 0, go: false, stars: 0, bellT: 0, phase: 'wait', endT: 0,
      events: CONFIG.route.map(function (e) {
        return {
          type: e.type, x: e.x, done: false, good: false, warned: false, red: true, wait: 0, clear: false,
          ducks: [0, 1, 2, 3].map(function (i) { return { x: e.x + 40 - i * 14, y: 360 - i * 30 }; }),
          birds: [0, 1, 2].map(function (i) { return { x: e.x + 10 + i * 34, y: 458 - (i % 2) * 8, vx: 0, vy: 0, ph: i * 2 }; }),
          flown: false, stopT: 0
        };
      })
    };
  };

  sc.begin = function () {
    st.phase = 'ride';
    S.say('Kliknij JEDŹ, żeby ruszyć!', 2.5);
  };

  function star(msg) {
    st.stars++;
    Sound.play('star');
    S.particles.burst(BIKE_X, GY - 160, { n: 18, speed: 200, colors: ['#FFE066', '#FFFFFF', '#FFB347'] });
    S.toffiSay(msg, 2);
    S.speak(msg);
  }

  function press(what) {
    if (st.phase !== 'ride') return;
    if (what === 'stop') {
      if (st.go) Sound.play('click');
      st.go = false;
      var ev = active();
      if (ev && !ev.good && gap(ev) > -20 && gap(ev) < 420) {
        if (ev.type === 'light' && ev.red) { ev.good = true; star('Brawo! Na czerwonym stoimy!'); }
        if (ev.type === 'ducks' && ev.started && !ev.clear) { ev.good = true; star('Brawo! Kaczuszki przechodzą!'); }
      }
    } else if (what === 'go') {
      if (!st.go) Sound.play('click');
      st.go = true;
    } else if (what === 'bell') {
      Sound.play('bell');
      st.bellT = 0.5;
      var e2 = active();
      if (e2 && e2.type === 'pigeons' && !e2.flown && gap(e2) < 460) {
        flyAway(e2);
        e2.good = true;
        star('Brawo! Ptaszki odleciały!');
      }
    }
  }

  function flyAway(ev) {
    ev.flown = true;
    ev.birds.forEach(function (b, i) { b.vx = 60 + i * 30; b.vy = -160 - i * 30; });
  }

  sc.down = function (x, y) {
    if (S.hit(BTN.stop, x, y)) press('stop');
    else if (S.hit(BTN.go, x, y)) press('go');
    else if (S.hit(BTN.bell, x, y)) press('bell');
  };

  sc.key = function (e, isDown) {
    if (!isDown || e.repeat) return;
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') { e.preventDefault(); press('stop'); }
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'd' || e.key === 'D' || e.key === 'w' || e.key === 'W') { e.preventDefault(); press('go'); }
    else if (e.code === 'Space' || e.key === 'b' || e.key === 'B') { e.preventDefault(); press('bell'); }
  };

  function active() { for (var i = 0; i < st.events.length; i++) if (!st.events[i].done) return st.events[i]; return null; }
  function gap(ev) { return ev.x - (st.dist + BIKE_X + FRONT); }

  sc.update = function (dt) {
    st.bellT = Math.max(0, st.bellT - dt);
    var target = st.go && st.phase === 'ride' ? CONFIG.speed : 0;
    var ev = active();
    if (ev) {
      var g = gap(ev);
      var mustStop = false;
      if (ev.type === 'light') {
        if (ev.red && g < 420 && !ev.warned) { ev.warned = true; S.say('Uwaga! Czerwone światło!', 2.2); }
        if (ev.red) {
          mustStop = true;
          if (st.speed < 8 && g < 320) {
            ev.wait += dt;
            if (ev.wait > CONFIG.greenAfter) {
              ev.red = false;
              Sound.play('pop');
              S.say(st.go ? 'Zielone! Jedziemy!' : 'Zielone! Kliknij JEDŹ!', 2.2);
            }
          }
        }
        if (g < -300) ev.done = true;
      } else if (ev.type === 'ducks') {
        if (!ev.started && g < 520) { ev.started = true; S.say('Uwaga, kaczuszki!', 2); Sound.play('pop'); }
        if (ev.started && !ev.clear) {
          mustStop = true;
          var allOver = true;
          ev.ducks.forEach(function (d) { d.y += CONFIG.duckSpeed * dt * 2.2; if (d.y < 505) allOver = false; });
          if (allOver) { ev.clear = true; S.say(st.go ? 'Kaczuszki przeszły. Jedziemy!' : 'Kaczuszki przeszły. Kliknij JEDŹ!', 2.2); }
        }
        if (g < -300) ev.done = true;
      } else if (ev.type === 'pigeons') {
        if (!ev.flown && g < 470 && !ev.warned) { ev.warned = true; S.toffiSay('Gołębie! Zadzwoń dzwonkiem!', 2); }
        if (!ev.flown) {
          mustStop = g < 200;
          if (st.speed < 5 && g < 140) {
            ev.stopT += dt;
            if (ev.stopT > 1.2) { Sound.play('bell'); st.bellT = 0.5; S.say('Dzyń, dzyń!', 1.4); flyAway(ev); }
          }
        }
        if (g < -300) ev.done = true;
      } else if (ev.type === 'school') {
        mustStop = true;
        if (st.phase === 'ride' && st.speed < 5 && g < 30) {
          st.phase = 'arrived'; st.endT = 3.4;
          Sound.play('friend');
          S.say('Jesteśmy w szkole! Miłego dnia, Toffi!', 3);
          S.toffiSay('Pa, pa, mamo!', 2.4);
        }
      }
      if (mustStop) target = Math.min(target, Math.max(0, (g - 12) * 2.4));
    }
    // birds keep flying once scared
    st.events.forEach(function (e) {
      if (e.type === 'pigeons' && e.flown) e.birds.forEach(function (b) { b.x += b.vx * dt; b.y += b.vy * dt; b.ph += dt * 10; });
      else if (e.type === 'pigeons') e.birds.forEach(function (b) { b.ph += dt; });
    });

    var acc = target > st.speed ? 220 : 520;
    st.speed += Math.sign(target - st.speed) * Math.min(Math.abs(target - st.speed), acc * dt);
    st.dist += st.speed * dt;
    st.wheel += st.speed * dt / 36;

    if (st.phase === 'arrived') {
      st.endT -= dt;
      if (st.endT <= 0) { st.phase = 'end'; S.complete(); }
    }
  };

  // ---------------------------------------------------------------------
  // Drawing
  // ---------------------------------------------------------------------
  function wrap(v, m) { return ((v % m) + m) % m; }

  function drawBackground(ctx) {
    var W = S.W, H = S.H, d = st.dist;
    var sky = ctx.createLinearGradient(0, 0, 0, 400);
    sky.addColorStop(0, '#A8DBFF'); sky.addColorStop(1, '#FFF1DA');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, 400);
    ctx.fillStyle = '#FFE066'; ctx.beginPath(); ctx.arc(840, 110, 40, 0, 7); ctx.fill();
    // clouds
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    for (var i = 0; i < 5; i++) {
      var cx = wrap(i * 260 - d * 0.08, W + 200) - 100, cy = 90 + (i % 2) * 50;
      ctx.beginPath(); ctx.arc(cx, cy, 22, 0, 7); ctx.arc(cx + 26, cy - 10, 28, 0, 7); ctx.arc(cx + 54, cy, 20, 0, 7); ctx.fill();
    }
    // houses (slow parallax)
    var cols = ['#FFD9A8', '#FFC7D5', '#CDE8FF', '#D7F2C9', '#E6DAFF'];
    var roofs = ['#E07B5F', '#B96AD8', '#5D8FD6', '#E0607E', '#D9894A'];
    var off = d * 0.35;
    var first = Math.floor(off / 230) - 1;
    for (var k = first; k < first + 7; k++) {
      var hx = k * 230 - off, idx = ((k % 5) + 5) % 5, hh = 110 + (idx % 3) * 22;
      ctx.fillStyle = cols[idx]; ctx.fillRect(hx, 372 - hh, 150, hh);
      ctx.fillStyle = roofs[idx];
      ctx.beginPath(); ctx.moveTo(hx - 12, 376 - hh); ctx.lineTo(hx + 75, 316 - hh); ctx.lineTo(hx + 162, 376 - hh); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(hx + 22, 392 - hh, 36, 30); ctx.fillRect(hx + 92, 392 - hh, 36, 30);
      ctx.fillStyle = '#BFE6FF';
      ctx.fillRect(hx + 26, 396 - hh, 28, 22); ctx.fillRect(hx + 96, 396 - hh, 28, 22);
    }
    // grass behind the path + trees (faster parallax)
    ctx.fillStyle = '#9FDB86'; ctx.fillRect(0, 372, W, 34);
    var toff = d * 0.7;
    var tf = Math.floor(toff / 180) - 1;
    for (var t = tf; t < tf + 8; t++) {
      var tx = t * 180 - toff + 60;
      ctx.fillStyle = '#9B6A43'; ctx.fillRect(tx - 6, 330, 12, 50);
      ctx.fillStyle = (t % 2) ? '#6CC56F' : '#7ED27F';
      ctx.beginPath(); ctx.arc(tx, 318, 30, 0, 7); ctx.arc(tx - 20, 334, 20, 0, 7); ctx.arc(tx + 20, 334, 20, 0, 7); ctx.fill();
    }
    // the bike path (red, like Polish bike lanes) and grass in front
    ctx.fillStyle = '#E8A0A0'; ctx.fillRect(0, 404, W, 92);
    ctx.fillStyle = '#D98C8C'; ctx.fillRect(0, 404, W, 5); ctx.fillRect(0, 491, W, 5);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    var doff = wrap(-d, 80);
    for (var x = doff - 80; x < W; x += 80) ctx.fillRect(x, 448, 40, 5);
    // bike symbols painted on the path
    var boff = wrap(-d, 600);
    for (var bx = boff - 600; bx < W; bx += 600) { ctx.globalAlpha = 0.5; S.drawItem(ctx, 'rower', bx + 300, 470, 40); ctx.globalAlpha = 1; }
    ctx.fillStyle = '#8FD47A'; ctx.fillRect(0, 496, S.W, S.H - 496);
  }

  function drawHome(ctx) {
    var x = 150 - st.dist;
    if (x < -260) return;
    ctx.fillStyle = '#FFE0B0'; ctx.fillRect(x - 90, 250, 180, 125);
    ctx.fillStyle = '#FF8FAB';
    ctx.beginPath(); ctx.moveTo(x - 110, 254); ctx.lineTo(x, 180); ctx.lineTo(x + 110, 254); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#E0607E'; UI.roundRect(ctx, x - 20, 300, 40, 75, 8); ctx.fill();
    ctx.fillStyle = '#BFE6FF'; ctx.fillRect(x - 70, 280, 34, 30); ctx.fillRect(x + 36, 280, 34, 30);
    UI.drawHeart(ctx, x, 230, 22);
  }

  function drawLight(ctx, ev) {
    var x = ev.x - st.dist;
    if (x < -200 || x > S.W + 200) return;
    // zebra + stop line
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillRect(x - 8, 406, 6, 88);
    for (var y = 410; y < 492; y += 16) ctx.fillRect(x + 10, y, 90, 9);
    // pole + lights
    ctx.fillStyle = '#5B5F6E'; ctx.fillRect(x - 4, 230, 8, 176);
    ctx.fillStyle = '#3B3A4A'; UI.roundRect(ctx, x - 24, 210, 48, 92, 12); ctx.fill();
    ctx.fillStyle = ev.red ? '#FF4D5E' : '#5A2A30'; ctx.beginPath(); ctx.arc(x, 234, 15, 0, 7); ctx.fill();
    ctx.fillStyle = !ev.red ? '#4CD97B' : '#244A30'; ctx.beginPath(); ctx.arc(x, 276, 15, 0, 7); ctx.fill();
    if (ev.red) { ctx.fillStyle = 'rgba(255,77,94,0.3)'; ctx.beginPath(); ctx.arc(x, 234, 26, 0, 7); ctx.fill(); }
    else { ctx.fillStyle = 'rgba(76,217,123,0.3)'; ctx.beginPath(); ctx.arc(x, 276, 26, 0, 7); ctx.fill(); }
  }

  function drawDuck(ctx, x, y, s, baby) {
    var bob = Math.sin(S.t * 10 + x) * 2;
    ctx.save(); ctx.translate(x, y + bob); ctx.scale(s, s);
    ctx.fillStyle = baby ? '#FFE066' : '#FFFFFF';
    ctx.beginPath(); ctx.ellipse(0, -12, 18, 12, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(-14, -26, 10, 0, 7); ctx.fill();
    ctx.fillStyle = '#FF9F45';
    ctx.beginPath(); ctx.moveTo(-23, -27); ctx.lineTo(-33, -24); ctx.lineTo(-23, -21); ctx.closePath(); ctx.fill();
    ctx.fillRect(-6, -2, 3, 6); ctx.fillRect(4, -2, 3, 6);
    ctx.fillStyle = '#2B1C14'; ctx.beginPath(); ctx.arc(-16, -28, 2, 0, 7); ctx.fill();
    ctx.fillStyle = baby ? '#FFD23F' : '#EDEDF2';
    ctx.beginPath(); ctx.ellipse(4, -14, 9, 6, 0.3, 0, 7); ctx.fill();
    ctx.restore();
  }

  function drawPigeon(ctx, b, flying) {
    ctx.save(); ctx.translate(b.x, b.y);
    var peck = flying ? 0 : Math.max(0, Math.sin(b.ph * 4)) * 6;
    ctx.fillStyle = '#A3A7B8';
    ctx.beginPath(); ctx.ellipse(0, -12, 16, 11, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#8A8FA3';
    if (flying) {
      var f = Math.sin(b.ph) * 0.8;
      ctx.save(); ctx.rotate(-0.6 + f); ctx.beginPath(); ctx.ellipse(4, -22, 16, 7, 0, 0, 7); ctx.fill(); ctx.restore();
    } else {
      ctx.beginPath(); ctx.ellipse(4, -13, 11, 7, 0.2, 0, 7); ctx.fill();
    }
    ctx.fillStyle = '#7FB59A'; ctx.beginPath(); ctx.arc(-12, -20 + peck, 6, 0, 7); ctx.fill();
    ctx.fillStyle = '#A3A7B8'; ctx.beginPath(); ctx.arc(-14, -24 + peck, 6, 0, 7); ctx.fill();
    ctx.fillStyle = '#E9A04A'; ctx.beginPath(); ctx.moveTo(-19, -24 + peck); ctx.lineTo(-25, -22 + peck); ctx.lineTo(-19, -21 + peck); ctx.fill();
    ctx.fillStyle = '#2B1C14'; ctx.beginPath(); ctx.arc(-15, -26 + peck, 1.6, 0, 7); ctx.fill();
    if (!flying) { ctx.fillStyle = '#F28CA6'; ctx.fillRect(-3, -2, 2, 4); ctx.fillRect(3, -2, 2, 4); }
    ctx.restore();
  }

  function drawSchool(ctx, ev) {
    var x = ev.x - st.dist;
    if (x < -500 || x > S.W + 100) return;
    ctx.fillStyle = '#FFD9A8'; ctx.fillRect(x - 40, 190, 380, 186);
    ctx.fillStyle = '#E07B5F';
    ctx.beginPath(); ctx.moveTo(x - 60, 196); ctx.lineTo(x + 150, 120); ctx.lineTo(x + 360, 196); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(x + 150, 165, 22, 0, 7); ctx.fill();
    ctx.strokeStyle = '#5B3A29'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x + 150, 165); ctx.lineTo(x + 150, 150); ctx.moveTo(x + 150, 165); ctx.lineTo(x + 160, 165); ctx.stroke();
    ctx.fillStyle = '#7DBEFF'; UI.roundRect(ctx, x + 60, 206, 180, 36, 10); ctx.fill();
    UI.text(ctx, 'SZKOŁA', x + 150, 225, { size: 26, color: '#FFFFFF', align: 'center' });
    ctx.fillStyle = '#BFE6FF';
    [x - 20, x + 40, x + 250, x + 300].forEach(function (wx) { ctx.fillRect(wx, 260, 34, 34); });
    ctx.fillStyle = '#A9744F'; UI.roundRect(ctx, x + 120, 290, 60, 86, 8); ctx.fill();
    ctx.fillStyle = '#FFD45C'; ctx.beginPath(); ctx.arc(x + 170, 334, 4, 0, 7); ctx.fill();
    // flag
    ctx.fillStyle = '#7A4A2E'; ctx.fillRect(x + 330, 100, 4, 100);
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x + 334, 100, 40, 14);
    ctx.fillStyle = '#E0404E'; ctx.fillRect(x + 334, 114, 40, 14);
    // classmates waving at the gate
    Toffi.draw(ctx, x + 230, 400, 54, { anim: 'wave', palette: 'grey', t: S.t, facing: -1 });
    Toffi.draw(ctx, x + 280, 400, 54, { anim: 'wave', palette: 'choco', t: S.t + 1, facing: -1 });
  }

  function drawBike(ctx) {
    var bx = BIKE_X, wy = GY - 36;
    function wheel(cx) {
      ctx.strokeStyle = '#3B3A4A'; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.arc(cx, wy, 34, 0, 7); ctx.stroke();
      ctx.strokeStyle = '#C9CCD8'; ctx.lineWidth = 2;
      for (var i = 0; i < 6; i++) {
        var a = st.wheel + i * Math.PI / 3;
        ctx.beginPath(); ctx.moveTo(cx, wy); ctx.lineTo(cx + Math.cos(a) * 30, wy + Math.sin(a) * 30); ctx.stroke();
      }
      ctx.fillStyle = '#FFD45C'; ctx.beginPath(); ctx.arc(cx, wy, 5, 0, 7); ctx.fill();
    }
    ctx.fillStyle = 'rgba(60,40,30,0.18)'; ctx.beginPath(); ctx.ellipse(bx, GY + 2, 140, 8, 0, 0, 7); ctx.fill();
    wheel(bx - 80); wheel(bx + 88);
    // frame
    ctx.strokeStyle = '#FF6F9C'; ctx.lineWidth = 7; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(bx - 80, wy); ctx.lineTo(bx - 12, wy - 44); ctx.lineTo(bx + 62, wy - 50); ctx.lineTo(bx + 88, wy);
    ctx.moveTo(bx - 80, wy); ctx.lineTo(bx + 4, wy); ctx.lineTo(bx - 12, wy - 44);
    ctx.moveTo(bx + 4, wy); ctx.lineTo(bx + 62, wy - 50);
    ctx.stroke();
    // pedal
    var pa = st.wheel * 0.8;
    ctx.strokeStyle = '#3B3A4A'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(bx + 4, wy); ctx.lineTo(bx + 4 + Math.cos(pa) * 14, wy + Math.sin(pa) * 14); ctx.stroke();
    // rear rack + child seat
    ctx.strokeStyle = '#5B5F6E'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(bx - 80, wy); ctx.lineTo(bx - 118, wy - 46); ctx.lineTo(bx - 40, wy - 46); ctx.stroke();
    ctx.fillStyle = '#7DBEFF'; UI.roundRect(ctx, bx - 156, wy - 104, 30, 64, 12); ctx.fill();
    // saddle + Mama
    S.drawMama(ctx, bx + 14, wy - 50, 96, { anim: 'sit', hat: 'helmet', hatColor: '#FF8FAB', shadow: false });
    ctx.fillStyle = '#3B3A4A'; UI.roundRect(ctx, bx - 12, wy - 54, 40, 10, 5); ctx.fill();
    // Toffi in the child seat, then the front of the seat
    Toffi.draw(ctx, bx - 94, wy - 46, 64, { anim: st.phase === 'arrived' || st.phase === 'end' ? 'wave' : (st.bellT > 0 ? 'wiggle' : 'sit'), t: S.t, hat: 'helmet', hatColor: '#7DBEFF', shadow: false });
    ctx.fillStyle = '#5FA6F0'; UI.roundRect(ctx, bx - 134, wy - 64, 74, 22, 10); ctx.fill();
    // handlebar, bell and basket
    ctx.strokeStyle = '#3B3A4A'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(bx + 62, wy - 50); ctx.lineTo(bx + 66, wy - 86); ctx.lineTo(bx + 46, wy - 90); ctx.stroke();
    ctx.fillStyle = '#FFD45C';
    ctx.save(); ctx.translate(bx + 56, wy - 94); ctx.rotate(st.bellT > 0 ? Math.sin(S.t * 50) * 0.4 : 0);
    ctx.beginPath(); ctx.arc(0, 0, 8, Math.PI, 0); ctx.lineTo(9, 3); ctx.lineTo(-9, 3); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#D9A15E'; UI.roundRect(ctx, bx + 70, wy - 84, 44, 32, 6); ctx.fill();
    ctx.strokeStyle = '#B07446'; ctx.lineWidth = 2;
    for (var i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(bx + 72, wy - 76 + i * 9); ctx.lineTo(bx + 112, wy - 76 + i * 9); ctx.stroke(); }
    ctx.fillStyle = '#FF8FAB'; ctx.beginPath(); ctx.arc(bx + 82, wy - 88, 6, 0, 7); ctx.fill();
    ctx.fillStyle = '#FFE066'; ctx.beginPath(); ctx.arc(bx + 98, wy - 90, 6, 0, 7); ctx.fill();
    if (st.bellT > 0) { ctx.globalAlpha = st.bellT * 2; UI.text(ctx, 'dzyń!', bx + 60, wy - 120, { size: 22, color: '#E07B1F', align: 'center', outline: '#FFFFFF' }); ctx.globalAlpha = 1; }
  }

  function drawButtons(ctx) {
    var ev = active();
    var needStop = ev && st.go && ((ev.type === 'light' && ev.red && gap(ev) < 420) || (ev.type === 'ducks' && ev.started && !ev.clear));
    var needGo = !st.go && st.phase === 'ride' && !(ev && ((ev.type === 'light' && ev.red && gap(ev) < 420) || (ev.type === 'ducks' && ev.started && !ev.clear)));
    var needBell = ev && ev.type === 'pigeons' && !ev.flown && gap(ev) < 470;
    // STOP
    S.drawButton(BTN.stop, '', { color: '#FF6B6B', shadow: '#C94848', glow: needStop });
    var c = { x: BTN.stop.x + BTN.stop.w / 2, y: BTN.stop.y + BTN.stop.h / 2 };
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    for (var i = 0; i < 8; i++) { var a = Math.PI / 8 + i * Math.PI / 4; ctx.lineTo(c.x + Math.cos(a) * 40, c.y + Math.sin(a) * 40); }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#E0404E';
    ctx.beginPath();
    for (var j = 0; j < 8; j++) { var b = Math.PI / 8 + j * Math.PI / 4; ctx.lineTo(c.x + Math.cos(b) * 35, c.y + Math.sin(b) * 35); }
    ctx.closePath(); ctx.fill();
    UI.text(ctx, 'STOP', c.x, c.y + 2, { size: 22, color: '#FFFFFF', align: 'center' });
    // JEDŹ
    S.drawButton(BTN.go, 'JEDŹ', { color: '#5FCFAE', shadow: '#3BA585', text: '#FFFFFF', size: 32, glow: needGo });
    // bell
    S.drawButton(BTN.bell, '', { color: '#FFE066', shadow: '#E0A12A', glow: needBell });
    var bc = { x: BTN.bell.x + BTN.bell.w / 2, y: BTN.bell.y + BTN.bell.h / 2 + 4 };
    ctx.fillStyle = '#E0A12A';
    ctx.beginPath(); ctx.moveTo(bc.x - 28, bc.y + 14); ctx.quadraticCurveTo(bc.x - 26, bc.y - 30, bc.x, bc.y - 32);
    ctx.quadraticCurveTo(bc.x + 26, bc.y - 30, bc.x + 28, bc.y + 14); ctx.closePath(); ctx.fill();
    ctx.fillRect(bc.x - 32, bc.y + 12, 64, 8);
    ctx.beginPath(); ctx.arc(bc.x, bc.y + 24, 7, 0, 7); ctx.fill();
  }

  function drawHUD(ctx) {
    var x = 330, y = 14, w = 300;
    ctx.fillStyle = 'rgba(255,250,242,0.95)';
    UI.roundRect(ctx, x, y, w, 60, 30); ctx.fill();
    // little route map: home → school
    var total = CONFIG.route[CONFIG.route.length - 1].x - BIKE_X - FRONT;
    var k = UI.clamp(st.dist / total, 0, 1);
    ctx.fillStyle = '#EADBC8'; UI.roundRect(ctx, x + 40, y + 26, 160, 10, 5); ctx.fill();
    ctx.fillStyle = '#7DBEFF'; UI.roundRect(ctx, x + 40, y + 26, Math.max(10, 160 * k), 10, 5); ctx.fill();
    S.drawItem(ctx, 'dom', x + 24, y + 30, 34);
    ctx.fillStyle = '#E07B5F'; ctx.beginPath(); ctx.moveTo(x + 206, y + 26); ctx.lineTo(x + 220, y + 14); ctx.lineTo(x + 234, y + 26); ctx.fill();
    ctx.fillStyle = '#FFD9A8'; ctx.fillRect(x + 208, y + 26, 24, 18);
    S.drawItem(ctx, 'rower', x + 40 + 160 * k, y + 18, 28);
    UI.drawStar(ctx, x + 258, y + 30, 14, '#FFC93C');
    UI.text(ctx, String(st.stars), x + 276, y + 31, { size: 26, color: '#5B3A29' });
  }

  sc.render = function (ctx) {
    drawBackground(ctx);
    drawHome(ctx);
    st.events.forEach(function (ev) {
      if (ev.type === 'light') drawLight(ctx, ev);
      if (ev.type === 'school') drawSchool(ctx, ev);
    });
    // ducks and pigeons on the path
    st.events.forEach(function (ev) {
      var sx = -st.dist;
      if (ev.type === 'ducks' && ev.started) {
        ev.ducks.forEach(function (d, i) { if (d.y > 395 && d.y < 520) drawDuck(ctx, d.x + sx, Math.min(d.y, 505), i === 0 ? 1.15 : 0.7, i > 0); });
      }
      if (ev.type === 'pigeons') ev.birds.forEach(function (b) { drawPigeon(ctx, { x: b.x + sx, y: b.y, ph: b.ph }, ev.flown); });
    });
    drawBike(ctx);
    drawButtons(ctx);
    drawHUD(ctx);
    S.toffiSpeech.draw(ctx, BIKE_X - 94, GY - 140, { size: 21 });
    S.otherSpeech.draw(ctx, BIKE_X + 30, GY - 172, { size: 22 });
  };

  S.register(sc);
})();
