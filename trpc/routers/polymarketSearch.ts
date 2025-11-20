import { polymarketData } from "@/lib/polymarketData";
import { publicProcedure, router } from "../trpc";
import { z } from "zod";

export const polymarketSearchRouter = router({
	publicSearch: publicProcedure
		.input(
			z.object({
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
			})
		)
		.query((p) => polymarketData.gamma.search.publicSearch(p.input)),
});
