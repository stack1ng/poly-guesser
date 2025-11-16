"use server";

import { db } from "@/db/client";
import { gamePlayers, games, outbox } from "@/db/schema";
import {
	gameChannel,
	playerJoinEvent,
	playerJoinEventSchema,
} from "@/lib/game/gameSync";
import { eq } from "drizzle-orm";

export async function joinGame(gameId: string, playerId: string) {
	await db.transaction(async (tx) => {
		const outboxRow = tx.$with("outbox_row").as(() =>
			tx.insert(outbox).values({
				channel: gameChannel(gameId),
				name: playerJoinEvent,
				data: playerJoinEventSchema.parse({
					id: playerId,
				}),
			})
		);
		const [game] = await tx
			.with(outboxRow)
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
	});
}
