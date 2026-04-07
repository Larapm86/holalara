import type { Action } from 'svelte/action';
import { browser } from '$app/environment';

/**
 * Mobile WebKit (esp. iOS Safari) often skips or clamps the first `page-shell-enter` pass after
 * hydration, so the home shell looks static while desktop shows the fade + rise. One frame with
 * `animation: none` forces the engine to restart the declared animation from keyframe 0.
 */
export const pageShellEntrance: Action<HTMLElement> = (node) => {
	if (!browser) return {};

	const mqNarrow = window.matchMedia('(max-width: 900px)');
	const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');

	function kick() {
		if (!mqNarrow.matches || mqReduce.matches) return;
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
