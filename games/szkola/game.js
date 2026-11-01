/* =========================================================================
   Gra 6: "Toffi idzie do szkoły" – a school day in small activities.

   Order of the day (ORDER below): breakfast at home, packing the school
   bag, riding to school on Mom's bike, maths, the break (toilet + washing
   hands) and Polish letters. Each finished activity gives a sticker.

   Every scene (scenes/*.js) is an object registered with Szkola.register:
     { id, title, time, icon, sticker: { item, label, color },
       intro: { text, controls, toffi },
       start()          set up (shown behind the intro screen)
       begin()          the intro was closed – go!
       update(dt), render(ctx),
       down(x, y), move(x, y, pressed), up(x, y), key(e)   (all optional) }
   A scene calls Szkola.complete() when it is finished.
   ========================================================================= */
(function () {
  'use strict';

  var S = Szkola, UI = S.UI, Sound = S.Sound, stage = S.stage, ctx = S.ctx;

  var ORDER = ['sniadanie', 'tornister', 'rower', 'matematyka', 'toaleta', 'polski'];
  var scenes = ORDER.map(function (id) {
    return S.scenes.filter(function (s) { return s.id === id; })[0];
  }).filter(Boolean);

  var progress = ToffiStore.get('szkola.progress', null) || { stickers: {}, days: 0 };
  var state = 'plan';         // plan | intro | playing | paused | done
  var current = null;
  var currentIdx = -1;
  var dayMode = false;        // true = play the whole day in order

  // ---------------------------------------------------------------------
  // HTML helpers
  // ---------------------------------------------------------------------
  function stickerHTML(scene, got) {
    return '<div class="sticker' + (got ? ' got' : '') + '" style="--c:' + scene.sticker.color + '">' +
      (got ? '<img src="' + S.itemImage(scene.sticker.item, 40, '#FFFFFF') + '" alt="">' : '<span>?</span>') +
      '<div class="sticker-label">' + (got ? scene.sticker.label : '') + '</div></div>';
  }

  function albumHTML() {
    return '<div class="album">' + scenes.map(function (sc) { return stickerHTML(sc, progress.stickers[sc.id]); }).join('') + '</div>';
  }

  // ---------------------------------------------------------------------
  // Day plan (start screen)
  // ---------------------------------------------------------------------
  function showPlan() {
    state = 'plan';
    dayMode = false;
    current = null;
    S.stopSpeaking();
    var html = '<div class="plan-grid">' + scenes.map(function (sc, i) {
      var got = progress.stickers[sc.id];
      return '<button type="button" class="plan-step' + (got ? ' done' : '') + '" data-i="' + i + '">' +
        '<span class="plan-time">' + sc.time + '</span>' +
        '<img src="' + S.itemImage(sc.icon, 34, '#FFF4E0') + '" alt="">' +
        '<span class="plan-title">' + sc.title + '</span>' +
        (got ? '<span class="plan-check">★</span>' : '') + '</button>';
    }).join('') + '</div>';
    var count = Object.keys(progress.stickers).length;
    var ov = UI.showScreen(stage, {
      title: 'Toffi idzie do szkoły',
      text: 'Spędź z Toffi cały dzień: od śniadania aż do ostatniego dzwonka!' +
        (count ? '<br>Naklejki: <b>' + count + ' / ' + scenes.length + '</b>' : ''),
      html: html,
      cls: 'plan-screen',
      buttons: [{ label: 'Zacznij dzień!', icon: 'play', onClick: function () { dayMode = true; openScene(0); } }]
    });
    ov.querySelectorAll('.plan-step').forEach(function (b) {
      b.addEventListener('click', function () { Sound.play('click'); dayMode = false; openScene(+b.dataset.i); });
    });
    S.speak('Toffi idzie do szkoły!');
  }

  // ---------------------------------------------------------------------
  // Scenes
  // ---------------------------------------------------------------------
  function openScene(i) {
    currentIdx = i;
    current = scenes[i];
    S.particles = new UI.Particles();
    S.toffiSpeech = new UI.Speech();
    S.otherSpeech = new UI.Speech();
    current.start();
    state = 'intro';
    UI.showScreen(stage, {
      title: current.time + ' ' + current.title,
      toffi: current.intro.toffi || 'wave',
      text: current.intro.text,
      controls: current.intro.controls,
      buttons: [
        { label: 'Zaczynamy!', icon: 'play', onClick: beginScene },
        { label: 'Plan dnia', icon: 'list', color: 'orange', onClick: showPlan }
      ]
    });
    S.speak(current.intro.say || current.title);
  }

  function beginScene() {
    UI.hideScreen(stage);
    state = 'playing';
    if (current.begin) current.begin();
  }

  S.complete = function () {
    if (state !== 'playing') return;
    state = 'done';
    var first = !progress.stickers[current.id];
    progress.stickers[current.id] = true;
    var last = currentIdx === scenes.length - 1;
    if (dayMode && last) progress.days = (progress.days || 0) + 1;
    ToffiStore.set('szkola.progress', progress);
    Sound.play('win');
    setTimeout(function () {
      if (dayMode && last) { showSummary(); return; }
      var buttons = [];
      if (dayMode) buttons.push({ label: 'Dalej', icon: 'next', onClick: function () { openScene(currentIdx + 1); } });
      buttons.push({ label: 'Jeszcze raz', icon: 'restart', color: 'sky', onClick: function () { openScene(currentIdx); } });
      buttons.push({ label: 'Plan dnia', icon: 'list', color: 'orange', onClick: showPlan });
      UI.showScreen(stage, {
        title: UI.praise(),
        text: (first ? 'Nowa naklejka do albumu!' : 'Naklejka już jest w albumie!') +
          (dayMode ? '<br>Teraz: <b>' + scenes[currentIdx + 1].title + '</b>' : ''),
        html: '<div class="album single">' + stickerHTML(current, true) + '</div>',
        buttons: buttons
      });
      S.speak(UI.praise());
      Sound.play('star');
    }, 1300);
  };

  function showSummary() {
    UI.showScreen(stage, {
      title: 'Koniec dnia w szkole!',
      toffi: 'wiggle',
      text: 'Toffi była dzisiaj bardzo dzielna. Brawo!',
      html: albumHTML(),
      cls: 'plan-screen',
      buttons: [
        { label: 'Plan dnia', icon: 'list', onClick: showPlan },
        { label: 'Menu', icon: 'home', color: 'orange', onClick: function () { location.href = '../../index.html'; } }
      ]
    });
    S.speak('Koniec dnia w szkole! Brawo, Toffi!');
  }

  function togglePause() {
    if (state === 'playing') {
      state = 'paused';
      S.stopSpeaking();
      UI.showScreen(stage, {
        title: 'Pauza',
        toffi: 'sleep',
        text: 'Toffi chwilkę odpoczywa.',
        buttons: [
          { label: 'Graj dalej', icon: 'play', onClick: function () { UI.hideScreen(stage); state = 'playing'; } },
          { label: 'Plan dnia', icon: 'list', color: 'orange', onClick: showPlan }
        ]
      });
    } else if (state === 'paused') {
      UI.hideScreen(stage); state = 'playing';
    }
  }
  UI.onHidden(function () { if (state === 'playing') togglePause(); });

  // ---------------------------------------------------------------------
  // Input → current scene
  // ---------------------------------------------------------------------
  var pressed = false;
  stage.canvas.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    pressed = true;
    if (state !== 'playing' || !current.down) return;
    var p = stage.toLogical(e.clientX, e.clientY);
    current.down(p.x, p.y);
  });
  stage.canvas.addEventListener('pointermove', function (e) {
    if (state !== 'playing' || !current.move) return;
    var p = stage.toLogical(e.clientX, e.clientY);
    current.move(p.x, p.y, pressed);
  });
  window.addEventListener('pointerup', function (e) {
    pressed = false;
    if (state !== 'playing' || !current || !current.up) return;
    var p = stage.toLogical(e.clientX, e.clientY);
    current.up(p.x, p.y);
  });
  window.addEventListener('keydown', function (e) {
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') { togglePause(); return; }
    if (state === 'playing' && current.key) current.key(e, true);
  });
  window.addEventListener('keyup', function (e) {
    if (state === 'playing' && current && current.key) current.key(e, false);
  });

  UI.createTopBar(stage, {
    extraLeft: [UI.iconButton(UI.ICONS.list.replace(/#fff/g, '#7A4A2E'), 'Plan dnia', showPlan)],
    onPause: togglePause
  });

  // ---------------------------------------------------------------------
  // Main loop
  // ---------------------------------------------------------------------
  UI.loop(function (dt) {
    S.t += dt;
    if (state === 'playing' || state === 'done') {
      if (current.update) current.update(dt);
      S.toffiSpeech.update(dt);
      S.otherSpeech.update(dt);
      S.particles.update(dt);
    }
    stage.begin();
    if (current) current.render(ctx);
    else S.drawClassroom(ctx);
    S.particles.draw(ctx);
  });

  window.__toffiGame = {
    get state() { return { state: state, scene: current, idx: currentIdx }; },
    openScene: openScene, begin: beginScene, scenes: scenes
  };

  showPlan();
})();
