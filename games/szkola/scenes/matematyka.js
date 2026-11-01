/* =========================================================================
   Scena 4: Matematyka – counting and first sums with pictures.
   The teacher (Pani Królik) shows things on the board; the child taps the
   right number. A wrong answer shows counting numbers as a hint.
   ========================================================================= */
(function () {
  'use strict';
  var S = Szkola, UI = S.UI, Sound = S.Sound;

  // DIFFICULTY: each round is { type, max } – counting up to `max`, or a
  // sum whose result is at most `max`
  var ROUNDS = [
    { type: 'count', min: 2, max: 4 },
    { type: 'count', min: 3, max: 6 },
    { type: 'count', min: 4, max: 9 },
    { type: 'add', max: 4 },
    { type: 'add', max: 5 },
    { type: 'add', max: 7 }
  ];
  var THINGS = { jablko: 'jabłek', banan: 'bananów', pilka: 'piłek', ryba: 'ryb', balon: 'balonów', marchewka: 'marchewek' };
  var B = S.BOARD;
  var CX = B.x + B.w / 2;
  var BTNS = [{ x: 275, y: 352, w: 120, h: 86 }, { x: 425, y: 352, w: 120, h: 86 }, { x: 575, y: 352, w: 120, h: 86 }];

  var sc = {
    id: 'matematyka', title: 'Matematyka', time: '8:15', icon: 'liczydlo',
    sticker: { item: 'liczydlo', label: 'Mistrz liczenia', color: '#FFE7A8' },
    intro: {
      text: 'Pani Królik pokaże rzeczy na tablicy. Policz je i kliknij dobrą liczbę!',
      controls: [{ mouse: true, tap: true, keys: ['1', '2', '3'], label: 'Wybierz liczbę' }],
      say: 'Matematyka! Policz i kliknij dobrą liczbę.',
      toffi: 'idle'
    }
  };
  var st;

  function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  function makeQuestion(r) {
    var thing = UI.pick(Object.keys(THINGS));
    var q = { type: r.type, thing: thing };
    if (r.type === 'count') {
      q.a = rnd(r.min, r.max); q.answer = q.a;
      q.text = 'Ile jest ' + THINGS[thing] + '?';
      q.voice = q.text;
    } else {
      q.answer = rnd(2, r.max);
      q.a = rnd(1, q.answer - 1); q.b = q.answer - q.a;
      q.text = q.a + ' + ' + q.b + ' = ?';
      q.voice = q.a + ' dodać ' + q.b + '. Ile to razem?';
    }
    var opts = [q.answer];
    while (opts.length < 3) {
      var o = q.answer + rnd(-2, 2);
      if (o >= 1 && o <= 10 && opts.indexOf(o) < 0) opts.push(o);
    }
    q.options = shuffle(opts);
    q.wrong = [];
    return q;
  }

  sc.start = function () {
    st = { round: 0, q: makeQuestion(ROUNDS[0]), phase: 'wait', t: 0, stars: 0, firstTry: true, endT: 0 };
  };

  function ask() {
    st.phase = 'q';
    st.firstTry = true;
    S.otherSpeech.say(st.q.type === 'count' ? 'Policz!' : 'Dodaj!', 1.6);
    S.speak(st.q.voice);
  }

  sc.begin = function () { ask(); };

  function answer(i) {
    if (st.phase !== 'q' || st.q.wrong.indexOf(i) >= 0) return;
    var v = st.q.options[i];
    if (v === st.q.answer) {
      st.phase = 'right'; st.t = 1.8;
      if (st.firstTry) st.stars++;
      st.picked = i;
      Sound.play('win');
      S.particles.burst(BTNS[i].x + 60, BTNS[i].y + 40, { n: 20, speed: 200, colors: ['#FFE066', '#FFFFFF', '#5FCFAE'] });
      var msg = UI.pick(['Brawo!', 'Super!', 'Świetnie!']) + ' To ' + v + '!';
      S.otherSpeech.say(msg, 1.8);
      S.speak(msg);
      S.toffiSay(UI.pick(['Hurra!', 'Umiem liczyć!', 'Tak!']), 1.4);
    } else {
      st.q.wrong.push(i);
      st.firstTry = false;
      Sound.play('nope');
      S.otherSpeech.say('Policz jeszcze raz!', 2);
      S.speak('Policz jeszcze raz!');
    }
  }

  sc.down = function (x, y) {
    BTNS.forEach(function (b, i) { if (S.hit(b, x, y)) answer(i); });
    if (Math.abs(x - (B.x + B.w - 28)) < 24 && Math.abs(y - (B.y + 28)) < 24) S.speak(st.q.voice);
  };

  sc.key = function (e, isDown) {
    if (!isDown) return;
    var n = parseInt(e.key, 10);
    if (n >= 1 && n <= 3) answer(n - 1);
  };

  sc.update = function (dt) {
    if (st.phase === 'right') {
      st.t -= dt;
      if (st.t <= 0) {
        st.round++;
        if (st.round >= ROUNDS.length) {
          st.phase = 'end'; st.endT = 2.4;
          var msg = 'Koniec lekcji! Jesteście super!';
          S.otherSpeech.say(msg, 2.4); S.speak(msg);
          S.toffiSay('Hurra!', 2);
        } else {
          st.q = makeQuestion(ROUNDS[st.round]);
          ask();
        }
      }
    } else if (st.phase === 'end') {
      st.endT -= dt;
      if (st.endT <= 0) { st.phase = 'done'; S.complete(); }
    }
  };

  function chalk(ctx, str, x, y, size) {
    UI.text(ctx, str, x, y, { size: size, color: '#F4F8F0', align: 'center', weight: 700 });
  }

  function drawRow(ctx, n, x0, y, gap, size, hintFrom, showHint) {
    for (var i = 0; i < n; i++) {
      var x = x0 + i * gap;
      S.drawItem(ctx, st.q.thing, x, y, size);
      if (showHint) chalk(ctx, String(hintFrom + i), x, y + size * 0.62, 18);
    }
  }

  function drawBoard(ctx) {
    var q = st.q;
    var hint = q.wrong.length > 0 || st.phase === 'right';
    chalk(ctx, q.type === 'count' ? q.text : 'Dodaj!', CX, B.y + 32, 30);
    S.drawSpeaker(B.x + B.w - 28, B.y + 28, 34);
    if (q.type === 'count') {
      var perRow = q.a > 5 ? Math.ceil(q.a / 2) : q.a;
      var rows = Math.ceil(q.a / perRow);
      for (var r = 0; r < rows; r++) {
        var n = Math.min(perRow, q.a - r * perRow);
        var gap = 70;
        drawRow(ctx, n, CX - (n - 1) * gap / 2, B.y + (rows === 1 ? 128 : 100 + r * 82), gap, 56, r * perRow + 1, hint);
      }
    } else {
      var g = 46, size = 40, total = (q.a + q.b) * g + 70;
      var x0 = CX - total / 2 + g / 2;
      var y = B.y + 118;
      drawRow(ctx, q.a, x0, y, g, size, 1, hint);
      chalk(ctx, '+', x0 + q.a * g + 2, y, 44);
      drawRow(ctx, q.b, x0 + q.a * g + 50, y, g, size, q.a + 1, hint);
      chalk(ctx, q.a + ' + ' + q.b + ' = ' + (st.phase === 'right' ? q.answer : '?'), CX, B.y + 196, 40);
    }
    // stars earned this lesson
    for (var i = 0; i < ROUNDS.length; i++) {
      UI.drawStar(ctx, B.x + 30 + i * 30, B.y + B.h - 22, 11, i < st.stars ? '#FFE066' : 'rgba(255,255,255,0.18)');
    }
  }

  sc.render = function (ctx) {
    S.drawClassroom(ctx);
    drawBoard(ctx);
    S.drawTeacher(ctx, 140, 452, 150, { pointer: st.phase === 'q', talking: !!S.otherSpeech.str });
    S.drawDeskKid(ctx, 850, 470, 'toffi', { size: 100, hat: 'bow', hatColor: '#7DBEFF', anim: st.phase === 'right' || st.phase === 'end' ? 'wiggle' : 'sit' });
    st.q.options.forEach(function (v, i) {
      var wrong = st.q.wrong.indexOf(i) >= 0;
      var good = st.phase === 'right' && st.picked === i;
      S.drawButton(BTNS[i], String(v), {
        size: 52, disabled: wrong,
        color: good ? '#5FCFAE' : '#FFFFFF', text: good ? '#FFFFFF' : '#5B3A29',
        shadow: good ? '#3BA585' : 'rgba(90,58,41,0.25)'
      });
    });
    S.otherSpeech.draw(ctx, 150, 268, { size: 22 });
    S.toffiSpeech.draw(ctx, 850, 360, { size: 22 });
  };

  sc.debug = function () { return st; };   // for testing from the console
  S.register(sc);
})();
