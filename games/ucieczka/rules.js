/* =========================================================================
   Pure puzzle rules for "Wielka ucieczka" (no drawing here).
   game.js uses these functions; they can also be used by a solver.

   UcieczkaRules.parse(level)          -> parsed level (grid, tubes ...)
   UcieczkaRules.initialState(parsed)  -> { tx, ty, blocks, open, moves }
   UcieczkaRules.tryMove(parsed, state, dx, dy)
       -> { state, event, ... }  event: 'move' | 'push' | 'tube' |
                                        'drawer' | 'blocked' | 'win'
   ========================================================================= */
(function (global) {
  'use strict';

  function parse(level) {
    var map = level.map;
    var h = map.length, w = 0;
    map.forEach(function (row) { w = Math.max(w, row.length); });
    var grid = [], blocks = [], tubes = {}, start = null, cage = null;
    for (var y = 0; y < h; y++) {
      grid.push([]);
      for (var x = 0; x < w; x++) {
        var ch = map[y][x] || '#';
        if (ch === 'T') { start = { x: x, y: y }; ch = '.'; }
        else if (ch === 'B') { blocks.push([x, y]); ch = '.'; }
        else if (ch === 'C') { cage = { x: x, y: y }; }
        else if (/[1-9]/.test(ch)) { (tubes[ch] = tubes[ch] || []).push({ x: x, y: y }); }
        else if (ch === ' ') { ch = '#'; }
        grid[y].push(ch);
      }
    }
    return { w: w, h: h, grid: grid, blocks: blocks, tubes: tubes, start: start, cage: cage, level: level };
  }

  function initialState(p) {
    return { tx: p.start.x, ty: p.start.y, blocks: p.blocks.map(function (b) { return b.slice(); }), open: {}, moves: 0 };
  }

  function tile(p, x, y) {
    if (x < 0 || y < 0 || x >= p.w || y >= p.h) return '#';
    return p.grid[y][x];
  }

  function blockAt(st, x, y) {
    for (var i = 0; i < st.blocks.length; i++) if (st.blocks[i][0] === x && st.blocks[i][1] === y) return i;
    return -1;
  }

  // Can a block be pushed onto this cell? Only plain floor / open drawers.
  function freeForBlock(p, st, x, y) {
    var t = tile(p, x, y);
    var floorLike = t === '.' || (t === 'S' && st.open[x + ',' + y]);
    return floorLike && blockAt(st, x, y) < 0;
  }

  function copy(st) {
    var open = {};
    for (var k in st.open) open[k] = st.open[k];
    return { tx: st.tx, ty: st.ty, blocks: st.blocks.map(function (b) { return b.slice(); }), open: open, moves: st.moves };
  }

  function tryMove(p, st, dx, dy) {
    var nx = st.tx + dx, ny = st.ty + dy;
    var t = tile(p, nx, ny);
    if (t === '#') return { state: st, event: 'blocked' };

    // closed drawer: bumping it opens it (Toffi stays in place)
    if (t === 'S' && !st.open[nx + ',' + ny]) {
      var s1 = copy(st);
      s1.open[nx + ',' + ny] = true;
      s1.moves++;
      return { state: s1, event: 'drawer', x: nx, y: ny };
    }

    // block: push it if the cell behind it is free
    var bi = blockAt(st, nx, ny);
    if (bi >= 0) {
      if (!freeForBlock(p, st, nx + dx, ny + dy)) return { state: st, event: 'blocked', push: true };
      var s2 = copy(st);
      s2.blocks[bi] = [nx + dx, ny + dy];
      s2.tx = nx; s2.ty = ny; s2.moves++;
      return { state: s2, event: 'push', block: bi };
    }

    // paper tube: come out at the other end
    if (/[1-9]/.test(t)) {
      var ends = p.tubes[t];
      var other = (ends[0].x === nx && ends[0].y === ny) ? ends[1] : ends[0];
      var s3 = copy(st);
      s3.tx = other.x; s3.ty = other.y; s3.moves++;
      return { state: s3, event: 'tube', inX: nx, inY: ny };
    }

    var s4 = copy(st);
    s4.tx = nx; s4.ty = ny; s4.moves++;
    return { state: s4, event: t === 'C' ? 'win' : 'move' };
  }

  // Breadth-first search for the smallest number of moves (used for testing
  // levels; small levels only).
  function solve(p, maxStates) {
    maxStates = maxStates || 200000;
    var start = initialState(p);
    function key(s) {
      return s.tx + ',' + s.ty + '|' + s.blocks.map(function (b) { return b.join(','); }).sort().join(';') + '|' + Object.keys(s.open).sort().join(';');
    }
    var seen = {}; seen[key(start)] = true;
    var queue = [start], dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]], count = 0;
    while (queue.length && count < maxStates) {
      var s = queue.shift(); count++;
      for (var i = 0; i < 4; i++) {
        var r = tryMove(p, s, dirs[i][0], dirs[i][1]);
        if (r.event === 'blocked') continue;
        if (r.event === 'win') return r.state.moves;
        var k = key(r.state);
        if (!seen[k]) { seen[k] = true; queue.push(r.state); }
      }
    }
    return -1;
  }

  global.UcieczkaRules = { parse: parse, initialState: initialState, tryMove: tryMove, tile: tile, blockAt: blockAt, solve: solve };
})(typeof window !== 'undefined' ? window : globalThis);
