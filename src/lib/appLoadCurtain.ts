import { browser } from '$app/environment';

export const APP_CURTAIN_SESSION_KEY = 'holalara-curtain-dismissed';

export function persistDismissedFlag(): void {
	try {
		sessionStorage.setItem(APP_CURTAIN_SESSION_KEY, '1');
	} catch {
		/* private mode / quota */
	}
}

export function isDismissedInSession(): boolean {
	try {
		return sessionStorage.getItem(APP_CURTAIN_SESSION_KEY) === '1';
	} catch {
		return false;
	}
}

/**
 * Curtain mosaic only on large desktop with a real hover pointer; everyone else skips (mobile / tablet / touch).
 */
export function skipHomeLoadCurtain(): boolean {
	if (!browser || typeof window === 'undefined') return true;
	const desktop =
		window.matchMedia('(min-width: 1025px)').matches &&
		window.matchMedia('(pointer: fine)').matches &&
		window.matchMedia('(hover: hover)').matches;
	return !desktop;
}

/** Home strip: wait for curtain dismiss on first desktop visit, then media can reveal. */
export async function waitForInitialCurtainHome(): Promise<void> {
	if (!browser) return;
	if (skipHomeLoadCurtain()) {
		persistDismissedFlag();
		return;
	}
	if (isDismissedInSession()) return;

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
		const fallbackId = window.setTimeout(done, 7000);
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				window.dispatchEvent(new CustomEvent('holalara:curtain-ready'));
			});
		});
	});
}
