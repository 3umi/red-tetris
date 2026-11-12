import type { PixelArt } from './types';

// Traced from Design.pdf, page 1, with one column wrapped onto each side so it fills
// the page edge to edge like the design's partly cut-off edge columns.
export const forest: PixelArt = {
    palette: ['#1b2a25', '#3d5a48', '#23392d'],
    rows: [
        'a.........................................................................a.',
        'a...................b.....................................................a.',
        'a..................cbb...............................a...................ca.',
        '...................cbb..............................caa.....................',
        'c.................ccbbb.............................caa...................c.',
        'c...................c..............................ccaaa................aac.',
        'a..................ccc...............................b..................aaa.',
        'a................bbbbbcc.......c....................abc.........b.........a.',
        'a........b.......bbcbccc......ccc.................caabccc......bbb......aaa.',
        'ab......cbb.......bcccc.......ccc.................caabccc......baa.....ccaab',
        'ab......cbb......ccaccca.....ccccc........b.........aac.......cbbaa....cccab',
        'b......cccbb....bccaacbaa......c.........bba......bbacccc.......b.......cbb.',
        'ba.......c.....bbbbaacbbaa...accbb.......baa.....bbbcccccc....bcccc....cccba',
        'aaa....cccbb.....bbbaabb....baaccbb.....cbaaa....bbbccaccc...bbbaccc..baaaaa',
        'caaa..bbbbbbb..bbbbaaabbcc..bbabbbb.......b.......bbccaac....baaaccc.cbbccca',
        'cb...cbbbbbaaaabbbcaabbbccc..bbbab......bbbcc....bbbcbaccb....cccac....bbccb',
        'baa....cccba..bbbbcacbbbccc.aaaaabc....baabccb..bbbbbbbccbb..ccccaaa..abbbba',
        'baccccccccccccbbabcacccabbbbaaaccbcccbbbaaaccbbbbaaccbbccbbbcccbcaaaaaaabbba',
        'baccccccccccccbaaacaaaaaabbbaaacccccccbbbbaaabbbbbaaccbccbbbcccbbbaaaabbbbba',
    ],
};

// Traced from Design.pdf, page 4, left panel.
export const redForestLeft: PixelArt = {
    palette: ['#2a130d', '#16130e'],
    rows: [
        '........................a....',
        '.......................baa...',
        '..a....................baa...',
        '.aaa..................bbaaa..',
        '.aaa....................b....',
        'baaaa..................bbb...',
        '..b..................aaaaabb.',
        '.bba.........a.......aababbb.',
        'abaaaa......baa.......abbbb..',
        'aaaaba......baa......bbbbbbb.',
        'bbbab......bbbaa....abbbbbabb',
        'bbbabb.......b.....aaaabbbaab',
    ],
};

// Traced from Design.pdf, page 4, right panel.
export const redForestRight: PixelArt = {
    palette: ['#16130e', '#2a130d'],
    rows: [
        '........................a....',
        '.......................aab...',
        '.......................abb...',
        '..a...................aabbb..',
        '.aaa....................a....',
        '.aaa...................aab...',
        'aaaaa................aaaabaa.',
        '..b..................aaaabaa.',
        '.aba.........b.........aab...',
        'aabaaa......bbb......aaaaaab.',
        'aabaaa......baa.....aaaaaaabb',
        '.aaa.......abbaa....aaaaababb',
        'baaaaa.......b.......abbabab.',
        'baaaaaa....baaaa....aaabbbaaa',
    ],
};
