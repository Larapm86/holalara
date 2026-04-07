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

	const listClass = $derived(`cs-list${playListEnter ? ' cs-list--enter' : ''}`);

	onNavigate(async (navigation) => {
		if (!browser) return;
		if (navigation.from?.route?.id !== '/index') return;
		if (navigation.to?.route?.id === '/index') return;
		if (navigation.willUnload) return;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

		await tick();
		const section = document.getElementById('index');
		if (!section) return;
		section.classList.add('index--exit');
		await new Promise<void>((r) => setTimeout(r, EXIT_NAV_MS));
	});
</script>

<section id="index" aria-labelledby="index-heading" style="--index-cs-total: {COUNT}">
	<div class="index-nav-spacer" aria-hidden="true"></div>
	<div class="index-section">
		<h1 class="index-heading" id="index-heading">Case studies</h1>

		{#if phase === 'intro'}
			<div class="index-intro" aria-hidden="true">
				{#each INDEX_CASE_STUDIES as _, i (i)}
					<div
						class="index-intro-band"
						style="--intro-i: {i}"
						onanimationend={(e) => {
							if (e.target !== e.currentTarget) return;
							if (i !== 0) return;
							finishIntro();
						}}
					></div>
				{/each}
			</div>
		{:else}
			<ul class={listClass} aria-label="All case studies">
				{#each INDEX_CASE_STUDIES as cs, i (cs.href)}
					<li class="cs-item" style="--index-cs-i: {i}">
						<a class="cs-link" href={cs.href}>
							<span class="cs-number" aria-hidden="true"
								>{String(i + 1).padStart(2, '0')}</span
							>
							<span class="cs-title">{cs.title}</span>
							<span class="cs-company">{cs.subtitle}</span>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</section>

<style>
	/* Column placement: global rules in app.css (`#index` in `.page-main--route .page-main__slot`) */

	.index-heading {
		grid-column: 1 / -1;
		margin: 0 0 0.25rem;
		font-size: clamp(1.25rem, 2.5vw, 1.5rem);
		font-weight: 600;
		letter-spacing: -0.03em;
		line-height: 1.2;
		color: var(--fg);
	}

	.index-intro {
		display: flex;
		flex-direction: column;
		gap: var(--grid-gap, 16px);
		width: 100%;
		min-width: 0;
		grid-column: 1 / -1;
	}

	.index-intro-band {
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

	.cs-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.cs-item {
		margin: 0;
		padding: 0;
		opacity: 1;
		transform: translate3d(0, 0, 0);
	}

	.cs-list--enter .cs-item {
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

	:global(#index.index--exit) .cs-item {
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
		.index-intro-band {
			animation: none;
			opacity: 0;
		}

		.cs-list--enter .cs-item {
			animation: none;
			opacity: 1;
			transform: none;
		}

		:global(#index.index--exit) .cs-item {
			animation: none;
			opacity: 0;
		}
	}

	.cs-link {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		align-items: baseline;
		gap: 0.75rem 1rem;
		grid-column: 1 / -1;
		min-height: 0;
		width: 100%;
		text-decoration: none;
		color: inherit;
		padding-block: 0.15rem;
		transition: opacity 0.22s ease;
	}

	.cs-link:hover {
		opacity: 0.72;
	}

	.cs-link:focus-visible {
		outline: 2px solid var(--focus-ring);
		outline-offset: 4px;
	}

	.cs-number {
		font-size: 0.75rem;
		font-weight: 500;
		font-variant-numeric: tabular-nums;
		letter-spacing: 0.02em;
		color: var(--text-muted);
	}

	.cs-title {
		font-size: 0.875rem;
		font-weight: 500;
		letter-spacing: -0.02em;
		line-height: 1.35;
		min-width: 0;
	}

	.cs-company {
		font-size: 0.8125rem;
		font-weight: 400;
		letter-spacing: -0.02em;
		line-height: 1.35;
		color: var(--text-muted);
		white-space: nowrap;
	}
</style>
