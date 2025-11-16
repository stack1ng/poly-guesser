"use client";

import { ClientGameState } from "@/lib/game/state-types";
import { useGameState } from "@/lib/useGameState";
import { use } from "react";
import { Lobby } from "./(lobby)/lobby";
import { InPlay } from "./(inplay)/in-play";
import { Ended } from "./(ended)/ended";
import LeaderboardLayout from "./(leaderboard)/leaderboardLayout";

export function GameRouter({
	gameId,
	initialStatePromise,
}: {
	gameId: string;
	initialStatePromise: Promise<{
		clientGameState: ClientGameState;
		sequenceId: number;
	}>;
}) {
	const initialState = use(initialStatePromise);
	const game = useGameState(gameId, initialState.clientGameState, true);
	console.log("game-router game", game);

	let content: React.ReactNode;
	switch (game.phase) {
		case "joinable":
			content = <Lobby game={game} />;
			break;
		case "in_play":
			content = <InPlay game={game} />;
			break;
		case "ended":
			return <Ended game={game} />;
		default:
			throw new Error(`Unknown game phase: ${game.phase}`);
	}

	return <LeaderboardLayout game={game}>{content}</LeaderboardLayout>;
}
