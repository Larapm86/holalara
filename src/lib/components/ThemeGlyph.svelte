<script lang="ts">
	import { browser } from '$app/environment';
	import type { Theme } from '$lib/theme';

	let { theme, size = 'sm' }: { theme: Theme; size?: 'sm' | 'lg' } = $props();

	/** Shorter glyph morph on mobile — matches tightened animation durations below */
	const morphClearMs = $derived.by(() => {
		if (!browser || typeof window === 'undefined') return 480;
		if (
			window.matchMedia('(max-width: 900px)').matches ||
			window.matchMedia('(pointer: coarse)').matches
		) {
			return 360;
		}
		return 480;
	});

	const px = $derived(size === 'lg' ? 28 : 20);
	const ink = '#0a0a0a';

	/** Previous committed theme — outgoing layer shows this while incoming animates */
	let lastCommitted = $state<Theme | null>(null);
	/** While set, render outgoing shape + incoming morph animation */
	let morphFrom = $state<Theme | null>(null);
	let morphTimer: ReturnType<typeof setTimeout> | undefined;

	/** Run before DOM updates so morph state + new theme paint in one frame (CSS animations actually run). */
	$effect.pre(() => {
		if (lastCommitted === null) {
			lastCommitted = theme;
			return;
		}
		if (theme === lastCommitted) return;
		morphFrom = lastCommitted;
		lastCommitted = theme;
	});

	/** Clear outgoing layer after both layers have finished animating */
	$effect(() => {
		if (morphFrom === null) return;
		if (morphTimer) clearTimeout(morphTimer);
		const clearMs = morphClearMs;
		morphTimer = setTimeout(() => {
			morphFrom = null;
			morphTimer = undefined;
		}, clearMs);
		return () => {
			if (morphTimer) clearTimeout(morphTimer);
		};
	});
</script>

<!-- Same visual footprint for every theme; colored modes use solid black glyphs -->
<span
	class="theme-glyph"
	class:theme-glyph--lg={size === 'lg'}
	style:width="{px}px"
	style:height="{px}px"
	aria-hidden="true"
