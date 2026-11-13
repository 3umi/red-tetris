import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
    root: 'src/client',
    plugins: [react()],
    build: {
        outDir: '../../dist',
        emptyOutDir: true,
        rollupOptions: {
            output: {
                entryFileNames: 'bundle.js',
                assetFileNames: 'assets/[name][extname]',
            },
        },
    },
    server: {
        proxy: {
            // The game server's port, from .env at the repo root (see .env.example).
            '/socket.io': { target: `http://localhost:${loadEnv(mode, process.cwd(), '').PORT || 3000}`, ws: true },
        },
    },
}));
