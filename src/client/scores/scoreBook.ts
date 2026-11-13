// Players' results, kept per name. For now they live in the browser's localStorage, so
// they stay on this device. The rest of the client only sees the ScoreBook type, so a
// server-backed leaderboard can replace this file later without other changes.

export type PlayerRecord = {
    name: string;
    best: number;
    rounds: number;
    wins: number;
};

export type RoundResult = { score: number; won: boolean };

export type ScoreBook = {
    get: (name: string) => PlayerRecord | null;
    // Adds one round's result and returns the updated record.
    record: (name: string, result: RoundResult) => PlayerRecord;
    // The records with the highest best scores, highest first.
    top: (count: number) => PlayerRecord[];
};

// The part of the Web Storage API this needs, so tests can pass a plain object.
export type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem'>;

export const STORAGE_KEY = 'red-tetris:scores';

const isRecord = (value: unknown): value is PlayerRecord => {
    const record = value as PlayerRecord;
    return typeof record === 'object' && record !== null && typeof record.name === 'string'
        && [record.best, record.rounds, record.wins].every((n) => Number.isInteger(n) && n >= 0);
};

export const createScoreBook = (storage: KeyValueStorage | null): ScoreBook => {
    // What was read or written last, used when storage is missing or failing (private
    // windows, blocked site data), so scores still last for this visit.
    const memory: Record<string, PlayerRecord> = {};

    const read = (): Record<string, PlayerRecord> => {
        try {
            const parsed: unknown = JSON.parse(storage?.getItem(STORAGE_KEY) ?? 'null');
            if (typeof parsed !== 'object' || parsed === null) {
                return { ...memory };
            }
            return Object.fromEntries(Object.entries(parsed).filter(([name, value]) => isRecord(value) && value.name === name));
        } catch {
            return { ...memory };
        }
    };

    const write = (records: Record<string, PlayerRecord>) => {
        Object.assign(memory, records);
        try {
            storage?.setItem(STORAGE_KEY, JSON.stringify(records));
        } catch {
            // Storage is full or blocked: memory still has it for this visit.
        }
    };

    return {
        get: (name) => read()[name] ?? null,
        record: (name, { score, won }) => {
            const records = read();
            const before = records[name] ?? { name, best: 0, rounds: 0, wins: 0 };
            const after = {
                name,
                best: Math.max(before.best, score),
                rounds: before.rounds + 1,
                wins: before.wins + (won ? 1 : 0),
            };
            write({ ...records, [name]: after });
            return after;
        },
        top: (count) => Object.values(read())
            .filter((record) => record.best > 0)
            .sort((a, b) => b.best - a.best || a.name.localeCompare(b.name))
            .slice(0, count),
    };
};

// The browser's localStorage, or null where it can't be reached.
export const browserStorage = (): KeyValueStorage | null => {
    try {
        return typeof window === 'undefined' ? null : window.localStorage;
    } catch {
        return null;
    }
};
