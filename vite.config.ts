import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

const siteUrl = (process.env.VITE_SITE_URL || '').replace(/^https?:\/\//, '').replace(/\/$/, '');

export default defineConfig({
	// Relative asset paths work both at a domain root and under /daily-vgc/ on GitHub Pages.
	base: process.env.BASE_PATH || './',
	plugins: [
		preact(),
		{
			// Link previews need an absolute image URL when the public address is known.
			name: 'og-image',
			transformIndexHtml: html => html.replace('%OG_IMAGE%', siteUrl ? `https://${siteUrl}/og-image.png` : 'og-image.png'),
		},
	],
	// Showdown's State (de)serializer relies on constructor names, so they must survive minification.
	esbuild: { keepNames: true },
	worker: { format: 'es' },
	build: { target: 'es2022', chunkSizeWarningLimit: 4000 },
});
