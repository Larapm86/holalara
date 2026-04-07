<script lang="ts">
	import { browser } from '$app/environment';
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import { APP_CURTAIN_SESSION_KEY } from '$lib/appLoadCurtain';

	const EXIT_MS = 520;

	function isHomePath(pathname: string): boolean {
		if (!base) return pathname === '/' || pathname === '';
		if (pathname === base || pathname === `${base}/`) return true;
		const rest = pathname.startsWith(base) ? pathname.slice(base.length) || '/' : pathname;
		return rest === '/' || rest === '';
	}

	let show = $state(false);
	let exiting = $state(false);

	$effect.pre(() => {
		if (!browser) return;
		try {
			if (sessionStorage.getItem(APP_CURTAIN_SESSION_KEY) === '1') {
				show = false;
				return;
			}
		} catch {
			show = false;
			return;
		}
		if (!isHomePath(page.url.pathname)) {
			if (show) {
				window.dispatchEvent(new CustomEvent('holalara:curtain-dismissed'));
			}
			show = false;
			exiting = false;
			return;
		}
		show = true;
	});

	$effect(() => {
		if (!browser || !show) return;

		function finishDismiss() {
			try {
				sessionStorage.setItem(APP_CURTAIN_SESSION_KEY, '1');
			} catch {
				/* ignore */
			}
			show = false;
			exiting = false;
			window.dispatchEvent(new CustomEvent('holalara:curtain-dismissed'));
		}

		function onReady() {
			if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
				finishDismiss();
				return;
			}
			exiting = true;
			setTimeout(finishDismiss, EXIT_MS);
		}

		window.addEventListener('holalara:curtain-ready', onReady, { once: true });
		return () => {
			window.removeEventListener('holalara:curtain-ready', onReady);
		};
	});
</script>

{#if show}
	<div
		class="app-load-curtain"
		class:app-load-curtain--exit={exiting}
		aria-hidden="true"
	></div>
{/if}

<style>
	.app-load-curtain {
		position: fixed;
		inset: 0;
		z-index: 5000;
		pointer-events: auto;
		touch-action: none;
		background: var(--bg);
		transform: translate3d(0, 0, 0);
		opacity: 1;
		transition:
			transform 0.52s cubic-bezier(0.22, 1, 0.36, 1),
			opacity 0.45s ease;
		will-change: transform, opacity;
	}

	.app-load-curtain--exit {
		transform: translate3d(0, -105%, 0);
		opacity: 0;
		pointer-events: none;
	}

	@media (prefers-reduced-motion: reduce) {
		.app-load-curtain {
			transition: opacity 0.2s ease;
		}

		.app-load-curtain--exit {
			transform: none;
			opacity: 0;
		}
	}
</style>
