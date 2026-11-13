import type { PlayerRecord } from './scoreBook';

export const formatScore = (score: number): string => score.toLocaleString('en-US');

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

// "Best 1,200 · 3 rounds · 1 win"
export const describeRecord = ({ best, rounds, wins }: PlayerRecord): string =>
    [`Best ${formatScore(best)}`, plural(rounds, 'round'), plural(wins, 'win')].join(' · ');
