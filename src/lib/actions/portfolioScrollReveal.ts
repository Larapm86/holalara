import type { Action } from 'svelte/action';
import { browser } from '$app/environment';

/**
 * Mobile portfolio: add `page-main__panel--in-view` when each panel intersects the viewport
 * so CSS can drop the frost veil and show media (see app.css @media max-width 900px).
 */
const PANEL_SELECTOR = [
	'.page-main__placeholders > .page-main__cs-link',
	'.page-main__placeholders > .page-main__ux-panel-wrap',
	'.page-main__placeholder-5',
	'.page-main__placeholder-6',
	'.page-main__placeholder-7',
	'.page-main__placeholder-8',
	'.page-main__placeholder-9',
	'.page-main__placeholder-10',
	'.page-main__placeholder-11'
].join(', ');

export const portfolioScrollReveal: Action<HTMLElement> = (node) => {
	if (!browser) return {};

	const IN_VIEW = 'page-main__panel--in-view';
	const mq = window.matchMedia('(max-width: 900px)');

	let io: IntersectionObserver | null = null;

	function clearInViewClasses() {
		node.querySelectorAll(`.${IN_VIEW}`).forEach((el) => el.classList.remove(IN_VIEW));
	}

	function setup() {
		io?.disconnect();
		io = null;
		clearInViewClasses();

		if (!mq.matches) return;

		const targets = node.querySelectorAll<HTMLElement>(PANEL_SELECTOR);
		if (targets.length === 0) return;

		io = new IntersectionObserver(
			(entries) => {
				for (const e of entries) {
					if (e.isIntersecting) e.target.classList.add(IN_VIEW);
				}
			},
			{ threshold: 0.1, rootMargin: '0px 0px -12% 0px' }
		);

		targets.forEach((t) => io!.observe(t));
	}

	setup();
	mq.addEventListener('change', setup);

	return {
		destroy() {
			mq.removeEventListener('change', setup);
			io?.disconnect();
			clearInViewClasses();
		}
	};
};