>
	<svg
		class="theme-glyph__svg"
		viewBox="0 0 24 24"
		width="100%"
		height="100%"
		xmlns="http://www.w3.org/2000/svg"
		shape-rendering="geometricPrecision"
	>
		{#if morphFrom !== null}
			<g class="theme-glyph__layer theme-glyph__layer--out" aria-hidden="true">
				{#if morphFrom === 'light' || morphFrom === 'dark'}
					<circle cx="12" cy="12" r="9" fill="var(--accent-dot)" />
				{:else if morphFrom === 'pink'}
					<g fill={ink}>
						<circle cx="12" cy="7.2" r="3.4" />
						<circle cx="7.3" cy="11.8" r="3.4" />
						<circle cx="16.7" cy="11.8" r="3.4" />
						<circle cx="9.4" cy="17.2" r="3.4" />
						<circle cx="14.6" cy="17.2" r="3.4" />
						<circle cx="12" cy="12" r="2.6" />
					</g>
				{:else if morphFrom === 'yellow'}
					<path
						fill={ink}
						stroke={ink}
						stroke-width="0.5"
						stroke-linejoin="round"
						stroke-linecap="round"
						d="M12 2.2l2.6 7.4h7.8l-6.3 4.6 2.4 7.6L12 17.4l-6.5 4.4 2.4-7.6-6.3-4.6h7.8L12 2.2z"
					/>
				{:else if morphFrom === 'green'}
					<rect x="5" y="5" width="14" height="14" fill={ink} />
				{:else if morphFrom === 'purple'}
					<polygon fill={ink} points="12,3.5 20.5,12 12,20.5 3.5,12" />
				{:else if morphFrom === 'blue'}
					<polygon fill={ink} points="12,3.5 19.5,7.75 19.5,16.25 12,20.5 4.5,16.25 4.5,7.75" />
				{:else if morphFrom === 'sky'}
					<g fill={ink}>
						<ellipse cx="10.5" cy="12.2" rx="4.2" ry="2.7" />
						<ellipse cx="14.9" cy="11.6" rx="3.5" ry="2.4" />
						<ellipse cx="8" cy="11.8" rx="2.5" ry="1.9" />
					</g>
				{/if}
			</g>
		{/if}
		<!-- Key forces a fresh mount per theme so @keyframes always restart -->
		{#key theme}
			<g
				class="theme-glyph__layer theme-glyph__layer--in"
				class:theme-glyph__layer--enter={morphFrom !== null}
			>
				{#if theme === 'light' || theme === 'dark'}
					<circle cx="12" cy="12" r="9" fill="var(--accent-dot)" />
				{:else if theme === 'pink'}
					<g fill={ink}>
						<circle cx="12" cy="7.2" r="3.4" />
						<circle cx="7.3" cy="11.8" r="3.4" />
						<circle cx="16.7" cy="11.8" r="3.4" />
						<circle cx="9.4" cy="17.2" r="3.4" />
						<circle cx="14.6" cy="17.2" r="3.4" />
						<circle cx="12" cy="12" r="2.6" />
					</g>
				{:else if theme === 'yellow'}
					<path
						fill={ink}
						stroke={ink}
						stroke-width="0.5"
						stroke-linejoin="round"
						stroke-linecap="round"
						d="M12 2.2l2.6 7.4h7.8l-6.3 4.6 2.4 7.6L12 17.4l-6.5 4.4 2.4-7.6-6.3-4.6h7.8L12 2.2z"
					/>
				{:else if theme === 'green'}
					<rect x="5" y="5" width="14" height="14" fill={ink} />
				{:else if theme === 'purple'}
					<polygon fill={ink} points="12,3.5 20.5,12 12,20.5 3.5,12" />
				{:else if theme === 'blue'}
					<polygon fill={ink} points="12,3.5 19.5,7.75 19.5,16.25 12,20.5 4.5,16.25 4.5,7.75" />
				{:else if theme === 'sky'}
					<g fill={ink}>
						<ellipse cx="10.5" cy="12.2" rx="4.2" ry="2.7" />
						<ellipse cx="14.9" cy="11.6" rx="3.5" ry="2.4" />
						<ellipse cx="8" cy="11.8" rx="2.5" ry="1.9" />
					</g>
				{/if}
			</g>
		{/key}
	</svg>
</span>

<style>
	.theme-glyph {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		vertical-align: middle;
	}

	.theme-glyph__svg {
		display: block;
		overflow: visible;
	}

	.theme-glyph__layer {
		transform-origin: 12px 12px;
		transform-box: fill-box;
	}

	/* view-box fallback: some engines handle <g> transforms more reliably */
	@supports (transform-box: view-box) {
		.theme-glyph__layer {
			transform-origin: center;
			transform-box: view-box;
		}
	}

	.theme-glyph__layer--out {
		will-change: opacity, transform;
		animation: theme-glyph-out 0.45s cubic-bezier(0.34, 1.15, 0.32, 1) both;
	}

	.theme-glyph__layer--in {
		opacity: 1;
	}

	.theme-glyph__layer--in.theme-glyph__layer--enter {
		will-change: opacity, transform;
		animation: theme-glyph-in 0.48s cubic-bezier(0.22, 1.12, 0.36, 1) both;
	}

	@keyframes theme-glyph-out {
		from {
			opacity: 1;
			transform: scale(1) rotate(0deg);
		}
		to {
			opacity: 0;
			transform: scale(0.78) rotate(16deg);
		}
	}

	@keyframes theme-glyph-in {
		from {
			opacity: 0;
			transform: scale(1.12) rotate(-14deg);
		}
		to {
			opacity: 1;
			transform: scale(1) rotate(0deg);
		}
	}

	@media (max-width: 900px), (pointer: coarse) {
		.theme-glyph__layer--out {
			animation-duration: 0.28s;
		}

		.theme-glyph__layer--in.theme-glyph__layer--enter {
			animation-duration: 0.32s;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.theme-glyph__layer--out {
			animation: theme-glyph-out-instant 0.01ms linear forwards;
		}

		.theme-glyph__layer--in.theme-glyph__layer--enter {
			animation: none;
		}

		@keyframes theme-glyph-out-instant {
			to {
				opacity: 0;
			}
		}
	}
</style>
