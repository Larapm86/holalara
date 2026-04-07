import { browser } from '$app/environment';

const INDEX_INTRO_KEY = 'holalara-index-from-home';

/** Set in root layout `onNavigate` before `/index` mounts — survives where sessionStorage alone races. */
let pendingIntro = false;

export function markIndexIntroPending(): void {
	if (!browser) return;
	pendingIntro = true;
	try {
		sessionStorage.setItem(INDEX_INTRO_KEY, '1');
	} catch {
		/* ignore */
	}
}

/** Call once when `/index` decides initial phase. Clears both flag and storage. */
export function consumeIndexIntroPending(): boolean {
	if (!browser) return false;
	if (pendingIntro) {
		pendingIntro = false;
		try {
			sessionStorage.removeItem(INDEX_INTRO_KEY);
		} catch {
			/* ignore */
		}
		return true;
	}
	try {
		if (sessionStorage.getItem(INDEX_INTRO_KEY) === '1') {
			sessionStorage.removeItem(INDEX_INTRO_KEY);
			return true;
		}
	} catch {
		/* ignore */
	}
	return false;
}
