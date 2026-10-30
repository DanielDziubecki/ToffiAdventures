/* =========================================================================
   Levels for "Wielka ucieczka". Each level is a room seen from above.

   Map legend:
     #  wall / furniture        .  floor
     T  Toffi's start           C  the cage (goal)
     B  block (can be pushed)   S  closed drawer (bump it to open it)
     1, 2, 3  paper tube ends – two ends with the same digit are connected

   `par` = the smallest possible number of moves (checked with a solver).
   Stars: 3 for par moves, 2 for a few extra moves, 1 for finishing.
   The owner comes back after `par * 2 + 10` moves (see game.js).
   ========================================================================= */
window.UCIECZKA_LEVELS = [
  {
    name: 'Przedpokój',
    hint: 'Idź do klatki!',
    floor: 'wood',
    map: [
      '##########',
      '#T.......#',
      '#..##.#..#',
      '#.......C#',
      '##########'
    ],
    par: 9
  },
  {
    name: 'Salon',
    hint: 'Pchnij klocek, żeby przejść!',
    floor: 'carpet',
    map: [
      '#########',
      '#T..#...#',
      '#...B..C#',
      '#...#...#',
      '#########'
    ],
    par: 9
  },
  {
    name: 'Kuchnia',
    hint: 'Wejdź do rurki – wyjdziesz z drugiej!',
    floor: 'tiles',
    map: [
      '###########',
      '#T...#....#',
      '#....#.1..#',
      '#..1.#...C#',
      '###########'
    ],
    par: 7
  },
  {
    name: 'Łazienka',
    hint: 'Szuflada zamknięta? Pchnij ją, żeby otworzyć!',
    floor: 'bath',
    map: [
      '###########',
      '#T...#....#',
      '#....S...C#',
      '#....#....#',
      '###########'
    ],
    par: 10
  },
  {
    name: 'Sypialnia',
    hint: 'Który klocek trzeba przesunąć?',
    floor: 'carpet2',
    map: [
      '##########',
      '#T...#...#',
      '#..B.#.#.#',
      '#....B...#',
      '###.##..C#',
      '##########'
    ],
    par: 10
  },
  {
    name: 'Pokój zabaw',
    hint: 'Klocek, a potem rurka!',
    floor: 'wood',
    map: [
      '###########',
      '#T.#...#..#',
      '#..B...#.C#',
      '#..#.1.#1.#',
      '###########'
    ],
    par: 8
  },
  {
    name: 'Gabinet',
    hint: 'Najpierw szuflada, potem klocek!',
    floor: 'carpet',
    map: [
      '############',
      '#T..#...#..#',
      '#...S...B..#',
      '#..##...#.C#',
      '############'
    ],
    par: 12
  },
  {
    name: 'Spiżarnia',
    hint: 'Pomyśl, zanim pchniesz!',
    floor: 'tiles',
    map: [
      '############',
      '#T...#..2..#',
      '#.B..#.....#',
      '#..2.#####B#',
      '#....#.C...#',
      '#....#.....#',
      '############'
    ],
    par: 12
  },
  {
    name: 'Pralnia',
    hint: 'Dwie rurki, dwie drogi!',
    floor: 'bath',
    map: [
      '############',
      '#T..#..2#..#',
      '#.1.S...#.C#',
      '#...#B..S..#',
      '#####..1#2.#',
      '############'
    ],
    par: 8
  },
  {
    name: 'Strych',
    hint: 'Ostatni pokój! Do klatki, Toffi!',
    floor: 'wood2',
    map: [
      '#############',
      '#T..B..#..3.#',
      '#.##.#.S.##.#',
      '#.1..#.#..B.#',
      '###.##.#.##.#',
      '#3.B..1#..SC#',
      '#############'
    ],
    par: 16
  }
];
