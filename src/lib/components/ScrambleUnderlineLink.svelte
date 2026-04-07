<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import { startScramble, type ScrambleController } from '$lib/scrambleNavText';

	type Variant = 'desktop' | 'dialog';

	let {
		href,
		text,
		active = false,
		ariaCurrent,
		variant,
		onclick,
		/** Override body `hover` preload — nav uses `tap` to avoid main-thread work while moving across links */
		preloadData
	}: {
		href: string;
		text: string;
		active?: boolean;
		ariaCurrent?: 'page' | undefined;
		variant: Variant;
		onclick?: (e: MouseEvent) => void;
		preloadData?: 'hover' | 'tap' | 'off';
	} = $props();

	let display = $state('');
	let anchorEl = $state<HTMLAnchorElement | undefined>(undefined);
	let controller: ScrambleController | null = null;
	let reducedMotion = $state(true);

	$effect(() => {
		display = text;
	});

	onMount(() => {
		reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	});

	function play() {
		if (!browser || reducedMotion) return;
		controller?.cancel();
		controller = startScramble(text, (s) => {
			display = s;
		});
	}

	function settle() {
		controller?.cancel();
		display = text;
		controller = null;
	}

	function onPointerEnter() {
		play();
	}

	function onPointerLeave() {
		if (anchorEl && document.activeElement === anchorEl) return;
		settle();
	}

	function onFocus() {
		play();
	}

	function onBlur() {
		settle();
	}
</script>

<a
	bind:this={anchorEl}
	{href}
	{...(preloadData !== undefined ? { 'data-sveltekit-preload-data': preloadData } : {})}
	class={variant === 'desktop'
		? 'site-nav__link site-nav__underline-draw'
		: 'site-nav__dialog-link site-nav__underline-draw'}
	class:site-nav__link--active={variant === 'desktop' && active}
	class:site-nav__dialog-link--active={variant === 'dialog' && active}
	aria-current={ariaCurrent}
	aria-label={text}
	style:min-width="{text.length}ch"
	{onclick}
	onpointerenter={onPointerEnter}
	onpointerleave={onPointerLeave}
	onfocus={onFocus}
	onblur={onBlur}
>
	<span class="scramble-underline-link__label" aria-hidden="true">{display}</span>
</a>

<style>
	.scramble-underline-link__label {
		display: inline-block;
		min-width: 100%;
		text-align: inherit;
	}
</style>
