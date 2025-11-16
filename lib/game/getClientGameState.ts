import { db } from "@/db/client";
import { games, outbox } from "@/db/schema";
import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { gameChannel } from "./gameSync";
import { ClientGameState } from "./state-types";

export async function getClientGameState(gameId: string) {
	const { game, sequenceId } = await db.transaction(async (tx) => {
		const game = await tx.query.games.findFirst({
			where: eq(games.id, gameId),
			with: {
				players: {
					columns: {
						playerId: true,
						state: true,
					},
				},
				rounds: {
					with: {
						roundChoices: true,
					},
				},
			},
		});
		if (!game)
			throw new TRPCError({ code: "NOT_FOUND", message: "Game not found" });

		const sequenceId = await tx
			.select({ sequenceId: outbox.sequenceId })
			.from(outbox)
			.where(eq(outbox.channel, gameChannel(gameId)))
			.orderBy(desc(outbox.sequenceId))
			.limit(1);

		return { game, sequenceId: sequenceId[0]?.sequenceId ?? 0 };
	});

	// convert the game to the client game state
	const clientGameState: ClientGameState = {
		...game,
		currentRoundIndex: game.currentRoundIndex,
		players: game.players.map((gp) => ({
			id: gp.playerId,
			state: gp.state,
		})),
		rounds: game.rounds.map((round) => ({
			index: round.index,
			details: round,
			choices: round.roundChoices,
		})),
	};

	return { clientGameState, sequenceId };
}
