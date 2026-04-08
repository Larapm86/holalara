import type { Action } from 'svelte/action';
import { browser } from '$app/environment';
import { tick } from 'svelte';

const REVEAL_MAX_WAIT_MS = 520;
const LOTTIE_READY_MAX_WAIT_MS = 320;
const PAGE_SYNC_REVEAL_DELAY_MS = 500;

function whenVideoReady(v: HTMLVideoElement): Promise<void> {
	return new Promise((resolve) => {
		if (v.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) resolve();
		else {
			const done = () => resolve();
			v.addEventListener('loadeddata', done, { once: true });
			v.addEventListener('error', done, { once: true });
		}
	});
}

function whenVideoMetadataReady(v: HTMLVideoElement): Promise<void> {
	return new Promise((resolve) => {
		if (v.readyState >= HTMLMediaElement.HAVE_METADATA) resolve();
		else {
			const done = () => resolve();
			v.addEventListener('loadedmetadata', done, { once: true });
			v.addEventListener('error', done, { once: true });
		}
	});
}

function whenVideoRevealReady(v: HTMLVideoElement): Promise<void> {
	if (v.dataset.mediaReveal === 'loadeddata') return whenVideoReady(v);
	return whenVideoMetadataReady(v);
}

function whenImgReady(img: HTMLImageElement): Promise<void> {
	return new Promise((resolve) => {
		if (img.complete && img.naturalWidth > 0) resolve();
		else {
			img.addEventListener('load', () => resolve(), { once: true });
			img.addEventListener('error', () => resolve(), { once: true });
		}
	});
}

function whenLottieReady(el: Element): Promise<void> {
	return new Promise((resolve) => {
		const done = () => resolve();
		el.addEventListener('lottie-ready', done, { once: true });
		window.setTimeout(done, LOTTIE_READY_MAX_WAIT_MS);
	});
}

function collectLoaders(node: HTMLElement): Promise<void>[] {
	const loaders: Promise<void>[] = [];
	for (const v of node.querySelectorAll('video')) {
		loaders.push(whenVideoRevealReady(v));
	}
	for (const img of node.querySelectorAll('img')) {
		if (img.closest('.page-main__placeholder-4-corner')) continue;
		loaders.push(whenImgReady(img));
	}
	for (const el of node.querySelectorAll('.page-main__lottie')) {
		loaders.push(whenLottieReady(el));
	}
	return loaders;
}

/** Two rAFs so the “not loaded” translate state paints before `data-media-loaded` (desktop reveal). */
function afterPaint(): Promise<void> {
	return new Promise<void>((resolve) => {
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				const narrow = browser && window.matchMedia('(max-width: 900px)').matches;
				const coarse = browser && window.matchMedia('(pointer: coarse)').matches;
				if (narrow && !coarse) {
					requestAnimationFrame(() => resolve());
				} else {
					resolve();
				}
			});
		});
	});
}

/**
 * One-frame handoff: `[data-media-loaded-noanim]` disables the slide transition on first paint,
 * then we drop the flag (see app.css).
 */
function markLoadedNoAnim(...elements: HTMLElement[]): void {
	for (const el of elements) {
		el.setAttribute('data-media-loaded-noanim', '');
		el.setAttribute('data-media-loaded', '');
	}
	requestAnimationFrame(() => {
		requestAnimationFrame(() => {
			for (const el of elements) el.removeAttribute('data-media-loaded-noanim');
		});
	});
}

function preferInstantReveal(): boolean {
	if (!browser || typeof window === 'undefined') return false;
	return (
		window.matchMedia('(max-width: 1024px)').matches ||
		window.matchMedia('(pointer: coarse)').matches
	);
}

async function afterLoadersResolve(
	node: HTMLElement,
	cancelled: () => boolean,
	finish: () => Promise<void>
): Promise<void> {
	await tick();
	await new Promise<void>((r) => requestAnimationFrame(() => r()));
	if (cancelled()) return;

	let loaders = collectLoaders(node);
	if (loaders.length === 0) {
		await new Promise<void>((r) => requestAnimationFrame(() => r()));
		if (cancelled()) return;
		loaders = collectLoaders(node);
	}
	if (loaders.length === 0) {
		await finish();
		return;
	}
	try {
		await Promise.race([
			Promise.all(loaders),
			new Promise<void>((resolve) => {
				window.setTimeout(resolve, REVEAL_MAX_WAIT_MS);
			})
		]);
	} catch {
		/* still reveal */
	}
	if (!cancelled()) await finish();
}

/**
 * Sets `data-media-loaded` on the host when nested videos, images, and Lottie instances are ready.
 */
export const mediaLoadReveal: Action<HTMLElement> = (node) => {
	let cancelled = false;
	const isCancelled = () => cancelled;

	const finish = async () => {
		if (cancelled) return;
		if (preferInstantReveal()) {
			markLoadedNoAnim(node);
			return;
		}
		await afterPaint();
		if (cancelled) return;
		node.setAttribute('data-media-loaded', '');
	};

	void afterLoadersResolve(node, isCancelled, finish);

	return {
		destroy() {
			cancelled = true;
		}
	};
};

function getStripRevealHosts(placeholders: HTMLElement): HTMLElement[] {
	const row = placeholders.querySelectorAll<HTMLElement>(':scope > .page-main__cs-link');
	const ux = placeholders.querySelectorAll<HTMLElement>(
		'.page-main__ux-panel-wrap .page-main__cs-link--ux-panel'
	);
	return [...row, ...ux];
}

/** Home strip (P1–P4): one gate for loaders, then synced `data-media-loaded`. */
export const stripMediaLoadReveal: Action<HTMLElement> = (node) => {
	let cancelled = false;
	const isCancelled = () => cancelled;

	const finish = async () => {
		if (cancelled) return;
		if (preferInstantReveal()) {
			markLoadedNoAnim(...getStripRevealHosts(node));
			return;
		}
		await afterPaint();
		if (cancelled) return;
		for (const h of getStripRevealHosts(node)) {
			h.setAttribute('data-media-loaded', '');
		}
	};

	void afterLoadersResolve(node, isCancelled, finish);

	return {
		destroy() {
			cancelled = true;
		}
	};
};

function getPageRevealHosts(root: HTMLElement): HTMLElement[] {
	const hosts = root.querySelectorAll<HTMLElement>(
		[
			'.page-main__placeholders > .page-main__cs-link',
			'.page-main__ux-panel-wrap .page-main__cs-link--ux-panel',
			'.page-main__placeholder-5',
			'.page-main__placeholder-6',
			'.page-main__placeholder-7',
			'.page-main__placeholder-8',
			'.page-main__placeholder-9',
			'.page-main__placeholder-10',
			'.page-main__placeholder-11'
		].join(', ')
	);
	return [...hosts];
}

/** Home page: reveal all placeholder hosts in one synchronized wave. */
export const pageMediaLoadReveal: Action<HTMLElement> = (node) => {
	let cancelled = false;

	const finish = async () => {
		if (cancelled) return;
		const hosts = getPageRevealHosts(node);
		if (hosts.length === 0) return;
		if (preferInstantReveal()) {
			markLoadedNoAnim(...hosts);
			return;
		}
		await afterPaint();
		await new Promise<void>((resolve) => {
			window.setTimeout(resolve, PAGE_SYNC_REVEAL_DELAY_MS);
		});
		if (cancelled) return;
		for (const h of hosts) h.setAttribute('data-media-loaded', '');
	};

	void (async () => {
		await tick();
		if (cancelled) return;
		await finish();
	})();

	return {
		destroy() {
			cancelled = true;
		}
	};
};
