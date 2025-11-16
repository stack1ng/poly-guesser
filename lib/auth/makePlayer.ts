"use server";

import { db } from "@/db/client";
import { players } from "@/db/schema";

export async function makePlayer(username: string): Promise<string> {
	const [player] = await db
		.insert(players)
		.values({ name: username })
		.returning({ id: players.id });
	if (!player) throw new Error("Failed to create player");

	return player.id;
}
