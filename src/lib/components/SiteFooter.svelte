<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import { CONTACT_EMAIL, LINKEDIN_URL } from '$lib/siteContact';
	import { startScramble, type ScrambleController } from '$lib/scrambleNavText';

	const mailtoHref = `mailto:${CONTACT_EMAIL}`;

	const LINKEDIN_LABEL = 'LinkedIn';
	const EMAIL_LABEL = 'Email';

	let linkedinDisplay = $state(LINKEDIN_LABEL);
	let emailDisplay = $state(EMAIL_LABEL);
	let linkedinCtrl: ScrambleController | null = null;
	let emailCtrl: ScrambleController | null = null;
	let linkedinEl = $state<HTMLAnchorElement | undefined>(undefined);
	let emailEl = $state<HTMLAnchorElement | undefined>(undefined);

	const FOOTER_HOVER_TEXT = 'Always better after breakfast';
	const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

	function randomChar(): string {
		return CHARSET[(Math.random() * CHARSET.length) | 0] ?? 'X';
	}

	let hoverLineText = $state(FOOTER_HOVER_TEXT);
	let reducedMotion = $state(true);
	let scrambleTimer: ReturnType<typeof setInterval> | undefined;

	onMount(() => {
		if (!browser) return;
		reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	});

	function stopScramble() {
		if (scrambleTimer) {
			clearInterval(scrambleTimer);
			scrambleTimer = undefined;
		}
		hoverLineText = FOOTER_HOVER_TEXT;
	}

	function runScramble() {
		if (!browser || reducedMotion) {
			hoverLineText = FOOTER_HOVER_TEXT;
			return;
		}
		stopScramble();
		const finalLabel = FOOTER_HOVER_TEXT;
		const len = finalLabel.length;
		let tick = 0;
		const maxTicks = Math.max(16, Math.min(28, Math.ceil(len * 0.95)));
		scrambleTimer = setInterval(() => {
			tick += 1;
			const settleThrough = (tick / maxTicks) * (len + 2);
			hoverLineText = finalLabel
				.split('')
				.map((ch, i) => {
					if (ch === ' ') return ' ';
					if (i < settleThrough) return ch;
					return randomChar();
				})
				.join('');
			if (tick >= maxTicks) {
				hoverLineText = finalLabel;
				if (scrambleTimer) {
					clearInterval(scrambleTimer);
					scrambleTimer = undefined;
				}
			}
		}, 26);
	}

	function onTriggerEnter() {
		runScramble();
	}

	function onTriggerLeave() {
		stopScramble();
	}

	function playLinkedIn() {
		if (!browser || reducedMotion) return;
		linkedinCtrl?.cancel();
		linkedinCtrl = startScramble(LINKEDIN_LABEL, (s) => {
			linkedinDisplay = s;
		});
	}

	function settleLinkedIn() {
		linkedinCtrl?.cancel();
		linkedinDisplay = LINKEDIN_LABEL;
		linkedinCtrl = null;
	}

	function onLinkedInLeave() {
		if (linkedinEl && document.activeElement === linkedinEl) return;
		settleLinkedIn();
	}

	function playEmail() {
		if (!browser || reducedMotion) return;
		emailCtrl?.cancel();
		emailCtrl = startScramble(EMAIL_LABEL, (s) => {
			emailDisplay = s;
		});
	}

	function settleEmail() {
		emailCtrl?.cancel();
		emailDisplay = EMAIL_LABEL;
		emailCtrl = null;
	}

	function onEmailLeave() {
		if (emailEl && document.activeElement === emailEl) return;
		settleEmail();
	}
</script>

<footer class="site-footer grid-14">
	<div class="site-footer__copyright">
		<div class="site-footer__swap">
			<p class="site-footer__default">
				<button
					type="button"
					class="site-footer__trigger"
					aria-label="Reveal an extra line"
					onmouseenter={onTriggerEnter}
					onmouseleave={onTriggerLeave}
				>
					All rights and wrongs reserved. © Lara Perez, 2026
				</button>
			</p>
			<p class="site-footer__hover" aria-hidden="true">{hoverLineText}</p>
		</div>
	</div>
	<nav class="site-footer__social" aria-label="Contact">
		<a
			bind:this={linkedinEl}
			class="site-footer__link site-footer__scramble-link"
			href={LINKEDIN_URL}
			target="_blank"
			rel="noopener noreferrer"
			aria-label={LINKEDIN_LABEL}
			onpointerenter={playLinkedIn}
			onpointerleave={onLinkedInLeave}
			onfocus={playLinkedIn}
			onblur={settleLinkedIn}
		>
			<span class="site-footer__scramble-label" aria-hidden="true">{linkedinDisplay}</span>
		</a>
		<span class="site-footer__sep" aria-hidden="true">, </span>
		<a
			bind:this={emailEl}
			class="site-footer__link site-footer__scramble-link"
			href={mailtoHref}
			aria-label={EMAIL_LABEL}
			onpointerenter={playEmail}
			onpointerleave={onEmailLeave}
			onfocus={playEmail}
			onblur={settleEmail}
		>
			<span class="site-footer__scramble-label" aria-hidden="true">{emailDisplay}</span>
		</a>
	</nav>
</footer>
