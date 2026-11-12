import { Route, Routes } from 'react-router-dom';
import { Home } from './pages/Home';
import { Room } from './pages/Room';

export const App = () => (
    <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/:room/:player" element={<Room />} />
        <Route path="*" element={<Home />} />
    </Routes>
);
