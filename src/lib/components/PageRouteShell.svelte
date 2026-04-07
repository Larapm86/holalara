<script lang="ts">
	import SiteFooter from '$lib/components/SiteFooter.svelte';

	let { children } = $props();
</script>

<!--
	Same 14-column + row rhythm as home: row 1 = content, row 2 = spacer band,
	row 3 = flex grow, row 4 = footer (matches last row of main grid).
	Body wrapper: display:contents on desktop; on narrow screens main is flex column so footer
	sits at the bottom of the viewport when content is short.
-->
<main class="page-main page-main--route grid-14">
	<div class="page-main__body">
		<div class="page-main__slot grid-14">
			{@render children()}
		</div>
		<div class="page-main__row-spacer" aria-hidden="true"></div>
		<div class="page-main__route-fill" aria-hidden="true"></div>
	</div>
	<SiteFooter />
</main>
