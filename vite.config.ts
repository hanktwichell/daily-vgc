import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

// BASE_PATH lets the same build work at a domain root or under /daily-vgc/ on GitHub Pages.
export default defineConfig({
	base: process.env.BASE_PATH || './',
	plugins: [preact()],
	worker: { format: 'es' },
	build: { target: 'es2022', chunkSizeWarningLimit: 4000 },
});
