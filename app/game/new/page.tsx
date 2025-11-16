import { db } from "@/db/client";
import { games, rounds } from "@/db/schema";
import { InferInsertModel } from "drizzle-orm";
import { redirect } from "next/navigation";

const roundCount = 5;

export default async function NewGame() {
	const game = await db.transaction(async (tx) => {
		const [game] = await tx
			.insert(games)
			.values({
				phase: "joinable",
			})
			.returning({ id: games.id });

		await tx.insert(rounds).values(
			new Array(roundCount).fill(0).map(
				(_, i): InferInsertModel<typeof rounds> => ({
					index: i,
					gameId: game.id,
					eventSlug: "which-company-has-best-ai-model-end-of-2025",
				})
			)
		);

		return game;
	});

	return redirect(`/game/join?gameId=${game.id}`);
}
