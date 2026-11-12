import { Board } from '../components/Board';
import { PixelArt } from '../components/PixelArt';
import { redForestLeft, redForestRight } from '../art/forest';
import { useAppDispatch, useAppSelector } from '../hooks/hooks';
import { restartRequested } from '../store/roomSlice';
import { placeOf, ordinal } from '../game/placing';
import { OpponentList } from './Game';

export const GameOver = () => {
    const dispatch = useAppDispatch();
    const room = useAppSelector((state) => state.room);
    const game = useAppSelector((state) => state.game);
    const { me, host, winner, players } = room;
    const solo = players.length === 1;
    const myPlace = me ? placeOf(me, room) : null;

    const title = solo ? 'Game over' : winner === me ? 'You win' : winner ? `${winner} wins` : 'No winner';
    const label = (name: string) => {
        if (name === winner) {
            return 'Winner';
        }
        const place = placeOf(name, room);
        return place ? ordinal(place) : 'Out';
    };

    return (
        <div className="room room-over">
            <section className="side">
                <div className="logo">Red Tetris</div>
                <h1 className="display winner-title">{title}</h1>
                <p className="finish">
                    {solo ? `You placed ${game.locks} pieces` : myPlace && `You finished ${ordinal(myPlace)} of ${players.length}`}
                </p>
                <button className="button button-wide" disabled={me !== host} onClick={() => dispatch(restartRequested())}>
                    Restart game
                </button>
                <p className="muted start-note">Only the host can restart</p>
                <PixelArt art={redForestLeft} cell={16} className="side-forest side-forest-left" />
            </section>
            <section className="centre">
                <div className="centre-status" />
                <Board board={game.board} />
            </section>
            <section className="side side-right">
                <OpponentList opponents={Object.values(room.opponents)} label={(opponent) => label(opponent.name)} />
                <PixelArt art={redForestRight} cell={16} className="side-forest side-forest-right" />
            </section>
        </div>
    );
};
