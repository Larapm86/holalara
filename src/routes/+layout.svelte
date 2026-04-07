<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import SiteNav from '$lib/components/SiteNav.svelte';
	import TvStaticBackground from '$lib/components/TvStaticBackground.svelte';
	import LenisScroll from '$lib/components/LenisScroll.svelte';
	import ReadMoreCursor from '$lib/components/ReadMoreCursor.svelte';
	import { vtDirFromNavigation } from '$lib/viewTransitionNav';
	import { HOME_MEDIA_EXIT_MS, HOME_POST_EXIT_PAUSE_MS } from '$lib/homeMediaExit';
	import { markIndexIntroPending } from '$lib/indexIntroNav';
	import { isNavigationFromHome, isNavigationToHome } from '$lib/navFromHome';
	import { browser } from '$app/environment';
	import { onNavigate } from '$app/navigation';
	import { onMount, tick } from 'svelte';
	import '../app.css';
	import { pageShellEntrance } from '$lib/actions/pageShellEntrance';

	let { children } = $props();

	const DEBUG_GRID_KEY = 'holalara-debug-grid';

	let debugGrid = $state(false);

	onMount(() => {
		try {
			if (localStorage.getItem(DEBUG_GRID_KEY) === '1') debugGrid = true;
		} catch {
			/* ignore */
		}
	});

	function toggleDebugGrid() {
		debugGrid = !debugGrid;
		try {
			localStorage.setItem(DEBUG_GRID_KEY, debugGrid ? '1' : '0');
		} catch {
			/* ignore */
		}
	}

	/**
	 * View Transitions API — editorial cross-fade + light vertical drift (see `app.css`).
	 *
	 * Home portfolio exit (`.page-main--media-exit`) must run *before* `startViewTransition`, or the
	 * snapshot captures the page without the slide-down and the animation is invisible.
	 *
	 * Important: `onNavigate`’s returned Promise is awaited *before* `navigation.complete`
	 * resolves. Resolving only after `await navigation.complete` deadlocks navigation.
	 * Resolve immediately inside the transition callback, then await completion (SvelteKit pattern).
	 *
	 * @see https://svelte.dev/blog/view-transitions
	 */
	onNavigate(async (navigation) => {
		const fromId = navigation.from?.route?.id;

		/* Index page reads this on first paint to run placeholder-reverse intro before the list */
		if (
			browser &&
			navigation.to?.route?.id === '/index' &&
			fromId != null &&
			fromId !== '/index'
		) {
			markIndexIntroPending();
		}

		/*
		 * Reverse mediaLoadReveal on home — must finish before VT snapshot.
		 * Detect home via pathname + base (route.id can be unreliable). Require portfolio <main> in DOM.
		 * Double rAF so the browser commits the class before the transform transition runs.
		 */
		const portfolioMain = browser
			? document.querySelector<HTMLElement>('.page-main.page-main--portfolio')
			: null;

		if (
			browser &&
			isNavigationFromHome(navigation.from) &&
			portfolioMain &&
			!isNavigationToHome(navigation.to) &&
			!navigation.willUnload &&
			!window.matchMedia('(prefers-reduced-motion: reduce)').matches
		) {
			await tick();
			portfolioMain.classList.add('page-main--media-exit');
			await new Promise<void>((r) => requestAnimationFrame(() => r()));
			await new Promise<void>((r) => requestAnimationFrame(() => r()));
			await new Promise<void>((r) => setTimeout(r, HOME_MEDIA_EXIT_MS));
			await new Promise<void>((r) => setTimeout(r, HOME_POST_EXIT_PAUSE_MS));
		}

		if (!browser || !document.startViewTransition) return;

		/*
		 * iOS Safari (and many mobile WebViews): root view transitions often flash the wrong
		 * intermediate frame — users see `/` (home) before the real destination when tapping
		 * Index / About / Work from the menu. Skip root VT on narrow viewports and touch-primary
		 * devices; navigation still runs normally without the cross-fade.
		 */
		const skipRootViewTransition =
			window.matchMedia('(max-width: 900px)').matches ||
			window.matchMedia('(pointer: coarse)').matches;

		if (skipRootViewTransition) return;

		const dir = vtDirFromNavigation(navigation.from, navigation.to);
		document.documentElement.dataset.vtDir = dir;

		return new Promise<void>((resolve) => {
			const vt = document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
			void vt.finished.finally(() => {
				delete document.documentElement.dataset.vtDir;
			});
		});
	});
</script>

<svelte:head>
	<title>Holalara — Lara Perez</title>
	<link rel="icon" href={favicon} />
</svelte:head>

<TvStaticBackground />
<LenisScroll />
<ReadMoreCursor />

<button
	type="button"
	class="debug-grid-toggle"
	aria-pressed={debugGrid}
	title="Green = 14 columns; orange = row rhythm (home strip + lower bands, or /index /about /work slot); purple = grid cell outlines. Remove when done."
	onclick={toggleDebugGrid}
>
	Grid overlay: {debugGrid ? 'On' : 'Off'}
</button>

<div class="page-shell" class:debug-grid={debugGrid} use:pageShellEntrance>
	<SiteNav />
	{@render children()}
</div>
