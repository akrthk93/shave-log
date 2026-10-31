import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
	define: { __APP_VERSION__: JSON.stringify(pkg.version) },
	plugins: [tailwindcss(), sveltekit()],
	test: { environment: 'node', include: ['tests/**/*.test.ts'] }
});
