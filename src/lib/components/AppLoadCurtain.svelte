<script lang="ts">
	import { browser } from '$app/environment';
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import { tick } from 'svelte';
	import { APP_CURTAIN_SESSION_KEY, skipHomeLoadCurtain } from '$lib/appLoadCurtain';

	type TileState = {
		left: number;
		top: number;
		width: number;
		height: number;
		scale: number;
		opacity: number;
		transition: string;
		html: string;
	};

	const EXIT_MS = 640;
	const COUNTER_MS = 1900;
	const NAME_SHOW_MS = 620;
	const BURST_START_MS = 1000;
	const BURST_SPAN_MS = 500;
	const BURST_POP_MS = 220;
	const BURST_FLY_MS = 720;
	const HOLD_MOSAIC_MS = 450;
	const NAME_HIDE_GAP_MS = 260;
	const GRID_FLY_MS = 900;
	const GRID_STAGGER_MS = 60;
	const FAILSAFE_DISMISS_MS = 8500;
	const SNAPSHOT_MAX_DIM = 640;
	const TARGET_WAIT_RETRY_MS = 120;
	const TARGET_WAIT_MAX_RETRIES = 45;
	const TARGET_WAIT_MAX_RETRIES_COARSE = 85;
	const GAP = 3;
	const MOSAIC_ROWS: Array<Array<[number, number]>> = [
		[
			[220, 120],
			[180, 120],
			[210, 120]
		],
		[
			[160, 110],
			[200, 110],
			[170, 110],
			[190, 110]
		],
		[
			[190, 105],
			[170, 105],
			[200, 105],
			[160, 105]
		]
	];

	function isHomePath(pathname: string): boolean {
		if (!base) return pathname === '/' || pathname === '';
		if (pathname === base || pathname === `${base}/`) return true;
		const rest = pathname.startsWith(base) ? pathname.slice(base.length) || '/' : pathname;
		return rest === '/' || rest === '';
	}

	function buildMosaic(viewportW: number): Array<{ cx: number; cy: number; w: number; h: number }> {
		const tiles: Array<{ cx: number; cy: number; w: number; h: number }> = [];
		/* Narrow viewports: shrink mosaic so burst tiles stay on-screen and readable */
		const mosaicScale = viewportW < 900 ? Math.min(1, (viewportW - 24) / 720) : 1;
		const totalHScaled =
			MOSAIC_ROWS.reduce((sum, row) => sum + row[0][1] * mosaicScale, 0) +
			GAP * (MOSAIC_ROWS.length - 1);
		let y = -totalHScaled / 2;
		for (const row of MOSAIC_ROWS) {
			const rowH = row[0][1] * mosaicScale;
			const totalW = row.reduce((sum, [w]) => sum + w * mosaicScale, 0) + GAP * (row.length - 1);
			let x = -totalW / 2;
			for (const [w] of row) {
				const tw = w * mosaicScale;
				tiles.push({ cx: x + tw / 2, cy: y + rowH / 2, w: tw, h: rowH });
				x += tw + GAP;
			}
			y += rowH + GAP;
		}
		return tiles;
	}

	function readTargetTiles(): HTMLElement[] {
		const main =
			document.querySelector<HTMLElement>('main.page-main.page-main--portfolio') ??
			document.querySelector<HTMLElement>('main.page-main--portfolio');
		const scope: Document | HTMLElement = main ?? document;
		const selectors: Array<{ primary: string; fallback?: string }> = [
			{ primary: '.page-main__placeholders > .page-main__cs-link:nth-child(1)' },
			{ primary: '.page-main__placeholders > .page-main__cs-link:nth-child(2)' },
			{ primary: '.page-main__placeholders > .page-main__cs-link:nth-child(4)' },
			{
				primary:
					'.page-main__placeholders > .page-main__ux-panel-wrap:nth-child(5) .page-main__cs-link--ux-panel'
			},
			{
				primary: '.page-main__strip-band > .page-main__placeholder-5',
				fallback: '.page-main__placeholder-5'
			},
			{
				primary: '.page-main__strip-band > .page-main__placeholder-6',
				fallback: '.page-main__placeholder-6'
			},
			{ primary: '.page-main__body > .page-main__placeholder-7', fallback: '.page-main__placeholder-7' },
			{ primary: '.page-main__body > .page-main__placeholder-8', fallback: '.page-main__placeholder-8' },
			{ primary: '.page-main__body > .page-main__placeholder-9', fallback: '.page-main__placeholder-9' },
			{ primary: '.page-main__body > .page-main__placeholder-10', fallback: '.page-main__placeholder-10' },
			{ primary: '.page-main__body > .page-main__placeholder-11', fallback: '.page-main__placeholder-11' }
		];
		const out: HTMLElement[] = [];
		for (const { primary, fallback } of selectors) {
			let el =
				scope.querySelector<HTMLElement>(primary) ?? document.querySelector<HTMLElement>(primary);
			if (!el && fallback) {
				el = scope.querySelector<HTMLElement>(fallback) ?? document.querySelector<HTMLElement>(fallback);
			}
			if (el) out.push(el);
		}
		return out;
	}

	/**
	 * `left` / `top` on tiles are vs the load curtain’s padding box; `getBoundingClientRect` is
	 * viewport-space — convert so mobile safe-area + borders don’t park tiles off-screen.
	 */
	function curtainMetrics(): { originX: number; originY: number; centerX: number; centerY: number } {
		const el = document.querySelector<HTMLElement>('.app-load-curtain');
		if (!el) {
			return {
				originX: 0,
				originY: 0,
				centerX: window.innerWidth / 2,
				centerY: window.innerHeight / 2
			};
		}
		const r = el.getBoundingClientRect();
		const s = getComputedStyle(el);
		const bl = parseFloat(s.borderLeftWidth) || 0;
		const bt = parseFloat(s.borderTopWidth) || 0;
		const br = parseFloat(s.borderRightWidth) || 0;
		const bb = parseFloat(s.borderBottomWidth) || 0;
		const originX = r.left + bl;
		const originY = r.top + bt;
		const padW = r.width - bl - br;
		const padH = r.height - bt - bb;
		return {
			originX,
			originY,
			centerX: originX + padW / 2,
			centerY: originY + padH / 2
		};
	}

	function viewCenterToTileLocal(cm: ReturnType<typeof curtainMetrics>): { x: number; y: number } {
		return {
			x: cm.centerX - cm.originX,
			y: cm.centerY - cm.originY
		};
	}

	function targetCenterToTileLocal(target: HTMLElement, cm: ReturnType<typeof curtainMetrics>): {
		x: number;
		y: number;
	} {
		const rect = target.getBoundingClientRect();
		return {
			x: rect.left + rect.width / 2 - cm.originX,
			y: rect.top + rect.height / 2 - cm.originY
		};
	}

	function snapshotFromVideo(video: HTMLVideoElement): string | null {
		if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return null;
		const w = video.videoWidth || video.clientWidth;
		const h = video.videoHeight || video.clientHeight;
		if (!w || !h) return null;
		try {
			const scale = Math.min(1, SNAPSHOT_MAX_DIM / Math.max(w, h));
			const tw = Math.max(1, Math.round(w * scale));
			const th = Math.max(1, Math.round(h * scale));
			const canvas = document.createElement('canvas');
			canvas.width = tw;
			canvas.height = th;
			const ctx = canvas.getContext('2d');
			if (!ctx) return null;
			ctx.drawImage(video, 0, 0, tw, th);
			return canvas.toDataURL('image/jpeg', 0.86);
		} catch {
			return null;
		}
	}

	function snapshotFromImage(img: HTMLImageElement): string | null {
		if (!img.complete || img.naturalWidth <= 0 || img.naturalHeight <= 0) return null;
		try {
			const w = img.naturalWidth;
			const h = img.naturalHeight;
			const scale = Math.min(1, SNAPSHOT_MAX_DIM / Math.max(w, h));
			const tw = Math.max(1, Math.round(w * scale));
			const th = Math.max(1, Math.round(h * scale));
			const canvas = document.createElement('canvas');
			canvas.width = tw;
			canvas.height = th;
			const ctx = canvas.getContext('2d');
			if (!ctx) return null;
			ctx.drawImage(img, 0, 0, tw, th);
			return canvas.toDataURL('image/jpeg', 0.9);
		} catch {
			return null;
		}
	}

	function tileMarkupFromTarget(target: HTMLElement): string {
		const sourceVideo = target.querySelector('video');
		if (sourceVideo) {
			const snap = snapshotFromVideo(sourceVideo);
			if (snap) return `<img src="${snap}" alt="" />`;
		}

		const sourceImg = target.querySelector('img');
		if (sourceImg) {
			const snap = snapshotFromImage(sourceImg);
			if (snap) return `<img src="${snap}" alt="" />`;
		}

		const child = target.firstElementChild as HTMLElement | null;
		if (!child) {
			return '<div style="position:absolute;inset:0;background:linear-gradient(145deg,#c8c8c5,#a7a7a4);"></div>';
		}

		const clone = child.cloneNode(true) as HTMLElement;
		clone.querySelectorAll('video').forEach((v) => {
			v.removeAttribute('src');
			v.removeAttribute('autoplay');
			v.removeAttribute('loop');
			v.removeAttribute('playsinline');
			v.removeAttribute('preload');
		});
		return clone.outerHTML;
	}

	let show = $state(false);
	let exiting = $state(false);
	let counter = $state(0);
	let nameState = $state<'idle' | 'show' | 'hide'>('idle');
	let tiles = $state<TileState[]>([]);
	let readySignal = false;
	let sequenceDone = false;

	let rafId: number | null = null;
	let timeoutIds: number[] = [];
	let failsafeId: number | null = null;
	let targetRetryCount = 0;

	function resetTimers() {
		if (rafId !== null) cancelAnimationFrame(rafId);
		rafId = null;
		for (const id of timeoutIds) clearTimeout(id);
		timeoutIds = [];
		if (failsafeId !== null) {
			clearTimeout(failsafeId);
			failsafeId = null;
		}
	}

	function finishDismiss() {
		try {
			sessionStorage.setItem(APP_CURTAIN_SESSION_KEY, '1');
		} catch {
			/* ignore */
		}
		show = false;
		exiting = false;
		if (failsafeId !== null) {
			clearTimeout(failsafeId);
			failsafeId = null;
		}
		window.dispatchEvent(new CustomEvent('holalara:curtain-dismissed'));
	}

	function maybeDismiss() {
		if (!readySignal || !sequenceDone) return;
		exiting = true;
		const id = window.setTimeout(() => finishDismiss(), EXIT_MS);
		timeoutIds.push(id);
	}

	function setTile(i: number, patch: Partial<TileState>) {
		const tile = tiles[i];
		if (!tile) return;
		Object.assign(tile, patch);
	}

	/** Counter + name — independent of DOM targets so they always run. */
	function startLoaderUi(reduced: boolean) {
		if (reduced) {
			counter = 100;
			timeoutIds.push(window.setTimeout(() => (nameState = 'show'), 80));
			timeoutIds.push(window.setTimeout(() => (nameState = 'hide'), 520));
			return;
		}
		const counterStart = performance.now();
		const counterTick = (now: number) => {
			const p = Math.min((now - counterStart) / COUNTER_MS, 1);
			counter = Math.floor((1 - Math.pow(1 - p, 2.2)) * 100);
			if (p < 1) rafId = requestAnimationFrame(counterTick);
			else counter = 100;
		};
		rafId = requestAnimationFrame(counterTick);
		timeoutIds.push(window.setTimeout(() => (nameState = 'show'), NAME_SHOW_MS));
	}

	function runTileSequence(reduced: boolean) {
		const maxRetries =
			typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
				? TARGET_WAIT_MAX_RETRIES_COARSE
				: TARGET_WAIT_MAX_RETRIES;
		const targets = readTargetTiles();
		if (targets.length === 0) {
			if (targetRetryCount < maxRetries) {
				targetRetryCount += 1;
				const retryId = window.setTimeout(() => runTileSequence(reduced), TARGET_WAIT_RETRY_MS);
				timeoutIds.push(retryId);
				return;
			}
			sequenceDone = true;
			maybeDismiss();
			return;
		}
		targetRetryCount = 0;

		const vw = window.innerWidth;
		const mosaic = buildMosaic(vw).slice(0, targets.length);
		const cm = curtainMetrics();
		const vc = viewCenterToTileLocal(cm);
		const vcx = vc.x;
		const vcy = vc.y;
		const burstStartScale = vw < 900 ? 0.16 : 0.06;

		if (reduced) {
			tiles = targets.map((target) => {
				const rect = target.getBoundingClientRect();
				const pt = targetCenterToTileLocal(target, cm);
				return {
					left: pt.x,
					top: pt.y,
					width: rect.width,
					height: rect.height,
					scale: 1,
					opacity: 1,
					transition: 'none',
					html: tileMarkupFromTarget(target)
				};
			});
			sequenceDone = true;
			maybeDismiss();
			return;
		}

		tiles = mosaic.map((m, i) => {
			return {
				left: vcx,
				top: vcy,
				width: m.w,
				height: m.h,
				scale: burstStartScale,
				opacity: 0,
				transition: '',
				html: tileMarkupFromTarget(targets[i] as HTMLElement)
			};
		});

		const order = mosaic
			.map((m, i) => ({ i, d: Math.hypot(m.cx, m.cy) }))
			.sort((a, b) => a.d - b.d)
			.map((x) => x.i);

		timeoutIds.push(
			window.setTimeout(() => {
				const n = Math.max(1, order.length - 1);
				for (const [rank, tileIdx] of order.entries()) {
					const delay = Math.round((rank / n) * BURST_SPAN_MS);
					timeoutIds.push(
						window.setTimeout(() => {
							setTile(tileIdx, {
								opacity: 1,
								scale: 1,
								transition:
									'opacity 0.2s ease, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
							});
							timeoutIds.push(
								window.setTimeout(() => {
									const m = mosaic[tileIdx];
									setTile(tileIdx, {
										left: vcx + m.cx,
										top: vcy + m.cy,
										transition:
											'left 0.72s cubic-bezier(0.16, 1, 0.3, 1), top 0.72s cubic-bezier(0.16, 1, 0.3, 1)'
									});
								}, BURST_POP_MS)
							);
						}, delay)
					);
				}

				const burstDoneMs = BURST_SPAN_MS + BURST_POP_MS + BURST_FLY_MS;
				timeoutIds.push(
					window.setTimeout(() => {
						timeoutIds.push(
							window.setTimeout(() => {
								nameState = 'hide';
								timeoutIds.push(
									window.setTimeout(() => {
										let settled = 0;
										const tileCount = targets.length;
										for (let i = 0; i < tileCount; i += 1) {
											const target = targets[i]!;
											const rect = target.getBoundingClientRect();
											const gridPt = targetCenterToTileLocal(target, cm);
											timeoutIds.push(
												window.setTimeout(() => {
													setTile(i, {
														left: gridPt.x,
														top: gridPt.y,
														width: rect.width,
														height: rect.height,
														transition: [
															`left ${GRID_FLY_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`,
															`top ${GRID_FLY_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`,
															`width ${GRID_FLY_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`,
															`height ${GRID_FLY_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`
														].join(', ')
													});
													timeoutIds.push(
														window.setTimeout(() => {
															settled += 1;
															if (settled === tileCount) {
																sequenceDone = true;
																maybeDismiss();
															}
														}, GRID_FLY_MS)
													);
												}, i * GRID_STAGGER_MS)
											);
										}
									}, NAME_HIDE_GAP_MS)
								);
							}, HOLD_MOSAIC_MS)
						);
					}, burstDoneMs)
				);
			}, BURST_START_MS)
		);
	}

	$effect.pre(() => {
		if (!browser) return;
		let dismissed = false;
		try {
			dismissed = sessionStorage.getItem(APP_CURTAIN_SESSION_KEY) === '1';
		} catch {
			dismissed = false;
		}
		if (dismissed) {
			show = false;
			return;
		}
		if (skipHomeLoadCurtain() && isHomePath(page.url.pathname)) {
			try {
				sessionStorage.setItem(APP_CURTAIN_SESSION_KEY, '1');
			} catch {
				/* ignore */
			}
			show = false;
			queueMicrotask(() => {
				window.dispatchEvent(new CustomEvent('holalara:curtain-dismissed'));
			});
			return;
		}
		if (!isHomePath(page.url.pathname)) {
			if (show) window.dispatchEvent(new CustomEvent('holalara:curtain-dismissed'));
			show = false;
			exiting = false;
			resetTimers();
			return;
		}
		show = true;
	});

	$effect(() => {
		if (!browser || !show) return;
		readySignal = false;
		sequenceDone = false;
		exiting = false;
		counter = 0;
		nameState = 'idle';
		tiles = [];
		targetRetryCount = 0;
		resetTimers();
		failsafeId = window.setTimeout(() => {
			if (!show) return;
			finishDismiss();
		}, FAILSAFE_DISMISS_MS);

		const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		startLoaderUi(reduced);

		let cancelled = false;
		void (async () => {
			await tick();
			await new Promise<void>((r) => requestAnimationFrame(() => r()));
			if (cancelled) return;
			/* Second frame: mobile WebKit often hasn’t laid out the portfolio grid on the first paint */
			await new Promise<void>((r) => requestAnimationFrame(() => r()));
			if (cancelled) return;
			runTileSequence(reduced);
		})();

		const onReady = () => {
			readySignal = true;
			maybeDismiss();
		};
		window.addEventListener('holalara:curtain-ready', onReady, { once: true });
		return () => {
			cancelled = true;
			window.removeEventListener('holalara:curtain-ready', onReady);
			resetTimers();
		};
	});
