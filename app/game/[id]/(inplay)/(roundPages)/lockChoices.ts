"use server";

import { db } from "@/db/client";
import { outbox, roundChoices, rounds } from "@/db/schema";
import {
	gameChannel,
	submitChosenRankingsEvent,
	submitChosenRankingsEventSchema,
} from "@/lib/game/gameSync";
import { calculateScoreDelta } from "@/lib/scoring";
import { and, eq } from "drizzle-orm";

export async function submitChosenRankings(
	gameId: string,
	roundIndex: number,
	playerId: string,
	chosenEventIdsRanked: string[]
) {
	const [round] = await db
		.select({
			eventSlug: rounds.eventSlug,
		})
		.from(rounds)
		.where(and(eq(rounds.gameId, gameId), eq(rounds.index, roundIndex)));
	if (!round) throw new Error("Round not found");

	const scoreDelta = await calculateScoreDelta(
		round.eventSlug,
		chosenEventIdsRanked
	);

	await db.transaction(async (tx) => {
		const outboxRow = tx.$with("outbox_row").as(() =>
			tx.insert(outbox).values({
				channel: gameChannel(gameId),
				name: submitChosenRankingsEvent,
				data: submitChosenRankingsEventSchema.parse({
					roundIndex,
					playerId,
					chosenEventIdsRanked,
					scoreDelta,
				}),
			})
		);
		await tx.with(outboxRow).insert(roundChoices).values({
			roundGameId: gameId,
			roundIndex: roundIndex,
			playerId: playerId,
			chosenEventIdsRanked,
			scoreDelta,
		});
	});
}
