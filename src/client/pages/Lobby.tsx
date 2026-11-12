import { Board } from '../components/Board';
import { PixelArt } from '../components/PixelArt';
import { pelicanOnDark } from '../art/pelican';
import { createBoard } from '../../shared/board';
import { useAppDispatch, useAppSelector } from '../hooks/hooks';
import { startRequested } from '../store/roomSlice';

// The pile shown on the lobby board in Design.pdf, as a hint of what is coming.
const PILE = ['0000004400', '0003044000', '0073305500', '7773226550', '1111226660'];
const lobbyBoard = [
    ...createBoard().slice(PILE.length),
    ...PILE.map((row) => [...row].map(Number)),
];

const RED_LINES = [
    ['Clear 1', 0],
    ['Clear 2', 1],
    ['Clear 3', 2],
    ['Clear 4', 3],
] as const;

export const Lobby = () => {
    const dispatch = useAppDispatch();
    const { room, me, host, players } = useAppSelector((state) => state.room);
    const isHost = me === host;

    const tag = (name: string) => [name === host && 'Host', name === me && (name === host ? 'you' : 'You')]
        .filter(Boolean).join(', ');

    return (
        <div className="room">
            <section className="side">
                <div className="logo">Red Tetris</div>
                <h1 className="display room-name">{room}</h1>
                <div className="room-url">{`${window.location.host}/${room}/${me}`}</div>
                <ul className="players" aria-label="Players">
                    {players.map((name) => (
                        <li key={name}>
                            {name}
                            <span className="tag">{tag(name)}</span>
                        </li>
                    ))}
                </ul>
                <div className="spacer" />
                <button className="button button-wide" disabled={!isHost} onClick={() => dispatch(startRequested())}>
                    Start game
                </button>
                <p className="muted start-note">Only the host can start</p>
            </section>
            <section className="centre">
                <div className="centre-status">{`Waiting for ${host ?? '...'} to start`}</div>
                <Board board={lobbyBoard}>
                    <PixelArt art={pelicanOnDark} cell={4} gap={0} className="board-art" />
                </Board>
            </section>
            <section className="side side-right">
                <h2 className="display controls-title">Controls</h2>
                <dl className="controls">
                    <dt><kbd className="key">←</kbd><kbd className="key">→</kbd></dt><dd>Move</dd>
                    <dt><kbd className="key">↑</kbd></dt><dd>Rotate</dd>
                    <dt><kbd className="key">↓</kbd></dt><dd>Soft drop</dd>
                    <dt><kbd className="key">Space</kbd></dt><dd>Hard drop</dd>
                </dl>
                <div className="spacer" />
                <h2 className="display red-lines-title">Red lines</h2>
                <p className="red-lines-text">
                    Clear lines and every opponent gets one less, under their field. They can never be cleared.
                </p>
                <dl className="red-lines">
                    {RED_LINES.map(([label, sent]) => [
                        <dt key={`${label}-t`}>{label}</dt>,
                        <dd key={`${label}-d`}>
                            {sent === 0
                                ? <span className="muted">Sends nothing</span>
                                : Array.from({ length: sent }, (_, i) => <span key={i} className="stripe" />)}
                        </dd>,
                    ])}
                </dl>
            </section>
        </div>
    );
};
