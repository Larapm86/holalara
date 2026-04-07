<script lang="ts">
	import PageRouteShell from '$lib/components/PageRouteShell.svelte';

	let { children } = $props();
</script>

<PageRouteShell>{@render children()}</PageRouteShell>
