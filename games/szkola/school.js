/* =========================================================================
   "Toffi idzie do szkoły" – shared helpers for all school scenes.

   window.Szkola (S) holds:
     - the stage / canvas, particles and speech bubbles
     - S.speak(text)        reads Polish text aloud (if the browser has a
                            Polish voice and sound is on) – helps children
                            who cannot read yet
     - S.drawButton / S.hit simple canvas buttons
     - S.drawItem(ctx, name, x, y, size)  all little pictures (food, school
                            things, word pictures for the letters lesson)
     - S.drawMama / S.drawTeacher / S.drawClassroom
     - S.register(scene)    scenes in scenes/*.js register themselves
   ========================================================================= */
(function (global) {
  'use strict';

  var UI = ToffiUI, Sound = ToffiSound;
  var stage = UI.createStage();

  var S = {
    UI: UI, Sound: Sound, stage: stage, ctx: stage.ctx, W: stage.W, H: stage.H,
    particles: new UI.Particles(),
    toffiSpeech: new UI.Speech(),
    otherSpeech: new UI.Speech(),
    t: 0,
    scenes: [],
    register: function (scene) { S.scenes.push(scene); },
    complete: function () { /* set by game.js */ }
  };

  // ---------------------------------------------------------------------
  // Speech synthesis (Polish voice only; silent when muted / unavailable)
  // ---------------------------------------------------------------------
  var plVoice = null;
  function pickVoice() {
    try {
      var vs = global.speechSynthesis.getVoices();
      plVoice = vs.filter(function (v) { return /^pl/i.test(v.lang); })[0] || null;
    } catch (e) { plVoice = null; }
  }
  if ('speechSynthesis' in global) {
    pickVoice();
    try { global.speechSynthesis.addEventListener('voiceschanged', pickVoice); } catch (e) { /* old browsers */ }
  }
  S.hasVoice = function () { return !!plVoice; };
  S.speak = function (text) {
    if (!plVoice || Sound.isMuted()) return;
    try {
      global.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = 'pl-PL'; u.voice = plVoice; u.rate = 0.92; u.pitch = 1.15;
      global.speechSynthesis.speak(u);
    } catch (e) { /* ignore */ }
  };
  S.stopSpeaking = function () { try { global.speechSynthesis.cancel(); } catch (e) { /* ignore */ } };
  Sound.onChange(function (m) { if (m) S.stopSpeaking(); });

  // Mama / teacher talk: bubble + voice
  S.say = function (text, dur, voice) {
    S.otherSpeech.say(text, dur || 2.2);
    S.speak(voice || text);
  };
  S.toffiSay = function (text, dur) { S.toffiSpeech.say(text, dur || 1.6); };

  // ---------------------------------------------------------------------
  // Canvas buttons
  // ---------------------------------------------------------------------
  S.hit = function (r, x, y) { return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h; };

  // o: { color, shadow, text, size, glow, disabled, item }
  S.drawButton = function (r, label, o) {
    var ctx = S.ctx;
    o = o || {};
    var color = o.disabled ? '#E2D6C8' : (o.color || '#FFFFFF');
    var shadow = o.disabled ? '#C9B9A6' : (o.shadow || 'rgba(90,58,41,0.25)');
    if (o.glow) {
      var a = 0.35 + Math.sin(S.t * 6) * 0.25;
      ctx.fillStyle = 'rgba(255,224,102,' + a + ')';
      UI.roundRect(ctx, r.x - 8, r.y - 8, r.w + 16, r.h + 16, (o.radius || 22) + 8); ctx.fill();
    }
    ctx.fillStyle = shadow;
    UI.roundRect(ctx, r.x, r.y + 6, r.w, r.h, o.radius || 22); ctx.fill();
    ctx.fillStyle = color;
    UI.roundRect(ctx, r.x, r.y, r.w, r.h, o.radius || 22); ctx.fill();
    if (o.item) S.drawItem(ctx, o.item, r.x + r.w / 2, r.y + r.h / 2 - (label ? 10 : 0), Math.min(r.w, r.h) * (label ? 0.62 : 0.8));
    if (label) {
      UI.text(ctx, label, r.x + r.w / 2, o.item ? r.y + r.h - 16 : r.y + r.h / 2 + 2,
        { size: o.size || 30, color: o.disabled ? '#A8988A' : (o.text || '#5B3A29'), align: 'center' });
    }
  };

  // Little speaker icon (tap to hear the task again)
  S.drawSpeaker = function (x, y, s) {
    var ctx = S.ctx;
    ctx.save();
    ctx.translate(x, y); ctx.scale(s / 40, s / 40);
    ctx.fillStyle = 'rgba(255,250,242,0.95)';
    ctx.beginPath(); ctx.arc(0, 0, 22, 0, 7); ctx.fill();
    ctx.fillStyle = '#FF9F45';
    ctx.beginPath(); ctx.moveTo(-11, -5); ctx.lineTo(-5, -5); ctx.lineTo(3, -12); ctx.lineTo(3, 12); ctx.lineTo(-5, 5); ctx.lineTo(-11, 5); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#7A4A2E'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(4, 0, 8, -0.8, 0.8); ctx.stroke();
    ctx.beginPath(); ctx.arc(4, 0, 13, -0.8, 0.8); ctx.stroke();
    ctx.restore();
  };

  // ---------------------------------------------------------------------
  // Item pictures. Each is drawn in a 100×100 box centred on (x, y).
  // ---------------------------------------------------------------------
  function rr(ctx, x, y, w, h, r) { UI.roundRect(ctx, x, y, w, h, r); }
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); }
  function line(ctx, x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
  var OUT = 'rgba(90,58,41,0.55)';

  var ITEMS = {
    kanapka: function (c) {
      c.fillStyle = '#D9A15E'; rr(c, -38, -30, 76, 66, 20); c.fill();
      c.fillStyle = '#F7DDA8'; rr(c, -30, -22, 60, 50, 14); c.fill();
      c.fillStyle = '#7ED36B';
      for (var i = 0; i < 5; i++) { circle(c, -26 + i * 13, -24, 8); c.fill(); }
      c.fillStyle = '#FFD45C'; rr(c, -24, -16, 30, 24, 4); c.fill();
      c.fillStyle = '#FF6B6B'; circle(c, 14, 4, 11); c.fill();
      c.fillStyle = '#FFB0B0'; circle(c, 14, 4, 5); c.fill();
    },
    mleko: function (c) {
      c.fillStyle = 'rgba(200,230,255,0.6)';
      c.beginPath(); c.moveTo(-26, -40); c.lineTo(26, -40); c.lineTo(20, 40); c.lineTo(-20, 40); c.closePath(); c.fill();
      c.fillStyle = '#FFFFFF';
      c.beginPath(); c.moveTo(-23, -18); c.lineTo(23, -18); c.lineTo(20, 38); c.lineTo(-20, 38); c.closePath(); c.fill();
      c.strokeStyle = '#8FB8D9'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(-26, -40); c.lineTo(-20, 40); c.lineTo(20, 40); c.lineTo(26, -40); c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.8)'; rr(c, -18, -34, 6, 50, 3); c.fill();
    },
    platki: function (c) {
      c.fillStyle = '#FFD45C';
      [[-20, -8], [-6, -14], [8, -10], [22, -6], [-12, -2], [4, -2], [16, 0]].forEach(function (p) {
        circle(c, p[0], p[1], 8); c.fill();
      });
      c.fillStyle = '#E0A12A';
      [[-20, -8], [-6, -14], [8, -10], [22, -6], [-12, -2], [4, -2], [16, 0]].forEach(function (p) { circle(c, p[0], p[1], 3); c.fill(); });
      c.fillStyle = '#FF8FAB';
      c.beginPath(); c.moveTo(-42, 0); c.lineTo(42, 0); c.quadraticCurveTo(38, 38, 0, 38); c.quadraticCurveTo(-38, 38, -42, 0); c.fill();
      c.fillStyle = '#FFFFFF'; rr(c, -42, -3, 84, 7, 3); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.4)'; circle(c, -18, 16, 6); c.fill();
    },
    banan: function (c) {
      c.fillStyle = '#FFE066';
      c.beginPath(); c.moveTo(-36, -24); c.quadraticCurveTo(-30, 32, 36, 22); c.quadraticCurveTo(-8, 20, -22, -30); c.closePath(); c.fill();
      c.strokeStyle = '#D9A615'; c.lineWidth = 3; c.stroke();
      c.fillStyle = '#7A5A2A'; circle(c, -30, -28, 4); c.fill(); circle(c, 36, 22, 3); c.fill();
    },
    jajko: function (c) {
      c.fillStyle = '#7DBEFF';
      c.beginPath(); c.moveTo(-22, 10); c.lineTo(22, 10); c.lineTo(14, 36); c.lineTo(-14, 36); c.closePath(); c.fill();
      rr(c, -20, 34, 40, 8, 4); c.fill();
      c.fillStyle = '#FFF6E6';
      c.beginPath(); c.ellipse(0, -6, 22, 30, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = OUT; c.lineWidth = 2; c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.9)'; c.beginPath(); c.ellipse(-8, -18, 5, 9, -0.3, 0, 7); c.fill();
    },
    jablko: function (c) { UI.drawApple(c, 0, 4, 80, 0); },
    marchewka: function (c) { UI.drawCarrot(c, 0, 4, 84, 0.5); },
    cukierek: function (c) {
      c.fillStyle = '#FF8FAB';
      c.beginPath(); c.moveTo(-22, 0); c.lineTo(-44, -18); c.lineTo(-44, 18); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(22, 0); c.lineTo(44, -18); c.lineTo(44, 18); c.closePath(); c.fill();
      circle(c, 0, 0, 24); c.fill();
      c.strokeStyle = '#FFFFFF'; c.lineWidth = 5;
      for (var i = -1; i <= 1; i++) line(c, -14 + i * 12, -18, 4 + i * 12, 18);
    },
    lody: function (c) {
      c.fillStyle = '#E9B872';
      c.beginPath(); c.moveTo(-22, -4); c.lineTo(22, -4); c.lineTo(0, 44); c.closePath(); c.fill();
      c.strokeStyle = '#C98B4A'; c.lineWidth = 2;
      line(c, -12, 4, 8, 30); line(c, 12, 4, -8, 30);
      c.fillStyle = '#9FE3C9'; circle(c, -10, -12, 16); c.fill();
      c.fillStyle = '#FFB3C7'; circle(c, 10, -16, 17); c.fill();
      c.fillStyle = '#FF5C8A'; circle(c, 6, -36, 6); c.fill();
    },
    piornik: function (c) {
      c.fillStyle = '#FF8A3D'; rr(c, -40, -8, 30, 10, 3); c.fill();
      c.fillStyle = '#7DBEFF'; rr(c, -10, -14, 22, 10, 3); c.fill();
      c.fillStyle = '#5FCFAE'; rr(c, -46, -4, 92, 40, 18); c.fill();
      c.strokeStyle = '#3BA585'; c.lineWidth = 3; line(c, -40, 4, 40, 4);
      c.fillStyle = '#FFD45C'; rr(c, 30, 0, 10, 14, 3); c.fill();
      UI.drawStar(c, -18, 22, 7, '#FFFFFF');
    },
    sniadaniowka: function (c) {
      c.fillStyle = '#FF8FAB'; rr(c, -42, -22, 84, 56, 14); c.fill();
      c.fillStyle = '#FFB3C7'; rr(c, -42, -22, 84, 18, 10); c.fill();
      c.strokeStyle = '#E0607E'; c.lineWidth = 5; c.beginPath(); c.arc(0, -24, 12, Math.PI, 0); c.stroke();
      UI.drawApple(c, 0, 14, 30, 0);
    },
    bidon: function (c) {
      c.fillStyle = '#7DBEFF'; rr(c, -18, -30, 36, 72, 12); c.fill();
      c.fillStyle = '#4E94DB'; rr(c, -12, -44, 24, 16, 5); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.6)'; rr(c, -12, -22, 6, 50, 3); c.fill();
    },
    ksiazka: function (c) {
      c.fillStyle = '#FFFFFF'; rr(c, -34, -36, 70, 76, 6); c.fill();
      c.fillStyle = '#E0607E'; rr(c, -40, -40, 70, 76, 8); c.fill();
      c.fillStyle = '#FFE7A8'; rr(c, -30, -26, 50, 20, 4); c.fill();
      UI.text(c, 'ABC', -5, -15, { size: 16, color: '#E0607E', align: 'center' });
      UI.drawStar(c, -5, 16, 10, '#FFD45C');
    },
    kredki: function (c) {
      ['#FF6B6B', '#FFD45C', '#5FCFAE', '#7DBEFF', '#B49CFF'].forEach(function (col, i) {
        c.save(); c.rotate(-0.5 + i * 0.25);
        c.fillStyle = col; rr(c, -6, -34, 12, 56, 3); c.fill();
        c.fillStyle = '#F6D7A8'; c.beginPath(); c.moveTo(-6, -34); c.lineTo(6, -34); c.lineTo(0, -46); c.closePath(); c.fill();
        c.fillStyle = col; c.beginPath(); c.moveTo(-2, -42); c.lineTo(2, -42); c.lineTo(0, -46); c.closePath(); c.fill();
        c.restore();
      });
    },
    liczydlo: function (c) {
      c.fillStyle = '#C98B5A'; rr(c, -44, -40, 88, 80, 10); c.fill();
      c.fillStyle = '#FFF4E0'; rr(c, -36, -32, 72, 64, 6); c.fill();
      var cols = ['#FF6B6B', '#FFD45C', '#5FCFAE'];
      for (var r = 0; r < 3; r++) {
        c.strokeStyle = '#A9744F'; c.lineWidth = 2; line(c, -36, -18 + r * 20, 36, -18 + r * 20);
        c.fillStyle = cols[r];
        for (var b = 0; b < 4; b++) { circle(c, -26 + b * 12 + (b > 1 ? 16 : 0), -18 + r * 20, 6); c.fill(); }
      }
    },
    trampki: function (c) {
      c.fillStyle = '#FF6B6B'; rr(c, -44, 18, 90, 12, 6); c.fill();
      c.fillStyle = '#FFFFFF';
      c.beginPath(); c.moveTo(-42, 20); c.lineTo(-40, -14); c.quadraticCurveTo(-20, -26, -8, -10); c.lineTo(30, 4); c.quadraticCurveTo(46, 8, 44, 20); c.closePath(); c.fill();
      c.strokeStyle = OUT; c.lineWidth = 2; c.stroke();
      c.strokeStyle = '#7DBEFF'; c.lineWidth = 4; line(c, -30, 8, -6, 0); line(c, -24, 14, 4, 6);
      c.strokeStyle = '#B49CFF'; c.lineWidth = 2; line(c, -14, -12, -6, -4); line(c, -20, -8, -10, 0);
    },
    mis: function (c) {
      c.fillStyle = '#B07A4F';
      circle(c, -20, -30, 11); c.fill(); circle(c, 20, -30, 11); c.fill();
      circle(c, 0, 18, 26); c.fill(); circle(c, 0, -16, 24); c.fill();
      c.fillStyle = '#E9C9A0'; circle(c, 0, -8, 11); c.fill(); circle(c, 0, 22, 14); c.fill();
      c.fillStyle = '#2B1C14'; circle(c, -9, -20, 3.5); c.fill(); circle(c, 9, -20, 3.5); c.fill(); circle(c, 0, -11, 3.5); c.fill();
      c.fillStyle = '#FF8FAB'; c.beginPath(); c.moveTo(-10, 0); c.lineTo(10, 0); c.lineTo(0, 7); c.closePath(); c.fill();
    },
    pilka: function (c) {
      var cols = ['#FF6B6B', '#FFFFFF', '#7DBEFF', '#FFFFFF', '#FFD45C', '#FFFFFF'];
      for (var i = 0; i < 6; i++) {
        c.fillStyle = cols[i];
        c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 38, i * Math.PI / 3, (i + 1) * Math.PI / 3); c.closePath(); c.fill();
      }
      c.strokeStyle = OUT; c.lineWidth = 2; circle(c, 0, 0, 38); c.stroke();
      c.fillStyle = '#FFFFFF'; circle(c, 0, 0, 7); c.fill();
    },
    auto: function (c) {
      c.fillStyle = '#FF6B6B';
      c.beginPath(); c.moveTo(-44, 14); c.lineTo(-44, -2); c.lineTo(-24, -6); c.lineTo(-12, -26); c.lineTo(20, -26); c.lineTo(32, -6); c.lineTo(44, -2); c.lineTo(44, 14); c.closePath(); c.fill();
      c.fillStyle = '#BEE6FF'; rr(c, -10, -21, 13, 15, 3); c.fill(); rr(c, 7, -21, 13, 15, 3); c.fill();
      c.fillStyle = '#3B3A4A'; circle(c, -24, 16, 11); c.fill(); circle(c, 24, 16, 11); c.fill();
      c.fillStyle = '#D9D9E3'; circle(c, -24, 16, 4); c.fill(); circle(c, 24, 16, 4); c.fill();
      c.fillStyle = '#FFE066'; circle(c, 40, 4, 3); c.fill();
    },
    arbuz: function (c) {
      c.fillStyle = '#5DBB63'; c.beginPath(); c.moveTo(-44, -10); c.arc(0, -10, 44, 0, Math.PI); c.fill();
      c.fillStyle = '#FFF1DC'; c.beginPath(); c.moveTo(-38, -10); c.arc(0, -10, 38, 0, Math.PI); c.fill();
      c.fillStyle = '#FF5A6E'; c.beginPath(); c.moveTo(-34, -10); c.arc(0, -10, 34, 0, Math.PI); c.fill();
      c.fillStyle = '#2B1C14';
      [[-16, 2], [0, 8], [16, 2], [-6, 16], [8, 18]].forEach(function (p) { c.beginPath(); c.ellipse(p[0], p[1], 2.5, 4, 0, 0, 7); c.fill(); });
    },
    dom: function (c) {
      c.fillStyle = '#FFE0B0'; rr(c, -32, -6, 64, 48, 4); c.fill();
      c.fillStyle = '#FF6B6B'; c.beginPath(); c.moveTo(-42, -4); c.lineTo(0, -42); c.lineTo(42, -4); c.closePath(); c.fill();
      c.fillStyle = '#8A5A3B'; rr(c, -8, 14, 16, 28, 3); c.fill();
      c.fillStyle = '#BEE6FF'; rr(c, -26, 4, 13, 13, 2); c.fill(); rr(c, 13, 4, 13, 13, 2); c.fill();
    },
    kot: function (c) {
      c.fillStyle = '#A9AFC4';
      c.beginPath(); c.moveTo(-34, -4); c.lineTo(-30, -42); c.lineTo(-8, -26); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(34, -4); c.lineTo(30, -42); c.lineTo(8, -26); c.closePath(); c.fill();
      c.beginPath(); c.ellipse(0, 0, 38, 32, 0, 0, 7); c.fill();
      c.fillStyle = '#F7B6C8';
      c.beginPath(); c.moveTo(-26, -18); c.lineTo(-25, -34); c.lineTo(-14, -26); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(26, -18); c.lineTo(25, -34); c.lineTo(14, -26); c.closePath(); c.fill();
      c.fillStyle = '#9BE07A'; circle(c, -13, -4, 7); c.fill(); circle(c, 13, -4, 7); c.fill();
      c.fillStyle = '#2B2638'; c.beginPath(); c.ellipse(-13, -4, 2.5, 6, 0, 0, 7); c.ellipse(13, -4, 2.5, 6, 0, 0, 7); c.fill();
      c.fillStyle = '#F07C9C'; c.beginPath(); c.moveTo(-5, 8); c.lineTo(5, 8); c.lineTo(0, 13); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(60,50,80,0.6)'; c.lineWidth = 1.5;
      line(c, -16, 12, -40, 8); line(c, -16, 16, -40, 18); line(c, 16, 12, 40, 8); line(c, 16, 16, 40, 18);
    },
    ryba: function (c) {
      c.fillStyle = '#FF9F45';
      c.beginPath(); c.moveTo(24, 0); c.lineTo(44, -18); c.lineTo(44, 18); c.closePath(); c.fill();
      c.beginPath(); c.ellipse(-4, 0, 32, 22, 0, 0, 7); c.fill();
      c.fillStyle = '#FFC98A'; c.beginPath(); c.ellipse(-4, 8, 22, 9, 0, 0, 7); c.fill();
      c.fillStyle = '#FFFFFF'; circle(c, -20, -6, 7); c.fill();
      c.fillStyle = '#2B1C14'; circle(c, -21, -6, 3.5); c.fill();
      c.strokeStyle = '#E07B1F'; c.lineWidth = 2.5; c.beginPath(); c.arc(4, 0, 12, -1, 1); c.stroke();
    },
    slonce: function (c) {
      c.fillStyle = '#FFC93C';
      for (var i = 0; i < 10; i++) {
        c.save(); c.rotate(i * Math.PI / 5);
        c.beginPath(); c.moveTo(-6, -30); c.lineTo(0, -46); c.lineTo(6, -30); c.closePath(); c.fill();
        c.restore();
      }
      c.fillStyle = '#FFE066'; circle(c, 0, 0, 28); c.fill();
      c.fillStyle = '#7A4A2E'; circle(c, -9, -5, 3); c.fill(); circle(c, 9, -5, 3); c.fill();
      c.strokeStyle = '#7A4A2E'; c.lineWidth = 2.5; c.beginPath(); c.arc(0, 2, 10, 0.3, Math.PI - 0.3); c.stroke();
      c.fillStyle = 'rgba(255,130,150,0.45)'; circle(c, -16, 6, 5); c.fill(); circle(c, 16, 6, 5); c.fill();
    },
    ser: function (c) {
      c.fillStyle = '#FFD45C';
      c.beginPath(); c.moveTo(-42, 26); c.lineTo(42, 26); c.lineTo(42, -6); c.lineTo(-42, -30); c.closePath(); c.fill();
      c.fillStyle = '#F2B92E'; c.beginPath(); c.moveTo(-42, -30); c.lineTo(42, -6); c.lineTo(42, -2); c.lineTo(-42, -26); c.fill();
      c.fillStyle = '#E8A817'; circle(c, -14, 8, 7); c.fill(); circle(c, 16, 12, 5); c.fill(); circle(c, 24, -2, 4); c.fill(); circle(c, -28, 14, 4); c.fill();
    },
    balon: function (c) {
      c.strokeStyle = '#7A4A2E'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(0, 22); c.quadraticCurveTo(8, 34, -2, 46); c.stroke();
      c.fillStyle = '#FF6B8A'; c.beginPath(); c.ellipse(0, -10, 26, 32, 0, 0, 7); c.fill();
      c.beginPath(); c.moveTo(-5, 22); c.lineTo(5, 22); c.lineTo(0, 16); c.closePath(); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.ellipse(-10, -22, 5, 9, -0.4, 0, 7); c.fill();
    },
    tornister: function (c) {
      c.fillStyle = '#B49CFF'; rr(c, -36, -34, 72, 78, 18); c.fill();
      c.fillStyle = '#9A80EA'; rr(c, -36, -34, 72, 34, 16); c.fill();
      c.fillStyle = '#FFD45C'; rr(c, -8, -6, 16, 12, 4); c.fill();
      c.fillStyle = '#D2C3FF'; rr(c, -24, 14, 48, 22, 8); c.fill();
      UI.drawStar(c, 0, 25, 7, '#FFFFFF');
      c.strokeStyle = '#8A6FE0'; c.lineWidth = 5; c.beginPath(); c.arc(0, -36, 10, Math.PI, 0); c.stroke();
    },
    rower: function (c) {
      c.strokeStyle = '#3B3A4A'; c.lineWidth = 5;
      circle(c, -26, 14, 18); c.stroke(); circle(c, 26, 14, 18); c.stroke();
      c.strokeStyle = '#FF6B8A'; c.lineWidth = 5; c.lineJoin = 'round';
      c.beginPath(); c.moveTo(-26, 14); c.lineTo(-6, -14); c.lineTo(20, -14); c.lineTo(26, 14); c.moveTo(-6, -14); c.lineTo(2, 14); c.lineTo(-26, 14); c.moveTo(2, 14); c.lineTo(20, -14); c.stroke();
      c.strokeStyle = '#3B3A4A'; c.lineWidth = 4; line(c, 20, -14, 16, -26); line(c, 10, -26, 22, -26);
      c.fillStyle = '#3B3A4A'; rr(c, -14, -22, 16, 6, 3); c.fill();
    },
    mydlo: function (c) {
      c.fillStyle = '#9FE3C9'; rr(c, -34, -10, 68, 40, 16); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.5)'; rr(c, -26, -4, 30, 8, 4); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.9)'; c.strokeStyle = '#9FD3F0'; c.lineWidth = 2;
      [[-18, -24, 10], [4, -30, 13], [24, -20, 8], [12, -44, 6]].forEach(function (b) { circle(c, b[0], b[1], b[2]); c.fill(); c.stroke(); });
    }
  };

  S.ITEM_NAMES = {
    kanapka: 'Kanapka', mleko: 'Mleko', platki: 'Płatki', banan: 'Banan', jajko: 'Jajko', jablko: 'Jabłko',
    marchewka: 'Marchewka', cukierek: 'Cukierek', lody: 'Lody', piornik: 'Piórnik', sniadaniowka: 'Śniadaniówka',
    bidon: 'Bidon', ksiazka: 'Książka', kredki: 'Kredki', liczydlo: 'Liczydło', trampki: 'Trampki', mis: 'Miś',
    pilka: 'Piłka', auto: 'Auto', arbuz: 'Arbuz', dom: 'Dom', kot: 'Kot', ryba: 'Ryba', slonce: 'Słońce',
    ser: 'Ser', balon: 'Balon', tornister: 'Tornister', rower: 'Rower', mydlo: 'Mydło'
  };

  S.drawItem = function (ctx, name, x, y, size, rot) {
    var fn = ITEMS[name];
    if (!fn) return;
    ctx.save();
    ctx.translate(x, y);
    if (rot) ctx.rotate(rot);
    ctx.scale(size / 100, size / 100);
    ctx.lineCap = 'round';
    fn(ctx);
    ctx.restore();
  };

  // A picture as an <img> for HTML screens (plan, stickers)
  S.itemImage = function (name, px, bg) {
    var c = document.createElement('canvas');
    c.width = c.height = px * 2;
    var x = c.getContext('2d');
    if (bg) { x.fillStyle = bg; x.beginPath(); x.arc(px, px, px - 2, 0, 7); x.fill(); }
    if (name === 'toffi') Toffi.draw(x, px, px * 1.72, px * 1.25, { t: 1 });
    else S.drawItem(x, name, px, px, px * 1.5);
    return c.toDataURL();
  };

  // ---------------------------------------------------------------------
  // Characters
  // ---------------------------------------------------------------------
  S.drawMama = function (ctx, x, y, size, o) {
    Toffi.draw(ctx, x, y, size, Object.assign({ palette: 'mama', hat: 'bow', hatColor: '#FF6F9C', t: S.t }, o || {}));
  };

  // Pani Królik – a kind rabbit teacher with round glasses
  S.drawTeacher = function (ctx, x, y, size, o) {
    o = o || {};
    var k = size / 100, t = S.t;
    var sway = Math.sin(t * 2) * 0.05;
    ctx.save();
    ctx.translate(x, y); ctx.scale(k * (o.facing || 1), k);
    ctx.fillStyle = 'rgba(40,20,10,0.18)';
    ctx.beginPath(); ctx.ellipse(0, 0, 40, 7, 0, 0, 7); ctx.fill();
    // ears
    [[-14, -0.12 + sway], [14, 0.12 - sway]].forEach(function (e) {
      ctx.save(); ctx.translate(e[0], -118); ctx.rotate(e[1]);
      ctx.fillStyle = '#EDEAF2'; ctx.beginPath(); ctx.ellipse(0, -30, 12, 36, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#F7B6C8'; ctx.beginPath(); ctx.ellipse(0, -28, 6, 28, 0, 0, 7); ctx.fill();
      ctx.restore();
    });
    // body with a lavender cardigan
    ctx.fillStyle = '#B49CFF';
    ctx.beginPath(); ctx.ellipse(0, -40, 38, 42, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.ellipse(0, -36, 16, 34, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#FFD45C';
    [-48, -34, -20].forEach(function (b) { ctx.beginPath(); ctx.arc(10, b, 3, 0, 7); ctx.fill(); });
    // feet
    ctx.fillStyle = '#EDEAF2';
    ctx.beginPath(); ctx.ellipse(-16, -3, 14, 7, 0, 0, 7); ctx.ellipse(16, -3, 14, 7, 0, 0, 7); ctx.fill();
    // head
    ctx.fillStyle = '#EDEAF2';
    ctx.beginPath(); ctx.ellipse(0, -100, 34, 30, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.ellipse(0, -90, 16, 12, 0, 0, 7); ctx.fill();
    // eyes + glasses
    var blink = (t % 4) < 0.12;
    ctx.fillStyle = '#2B1C14';
    if (blink) { ctx.fillRect(-17, -106, 10, 2.5); ctx.fillRect(7, -106, 10, 2.5); }
    else { ctx.beginPath(); ctx.arc(-12, -105, 4.5, 0, 7); ctx.arc(12, -105, 4.5, 0, 7); ctx.fill(); }
    ctx.strokeStyle = '#8A6450'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(-12, -105, 10, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.arc(12, -105, 10, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-2, -105); ctx.lineTo(2, -105); ctx.stroke();
    // nose, teeth, smile
    ctx.fillStyle = '#F07C9C';
    ctx.beginPath(); ctx.ellipse(0, -94, 5, 3.5, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#7A4A2E'; ctx.lineWidth = 2;
    if (o.talking && Math.sin(t * 14) > 0) {
      ctx.fillStyle = '#C2486A'; ctx.beginPath(); ctx.ellipse(0, -84, 6, 4, 0, 0, 7); ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(0, -88, 7, 0.3, Math.PI - 0.3); ctx.stroke();
    }
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(-3.5, -89, 7, 6);
    ctx.fillStyle = 'rgba(255,130,150,0.4)';
    ctx.beginPath(); ctx.ellipse(-22, -92, 6, 4, 0, 0, 7); ctx.ellipse(22, -92, 6, 4, 0, 0, 7); ctx.fill();
    // pointer stick
    if (o.pointer) {
      ctx.strokeStyle = '#A9744F'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(30, -50); ctx.lineTo(70, -110 + Math.sin(t * 3) * 6); ctx.stroke();
    }
    ctx.restore();
  };

  // Classroom: wall, windows, green board, letter bunting, wooden floor
  S.BOARD = { x: 250, y: 84, w: 470, h: 250 };
  S.drawClassroom = function (ctx, board) {
    var W = S.W, H = S.H;
    board = board || S.BOARD;
    ctx.fillStyle = '#DDF3E8'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#CDEBDC'; ctx.fillRect(0, 330, W, 120);
    ctx.fillStyle = '#E9C8A0'; ctx.fillRect(0, 450, W, H - 450);
    ctx.fillStyle = '#D9B286';
    for (var x = 0; x < W; x += 80) ctx.fillRect(x, 450, 3, H - 450);
    ctx.fillRect(0, 448, W, 4);
    // window
    ctx.fillStyle = '#FFFFFF'; UI.roundRect(ctx, 780, 100, 150, 170, 10); ctx.fill();
    var sky = ctx.createLinearGradient(0, 108, 0, 262);
    sky.addColorStop(0, '#9FD8FF'); sky.addColorStop(1, '#E6F6FF');
    ctx.fillStyle = sky; UI.roundRect(ctx, 788, 108, 134, 154, 6); ctx.fill();
    ctx.fillStyle = '#FFE066'; ctx.beginPath(); ctx.arc(890, 140, 16, 0, 7); ctx.fill();
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(851, 108, 8, 154); ctx.fillRect(788, 182, 134, 8);
    // letter bunting
    var letters = 'ABCDEFGHIJKLŁ';
    ctx.strokeStyle = '#A9744F'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, 26); ctx.quadraticCurveTo(W / 2, 50, W, 26); ctx.stroke();
    var cols = ['#FF8FAB', '#FFD45C', '#7DBEFF', '#5FCFAE', '#B49CFF'];
    for (var i = 0; i < letters.length; i++) {
      var fx = 90 + i * 62, fy = 30 + Math.sin(fx / W * Math.PI) * 16;
      ctx.fillStyle = cols[i % cols.length];
      ctx.beginPath(); ctx.moveTo(fx - 18, fy); ctx.lineTo(fx + 18, fy); ctx.lineTo(fx, fy + 34); ctx.closePath(); ctx.fill();
      UI.text(ctx, letters[i], fx, fy + 11, { size: 16, color: '#FFFFFF', align: 'center' });
    }
    // board
    ctx.fillStyle = '#A9744F'; UI.roundRect(ctx, board.x - 12, board.y - 12, board.w + 24, board.h + 24, 14); ctx.fill();
    ctx.fillStyle = '#2F6B4F'; UI.roundRect(ctx, board.x, board.y, board.w, board.h, 8); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(board.x + 20, board.y + 20, board.w * 0.4, 6);
    ctx.fillStyle = '#C98B5A'; ctx.fillRect(board.x + 10, board.y + board.h + 6, board.w - 20, 8);
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(board.x + 40, board.y + board.h + 2, 18, 6);
    ctx.fillStyle = '#FFB3C7'; ctx.fillRect(board.x + 70, board.y + board.h + 2, 14, 6);
  };

  // Desk with a hamster sitting behind it
  S.drawDeskKid = function (ctx, x, y, palette, o) {
    o = o || {};
    Toffi.draw(ctx, x, y + 6, o.size || 90, Object.assign({ anim: 'sit', palette: palette, t: S.t + x * 0.01, shadow: false }, o));
    ctx.fillStyle = '#C98B5A'; UI.roundRect(ctx, x - 70, y - 26, 140, 18, 6); ctx.fill();
    ctx.fillStyle = '#B07446'; ctx.fillRect(x - 62, y - 10, 12, 60); ctx.fillRect(x + 50, y - 10, 12, 60);
  };

  global.Szkola = S;
})(window);
