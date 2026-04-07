import type { Action } from 'svelte/action';
import { browser } from '$app/environment';

/**
 * Mobile WebKit (esp. iOS Safari) often skips or clamps the first `page-shell-enter` pass after
 * hydration, so the home shell looks static while desktop shows the fade + rise. One frame with
 * `animation: none` forces the engine to restart the declared animation from keyframe 0.
 */
export const pageShellEntrance: Action<HTMLElement> = (node) => {
	if (!browser) return {};

	/* Match SiteNav mobile/tablet bar (1024): landscape phones are often 900–1024px wide and would skip kick at 900px. */
	const mqShellKick = window.matchMedia('(max-width: 1024px)');
	const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');

	function kick() {
		if (!mqShellKick.matches || mqReduce.matches) return;
		node.classList.add('page-shell--entrance-restart');
		void node.offsetHeight;
		node.classList.remove('page-shell--entrance-restart');
	}

	requestAnimationFrame(() => {
		requestAnimationFrame(() => {
			kick();
		});
	});

	return {};
};
