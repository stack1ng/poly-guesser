"use server";

import { gamePlayers, games } from "@/db/schema";
import {
	gameChannel,
	playerJoinEvent,
	playerJoinEventSchema,
} from "@/lib/game/gameSync";
import { withOutbox } from "@/lib/withOutbox";
import { eq } from "drizzle-orm";

export async function joinGame(gameId: string, playerId: string) {
	await withOutbox(
		[
			{
				channel: gameChannel(gameId),
				name: playerJoinEvent,
				data: playerJoinEventSchema.parse({
					id: playerId,
				}),
			},
		],
		async (tx) => {
			const [game] = await tx
				.select({ phase: games.phase })
				.from(games)
				.where(eq(games.id, gameId));
			if (!game || game.phase !== "joinable")
				throw new Error("Game is not joinable");

			return (
				tx
					.insert(gamePlayers)
					.values({ gameId, playerId })
					// if the player is already in the game, do nothing
					.onConflictDoNothing()
					.returning({ id: gamePlayers.playerId })
			);
		}
	);
}
