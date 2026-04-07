<script lang="ts">
	import { base } from '$app/paths';
	import HomePortfolioMain from '$lib/components/HomePortfolioMain.svelte';
</script>

<svelte:head>
	<!--
		Strip videos: start both fetches as early as possible (UX clip is largest — list it first).
		Reveal timing for UX uses loadedmetadata in mediaLoadReveal so it aligns with other panels.
	-->
	<link
		rel="preload"
		href="{base}/video/ux-maturity-discovery.mov"
		as="video"
		type="video/quicktime"
		fetchpriority="high"
	/>
	<link rel="preload" href="{base}/video/sobero.mov" as="video" type="video/quicktime" />
</svelte:head>

<HomePortfolioMain>
	<section class="col-span-14"></section>
</HomePortfolioMain>
