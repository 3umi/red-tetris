import { Board } from '../components/Board';
import { Spectrum } from '../components/Spectrum';
import { useAppSelector, useControls, useGravity } from '../hooks/hooks';
import type { Opponent } from '../store/roomSlice';

const STATUS_LABEL = { playing: 'Playing', out: 'Out', winner: 'Winner' } as const;

export const OpponentList = ({ opponents, label = (o) => STATUS_LABEL[o.status] }: {
    opponents: Opponent[];
    label?: (opponent: Opponent) => string;
}) => (
    <div className="opponents">
        {opponents.map((opponent) => (
            <div key={opponent.name} className={opponent.status === 'out' ? 'opponent opponent-out' : 'opponent'}>
                <div className="opponent-head">
                    <span className="display opponent-name">{opponent.name}</span>
                    <span className="opponent-status">{label(opponent)}</span>
                </div>
                <Spectrum heights={opponent.spectrum} />
            </div>
        ))}
    </div>
);

export const Game = ({ onLeave }: { onLeave: () => void }) => {
    const { room, players, outOrder, opponents } = useAppSelector((state) => state.room);
    const game = useAppSelector((state) => state.game);
    const playing = game.status === 'playing';
    useGravity(playing);
    useControls(playing);

    const stillPlaying = players.length - outOrder.length;

    return (
        <div className="room">
            <section className="side">
                <div className="logo">Red Tetris</div>
                <h1 className="display room-name-small">{room}</h1>
                <div className="muted">{`${stillPlaying} of ${players.length} still playing`}</div>
                <div className="display penalty-count" aria-label="Red lines under you">{game.penalty}</div>
                <div className="penalty-label">Red lines under you</div>
                {game.lastPenaltyFrom && <div className="muted">{`Last sent by ${game.lastPenaltyFrom}`}</div>}
                <div className="spacer" />
                <button className="leave" onClick={onLeave}>Leave game</button>
            </section>
            <section className="centre">
                <div className="centre-status">{game.status === 'lost' ? 'You are out' : ''}</div>
                <Board board={game.board} piece={game.piece} />
            </section>
            <section className="side side-right">
                <OpponentList opponents={Object.values(opponents)} />
            </section>
        </div>
    );
};
