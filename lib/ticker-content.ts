import type { Series } from "@/lib/polymarketData";

export type TickerContent = {
	id: string;
	title: string;
	displayTitle: string;
	description?: string;
	createdAt?: Date;
	image?: string | null;
	accent: string;
};

export const TICKER_COLORS = [
	"#2E5CFF",
	"#22D3EE",
	"#F472B6",
	"#A855F7",
	"#34D399",
	"#FCD34D",
] as const;

export const MAX_TITLE_LENGTH = 42;
export const MAX_TRENDING_POOL = 60;

export const FALLBACK_TITLES = [
	"Election Watch",
	"Crypto Volatility",
	"AI Adoption Bets",
	"Sports Futures",
	"Macro Moves",
	"Pop Culture Odds",
];

export function mapSeriesToTickerContent(
	series: Series[],
	palette: readonly string[] = TICKER_COLORS
): TickerContent[] {
	const results: TickerContent[] = [];
	const paletteLength = palette.length || 1;
	const seen = new Set<string>();
	for (const [index, s] of series.entries()) {
		const rawTitle = s.title as string;
		const fullTitle = (
			rawTitle?.toString().trim() || `Trending Event ${index + 1}`
		)
			.replace(/\s+/g, " ")
			.trim();
		const displayTitle = clampTitle(fullTitle, MAX_TITLE_LENGTH);
		const image = extractEventImage(s);
		const eventId =
			(typeof s.slug === "string" && s.slug.length > 0
				? s.slug
				: typeof s.id === "string"
				? s.id
				: `event-${index}`) ?? `event-${index}`;

		if (seen.has(eventId)) continue;
		seen.add(eventId);

		results.push({
			id: eventId,
			title: fullTitle,
			displayTitle,
			description: s.description ?? undefined,
			createdAt: s.createdAt ? new Date(s.createdAt) : undefined,
			image,
			accent: palette[index % paletteLength],
		});

		if (results.length >= MAX_TRENDING_POOL) break;
	}

	return results;
}

export function clampTitle(value: string, maxLength: number) {
	if (value.length <= maxLength) return value;
	return `${value.slice(0, maxLength - 3).trimEnd()}...`;
}

function extractEventImage(event: Record<string, unknown>) {
	const optimizedSources = [
		event.featuredImageOptimized,
		event.imageOptimized,
		event.iconOptimized,
	];

	for (const source of optimizedSources) {
		const url = firstStringValue(source);
		const normalized = normalizeImageUrl(url);
		if (normalized) return normalized;
	}

	const fallbacks = [event.featuredImage, event.image, event.icon];
	for (const candidate of fallbacks) {
		const normalized = normalizeImageUrl(
			typeof candidate === "string" ? candidate : undefined
		);
		if (normalized) return normalized;
	}

	return undefined;
}

function firstStringValue(value: unknown) {
	if (!value || typeof value !== "object") return undefined;
	for (const candidate of Object.values(value as Record<string, unknown>)) {
		if (typeof candidate === "string" && candidate.length > 0) {
			return candidate;
		}
	}
	return undefined;
}

function normalizeImageUrl(url?: string) {
	if (!url) return undefined;
	if (url.startsWith("//")) return `https:${url}`;
	if (url.startsWith("http://")) return `https://${url.slice(7)}`;
	if (url.startsWith("https://")) return url;
	if (url.startsWith("/")) return url;
	return undefined;
}
