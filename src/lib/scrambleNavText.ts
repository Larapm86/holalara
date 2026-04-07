/** Random char matching case class of target (for nav labels like Index / About). */
function randomGlyphFor(target: string, i: number): string {
	const c = target[i] ?? 'X';
	if (/[A-Z]/.test(c)) {
		return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)] ?? 'X';
	}
	if (/[a-z]/.test(c)) {
		return 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)] ?? 'x';
	}
	if (/[0-9]/.test(c)) {
		return '0123456789'[Math.floor(Math.random() * 10)] ?? '0';
	}
	return c;
}

export type ScrambleController = { cancel: () => void };

/**
 * Cycles random glyphs per slot, then locks left → right into `final` (decode / reveal).
 */
export function startScramble(
	final: string,
	onFrame: (display: string) => void,
	opts?: { durationMs?: number }
): ScrambleController {
	let raf = 0;
	let cancelled = false;
	const durationMs = opts?.durationMs ?? 400;
	const n = final.length;
	const t0 = performance.now();
	const denom = Math.max(n - 1, 1);
	const locks = Array.from({ length: n }, (_, i) => (durationMs * 0.68 * i) / denom);

	function tick(now: number) {
		if (cancelled) return;
		const elapsed = now - t0;
		let out = '';
		for (let i = 0; i < n; i++) {
			const lockAt = locks[i] ?? 0;
			if (elapsed >= lockAt + 24) {
				out += final[i]!;
			} else {
				out += randomGlyphFor(final, i);
			}
		}
		onFrame(out);
		const done = elapsed >= durationMs + 48;
		if (!done && !cancelled) {
			raf = requestAnimationFrame(tick);
		} else if (!cancelled) {
			onFrame(final);
		}
	}
	raf = requestAnimationFrame(tick);
	return {
		cancel() {
			cancelled = true;
			cancelAnimationFrame(raf);
			onFrame(final);
		}
	};
}
