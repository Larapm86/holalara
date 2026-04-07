import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

/** Legacy URL — canonical case study is /work/ux-maturity */
export const load: PageLoad = () => {
	throw redirect(301, '/work/ux-maturity');
};
