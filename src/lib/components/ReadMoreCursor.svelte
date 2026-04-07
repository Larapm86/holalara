<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	/** Desktop (fine pointer, wide viewport): dot; over a case-study link → pill + scramble (never generic “Read more”) */
	const MIN_WIDTH_PX = 901;
	/** Default dot / strip anchor reference */
	const DOT_PX = 14;
	/** Theme control + links — extra-small interactive affordance */
	const DOT_PX_COMPACT = 7;
	const LABEL_SOBERO = 'Building a 0-to-1 Product';
	const LABEL_STRATEGY = 'UX Maturity at scale';
	/** Fifth / sixth placeholder band — same case study route as strip A; distinct cursor copy */
	const LABEL_KWIT_BAND = 'Improving premium user retention';
	const COMPANY_KWIT_BAND = 'Kwit';
	/** Seventh / eighth placeholders — habit loops case study */
	const LABEL_YAZIO_BAND = 'Designing meaningful habit loops';
	const COMPANY_YAZIO_BAND = 'Yazio';
	/** Ninth / tenth placeholders — time-to-value */
	const LABEL_TTV_BAND = 'Accelerating time-to-value';
	const COMPANY_TTV_BAND = 'Yazio';
	/** Eleventh placeholder — systemic growth */
	const LABEL_SYSTEMIC_BAND = 'Assessing systemic growth constraints';
	const COMPANY_WELLTECH_BAND = 'Welltech';
	const COMPANY_SOBERO = 'Sobero';
	const COMPANY_KWIT = 'Kwit';
	const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	/** Case-study pill scramble: tick rate + steps (lower = snappier hover read). */
	const SCRAMBLE_MS = 10;
	const SCRAMBLE_TICKS_MIN = 5;
	const SCRAMBLE_TICKS_MAX = 11;

	function randomChar(): string {
		return CHARSET[(Math.random() * CHARSET.length) | 0] ?? 'X';
	}

	let x = $state(0);
	let y = $state(0);
	let pointerInsideWindow = $state(false);
	/** True only when the pointer is over a case-study panel link (not the strip gutter / odd targets) */
	let overPlaceholdersStrip = $state(false);
	/** Primary nav / mobile menu — use native cursor so hover-prefetch jank cannot “freeze” the custom follower */
	let pointerOverSiteNav = $state(false);
	/** Nav theme, text links, menu — smaller dot (not while case-study pill is open) */
	let overCompactInteractive = $state(false);
	let useCustomCursor = $state(false);
	let reducedMotion = $state(true);
	/** Scramble / final label for the pill */
	let pillText = $state('');
	/** Case-study pair: a/b = strip, kwit = 5–6, yazio = 7–8, ttv = 9–10, systemic = 11 */
	let caseStudyPair = $state<'a' | 'b' | 'kwit' | 'yazio' | 'ttv' | 'systemic' | null>(null);

	const companyLabel = $derived(
		caseStudyPair === 'a'
			? COMPANY_SOBERO
			: caseStudyPair === 'b'
				? COMPANY_KWIT
				: caseStudyPair === 'kwit'
					? COMPANY_KWIT_BAND
					: caseStudyPair === 'yazio'
						? COMPANY_YAZIO_BAND
						: caseStudyPair === 'ttv'
							? COMPANY_TTV_BAND
							: caseStudyPair === 'systemic'
								? COMPANY_WELLTECH_BAND
								: ''
	);

	let scrambleTimer: ReturnType<typeof setInterval> | undefined;

	/** Walk the hit-test stack so overlays / video layers don’t hide the case-study <a> from elementFromPoint. */
	function readCaseStudyPairFromPoint(clientX: number, clientY: number): 'a' | 'b' | 'kwit' | 'yazio' | 'ttv' | 'systemic' | null {
		const stack = document.elementsFromPoint(clientX, clientY);
		for (const node of stack) {
			if (!(node instanceof Element)) continue;
			if (node.closest('.page-main__cs-link--kwit')) return 'kwit';
			if (node.closest('.page-main__cs-link--yazio')) return 'yazio';
			if (node.closest('.page-main__cs-link--time-to-value')) return 'ttv';
			if (node.closest('.page-main__cs-link--systemic-growth')) return 'systemic';
			if (node.closest('.page-main__cs-link--a')) return 'a';
			if (node.closest('.page-main__cs-link--b')) return 'b';
		}
		return null;
	}

	function isCompactInteractiveFromPoint(clientX: number, clientY: number): boolean {
		const stack = document.elementsFromPoint(clientX, clientY);
		for (const node of stack) {
			if (!(node instanceof Element)) continue;
			if (isCompactInteractiveTarget(node)) return true;
		}
		return false;
	}

	/** Theme dot, menu, any link — shrink cursor (case-study strip uses pill instead; excluded there) */
	function isCompactInteractiveTarget(el: Element | null): boolean {
		if (!el) return false;
		if (el.closest('.site-nav')) return false;
		if (el.closest('.site-nav__theme-dot')) return true;
		if (el.closest('.site-nav__menu-btn')) return true;
		if (el.closest('a[href]')) return true;
		return false;
	}

	function isPointerOverSiteNav(clientX: number, clientY: number): boolean {
		const stack = document.elementsFromPoint(clientX, clientY);
		for (const node of stack) {
			if (!(node instanceof Element)) continue;
			if (node.closest('.site-nav')) return true;
		}
		return false;
	}

	const dotPx = $derived(
		overPlaceholdersStrip ? DOT_PX : overCompactInteractive ? DOT_PX_COMPACT : DOT_PX
	);

	function labelForPair(pair: 'a' | 'b' | 'kwit' | 'yazio' | 'ttv' | 'systemic'): string {
		if (pair === 'a') return LABEL_SOBERO;
		if (pair === 'b') return LABEL_STRATEGY;
		if (pair === 'kwit') return LABEL_KWIT_BAND;
		if (pair === 'yazio') return LABEL_YAZIO_BAND;
		if (pair === 'ttv') return LABEL_TTV_BAND;
		return LABEL_SYSTEMIC_BAND;
	}

	function runScramble(finalLabel: string) {
		if (!browser || reducedMotion) {
			pillText = finalLabel;
			return;
		}
		if (scrambleTimer) {
			clearInterval(scrambleTimer);
			scrambleTimer = undefined;
		}

		const len = finalLabel.length;
		let tick = 0;
		const maxTicks = Math.max(
			SCRAMBLE_TICKS_MIN,
			Math.min(SCRAMBLE_TICKS_MAX, Math.ceil(len * 0.38))
		);
		scrambleTimer = setInterval(() => {
			tick += 1;
			const settleThrough = (tick / maxTicks) * (len + 2);
			pillText = finalLabel
				.split('')
				.map((ch, i) => {
					if (ch === ' ') return ' ';
					if (i < settleThrough) return ch;
					return randomChar();
				})
				.join('');
			if (tick >= maxTicks) {
				pillText = finalLabel;
				if (scrambleTimer) clearInterval(scrambleTimer);
				scrambleTimer = undefined;
			}
		}, SCRAMBLE_MS);
	}

	function stopScramble() {
		if (scrambleTimer) {
			clearInterval(scrambleTimer);
			scrambleTimer = undefined;
		}
		pillText = '';
	}

	/** Hide system cursor only when the custom follower is actually painted. */
	$effect(() => {
		if (!browser || typeof document === 'undefined') return;
		document.documentElement.toggleAttribute(
			'data-custom-cursor',
			useCustomCursor && pointerInsideWindow && !pointerOverSiteNav
		);
	});

	onMount(() => {
		if (!browser) return;

		pointerInsideWindow = true;

		reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
		/**
		 * Use `any-pointer: fine`, not `pointer: fine`. Firefox + Windows (and some hybrids) report the
		 * *primary* pointer as coarse when touch is enabled, so `(pointer: fine)` is false even with a
		 * mouse — the custom cursor + case-study scramble never activate.
		 */
		const mqFine = window.matchMedia('(any-pointer: fine)');
		const mqWide = window.matchMedia(`(min-width: ${MIN_WIDTH_PX}px)`);

		function customCursorActive(): boolean {
			return mqFine.matches && mqWide.matches && !mqReduce.matches;
		}

		function evaluate() {
			const next = customCursorActive();
			if (next !== useCustomCursor) {
				useCustomCursor = next;
			}
		}

		evaluate();

		let prevOnCaseStudyLink = false;
		let prevPair: 'a' | 'b' | 'kwit' | 'yazio' | 'ttv' | 'systemic' | null = null;
		/** Wheel/trackpad scroll does not fire pointermove — content under the cursor changes; re-hit-test on scroll */
		let lastClientX = 0;
		let lastClientY = 0;
		let hasLastPointer = false;
		let scrollSyncRaf: number | null = null;

		function applyPoint(clientX: number, clientY: number) {
			pointerOverSiteNav = isPointerOverSiteNav(clientX, clientY);
			const pair = readCaseStudyPairFromPoint(clientX, clientY);
			caseStudyPair = pair;
			overPlaceholdersStrip = pair !== null;
			overCompactInteractive = !overPlaceholdersStrip && isCompactInteractiveFromPoint(clientX, clientY);
			if (pair !== null) {
				const label = labelForPair(pair);
				if (!prevOnCaseStudyLink) {
					runScramble(label);
				} else if (pair !== prevPair) {
					if (scrambleTimer) {
						clearInterval(scrambleTimer);
						scrambleTimer = undefined;
					}
					pillText = label;
				}
			} else if (prevOnCaseStudyLink) {
				stopScramble();
			}
			prevOnCaseStudyLink = pair !== null;
			prevPair = pair;
		}

		const onMove = (e: PointerEvent) => {
			if (!customCursorActive()) return;
			lastClientX = e.clientX;
			lastClientY = e.clientY;
			hasLastPointer = true;
			x = e.clientX;
			y = e.clientY;
			pointerInsideWindow = true;
			applyPoint(lastClientX, lastClientY);
		};

		const onScroll = () => {
			if (!customCursorActive() || !hasLastPointer) return;
			if (scrollSyncRaf !== null) return;
			scrollSyncRaf = requestAnimationFrame(() => {
				scrollSyncRaf = null;
				if (!customCursorActive() || !hasLastPointer) return;
				applyPoint(lastClientX, lastClientY);
			});
		};

		const onLeaveWindow = () => {
			pointerInsideWindow = false;
		};

		const onEnterWindow = () => {
			pointerInsideWindow = true;
		};

		window.addEventListener('pointermove', onMove, { passive: true });
		window.addEventListener('scroll', onScroll, { passive: true, capture: true });
		window.addEventListener('blur', onLeaveWindow);
		document.addEventListener('pointerleave', onLeaveWindow);
		document.addEventListener('pointerenter', onEnterWindow);

		mqReduce.addEventListener('change', evaluate);
		mqFine.addEventListener('change', evaluate);
		mqWide.addEventListener('change', evaluate);

		return () => {
			stopScramble();
			if (scrollSyncRaf !== null) cancelAnimationFrame(scrollSyncRaf);
			window.removeEventListener('pointermove', onMove);
			window.removeEventListener('scroll', onScroll, { capture: true });
			window.removeEventListener('blur', onLeaveWindow);
			document.removeEventListener('pointerleave', onLeaveWindow);
			document.removeEventListener('pointerenter', onEnterWindow);
			mqReduce.removeEventListener('change', evaluate);
			mqFine.removeEventListener('change', evaluate);
			mqWide.removeEventListener('change', evaluate);
			document.documentElement.removeAttribute('data-custom-cursor');
		};
	});
