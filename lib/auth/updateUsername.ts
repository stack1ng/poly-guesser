"use server";

import { db } from "@/db/client";
import { players } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function updateUsername(playerId: string, username: string) {
	await db
		.update(players)
		.set({ name: username })
		.where(eq(players.id, playerId));
}
