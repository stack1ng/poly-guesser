"use server";

import { db } from "@/db/client";
import { games, rounds } from "@/db/schema";
import { Event, polymarketData, Tag } from "@/lib/polymarketData";
import { shuffleWithSeed } from "@/lib/shuffleWithSeed";
import { InferInsertModel } from "drizzle-orm";

export type CreateGameInput = {
	roundCount: number;
	topics: Tag[];
};

export async function createGame({
	roundCount,
	topics,
}: CreateGameInput): Promise<
	[gameId: string, error: null] | [gameId: null, error: string]
> {
	const events = await pickRandomEvents(roundCount, topics);
	if (events.length < roundCount)
		return [
			null,
			`Sorry... '${topics
				?.map((t) => t.label)
				.join(
					", "
				)}' is too specific, we couldn't find enough questions to make the game`,
		];

	return await db.transaction(async (tx) => {
		const [game] = await tx
			.insert(games)
			.values({
				phase: "joinable",
			})
			.returning({ id: games.id });

		await tx.insert(rounds).values(
			events.map(
				(event, i): InferInsertModel<typeof rounds> => ({
					index: i,
					gameId: game.id,
					eventSlug: event.slug!,
					// eventSlug: "xi-jinping-out-before-2027",
				})
			)
		);

		return [game.id, null];
	});
}

async function pickRandomEvents(
	sampleSize: number,
	tags: Tag[]
): Promise<Event[]> {
	let events: Event[];
	if (tags.length > 0) {
		events = (
			await Promise.all(
				tags.map((t) =>
					polymarketData.gamma.events.list({
						limit: Math.ceil(50 / tags.length),
						tag_id: +t.id,
						order: "volume24hr",
						ascending: false,
						closed: false,
					})
				)
			)
		).flat();
	} else {
		events = await polymarketData.gamma.events.list({
			limit: 50,
			order: "volume24hr",
			ascending: false,
			closed: false,
		});
	}
	if (!events) return [];
	console.log("picking random events", tags);
	const sample = shuffleWithSeed(events, Math.random().toString()).slice(
		0,
		sampleSize
	);
	console.log(
		"sampled",
		sample.map((e) => e.slug)
	);

	return sample;
}
