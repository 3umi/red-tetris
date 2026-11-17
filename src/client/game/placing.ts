// Finishing places for the game-over screen. Only the round's players count: the
// `roster` taken when it started, plus anyone the server reports in `outOrder` or as the
// winner. Someone who joined after the round has no place, and neither does someone who
// left before losing, though they still count towards the total.

type Round = { roster: string[]; outOrder: string[]; winner: string | null };

export const roundSize = ({ roster, outOrder, winner }: Round): number =>
    new Set([...roster, ...outOrder, ...(winner ? [winner] : [])]).size;

export const placeOf = (name: string, { outOrder, winner }: Round): number | null => {
    if (name === winner) {
        return 1;
    }
    const index = outOrder.indexOf(name);
    return index === -1 ? null : (winner ? 1 : 0) + outOrder.length - index;
};

export const ordinal = (n: number): string => {
    const tens = n % 100;
    if (tens >= 11 && tens <= 13) {
        return `${n}th`;
    }
    return `${n}${({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'}`;
};
