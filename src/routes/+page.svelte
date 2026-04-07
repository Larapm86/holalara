<script lang="ts">
	import { base } from '$app/paths';
	import HomePortfolioMain from '$lib/components/HomePortfolioMain.svelte';
</script>

<svelte:head>
	<!--
		Strip videos: start both fetches as early as possible (UX clip is largest — list it first).
		Strip videos: mediaLoadReveal waits on loadedmetadata by default (see mediaLoadReveal.ts).
		Strip Lottie JSON: warm HTTP cache before each SoberoStrategyLottie fetch (smoother mobile load).
	-->
	<link
		rel="preload"
		href="{base}/video/ux-maturity-discovery.mov"
		as="video"
		type="video/quicktime"
		fetchpriority="high"
	/>
	<link rel="preload" href="{base}/video/sobero.mov" as="video" type="video/quicktime" />
	<link rel="preload" href="{base}/lottie/sobero-cover-4.json" as="fetch" crossorigin="anonymous" />
	<link rel="preload" href="{base}/lottie/sobero-strategy01-2.json" as="fetch" crossorigin="anonymous" />
</svelte:head>

<HomePortfolioMain>
	<section class="col-span-14"></section>
</HomePortfolioMain>
