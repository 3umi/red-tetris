import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { PixelArt } from '../components/PixelArt';
import { pelican } from '../art/pelican';
import { forest } from '../art/forest';
import { useAppSelector } from '../hooks/hooks';
import { formatScore } from '../scores/format';

export const MAX_NAME_LENGTH = 32;

export const Home = ({ error }: { error?: string | null }) => {
    const navigate = useNavigate();
    const [room, setRoom] = useState('');
    const [name, setName] = useState('');
    const top = useAppSelector((state) => state.scores.top);
    const ready = room.trim() !== '' && name.trim() !== '';

    const join = (event: FormEvent) => {
        event.preventDefault();
        if (ready) {
            navigate(`/${encodeURIComponent(room.trim())}/${encodeURIComponent(name.trim())}`);
        }
    };

    return (
        <main className="home">
            <h1 className="display home-title">
                <span className="red">Red</span>
                Tetris
            </h1>
            <div className="home-body">
                <div>
                    <p className="home-tagline">Same pieces, same room. Clear lines and bury your friends in red.</p>
                    <form className="home-form" onSubmit={join}>
                        <label className="field">
                            Room
                            <input value={room} maxLength={MAX_NAME_LENGTH} onChange={(event) => setRoom(event.target.value)} />
                        </label>
                        <label className="field">
                            Your name
                            <input value={name} maxLength={MAX_NAME_LENGTH} onChange={(event) => setName(event.target.value)} />
                        </label>
                        <button className="button" type="submit" disabled={!ready}>Join room</button>
                    </form>
                    {error && <p className="home-error" role="alert">{error}</p>}
                </div>
                {top.length > 0 && (
                    <section className="best-scores">
                        <h2 className="best-scores-title">Best on this device</h2>
                        <ol aria-label="Best scores">
                            {top.map((record) => (
                                <li key={record.name}>
                                    <span>{record.name}</span>
                                    <span>{formatScore(record.best)}</span>
                                </li>
                            ))}
                        </ol>
                    </section>
                )}
            </div>
            <PixelArt art={pelican} cell={9} className="home-pelican" />
            <PixelArt art={forest} cell={18} className="home-forest" />
        </main>
    );
};
