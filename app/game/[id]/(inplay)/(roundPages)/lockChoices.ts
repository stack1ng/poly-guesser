"use server";

import { db } from "@/db/client";
import { roundChoices, rounds } from "@/db/schema";
import {
	gameChannel,
	submitChosenRankingsEvent,
	submitChosenRankingsEventSchema,
} from "@/lib/game/gameSync";
import { calculateScoreDelta } from "@/lib/scoring";
import { withOutbox } from "@/lib/withOutbox";
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

	await withOutbox(
		[
			{
				channel: gameChannel(gameId),
				name: submitChosenRankingsEvent,
				data: submitChosenRankingsEventSchema.parse({
					roundIndex,
					playerId,
					chosenEventIdsRanked,
					scoreDelta,
				}),
			},
		],
		async (tx) => {
			await tx.insert(roundChoices).values({
				roundGameId: gameId,
				roundIndex: roundIndex,
				playerId: playerId,
				chosenEventIdsRanked,
				scoreDelta,
			});
		}
	);
}
