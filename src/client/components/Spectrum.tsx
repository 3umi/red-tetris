import { BOARD_HEIGHT } from '../../shared/board';

export const Spectrum = ({ heights }: { heights: number[] }) => (
    <div className="spectrum" aria-label={`Column heights ${heights.join(' ')}`}>
        {heights.map((height, column) => (
            <span key={column} style={{ height: `${(height / BOARD_HEIGHT) * 100}%` }} />
        ))}
    </div>
);
