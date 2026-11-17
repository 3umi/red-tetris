import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
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
            '/socket.io': { target: 'http://localhost:3000', ws: true },
        },
    },
});
