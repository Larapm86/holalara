export const THEMES = ['light', 'dark', 'sky', 'pink', 'blue', 'purple', 'yellow', 'green'] as const;

export type Theme = (typeof THEMES)[number];

export const THEME_STORAGE_KEY = 'holalara-theme';

export function isTheme(value: string | null | undefined): value is Theme {
	return value !== undefined && value !== null && THEMES.includes(value as Theme);
}

export function nextTheme(current: Theme): Theme {
	const i = THEMES.indexOf(current);
	return THEMES[(i + 1) % THEMES.length];
}

/** Saturated themes (not light/dark neutrals). */
export const ACCENT_THEMES = ['pink', 'blue', 'purple', 'yellow', 'green', 'sky'] as const;

export function isAccentTheme(theme: Theme): boolean {
	return (ACCENT_THEMES as readonly Theme[]).includes(theme);
}

/** Softer TV static fade: accent → light, and neutral light ↔ dark jumps. */
export function isExtraSoftTvTransition(from: Theme, to: Theme): boolean {
	if (isAccentTheme(from) && to === 'light') return true;
	if (from === 'light' && to === 'dark') return true;
	if (from === 'dark' && to === 'light') return true;
	return false;
}

export type ApplyThemeOptions = {
	/** Fire TV static burst (user-driven theme change only; omit on initial sync). */
	burst?: boolean;
	/** Theme before this change (e.g. from SiteNav). Prefer over reading the DOM so `from`/`to` stay correct. */
	from?: Theme;
};

export function applyTheme(theme: Theme, options?: ApplyThemeOptions) {
	let fromTheme: Theme = 'light';
	if (options?.from !== undefined) {
		fromTheme = options.from;
	} else if (typeof document !== 'undefined') {
		const raw = document.documentElement.dataset.theme;
		if (isTheme(raw)) fromTheme = raw;
	}
	if (typeof document !== 'undefined') {
		document.documentElement.dataset.theme = theme;
	}
	try {
		localStorage.setItem(THEME_STORAGE_KEY, theme);
	} catch {
		/* ignore */
	}
	if (options?.burst && typeof window !== 'undefined') {
		window.dispatchEvent(
			new CustomEvent('holalara-theme-transition', { detail: { theme, from: fromTheme } })
		);
	}
}
