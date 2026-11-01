/* =========================================================================
   Scena 5: Przerwa – toaleta i mycie łapek (break: toilet + hand washing).
   Steps: ask the teacher politely → choose the girls' door → flush →
   wash hands (tap on, soap, rub, rinse, tap off, towel, bin) → back.
   Wrong taps only show a friendly hint; nothing can be failed.
   ========================================================================= */
(function () {
  'use strict';
  var S = Szkola, UI = S.UI, Sound = S.Sound;

  var RUB_NEEDED = 2600;    // how much rubbing (pixels of finger movement) makes enough foam
  var ASK_GOOD = 'Proszę Pani, czy mogę wyjść do toalety?';
  var ASK_BAD = 'Idę sobie!';

  var WASH = [
    { id: 'tapOn', target: 'tap', hint: 'Odkręć wodę!' },
    { id: 'soap', target: 'soap', hint: 'Naciśnij mydło!' },
    { id: 'rub', target: 'paws', hint: 'Pocieraj łapki!' },
    { id: 'rinse', target: 'paws', hint: 'Spłucz pianę pod wodą!' },
    { id: 'tapOff', target: 'tap', hint: 'Zakręć wodę!' },
    { id: 'towel', target: 'towel', hint: 'Weź ręcznik i wytrzyj łapki!' },
    { id: 'bin', target: 'bin', hint: 'Ręcznik do kosza!' }
  ];
  var AREAS = {
    tap: { x: 430, y: 236, w: 100, h: 70 },
    soap: { x: 610, y: 236, w: 84, h: 110 },
    paws: { x: 380, y: 300, w: 200, h: 100 },
    towel: { x: 110, y: 190, w: 150, h: 130 },
    bin: { x: 120, y: 400, w: 110, h: 120 }
  };
  var CHOICES = [{ x: 230, y: 120, w: 500, h: 84 }, { x: 230, y: 222, w: 500, h: 84 }];
  var DOORS = [{ x: 220, y: 150, w: 180, h: 290 }, { x: 560, y: 150, w: 180, h: 290 }];

  var sc = {
    id: 'toaleta', title: 'Przerwa i toaleta', time: '9:00', icon: 'mydlo',
    sticker: { item: 'mydlo', label: 'Czyste łapki', color: '#C8F0E2' },
    intro: {
      text: 'Przerwa! Toffi musi iść do toalety. Pomóż jej grzecznie zapytać, a potem dobrze umyć łapki!',
      controls: [{ mouse: true, tap: true, label: 'Kliknij' }, { swipe: true, label: 'Pocieraj łapki' }],
      say: 'Przerwa! Pomóż Toffi pójść do toalety i umyć łapki.',
      toffi: 'wiggle'
    }
  };
  var st;

  sc.start = function () {
    st = {
      phase: 'wait', t: 0, girlsLeft: Math.random() < 0.5, askOrder: Math.random() < 0.5 ? [0, 1] : [1, 0],
      door: -1, doorOpen: 0, walk: 0, flush: 0, step: 0, water: false, foam: 0, rub: 0, lastRub: null,
      towel: 0, rinse: 0, binFly: 0, noteAt: 0, glow: 0
    };
  };

  function setPhase(p, t) { st.phase = p; st.t = t || 0; }

  sc.begin = function () {
    setPhase('need', 1.6);
    S.toffiSay('Muszę siku!', 1.6);
    S.speak('Muszę siku!');
  };

  function washStep() { return WASH[st.step]; }
  function startWashStep() {
    st.glow = 0; st.hint = false;
    S.speak(washStep().hint);
  }

  function chooseAsk(i) {
    var good = st.askOrder[i] === 0;
    if (good) {
      Sound.play('pop');
      S.toffiSay(ASK_GOOD, 2.2);
      setPhase('askOk', 2.6);
      setTimeout(function () { S.otherSpeech.say('Oczywiście, Toffi!', 2); S.speak('Oczywiście, Toffi!'); }, 900);
    } else {
      Sound.play('nope');
      S.toffiSay(ASK_BAD, 1.2);
      S.otherSpeech.say('Najpierw zapytaj grzecznie.', 2.2);
      S.speak('Najpierw zapytaj grzecznie.');
    }
  }

  function chooseDoor(i) {
    var girls = (i === 0) === st.girlsLeft;
    if (girls) {
      st.door = i;
      Sound.play('drawer');
      setPhase('enter', 1.4);
    } else {
      Sound.play('nope');
      S.toffiSay('To dla chłopców!', 1.8);
      S.speak('To toaleta dla chłopców. Toffi jest dziewczynką!');
    }
  }

  function tapWash(area) {
    var step = washStep();
    if (!step) return;
    if (area !== step.target) {
      Sound.play('nope');
      st.hint = true;
      S.toffiSay(step.hint, 1.8);
      S.speak(step.hint);
      return;
    }
    switch (step.id) {
      case 'tapOn': st.water = true; Sound.play('water'); next(); break;
      case 'soap':
        st.foam = 0.15; Sound.play('pop');
        S.particles.burst(480, 330, { n: 10, colors: ['#FFFFFF', '#DFF4FF'], shape: 'circle', speed: 90, gravity: -40 });
        next(); break;
      case 'rub': rubBy(140); break;
      case 'rinse': if (st.rinse === 0) { st.rinse = 0.01; Sound.play('water'); } break;
      case 'tapOff':
        st.water = false; Sound.play('star');
        S.toffiSay('Oszczędzamy wodę!', 1.8);
        next(); break;
      case 'towel': st.towel = 0.01; Sound.play('pop'); break;
      case 'bin': st.binFly = 0.01; Sound.play('pop'); break;
    }
  }

  function next() {
    st.step++;
    if (st.step < WASH.length) setTimeout(startWashStep, 700);
  }

  function rubBy(d) {
    if (washStep().id !== 'rub') return;
    st.rub += d;
    st.foam = 0.15 + 0.85 * Math.min(1, st.rub / RUB_NEEDED);
    if (st.rub > st.noteAt) { st.noteAt += RUB_NEEDED / 8; Sound.play('note'); S.particles.burst(480 + UI.rand(-60, 60), 330, { n: 3, colors: ['#FFFFFF', '#DFF4FF', '#FFD1EC'], shape: 'circle', speed: 60, gravity: -60, size: 8 }); }
    if (st.rub >= RUB_NEEDED) {
      S.toffiSay('Ale piana!', 1.4);
      Sound.play('golden');
      next();
    }
  }

  sc.down = function (x, y) {
    if (st.phase === 'ask') {
      CHOICES.forEach(function (c, i) {
        if (Math.abs(x - (c.x + c.w - 34)) < 26 && Math.abs(y - (c.y + c.h / 2)) < 26) { S.speak(st.askOrder[i] === 0 ? ASK_GOOD : ASK_BAD); return; }
        if (S.hit(c, x, y)) chooseAsk(i);
      });
    } else if (st.phase === 'doors') {
      DOORS.forEach(function (d, i) { if (S.hit(d, x, y)) chooseDoor(i); });
    } else if (st.phase === 'toilet' && st.flush === 0) {
      if (Math.abs(x - 480) < 60 && Math.abs(y - 176) < 50) {
        st.flush = 0.01; Sound.play('flush');
      } else { S.toffiSay('Naciśnij duży guzik!', 1.6); S.speak('Naciśnij duży guzik!'); }
    } else if (st.phase === 'wash') {
      st.lastRub = { x: x, y: y };
      var hitArea = null;
      Object.keys(AREAS).forEach(function (k) { if (!hitArea && S.hit(AREAS[k], x, y)) hitArea = k; });
      if (hitArea) tapWash(hitArea);
    }
  };

  sc.move = function (x, y, pressed) {
    if (st.phase !== 'wash' || !pressed || !washStep() || washStep().id !== 'rub') return;
    if (!S.hit(AREAS.paws, x, y)) { st.lastRub = null; return; }
    if (st.lastRub) rubBy(Math.abs(x - st.lastRub.x) + Math.abs(y - st.lastRub.y));
    st.lastRub = { x: x, y: y };
  };

  sc.key = function (e, isDown) {
    if (!isDown || st.phase !== 'wash' || !washStep()) return;
    if (washStep().id === 'rub' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.code === 'Space')) { e.preventDefault(); rubBy(150); }
  };

  sc.update = function (dt) {
    st.glow += dt;
    if (st.t > 0) st.t -= dt;
    switch (st.phase) {
      case 'need': if (st.t <= 0) { setPhase('ask'); S.speak('Co powie Toffi?'); } break;
      case 'askOk': if (st.t <= 0) { setPhase('doors'); S.speak('Która toaleta jest dla dziewczynek?'); } break;
      case 'enter':
        st.doorOpen = Math.min(1, st.doorOpen + dt * 2.5);
        st.walk = Math.min(1, st.walk + dt * 1.1);
        if (st.t <= 0) { setPhase('cubicle', 2.2); Sound.play('win'); }
        break;
      case 'cubicle': if (st.t <= 0) { setPhase('toilet'); S.toffiSay('Gotowe! Teraz spłucz wodę.', 2.2); S.speak('Gotowe! Teraz spłucz wodę.'); } break;
      case 'toilet':
        if (st.flush > 0) {
          st.flush += dt;
          if (st.flush > 1.8) { setPhase('wash'); st.step = 0; startWashStep(); }
        }
        break;
      case 'wash':
        if (st.rinse > 0) {
          st.rinse += dt;
          st.foam = Math.max(0, st.foam - dt * 0.9);
          if (Math.random() < dt * 20) S.particles.burst(480 + UI.rand(-40, 40), 370, { n: 1, colors: ['#BFE6FF'], shape: 'drop', speed: 30, gravity: 400, size: 6 });
          if (st.rinse > 1.3) { st.rinse = 0; st.foam = 0; next(); }
        }
        if (st.towel > 0) {
          st.towel += dt;
          if (st.towel > 1.2) { st.towel = -1; S.particles.burst(480, 340, { n: 12, speed: 120 }); next(); }
        }
        if (st.binFly > 0) {
          st.binFly += dt * 1.6;
          if (st.binFly >= 1) {
            st.binFly = -1;
            Sound.play('friend');
            S.toffiSay('Czyste łapki!', 2);
            S.speak('Brawo! Czyste łapki!');
            st.step++;
            setPhase('back', 2.4);
          }
        }
        break;
      case 'back':
        if (st.t <= 0 && !st.thanked) {
          st.thanked = true; st.t = 2.6;
          S.toffiSay('Dziękuję, proszę Pani!', 2);
          setTimeout(function () { S.otherSpeech.say('Proszę bardzo, Toffi!', 2); S.speak('Proszę bardzo, Toffi!'); }, 1000);
        } else if (st.t <= 0 && st.thanked) {
          setPhase('done'); S.complete();
        }
        break;
    }
  };

  // ---------------------------------------------------------------------
  // Drawing
  // ---------------------------------------------------------------------
  function drawCorridor(ctx) {
    var W = S.W, H = S.H;
    ctx.fillStyle = '#FFF4D6'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#FFE3A8'; ctx.fillRect(0, 300, W, 150);
    ctx.fillStyle = '#E3D5C2'; ctx.fillRect(0, 450, W, H - 450);
    ctx.strokeStyle = '#D2C2AC'; ctx.lineWidth = 2;
    for (var x = 0; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 450); ctx.lineTo(x, H); ctx.stroke(); }
  }

  function pictogram(ctx, x, y, girl) {
    ctx.fillStyle = girl ? '#FF6F9C' : '#4E94DB';
    UI.roundRect(ctx, x - 44, y - 54, 88, 108, 16); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.arc(x, y - 28, 12, 0, 7); ctx.fill();
    if (girl) {
      ctx.beginPath(); ctx.moveTo(x, y - 14); ctx.lineTo(x + 22, y + 22); ctx.lineTo(x - 22, y + 22); ctx.closePath(); ctx.fill();
      ctx.fillRect(x - 9, y + 22, 6, 18); ctx.fillRect(x + 3, y + 22, 6, 18);
      ctx.beginPath(); ctx.moveTo(x + 10, y - 40); ctx.lineTo(x + 22, y - 46); ctx.lineTo(x + 22, y - 34); ctx.closePath(); ctx.fill();
    } else {
      UI.roundRect(ctx, x - 14, y - 14, 28, 34, 8); ctx.fill();
      ctx.fillRect(x - 11, y + 16, 8, 24); ctx.fillRect(x + 3, y + 16, 8, 24);
    }
  }

  function drawDoors(ctx) {
    drawCorridor(ctx);
    DOORS.forEach(function (d, i) {
      var girls = (i === 0) === st.girlsLeft;
      ctx.fillStyle = '#C98B5A'; UI.roundRect(ctx, d.x - 10, d.y - 10, d.w + 20, d.h + 10, 12); ctx.fill();
      ctx.fillStyle = '#5A4A3E'; ctx.fillRect(d.x, d.y, d.w, d.h);
      var open = st.door === i ? st.doorOpen : 0;
      ctx.fillStyle = girls ? '#FFD1DE' : '#CDE6FF';
      ctx.fillRect(d.x, d.y, d.w * (1 - open * 0.8), d.h);
      if (open < 0.6) {
        pictogram(ctx, d.x + d.w / 2, d.y + 90, girls);
        ctx.fillStyle = '#FFD45C'; ctx.beginPath(); ctx.arc(d.x + d.w - 24, d.y + 160, 7, 0, 7); ctx.fill();
        UI.text(ctx, girls ? 'Dziewczynki' : 'Chłopcy', d.x + d.w / 2, d.y + d.h - 34, { size: 22, color: '#5B3A29', align: 'center' });
      }
    });
    // Toffi walks to the right door
    var tx = 480, ty = 512, size = 110;
    if (st.door >= 0) {
      var d = DOORS[st.door];
      tx = 480 + (d.x + d.w / 2 - 480) * st.walk;
      ty = 512 - 70 * st.walk;
      size = 110 * (1 - st.walk * 0.4);
    }
    Toffi.draw(ctx, tx, ty, size, { anim: st.door >= 0 ? 'run' : 'wiggle', t: S.t, hat: 'bow', hatColor: '#7DBEFF', alpha: 1 - Math.max(0, st.walk - 0.8) * 5, facing: st.door === 0 ? -1 : 1 });
    S.toffiSpeech.draw(ctx, tx, ty - 110, { size: 22 });
  }

  function drawCubicle(ctx) {
    ctx.fillStyle = '#DDF3F1'; ctx.fillRect(0, 0, S.W, S.H);
    ctx.fillStyle = '#C6E8E5';
    for (var y = 0; y < 450; y += 40) for (var x = (y / 40 % 2) * 40; x < S.W; x += 80) ctx.fillRect(x, y, 40, 40);
    ctx.fillStyle = '#E6E1F0'; ctx.fillRect(0, 450, S.W, S.H - 450);
    ctx.fillStyle = '#FF9FB8'; UI.roundRect(ctx, 360, 120, 240, 340, 14); ctx.fill();
    ctx.fillStyle = '#FFB8CA'; UI.roundRect(ctx, 380, 140, 200, 300, 10); ctx.fill();
    ctx.fillStyle = '#E0404E'; ctx.beginPath(); ctx.arc(550, 290, 10, 0, 7); ctx.fill();
    // little music notes while waiting
    for (var i = 0; i < 3; i++) {
      var k = (S.t * 0.7 + i / 3) % 1;
      ctx.globalAlpha = 1 - k;
      UI.text(ctx, '♪', 620 + i * 30 + Math.sin(k * 6) * 10, 300 - k * 160, { size: 34, color: '#8A6FE0' });
    }
    ctx.globalAlpha = 1;
    UI.text(ctx, 'Tra la la...', 480, 90, { size: 30, color: '#8A6FE0', align: 'center' });
  }

  function drawToilet(ctx) {
    ctx.fillStyle = '#DDF3F1'; ctx.fillRect(0, 0, S.W, S.H);
    ctx.fillStyle = '#C6E8E5';
    for (var y = 0; y < 450; y += 40) for (var x = (y / 40 % 2) * 40; x < S.W; x += 80) ctx.fillRect(x, y, 40, 40);
    ctx.fillStyle = '#E6E1F0'; ctx.fillRect(0, 450, S.W, S.H - 450);
    // tank + big flush button
    ctx.fillStyle = '#FFFFFF'; UI.roundRect(ctx, 400, 130, 160, 110, 18); ctx.fill();
    ctx.strokeStyle = '#C9D8E0'; ctx.lineWidth = 3; ctx.stroke();
    var press = st.flush > 0 && st.flush < 0.3 ? 4 : 0;
    if (st.flush === 0) {
      ctx.fillStyle = 'rgba(255,224,102,' + (0.4 + Math.sin(S.t * 6) * 0.3) + ')';
      ctx.beginPath(); ctx.arc(480, 176, 46, 0, 7); ctx.fill();
    }
    ctx.fillStyle = '#7DBEFF'; ctx.beginPath(); ctx.arc(480, 176 + press, 32, 0, 7); ctx.fill();
    ctx.fillStyle = '#BFE6FF'; ctx.beginPath(); ctx.arc(480, 176 + press, 22, 0, 7); ctx.fill();
    // bowl
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.moveTo(400, 300); ctx.quadraticCurveTo(400, 420, 450, 420); ctx.lineTo(450, 470); ctx.lineTo(510, 470); ctx.lineTo(510, 420); ctx.quadraticCurveTo(560, 420, 560, 300); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#C9D8E0'; ctx.stroke();
    ctx.fillStyle = '#F2F2F7'; ctx.beginPath(); ctx.ellipse(480, 280, 100, 34, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#C9D8E0'; ctx.stroke();
    ctx.fillStyle = '#8FD3FF'; ctx.beginPath(); ctx.ellipse(480, 284, 64, 18, 0, 0, 7); ctx.fill();
    if (st.flush > 0) {
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3;
      for (var i = 0; i < 4; i++) {
        var a = st.flush * 9 + i * Math.PI / 2;
        ctx.beginPath(); ctx.ellipse(480, 284, 50 - st.flush * 15, 13, 0, a, a + 1.2); ctx.stroke();
      }
      UI.text(ctx, 'szszsz!', 640, 220, { size: 40, color: '#4E94DB', align: 'center', outline: '#FFFFFF' });
    }
    UI.text(ctx, 'Spłucz', 480, 104, { size: 30, color: '#4E94DB', align: 'center', outline: '#FFFFFF' });
    S.toffiSpeech.draw(ctx, 760, 300, { size: 22 });
  }

  function glowArea(ctx, key) {
    var a = AREAS[key];
    // glow only the next target: after a wrong tap or after a few idle seconds
    if (!washStep() || washStep().target !== key || !(st.hint || st.glow > 4)) return;
    ctx.fillStyle = 'rgba(255,224,102,' + (0.35 + Math.sin(S.t * 6) * 0.25) + ')';
    UI.roundRect(ctx, a.x - 8, a.y - 8, a.w + 16, a.h + 16, 22); ctx.fill();
  }

  function drawWash(ctx) {
    var W = S.W, H = S.H;
    ctx.fillStyle = '#E3F4FF'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#D0EBFB';
    for (var y = 0; y < 340; y += 40) for (var x = (y / 40 % 2) * 40; x < W; x += 80) ctx.fillRect(x, y, 40, 40);
    ctx.fillStyle = '#E6E1F0'; ctx.fillRect(0, 470, W, H - 470);
    // mirror with Toffi's reflection
    ctx.fillStyle = '#C98B5A'; UI.roundRect(ctx, 370, 84, 220, 150, 70); ctx.fill();
    ctx.fillStyle = '#DFF4FF'; UI.roundRect(ctx, 380, 94, 200, 130, 62); ctx.fill();
    ctx.save(); UI.roundRect(ctx, 380, 94, 200, 130, 62); ctx.clip();
    Toffi.draw(ctx, 480, 250, 140, { anim: st.foam > 0.5 ? 'wiggle' : 'idle', t: S.t, hat: 'bow', hatColor: '#7DBEFF', shadow: false });
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(400, 100, 18, 120);
    ctx.restore();
    // counter + basin
    ctx.fillStyle = '#F5F5FA'; UI.roundRect(ctx, 250, 330, 460, 40, 12); ctx.fill();
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.ellipse(480, 360, 140, 40, 0, 0, Math.PI); ctx.fill();
    ctx.fillStyle = '#B9C8D4'; ctx.fillRect(470, 380, 20, 90);
    ctx.fillStyle = '#C9DDEA'; ctx.beginPath(); ctx.ellipse(480, 346, 120, 20, 0, 0, 7); ctx.fill();
    // faucet
    glowArea(ctx, 'tap');
    ctx.fillStyle = '#B9C8D4'; UI.roundRect(ctx, 466, 250, 28, 30, 8); ctx.fill();
    ctx.strokeStyle = '#B9C8D4'; ctx.lineWidth = 14; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(480, 270); ctx.quadraticCurveTo(480, 300, 480, 304); ctx.stroke();
    ctx.fillStyle = st.water ? '#5FCFAE' : '#FF8FAB'; UI.roundRect(ctx, 446, 240, 68, 16, 8); ctx.fill();
    if (st.water) {
      ctx.fillStyle = 'rgba(120,200,255,0.75)';
      ctx.fillRect(472 + Math.sin(S.t * 30), 308, 16, 40);
    }
    // soap dispenser
    glowArea(ctx, 'soap');
    ctx.fillStyle = '#FF9FB8'; UI.roundRect(ctx, 620, 270, 64, 70, 16); ctx.fill();
    ctx.fillStyle = '#E0607E'; ctx.fillRect(644, 248, 16, 24); ctx.fillRect(644, 248, 34, 10);
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.arc(640, 296, 8, 0, 7); ctx.fill();
    UI.text(ctx, 'Mydło', 652, 360, { size: 18, color: '#E0607E', align: 'center' });
    // towel dispenser
    glowArea(ctx, 'towel');
    ctx.fillStyle = '#FFFFFF'; UI.roundRect(ctx, 120, 200, 130, 80, 14); ctx.fill();
    ctx.strokeStyle = '#C9D8E0'; ctx.lineWidth = 3; ctx.stroke();
    if (st.towel === 0) { ctx.fillStyle = '#FFF8E6'; ctx.fillRect(160, 276, 50, 40); }
    UI.text(ctx, 'Ręczniki', 185, 238, { size: 18, color: '#8A6450', align: 'center' });
    // bin
    glowArea(ctx, 'bin');
    ctx.fillStyle = '#9FE3C9'; UI.roundRect(ctx, 130, 412, 90, 104, 12); ctx.fill();
    ctx.fillStyle = '#5FCFAE'; UI.roundRect(ctx, 122, 404, 106, 16, 8); ctx.fill();
    // paws
    glowArea(ctx, 'paws');
    var rubbing = washStep() && washStep().id === 'rub';
    var wob = rubbing ? Math.sin(S.t * 20) * 6 : 0;
    ctx.fillStyle = '#F8B6C4';
    ctx.beginPath(); ctx.ellipse(440 + wob, 336, 38, 26, -0.3, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(520 - wob, 336, 38, 26, 0.3, 0, 7); ctx.fill();
    ctx.fillStyle = '#F48FA9';
    [[418, 318], [436, 312], [454, 314], [506, 314], [524, 312], [542, 318]].forEach(function (p) { ctx.beginPath(); ctx.arc(p[0] + (p[0] < 480 ? wob : -wob), p[1], 7, 0, 7); ctx.fill(); });
    // foam on the paws
    if (st.foam > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      var n = Math.round(4 + st.foam * 22);
      for (var i = 0; i < n; i++) {
        var fx = 400 + (i * 37) % 160, fy = 316 + (i * 23) % 44;
        ctx.beginPath(); ctx.arc(fx, fy, 6 + (i % 4) * 3 * st.foam, 0, 7); ctx.fill();
      }
    }
    // towel in the paws / flying to the bin
    if (st.towel > 0) {
      ctx.fillStyle = '#FFF8E6'; ctx.save(); ctx.translate(480, 330); ctx.rotate(Math.sin(S.t * 12) * 0.2);
      ctx.fillRect(-36, -24, 72, 48); ctx.restore();
    }
    if (st.binFly > 0) {
      var k = st.binFly;
      var bx = 480 + (175 - 480) * k, by = 330 + (420 - 330) * k - Math.sin(k * Math.PI) * 140;
      ctx.fillStyle = '#FFF8E6'; ctx.save(); ctx.translate(bx, by); ctx.rotate(k * 8); ctx.fillRect(-20, -14, 40, 28); ctx.restore();
    }
    // rub meter
    if (rubbing || (st.step > 2 && st.step < 4)) {
      ctx.fillStyle = 'rgba(255,250,242,0.95)'; UI.roundRect(ctx, 810, 150, 60, 280, 30); ctx.fill();
      var f = Math.min(1, st.rub / RUB_NEEDED);
      ctx.fillStyle = '#9FD8FF'; UI.roundRect(ctx, 820, 160 + 260 * (1 - f), 40, Math.max(20, 260 * f), 20); ctx.fill();
      for (var b = 0; b < 4; b++) { ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(840, 400 - b * 60 * f, 6, 0, 7); ctx.fill(); }
      UI.text(ctx, 'Piana', 840, 452, { size: 18, color: '#4E94DB', align: 'center' });
    }
    // step dots + hint
    var step = washStep();
    WASH.forEach(function (w, i) {
      ctx.fillStyle = i < st.step ? '#5FCFAE' : i === st.step ? '#FFC93C' : 'rgba(255,255,255,0.9)';
      ctx.beginPath(); ctx.arc(390 + i * 30, 30, 10, 0, 7); ctx.fill();
    });
    if (step) {
      ctx.fillStyle = 'rgba(255,250,242,0.96)'; UI.roundRect(ctx, 600, 84, 330, 50, 25); ctx.fill();
      UI.text(ctx, step.hint, 765, 110, { size: 21, color: '#E07B1F', align: 'center' });
    }
    S.toffiSpeech.draw(ctx, 480, 90, { size: 22 });
  }

  function drawClassroomScene(ctx) {
    S.drawClassroom(ctx);
    S.drawTeacher(ctx, 160, 452, 150, { talking: !!S.otherSpeech.str });
    var anim = st.phase === 'need' || st.phase === 'ask' ? 'wiggle' : 'sit';
    S.drawDeskKid(ctx, 850, 470, 'toffi', { size: 100, hat: 'bow', hatColor: '#7DBEFF', anim: anim });
    S.drawDeskKid(ctx, 600, 470, 'grey', { size: 84 });
    if (st.phase === 'ask') {
      UI.text(ctx, 'Co powie Toffi?', S.BOARD.x + S.BOARD.w / 2, 104, { size: 28, color: '#F4F8F0', align: 'center' });
      CHOICES.forEach(function (c, i) {
        var label = st.askOrder[i] === 0 ? ASK_GOOD : ASK_BAD;
        S.drawButton(c, '', { color: '#FFFFFF' });
        UI.text(ctx, label, c.x + 22, c.y + c.h / 2 + 2, { size: 22, color: '#5B3A29' });
        S.drawSpeaker(c.x + c.w - 34, c.y + c.h / 2, 36);
      });
    }
    S.otherSpeech.draw(ctx, 170, 268, { size: 22 });
    S.toffiSpeech.draw(ctx, 820, 360, { size: 22, maxX: 950 });
  }

  sc.render = function (ctx) {
    switch (st.phase) {
      case 'doors': case 'enter': drawDoors(ctx); break;
      case 'cubicle': drawCubicle(ctx); break;
      case 'toilet': drawToilet(ctx); break;
      case 'wash': drawWash(ctx); break;
      default: drawClassroomScene(ctx);
    }
  };

  sc.debug = function () { return st; };   // for testing from the console
  S.register(sc);
})();
