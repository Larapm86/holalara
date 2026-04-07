<script lang="ts">
	import { browser } from '$app/environment';
	import { afterNavigate } from '$app/navigation';
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import ThemeGlyph from '$lib/components/ThemeGlyph.svelte';
	import ScrambleUnderlineLink from '$lib/components/ScrambleUnderlineLink.svelte';
	import { applyTheme, nextTheme, THEME_STORAGE_KEY, type Theme, isTheme } from '$lib/theme';
	import breakfastImg from '$lib/assets/breakfast.svg';
	import prelunchImg from '$lib/assets/prelunch.svg';
	import lunchImg from '$lib/assets/lunch.svg';
	import predinnerImg from '$lib/assets/predinner.svg';
	import dinnerImg from '$lib/assets/dinner.svg';
	import afterdinnerImg from '$lib/assets/afterdinner.svg';

	type MealPhase =
		| 'afterdinner'
		| 'breakfast'
		| 'prelunch'
		| 'lunch'
		| 'predinner'
		| 'dinner';

	const MEAL_IMAGES: Record<MealPhase, string> = {
		afterdinner: afterdinnerImg,
		breakfast: breakfastImg,
		prelunch: prelunchImg,
		lunch: lunchImg,
		predinner: predinnerImg,
		dinner: dinnerImg
	};

	/** Minutes since local midnight in Alicante (or Madrid / UTC fallback). */
	function alicanteMinutesSinceMidnight(date: Date): number | null {
		const zones = ['Europe/Alicante', 'Europe/Madrid', 'UTC'];
		for (const timeZone of zones) {
			try {
				const parts = new Intl.DateTimeFormat('en-GB', {
					timeZone,
					hour: '2-digit',
					minute: '2-digit',
					hour12: false
				}).formatToParts(date);
				const h = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
				const m = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10);
				return h * 60 + m;
			} catch {
				continue;
			}
		}
		return null;
	}

	/**
	 * Alicante civil time:
	 * afterdinner 23:01–07:00 · breakfast 07:01–11:00 · prelunch 11:01–13:00 · lunch 13:01–16:30 ·
	 * predinner 16:31–20:00 · dinner 20:01–23:00
	 */
	function mealPhaseFromAlicanteMinutes(t: number): MealPhase {
		if (t >= 23 * 60 + 1 || t <= 7 * 60) return 'afterdinner';
		if (t <= 11 * 60) return 'breakfast';
		if (t <= 13 * 60) return 'prelunch';
		if (t <= 16 * 60 + 30) return 'lunch';
		if (t <= 20 * 60) return 'predinner';
		return 'dinner';
	}

	const homePath = $derived(base === '' ? '/' : `${base}/`);
	const indexPath = $derived(`${base}/index`);
	const aboutPath = $derived(`${base}/about`);

	const path = $derived(page.url.pathname);

	/** Prefer route id: pathname alone can miss home vs `base` / resolved path edge cases. */
	const isHome = $derived(page.route.id === '/');

	function pathMatchesIndex() {
		return path === indexPath;
	}

	function pathMatchesAbout() {
		return path === aboutPath || path.startsWith(`${aboutPath}/`);
	}

	let theme = $state<Theme>('light');
	let menuOpen = $state(false);
	let dialogEl = $state<HTMLDialogElement | undefined>(undefined);
	let menuButtonEl = $state<HTMLButtonElement | undefined>(undefined);

	function lowerAmPm(s: string) {
		return s.replace(/\b(AM|PM)\b/g, (m) => m.toLowerCase());
	}

	/** Alicante; Node ICU may omit `Europe/Alicante` — Madrid matches Spain civil time. */
	function formatAlicante(date: Date) {
		const zones = ['Europe/Alicante', 'Europe/Madrid', 'UTC'];
		for (const timeZone of zones) {
			try {
				const raw = new Intl.DateTimeFormat('en-US', {
					timeZone,
					hour: 'numeric',
					minute: '2-digit',
					hour12: true
				}).format(date);
				return lowerAmPm(raw);
			} catch {
				continue;
			}
		}
		return lowerAmPm(
			date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
		);
	}

	function tickClock() {
		alicanteTime = formatAlicante(new Date());
	}

	let alicanteTime = $state(formatAlicante(new Date()));

	const mealPhase = $derived.by(() => {
		alicanteTime;
		const mins = alicanteMinutesSinceMidnight(new Date());
		return mealPhaseFromAlicanteMinutes(mins ?? 0);
	});

	const mealImageUrl = $derived(MEAL_IMAGES[mealPhase]);

	$effect(() => {
		if (!browser) return;
		tickClock();
		const id = setInterval(tickClock, 1000);
		return () => clearInterval(id);
	});

	onMount(() => {
		const stored = localStorage.getItem(THEME_STORAGE_KEY);
		const fromDom = document.documentElement.dataset.theme;
		if (isTheme(stored)) {
			theme = stored;
		} else if (isTheme(fromDom)) {
			theme = fromDom;
		}
		applyTheme(theme);
	});

	afterNavigate(() => {
		dialogEl?.close();
		menuOpen = false;
	});

	function openMenu() {
		dialogEl?.showModal();
		menuOpen = true;
	}

	function closeMenu() {
		dialogEl?.close();
		menuOpen = false;
		menuButtonEl?.focus();
	}

	function toggleMenu() {
		if (dialogEl?.open) closeMenu();
		else openMenu();
	}

	function onDialogClose() {
		menuOpen = false;
	}

	function cycleTheme() {
		const from = theme;
		theme = nextTheme(from);
		applyTheme(theme, { burst: true, from });
	}
