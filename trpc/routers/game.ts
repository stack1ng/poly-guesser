import { db } from "@/db/client";
import { games } from "@/db/schema";
import { publicProcedure, router } from "../trpc";
import { z } from "zod";
import { NANO_ID_LENGTH } from "@/lib/nanoidLength";
import { eq } from "drizzle-orm";
import { getClientGameState } from "@/lib/game/getClientGameState";

export const gameRouter = router({
	getPhase: publicProcedure
		.input(
			z.object({
				gameId: z
					.string()
					.length(
						NANO_ID_LENGTH,
						`gameId must be ${NANO_ID_LENGTH} characters`
					),
			})
		)
		.query(async ({ input }) => {
			const game = await db.query.games.findFirst({
				where: eq(games.id, input.gameId),
				columns: {
					phase: true,
				},
			});

			return {
				joinable: game?.phase === "joinable",
				phase: game?.phase ?? null,
			};
		}),

	getState: publicProcedure
		.input(
			z.object({
				gameId: z
					.string()
					.length(
						NANO_ID_LENGTH,
						`gameId must be ${NANO_ID_LENGTH} characters`
					),
			})
		)
		.query(({ input }) => getClientGameState(input.gameId)),
});
