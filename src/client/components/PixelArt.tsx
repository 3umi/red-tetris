import type { PixelArt as Art } from '../art/types';

type Props = {
    art: Art;
    // Size of one square and the gap between squares, in pixels.
    cell: number;
    gap?: number;
    className?: string;
};

export const PixelArt = ({ art, cell, gap = 1, className = '' }: Props) => (
    <div
        className={`pixel-art ${className}`}
        aria-hidden="true"
        style={{
            gridTemplateColumns: `repeat(${art.rows[0].length}, ${cell}px)`,
            gridAutoRows: `${cell}px`,
            gap: `${gap}px`,
        }}
    >
        {art.rows.flatMap((row, y) => [...row].map((code, x) => (
            <span
                key={`${x}-${y}`}
                style={code === '.' ? undefined : { background: art.palette[code.charCodeAt(0) - 97] }}
            />
        )))}
    </div>
);
