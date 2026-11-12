// Finishing places for the game-over screen. Only the round's players count: the
// winner and everyone in `outOrder`. Someone who joined after the round has no place.

type Round = { outOrder: string[]; winner: string | null };

export const roundSize = ({ outOrder, winner }: Round): number => outOrder.length + (winner ? 1 : 0);

export const placeOf = (name: string, round: Round): number | null => {
    if (name === round.winner) {
        return 1;
    }
    const index = round.outOrder.indexOf(name);
    return index === -1 ? null : roundSize(round) - index;
};

export const ordinal = (n: number): string => {
    const tens = n % 100;
    if (tens >= 11 && tens <= 13) {
        return `${n}th`;
    }
    return `${n}${({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'}`;
};
