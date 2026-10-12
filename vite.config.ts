import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

const siteUrl = (process.env.VITE_SITE_URL || 'dailyvgc.online').replace(/^https?:\/\//, '').replace(/\/$/, '');

export default defineConfig({
	// Relative asset paths work both at a domain root and under /daily-vgc/ on GitHub Pages.
	base: process.env.BASE_PATH || './',
	plugins: [
		preact(),
		{
			// Link previews need absolute URLs.
			name: 'site-url',
			transformIndexHtml: html => html.replaceAll('%SITE_URL%', `https://${siteUrl}/`).replace('%OG_IMAGE%', `https://${siteUrl}/og-image.png`),
		},
	],
	// Showdown's State (de)serializer relies on constructor names, so they must survive minification.
	esbuild: { keepNames: true },
	worker: { format: 'es' },
	build: { target: 'es2022', chunkSizeWarningLimit: 4000 },
});
