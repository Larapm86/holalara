<script lang="ts">
	import { browser } from '$app/environment';
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import { APP_CURTAIN_SESSION_KEY } from '$lib/appLoadCurtain';

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
	const TARGET_WAIT_MAX_RETRIES = 18;
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
		const selectors = [
			'.page-main__placeholders > .page-main__cs-link:nth-child(1)',
			'.page-main__placeholders > .page-main__cs-link:nth-child(2)',
			'.page-main__placeholders > .page-main__cs-link:nth-child(4)',
			'.page-main__placeholders > .page-main__ux-panel-wrap:nth-child(5) .page-main__cs-link--ux-panel',
			'.page-main__strip-band > .page-main__placeholder-5',
			'.page-main__strip-band > .page-main__placeholder-6',
			'.page-main__body > .page-main__placeholder-7',
			'.page-main__body > .page-main__placeholder-8',
			'.page-main__body > .page-main__placeholder-9',
			'.page-main__body > .page-main__placeholder-10',
			'.page-main__body > .page-main__placeholder-11'
		];
		return selectors
			.map((sel) => document.querySelector<HTMLElement>(sel))
			.filter((node): node is HTMLElement => node !== null);
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
		tiles = tiles.map((t, idx) => (idx === i ? { ...t, ...patch } : t));
	}

	function runSequence() {
		const targets = readTargetTiles();
		if (targets.length === 0) {
			if (targetRetryCount < TARGET_WAIT_MAX_RETRIES) {
				targetRetryCount += 1;
				const retryId = window.setTimeout(() => runSequence(), TARGET_WAIT_RETRY_MS);
				timeoutIds.push(retryId);
				return;
			}
			/* Fallback: do not deadlock if targets never become queryable. */
			sequenceDone = true;
			maybeDismiss();
			return;
		}
		targetRetryCount = 0;

		const vw = window.innerWidth;
		const vh = window.innerHeight;
		const mosaic = buildMosaic(vw).slice(0, targets.length);
		const vcx = vw / 2;
		const vcy = vh / 2;
		/* 0.04 reads as invisible on narrow screens; keep burst readable */
		const burstStartScale = vw < 900 ? 0.16 : 0.06;

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

		const counterStart = performance.now();
		const counterTick = (now: number) => {
			const p = Math.min((now - counterStart) / COUNTER_MS, 1);
			counter = Math.floor((1 - Math.pow(1 - p, 2.2)) * 100);
			if (p < 1) rafId = requestAnimationFrame(counterTick);
			else counter = 100;
		};
		rafId = requestAnimationFrame(counterTick);

		timeoutIds.push(window.setTimeout(() => (nameState = 'show'), NAME_SHOW_MS));

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
											const target = targets[i];
											if (!target) return;
											const rect = target.getBoundingClientRect();
											timeoutIds.push(
												window.setTimeout(() => {
													setTile(i, {
														left: rect.left + rect.width / 2,
														top: rect.top + rect.height / 2,
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
		if (reduced) {
			sequenceDone = true;
		} else {
			const startId = window.setTimeout(() => runSequence(), 20);
			timeoutIds.push(startId);
		}

		const onReady = () => {
			readySignal = true;
			maybeDismiss();
		};
		window.addEventListener('holalara:curtain-ready', onReady, { once: true });
		return () => {
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
		z-index: 10050;
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
		z-index: 4;
		font-size: min(5.5vw, 65px);
		font-weight: 500;
		line-height: 1;
		letter-spacing: -0.04em;
		color: #111;
		font-variant-numeric: tabular-nums;
		text-shadow: 0 1px 0 color-mix(in srgb, var(--bg, #f0efed) 70%, transparent);
	}

	.app-load-curtain__name {
		position: absolute;
		left: 30px;
		bottom: 24px;
		z-index: 4;
		max-width: calc(100% - 2rem);
		font-size: min(3.5vw, 44px);
		font-weight: 500;
		line-height: 1;
		letter-spacing: -0.03em;
		color: #111;
		transform: translateY(115%);
		transition: transform 1.1s cubic-bezier(0.16, 1, 0.3, 1);
		text-shadow: 0 1px 0 color-mix(in srgb, var(--bg, #f0efed) 70%, transparent);
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
		z-index: 2;
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

	@media (max-width: 900px) {
		.app-load-curtain__counter {
			right: max(16px, env(safe-area-inset-right, 0px));
			/* Sit clearly above home indicator / gesture bar */
			bottom: max(28px, calc(env(safe-area-inset-bottom, 0px) + 18px));
			font-size: min(11vw, 52px);
		}

		.app-load-curtain__name {
			left: max(16px, env(safe-area-inset-left, 0px));
			bottom: max(28px, calc(env(safe-area-inset-bottom, 0px) + 18px));
			font-size: min(6vw, 30px);
		}

		/* Name slide: on narrow screens avoid tiny negative translate — land flush */
		.app-load-curtain__name--show {
			transform: translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.app-load-curtain {
			transition: opacity 0.2s ease;
		}
	}
</style>
