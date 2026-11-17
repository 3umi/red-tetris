import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { PixelArt } from '../components/PixelArt';
import { pelican } from '../art/pelican';
import { forest } from '../art/forest';

export const MAX_NAME_LENGTH = 32;

export const Home = ({ error }: { error?: string | null }) => {
    const navigate = useNavigate();
    const [room, setRoom] = useState('');
    const [name, setName] = useState('');
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
            <PixelArt art={pelican} cell={9} className="home-pelican" />
            <PixelArt art={forest} cell={18} className="home-forest" />
        </main>
    );
};