</script>

<nav class="site-nav" aria-label="Primary">
	<!-- Desktop: 14-column grid -->
	<div class="site-nav__desktop grid-14">
		<div class="site-nav__cell site-nav__cell--brand">
			<a
				href={homePath}
				data-sveltekit-preload-data="tap"
				class="site-nav__link"
				aria-current={isHome ? 'page' : undefined}
			>
				Lara Perez
			</a>
		</div>

		<div class="site-nav__cell site-nav__col-6">
			<ScrambleUnderlineLink
				href={indexPath}
				text="Index"
				active={pathMatchesIndex()}
				ariaCurrent={pathMatchesIndex() ? 'page' : undefined}
				variant="desktop"
				preloadData="tap"
			/>
		</div>

		<div class="site-nav__cell site-nav__col-about">
			<ScrambleUnderlineLink
				href={aboutPath}
				text="About"
				active={pathMatchesAbout()}
				ariaCurrent={pathMatchesAbout() ? 'page' : undefined}
				variant="desktop"
				preloadData="tap"
			/>
		</div>

		<div class="site-nav__cell site-nav__col-12">
			<span class="site-nav__son-wrap">
				<span class="site-nav__son">Son las</span>
				<span class="site-nav__time-block">
					<span class="site-nav__time" aria-live="polite">{alicanteTime}</span>
					<span class="site-nav__meal-popover">
						<img
							class="site-nav__meal-float"
							src={mealImageUrl}
							alt=""
							aria-hidden="true"
							draggable="false"
						/>
					</span>
				</span>
			</span>
		</div>

		<div class="site-nav__cell site-nav__col-14">
			<button
				type="button"
				class="site-nav__theme-dot"
				onclick={cycleTheme}
				aria-label="Cycle color theme. Current: {theme}"
				title="Theme: {theme}. Click to cycle."
			>
				<ThemeGlyph {theme} />
			</button>
		</div>
	</div>

	<!-- Mobile / tablet: brand + theme + Menu -->
	<div class="site-nav__mobile-bar">
		<a
			href={homePath}
			data-sveltekit-preload-data="tap"
			class="site-nav__link site-nav__mobile-brand"
			aria-current={isHome ? 'page' : undefined}
		>
			Lara Perez
		</a>
		<div class="site-nav__mobile-actions">
			<button
				type="button"
				class="site-nav__theme-dot"
				onclick={cycleTheme}
				aria-label="Cycle color theme. Current: {theme}"
				title="Theme: {theme}. Click to cycle."
			>
				<ThemeGlyph {theme} />
			</button>
			<button
				type="button"
				bind:this={menuButtonEl}
				class="site-nav__menu-btn"
				aria-expanded={menuOpen}
				aria-controls="site-nav-menu-dialog"
				onclick={toggleMenu}
			>
				Menu
			</button>
		</div>

		<!-- Panel lives in the mobile bar; routes + time only (theme is in the bar) -->
		<dialog
			bind:this={dialogEl}
			id="site-nav-menu-dialog"
			class="site-nav__dialog"
			aria-labelledby="site-nav-menu-title"
			onclose={onDialogClose}
		>
			<div class="site-nav__dialog-inner">
				<header class="site-nav__dialog-head">
					<h2 id="site-nav-menu-title" class="site-nav__dialog-title">Menu</h2>
					<button type="button" class="site-nav__dialog-close" onclick={closeMenu} aria-label="Close menu">
						×
					</button>
				</header>

				<ul class="site-nav__dialog-list">
					<li>
						<a
							href={homePath}
							data-sveltekit-preload-data="tap"
							class="site-nav__dialog-link"
							aria-current={isHome ? 'page' : undefined}
							onclick={closeMenu}
						>
							Home
						</a>
					</li>
					<li>
						<ScrambleUnderlineLink
							href={indexPath}
							text="Index"
							active={pathMatchesIndex()}
							ariaCurrent={pathMatchesIndex() ? 'page' : undefined}
							variant="dialog"
							onclick={closeMenu}
							preloadData="tap"
						/>
					</li>
					<li>
						<ScrambleUnderlineLink
							href={aboutPath}
							text="About"
							active={pathMatchesAbout()}
							ariaCurrent={pathMatchesAbout() ? 'page' : undefined}
							variant="dialog"
							onclick={closeMenu}
							preloadData="tap"
						/>
					</li>
				</ul>

				<div class="site-nav__dialog-meta">
					<p class="site-nav__dialog-meta-label">Son las (Alicante)</p>
					<p class="site-nav__dialog-time-outer">
						<span class="site-nav__dialog-time" aria-live="polite">{alicanteTime}</span>
					</p>
				</div>
			</div>
		</dialog>
	</div>
