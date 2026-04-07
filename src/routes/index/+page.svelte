<script lang="ts">
	import { browser } from '$app/environment';
	import { onNavigate } from '$app/navigation';
	import { consumeIndexIntroPending } from '$lib/indexIntroNav';
	import { tick } from 'svelte';
	import { INDEX_CASE_STUDIES } from '$lib/indexCaseStudies';

	const COUNT = INDEX_CASE_STUDIES.length;
	/** Exit list reverse-stagger + buffer (see CSS) */
	const EXIT_NAV_MS = 880;
	/** If animationend never fires (browser quirk), still reveal the list */
	const INTRO_FALLBACK_MS = 1100;

	function readInitialPhase(): 'intro' | 'list' {
		if (!browser) return 'list';
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'list';
		if (consumeIndexIntroPending()) return 'intro';
		return 'list';
	}

	/** intro = placeholder bands (reverse collapse); list = case study links */
	let phase = $state<'intro' | 'list'>(readInitialPhase());
	/** True only after intro → list — enables list stagger */
	let playListEnter = $state(false);

	function finishIntro() {
		if (phase !== 'intro') return;
		phase = 'list';
		playListEnter = true;
	}

	/**
	 * Top row (i === 0) has the longest delay, so it finishes last — only then show the list.
	 * Fallback timer covers reduced-motion edge cases or missing animationend.
	 */
	$effect(() => {
		if (phase !== 'intro') return;
		const id = window.setTimeout(() => finishIntro(), INTRO_FALLBACK_MS);
		return () => window.clearTimeout(id);
	});

	const listClass = $derived(
		`index-cs__list${playListEnter ? ' index-cs__list--enter' : ''}`
	);

	onNavigate(async (navigation) => {
		if (!browser) return;
		if (navigation.from?.route?.id !== '/index') return;
		if (navigation.to?.route?.id === '/index') return;
		if (navigation.willUnload) return;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

		await tick();
		const section = document.querySelector('.index-cs');
		if (!section) return;
		section.classList.add('index-cs--exit');
		await new Promise<void>((r) => setTimeout(r, EXIT_NAV_MS));
	});
</script>

<section class="index-cs" aria-labelledby="index-cs-heading" style="--index-cs-total: {COUNT}">
	<h1 id="index-cs-heading" class="index-cs__heading">Case studies</h1>
	<div class="index-cs__nav-spacer" aria-hidden="true"></div>

	{#if phase === 'intro'}
		<div class="index-cs__intro" aria-hidden="true">
			{#each INDEX_CASE_STUDIES as _, i (i)}
				<div
					class="index-cs__intro-band"
					style="--intro-i: {i}"
					onanimationend={(e) => {
						if (e.target !== e.currentTarget) return;
						/* Last band to finish animating (reverse stagger starts from bottom) */
						if (i !== 0) return;
						finishIntro();
					}}
				></div>
			{/each}
		</div>
	{:else}
		<ul class={listClass}>
			{#each INDEX_CASE_STUDIES as cs, i (cs.href)}
				<li class="index-cs__item" style="--index-cs-i: {i}">
					<a class="index-cs__link" href={cs.href}>
						<span class="index-cs__title">{cs.title}</span>
						<span class="index-cs__subtitle">{cs.subtitle}</span>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<style>
	/* Column placement: global rules in app.css (.page-main--route .page-main__slot .index-cs) */

	.index-cs__heading {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	/* Reverse-stagger “placeholder unload” (bottom band first) before list */
	.index-cs__intro {
		display: flex;
		flex-direction: column;
		gap: var(--grid-gap, 16px);
		width: 100%;
		min-width: 0;
		grid-column: 1 / -1;
		grid-row: 2;
	}

	.index-cs__intro-band {
		height: var(--page-main-row-height, 3.5rem);
		border-radius: 0;
		background: color-mix(in srgb, var(--fg) 8%, transparent);
		transform-origin: center bottom;
		animation: index-cs-intro-band 0.42s cubic-bezier(0.22, 1, 0.36, 1) forwards;
		animation-delay: calc((var(--index-cs-total) - 1 - var(--intro-i)) * 0.055s);
	}

	@keyframes index-cs-intro-band {
		from {
			opacity: 1;
			transform: scaleY(1);
		}
		to {
			opacity: 0;
			transform: scaleY(0.35);
		}
	}

	.index-cs__list {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.index-cs__item {
		margin: 0;
		padding: 0;
		opacity: 1;
		transform: translate3d(0, 0, 0);
	}

	.index-cs__list--enter .index-cs__item {
		opacity: 0;
		transform: translate3d(0, 0.75rem, 0);
		animation: index-cs-line 0.72s cubic-bezier(0.22, 1, 0.36, 1) forwards;
		animation-delay: calc(0.05s + var(--index-cs-i) * 0.055s);
	}

	@keyframes index-cs-line {
		to {
			opacity: 1;
			transform: translate3d(0, 0, 0);
		}
	}

	/* Leaving index: reverse order of list enter */
	:global(.index-cs--exit) .index-cs__item {
		animation: index-cs-line-exit 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
		animation-delay: calc((var(--index-cs-total) - 1 - var(--index-cs-i)) * 0.055s);
	}

	@keyframes index-cs-line-exit {
		from {
			opacity: 1;
			transform: translate3d(0, 0, 0);
		}
		to {
			opacity: 0;
			transform: translate3d(0, 0.65rem, 0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.index-cs__intro-band {
			animation: none;
			opacity: 0;
		}

		.index-cs__list--enter .index-cs__item {
			animation: none;
			opacity: 1;
			transform: none;
		}

		:global(.index-cs--exit) .index-cs__item {
			animation: none;
			opacity: 0;
		}
	}

	.index-cs__link {
		display: block;
		grid-column: 1 / -1;
		min-height: 0;
		width: 100%;
		text-decoration: none;
		color: inherit;
		padding-block: 0.15rem;
		transition: opacity 0.22s ease;
	}

	.index-cs__link:hover {
		opacity: 0.72;
	}

	.index-cs__link:focus-visible {
		outline: 2px solid var(--focus-ring);
		outline-offset: 4px;
	}

	.index-cs__title {
		display: inline;
		font-size: 0.875rem;
		font-weight: 500;
		letter-spacing: -0.02em;
		line-height: 1.35;
	}

	.index-cs__subtitle {
		display: inline;
		margin-left: 0.4rem;
		font-size: 0.8125rem;
		font-weight: 400;
		letter-spacing: -0.02em;
		line-height: 1.35;
		color: var(--text-muted);
		white-space: nowrap;
	}
</style>
