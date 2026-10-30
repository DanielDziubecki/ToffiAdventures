/* =========================================================================
   Levels for "Przygoda w ogrodzie" (side-scrolling platformer).
   One character = one 48×48 tile.

   Map legend:
     #  ground             =  thin platform (jump up through it)
     P  Toffi's start      F  lost hamster friend (end of the level)
     K  checkpoint         b  berry
     h  hedgehog           c  crow (flies back and forth)
     w  puddle water       m  mushroom (bouncy!)
     L  lettuce (decor)    f  flower (decor)

   Toffi can jump about 3 tiles high and 4 tiles far, so keep steps at most
   2 tiles high and gaps at most 3 tiles wide.
   ========================================================================= */
window.OGROD_LEVELS = [
  {
    name: 'Grządki sałaty',
    theme: 'lettuce',
    friend: { palette: 'grey', name: 'Pestka' },
    map: [
      '                                                                                                        ',
      '                                                                                                        ',
      '                                                                                                        ',
      '                                                                                                        ',
      '                       b                                                                                ',
      '                      ===                                                             bbb               ',
      '          bbb       b                         bb      bb               bb             ###      b        ',
      '          ===    b ###                        ##     ====         c   ====         ######     ===       ',
      '  P Lbbb L f  L ######  L  f h L bb  LK   ##f ## L##      hL  bfb  Lb     L K  f######### L h  f L  F   ',
      '########################################################################################################',
      '########################################################################################################'
    ]
  },
  {
    name: 'Kałuże po deszczu',
    theme: 'rain',
    friend: { palette: 'choco', name: 'Kluska' },
    map: [
      '                                                                                                                ',
      '                                                                                                                ',
      '                                                               bbb                                              ',
      '                      bbb                                     =====                                             ',
      '                           bb                                                                                   ',
      '                          ====                                                                                  ',
      '          bb       b                             b                                            bb   b            ',
      '                                    b  b      c       b     b                   b  b      c       ===           ',
      '  P  bbb      bb       m        h          K        f###   ###  m    h  bb  K           h             f    F    ',
      '##########ww######www##############ww==ww#######www#####www####################ww==ww#########ww################',
      '################################################################################################################'
    ]
  },
  {
    name: 'Wspinaczka na drzewo',
    theme: 'tree',
    friend: { palette: 'snow', name: 'Śnieżka' },
    map: [
      '                        ',
      '                        ',
      '                        ',
      '                        ',
      '                        ',
      '      b F b             ',
      '     ========           ',
      '                        ',
      '          ========      ',
      '                   b    ',
      '                ======= ',
      '                        ',
      '             =======    ',
      '            b           ',
      '         =======        ',
      '                        ',
      '     =======            ',
      '    b             c     ',
      ' =======                ',
      '                        ',
      '    =======             ',
      '            b           ',
      '         =======        ',
      '                     K  ',
      '              ========= ',
      '              b         ',
      '           =======      ',
      '                        ',
      '      =======           ',
      '    b h                 ',
      ' ========         c     ',
      '                        ',
      '    ========            ',
      '             b          ',
      '          ========      ',
      '                        ',
      '                ======= ',
      '               b        ',
      '            =======     ',
      '                        ',
      '        =======         ',
      '    K b                 ',
      '   ========             ',
      '                        ',
      '     c   =======        ',
      '                 b      ',
      '              ========  ',
      '                        ',
      '          =======       ',
      '         b              ',
      '      =======           ',
      '                        ',
      '  =======               ',
      '  f P  bb       h   f   ',
      '########################',
      '########################'
    ]
  }
];
