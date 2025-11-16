import { useAuth } from "../auth/useAuth";
import { ClientGameState } from "./state-types";

export function useCurrentPlayer(game: ClientGameState) {
	const { playerId } = useAuth();
	return useSpecificPlayer(game, playerId);
}

export function useSpecificPlayer(game: ClientGameState, playerId: string) {
	return game.players.find((player) => player.id === playerId);
}
