import { browser } from '$app/environment';

/** Session-only: curtain runs once per tab, then strip reveals immediately on revisit. */
export const APP_CURTAIN_SESSION_KEY = 'holalara-curtain-dismissed';

/**
 * Home strip: after all media loaders resolve, wait for the initial load curtain to lift (first
 * visit this session only), then continue to `afterPaint` + `data-media-loaded`.
 */
export async function waitForInitialCurtainHome(): Promise<void> {
	if (!browser) return;
	try {
		if (sessionStorage.getItem(APP_CURTAIN_SESSION_KEY) === '1') return;
	} catch {
		return;
	}

	await new Promise<void>((resolve) => {
		const done = () => {
			window.removeEventListener('holalara:curtain-dismissed', done);
			resolve();
		};
		window.addEventListener('holalara:curtain-dismissed', done, { once: true });
		/* Double rAF so AppLoadCurtain’s listener is attached before we signal. */
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				window.dispatchEvent(new CustomEvent('holalara:curtain-ready'));
			});
		});
	});
}
