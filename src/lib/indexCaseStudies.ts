import { base } from '$app/paths';

export type IndexCaseStudy = {
	/** URL path including `base` */
	href: string;
	/** Primary line — case study headline */
	title: string;
	/** Secondary line — client or context */
	subtitle: string;
};

/**
 * Case studies shown on `/index` — aligned with HomePortfolioMain routes.
 */
export const INDEX_CASE_STUDIES: readonly IndexCaseStudy[] = [
	{
		href: `${base}/work/zero-to-one`,
		title: 'Building a 0-1 product for mindful drinking habits',
		subtitle: 'Sobero'
	},
	{
		href: `${base}/work/ux-maturity`,
		title: 'Improving UX maturity at scale',
		subtitle: 'WHO'
	},
	{
		href: `${base}/work/premium-retention`,
		title: 'Improving premium user retention',
		subtitle: 'Kwit'
	},
	{
		href: `${base}/work/habit-loops`,
		title: 'Designing meaningful habit loops',
		subtitle: 'Yazio'
	},
	{
		href: `${base}/work/time-to-value`,
		title: 'Accelerating time-to-value',
		subtitle: 'Yazio'
	},
	{
		href: `${base}/work/systemic-growth`,
		title: 'Assessing systemic growth constraints',
		subtitle: 'Welltech'
	}
] as const;
