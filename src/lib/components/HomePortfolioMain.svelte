<script lang="ts">
	import { base } from '$app/paths';
	import whoMark from '$lib/assets/WHO-logo.png';
	import SoberoStrategyLottie from '$lib/components/SoberoStrategyLottie.svelte';
	import SiteFooter from '$lib/components/SiteFooter.svelte';
	import { mediaLoadReveal } from '$lib/actions/mediaLoadReveal';
	import { portfolioScrollReveal } from '$lib/actions/portfolioScrollReveal';

	/** Case study panel `aria-label` text (matches ReadMoreCursor pill wording where relevant) */
	const CASE_STUDY_A_TITLE = 'Building a 0-1 Product for mindful drinking habits';
	const CASE_STUDY_B_TITLE = 'Improving UX maturity at scale';
	const CASE_STUDY_KWIT_BAND_ARIA =
		'Kwit — Improving premium user retention — open full case study';
	const CASE_STUDY_YAZIO_BAND_ARIA =
		'Yazio — Designing meaningful habit loops — open full case study';
	const CASE_STUDY_TTV_BAND_ARIA =
		'Yazio — Accelerating time-to-value — open full case study';
	const CASE_STUDY_SYSTEMIC_BAND_ARIA =
		'Welltech — Assessing systemic growth constraints — open full case study';

	let { children } = $props();
</script>

