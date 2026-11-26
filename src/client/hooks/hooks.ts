import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../store';
import { ticked, movedLeft, movedRight, rotated, softDropped, hardDropped } from '../store/gameSlice';

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();

export const useGravity = (active: boolean, delay: number) => {
    const dispatch = useAppDispatch();
    useEffect(() => {
        if (!active) {
            return undefined;
        }
        const id = setInterval(() => dispatch(ticked()), delay);
        return () => clearInterval(id);
    }, [active, delay, dispatch]);
};

const KEYS = {
    ArrowLeft: movedLeft,
    ArrowRight: movedRight,
    ArrowUp: rotated,
    ArrowDown: softDropped,
    ' ': hardDropped,
} as const;

export const useControls = (active: boolean) => {
    const dispatch = useAppDispatch();
    useEffect(() => {
        if (!active) {
            return undefined;
        }
        const onKey = (event: KeyboardEvent) => {
            const action = KEYS[event.key as keyof typeof KEYS];
            if (action) {
                event.preventDefault();
                dispatch(action());
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [active, dispatch]);
};
