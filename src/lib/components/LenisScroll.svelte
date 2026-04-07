<script lang="ts">
	import { onMount } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import Lenis from 'lenis';
	import 'lenis/dist/lenis.css';

	let lenis: Lenis | undefined;

	function scheduleResize() {
		lenis?.resize();
		requestAnimationFrame(() => lenis?.resize());
	}

	afterNavigate(() => {
		scheduleResize();
	});

	onMount(() => {
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

		lenis = new Lenis({
			autoRaf: true,
			/** Default-ish lerp — values ~0.06–0.07 lag behind fast wheel input and feel “stuck” */
			lerp: 0.1,
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
