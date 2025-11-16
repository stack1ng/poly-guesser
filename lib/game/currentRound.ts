import { useMemo } from "react";
import { ClientGameState } from "./state-types";

export function useCurrentRound(game: ClientGameState) {
	return useMemo(() => getCurrentRound(game), [game]);
}

export function getCurrentRound(game: ClientGameState) {
	const currentRoundIndex = game.currentRoundIndex;
	if (currentRoundIndex === null) return null;

	return game.rounds.find((round) => round.index === currentRoundIndex);
}
