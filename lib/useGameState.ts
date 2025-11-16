/* eslint-disable react-hooks/rules-of-hooks */
import { useMemo } from "react";
import { ClientGameState } from "./game/state-types";
import { useModelState } from "./realtime/useModelState";
import {
	ConfirmedEvent,
	ModelSpec,
	OptimisticEvent,
	SyncReturnType,
} from "@ably-labs/models";
import {
	batchGameEvents,
	batchGameEventsSchema,
	gameChannel,
	gameCurrentRoundChangeEvent,
	gameCurrentRoundChangeEventSchema,
	gamePhaseChangeEvent,
	gamePhaseChangeEventSchema,
	playerJoinEvent,
	playerJoinEventSchema,
	playerReadyEvent as playerReadyChangeEvent,
	playerReadyEventSchema,
	roundTimeChangeEvent,
	roundTimeChangeEventSchema,
	submitChoiceEvent,
	submitChoiceEventSchema,
} from "./game/gameSync";
import { useTRPC, useTRPCClient } from "@/trpc/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

export function useGameState(
	gameId: string,
	initialState: ClientGameState,
	// the ably livesync is in alpha... so it often breaks. Polling is a good fallback
	polling: boolean
) {
	if (polling) {
		const trpc = useTRPC();
		const { data } = useQuery({
			...trpc.game.getState.queryOptions({
				gameId,
			}),
			refetchInterval: 1000,

			initialData: { clientGameState: initialState, sequenceId: 0 },
		});
		return data.clientGameState;
	}
	const trpcClient = useTRPCClient();
	return useModelState(
		initialState,
		useMemo(
			(): ModelSpec<() => SyncReturnType<ClientGameState>> => ({
				channelName: gameChannel(gameId),
				sync: async () => {
					console.log("syncing game state");
					const { clientGameState, sequenceId } =
						await trpcClient.game.getState.query({
							gameId,
						});
					return {
						data: clientGameState,
						sequenceId,
					};
				},
				merge: (oldData, event) => {
					try {
						console.log("merging game state", event.name);
						return handleGameMerge(oldData, event.name, event.data);
					} catch (error) {
						console.error(
							"error merging game state for event",
							event.name,
							error
						);
						toast.error(`Error merging game state for event ${event.name}`);
						throw error;
					}
				},
			}),
			[gameId, trpcClient.game.getState]
		)
	);
}

function handleGameMerge(
	oldData: ClientGameState,
	eventName: string,
	eventData: unknown
) {
	const newData: typeof oldData = { ...oldData };
	switch (eventName) {
		case batchGameEvents: {
			const parsedData = batchGameEventsSchema.parse(eventData);
			let recursiveNewData = newData;
			for (const event of parsedData)
				recursiveNewData = handleGameMerge(
					recursiveNewData,
					event.name,
					event.data
				);

			return recursiveNewData;
		}
		case playerJoinEvent: {
			const parsedData = playerJoinEventSchema.parse(eventData);
			newData.players = [
				...newData.players,
				{ id: parsedData.id, state: "not_ready" },
			];
			return newData;
		}
		case playerReadyChangeEvent: {
			const parsedData = playerReadyEventSchema.parse(eventData);
			const player = newData.players.find(
				(player) => player.id === parsedData.id
			);
			if (!player) throw new Error(`Player ${parsedData.id} not found`);

			player.state = parsedData.state;
			return newData;
		}
		case gamePhaseChangeEvent: {
			const parsedData = gamePhaseChangeEventSchema.parse(eventData);
			newData.phase = parsedData.phase;
			return newData;
		}
		case roundTimeChangeEvent: {
			const parsedData = roundTimeChangeEventSchema.parse(eventData);
			const targetRound = newData.rounds.find(
				(round) => round.index === parsedData.roundIndex
			);
			if (!targetRound)
				throw new Error(`Round ${parsedData.roundIndex} not found`);

			targetRound.details.startTime = parsedData.startTime;
			targetRound.details.endTime = parsedData.endTime;
			return newData;
		}
		case gameCurrentRoundChangeEvent: {
			console.log("current round changed event", eventData);
			const parsedData = gameCurrentRoundChangeEventSchema.parse(eventData);
			newData.currentRoundIndex = parsedData.roundIndex;
			console.log("current round changed to", parsedData.roundIndex);
			return newData;
		}
		case submitChoiceEvent: {
			const parsedData = submitChoiceEventSchema.parse(eventData);
			const targetRound = newData.rounds.find(
				(round) => round.index === parsedData.roundIndex
			);
			if (!targetRound)
				throw new Error(`Round ${parsedData.roundIndex} not found`);

			targetRound.choices = [
				...targetRound.choices,
				{
					...parsedData,
					roundGameId: oldData.id,
				},
			];
			return newData;
		}
		default:
			throw new Error(`Unknown event: ${eventName}`);
	}
}
