<script lang="ts">
	import { onMount } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import Lenis from 'lenis';
	import 'lenis/dist/lenis.css';

	let lenis: Lenis | undefined;

	function scheduleResize() {
		requestAnimationFrame(() => lenis?.resize());
	}

	afterNavigate(() => {
		scheduleResize();
	});

	onMount(() => {
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		/*
		 * Lenis uses a continuous RAF loop (autoRaf) and smooths wheel/touch — great on desktop
		 * with a mouse, but it often feels sluggish on phones/tablets and competes with Lottie/video.
		 * Use native scrolling on touch-primary devices.
		 */
		if (window.matchMedia('(pointer: coarse)').matches) return;

		lenis = new Lenis({
			autoRaf: true,
			/** Slightly higher than default 0.1 — less “lag” behind fast wheel / trackpad */
			lerp: 0.14,
			smoothWheel: true,
			wheelMultiplier: 1,
			touchMultiplier: 1,
			stopInertiaOnNavigate: true
		});

		scheduleResize();
		void document.fonts?.ready?.then(() => scheduleResize());

		return () => {
			lenis?.destroy();
			lenis = undefined;
		};
	});
</script>
