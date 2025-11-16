import { db } from "@/db/client";
import { games, rounds } from "@/db/schema";
import { polymarketData } from "@/lib/polymarketData";
import { shuffleWithSeed } from "@/lib/shuffleWithSeed";
import { InferInsertModel } from "drizzle-orm";
import { redirect } from "next/navigation";

const roundCount = 5;

export default async function NewGame() {
	const events = await pickRandomEvents(roundCount);
	const game = await db.transaction(async (tx) => {
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
				})
			)
		);

		return game;
	});

	return redirect(`/game/join?gameId=${game.id}`);
}

async function pickRandomEvents(sampleSize: number, topic = " ") {
	const { events } = await polymarketData.gamma.search.publicSearch({
		q: topic,
		cache: true,
		events_status: "active",
		limit_per_type: 50,
		sort: "volume",
		ascending: false,
	});
	if (!events) throw new Error("No events found");
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
