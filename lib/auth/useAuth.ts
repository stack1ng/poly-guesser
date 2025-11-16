import { useCallback, useEffect } from "react";
import { useLocalStorage } from "usehooks-ts";
import { updateUsername } from "./updateUsername";
import { makePlayer as makePlayerAction } from "./makePlayer";
import { useTRPCClient } from "@/trpc/client";

export function useAuth() {
	const [username, setUsername] = useLocalStorage<string>("username", "");
	const [playerId, setPlayerId] = useLocalStorage<string>("playerId", "");
	const trpcClient = useTRPCClient();

	useEffect(() => {
		if (!playerId) return;

		// make sure the player id still exists
		trpcClient.player.exists.query({ playerId }).then((exists) => {
			if (!exists) setPlayerId("");
		});
	}, [playerId, setPlayerId, trpcClient.player.exists]);

	useEffect(() => {
		if (!playerId) return;
		updateUsername(playerId, username);
	}, [playerId, username]);

	const makePlayer = useCallback(async () => {
		if (playerId) throw new Error("Player already exists");

		const newPlayerId = await makePlayerAction(username);
		setPlayerId(newPlayerId);
		return newPlayerId;
	}, [playerId, setPlayerId, username]);

	return { username, setUsername, playerId, makePlayer };
}
