import { polymarketData } from "@/lib/polymarketData";
import { publicProcedure, router } from "../trpc";
import { z } from "zod";

export const polymarketTagRouter = router({
	list: publicProcedure
		.input(
			z
				.object({
					limit: z.number().int().min(0).optional(),
					offset: z.number().int().min(0).optional(),
					order: z.string().optional(),
					ascending: z.boolean().optional(),
					include_template: z.boolean().optional(),
					is_carousel: z.boolean().optional(),
				})
				.optional()
		)
		.query((p) => polymarketData.gamma.tags.list(p.input)),
});
