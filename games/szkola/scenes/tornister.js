/* =========================================================================
   Scena 2: Pakowanie tornistra – packing the school bag.
   The timetable on the wall shows (with pictures) what is needed today.
   Tap the right things; toys and things for lessons that are not today
   stay at home.
   ========================================================================= */
(function () {
  'use strict';
  var S = Szkola, UI = S.UI, Sound = S.Sound;

  var LESSONS = [
    { name: 'Matematyka', item: 'liczydlo', gen: 'matematyki' },
    { name: 'Polski', item: 'ksiazka', gen: 'polskiego' },
    { name: 'Plastyka', item: 'kredki', gen: 'plastyki' },
    { name: 'WF', item: 'trampki', gen: 'WF-u' }
  ];
  var ALWAYS = ['piornik', 'sniadaniowka'];
  var TOYS = { mis: 'Miś zostaje w domu!', pilka: 'Piłka zostaje w domu!', auto: 'Autko zostaje w domu!' };
  var BAG = { x: 845, y: 500 };

  var sc = {
    id: 'tornister', title: 'Pakowanie tornistra', time: '7:45', icon: 'tornister',
    sticker: { item: 'tornister', label: 'Spakowany tornister', color: '#D2C3FF' },
    intro: {
      text: 'Spójrz na <b>plan lekcji</b> na ścianie. Spakuj do tornistra tylko to, czego Toffi dziś potrzebuje!',
      controls: [{ mouse: true, tap: true, label: 'Kliknij rzecz' }],
      say: 'Spakuj tornister. Popatrz na plan lekcji!',
      toffi: 'idle'
    }
  };
  var st;

  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  sc.start = function () {
    var lessons = shuffle(LESSONS.slice());
    var today = lessons.slice(0, 3), notToday = lessons[3];
    var names = shuffle(ALWAYS.concat(lessons.map(function (l) { return l.item; }), Object.keys(TOYS)));
    st = {
      today: today, notToday: notToday,
      needed: ALWAYS.concat(today.map(function (l) { return l.item; })),
      items: names.map(function (n, i) {
        var c = i % 3, r = Math.floor(i / 3);
        return { name: n, x: 360 + c * 112 + (r % 2 ? 22 : 0), y: 178 + r * 112, rot: (Math.random() - 0.5) * 0.4, packed: false, shake: 0 };
      }),
      packed: [], flying: [], wrong: 0, idle: 0, phase: 'wait', bagBounce: 0, endT: 0, flap: 0
    };
  };

  sc.begin = function () { st.phase = 'pack'; S.toffiSay('Co mam dziś w szkole?', 2); };

  function needs(name) { return st.needed.indexOf(name) >= 0; }

  sc.down = function (x, y) {
    if (st.phase !== 'pack') return;
    st.items.forEach(function (it) {
      if (it.packed || Math.abs(x - it.x) > 48 || Math.abs(y - it.y) > 48) return;
      st.idle = 0;
      if (needs(it.name)) {
        it.packed = true;
        st.wrong = 0;
        st.flying.push({ name: it.name, x0: it.x, y0: it.y, t: 0 });
        Sound.play('pop');
      } else {
        it.shake = 0.5;
        st.wrong++;
        Sound.play('nope');
        var msg = TOYS[it.name] || ('Dziś nie ma ' + st.notToday.gen + '!');
        S.toffiSay(msg, 2);
        S.speak(msg);
      }
    });
  };

  sc.update = function (dt) {
    st.items.forEach(function (it) { it.shake = Math.max(0, it.shake - dt); });
    st.bagBounce = Math.max(0, st.bagBounce - dt);
    st.flying = st.flying.filter(function (f) {
      f.t += dt * 1.7;
      if (f.t >= 1) {
        st.packed.push(f.name);
        st.bagBounce = 0.3;
        Sound.play('seed');
        S.particles.burst(BAG.x, BAG.y - 130, { n: 8, speed: 110 });
        if (st.packed.length === st.needed.length) {
          st.phase = 'close'; st.endT = 2.6;
          Sound.play('friend');
          S.toffiSay('Gotowe! Wszystko spakowane!', 2.2);
          S.speak('Brawo! Wszystko spakowane!');
        }
        return false;
      }
      return true;
    });
    if (st.phase === 'pack') st.idle += dt;
    if (st.phase === 'close') {
      st.flap = Math.min(1, st.flap + dt * 2);
      st.endT -= dt;
      if (st.endT <= 0) { st.phase = 'end'; S.complete(); }
    }
  };

  // ---- drawing ----
  function drawRoom(ctx) {
    var W = S.W, H = S.H;
    ctx.fillStyle = '#EDE4FF'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    for (var x = 0; x < W; x += 60) ctx.fillRect(x, 0, 30, 430);
    ctx.fillStyle = '#F7D3E1'; ctx.fillRect(0, 430, W, H - 430);
    ctx.fillStyle = '#F2C2D3';
    ctx.beginPath(); ctx.ellipse(500, 480, 300, 46, 0, 0, 7); ctx.fill();
    // window
    ctx.fillStyle = '#FFFFFF'; UI.roundRect(ctx, 690, 90, 170, 150, 12); ctx.fill();
    ctx.fillStyle = '#BFE6FF'; UI.roundRect(ctx, 698, 98, 154, 134, 8); ctx.fill();
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(771, 98, 8, 134); ctx.fillRect(698, 160, 154, 8);
  }

  function drawTimetable(ctx) {
    var x = 22, y = 86, w = 270, h = 340;
    ctx.fillStyle = '#C98B5A'; UI.roundRect(ctx, x, y, w, h, 16); ctx.fill();
    ctx.fillStyle = '#F2D8B0'; UI.roundRect(ctx, x + 8, y + 8, w - 16, h - 16, 10); ctx.fill();
    UI.text(ctx, 'Plan lekcji', x + w / 2, y + 30, { size: 26, color: '#7A4A2E', align: 'center' });
    var rows = [{ label: 'Zawsze', items: ALWAYS }].concat(st.today.map(function (l) { return { label: l.name, items: [l.item] }; }));
    rows.forEach(function (row, i) {
      var ry = y + 58 + i * 68;
      ctx.fillStyle = i === 0 ? '#FFE7A8' : '#FFFFFF';
      UI.roundRect(ctx, x + 16, ry, w - 32, 60, 12); ctx.fill();
      UI.text(ctx, row.label, x + 28, ry + 31, { size: 19, color: '#5B3A29' });
      row.items.forEach(function (n, k) {
        var ix = x + w - 50 - (row.items.length - 1 - k) * 58, iy = ry + 30;
        S.drawItem(ctx, n, ix, iy, 50);
        if (st.packed.indexOf(n) >= 0) {
          ctx.fillStyle = '#5FCFAE'; ctx.beginPath(); ctx.arc(ix + 18, iy + 16, 11, 0, 7); ctx.fill();
          ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(ix + 13, iy + 16); ctx.lineTo(ix + 17, iy + 20); ctx.lineTo(ix + 24, iy + 11); ctx.stroke();
        }
      });
    });
  }

  function drawBag(ctx) {
    var b = st.bagBounce > 0 ? Math.sin(st.bagBounce / 0.3 * Math.PI) * 0.06 : 0;
    ctx.save();
    ctx.translate(BAG.x, BAG.y);
    ctx.scale(1 + b, 1 - b);
    ctx.fillStyle = 'rgba(90,58,41,0.18)'; ctx.beginPath(); ctx.ellipse(0, 0, 90, 12, 0, 0, 7); ctx.fill();
    if (st.flap < 1) {
      // open flap leaning back
      ctx.fillStyle = '#9A80EA';
      ctx.save(); ctx.translate(0, -150); ctx.rotate(-0.3 * (1 - st.flap)); UI.roundRect(ctx, -72, -48, 144, 56, 24); ctx.fill(); ctx.restore();
    }
    ctx.fillStyle = '#B49CFF'; UI.roundRect(ctx, -76, -160, 152, 160, 30); ctx.fill();
    ctx.fillStyle = '#D2C3FF'; UI.roundRect(ctx, -50, -70, 100, 50, 16); ctx.fill();
    UI.drawStar(ctx, 0, -45, 14, '#FFFFFF');
    if (st.flap < 1) {
      ctx.fillStyle = '#5E4A99'; ctx.beginPath(); ctx.ellipse(0, -156, 64, 14, 0, 0, 7); ctx.fill();
      // things sticking out
      st.packed.slice(-3).forEach(function (n, i) { S.drawItem(ctx, n, -36 + i * 36, -170, 40, -0.3 + i * 0.3); });
      ctx.fillStyle = '#B49CFF'; ctx.fillRect(-72, -156, 144, 14);
    }
    if (st.flap > 0) {
      ctx.fillStyle = '#9A80EA';
      UI.roundRect(ctx, -76, -164, 152, 80 * st.flap, 28); ctx.fill();
      ctx.fillStyle = '#FFD45C'; UI.roundRect(ctx, -12, -164 + 80 * st.flap - 18, 24, 16, 5); ctx.fill();
    }
    ctx.restore();
  }

  sc.render = function (ctx) {
    drawRoom(ctx);
    drawTimetable(ctx);
    var hintName = (st.phase === 'pack' && (st.wrong >= 3 || st.idle > 9)) ? st.needed.filter(function (n) { return st.packed.indexOf(n) < 0 && !st.flying.some(function (f) { return f.name === n; }); })[0] : null;
    st.items.forEach(function (it) {
      if (it.packed) return;
      var sx = it.shake > 0 ? Math.sin(it.shake * 40) * 6 : 0;
      if (it.name === hintName) {
        ctx.fillStyle = 'rgba(255,224,102,' + (0.4 + Math.sin(S.t * 6) * 0.3) + ')';
        ctx.beginPath(); ctx.arc(it.x, it.y, 52, 0, 7); ctx.fill();
      }
      ctx.fillStyle = 'rgba(122,74,46,0.12)'; ctx.beginPath(); ctx.ellipse(it.x, it.y + 40, 38, 8, 0, 0, 7); ctx.fill();
      S.drawItem(ctx, it.name, it.x + sx, it.y, 84, it.rot);
    });
    var anim = st.phase === 'close' || st.phase === 'end' ? 'wiggle' : 'idle';
    Toffi.draw(ctx, 700, 505, 110, { anim: anim, t: S.t, hat: 'bow', hatColor: '#7DBEFF' });
    drawBag(ctx);
    st.flying.forEach(function (f) {
      var k = f.t, e = 1 - (1 - k) * (1 - k);
      S.drawItem(ctx, f.name, f.x0 + (BAG.x - f.x0) * e, f.y0 + (BAG.y - 160 - f.y0) * e - Math.sin(k * Math.PI) * 120, 84 * (1 - k * 0.5), k * 5);
    });
    // counter
    ctx.fillStyle = 'rgba(255,250,242,0.95)';
    UI.roundRect(ctx, 380, 14, 200, 56, 28); ctx.fill();
    S.drawItem(ctx, 'tornister', 414, 42, 40);
    UI.text(ctx, st.packed.length + ' / ' + st.needed.length, 446, 43, { size: 28, color: '#5B3A29' });
    S.toffiSpeech.draw(ctx, 700, 400, { size: 22 });
  };

  S.register(sc);
})();
