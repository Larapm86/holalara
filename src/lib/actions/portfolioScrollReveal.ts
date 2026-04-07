import type { Action } from 'svelte/action';
import { browser } from '$app/environment';

/**
 * Mobile portfolio: add `page-main__panel--in-view` when each panel intersects the viewport
 * so CSS can drop the frost veil and show media (see app.css @media max-width 900px).
 *
 * WebKit on iOS often reports 0×0 or off-screen rects on the first frame; a generous
 * rootMargin + deferred `primeViewport` passes keep above-the-fold panels from staying
 * “stuck” behind frost while media has already revealed.
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
	let resizeHandler: (() => void) | undefined;
	let vvHandler: (() => void) | undefined;

	function clearInViewClasses() {
		node.querySelectorAll(`.${IN_VIEW}`).forEach((el) => el.classList.remove(IN_VIEW));
	}

	function setup() {
		io?.disconnect();
		if (resizeHandler) {
			window.removeEventListener('resize', resizeHandler);
			resizeHandler = undefined;
		}
		if (vvHandler && window.visualViewport) {
			window.visualViewport.removeEventListener('resize', vvHandler);
			vvHandler = undefined;
		}
		io = null;
		clearInViewClasses();

		if (!mq.matches) return;

		const targets = Array.from(node.querySelectorAll<HTMLElement>(PANEL_SELECTOR));
		if (targets.length === 0) return;

		function primeViewport() {
			const vh = window.innerHeight;
			if (vh <= 0) return;
			const pad = 140;
			for (const t of targets) {
				const r = t.getBoundingClientRect();
				if (r.bottom > -pad && r.top < vh + pad) t.classList.add(IN_VIEW);
			}
		}

		io = new IntersectionObserver(
			(entries) => {
				for (const e of entries) {
					if (e.isIntersecting) e.target.classList.add(IN_VIEW);
				}
			},
			{ threshold: 0, rootMargin: '22% 0px 38% 0px' }
		);

		for (const t of targets) {
			io.observe(t);
		}

		primeViewport();
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				primeViewport();
			});
		});
		setTimeout(primeViewport, 80);

		resizeHandler = () => queueMicrotask(primeViewport);
		window.addEventListener('resize', resizeHandler, { passive: true });
		if (window.visualViewport) {
			vvHandler = () => queueMicrotask(primeViewport);
			window.visualViewport.addEventListener('resize', vvHandler, { passive: true });
		}
	}

	setup();
	mq.addEventListener('change', setup);

	return {
		destroy() {
			mq.removeEventListener('change', setup);
			io?.disconnect();
			if (resizeHandler) window.removeEventListener('resize', resizeHandler);
			if (vvHandler && window.visualViewport) window.visualViewport.removeEventListener('resize', vvHandler);
			clearInViewClasses();
		}
	};
};