<main class="page-main page-main--portfolio grid-14" use:portfolioScrollReveal>
	<div class="page-main__body">
	<div class="page-main__slot grid-14">
		{@render children()}
	</div>
	<div class="page-main__row-spacer" aria-hidden="true"></div>
	<div class="page-main__strip-band">
	<div class="page-main__placeholders">
		<a
			href="{base}/work/zero-to-one"
			class="page-main__cs-link page-main__cs-link--a"
			aria-label="{CASE_STUDY_A_TITLE} — open full case study"
			use:mediaLoadReveal
		>
			<div class="page-main__image-placeholder page-main__image-placeholder--lottie" aria-hidden="true">
				<SoberoStrategyLottie file="sobero-cover-4.json" ariaLabel="" fit="contain" />
			</div>
		</a>
		<a
			href="{base}/work/zero-to-one"
			class="page-main__cs-link page-main__cs-link--a"
			aria-label="{CASE_STUDY_A_TITLE} — open full case study"
			use:mediaLoadReveal
		>
			<div class="page-main__image-placeholder page-main__image-placeholder--media" aria-hidden="true">
				<div class="page-main__phone-frame" aria-hidden="true">
					<video
						class="page-main__image-placeholder__video"
						src="{base}/video/sobero.mov"
						data-media-reveal="metadata"
						preload="metadata"
						autoplay
						muted
						loop
						playsinline
					></video>
				</div>
			</div>
		</a>
		<div class="page-main__placeholders-gap" aria-hidden="true"></div>
		<a
			href="{base}/work/ux-maturity"
			class="page-main__cs-link page-main__cs-link--b"
			aria-label="{CASE_STUDY_B_TITLE} — open full case study"
			use:mediaLoadReveal
		>
			<div class="page-main__image-placeholder page-main__image-placeholder--image" aria-hidden="true">
				<SoberoStrategyLottie file="sobero-strategy01-2.json" ariaLabel="" fit="contain" />
			</div>
		</a>
		<!--
			Wrap link + WHO stamp: the link keeps overflow:hidden like other strip cells so the
			masked slide cannot paint in the wrong place before the grid sizes; the stamp stays a
			sibling with overflow:visible on the wrapper only.
		-->
		<div class="page-main__ux-panel-wrap">
			<a
				href="{base}/work/ux-maturity"
				class="page-main__cs-link page-main__cs-link--b page-main__cs-link--ux-panel"
				aria-label="{CASE_STUDY_B_TITLE} — open full case study"
				use:mediaLoadReveal
			>
				<div class="page-main__ux-panel-reveal" aria-hidden="true">
					<div class="page-main__image-placeholder page-main__image-placeholder--media">
						<div class="page-main__phone-frame" aria-hidden="true">
							<video
								class="page-main__image-placeholder__video"
								src="{base}/video/ux-maturity-discovery.mov"
								data-media-reveal="metadata"
								autoplay
								muted
								loop
								playsinline
								preload="auto"
							></video>
						</div>
					</div>
				</div>
			</a>
			<span class="page-main__placeholder-4-corner" aria-hidden="true">
				<img class="page-main__placeholder-4-corner__mark" src={whoMark} alt="" />
			</span>
		</div>
	</div>
	<div class="page-main__row-spacer page-main__row-spacer--strip-fifth" aria-hidden="true"></div>
	<a
		href="{base}/work/premium-retention"
		class="page-main__placeholder-5 page-main__cs-link page-main__cs-link--kwit"
		aria-label={CASE_STUDY_KWIT_BAND_ARIA}
		use:mediaLoadReveal
	>
		<div class="page-main__image-placeholder page-main__image-placeholder--lottie page-main__placeholder-5-panel">
			<SoberoStrategyLottie file="kwit-next-goal.json" ariaLabel="" fit="contain" />
		</div>
	</a>
	<a
		href="{base}/work/premium-retention"
		class="page-main__placeholder-6 page-main__cs-link page-main__cs-link--kwit"
		aria-label={CASE_STUDY_KWIT_BAND_ARIA}
		use:mediaLoadReveal
	>
		<div class="page-main__image-placeholder page-main__image-placeholder--lottie page-main__placeholder-6-panel"></div>
	</a>
	</div>
	<div class="page-main__row-spacer page-main__row-spacer--after-kwit" aria-hidden="true"></div>
	<a
		href="{base}/work/habit-loops"
		class="page-main__placeholder-7 page-main__cs-link page-main__cs-link--yazio"
		aria-label={CASE_STUDY_YAZIO_BAND_ARIA}
		use:mediaLoadReveal
	>
		<div class="page-main__image-placeholder page-main__image-placeholder--lottie page-main__placeholder-7-panel"></div>
	</a>
	<a
		href="{base}/work/habit-loops"
		class="page-main__placeholder-8 page-main__cs-link page-main__cs-link--yazio"
		aria-label={CASE_STUDY_YAZIO_BAND_ARIA}
		use:mediaLoadReveal
	>
		<div class="page-main__image-placeholder page-main__image-placeholder--lottie page-main__placeholder-8-panel"></div>
	</a>
	<div class="page-main__row-spacer page-main__row-spacer--lower-bands" aria-hidden="true"></div>
	<a
		href="{base}/work/time-to-value"
		class="page-main__placeholder-9 page-main__cs-link page-main__cs-link--time-to-value"
		aria-label={CASE_STUDY_TTV_BAND_ARIA}
		use:mediaLoadReveal
	>
		<div class="page-main__image-placeholder page-main__image-placeholder--lottie page-main__placeholder-9-panel"></div>
	</a>
	<a
		href="{base}/work/time-to-value"
		class="page-main__placeholder-10 page-main__cs-link page-main__cs-link--time-to-value"
		aria-label={CASE_STUDY_TTV_BAND_ARIA}
		use:mediaLoadReveal
	>
		<div class="page-main__image-placeholder page-main__image-placeholder--lottie page-main__placeholder-10-panel"></div>
	</a>
	<div class="page-main__mobile-rhythm page-main__mobile-rhythm--before-11" aria-hidden="true"></div>
	<a
		href="{base}/work/systemic-growth"
		class="page-main__placeholder-11 page-main__cs-link page-main__cs-link--systemic-growth"
		aria-label={CASE_STUDY_SYSTEMIC_BAND_ARIA}
		use:mediaLoadReveal
	>
		<div class="page-main__image-placeholder page-main__image-placeholder--lottie page-main__placeholder-11-panel"></div>
	</a>
	</div>
	<SiteFooter />
</main>
