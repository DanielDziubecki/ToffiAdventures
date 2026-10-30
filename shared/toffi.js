/* =========================================================================
   Toffi – the shared hamster character, drawn only with canvas shapes.

   Toffi.draw(ctx, x, y, size, opts)
     x, y   : position of the point between Toffi's feet (on the ground)
     size   : body width in pixels (about 100 = normal)
     opts   : {
       anim    : 'idle' | 'run' | 'jump' | 'fall' | 'wiggle' | 'eat' |
                 'wave' | 'sleep' | 'hurt' | 'sit'
       t       : time in seconds (drives the animation)
       facing  : 1 (right) or -1 (left)
       cheeks  : 0..1 extra cheek puff (eating / full cheeks)
       round   : 0..1 makes the whole body rounder (full of food)
       palette : 'toffi' | 'grey' | 'choco' | 'snow'  (friend hamsters)
       alpha   : 0..1 transparency
       shadow  : false to hide the ground shadow
       noBlink : true to disable automatic blinking
     }

   Toffi.mount(canvas, opts) animates Toffi inside a small canvas (menus,
   start screens). Returns { set(opts), stop() }.
   ========================================================================= */
(function (global) {
  'use strict';

  var PALETTES = {
    toffi: { fur: '#F4A23C', furLight: '#FFC977', furDark: '#D8802C', belly: '#FFF2DC', cheek: '#FFFFFF', ear: '#F48FA9', paw: '#F8B6C4', nose: '#EE6F92', blush: 'rgba(255,120,150,0.35)' },
    grey:  { fur: '#A7A1B6', furLight: '#D2CDDD', furDark: '#827C94', belly: '#F5F2FA', cheek: '#FFFFFF', ear: '#F2A3B8', paw: '#F6C0CC', nose: '#E8789A', blush: 'rgba(255,120,150,0.3)' },
    choco: { fur: '#A06C4A', furLight: '#C79470', furDark: '#7C4F34', belly: '#F6E3CF', cheek: '#FFF7EE', ear: '#EE98AE', paw: '#F2B7C2', nose: '#E46C8E', blush: 'rgba(255,120,150,0.3)' },
    snow:  { fur: '#F3EEE6', furLight: '#FFFFFF', furDark: '#D8CFC2', belly: '#FFFFFF', cheek: '#FFFFFF', ear: '#F5A5B9', paw: '#F8C3CF', nose: '#EE7898', blush: 'rgba(255,120,150,0.35)' }
  };

  function ellipse(ctx, x, y, rx, ry, rot) {
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, Math.PI * 2);
  }

  // ---------------------------------------------------------------------
  // Main drawing routine. All shapes are laid out in a 100-unit box with
  // the origin between the feet; the whole thing is scaled to `size`.
  // ---------------------------------------------------------------------
  function draw(ctx, x, y, size, o) {
    o = o || {};
    var t = o.t || 0;
    var anim = o.anim || 'idle';
    var facing = o.facing === -1 ? -1 : 1;
    var p = o.colors || PALETTES[o.palette] || PALETTES.toffi;
    var cheeks = o.cheeks || 0;
    var round = o.round || 0;
    var k = size / 100;

    // Animation parameters
    var bob = 0, sx = 1, sy = 1, rot = 0;
    var liftL = 0, liftR = 0;          // foot lift
    var eyes = 'open';                  // open | closed | happy | squeeze
    var arms = 'rest';                  // rest | up | wave
    var wave = 0;
    var mouth = 'smile';                // smile | open | chew | o | none
    var br;

    switch (anim) {
      case 'idle':
        br = Math.sin(t * 2.6);
        sy = 1 + 0.03 * br; sx = 1 - 0.02 * br;
        break;
      case 'sit':
        br = Math.sin(t * 2);
        sy = 0.97 + 0.02 * br; sx = 1.03 - 0.015 * br;
        break;
      case 'run':
        var ph = t * 15;
        bob = -Math.abs(Math.sin(ph)) * 9;
        liftL = Math.max(0, Math.sin(ph)) * 7;
        liftR = Math.max(0, -Math.sin(ph)) * 7;
        rot = 0.06;
        sy = 1 - 0.04 * Math.cos(ph * 2); sx = 1 + 0.03 * Math.cos(ph * 2);
        break;
      case 'jump':
        sy = 1.09; sx = 0.93; liftL = liftR = 5; arms = 'up'; mouth = 'open';
        break;
      case 'fall':
        sy = 1.03; sx = 0.98; liftL = liftR = 3; arms = 'up';
        break;
      case 'wiggle':
        rot = Math.sin(t * 16) * 0.13;
        bob = -Math.abs(Math.sin(t * 8)) * 8;
        eyes = 'happy'; arms = 'up'; mouth = 'open';
        break;
      case 'eat':
        var ch = Math.sin(t * 18);
        cheeks = Math.max(cheeks, 0.8) + ch * 0.06;
        sy = 1 + 0.02 * ch; mouth = 'chew';
        break;
      case 'wave':
        br = Math.sin(t * 2.6);
        sy = 1 + 0.02 * br; sx = 1 - 0.015 * br;
        arms = 'wave'; wave = Math.sin(t * 9) * 0.55; mouth = 'open';
        break;
      case 'sleep':
        sy = 0.95 + 0.035 * Math.sin(t * 1.6); sx = 1.05;
        eyes = 'closed'; mouth = 'none';
        break;
      case 'hurt':
        rot = Math.sin(t * 30) * 0.06; eyes = 'squeeze'; mouth = 'o';
        break;
    }
    if (eyes === 'open' && !o.noBlink && (t % 3.7) < 0.13) eyes = 'closed';

    // Body size (round = fuller hamster)
    var W = 48 * sx * (1 + round * 0.3);
    var H = 40 * sy * (1 + round * 0.14);
    var cx = 0, cy = -4 - H;           // body centre
    var fx = cx + 13 * (1 + round * 0.2), fy = cy - 6;   // face centre

    ctx.save();
    ctx.translate(x, y);
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;

    // Ground shadow (does not bob)
    if (o.shadow !== false) {
      ctx.fillStyle = 'rgba(40,20,10,0.18)';
      ellipse(ctx, 0, 0, 42 * k * (1 + round * 0.3) * (1 + bob / 60), 7 * k);
      ctx.fill();
    }

    ctx.scale(k * facing, k);
    ctx.translate(0, bob);
    // rotate around body centre
    ctx.translate(0, cy); ctx.rotate(rot); ctx.translate(0, -cy);

    ctx.lineWidth = 2.2;
    ctx.strokeStyle = 'rgba(90,50,25,0.35)';

    // --- Ears (behind body) ---
    [[-20, -0.86, 1], [21, -0.9, 0.95]].forEach(function (e) {
      var ex = cx + e[0] * (1 + round * 0.15), ey = cy + H * e[1];
      ctx.fillStyle = p.fur;
      ellipse(ctx, ex, ey, 12 * e[2], 11 * e[2]); ctx.fill(); ctx.stroke();
      ctx.fillStyle = p.ear;
      ellipse(ctx, ex, ey + 1, 7 * e[2], 6.5 * e[2]); ctx.fill();
    });

    // --- Tail ---
    ctx.fillStyle = p.furDark;
    ellipse(ctx, cx - W + 3, cy + H * 0.35, 7, 6); ctx.fill();

    // --- Feet (behind body) ---
    ctx.fillStyle = p.paw;
    ellipse(ctx, cx - 18, -4 - liftL, 11, 6.5); ctx.fill(); ctx.stroke();
    ellipse(ctx, cx + 20, -4 - liftR, 11, 6.5); ctx.fill(); ctx.stroke();

    // --- Arms raised / waving go behind the cheeks but outside the body ---
    function arm(ax, ay, angle) {
      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate(angle);
      ctx.fillStyle = p.fur;
      ellipse(ctx, 0, -11, 8, 14); ctx.fill(); ctx.stroke();
      ctx.fillStyle = p.paw;
      ellipse(ctx, 0, -23, 7, 6); ctx.fill();
      ctx.restore();
    }
    if (arms === 'up') {
      arm(cx - W * 0.72, cy - H * 0.1, -0.7);
      arm(cx + W * 0.78, cy - H * 0.12, 0.7);
    } else if (arms === 'wave') {
      arm(cx + W * 0.8, cy - H * 0.3, 0.35 + wave);
    }

    // --- Body ---
    var g = ctx.createRadialGradient(cx - W * 0.3, cy - H * 0.55, 4, cx, cy, W * 1.25);
    g.addColorStop(0, p.furLight);
    g.addColorStop(0.55, p.fur);
    g.addColorStop(1, p.furDark);
    ctx.fillStyle = g;
    ellipse(ctx, cx, cy, W, H); ctx.fill(); ctx.stroke();

    // little fur tuft on top
    ctx.strokeStyle = p.furDark;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx + 2, cy - H + 1); ctx.quadraticCurveTo(cx + 4, cy - H - 7, cx + 9, cy - H - 6);
    ctx.moveTo(cx + 8, cy - H + 2); ctx.quadraticCurveTo(cx + 12, cy - H - 4, cx + 16, cy - H - 2);
    ctx.stroke();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = 'rgba(90,50,25,0.35)';

    // --- Belly ---
    ctx.fillStyle = p.belly;
    ellipse(ctx, cx + 8, cy + H * 0.42, W * 0.6, H * 0.5); ctx.fill();

    // --- Cheeks (puff up when eating) ---
    var cr = 10 + cheeks * 14;
    var cdx = 22 + cheeks * 6;
    ctx.fillStyle = p.cheek;
    ellipse(ctx, fx - cdx, fy + 13, cr, cr * 0.92); ctx.fill();
    ellipse(ctx, fx + cdx + 2, fy + 13, cr, cr * 0.92); ctx.fill();
    if (cheeks > 0.25) {
      ctx.strokeStyle = 'rgba(200,170,150,0.6)';
      ellipse(ctx, fx - cdx, fy + 13, cr, cr * 0.92); ctx.stroke();
      ellipse(ctx, fx + cdx + 2, fy + 13, cr, cr * 0.92); ctx.stroke();
      ctx.strokeStyle = 'rgba(90,50,25,0.35)';
    }
    // muzzle
    ellipse(ctx, fx + 1, fy + 12, 17, 12); ctx.fill();

    // blush
    ctx.fillStyle = p.blush;
    ellipse(ctx, fx - cdx + 1, fy + 10, 7, 4.5); ctx.fill();
    ellipse(ctx, fx + cdx + 1, fy + 10, 7, 4.5); ctx.fill();

    // --- Eyes ---
    var eyesPos = [[fx - 13, fy - 5, 7.6], [fx + 14, fy - 6, 8.6]];
    ctx.lineCap = 'round';
    eyesPos.forEach(function (e, i) {
      var ex = e[0], ey = e[1], er = e[2];
      var dir = i === 0 ? 1 : -1;
      ctx.strokeStyle = '#2A1A12';
      ctx.lineWidth = 3;
      if (eyes === 'open') {
        ctx.fillStyle = '#1E120C';
        ellipse(ctx, ex, ey, er, er * 1.08); ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ellipse(ctx, ex + er * 0.3, ey - er * 0.38, er * 0.38, er * 0.38); ctx.fill();
        ellipse(ctx, ex - er * 0.35, ey + er * 0.4, er * 0.17, er * 0.17); ctx.fill();
      } else if (eyes === 'closed') {
        ctx.beginPath(); ctx.arc(ex, ey - 1, er * 0.75, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
      } else if (eyes === 'happy') {
        ctx.beginPath(); ctx.arc(ex, ey + 3, er * 0.75, 1.15 * Math.PI, 1.85 * Math.PI); ctx.stroke();
      } else if (eyes === 'squeeze') {
        ctx.beginPath();
        ctx.moveTo(ex - dir * er * 0.6, ey - er * 0.5); ctx.lineTo(ex + dir * er * 0.6, ey); ctx.lineTo(ex - dir * er * 0.6, ey + er * 0.5);
        ctx.stroke();
      }
    });

    // --- Nose ---
    ctx.fillStyle = p.nose;
    ellipse(ctx, fx + 1, fy + 5, 4.5, 3.2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ellipse(ctx, fx, fy + 4, 1.4, 1); ctx.fill();

    // --- Mouth ---
    ctx.strokeStyle = '#6B3A2A';
    ctx.lineWidth = 1.8;
    if (mouth === 'smile') {
      ctx.beginPath();
      ctx.moveTo(fx - 5, fy + 10); ctx.quadraticCurveTo(fx - 2, fy + 13, fx + 1, fy + 9);
      ctx.quadraticCurveTo(fx + 4, fy + 13, fx + 7, fy + 10);
      ctx.stroke();
    } else if (mouth === 'open') {
      ctx.fillStyle = '#C2486A';
      ctx.beginPath(); ctx.moveTo(fx - 4, fy + 10); ctx.quadraticCurveTo(fx + 1, fy + 19, fx + 6, fy + 10); ctx.closePath();
      ctx.fill();
    } else if (mouth === 'chew') {
      var cw = Math.sin(t * 18) * 1.5;
      ctx.beginPath();
      ctx.moveTo(fx - 4, fy + 11 + cw); ctx.quadraticCurveTo(fx + 1, fy + 13 - cw, fx + 6, fy + 11 + cw);
      ctx.stroke();
    } else if (mouth === 'o') {
      ctx.fillStyle = '#C2486A';
      ellipse(ctx, fx + 1, fy + 13, 3, 3.5); ctx.fill();
    }

    // --- Front paws resting on the belly ---
    if (arms === 'rest' || arms === 'wave') {
      ctx.fillStyle = p.paw;
      ctx.strokeStyle = 'rgba(90,50,25,0.3)';
      ctx.lineWidth = 1.6;
      ellipse(ctx, fx - 12, cy + H * 0.55, 6.5, 5); ctx.fill(); ctx.stroke();
      if (arms === 'rest') { ellipse(ctx, fx + 12, cy + H * 0.55, 6.5, 5); ctx.fill(); ctx.stroke(); }
    }

    ctx.restore();
  }

  // ---------------------------------------------------------------------
  // Mount: animate Toffi inside a small canvas element (menus / overlays).
  // ---------------------------------------------------------------------
  var mounted = [];
  var running = false;

  function tick(now) {
    mounted = mounted.filter(function (m) { return !m.stopped && m.canvas.isConnected; });
    mounted.forEach(function (m) {
      var c = m.canvas;
      var dpr = Math.min(global.devicePixelRatio || 1, 2);
      var w = c.clientWidth || 120, h = c.clientHeight || 120;
      if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
        c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
      }
      var ctx = c.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      var o = Object.assign({}, m.opts, { t: (now - m.t0) / 1000 });
      var size = Math.min(w, h * 1.1) * (o.scale || 0.62);
      draw(ctx, w / 2, h * 0.93, size, o);
    });
    if (mounted.length) global.requestAnimationFrame(tick);
    else running = false;
  }

  function mount(canvas, opts) {
    var m = { canvas: canvas, opts: Object.assign({ anim: 'idle' }, opts || {}), t0: performance.now(), stopped: false };
    mounted.push(m);
    if (!running) { running = true; global.requestAnimationFrame(tick); }
    return {
      set: function (o) { Object.assign(m.opts, o); },
      stop: function () { m.stopped = true; }
    };
  }

  global.Toffi = {
    draw: draw,
    mount: mount,
    PALETTES: PALETTES
  };
})(window);
