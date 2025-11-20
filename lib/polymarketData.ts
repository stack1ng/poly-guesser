import { z } from "zod";

const BASE_URL = "https://gamma-api.polymarket.com";

function buildUrl(path: `/${string}`, params?: Record<string, unknown>) {
	const url = new URL(path, BASE_URL);
	if (params) {
		for (const [key, value] of Object.entries(params)) {
			if (value === undefined || value === null) continue;
			if (Array.isArray(value)) {
				for (const v of value) url.searchParams.append(key, String(v));
			} else {
				url.searchParams.set(key, String(value));
			}
		}
	}
	return url.toString();
}

async function httpGet<T>(
	path: `/${string}`,
	params?: Record<string, unknown>
) {
	const url = buildUrl(path, params);
	const res = await fetch(url, {
		method: "GET",
		headers: {
			Accept: "application/json",
			"Accept-Encoding": "gzip",
			Connection: "keep-alive",
			"User-Agent": "poly-guesser/1.0",
		},
		// Next.js fetch caches GETs by default; you can tune this per call if needed
		cache: "force-cache",
	});
	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new Error(
			`Gamma GET ${path} failed: ${res.status} ${res.statusText} — ${text}`
		);
	}
	return (await res.json()) as T;
}

// -----------------------------
// Zod Schemas (minimal subset)
// -----------------------------

const optionalString = z.string().optional().nullable();
const optionalNumber = z.number().optional().nullable();
const optionalBoolean = z.boolean().optional().nullable();

export const MarketSchema = z
	.object({
		id: z.string(),
		question: optionalString,
		slug: optionalString,
		groupItemTitle: optionalString,
		image: optionalString,
		icon: optionalString,
		closed: optionalBoolean,
		lastTradePrice: optionalNumber,
	})
	.loose();
export type Market = z.infer<typeof MarketSchema>;

export const EventSchema = z
	.object({
		id: z.string(),
		slug: optionalString,
		title: optionalString,
		subtitle: optionalString,
		description: optionalString,
		image: optionalString,
		icon: optionalString,
		closed: optionalBoolean,
		volume24hr: optionalNumber,
		markets: z.array(MarketSchema).optional().nullable(),
	})
	.loose();
export type Event = z.infer<typeof EventSchema>;

export const SeriesSchema = z
	.object({
		id: z.string(),
		slug: optionalString,
		title: optionalString,
		description: optionalString,
		image: optionalString,
		icon: optionalString,
		createdAt: optionalString,
	})
	.loose();
export type Series = z.infer<typeof SeriesSchema>;

export const TagSchema = z
	.object({
		id: z.string(),
		label: optionalString,
		slug: optionalString,
		forceShow: optionalBoolean,
		publishedAt: optionalString,
		createdBy: z.number().int().optional().nullable(),
		updatedBy: z.number().int().optional().nullable(),
		createdAt: optionalString,
		updatedAt: optionalString,
		forceHide: optionalBoolean,
		isCarousel: optionalBoolean,
	})
	.loose();
export type Tag = z.infer<typeof TagSchema>;

// -----------------------------
// Params Schemas (minimal)
// -----------------------------
const PaginationParamsSchema = z
	.object({
		limit: z.number().int().min(0).optional(),
		offset: z.number().int().min(0).optional(),
		order: z.string().optional(),
		ascending: z.boolean().optional(),
	})
	.optional();
type PaginationParams = z.infer<typeof PaginationParamsSchema>;

const SearchParamsSchema = z.object({
	q: z.string().min(1),
	cache: z.boolean().optional(),
	events_status: z.string().optional(),
	limit_per_type: z.number().int().min(0).optional(),
	page: z.number().int().min(0).optional(),
	events_tag: z.array(z.string()).min(1).optional(),
	keep_closed_markets: z.number().int().optional(),
	sort: z.string().optional(),
	ascending: z.boolean().optional(),
	search_tags: z.boolean().optional(),
	search_profiles: z.boolean().optional(),
	recurrence: z.string().optional(),
	exclude_tag_id: z.array(z.number().int()).min(1).optional(),
	optimized: z.boolean().optional(),
	// Keep it minimal; add fields here as needed
});
type SearchParams = z.infer<typeof SearchParamsSchema>;

