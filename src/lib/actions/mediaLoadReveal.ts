import type { Action } from 'svelte/action';
import { APP_CURTAIN_SESSION_KEY, waitForInitialCurtainHome } from '$lib/appLoadCurtain';
import { browser } from '$app/environment';
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

/**
 * Default: `loadedmetadata` — aligns with Lottie strip panels (P2/P4) instead of waiting for
 * `loadeddata` (first decoded frame), which is much later on large .mov files.
 * Opt in to full decode: `data-media-reveal="loadeddata"` on the `<video>`.
 */
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

/** Lets the browser paint the initial “not loaded” state so the CSS transform transition can run. */
function afterPaint(): Promise<void> {
	return new Promise<void>((resolve) => {
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				/*
				 * Narrow + touch: two rAFs are enough; a third frame added noticeable lag on iOS.
				 * Narrow + fine pointer: keep a third frame — WebKit on desktop small windows can
				 * skip painting translateY(108%) before reveal without it.
				 */
				if (browser && window.matchMedia('(max-width: 900px)').matches) {
					if (window.matchMedia('(pointer: coarse)').matches) {
						resolve();
					} else {
						requestAnimationFrame(() => resolve());
					}
				} else {
					resolve();
				}
			});
		});
	});
}

/**
 * Sets `data-media-loaded` on the node when nested videos, images, and Lottie instances are ready.
 * Pair with CSS: `.page-main__cs-link` / `.page-main__placeholder-*` get `overflow: hidden`; first child
 * slides up from below (`translateY`) when `data-media-loaded` is set (masked reveal).
 */
export const mediaLoadReveal: Action<HTMLElement> = (node) => {
	let cancelled = false;

	const finish = async () => {
		if (cancelled) return;
		await afterPaint();
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
			await finish();
			return;
		}

		try {
			await Promise.all(loaders);
		} catch {
			/* still reveal to avoid stuck state */
		}
		if (!cancelled) await finish();
	})();

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

function markHostsLoadedInstant(hosts: HTMLElement[]): void {
	for (const h of hosts) {
		h.setAttribute('data-media-loaded-noanim', '');
		h.setAttribute('data-media-loaded', '');
	}
	requestAnimationFrame(() => {
		requestAnimationFrame(() => {
			for (const h of hosts) h.removeAttribute('data-media-loaded-noanim');
		});
	});
}

/**
 * Home strip (P1–P4): one gate for all tiles — wait for every Lottie + video in the placeholders
 * subtree, then set `data-media-loaded` on all four links together so the masked reveal runs in sync.
 */
export const stripMediaLoadReveal: Action<HTMLElement> = (node) => {
	let cancelled = false;
	let curtainRunThisPass = false;

	if (browser) {
		try {
			curtainRunThisPass = sessionStorage.getItem(APP_CURTAIN_SESSION_KEY) !== '1';
		} catch {
			curtainRunThisPass = false;
		}
		if (curtainRunThisPass) {
			/*
			 * Prevent a one-frame drop-out when the first-load curtain hands off to Home:
			 * keep strip hosts in loaded state from the start of this pass.
			 */
			markHostsLoadedInstant(getStripRevealHosts(node));
		}
	}

	const finish = async () => {
		if (cancelled) return;
		await waitForInitialCurtainHome();
		if (cancelled) return;
		if (curtainRunThisPass) {
			/*
			 * First home load: AppLoadCurtain already animates tiles to final positions.
			 * Keep curtain/load timing gate, but avoid replaying strip reveal.
			 */
			return;
		}
		await afterPaint();
		if (cancelled) return;
		for (const h of getStripRevealHosts(node)) {
			h.setAttribute('data-media-loaded', '');
		}
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
			await finish();
			return;
		}

		try {
			await Promise.all(loaders);
		} catch {
			/* still reveal to avoid stuck state */
		}
		if (!cancelled) await finish();
	})();

	return {
		destroy() {
			cancelled = true;
		}
	};
};
