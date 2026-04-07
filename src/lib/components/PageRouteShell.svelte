<script lang="ts">
	import SiteFooter from '$lib/components/SiteFooter.svelte';

	let { children } = $props();
</script>

<!--
	Same 14-column + row rhythm as home: row 1 = content, row 2 = spacer band,
	row 3 = flex grow, row 4 = footer (matches last row of main grid).
-->
<main class="page-main page-main--route grid-14">
	<div class="page-main__slot grid-14">
		{@render children()}
	</div>
	<div class="page-main__row-spacer" aria-hidden="true"></div>
	<div class="page-main__route-fill" aria-hidden="true"></div>
	<SiteFooter />
</main>
