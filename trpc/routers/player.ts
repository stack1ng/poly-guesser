import { db } from "@/db/client";
import { players } from "@/db/schema";
import { publicProcedure, router } from "../trpc";
import { z } from "zod";
import { eq } from "drizzle-orm";

export const playerRouter = router({
	exists: publicProcedure
		.input(z.object({ playerId: z.string() }))
		.query(async ({ input }) => {
			const player = await db.query.players.findFirst({
				where: eq(players.id, input.playerId),
				columns: {
					id: true,
				},
			});

			return player !== undefined;
		}),

	getName: publicProcedure
		.input(z.object({ playerId: z.string() }))
		.query(async ({ input }) => {
			const player = await db.query.players.findFirst({
				where: eq(players.id, input.playerId),
				columns: { name: true },
			});
			return player?.name ?? null;
		}),
});
