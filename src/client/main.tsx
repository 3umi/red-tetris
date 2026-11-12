import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { createStore } from './store';
import './styles.css';

const root = createRoot(document.getElementById('root')!);
const previewScreen = window.location.pathname.match(/^\/__preview\/(\w+)/)?.[1];

if (import.meta.env.DEV && previewScreen) {
    // Development only: the production bundle never includes the preview screens.
    import('./preview').then(({ Preview }) => root.render(<Preview screen={previewScreen} />));
} else {
    root.render(
        <StrictMode>
            <Provider store={createStore()}>
                <BrowserRouter>
                    <App />
                </BrowserRouter>
            </Provider>
        </StrictMode>,
    );
}
