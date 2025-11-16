"use server";

import { gamePlayers, games, outbox, rounds } from "@/db/schema";
import {
	batchGameEvents,
	batchGameEventsSchema,
	gameChannel,
	gameCurrentRoundChangeEvent,
	gameCurrentRoundChangeEventSchema,
	gamePhaseChangeEvent,
	gamePhaseChangeEventSchema,
	makeBatchGameEvents,
	playerReadyEvent as playerReadyChangeEvent,
	playerReadyEventSchema,
	roundTimeChangeEvent,
	roundTimeChangeEventSchema,
} from "./gameSync";
import { and, asc, eq, ExtractTablesWithRelations, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { PgTransaction } from "drizzle-orm/pg-core";
import { NeonQueryResultHKT } from "drizzle-orm/neon-serverless";
import * as schema from "@/db/schema";

export async function readyPlayer(gameId: string, playerId: string) {
	await db.transaction(async (tx) => {
		const outboxRow = tx.$with("outbox_row").as(() =>
			tx
				.insert(outbox)
				.values({
					channel: gameChannel(gameId),
					name: playerReadyChangeEvent,
					data: {
						id: playerId,
						state: "ready",
					},
				})
				.returning({
					sequenceId: outbox.sequenceId,
				})
		);
		await tx
			.with(outboxRow)
			.update(gamePlayers)
			.set({ state: "ready" })
			.where(
				and(eq(gamePlayers.gameId, gameId), eq(gamePlayers.playerId, playerId))
			)
			.returning({ id: gamePlayers.playerId });

		const playerStates = await tx
			.select({ state: gamePlayers.state })
			.from(gamePlayers)
			.where(eq(gamePlayers.gameId, gameId));

		const allPlayersReady = playerStates.every(
			(player) => player.state === "ready"
		);
		if (allPlayersReady) {
			const g = await tx.query.games.findFirst({
				where: eq(games.id, gameId),
				columns: {
					phase: true,
				},
			});
			if (!g) throw new Error("Game not found");
			console.log("current game phase", g);
			switch (g.phase) {
				case "joinable":
					await handleJoinableAllReady(tx, gameId);
					break;
				case "in_play":
					await handleInPlayAllReady(tx, gameId);
					break;
				// there is no notion of "readying up" after the game is ended
				// case "ended":
				// 	await handleEndedAllReady(tx, gameId);
				// 	break;
				default:
					throw new Error(`Unknown game phase for ready action: ${g.phase}`);
			}

			// then un ready all players for the next round
			const allPlayerIds = await tx
				.select({ id: gamePlayers.playerId })
				.from(gamePlayers)
				.where(eq(gamePlayers.gameId, gameId));

			const outboxRow2 = tx.$with("outbox_row2").as(() =>
				tx
					.insert(outbox)
					.values(
						allPlayerIds.map(({ id }) => ({
							channel: gameChannel(gameId),
							name: playerReadyChangeEvent,
							data: playerReadyEventSchema.parse({
								id,
								state: "not_ready",
							}),
						}))
					)
					.returning({
						sequenceId: outbox.sequenceId,
					})
			);
			await tx
				.with(outboxRow2)
				.update(gamePlayers)
				.set({ state: "not_ready" })
				.where(eq(gamePlayers.gameId, gameId));
		}
	});
}

const roundDuration = 10000;

function startRound(
	tx: PgTransaction<
		NeonQueryResultHKT,
		typeof schema,
		ExtractTablesWithRelations<typeof schema>
	>,
	gameId: string,
	index: number
) {
	const roundStartTime = new Date(Date.now() + 1000),
		roundEndTime = new Date(roundStartTime.getTime() + roundDuration);

	const outboxRow = tx.$with("start_round_outbox_row").as(() =>
		tx.insert(outbox).values(
			makeBatchGameEvents(gameId, [
				{
					name: roundTimeChangeEvent,
					data: roundTimeChangeEventSchema.parse({
						roundIndex: index,
						startTime: roundStartTime,
						endTime: roundEndTime,
					}),
				},
				{
					name: gameCurrentRoundChangeEvent,
					data: gameCurrentRoundChangeEventSchema.parse({
						roundIndex: index,
					}),
				},
			])
		)
	);
	const updateRoundTimes = tx.$with("update_round_times").as(() =>
		tx
			.update(rounds)
			.set({
				startTime: roundStartTime,
				endTime: roundEndTime,
			})
			.where(eq(rounds.gameId, gameId))
	);

	return {
		outboxRow,
		updateRoundTimes,
	};
}

// move the game to in_play
async function handleJoinableAllReady(
	tx: PgTransaction<
		NeonQueryResultHKT,
		typeof schema,
		ExtractTablesWithRelations<typeof schema>
	>,
	gameId: string
) {
	const { outboxRow: startRoundOutboxRow, updateRoundTimes } = startRound(
		tx,
		gameId,
		0
	);
	const outboxRow = tx.$with("outbox_row").as(() =>
		tx
			.insert(outbox)
			.values(
				makeBatchGameEvents(gameId, [
					{
						name: gameCurrentRoundChangeEvent,
						data: gameCurrentRoundChangeEventSchema.parse({
							roundIndex: 0,
						}),
					},
					{
						name: gamePhaseChangeEvent,
						data: gamePhaseChangeEventSchema.parse({
							phase: "in_play",
						}),
					},
				])
			)
			.returning({
				sequenceId: outbox.sequenceId,
			})
	);

	await tx
		.with(updateRoundTimes, startRoundOutboxRow, outboxRow)
		.update(games)
		.set({ phase: "in_play", currentRoundIndex: 0 })
		.where(eq(games.id, gameId));
}

// iterate the round or end the game
async function handleInPlayAllReady(
	tx: PgTransaction<
		NeonQueryResultHKT,
		typeof schema,
		ExtractTablesWithRelations<typeof schema>
	>,
	gameId: string
) {
	const gameRounds = await tx.query.rounds.findMany({
		where: eq(rounds.gameId, gameId),
		orderBy: [asc(rounds.index)],
	});

	// first iterate the round and return the new round index
	const [{ currentRoundIndex }] = await tx
		.update(games)
		.set({
			currentRoundIndex: sql<number>`${games.currentRoundIndex} + 1`,
		})
		.where(eq(games.id, gameId))
		.returning({
			currentRoundIndex: games.currentRoundIndex,
		});
	if (currentRoundIndex === null)
		throw new Error("Current round index expected to be non-null");

	const gameEnded = currentRoundIndex >= gameRounds.length;
	const roundChangeOutboxRow = tx.$with("round_change_outbox_row").as(() =>
		tx.insert(outbox).values(
			makeBatchGameEvents(gameId, [
				{
					name: gameCurrentRoundChangeEvent,
					data: gameCurrentRoundChangeEventSchema.parse({
						roundIndex: currentRoundIndex,
					}),
				},
				{
					name: gamePhaseChangeEvent,
					data: gamePhaseChangeEventSchema.parse({
						phase: gameEnded ? "ended" : "in_play",
					}),
				},
			])
		)
	);

	if (gameEnded) {
		await tx
			.with(roundChangeOutboxRow)
			.update(games)
			.set({
				phase: "ended",
			})
			.where(eq(games.id, gameId));
	} else {
		const { outboxRow, updateRoundTimes } = startRound(
			tx,
			gameId,
			currentRoundIndex
		);
		await tx
			.with(updateRoundTimes, outboxRow, roundChangeOutboxRow)
			.select()
			.from(sql`(select 1) as _`);
	}
}
