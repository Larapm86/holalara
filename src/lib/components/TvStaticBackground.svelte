<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount, tick } from 'svelte';
	import { renderTvNoiseFrame } from '$lib/tvStaticNoise';
	import { isExtraSoftTvTransition } from '$lib/theme';
	import type { Theme } from '$lib/theme';

	/** Lower = faster; 0.4–0.65 is a good TV-static feel */
	const RES_SCALE = 0.55;

	let canvasEl = $state<HTMLCanvasElement | undefined>(undefined);
	/** Full-strength static (no CSS transition) */
	let visible = $state(false);
	/** Fading out to reveal solid --bg */
	let fading = $state(false);
	/** Longer fade + stronger neutral burst (accent→light, light↔dark) */
	let extraSoft = $state(false);

	function readFadeMs(soft: boolean): number {
		const key = soft ? '--tv-static-fade-ms-soft' : '--tv-static-fade-ms';
		const raw = getComputedStyle(document.documentElement).getPropertyValue(key).trim();
		const n = parseInt(raw, 10);
		return Number.isFinite(n) && n > 0 ? n : soft ? 2100 : 1500;
	}

	function readHoldMs(soft: boolean): number {
		const key = soft ? '--tv-static-burst-hold-ms-soft' : '--tv-static-burst-hold-ms';
		const raw = getComputedStyle(document.documentElement).getPropertyValue(key).trim();
		const n = parseInt(raw, 10);
		return Number.isFinite(n) && n >= 0 ? n : soft ? 200 : 56;
	}

	onMount(() => {
		if (!browser) return;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

		let raf = 0;
		let alive = true;
		let loopActive = false;
		let removeResize: (() => void) | undefined;
		let removeThemeListener: (() => void) | undefined;
		let fadeClear: ReturnType<typeof setTimeout> | undefined;

		void tick().then(() => {
			if (!alive || !canvasEl) return;

			const surface: HTMLCanvasElement = canvasEl;
			const ctx2d = surface.getContext('2d', { alpha: false });
			if (!ctx2d) return;
			const draw: CanvasRenderingContext2D = ctx2d;

			function resize() {
				const w = Math.max(1, Math.floor(window.innerWidth * RES_SCALE));
				const h = Math.max(1, Math.floor(window.innerHeight * RES_SCALE));
				surface.width = w;
				surface.height = h;
			}

			function noiseFrame() {
				if (!alive || !loopActive) return;
				const w = surface.width;
				const h = surface.height;
				renderTvNoiseFrame(draw, w, h);
				raf = requestAnimationFrame(noiseFrame);
			}

			function startLoop() {
				if (loopActive) return;
				loopActive = true;
				raf = requestAnimationFrame(noiseFrame);
			}

			function stopLoop() {
				loopActive = false;
				cancelAnimationFrame(raf);
			}

			function onThemeTransition(e: Event) {
				if (!alive) return;
				const detail = (e as CustomEvent<{ theme: Theme; from: Theme }>).detail;
				clearTimeout(fadeClear);
				extraSoft = isExtraSoftTvTransition(detail.from, detail.theme);
				visible = true;
				fading = false;
				startLoop();
				void tick().then(() => {
					const hold = readHoldMs(extraSoft);
					setTimeout(() => {
						requestAnimationFrame(() => {
							requestAnimationFrame(() => {
								if (!alive) return;
								fading = true;
								const ms = readFadeMs(extraSoft);
								fadeClear = setTimeout(() => {
									if (!alive) return;
									visible = false;
									fading = false;
									extraSoft = false;
									stopLoop();
									fadeClear = undefined;
								}, ms);
							});
						});
					}, hold);
				});
			}

			window.addEventListener('holalara-theme-transition', onThemeTransition);
			removeThemeListener = () =>
				window.removeEventListener('holalara-theme-transition', onThemeTransition);

			resize();
			window.addEventListener('resize', resize, { passive: true });
			removeResize = () => window.removeEventListener('resize', resize);
		});

		return () => {
			alive = false;
			clearTimeout(fadeClear);
			cancelAnimationFrame(raf);
			removeResize?.();
			removeThemeListener?.();
		};
	});
</script>

<canvas
	bind:this={canvasEl}
	class="tv-static-bg"
	class:tv-static-bg--extra-soft={extraSoft}
	class:tv-static-bg--visible={visible}
	class:tv-static-bg--fading={fading}
	aria-hidden="true"
></canvas>

<style>
	.tv-static-bg {
		position: fixed;
		inset: 0;
		z-index: 1;
		width: 100vw;
		height: 100vh;
		pointer-events: none;
		opacity: 0;
		transition: opacity calc(var(--tv-static-fade-ms, 1500) * 1ms)
			var(--tv-static-fade-easing, cubic-bezier(0.22, 0.06, 0.18, 1));
		mix-blend-mode: overlay;
		image-rendering: auto;
	}

	/* Longer / gentler fade for high-contrast hand-offs */
	.tv-static-bg--extra-soft {
		--tv-static-fade-ms: var(--tv-static-fade-ms-soft);
		--tv-static-fade-easing: var(--tv-static-fade-easing-soft);
	}

	/* Peak static during burst (destination theme already applied → blend matches new bg) */
	.tv-static-bg--visible:not(.tv-static-bg--fading) {
		opacity: var(--tv-static-burst-opacity, 0.24);
		transition: none;
	}

	:global(html[data-theme='light']) .tv-static-bg--visible:not(.tv-static-bg--fading),
	:global(html[data-theme='dark']) .tv-static-bg--visible:not(.tv-static-bg--fading),
	:global(html:not([data-theme])) .tv-static-bg--visible:not(.tv-static-bg--fading) {
		mix-blend-mode: normal;
		opacity: var(--tv-static-burst-opacity-neutral, 0.12);
	}

	:global(html[data-theme='light']) .tv-static-bg--extra-soft.tv-static-bg--visible:not(.tv-static-bg--fading),
	:global(html[data-theme='dark']) .tv-static-bg--extra-soft.tv-static-bg--visible:not(.tv-static-bg--fading),
	:global(html:not([data-theme])) .tv-static-bg--extra-soft.tv-static-bg--visible:not(.tv-static-bg--fading) {
		opacity: var(--tv-static-burst-opacity-neutral-soft, 0.22);
	}

	.tv-static-bg--fading {
		opacity: 0;
	}

	@media (prefers-reduced-motion: reduce) {
		.tv-static-bg {
			opacity: 0 !important;
			visibility: hidden;
		}
	}
</style>
