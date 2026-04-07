import type { Action } from 'svelte/action';
import { tick } from 'svelte';

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

/** Fires once dimensions/duration are known — much earlier than `loadeddata` on large .mov files. */
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
	if (v.dataset.mediaReveal === 'metadata') return whenVideoMetadataReady(v);
	return whenVideoReady(v);
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
		el.addEventListener('lottie-ready', () => resolve(), { once: true });
	});
}

function collectLoaders(node: HTMLElement): Promise<void>[] {
	const loaders: Promise<void>[] = [];
	for (const v of node.querySelectorAll('video')) {
		loaders.push(whenVideoRevealReady(v));
	}
	for (const img of node.querySelectorAll('img')) {
		/* Corner badge / chrome — must not delay the main masked reveal (e.g. UX maturity WHO stamp). */
		if (img.closest('.page-main__placeholder-4-corner')) continue;
		loaders.push(whenImgReady(img));
	}
	for (const el of node.querySelectorAll('.page-main__lottie')) {
		loaders.push(whenLottieReady(el));
	}
	return loaders;
}

/**
 * Sets `data-media-loaded` on the node when nested videos, images, and Lottie instances are ready.
 * Pair with CSS: `.page-main__cs-link` / `.page-main__placeholder-*` get `overflow: hidden`; first child
 * slides up from below (`translateY`) when `data-media-loaded` is set (masked reveal).
 */
export const mediaLoadReveal: Action<HTMLElement> = (node) => {
	let cancelled = false;

	const finish = () => {
		if (cancelled) return;
		node.setAttribute('data-media-loaded', '');
	};

	void (async () => {
		await tick();
		await new Promise<void>((r) => requestAnimationFrame(() => r()));

		if (cancelled) return;

		let loaders = collectLoaders(node);

		if (loaders.length === 0) {
			await new Promise<void>((r) => requestAnimationFrame(() => r()));
			if (cancelled) return;
			loaders = collectLoaders(node);
		}

		if (loaders.length === 0) {
			queueMicrotask(finish);
			return;
		}

		try {
			await Promise.all(loaders);
		} catch {
			/* still reveal to avoid stuck state */
		}
		if (!cancelled) finish();
	})();

	return {
		destroy() {
			cancelled = true;
		}
	};
};
