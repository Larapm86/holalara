import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		// Avoid clashing with other Vite apps on the default 5173 — open http://localhost:5199
		port: 5199,
		strictPort: false
	}
});
