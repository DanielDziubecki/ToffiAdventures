/* =========================================================================
   ToffiSound – tiny cheerful sound effects generated with the Web Audio API.
   No audio files are used. The AudioContext is only created after the first
   user gesture (click / tap / key), so nothing plays before that.

   Usage:
     ToffiSound.play('jump');          // play a named effect
     ToffiSound.toggleMute();          // mute / unmute (remembered)
     ToffiSound.isMuted();
     ToffiSound.onChange(fn);          // called with (muted) on change
   ========================================================================= */
(function (global) {
  'use strict';

  var MUTE_KEY = 'toffi.muted';
  var ctx = null;
  var master = null;
  var muted = false;
  var listeners = [];

  try { muted = localStorage.getItem(MUTE_KEY) === '1'; } catch (e) { /* ignore */ }

  // Create / resume the audio context on the first user gesture.
  function unlock() {
    if (!ctx) {
      var AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) return;
      try {
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = muted ? 0 : 0.45;
        master.connect(ctx.destination);
      } catch (e) {
        ctx = null;
        return;
      }
    }
    if (ctx.state === 'suspended') ctx.resume();
  }
  ['pointerdown', 'touchstart', 'mousedown', 'keydown'].forEach(function (ev) {
    global.addEventListener(ev, unlock, { capture: true, passive: true });
  });

  // ---- low level helpers ------------------------------------------------

  // One oscillator note with a soft attack/decay envelope.
  function tone(freq, dur, opts) {
    if (!ctx || muted) return;
    opts = opts || {};
    var t0 = ctx.currentTime + (opts.delay || 0);
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = opts.type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (opts.slide) osc.frequency.exponentialRampToValueAtTime(opts.slide, t0 + dur);
    var vol = opts.vol == null ? 0.5 : opts.vol;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + Math.min(0.02, dur / 3));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  // A short burst of filtered noise (crunch, splash, whoosh).
  function noise(dur, opts) {
    if (!ctx || muted) return;
    opts = opts || {};
    var t0 = ctx.currentTime + (opts.delay || 0);
    var len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    var src = ctx.createBufferSource();
    src.buffer = buf;
    var filter = ctx.createBiquadFilter();
    filter.type = opts.filter || 'bandpass';
    filter.frequency.setValueAtTime(opts.freq || 1200, t0);
    if (opts.slide) filter.frequency.exponentialRampToValueAtTime(opts.slide, t0 + dur);
    filter.Q.value = opts.q || 1;
    var g = ctx.createGain();
    var vol = opts.vol == null ? 0.4 : opts.vol;
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(master);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }

  function arpeggio(freqs, step, opts) {
    freqs.forEach(function (f, i) {
      var o = Object.assign({}, opts || {});
      o.delay = (o.delay || 0) + i * step;
      tone(f, o.dur || step * 1.8, o);
    });
  }

  // ---- the sound library (tweak freely) ----------------------------------
  var SOUNDS = {
    click:  function () { tone(660, 0.07, { type: 'triangle', vol: 0.35 }); },
    pop:    function () { tone(420, 0.09, { slide: 900, vol: 0.4 }); },
    jump:   function () { tone(320, 0.16, { type: 'triangle', slide: 720, vol: 0.4 }); },
    seed:   function () { tone(990, 0.06, { vol: 0.3 }); tone(1480, 0.1, { vol: 0.3, delay: 0.05 }); },
    golden: function () { arpeggio([784, 988, 1175, 1568], 0.06, { vol: 0.3 }); },
    eat:    function () { noise(0.05, { freq: 2500, vol: 0.35 }); noise(0.05, { freq: 1800, vol: 0.3, delay: 0.08 }); tone(300, 0.08, { type: 'triangle', vol: 0.2, delay: 0.02 }); },
    bump:   function () { tone(330, 0.25, { type: 'triangle', slide: 160, vol: 0.45 }); },
    yuck:   function () { tone(220, 0.18, { type: 'square', slide: 180, vol: 0.15 }); tone(200, 0.2, { type: 'square', slide: 150, vol: 0.12, delay: 0.15 }); },
    step:   function () { tone(240, 0.05, { type: 'triangle', vol: 0.18 }); },
    push:   function () { tone(130, 0.12, { type: 'square', vol: 0.15 }); noise(0.1, { freq: 400, vol: 0.15 }); },
    whoosh: function () { noise(0.35, { freq: 400, slide: 2400, vol: 0.3, q: 2 }); },
    drawer: function () { noise(0.2, { freq: 700, slide: 300, vol: 0.25 }); tone(500, 0.06, { type: 'triangle', vol: 0.2, delay: 0.18 }); },
    star:   function () { tone(1318, 0.12, { vol: 0.3 }); tone(1976, 0.25, { vol: 0.25, delay: 0.08 }); },
    win:    function () { arpeggio([523, 659, 784, 1047, 1319], 0.1, { type: 'triangle', vol: 0.4 }); },
    over:   function () { arpeggio([659, 587, 523, 494], 0.16, { type: 'triangle', vol: 0.35 }); },
    unload: function () { arpeggio([523, 587, 659, 784, 880, 1047], 0.05, { vol: 0.3 }); },
    buy:    function () { arpeggio([880, 1109, 1319], 0.07, { type: 'triangle', vol: 0.35 }); },
    nope:   function () { tone(260, 0.12, { type: 'triangle', vol: 0.3 }); tone(220, 0.15, { type: 'triangle', vol: 0.3, delay: 0.1 }); },
    meow:   function () { tone(620, 0.4, { type: 'triangle', slide: 880, vol: 0.25 }); tone(880, 0.25, { type: 'triangle', slide: 560, vol: 0.2, delay: 0.3 }); },
    splash: function () { noise(0.35, { freq: 900, slide: 300, vol: 0.4, filter: 'lowpass' }); },
    boing:  function () { tone(180, 0.3, { slide: 700, vol: 0.4 }); },
    friend: function () { arpeggio([659, 784, 988, 1319, 1568], 0.09, { vol: 0.35 }); },
    tick:   function () { tone(1200, 0.03, { type: 'square', vol: 0.08 }); }
  };

  function setMuted(m) {
    muted = !!m;
    try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch (e) { /* ignore */ }
    if (master) master.gain.value = muted ? 0 : 0.45;
    listeners.forEach(function (fn) { fn(muted); });
  }

  global.ToffiSound = {
    play: function (name) {
      if (muted || !ctx || !SOUNDS[name]) return;
      try { SOUNDS[name](); } catch (e) { /* never break the game for a sound */ }
    },
    isMuted: function () { return muted; },
    setMuted: setMuted,
    toggleMute: function () { setMuted(!muted); return muted; },
    onChange: function (fn) { listeners.push(fn); }
  };
})(window);
