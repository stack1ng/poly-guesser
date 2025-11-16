import { outbox } from "@/db/schema";
import { InferInsertModel } from "drizzle-orm";
import { z } from "zod";

export function gameChannel(gameId: string) {
	return `game:${gameId}`;
}

// a way to gaurantee that events are applied in the correct order...
// however ably livesync seems to have silent message size limits... so we will disable for now
export const batchGameEvents = "batchGameEvents";
export const batchGameEventsSchema = z.array(
	z.object({
		name: z.string(),
		data: z.unknown(),
	})
);
const batchEnabled = false;
export function makeBatchGameEvents(
	gameId: string,
	events: { name: string; data: unknown }[]
): InferInsertModel<typeof outbox>[] {
	if (!batchEnabled)
		return events.map((event) => ({
			channel: gameChannel(gameId),
			name: event.name,
			data: event.data,
		}));

	return [
		{
			channel: gameChannel(gameId),
			name: batchGameEvents,
			data: batchGameEventsSchema.parse(events),
		},
	];
}

export const playerJoinEvent = "playerJoin";
export const playerJoinEventSchema = z.object({
	id: z.string(),
});

export const playerReadyEvent = "playerReady";
export const playerReadyEventSchema = z.object({
	id: z.string(),
	state: z.enum(["ready", "not_ready"]),
});

export const gamePhaseChangeEvent = "gamePhaseChange";
export const gamePhaseChangeEventSchema = z.object({
	phase: z.enum(["joinable", "in_play", "ended"]),
});

export const gameCurrentRoundChangeEvent = "gameCurrentRoundChange";
export const gameCurrentRoundChangeEventSchema = z.object({
	roundIndex: z.number(),
});

export const roundTimeChangeEvent = "roundTimeChange";
export const roundTimeChangeEventSchema = z.object({
	roundIndex: z.number(),
	startTime: z.coerce.date(),
	endTime: z.coerce.date(),
});

export const submitChosenRankingsEvent = "submitChosenRankings";
export const submitChosenRankingsEventSchema = z.object({
	roundIndex: z.number(),
	playerId: z.string(),
	chosenEventIdsRanked: z.array(z.string()),
	scoreDelta: z.record(z.string(), z.number()),
});
