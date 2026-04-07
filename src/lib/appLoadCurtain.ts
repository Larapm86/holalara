import { browser } from '$app/environment';

/** Session-only: curtain runs once per tab, then strip reveals immediately on revisit. */
export const APP_CURTAIN_SESSION_KEY = 'holalara-curtain-dismissed';

/**
 * Home strip: after all media loaders resolve, wait for the initial load curtain to lift (first
 * visit this session only), then continue to `afterPaint` + `data-media-loaded`.
 */
export async function waitForInitialCurtainHome(): Promise<void> {
	if (!browser) return;
	let dismissed = false;
	try {
		dismissed = sessionStorage.getItem(APP_CURTAIN_SESSION_KEY) === '1';
	} catch {
		dismissed = false;
	}
	if (dismissed) return;

	await new Promise<void>((resolve) => {
		let settled = false;
		const done = () => {
			if (settled) return;
			settled = true;
			clearTimeout(fallbackId);
			window.removeEventListener('holalara:curtain-dismissed', done);
			resolve();
		};
		window.addEventListener('holalara:curtain-dismissed', done, { once: true });
		/* Safety valve: never deadlock home if the curtain event chain breaks. */
		const fallbackId = window.setTimeout(done, 7000);
		/* Double rAF so AppLoadCurtain’s listener is attached before we signal. */
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				window.dispatchEvent(new CustomEvent('holalara:curtain-ready'));
			});
		});
	});
}
