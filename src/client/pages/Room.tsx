import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/hooks';
import { joinRequested, left } from '../store/roomSlice';
import { Home } from './Home';
import { Lobby } from './Lobby';
import { Game } from './Game';
import { GameOver } from './GameOver';

export const Room = () => {
    const { room = '', player = '' } = useParams();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { phase, error } = useAppSelector((state) => state.room);

    useEffect(() => {
        dispatch(joinRequested({ room, player }));
        return () => {
            dispatch(left());
        };
    }, [room, player, dispatch]);

    const leave = () => navigate('/');

    if (error) {
        return <Home error={error} />;
    }
    if (phase === 'playing') {
        return <Game onLeave={leave} />;
    }
    if (phase === 'over') {
        return <GameOver />;
    }
    return <Lobby />;
};
