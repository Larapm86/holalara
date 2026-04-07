import type { Action } from 'svelte/action';
import {
	APP_CURTAIN_SESSION_KEY,
	skipHomeLoadCurtain,
	waitForInitialCurtainHome
} from '$lib/appLoadCurtain';
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
		el.addEventListener('lottie-ready', () => resolve(), { once: true });
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
		await Promise.all(loaders);
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
		if (skipHomeLoadCurtain()) {
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

/**
 * Home strip (P1–P4): one gate for loaders + optional first-visit curtain, then synced `data-media-loaded`.
 */
export const stripMediaLoadReveal: Action<HTMLElement> = (node) => {
	let cancelled = false;
	const isCancelled = () => cancelled;

	let firstVisitCurtainHandoff = false;
	if (browser) {
		try {
			firstVisitCurtainHandoff = sessionStorage.getItem(APP_CURTAIN_SESSION_KEY) !== '1';
		} catch {
			firstVisitCurtainHandoff = false;
		}
		if (firstVisitCurtainHandoff) {
			markLoadedNoAnim(...getStripRevealHosts(node));
		}
	}

	const finish = async () => {
		if (cancelled) return;
		await waitForInitialCurtainHome();
		if (cancelled) return;
		if (firstVisitCurtainHandoff) {
			return;
		}
		if (skipHomeLoadCurtain()) {
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
