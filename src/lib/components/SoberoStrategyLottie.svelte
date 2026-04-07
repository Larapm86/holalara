<script lang="ts">
	import { browser } from '$app/environment';
	import { base } from '$app/paths';
	import { onMount, tick } from 'svelte';

	type Props = {
		/** Filename under `/lottie/` */
		file?: string;
		ariaLabel?: string;
		/** `contain` = full animation visible (xMidYMid meet); `cover` = fill cell, may crop (slice) */
		fit?: 'contain' | 'cover';
	};

	let {
		file = 'sobero-cover.json',
		ariaLabel = 'Sobero cover animation',
		fit = 'cover'
	}: Props = $props();

	let containerEl = $state<HTMLDivElement | undefined>(undefined);

	onMount(() => {
		if (!browser) return;

		let anim: { destroy: () => void; resize: () => void } | undefined;
		let cancelled = false;
		let resizeObserver: ResizeObserver | undefined;

		void (async () => {
			await tick();
			if (cancelled || !containerEl) return;

			function dispatchLottieReady() {
				containerEl?.dispatchEvent(new CustomEvent('lottie-ready', { bubbles: true }));
			}

			try {
				const lottie = (await import('lottie-web')).default;
				const res = await fetch(`${base}/lottie/${file}`);
				if (!res.ok || cancelled || !containerEl) {
					dispatchLottieReady();
					return;
				}
				const data = await res.json();

				anim = lottie.loadAnimation({
					container: containerEl,
					renderer: 'svg',
					loop: true,
					autoplay: true,
					animationData: data,
					rendererSettings: {
						preserveAspectRatio: fit === 'contain' ? 'xMidYMid meet' : 'xMidYMid slice',
						hideOnTransparent: true
					}
				});

				requestAnimationFrame(() => {
					anim?.resize();
					requestAnimationFrame(() => {
						dispatchLottieReady();
					});
				});

				resizeObserver = new ResizeObserver(() => {
					anim?.resize();
				});
				resizeObserver.observe(containerEl);
			} catch {
				dispatchLottieReady();
			}
		})();

		return () => {
			cancelled = true;
			resizeObserver?.disconnect();
			anim?.destroy();
		};
	});
</script>

<div
	bind:this={containerEl}
	class="page-main__lottie"
	class:page-main__lottie--contain={fit === 'contain'}
	role={ariaLabel ? 'img' : 'presentation'}
	aria-label={ariaLabel || undefined}
></div>
