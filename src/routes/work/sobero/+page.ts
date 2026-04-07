import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

/** Legacy URL — canonical case study is /work/zero-to-one */
export const load: PageLoad = () => {
	throw redirect(301, '/work/zero-to-one');
};
