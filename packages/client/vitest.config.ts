/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Separate vitest config so that `vite build` (production) does not
// transitively load the vitest package and its Vite 8 / Rolldown chain.
// Vitest 4 depends on Vite 8, which pulls in `@rolldown/binding-linux-*`
// native addons. On some CI and cloud build environments npm skips those
// optional platform bindings (npm#4828) and the config load explodes.
// By keeping vite.config.ts completely vitest-free, production `vite build`
// resolves only to `packages/client/node_modules/vite` (v7.1.x) and never
// touches Rolldown.
export default defineConfig({
  plugins: [react()],
  test: {
    name: 'client',
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
});
