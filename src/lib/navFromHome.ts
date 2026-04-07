import { base } from '$app/paths';
import type { Navigation } from '@sveltejs/kit';

/**
 * True when the navigation origin is the home page (`/`).
 * `route.id` can be null in some edge cases — pathname + base is the reliable fallback.
 */
export function isNavigationFromHome(from: Navigation['from'] | null | undefined): boolean {
	if (!from?.url) return false;

	/* App.RouteId may omit '/' in the union — compare as string */
	const id = from.route?.id as string | null | undefined;
	if (id === '/') return true;
	if (id != null && id !== '/') return false;

	return isHomePathname(from.url.pathname);
}

function isHomePathname(pathname: string): boolean {
	if (!pathname) return false;
	if (!base) return pathname === '/' || pathname === '';
	if (pathname === base || pathname === `${base}/`) return true;
	if (pathname.startsWith(`${base}/`)) {
		const rest = pathname.slice(base.length) || '/';
		return rest === '/' || rest === '';
	}
	return pathname === '/' || pathname === '';
}

/** True when the navigation target is the home page (`/`). */
export function isNavigationToHome(to: Navigation['to'] | null | undefined): boolean {
	if (!to?.url) return false;

	const id = to.route?.id as string | null | undefined;
	if (id === '/') return true;
	if (id != null && id !== '/') return false;

	return isHomePathname(to.url.pathname);
}
