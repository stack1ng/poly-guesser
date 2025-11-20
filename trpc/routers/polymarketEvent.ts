import { polymarketData } from "@/lib/polymarketData";
import { publicProcedure, router } from "../trpc";
import { z } from "zod";
import type { Event } from "@/lib/polymarketData";

export const polymarketEventRouter = router({
	getEventBySlug: publicProcedure
		.input(
			z.object({
				slug: z.string(),
				include_chat: z.boolean().optional(),
				include_template: z.boolean().optional(),
			})
		)
		.query((p): Promise<Event> => {
			const { slug, ...params } = p.input;
			return polymarketData.gamma.events.getEventBySlug(slug, params);
		}),

	listSeries: publicProcedure
		.input(
			z
				.object({
					limit: z.number().int().min(0).optional(),
					offset: z.number().int().min(0).optional(),
					order: z.string().optional(),
					ascending: z.boolean().optional(),
				})
				.optional()
		)
		.query(async (p) => {
			return await polymarketData.gamma.series.listSeries(p.input);
		}),
});