const SearchResponseSchema = z
	.object({
		events: z.array(EventSchema).optional().nullable(),
		tags: z.array(TagSchema).optional().nullable(),
	})
	.loose();
type SearchResponse = z.infer<typeof SearchResponseSchema>;

// List Events params per docs:
// https://docs.polymarket.com/api-reference/events/list-events
const ListEventsParamsSchema = z
	.object({
		limit: z.number().int().min(0).optional(),
		offset: z.number().int().min(0).optional(),
		order: z.string().optional(),
		ascending: z.boolean().optional(),
		id: z.array(z.number().int()).min(1).optional(),
		slug: z.array(z.string()).min(1).optional(),
		tag_id: z.number().int().optional(),
		exclude_tag_id: z.array(z.number().int()).min(1).optional(),
		related_tags: z.boolean().optional(),
		featured: z.boolean().optional(),
		cyom: z.boolean().optional(),
		include_chat: z.boolean().optional(),
		include_template: z.boolean().optional(),
		recurrence: z.string().optional(),
		closed: z.boolean().optional(),
		start_date_min: z.string().optional(),
		start_date_max: z.string().optional(),
		end_date_min: z.string().optional(),
		end_date_max: z.string().optional(),
	})
	.optional();
type ListEventsParams = z.infer<typeof ListEventsParamsSchema>;

const ListTagsParamsSchema = z
	.object({
		limit: z.number().int().min(0).optional(),
		offset: z.number().int().min(0).optional(),
		order: z.string().optional(),
		ascending: z.boolean().optional(),
		include_template: z.boolean().optional(),
		is_carousel: z.boolean().optional(),
	})
	.optional();
type ListTagsParams = z.infer<typeof ListTagsParamsSchema>;

// -----------------------------
// Minimal Gamma client
// -----------------------------

const gamma = {
	search: {
		publicSearch: async (params: SearchParams): Promise<SearchResponse> => {
			const parsed = SearchParamsSchema.parse(params);
			const data = await httpGet<unknown>("/public-search", parsed);
			return SearchResponseSchema.parse(data);
		},
	},
	events: {
		list: async (params?: ListEventsParams): Promise<Event[]> => {
			const parsed = ListEventsParamsSchema.parse(params);
			const data = await httpGet<unknown>("/events", parsed ?? undefined);
			return z.array(EventSchema).parse(data);
		},
		getEventBySlug: async (
			slug: string,
			params?: { include_chat?: boolean; include_template?: boolean }
		): Promise<Event> => {
			if (!slug || typeof slug !== "string")
				throw new Error("slug is required");
			const data = await httpGet<unknown>(
				`/events/slug/${encodeURIComponent(slug)}`,
				params
			);
			return EventSchema.parse(data);
		},
	},
	series: {
		listSeries: async (params?: PaginationParams): Promise<Series[]> => {
			const parsed = PaginationParamsSchema.parse(params);
			const data = await httpGet<unknown>("/series", parsed ?? undefined);
			// API can return array of series
			return z.array(SeriesSchema).parse(data);
		},
	},
	markets: {
		listMarkets: async (params?: PaginationParams): Promise<Market[]> => {
			const parsed = PaginationParamsSchema.parse(params);
			const data = await httpGet<unknown>("/markets", parsed ?? undefined);
			return z.array(MarketSchema).parse(data);
		},
	},
	tags: {
		list: async (params?: ListTagsParams): Promise<Tag[]> => {
			const parsed = ListTagsParamsSchema.parse(params);
			const data = await httpGet<unknown>("/tags", parsed ?? undefined);
			return z.array(TagSchema).parse(data);
		},
	},
} as const;

export const polymarketData = { gamma };
