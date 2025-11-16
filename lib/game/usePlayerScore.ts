import { useMemo } from "react";
import { ClientGameState } from "./state-types";

export function usePlayerScore(game: ClientGameState, playerId: string) {
	return useMemo(() => {
		return game.rounds.reduce((acc, round) => {
			const applicableChoices = round.choices.filter(
				(choice) => choice.playerId === playerId
			);
			return (
				acc +
				applicableChoices.reduce((acc, choice) => {
					return (
						acc +
						Object.values(choice.scoreDelta).reduce(
							(acc, value) => acc + value,
							0
						)
					);
				}, 0)
			);
		}, 0);
	}, [game, playerId]);
}

export function getPlayerScore(game: ClientGameState, playerId: string) {
	return game.rounds.reduce((acc, round) => {
		const applicableChoices = round.choices.filter(
			(choice) => choice.playerId === playerId
		);
		return (
			acc +
			applicableChoices.reduce((acc, choice) => {
				return (
					acc +
					Object.values(choice.scoreDelta).reduce(
						(acc, value) => acc + value,
						0
					)
				);
			}, 0)
		);
	}, 0);
}
