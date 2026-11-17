import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    test: {
        include: ['tests/**/*.test.{ts,tsx}'],
        coverage: {
            include: ['src/**'],
            // main files only start the app, and preview.tsx is a development-only design tool
            // that never ships in the bundle.
            exclude: ['src/client/main.tsx', 'src/client/preview.tsx', 'src/server/main.ts', 'src/client/index.html'],
            thresholds: { statements: 70, functions: 70, lines: 70, branches: 50 },
        },
    },
});
