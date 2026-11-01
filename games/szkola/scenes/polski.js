/* =========================================================================
   Scena 6: Język polski – first letters.
   A letter is on the board (and read aloud). Balloons with pictures float
   up; pop the one whose word starts with that letter ("K jak kot!").
   ========================================================================= */
(function () {
  'use strict';
  var S = Szkola, UI = S.UI, Sound = S.Sound;

  var ROUNDS = 6;
  // Letters and picture words (item names from school.js)
  var LETTERS = {
    A: ['arbuz', 'auto'], B: ['banan', 'balon'], D: ['dom'], J: ['jablko', 'jajko'], K: ['kot'],
    L: ['lody'], M: ['marchewka'], P: ['pilka'], R: ['ryba'], S: ['slonce', 'ser']
  };
  var BOARD = { x: 130, y: 92, w: 320, h: 210 };
  var LANES = [575, 705, 835];
  var COLORS = ['#FF8FAB', '#7DBEFF', '#FFC93C', '#5FCFAE', '#B49CFF'];

  var sc = {
    id: 'polski', title: 'Język polski', time: '9:15', icon: 'ksiazka',
    sticker: { item: 'ksiazka', label: 'Znam literki', color: '#FFD1DE' },
    intro: {
      text: 'Na tablicy jest literka. Przebij balonik z obrazkiem, który zaczyna się na tę literkę!',
      controls: [{ mouse: true, tap: true, keys: ['1', '2', '3'], label: 'Przebij balonik' }],
      say: 'Język polski! Przebij balonik z obrazkiem na tę literkę.',
      toffi: 'idle'
    }
  };
  var st;

  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function word(name) { return S.ITEM_NAMES[name].toLowerCase(); }

  sc.start = function () {
    st = { letters: shuffle(Object.keys(LETTERS)).slice(0, ROUNDS), round: 0, balloons: [], phase: 'wait', t: 0, wrong: 0, stars: 0, said: '' };
    makeBalloons();
  };

  function letter() { return st.letters[st.round]; }

  function makeBalloons() {
    var L = letter();
    var correct = UI.pick(LETTERS[L]);
    var others = shuffle(Object.keys(LETTERS).filter(function (k) { return k !== L; })).slice(0, 2).map(function (k) { return UI.pick(LETTERS[k]); });
    var words = shuffle([correct].concat(others));
    st.correct = correct;
    st.wrong = 0;
    st.said = '';
    st.balloons = words.map(function (w, i) {
      return { word: w, lane: i, x: LANES[i], y: 600 + i * 70, vy: UI.rand(40, 52), color: COLORS[(st.round + i) % COLORS.length], ph: Math.random() * 6, away: false };
    });
  }

  function ask() {
    st.phase = 'q';
    var L = letter();
    S.otherSpeech.say('Literka ' + L + '!', 2);
    S.speak('Znajdź coś na literę ' + L + '.');
  }

  sc.begin = function () { ask(); };

  function tapBalloon(b) {
    if (st.phase !== 'q' || b.away) return;
    var L = letter();
    if (b.word === st.correct) {
      st.phase = 'right'; st.t = 2.2;
      if (st.wrong === 0) st.stars++;
      b.popped = true;
      Sound.play('pop'); Sound.play('win');
      S.particles.burst(b.x, b.y, { n: 30, speed: 260, colors: [b.color, '#FFFFFF', '#FFE066'] });
      st.said = L + ' jak ' + word(b.word) + '!';
      S.speak(st.said);
      S.toffiSay(UI.pick(['Brawo!', 'Hurra!', 'Super!']), 1.4);
      st.balloons.forEach(function (o) { if (o !== b) { o.away = true; o.vy = 260; } });
    } else {
      st.wrong++;
      b.away = true; b.vy = 300;
      Sound.play('nope');
      var first = S.ITEM_NAMES[b.word].charAt(0);
      S.toffiSay('To ' + word(b.word) + '!', 1.6);
      S.speak('To jest ' + word(b.word) + '. ' + first + ' jak ' + word(b.word) + '. Szukamy literki ' + L + '.');
    }
  }

  sc.down = function (x, y) {
    if (Math.abs(x - (BOARD.x + BOARD.w - 26)) < 24 && Math.abs(y - (BOARD.y + 26)) < 24) { S.speak('Znajdź coś na literę ' + letter() + '.'); return; }
    st.balloons.forEach(function (b) {
      var dx = x - b.x, dy = y - b.y;
      if (dx * dx + dy * dy < 62 * 62) tapBalloon(b);
    });
  };

  sc.key = function (e, isDown) {
    if (!isDown) return;
    var n = parseInt(e.key, 10);
    if (n >= 1 && n <= 3) {
      var b = st.balloons.filter(function (o) { return o.lane === n - 1 && !o.away; })[0];
      if (b) tapBalloon(b);
    }
  };

  sc.update = function (dt) {
    st.balloons.forEach(function (b) {
      if (b.popped) return;
      b.ph += dt;
      b.y -= b.vy * dt;
      b.x = LANES[b.lane] + Math.sin(b.ph * 1.5) * 14;
      // float again from the bottom if missed (only while the round is on)
      if (b.y < 40 && !b.away) b.y = 610;
    });
    st.balloons = st.balloons.filter(function (b) { return !b.popped && b.y > -120; });
    // if every balloon is gone, bring the right one back
    if (st.phase === 'q' && !st.balloons.some(function (b) { return !b.away; })) {
      st.balloons.push({ word: st.correct, lane: 1, x: LANES[1], y: 610, vy: 45, color: COLORS[1], ph: 0, away: false });
    }
    if (st.phase === 'right') {
      st.t -= dt;
      if (st.t <= 0) {
        st.round++;
        if (st.round >= ROUNDS) {
          st.phase = 'end'; st.t = 2.4;
          S.otherSpeech.say('Brawo! Znasz już literki!', 2.4);
          S.speak('Brawo! Znasz już literki! Koniec lekcji.');
        } else {
          makeBalloons();
          ask();
        }
      }
    } else if (st.phase === 'end') {
      st.t -= dt;
      if (st.t <= 0) { st.phase = 'done'; S.complete(); }
    }
  };

  function drawBalloon(ctx, b) {
    var glow = st.phase === 'q' && st.wrong >= 2 && b.word === st.correct;
    ctx.strokeStyle = 'rgba(90,58,41,0.6)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(b.x, b.y + 66); ctx.quadraticCurveTo(b.x + 10, b.y + 96, b.x - 4, b.y + 128); ctx.stroke();
    if (glow) {
      ctx.fillStyle = 'rgba(255,224,102,' + (0.4 + Math.sin(S.t * 6) * 0.3) + ')';
      ctx.beginPath(); ctx.ellipse(b.x, b.y, 74, 84, 0, 0, 7); ctx.fill();
    }
    ctx.fillStyle = b.color;
    ctx.beginPath(); ctx.ellipse(b.x, b.y, 58, 66, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(b.x - 8, b.y + 70); ctx.lineTo(b.x + 8, b.y + 70); ctx.lineTo(b.x, b.y + 62); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath(); ctx.arc(b.x, b.y + 2, 40, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.ellipse(b.x - 30, b.y - 34, 8, 14, -0.5, 0, 7); ctx.fill();
    S.drawItem(ctx, b.word, b.x, b.y + 2, 60);
  }

  sc.render = function (ctx) {
    S.drawClassroom(ctx, BOARD);
    var L = letter() || '';
    UI.text(ctx, L + ' ' + L.toLowerCase(), BOARD.x + BOARD.w / 2, BOARD.y + 92, { size: 110, color: '#F4F8F0', align: 'center' });
    if (st.phase === 'right' && st.said) UI.text(ctx, st.said, BOARD.x + BOARD.w / 2, BOARD.y + 180, { size: 30, color: '#FFE066', align: 'center' });
    S.drawSpeaker(BOARD.x + BOARD.w - 26, BOARD.y + 26, 34);
    // stars
    for (var i = 0; i < ROUNDS; i++) UI.drawStar(ctx, BOARD.x + 26 + i * 26, BOARD.y + BOARD.h - 18, 10, i < st.stars ? '#FFE066' : 'rgba(255,255,255,0.18)');
    S.drawTeacher(ctx, 110, 470, 120, { talking: !!S.otherSpeech.str });
    Toffi.draw(ctx, 380, 512, 104, { anim: st.phase === 'right' || st.phase === 'end' ? 'wiggle' : 'idle', t: S.t, hat: 'bow', hatColor: '#7DBEFF', facing: 1 });
    st.balloons.forEach(function (b) { drawBalloon(ctx, b); });
    S.otherSpeech.draw(ctx, 120, 330, { size: 22 });
    S.toffiSpeech.draw(ctx, 390, 410, { size: 22 });
  };

  sc.debug = function () { return st; };   // for testing from the console
  S.register(sc);
})();
