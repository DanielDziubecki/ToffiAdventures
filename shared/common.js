/* =========================================================================
   Shared helpers used by the menu and all games.

   ToffiStore  – safe localStorage (wrapped in try/catch, JSON values)
   ToffiUI     – stage scaling, top bar (Menu / Pauza / Dźwięk), overlay
                 screens, control pictures, particles, speech bubbles,
                 hearts, stars and a few shared drawings (seed, carrot ...)
   ========================================================================= */
(function (global) {
  'use strict';

  // ---------------------------------------------------------------------
  // Storage
  // ---------------------------------------------------------------------
  var ToffiStore = {
    get: function (key, def) {
      try {
        var v = global.localStorage.getItem('toffi.' + key);
        return v === null ? def : JSON.parse(v);
      } catch (e) { return def; }
    },
    set: function (key, val) {
      try { global.localStorage.setItem('toffi.' + key, JSON.stringify(val)); } catch (e) { /* ignore */ }
    }
  };

  // ---------------------------------------------------------------------
  // Small SVG icons (inline, no external files)
  // ---------------------------------------------------------------------
  var S = '<svg viewBox="0 0 48 48" aria-hidden="true">';
  var ICONS = {
    home: S + '<path d="M6 23 24 8l18 15" fill="none" stroke="#7A4A2E" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M11 21v19h9V30h8v10h9V21L24 10z" fill="#FF9F45" stroke="#7A4A2E" stroke-width="3.5" stroke-linejoin="round"/><circle cx="24" cy="21" r="3" fill="#FFE7A8"/></svg>',
    pause: S + '<rect x="12" y="10" width="9" height="28" rx="4" fill="#7A4A2E"/><rect x="27" y="10" width="9" height="28" rx="4" fill="#7A4A2E"/></svg>',
    play: S + '<path d="M15 9 L39 24 L15 39 Z" fill="#fff" stroke="#fff" stroke-width="5" stroke-linejoin="round"/></svg>',
    sound: S + '<path d="M8 18h8l10-8v28l-10-8H8z" fill="#FF9F45" stroke="#7A4A2E" stroke-width="3.5" stroke-linejoin="round"/><path d="M32 17c3 3 3 11 0 14M36 12c6 6 6 18 0 24" fill="none" stroke="#7A4A2E" stroke-width="3.5" stroke-linecap="round"/></svg>',
    mute: S + '<path d="M8 18h8l10-8v28l-10-8H8z" fill="#D8C8BA" stroke="#7A4A2E" stroke-width="3.5" stroke-linejoin="round"/><path d="M32 18l10 12M42 18 32 30" fill="none" stroke="#E0607E" stroke-width="4" stroke-linecap="round"/></svg>',
    restart: S + '<path d="M36 16A14 14 0 1 0 38 28" fill="none" stroke="#fff" stroke-width="5.5" stroke-linecap="round"/><path d="M38 6v12H26" fill="none" stroke="#fff" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    undo: S + '<path d="M14 20h16a9 9 0 0 1 0 18h-8" fill="none" stroke="#7A4A2E" stroke-width="5" stroke-linecap="round"/><path d="M20 11l-9 9 9 9" fill="none" stroke="#7A4A2E" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    reset: S + '<path d="M36 16A14 14 0 1 0 38 28" fill="none" stroke="#7A4A2E" stroke-width="5" stroke-linecap="round"/><path d="M38 6v12H26" fill="none" stroke="#7A4A2E" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    next: S + '<path d="M12 24h22M26 14l10 10-10 10" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    list: S + '<rect x="8" y="8" width="13" height="13" rx="3" fill="#fff"/><rect x="27" y="8" width="13" height="13" rx="3" fill="#fff"/><rect x="8" y="27" width="13" height="13" rx="3" fill="#fff"/><rect x="27" y="27" width="13" height="13" rx="3" fill="#fff"/></svg>',
    up: S + '<path d="M24 10 40 34H8z" fill="#7A4A2E" stroke="#7A4A2E" stroke-width="4" stroke-linejoin="round"/></svg>',
    down: S + '<path d="M24 38 40 14H8z" fill="#7A4A2E" stroke="#7A4A2E" stroke-width="4" stroke-linejoin="round"/></svg>',
    left: S + '<path d="M10 24 34 8v32z" fill="#7A4A2E" stroke="#7A4A2E" stroke-width="4" stroke-linejoin="round"/></svg>',
    right: S + '<path d="M38 24 14 8v32z" fill="#7A4A2E" stroke="#7A4A2E" stroke-width="4" stroke-linejoin="round"/></svg>',
    jump: S + '<path d="M24 8 40 26H30v12H18V26H8z" fill="#7A4A2E" stroke="#7A4A2E" stroke-width="3" stroke-linejoin="round"/></svg>',
    lock: S + '<rect x="11" y="21" width="26" height="20" rx="5" fill="#B9A08C"/><path d="M16 21v-5a8 8 0 0 1 16 0v5" fill="none" stroke="#B9A08C" stroke-width="5"/><circle cx="24" cy="31" r="3" fill="#fff"/></svg>',
    tap: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="21" cy="11" r="8" fill="none" stroke="#FF8FAB" stroke-width="3"/><path d="M18 12c0-3.3 6-3.3 6 0v12l2-.3c1.5-2.5 5.5-1.6 5.5 1 1.8-1.6 5.2-.6 5.2 1.9 1.8-.9 4.3.2 4.3 2.4V36c0 5-4 9-9 9h-6c-3 0-5-1.3-6.6-3.4l-7-9c-1.8-2.4 1.6-5.3 3.8-3.2L18 31z" fill="#FFE2C6" stroke="#7A4A2E" stroke-width="2.6" stroke-linejoin="round"/></svg>',
    mouse: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="12" y="6" width="24" height="36" rx="12" fill="#fff" stroke="#7A4A2E" stroke-width="3"/><path d="M24 6v13M12 19h24" stroke="#7A4A2E" stroke-width="3"/><path d="M13.5 18V17a10.5 10.5 0 0 1 10.5-9.5V18z" fill="#FF9F45"/></svg>',
    swipe: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M6 10h30M30 4l7 6-7 6" fill="none" stroke="#FF8FAB" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M18 18c0-3.3 6-3.3 6 0v10l2-.3c1.5-2.5 5.5-1.6 5.5 1 1.8-1.6 5.2-.6 5.2 1.9 1.8-.9 4.3.2 4.3 2.4V38c0 4-3 7-7 7h-8c-3 0-5-1.3-6.6-3.4l-6-8c-1.8-2.4 1.6-5.3 3.8-3.2L18 34z" fill="#FFE2C6" stroke="#7A4A2E" stroke-width="2.6" stroke-linejoin="round"/></svg>'
  };

  var PRAISE = ['Brawo!', 'Super!', 'Ekstra!', 'Świetnie!', 'Wspaniale!', 'Hurra!', 'Tak trzymaj!'];

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function rand(a, b) { return a + Math.random() * (b - a); }

  // Polish plural: plural(5, 'ziarenko', 'ziarenka', 'ziarenek')
  function plural(n, one, few, many) {
    n = Math.abs(Math.floor(n));
    if (n === 1) return one;
    var d = n % 10, dd = n % 100;
    if (d >= 2 && d <= 4 && (dd < 12 || dd > 14)) return few;
    return many;
  }

  function formatNumber(n) {
    n = Math.floor(n);
    try { return n.toLocaleString('pl-PL'); } catch (e) { return String(n); }
  }

  // Detect touch devices (shows on-screen buttons where useful)
  function markTouch() { document.documentElement.classList.add('is-touch'); }
  if (global.matchMedia && global.matchMedia('(pointer: coarse)').matches) markTouch();
  global.addEventListener('touchstart', markTouch, { once: true, passive: true });

  // ---------------------------------------------------------------------
  // Stage: a fixed 960×540 logical area scaled to fit the window. HTML
  // overlays inside the stage scale together with the canvas.
  // ---------------------------------------------------------------------
  function createStage(opts) {
    opts = opts || {};
    var W = opts.width || 960, H = opts.height || 540;
    var stage = document.getElementById('stage');
    var canvas = stage.querySelector('canvas');
    var ctx = canvas.getContext('2d');
    var scale = 1, dpr = 1;
    stage.style.width = W + 'px';
    stage.style.height = H + 'px';

    function fit() {
      scale = Math.min(global.innerWidth / W, global.innerHeight / H);
      dpr = Math.min(global.devicePixelRatio || 1, 2);
      stage.style.setProperty('--s', scale);
      canvas.width = Math.round(W * scale * dpr);
      canvas.height = Math.round(H * scale * dpr);
    }
    global.addEventListener('resize', fit);
    global.addEventListener('orientationchange', function () { setTimeout(fit, 200); });
    fit();

    return {
      el: stage, canvas: canvas, ctx: ctx, W: W, H: H,
      // call at the start of every frame
      begin: function () {
        var k = scale * dpr;
        ctx.setTransform(k, 0, 0, k, 0, 0);
      },
      // convert a mouse / touch position to logical stage coordinates
      toLogical: function (clientX, clientY) {
        var r = canvas.getBoundingClientRect();
        return { x: (clientX - r.left) / r.width * W, y: (clientY - r.top) / r.height * H };
      }
    };
  }

  // ---------------------------------------------------------------------
  // Buttons
  // ---------------------------------------------------------------------
  function iconButton(icon, label, onClick, cls) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'icon-btn ' + (cls || '');
    b.innerHTML = ICONS[icon] || icon;
    b.setAttribute('aria-label', label);
    b.title = label;
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      if (global.ToffiSound) ToffiSound.play('click');
      onClick(e);
    });
    // keep the canvas from also receiving the tap
    b.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    b.addEventListener('touchstart', function (e) { e.stopPropagation(); }, { passive: true });
    return b;
  }

  function muteButton() {
    var b = iconButton(global.ToffiSound && ToffiSound.isMuted() ? 'mute' : 'sound', 'Dźwięk', function () {
      ToffiSound.toggleMute();
    }, 'mute-btn');
    if (global.ToffiSound) {
      ToffiSound.onChange(function (m) {
        b.innerHTML = ICONS[m ? 'mute' : 'sound'];
        b.setAttribute('aria-label', m ? 'Włącz dźwięk' : 'Wyłącz dźwięk');
      });
    }
    return b;
  }

  // Top bar with Menu (house), optional extra buttons, Pause and Mute.
  // opts: { onPause: fn, menuHref: '../../index.html', extra: [buttons] }
  function createTopBar(stage, opts) {
    opts = opts || {};
    var bar = document.createElement('div');
    bar.className = 'topbar';
    var left = document.createElement('div');
    left.className = 'topbar-group';
    var right = document.createElement('div');
    right.className = 'topbar-group';
    var href = opts.menuHref || '../../index.html';
    left.appendChild(iconButton('home', 'Menu', function () { global.location.href = href; }, 'home-btn'));
    (opts.extraLeft || []).forEach(function (b) { left.appendChild(b); });
    (opts.extra || []).forEach(function (b) { right.appendChild(b); });
    var pauseBtn = null;
    if (opts.onPause) {
      pauseBtn = iconButton('pause', 'Pauza', opts.onPause, 'pause-btn');
      right.appendChild(pauseBtn);
    }
    right.appendChild(muteButton());
    bar.appendChild(left);
    bar.appendChild(right);
    stage.el.appendChild(bar);
    return { el: bar, pauseBtn: pauseBtn };
  }

  // ---------------------------------------------------------------------
  // Control pictures for start screens.
  // item: { keys: ['←','→'], tap: true, mouse: true, swipe: true, label: 'Ruch' }
  // ---------------------------------------------------------------------
  function controlsHTML(items) {
    var html = '<div class="controls-pic">';
    items.forEach(function (it) {
      var parts = [];
      if (it.keys) parts.push(it.keys.map(function (k) { return '<span class="key' + (k.length > 2 ? ' wide' : '') + '">' + k + '</span>'; }).join(''));
      if (it.mouse) parts.push('<span class="ctrl-icon">' + ICONS.mouse + '</span>');
      if (it.tap) parts.push('<span class="ctrl-icon">' + ICONS.tap + '</span>');
      if (it.swipe) parts.push('<span class="ctrl-icon">' + ICONS.swipe + '</span>');
      if (it.html) parts.push(it.html);
      html += '<div class="ctrl"><div class="ctrl-row">' + parts.join('<span class="or">lub</span>') +
        '</div><div class="lbl">' + it.label + '</div></div>';
    });
    return html + '</div>';
  }

  // ---------------------------------------------------------------------
  // Overlay screens (start, pause, game over, level complete ...)
  // o: { title, text, toffi: 'wave'|'wiggle'|..., stars: 0..3, maxStars,
  //      controls: [...], html: '', buttons: [{label, icon, color, onClick}],
  //      cls: '' }
  // The first button is the "primary" one (Enter / Space activates it).
  // ---------------------------------------------------------------------
  function hideScreen(stage) {
    var old = stage.el.querySelector('.overlay');
    if (old) old.remove();
  }

  function showScreen(stage, o) {
    hideScreen(stage);
    var ov = document.createElement('div');
    ov.className = 'overlay ' + (o.cls || '');
    var panel = document.createElement('div');
    panel.className = 'panel';
    ov.appendChild(panel);

    if (o.toffi) {
      var tc = document.createElement('canvas');
      tc.className = 'panel-toffi';
      panel.appendChild(tc);
      if (global.Toffi) Toffi.mount(tc, { anim: o.toffi, palette: o.palette, cheeks: o.cheeks || 0 });
    }
    var h = document.createElement('h1');
    h.textContent = o.title || '';
    panel.appendChild(h);
    if (o.stars != null) {
      var st = document.createElement('div');
      st.className = 'stars';
      var max = o.maxStars || 3;
      for (var i = 0; i < max; i++) {
        var s = document.createElement('span');
        s.className = 'star' + (i < o.stars ? ' on' : '');
        s.style.animationDelay = (0.15 + i * 0.25) + 's';
        s.textContent = '★';
        st.appendChild(s);
      }
      panel.appendChild(st);
      for (var j = 0; j < o.stars; j++) setTimeout(function () { if (global.ToffiSound) ToffiSound.play('star'); }, 200 + j * 250);
    }
    if (o.text) {
      var p = document.createElement('p');
      p.innerHTML = o.text;
      panel.appendChild(p);
    }
    if (o.controls) panel.insertAdjacentHTML('beforeend', controlsHTML(o.controls));
    if (o.html) panel.insertAdjacentHTML('beforeend', o.html);

    var row = document.createElement('div');
    row.className = 'btn-row';
    (o.buttons || []).forEach(function (bd, idx) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'big-btn ' + (bd.color || (idx === 0 ? 'mint' : 'orange')) + (idx === 0 ? ' primary' : '');
      b.innerHTML = (bd.icon ? '<span class="btn-icon">' + (ICONS[bd.icon] || '') + '</span>' : '') + '<span>' + bd.label + '</span>';
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        if (global.ToffiSound) ToffiSound.play('click');
        bd.onClick();
      });
      b.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
      row.appendChild(b);
    });
    panel.appendChild(row);
    stage.el.appendChild(ov);
    // stop taps on the overlay from reaching the game
    ['pointerdown', 'mousedown', 'touchstart'].forEach(function (ev) {
      ov.addEventListener(ev, function (e) { e.stopPropagation(); }, { passive: true });
    });
    return ov;
  }

  // Enter / Space presses the primary button of a visible overlay.
  // Registered early (capture) so games never receive that key press.
  global.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ' && e.code !== 'Space') return;
    var btn = document.querySelector('.overlay .big-btn.primary');
    if (btn) {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (!e.repeat) btn.click();
    }
  }, true);

  // ---------------------------------------------------------------------
  // Particles + floating text
  // ---------------------------------------------------------------------
  function Particles() { this.list = []; this.texts = []; }
  Particles.prototype.burst = function (x, y, o) {
    o = o || {};
    var n = o.n || 12;
    var colors = o.colors || ['#FFE066', '#FFFFFF', '#FFB347'];
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2;
      var sp = (o.speed || 160) * (0.4 + Math.random() * 0.8);
      this.list.push({
        x: x, y: y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (o.up || 40),
        life: (o.life || 0.7) * (0.6 + Math.random() * 0.6), age: 0,
        size: (o.size || 6) * (0.6 + Math.random() * 0.8),
        color: colors[i % colors.length],
        shape: o.shape || 'star',
        g: o.gravity == null ? 260 : o.gravity,
        rot: Math.random() * 6
      });
    }
  };
  // Floating text: "+1", "Mniam!" ...
  Particles.prototype.text = function (x, y, str, o) {
    o = o || {};
    this.texts.push({ x: x, y: y, str: str, age: 0, life: o.life || 1.1, color: o.color || '#FFFFFF', size: o.size || 30, vy: o.vy || -60 });
  };
  Particles.prototype.update = function (dt) {
    this.list.forEach(function (p) {
      p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; p.rot += dt * 5;
    });
    this.list = this.list.filter(function (p) { return p.age < p.life; });
    this.texts.forEach(function (t) { t.age += dt; t.y += t.vy * dt; });
    this.texts = this.texts.filter(function (t) { return t.age < t.life; });
  };
  Particles.prototype.draw = function (ctx) {
    this.list.forEach(function (p) {
      var a = 1 - p.age / p.life;
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      if (p.shape === 'star') drawStar(ctx, p.x, p.y, p.size, p.color, p.rot);
      else if (p.shape === 'drop') { ctx.beginPath(); ctx.ellipse(p.x, p.y, p.size * 0.6, p.size, 0, 0, Math.PI * 2); ctx.fill(); }
      else { ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.5 + a * 0.5), 0, Math.PI * 2); ctx.fill(); }
    });
    ctx.globalAlpha = 1;
    this.texts.forEach(function (t) {
      var a = 1 - Math.max(0, (t.age - t.life * 0.6) / (t.life * 0.4));
      var pop = Math.min(1, t.age * 8);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(t.x, t.y);
      ctx.scale(0.6 + pop * 0.4, 0.6 + pop * 0.4);
      text(ctx, t.str, 0, 0, { size: t.size, color: t.color, align: 'center', outline: 'rgba(80,40,20,0.85)' });
      ctx.restore();
    });
  };

  // ---------------------------------------------------------------------
  // Text helpers
  // ---------------------------------------------------------------------
  var FONT = '"Baloo 2", "Comic Sans MS", "Trebuchet MS", system-ui, sans-serif';
  function text(ctx, str, x, y, o) {
    o = o || {};
    ctx.font = (o.weight || 800) + ' ' + (o.size || 28) + 'px ' + FONT;
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = o.baseline || 'middle';
    if (o.outline) {
      ctx.lineJoin = 'round';
      ctx.lineWidth = o.outlineWidth || Math.max(3, (o.size || 28) / 6);
      ctx.strokeStyle = o.outline;
      ctx.strokeText(str, x, y);
    }
    ctx.fillStyle = o.color || '#5B3A29';
    ctx.fillText(str, x, y);
  }

  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // Speech bubble with its tail pointing at (x, y)
  function drawBubble(ctx, x, y, str, o) {
    o = o || {};
    var size = o.size || 24;
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    ctx.font = '800 ' + size + 'px ' + FONT;
    var w = ctx.measureText(str).width + size * 1.1;
    var h = size * 1.7;
    var bx = clamp(x - w / 2, 6, (o.maxX || 960) - w - 6);
    var by = y - h - 14;
    ctx.fillStyle = o.bg || '#FFFFFF';
    ctx.strokeStyle = 'rgba(90,58,41,0.55)';
    ctx.lineWidth = 3;
    roundRect(ctx, bx, by, w, h, h / 2);
    ctx.fill(); ctx.stroke();
    var tx = clamp(x, bx + 18, bx + w - 18);
    ctx.beginPath();
    ctx.moveTo(tx - 9, by + h - 2); ctx.lineTo(tx, by + h + 13); ctx.lineTo(tx + 9, by + h - 2);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(tx - 9, by + h); ctx.lineTo(tx, by + h + 13); ctx.lineTo(tx + 9, by + h);
    ctx.stroke();
    text(ctx, str, bx + w / 2, by + h / 2 + 1, { size: size, color: o.color || '#5B3A29', align: 'center' });
    ctx.restore();
  }

  // Simple "say something" helper: speech.say('Mniam!'); speech.draw(ctx, x, y)
  function Speech() { this.str = ''; this.time = 0; this.dur = 0; }
  Speech.prototype.say = function (str, dur) { this.str = str; this.time = 0; this.dur = dur || 1.4; };
  Speech.prototype.update = function (dt) { if (this.str) { this.time += dt; if (this.time > this.dur) this.str = ''; } };
  Speech.prototype.draw = function (ctx, x, y, o) {
    if (!this.str) return;
    var a = Math.min(1, this.time * 8, (this.dur - this.time) * 5);
    drawBubble(ctx, x, y, this.str, Object.assign({ alpha: Math.max(0, a) }, o || {}));
  };

  // ---------------------------------------------------------------------
  // Shared little drawings
  // ---------------------------------------------------------------------
  function drawHeart(ctx, x, y, s, fill, stroke) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s / 32, s / 32);
    ctx.beginPath();
    ctx.moveTo(0, 12);
    ctx.bezierCurveTo(-18, 0, -16, -16, -7, -15);
    ctx.bezierCurveTo(-3, -15, 0, -11, 0, -8);
    ctx.bezierCurveTo(0, -11, 3, -15, 7, -15);
    ctx.bezierCurveTo(16, -16, 18, 0, 0, 12);
    ctx.closePath();
    ctx.fillStyle = fill || '#FF5C8A';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = stroke || 'rgba(110,30,50,0.6)';
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath(); ctx.ellipse(-7, -8, 3.5, 2.5, -0.6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // Row of hearts: full ones in pink, lost ones pale
  function drawHearts(ctx, x, y, lives, max, s) {
    s = s || 34;
    for (var i = 0; i < max; i++) {
      drawHeart(ctx, x + i * (s + 6), y, s, i < lives ? '#FF5C8A' : 'rgba(255,255,255,0.45)', i < lives ? null : 'rgba(110,30,50,0.3)');
    }
  }

  function drawStar(ctx, x, y, r, fill, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot || 0);
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var rr = i % 2 === 0 ? r : r * 0.48;
      var a = -Math.PI / 2 + i * Math.PI / 5;
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fillStyle = fill || '#FFD54A';
    ctx.fill();
    ctx.restore();
  }

  // Sunflower seed (golden = magnet power-up)
  function drawSeed(ctx, x, y, s, rot, golden) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot || 0);
    ctx.scale(s / 20, s / 20);
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.bezierCurveTo(8, -9, 8, 6, 0, 12);
    ctx.bezierCurveTo(-8, 6, -8, -9, 0, -12);
    ctx.closePath();
    if (golden) {
      var g = ctx.createLinearGradient(-6, -12, 6, 12);
      g.addColorStop(0, '#FFF3A0'); g.addColorStop(0.5, '#FFD23F'); g.addColorStop(1, '#E8A317');
      ctx.fillStyle = g;
    } else {
      ctx.fillStyle = '#3E3A44';
    }
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = golden ? '#B07A10' : '#1F1C24';
    ctx.stroke();
    // stripes
    ctx.strokeStyle = golden ? 'rgba(255,255,255,0.8)' : '#E8E2D6';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-3, -8); ctx.quadraticCurveTo(-4.5, 0, -2.5, 8);
    ctx.moveTo(3, -8); ctx.quadraticCurveTo(4.5, 0, 2.5, 8);
    ctx.stroke();
    ctx.restore();
  }

  function drawCarrot(ctx, x, y, s, rot) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(rot || 0); ctx.scale(s / 40, s / 40);
    ctx.fillStyle = '#5DBB63';
    for (var i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.ellipse(i * 5, -18, 3.5, 9, i * 0.4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.beginPath();
    ctx.moveTo(-9, -10); ctx.quadraticCurveTo(0, -15, 9, -10);
    ctx.quadraticCurveTo(4, 10, 0, 20); ctx.quadraticCurveTo(-4, 10, -9, -10);
    ctx.fillStyle = '#FF8A2B'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#C85F12'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-5, -3); ctx.lineTo(0, -3); ctx.moveTo(1, 4); ctx.lineTo(5, 4); ctx.moveTo(-3, 10); ctx.lineTo(1, 10); ctx.stroke();
    ctx.restore();
  }

  function drawApple(ctx, x, y, s, rot, rotten) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(rot || 0); ctx.scale(s / 40, s / 40);
    ctx.fillStyle = rotten ? '#8E8A4E' : '#FF5A5F';
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.bezierCurveTo(12, -18, 22, -6, 17, 6);
    ctx.bezierCurveTo(13, 17, 4, 18, 0, 15);
    ctx.bezierCurveTo(-4, 18, -13, 17, -17, 6);
    ctx.bezierCurveTo(-22, -6, -12, -18, 0, -10);
    ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = rotten ? '#5E5A30' : '#C23B40'; ctx.stroke();
    if (rotten) {
      ctx.fillStyle = '#6B5A2E';
      ctx.beginPath(); ctx.arc(-6, 2, 4, 0, Math.PI * 2); ctx.arc(7, 7, 3, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath(); ctx.ellipse(-8, -4, 3, 5, 0.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = '#7A4A2E'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(2, -18); ctx.stroke();
    ctx.fillStyle = rotten ? '#7C8A3E' : '#5DBB63';
    ctx.beginPath(); ctx.ellipse(8, -17, 7, 3.5, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawBerry(ctx, x, y, s, t) {
    ctx.save();
    ctx.translate(x, y); ctx.scale(s / 30, s / 30);
    var g = ctx.createRadialGradient(-4, -4, 1, 0, 0, 13);
    g.addColorStop(0, '#9D8CFF'); g.addColorStop(1, '#4B3BB5');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2E2380'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath(); ctx.arc(-4, -5, 3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2E2380'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-3, -11); ctx.lineTo(0, -8); ctx.lineTo(3, -11); ctx.stroke();
    ctx.restore();
  }

  // Simple game loop with delta time (seconds, clamped)
  function loop(step) {
    var last = performance.now();
    function frame(now) {
      var dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      step(dt, now / 1000);
      global.requestAnimationFrame(frame);
    }
    global.requestAnimationFrame(frame);
  }

  // Run fn when the page is hidden (e.g. to auto-pause)
  function onHidden(fn) {
    document.addEventListener('visibilitychange', function () { if (document.hidden) fn(); });
  }

  global.ToffiStore = ToffiStore;
  global.ToffiUI = {
    ICONS: ICONS, PRAISE: PRAISE, FONT: FONT,
    pick: pick, clamp: clamp, lerp: lerp, rand: rand, plural: plural, formatNumber: formatNumber,
    praise: function () { return pick(PRAISE); },
    createStage: createStage, createTopBar: createTopBar,
    iconButton: iconButton, muteButton: muteButton,
    showScreen: showScreen, hideScreen: hideScreen, controlsHTML: controlsHTML,
    Particles: Particles, Speech: Speech,
    text: text, roundRect: roundRect, drawBubble: drawBubble,
    drawHeart: drawHeart, drawHearts: drawHearts, drawStar: drawStar,
    drawSeed: drawSeed, drawCarrot: drawCarrot, drawApple: drawApple, drawBerry: drawBerry,
    loop: loop, onHidden: onHidden
  };
})(window);