</script>

{#if show}
	<div class="app-load-curtain" class:app-load-curtain--exit={exiting} aria-hidden="true">
		<div class="app-load-curtain__counter">{String(counter).padStart(3, '0')}</div>
		<div
			class="app-load-curtain__name"
			class:app-load-curtain__name--show={nameState === 'show'}
			class:app-load-curtain__name--hide={nameState === 'hide'}
		>
			Lara Perez
		</div>
		<div class="app-load-curtain__stage">
			{#each tiles as t}
				<div
					class="app-load-curtain__tile"
					style="left:{t.left}px;top:{t.top}px;width:{t.width}px;height:{t.height}px;opacity:{t.opacity};transform:translate(-50%,-50%) scale({t.scale});transition:{t.transition};"
				>
					<div class="app-load-curtain__tile-media">{@html t.html}</div>
				</div>
			{/each}
		</div>
	</div>
{/if}

<style>
	.app-load-curtain {
		position: fixed;
		inset: 0;
		/* Above `.debug-grid-toggle` (99999) so % / name are never covered on mobile */
		z-index: 100100;
		pointer-events: auto;
		touch-action: none;
		background: var(--bg, #f0efed);
		opacity: 1;
		transition: opacity 0.64s ease;
		font-family: Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif;
		/* `clip` can behave oddly on some mobile WebKit builds */
		overflow: hidden;
		padding: env(safe-area-inset-top, 0px) env(safe-area-inset-right, 0px) env(safe-area-inset-bottom, 0px)
			env(safe-area-inset-left, 0px);
		box-sizing: border-box;
	}

	.app-load-curtain--exit {
		opacity: 0;
		pointer-events: none;
	}

	.app-load-curtain__counter {
		position: absolute;
		right: 34px;
		bottom: 30px;
		z-index: 6;
		font-size: min(5.5vw, 65px);
		font-weight: 500;
		line-height: 1;
		letter-spacing: -0.04em;
		color: var(--fg, #111);
		font-variant-numeric: tabular-nums;
		text-shadow: 0 1px 2px color-mix(in srgb, var(--bg, #f0efed) 85%, transparent);
	}

	.app-load-curtain__name {
		position: absolute;
		left: 30px;
		bottom: 24px;
		z-index: 1;
		z-index: 4;
		max-width: calc(100% - 2rem);
		font-size: min(3.5vw, 44px);
		font-weight: 500;
		line-height: 1;
		letter-spacing: -0.03em;
		color: var(--fg, #111);
		transform: translateY(115%);
		transition: transform 1.1s cubic-bezier(0.16, 1, 0.3, 1);
		text-shadow: 0 1px 2px color-mix(in srgb, var(--bg, #f0efed) 85%, transparent);
	}

	.app-load-curtain__name--show {
		transform: translateY(0);
	}

	.app-load-curtain__name--hide {
		transform: translateY(115%);
		transition: transform 0.5s cubic-bezier(0.4, 0, 1, 1);
	}

	.app-load-curtain__stage {
		position: absolute;
		inset: 0;
		z-index: 5;
		pointer-events: none;
		isolation: isolate;
	}

	.app-load-curtain__tile {
		position: absolute;
		overflow: hidden;
		background: #b0b0ae;
		z-index: 1;
		-webkit-backface-visibility: hidden;
		backface-visibility: hidden;
		will-change: left, top, width, height, opacity, transform;
	}

	.app-load-curtain__tile-media {
		position: absolute;
		inset: 0;
	}

	.app-load-curtain__tile-media :global(*) {
		pointer-events: none !important;
	}

	.app-load-curtain__tile-media :global(video),
	.app-load-curtain__tile-media :global(img),
	.app-load-curtain__tile-media :global(svg),
	.app-load-curtain__tile-media :global(canvas) {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	/*
	 * Narrow / mobile: anchor copy to the TOP safe area.
	 * Bottom positioning fights Safari’s toolbar + home indicator (text gets clipped).
	 */
	@media (max-width: 900px) {
		.app-load-curtain__counter {
			top: max(10px, env(safe-area-inset-top, 0px));
			right: max(14px, env(safe-area-inset-right, 0px));
			bottom: auto;
			font-size: min(10vw, 48px);
		}

		.app-load-curtain__name {
			top: max(10px, env(safe-area-inset-top, 0px));
			left: max(14px, env(safe-area-inset-left, 0px));
			bottom: auto;
			max-width: min(72vw, 16rem);
			font-size: min(5.5vw, 26px);
			/* Slide from above (bottom-anchored transforms read wrong when we use `top`) */
			transform: translateY(-140%);
		}

		.app-load-curtain__name--show {
			transform: translateY(0);
		}

		.app-load-curtain__name--hide {
			transform: translateY(-140%);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.app-load-curtain {
			transition: opacity 0.2s ease;
		}
	}
</style>
