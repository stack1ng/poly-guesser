/* eslint-disable react-hooks/immutability */
"use client";

import { ClientGameState } from "@/lib/game/state-types";
import { useGameState } from "@/lib/useGameState";
import { use, useMemo } from "react";
import { Lobby } from "./(lobby)/lobby";
import { InPlay } from "./(inplay)/in-play";
import { Ended } from "./(ended)/ended";
import LeaderboardLayout from "./(leaderboard)/leaderboardLayout";
import { Card } from "@/components/ui/card";

export function GameRouter({
	gameId,
	initialStatePromise,
	usePolling,
}: {
	gameId: string;
	initialStatePromise: Promise<{
		clientGameState: ClientGameState;
		sequenceId: number;
	}>;
	usePolling: boolean;
}) {
	const initialState = use(initialStatePromise);
	const game = useGameState(gameId, initialState.clientGameState, usePolling);
	console.log("game-router game", game);

	const content = useMemo(() => {
		const topicDisplay = game.topic ? ` - ${game.topic}` : "";
		switch (game.phase) {
			case "joinable":
				document.title = `IN LOBBY${topicDisplay}`;
				return (
					<Card className="px-8 py-16">
						<Lobby game={game} />
					</Card>
				);
			case "in_play":
				document.title = `IN PLAY${topicDisplay}`;
				return (
					<div className="w-full h-full bg-background grid place-items-center">
						<InPlay game={game} />
					</div>
				);
			case "ended":
				document.title = `GAME OVER${topicDisplay}`;
				return (
					<Card className="px-8 py-16">
						<Ended game={game} />
					</Card>
				);
			default:
				throw new Error(`Unknown game phase: ${game.phase}`);
		}
	}, [game]);

	return <LeaderboardLayout game={game}>{content}</LeaderboardLayout>;
}
