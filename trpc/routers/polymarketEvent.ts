import { polymarketData } from "@/lib/polymarketData";
import { publicProcedure, router } from "../trpc";
import { z } from "zod";
import {
	Event,
	eventParamsSchema,
} from "polymarket-data/dist/modules/gamma/schemas";

export const polymarketEventRouter = router({
	getEventBySlug: publicProcedure
		.input(eventParamsSchema.extend({ slug: z.string() }))
		.query((p): Promise<Event> => {
			const { slug, ...params } = p.input;
			return polymarketData.gamma.events.getEventBySlug(slug, params);
		}),
});
