/* eslint-disable react-hooks/immutability */
"use client";

import { ClientGameState } from "@/lib/game/state-types";
import { useGameState } from "@/lib/useGameState";
import { use, useMemo } from "react";
import { Lobby } from "./(lobby)/lobby";
import { InPlay } from "./(inplay)/in-play";
import { Ended } from "./(ended)/ended";
import LeaderboardLayout from "./(leaderboard)/leaderboardLayout";

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
		switch (game.phase) {
			case "joinable":
				document.title = `IN LOBBY - ${game.topic}`;
				return <Lobby game={game} />;
			case "in_play":
				document.title = `IN PLAY - ${game.topic}`;
				return <InPlay game={game} />;
			case "ended":
				document.title = `GAME OVER - ${game.topic}`;
				return <Ended game={game} />;
			default:
				throw new Error(`Unknown game phase: ${game.phase}`);
		}
	}, [game]);

	return <LeaderboardLayout game={game}>{content}</LeaderboardLayout>;
}
