import type { Metadata } from "next";
import { db } from "@/db/client";
import { games, rounds } from "@/db/schema";
import { polymarketData } from "@/lib/polymarketData";
import { shuffleWithSeed } from "@/lib/shuffleWithSeed";
import { InferInsertModel } from "drizzle-orm";
import { redirect } from "next/navigation";

const roundCount = 3;
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
	title: "Create Game",
	description: "Start a new PolyGuessr game.",
};

export default async function NewGame({
	searchParams,
}: {
	searchParams: Promise<{ topic?: string }>;
}) {
	const { topic } = await searchParams;
	const events = await pickRandomEvents(roundCount, topic);
	if (events.length < roundCount)
		return (
			<div>
				Sorry... {"'"}
				{topic}
				{"'"} is too specific, we couldn{"'"}t find enough events
			</div>
		);
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
					// eventSlug: "xi-jinping-out-before-2027",
				})
			)
		);

		return game;
	});

	return redirect(`/game/join?gameId=${game.id}`);
}

async function pickRandomEvents(sampleSize: number, topic = " ") {
	console.log("picking random events", topic);
	const { events } = await polymarketData.gamma.search.publicSearch({
		q: topic,
		cache: true,
		events_status: "active",
		limit_per_type: 50,
		sort: "volume",
		ascending: false,
	});
	if (!events) return [];
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
