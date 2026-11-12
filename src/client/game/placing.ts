// Finishing places for the game-over screen. Players knocked out first finish last.

type Round = { players: string[]; outOrder: string[]; winner: string | null };

export const placeOf = (name: string, { players, outOrder, winner }: Round): number | null => {
    if (name === winner) {
        return 1;
    }
    const index = outOrder.indexOf(name);
    return index === -1 ? null : players.length - index;
};

export const ordinal = (n: number): string => {
    const tens = n % 100;
    if (tens >= 11 && tens <= 13) {
        return `${n}th`;
    }
    return `${n}${({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'}`;
};
