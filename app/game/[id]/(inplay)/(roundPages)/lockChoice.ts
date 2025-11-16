"use server";

import { db } from "@/db/client";
import { outbox, roundChoices, rounds } from "@/db/schema";
import {
	gameChannel,
	submitChoiceEvent,
	submitChoiceEventSchema,
} from "@/lib/game/gameSync";
import { calculateScoreDelta } from "@/lib/scoring";
import { and, eq } from "drizzle-orm";
import { SubmitChoiceEvent } from "@/lib/game/gameSync";

export async function submitChoice(
	gameId: string,
	roundIndex: number,
	playerId: string,
	choice: SubmitChoiceEvent["choice"]
) {
	const [round] = await db
		.select({
			eventSlug: rounds.eventSlug,
		})
		.from(rounds)
		.where(and(eq(rounds.gameId, gameId), eq(rounds.index, roundIndex)));
	if (!round) throw new Error("Round not found");

	const scoreDelta = await calculateScoreDelta(round.eventSlug, choice);

	await db.transaction(async (tx) => {
		const outboxRow = tx.$with("outbox_row").as(() =>
			tx.insert(outbox).values({
				channel: gameChannel(gameId),
				name: submitChoiceEvent,
				data: submitChoiceEventSchema.parse({
					roundIndex,
					playerId,
					choice,
					scoreDelta,
				}),
			})
		);
		await tx.with(outboxRow).insert(roundChoices).values({
			roundGameId: gameId,
			roundIndex: roundIndex,
			playerId: playerId,
			choice,
			scoreDelta,
		});
	});
}