</script>

{#if useCustomCursor && pointerInsideWindow && !pointerOverSiteNav}
	<div
		class="read-more-cursor"
		class:read-more-cursor--strip={overPlaceholdersStrip}
		style="left: {x}px; top: {y}px; --cursor-dot-display: {dotPx}px;"
		aria-hidden="true"
	>
		<div class="read-more-cursor__anchor">
			<span class="read-more-cursor__dot"></span>
			<div class="read-more-cursor__hud">
				{#if overPlaceholdersStrip && companyLabel}
					<span class="read-more-cursor__company">{companyLabel}</span>
				{/if}
				<div class="read-more-cursor__pill">
					<span class="read-more-cursor__pill-inner">{pillText}</span>
					<span class="read-more-cursor__pill-arrow" aria-hidden="true">
						<svg
							class="read-more-cursor__arrow-svg"
							width="12"
							height="12"
							viewBox="0 0 24 24"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								d="M7 17L17 7M17 7H9M17 7V15"
								stroke="currentColor"
								stroke-width="2.25"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
					</span>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.read-more-cursor {
		position: fixed;
		z-index: 10000;
		left: 0;
		top: 0;
		pointer-events: none;
		/* Hotspot at center of dot / pill origin */
		transform: translate(-50%, -50%);
		/* Enter (→ strip): slower; leave (strip → default): faster — set on .read-more-cursor--strip */
		--cursor-morph-in-ms: 260ms;
		--cursor-morph-out-ms: 160ms;
		--cursor-morph-ease: cubic-bezier(0.22, 1, 0.32, 1);
		--cursor-morph-out-ease: cubic-bezier(0.25, 0.46, 0.45, 0.94);
		--cursor-dot-resize-in-ms: 180ms;
		--cursor-dot-resize-out-ms: 140ms;
		--cursor-dot-resize-ease: cubic-bezier(0.25, 0.46, 0.45, 0.94);
	}

	.read-more-cursor__anchor {
		position: relative;
		width: 0;
		height: 0;
	}

	.read-more-cursor__dot {
		position: absolute;
		left: calc(var(--cursor-dot-display, 14px) / -2);
		top: calc(var(--cursor-dot-display, 14px) / -2);
		width: var(--cursor-dot-display, 14px);
		height: var(--cursor-dot-display, 14px);
		border-radius: 0;
		background: var(--fg);
		box-shadow: 0 0 0 1px color-mix(in srgb, var(--bg) 38%, transparent);
		opacity: 1;
		transition:
			width var(--cursor-dot-resize-out-ms) var(--cursor-dot-resize-ease),
			height var(--cursor-dot-resize-out-ms) var(--cursor-dot-resize-ease),
			left var(--cursor-dot-resize-out-ms) var(--cursor-dot-resize-ease),
			top var(--cursor-dot-resize-out-ms) var(--cursor-dot-resize-ease),
			opacity calc(var(--cursor-morph-out-ms) * 0.9) var(--cursor-morph-out-ease),
			transform calc(var(--cursor-morph-out-ms) * 0.9) var(--cursor-morph-out-ease);
	}

	/*
	 * HUD: company chip (strip only) + title pill. Only the pill uses scaleX — scaling the whole HUD
	 * squashed both rectangles and broke the morph (company looked crushed / layout jumped).
	 */
	.read-more-cursor__hud {
		position: absolute;
		left: calc(var(--cursor-dot-display, 14px) / 2);
		top: 50%;
		display: flex;
		align-items: center;
		gap: 0.35rem;
		transform: translateY(-50%);
		transition: left var(--cursor-dot-resize-out-ms) var(--cursor-dot-resize-ease);
	}

	.read-more-cursor__company {
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		padding: 0.35rem 0.55rem;
		border-radius: 0;
		font-family: 'JetBrains Mono', ui-monospace, monospace;
		font-size: 0.6875rem;
		font-weight: 500;
		letter-spacing: 0.06em;
		white-space: nowrap;
		background: var(--fg);
		color: var(--bg);
		box-shadow: 0 2px 12px color-mix(in srgb, var(--fg) 22%, transparent);
	}

	.read-more-cursor__pill {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.35rem 0.55rem;
		border-radius: 0;
		font-family: 'JetBrains Mono', ui-monospace, monospace;
		font-size: 0.6875rem;
		font-weight: 400;
		letter-spacing: 0.02em;
		white-space: nowrap;
		background: var(--fg);
		color: var(--bg);
		box-shadow: 0 2px 12px color-mix(in srgb, var(--fg) 22%, transparent);
		transform: scaleX(0.06);
		transform-origin: left center;
		opacity: 0;
		overflow: hidden;
		transition:
			opacity var(--cursor-morph-out-ms) var(--cursor-morph-out-ease),
			transform var(--cursor-morph-out-ms) var(--cursor-morph-out-ease);
	}

	.read-more-cursor__pill-arrow {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		color: inherit;
	}

	.read-more-cursor__arrow-svg {
		display: block;
	}

	.read-more-cursor__pill-inner {
		display: inline-block;
		font-variant-numeric: tabular-nums;
		text-align: left;
	}

	.read-more-cursor--strip .read-more-cursor__dot {
		opacity: 0;
		transform: scale(0.15);
		transition:
			width var(--cursor-dot-resize-in-ms) var(--cursor-dot-resize-ease),
			height var(--cursor-dot-resize-in-ms) var(--cursor-dot-resize-ease),
			left var(--cursor-dot-resize-in-ms) var(--cursor-dot-resize-ease),
			top var(--cursor-dot-resize-in-ms) var(--cursor-dot-resize-ease),
			opacity calc(var(--cursor-morph-in-ms) * 0.85) var(--cursor-morph-ease),
			transform calc(var(--cursor-morph-in-ms) * 0.85) var(--cursor-morph-ease);
	}

	/* Strip: HUD anchor; only the title pill opens with the horizontal morph */
	.read-more-cursor--strip .read-more-cursor__hud {
		left: 7px;
		transition: left var(--cursor-dot-resize-in-ms) var(--cursor-dot-resize-ease);
	}

	.read-more-cursor--strip .read-more-cursor__pill {
		opacity: 1;
		transform: scaleX(1);
		transition:
			opacity var(--cursor-morph-in-ms) var(--cursor-morph-ease),
			transform var(--cursor-morph-in-ms) var(--cursor-morph-ease);
	}

	@media (prefers-reduced-motion: reduce) {
		.read-more-cursor {
			display: none !important;
		}
	}
</style>
