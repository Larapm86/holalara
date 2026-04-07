import type { NavigationTarget } from '@sveltejs/kit';

export type ViewTransitionDir = 'forward' | 'reverse' | 'default';

/**
 * Home ↔ Index: mirror transitions (forward = into index “from below”, reverse = back to main “from above”).
 * Other routes use a neutral editorial cross-fade.
 */
export function vtDirFromNavigation(
	from: NavigationTarget | null,
	to: NavigationTarget | null
): ViewTransitionDir {
	const toId = to?.route.id;
	if (toId == null) return 'default';

	const fromId = from?.route.id ?? null;

	if (fromId === '/' && toId === '/index') return 'forward';
	if (fromId === '/index' && toId === '/') return 'reverse';

	return 'default';
}
