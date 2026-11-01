/* =========================================================================
   Scena 1: Śniadanie – breakfast at home with Mama.
   Mama asks for a breakfast food (picture + voice); the child taps it on
   the shelf and Toffi eats it. Sweets are gently refused.
   ========================================================================= */
(function () {
  'use strict';
  var S = Szkola, UI = S.UI, Sound = S.Sound;

  var MEALS = 4;   // how many foods Toffi eats
  var BREAKFAST = ['kanapka', 'mleko', 'platki', 'banan', 'jajko', 'jablko'];
  var SWEETS = ['cukierek', 'lody'];
  // accusative forms for "Podaj Toffi ..."
  var ACC = { kanapka: 'kanapkę', mleko: 'mleko', platki: 'płatki', banan: 'banana', jajko: 'jajko', jablko: 'jabłko' };
  var PLATE = { x: 300, y: 396 };

  var sc = {
    id: 'sniadanie', title: 'Śniadanie', time: '7:30', icon: 'kanapka',
    sticker: { item: 'kanapka', label: 'Zdrowe śniadanie', color: '#FFD9B0' },
    intro: {
      text: 'Dzień dobry! Toffi je śniadanie z mamą.<br>Mama powie, co podać – kliknij to na półce!',
      controls: [{ mouse: true, tap: true, label: 'Kliknij jedzenie' }],
      say: 'Śniadanie! Kliknij to, o co prosi mama.',
      toffi: 'eat'
    }
  };
  var st;

  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  sc.start = function () {
    var items = shuffle(BREAKFAST.concat(SWEETS));
    st = {
      tiles: items.map(function (name, i) {
        var c = i % 4, r = Math.floor(i / 4);
        return { name: name, x: 650 + c * 74, y: 176 + r * 112, w: 66, h: 70, used: false, shake: 0 };
      }),
      requests: shuffle(BREAKFAST.slice()).slice(0, MEALS),
      idx: 0, eaten: [], phase: 'wait', fly: null, eatT: 0, wrong: 0, endT: 0
    };
  };

  function target() { return st.requests[st.idx]; }

  function ask() {
    st.phase = 'ask';
    st.wrong = 0;
    S.say('Podaj Toffi ' + ACC[target()] + '!', 3);
  }

  sc.begin = function () { ask(); };

  sc.down = function (x, y) {
    if (st.phase !== 'ask') return;
    st.tiles.forEach(function (t) {
      if (t.used || !S.hit(t, x, y)) return;
      if (t.name === target()) {
        t.used = true;
        st.fly = { name: t.name, x0: t.x + t.w / 2, y0: t.y + t.h / 2, t: 0 };
        st.phase = 'fly';
        Sound.play('pop');
      } else if (SWEETS.indexOf(t.name) >= 0) {
        t.shake = 0.5; st.wrong++;
        Sound.play('nope');
        S.say('Słodycze nie na śniadanie!', 2.2);
      } else {
        t.shake = 0.5; st.wrong++;
        Sound.play('nope');
        S.say('To ' + S.ITEM_NAMES[t.name].toLowerCase() + '. Szukamy: ' + S.ITEM_NAMES[target()].toLowerCase() + '!', 2.4);
      }
    });
  };

  sc.update = function (dt) {
    st.tiles.forEach(function (t) { t.shake = Math.max(0, t.shake - dt); });
    if (st.phase === 'fly') {
      st.fly.t += dt * 1.8;
      if (st.fly.t >= 1) {
        st.phase = 'eat';
        st.eatT = 1.3;
        st.eaten.push(st.fly.name);
        st.fly = null;
        Sound.play('eat');
        S.particles.burst(PLATE.x, PLATE.y - 30, { n: 10, speed: 120 });
        S.toffiSay(UI.pick(['Mniam!', 'Pycha!', 'Mniam, mniam!', 'Dziękuję!']), 1.2);
      }
    } else if (st.phase === 'eat') {
      st.eatT -= dt;
      if (st.eatT <= 0) {
        st.idx++;
        if (st.idx >= MEALS) {
          st.phase = 'full'; st.endT = 2.6;
          S.toffiSay('Pełny brzuszek!', 2);
          S.say('Smacznego! Teraz szykujemy się do szkoły.', 2.6);
          Sound.play('friend');
        } else {
          ask();
        }
      }
    } else if (st.phase === 'full') {
      st.endT -= dt;
      if (st.endT <= 0) { st.phase = 'end'; S.complete(); }
    }
  };

  // ---- drawing ----
  function drawKitchen(ctx) {
    var W = S.W, H = S.H;
    ctx.fillStyle = '#FFF0CF'; ctx.fillRect(0, 0, W, H);
    // backsplash tiles
    ctx.fillStyle = '#FFE3A8'; ctx.fillRect(0, 300, W, 100);
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2;
    for (var x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 300); ctx.lineTo(x, 400); ctx.stroke(); }
    for (var y = 300; y < 400; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    // window with the morning sun
    ctx.fillStyle = '#FFFFFF'; UI.roundRect(ctx, 30, 90, 220, 190, 14); ctx.fill();
    var sky = ctx.createLinearGradient(0, 100, 0, 270);
    sky.addColorStop(0, '#FFD9A8'); sky.addColorStop(1, '#BFE6FF');
    ctx.fillStyle = sky; UI.roundRect(ctx, 40, 100, 200, 170, 10); ctx.fill();
    ctx.fillStyle = '#FFE066'; ctx.beginPath(); ctx.arc(110, 240, 34, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(136, 100, 8, 170); ctx.fillRect(40, 182, 200, 8);
    ctx.fillStyle = '#FF9FB8';
    ctx.beginPath(); ctx.moveTo(22, 82); ctx.quadraticCurveTo(70, 180, 30, 290); ctx.lineTo(18, 290); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(258, 82); ctx.quadraticCurveTo(210, 180, 250, 290); ctx.lineTo(262, 290); ctx.closePath(); ctx.fill();
    // wall clock 7:30
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(330, 150, 36, 0, 7); ctx.fill();
    ctx.strokeStyle = '#FF9F45'; ctx.lineWidth = 6; ctx.stroke();
    ctx.fillStyle = '#5B3A29';
    for (var h = 0; h < 12; h++) { ctx.beginPath(); ctx.arc(330 + Math.cos(h / 6 * Math.PI) * 27, 150 + Math.sin(h / 6 * Math.PI) * 27, h % 3 ? 2 : 3.5, 0, 7); ctx.fill(); }
    ctx.strokeStyle = '#5B3A29'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(330, 150); ctx.lineTo(330 + 14 * Math.cos(-Math.PI / 2 + 7.5 / 12 * Math.PI * 2), 150 + 14 * Math.sin(-Math.PI / 2 + 7.5 / 12 * Math.PI * 2)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(330, 150); ctx.lineTo(330, 176); ctx.stroke();
    // shelves on the right
    ctx.fillStyle = '#C98B5A';
    ctx.fillRect(640, 250, 310, 10); ctx.fillRect(640, 362, 310, 10);
    ctx.fillStyle = '#B07446'; ctx.fillRect(640, 372, 310, H - 372);
    ctx.fillStyle = '#C98B5A';
    UI.roundRect(ctx, 652, 392, 140, 140, 10); ctx.fill(); UI.roundRect(ctx, 800, 392, 140, 140, 10); ctx.fill();
    ctx.fillStyle = '#FFD45C'; ctx.fillRect(776, 450, 6, 26); ctx.fillRect(810, 450, 6, 26);
  }

  function drawTable(ctx) {
    ctx.fillStyle = '#FFB3C7'; UI.roundRect(ctx, 90, 398, 520, 24, 8); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    for (var x = 96; x < 600; x += 32) ctx.fillRect(x, 398, 16, 24);
    ctx.fillStyle = '#C98B5A'; ctx.fillRect(110, 422, 480, 18);
    ctx.fillStyle = '#B07446'; ctx.fillRect(130, 440, 22, 100); ctx.fillRect(548, 440, 22, 100);
    // plate
    ctx.fillStyle = 'rgba(90,58,41,0.15)'; ctx.beginPath(); ctx.ellipse(PLATE.x, PLATE.y + 4, 62, 12, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.ellipse(PLATE.x, PLATE.y, 62, 12, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#7DBEFF'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(PLATE.x, PLATE.y, 50, 8, 0, 0, 7); ctx.stroke();
  }

  function drawRequest(ctx) {
    if (st.phase !== 'ask' && st.phase !== 'fly') return;
    var x = 445, y = 84, w = 170, h = 120;
    ctx.fillStyle = 'rgba(255,255,255,0.96)';
    UI.roundRect(ctx, x, y, w, h, 26); ctx.fill();
    ctx.strokeStyle = '#FF9FB8'; ctx.lineWidth = 4; ctx.stroke();
    // thought dots towards Mama
    ctx.fillStyle = 'rgba(255,255,255,0.96)';
    ctx.beginPath(); ctx.arc(600, 214, 8, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(590, 232, 5, 0, 7); ctx.fill();
    S.drawItem(ctx, target(), x + w / 2, y + 50, 74 + Math.sin(S.t * 4) * 3);
    UI.text(ctx, S.ITEM_NAMES[target()], x + w / 2, y + h - 16, { size: 22, color: '#E0607E', align: 'center' });
  }

  function drawMeter(ctx) {
    var x = 330, y = 14;
    ctx.fillStyle = 'rgba(255,250,242,0.95)';
    UI.roundRect(ctx, x, y, 300, 60, 30); ctx.fill();
    UI.text(ctx, 'Brzuszek', x + 18, y + 31, { size: 21, color: '#E07B1F' });
    for (var i = 0; i < MEALS; i++) {
      var cx = x + 140 + i * 42, cy = y + 30;
      ctx.fillStyle = '#F3E6D4'; ctx.beginPath(); ctx.arc(cx, cy, 18, 0, 7); ctx.fill();
      if (st.eaten[i]) S.drawItem(ctx, st.eaten[i], cx, cy, 32);
    }
  }

  sc.render = function (ctx) {
    drawKitchen(ctx);
    // food tiles
    st.tiles.forEach(function (t) {
      var sx = t.shake > 0 ? Math.sin(t.shake * 40) * 5 : 0;
      var glow = st.phase === 'ask' && st.wrong >= 2 && t.name === target() && !t.used;
      if (glow) {
        ctx.fillStyle = 'rgba(255,224,102,' + (0.4 + Math.sin(S.t * 6) * 0.3) + ')';
        UI.roundRect(ctx, t.x - 6, t.y - 6, t.w + 12, t.h + 12, 18); ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      UI.roundRect(ctx, t.x + sx, t.y, t.w, t.h, 14); ctx.fill();
      if (!t.used) S.drawItem(ctx, t.name, t.x + t.w / 2 + sx, t.y + t.h / 2, 58);
    });

    // Toffi and Mama behind the table
    var anim = st.phase === 'eat' ? 'eat' : st.phase === 'full' || st.phase === 'end' ? 'wiggle' : 'sit';
    Toffi.draw(ctx, 300, 412, 130, { anim: anim, t: S.t, cheeks: st.phase === 'eat' ? 1 : 0, shadow: false });
    S.drawMama(ctx, 528, 412, 168, { facing: -1, anim: st.phase === 'full' ? 'wave' : 'idle', shadow: false });
    drawTable(ctx);
    // eaten food sits on the plate for a moment
    if (st.phase === 'eat') S.drawItem(ctx, st.eaten[st.eaten.length - 1], PLATE.x, PLATE.y - 22, 60 * Math.max(0.2, st.eatT / 1.3));
    if (st.fly) {
      var k = st.fly.t, e = 1 - (1 - k) * (1 - k);
      var fx = st.fly.x0 + (PLATE.x - st.fly.x0) * e, fy = st.fly.y0 + (PLATE.y - 22 - st.fly.y0) * e - Math.sin(k * Math.PI) * 120;
      S.drawItem(ctx, st.fly.name, fx, fy, 60, k * 6);
    }
    drawRequest(ctx);
    drawMeter(ctx);
    S.toffiSpeech.draw(ctx, 300, 282, { size: 22 });
    S.otherSpeech.draw(ctx, 540, 252, { size: 22 });
  };

  sc.debug = function () { return st; };   // for testing from the console
  S.register(sc);
})();