</nav>

<style>
	.site-nav {
		position: sticky;
		top: 0;
		z-index: 200;
		padding-bottom: 0.75rem;
		margin-bottom: 0.5rem;
	}

	/* —— Desktop —— */
	.site-nav__desktop {
		align-items: center;
	}

	.site-nav__cell {
		min-width: 0;
	}

	.site-nav__cell--brand {
		grid-column: 1 / 2;
	}

	.site-nav__col-6 {
		grid-column: 6 / 7;
	}

	.site-nav__col-about {
		grid-column: 7 / 8;
	}

	.site-nav__col-12 {
		grid-column: 12 / 13;
		justify-self: end;
		text-align: right;
		min-width: max-content;
		overflow: visible;
	}

	/* Popover overlaps columns to the right; stay above theme (col 14) */
	.site-nav__desktop .site-nav__col-12 {
		position: relative;
		z-index: 30;
	}

	.site-nav__son-wrap {
		display: inline-flex;
		flex-direction: row;
		flex-wrap: nowrap;
		align-items: baseline;
		gap: 0.35rem;
		overflow: visible;
		position: relative;
	}

	.site-nav__time-block {
		position: relative;
		display: inline-block;
		min-width: 0;
		vertical-align: baseline;
	}

	.site-nav__col-14 {
		grid-column: 14 / 15;
		display: flex;
		justify-content: flex-end;
		align-items: center;
	}

	/* :global — Index/About links render inside ScrambleUnderlineLink */
	.site-nav :global(.site-nav__link) {
		font-size: 0.875rem;
		font-weight: 500;
		letter-spacing: -0.02em;
		color: inherit;
		text-decoration: none;
	}

	.site-nav :global(.site-nav__cell--brand .site-nav__link) {
		font-weight: 400;
	}

	.site-nav :global(.site-nav__link:hover) {
		opacity: 0.72;
	}

	.site-nav :global(.site-nav__link.site-nav__underline-draw:hover),
	.site-nav :global(.site-nav__link.site-nav__underline-draw:focus-visible) {
		opacity: 1;
	}

	.site-nav :global(.site-nav__link--active) {
		text-decoration: underline;
		text-underline-offset: 0.2em;
		text-decoration-thickness: 1px;
	}

	/**
	 * Index / About: lift + scramble; no drawn underline on hover/focus (line only when idle current page).
	 */
	.site-nav :global(.site-nav__underline-draw) {
		position: relative;
		display: inline-block;
		text-decoration: none;
		padding-bottom: 0.42em;
		letter-spacing: -0.02em;
		transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.site-nav :global(.site-nav__underline-draw::after) {
		content: '';
		position: absolute;
		left: 0;
		bottom: 0.06em;
		width: 0;
		height: 2px;
		border-radius: 1px;
		background-color: currentColor;
		opacity: 0.85;
		transition:
			width 0.48s cubic-bezier(0.16, 1, 0.3, 1),
			opacity 0.25s ease,
			height 0.25s ease;
		pointer-events: none;
	}

	.site-nav :global(.site-nav__underline-draw:hover),
	.site-nav :global(.site-nav__underline-draw:focus-visible) {
		transform: translateY(-2px);
	}

	/* Hide rule while hovering or keyboard-focused — no underline during interaction */
	.site-nav :global(.site-nav__underline-draw:hover::after),
	.site-nav :global(.site-nav__underline-draw:focus-visible::after) {
		width: 0;
		opacity: 0;
		height: 2px;
	}

	.site-nav :global(.site-nav__underline-draw.site-nav__link--active),
	.site-nav :global(.site-nav__underline-draw.site-nav__dialog-link--active) {
		text-decoration: none;
	}

	.site-nav :global(.site-nav__underline-draw.site-nav__link--active::after),
	.site-nav :global(.site-nav__underline-draw.site-nav__dialog-link--active::after) {
		width: 100%;
	}

	.site-nav :global(.site-nav__underline-draw.site-nav__link--active:hover),
	.site-nav :global(.site-nav__underline-draw.site-nav__dialog-link--active:hover),
	.site-nav :global(.site-nav__underline-draw.site-nav__link--active:focus-visible),
	.site-nav :global(.site-nav__underline-draw.site-nav__dialog-link--active:focus-visible) {
		transform: translateY(-2px);
	}

	.site-nav :global(.site-nav__underline-draw.site-nav__link--active:hover::after),
	.site-nav :global(.site-nav__underline-draw.site-nav__dialog-link--active:hover::after),
	.site-nav :global(.site-nav__underline-draw.site-nav__link--active:focus-visible::after),
	.site-nav :global(.site-nav__underline-draw.site-nav__dialog-link--active:focus-visible::after) {
		width: 0;
		opacity: 0;
		height: 2px;
	}

	.site-nav :global(.site-nav__dialog-link.site-nav__underline-draw) {
		display: inline-flex;
		width: fit-content;
		max-width: 100%;
	}

	@media (prefers-reduced-motion: reduce) {
		.site-nav :global(.site-nav__underline-draw) {
			transition: none;
		}

		.site-nav :global(.site-nav__underline-draw::after) {
			transition: none;
		}

		.site-nav :global(.site-nav__underline-draw:hover),
		.site-nav :global(.site-nav__underline-draw:focus-visible),
		.site-nav :global(.site-nav__underline-draw.site-nav__link--active:hover),
		.site-nav :global(.site-nav__underline-draw.site-nav__dialog-link--active:hover),
		.site-nav :global(.site-nav__underline-draw.site-nav__link--active:focus-visible),
		.site-nav :global(.site-nav__underline-draw.site-nav__dialog-link--active:focus-visible) {
			transform: none;
		}

		.site-nav :global(.site-nav__underline-draw:hover::after),
		.site-nav :global(.site-nav__underline-draw:focus-visible::after),
		.site-nav :global(.site-nav__underline-draw.site-nav__link--active:hover::after),
		.site-nav :global(.site-nav__underline-draw.site-nav__dialog-link--active:hover::after),
		.site-nav :global(.site-nav__underline-draw.site-nav__link--active:focus-visible::after),
		.site-nav :global(.site-nav__underline-draw.site-nav__dialog-link--active:focus-visible::after) {
			width: 0;
			opacity: 0;
			height: 2px;
		}
	}

	.site-nav__son {
		font-size: 0.8125rem;
		font-weight: 400;
		line-height: 1.25;
		color: inherit;
	}

	.site-nav__time {
		font-size: 0.8125rem;
		font-weight: 400;
		line-height: 1.25;
		font-variant-numeric: tabular-nums;
		color: inherit;
	}

	/* Desktop: meal image in a layer above the grid (no layout shift) */
	.site-nav__desktop .site-nav__son-wrap {
		cursor: help;
	}

	.site-nav__meal-popover {
		display: none;
	}

	.site-nav__desktop .site-nav__meal-popover {
		display: block;
		position: absolute;
		top: calc(100% + 0.2rem);
		left: 0;
		z-index: 200;
		pointer-events: none;
		opacity: 0;
		visibility: hidden;
		transition:
			opacity 0.2s ease,
			visibility 0.2s ease;
	}

	.site-nav__desktop .site-nav__son-wrap:hover .site-nav__meal-popover {
		opacity: 1;
		visibility: visible;
	}

	.site-nav__meal-float {
		display: none;
	}

	.site-nav__desktop .site-nav__meal-float {
		display: block;
		width: 100px;
		height: auto;
		object-fit: contain;
		flex-shrink: 0;
		image-rendering: auto;
		filter: drop-shadow(0 2px 8px color-mix(in srgb, var(--fg) 14%, transparent));
		animation: site-nav-meal-drift 3.2s ease-in-out infinite;
	}

	@keyframes site-nav-meal-drift {
		0%,
		100% {
			transform: translate3d(0, 0, 0);
		}
		50% {
			transform: translate3d(0, -4px, 0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.site-nav__desktop .site-nav__meal-float {
			animation: none;
		}
	}

	.site-nav__theme-dot {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 2.75rem;
		min-height: 2.75rem;
		margin: 0;
		padding: 0;
		border: none;
		border-radius: 6px;
		background: transparent;
		color: var(--accent-dot);
		cursor: pointer;
		flex-shrink: 0;
	}

	.site-nav__theme-dot:focus-visible {
		outline: 2px solid var(--focus-ring);
		outline-offset: 3px;
	}

	/* Mobile-first: always show one bar; desktop overrides below */
	.site-nav__desktop {
		display: none;
	}

	.site-nav__mobile-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		min-height: 2.75rem;
		position: relative;
	}

	.site-nav__mobile-actions {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		flex-shrink: 0;
		margin-left: auto;
	}

	.site-nav__mobile-brand {
		font-size: 0.9375rem;
		font-weight: 400;
		min-height: 44px;
		display: inline-flex;
		align-items: center;
	}

	/* Match .site-nav__link (Index / About) */
	.site-nav__menu-btn {
		margin: 0;
		padding: 0.35rem 0.5rem;
		min-height: 44px;
		min-width: 44px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border: none;
		border-radius: 6px;
		background: transparent;
		color: inherit;
		font-family: inherit;
		font-size: 0.875rem;
		font-weight: 500;
		letter-spacing: -0.02em;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}

	.site-nav__menu-btn:hover {
		opacity: 0.72;
	}

	.site-nav__menu-btn:focus-visible {
		outline: 2px solid var(--focus-ring);
		outline-offset: 2px;
	}

	/* —— Mobile dialog —— */
	.site-nav__dialog {
		margin: auto;
		padding: 0;
		border: 1px solid var(--border-subtle);
		border-radius: 10px;
		background: var(--menu-surface, var(--bg));
		color: var(--fg);
		max-width: min(22rem, calc(100vw - 2rem));
		width: 100%;
		box-shadow: 0 16px 48px color-mix(in srgb, var(--fg) 12%, transparent);
	}

	/* Anchor panel under the hamburger (not centered) so it reads as one menu */
	@media (max-width: 768px) {
		.site-nav__dialog {
			position: fixed;
			inset: auto;
			left: auto;
			right: max(var(--page-margin, 16px), env(safe-area-inset-right, 0px));
			top: calc(
				var(--page-margin, 16px) + 2.75rem + 0.35rem + env(safe-area-inset-top, 0px)
			);
			bottom: auto;
			margin: 0;
			transform: none;
			max-height: min(36rem, calc(100dvh - 5.5rem));
			overflow-y: auto;
			width: min(22rem, calc(100vw - 2 * var(--page-margin, 16px)));
		}
	}

	.site-nav__dialog::backdrop {
		background: color-mix(in srgb, var(--fg) 32%, transparent);
	}

	.site-nav__dialog-inner {
		padding: 1rem 1.1rem 1.25rem;
	}

	.site-nav__dialog-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid var(--border-subtle);
	}

	.site-nav__dialog-title {
		margin: 0;
		font-size: 0.6875rem;
		font-weight: 600;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.site-nav__dialog-close {
		min-width: 44px;
		min-height: 44px;
		margin: -0.5rem;
		border: none;
		border-radius: 6px;
		background: transparent;
		color: var(--fg);
		font-size: 1.5rem;
		line-height: 1;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.site-nav__dialog-close:hover {
		background: color-mix(in srgb, var(--fg) 6%, transparent);
	}

	.site-nav__dialog-close:focus-visible {
		outline: 2px solid var(--focus-ring);
		outline-offset: 2px;
	}

	.site-nav__dialog-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.site-nav__dialog-list li {
		margin: 0;
	}

	.site-nav :global(.site-nav__dialog-link) {
		display: flex;
		align-items: center;
		min-height: 48px;
		padding: 0.35rem 0.5rem;
		margin: 0 -0.5rem;
		border-radius: 6px;
		color: inherit;
		font-size: 1rem;
		font-weight: 500;
		text-decoration: none;
	}

	.site-nav :global(.site-nav__dialog-link:hover) {
		background: color-mix(in srgb, var(--fg) 6%, transparent);
	}

	.site-nav :global(.site-nav__dialog-link:focus-visible) {
		outline: 2px solid var(--focus-ring);
		outline-offset: 0;
	}

	.site-nav :global(.site-nav__dialog-link--active) {
		text-decoration: underline;
		text-underline-offset: 0.25em;
	}

	.site-nav__dialog-meta {
		margin-top: 1.25rem;
		padding-top: 1rem;
		border-top: 1px solid var(--border-subtle);
	}

	.site-nav__dialog-meta-label {
		margin: 0 0 0.25rem;
		font-size: 0.6875rem;
		font-weight: 600;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.site-nav__dialog-time-outer {
		margin: 0;
		display: inline-block;
		width: fit-content;
		max-width: 100%;
	}

	.site-nav__dialog-time {
		font-size: 1.125rem;
		font-variant-numeric: tabular-nums;
		color: var(--fg);
	}

	@media (min-width: 769px) {
		.site-nav__desktop {
			display: grid;
		}

		.site-nav__mobile-bar {
			display: none;
		}
	}
</style>
