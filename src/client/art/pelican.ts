import type { PixelArt } from './types';

// Traced from Design.pdf, page 1. Each letter is a palette index (a = 0), "." is empty.
export const pelican: PixelArt = {
    palette: ['#16130e', '#8e180a', '#c5230e', '#e3a72f', '#b9781a'],
    rows: [
        '......................................................................a.......',
        '....................................................................aa........',
        '...............................................bb.................aaaa........',
        '..........................................b....bbb...............aaaa....aaaa.',
        '..........................................bb...bbbb............cccaaaaaaaaaa..',
        '..........................................bbb.bbbbbb.........ccccccaaaaaaaa...',
        '..........................................bbbbbbbbbb.......cccccccccaaaaaa....',
        '.........................................bbbbbbbbbbbb.....cccccccccccaaaaaaa..',
        '.........................................bbbbbbbbbbbb...ccccccccccccccaaaaaaaa',
        '...........................cccccc........bbbbbbbbbbbb.ccccccccccccccccccaaa...',
        '..........................cddccccc.......bbbbbbbbbbbbcccccccccccccccccccc.....',
        '.......................dddddaccccc.......bbbbbbbbbbcccccccccccccccccccc.......',
        '...................dddddddddddcccc........bbbbbbbbcccccccccccccccccc..........',
        '...............dddddddddddddddccccc.......bbbbbbbcccccccccccccccccc...........',
        '............ddddddddddddddddddcccccc.......bbbbbcccccccccccccccccc............',
        '........dddddddddddddddeeeee...cccccc......bbbbcccccccccccccccccc.............',
        '....dddddddddddddeeeeeeeeeeee..ccccccc......bbcccccccccccccccccc..............',
        'dddddddddd.eeeeeeeeeeeeeeeeee...ccccccc.....bcccccccccccccccccc...............',
        'ddd...eeeeeeeeeeeeeeeeeeeeee....cccccccc.ccbccccccccccccccccccc...............',
        '.......eeeeeeeeeeeeeeeeeeee......cccccccccbbbbbbbbbccccccccccbccc.............',
        '........eeeeeeeeeeeeeeeee.........cccccccccccccccccbbbbbbbbbbccccc............',
        '..........eeeeeeeeeeeee............cccccccccccccccccccccccccccccccc...........',
        '...........eeeeeeeeeee..............ccccccccccccccccccccccccccccccccc.........',
        '.....................................ccccccccccccccccccccccccccccccccccc......',
        '.....................................cccccccccccccccccccccccccccccccccccccc...',
        '......................................ccccccccccccccccccccccccccccccccccccccc.',
        '........................................cccccccccccccccccccccccccccccccccccc..',
        '..........................................cccccccccccccccccccc................',
        '.............................................ccccccccccdddd...................',
        '........................................................dddddd................',
        '..........................................................ddd.................',
    ],
};

// The lobby board is dark, so the black wing tips and eye become cream.
export const pelicanOnDark: PixelArt = { ...pelican, palette: ['#f4eddd', ...pelican.palette.slice(1)] };
