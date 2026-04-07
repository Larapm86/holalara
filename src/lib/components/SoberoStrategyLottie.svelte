<script lang="ts">
	import { browser } from '$app/environment';
	import { base } from '$app/paths';
	import { onMount, tick } from 'svelte';
	import type { AnimationItem } from 'lottie-web';

	/** Must match IntersectionObserver rootMargin vertical inset (px). */
	const VIEW_MARGIN_PX = 120;

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

	function isNearViewport(el: HTMLElement) {
		const r = el.getBoundingClientRect();
		const m = VIEW_MARGIN_PX;
		return (
			r.bottom > -m &&
			r.top < window.innerHeight + m &&
			r.right > 0 &&
			r.left < window.innerWidth
		);
	}

	onMount(() => {
		if (!browser) return;

		let anim: AnimationItem | undefined;
		let cancelled = false;
		let resizeObserver: ResizeObserver | undefined;
		let intersectionObserver: IntersectionObserver | undefined;
		let roRaf = 0;
		let onVisibility: (() => void) | undefined;

		void (async () => {
			await tick();
			if (cancelled || !containerEl) return;

			function dispatchLottieReady() {
				containerEl?.dispatchEvent(new CustomEvent('lottie-ready', { bubbles: true }));
			}

			function applyVisibilityPlayback() {
				if (!anim || !containerEl || cancelled) return;
				if (document.hidden) {
					anim.pause();
					return;
				}
				if (isNearViewport(containerEl)) anim.play();
				else anim.pause();
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
					autoplay: false,
					animationData: data,
					rendererSettings: {
						preserveAspectRatio: fit === 'contain' ? 'xMidYMid meet' : 'xMidYMid slice',
						hideOnTransparent: true
					}
				});

				anim.setSubframe(false);

				intersectionObserver = new IntersectionObserver(
					([entry]) => {
						if (!anim || !entry || cancelled) return;
						if (document.hidden) {
							anim.pause();
							return;
						}
						if (entry.isIntersecting) anim.play();
						else anim.pause();
					},
					{ root: null, rootMargin: `${VIEW_MARGIN_PX}px 0px`, threshold: 0 }
				);
				intersectionObserver.observe(containerEl);

				onVisibility = () => {
					if (document.hidden) anim?.pause();
					else applyVisibilityPlayback();
				};
				document.addEventListener('visibilitychange', onVisibility);

				{
					const coarse =
						typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
					const narrow =
						typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches;
					if (narrow && coarse) {
						requestAnimationFrame(() => {
							applyVisibilityPlayback();
							requestAnimationFrame(() => {
								anim?.resize();
								dispatchLottieReady();
							});
						});
					} else {
						requestAnimationFrame(() => {
							applyVisibilityPlayback();
							requestAnimationFrame(() => {
								anim?.resize();
								requestAnimationFrame(() => {
									dispatchLottieReady();
								});
							});
						});
					}
				}

				resizeObserver = new ResizeObserver(() => {
					if (roRaf) return;
					roRaf = requestAnimationFrame(() => {
						roRaf = 0;
						if (!cancelled) anim?.resize();
					});
				});
				resizeObserver.observe(containerEl);
			} catch {
				dispatchLottieReady();
			}
		})();

		return () => {
			cancelled = true;
			if (roRaf) cancelAnimationFrame(roRaf);
			if (onVisibility) document.removeEventListener('visibilitychange', onVisibility);
			resizeObserver?.disconnect();
			intersectionObserver?.disconnect();
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
