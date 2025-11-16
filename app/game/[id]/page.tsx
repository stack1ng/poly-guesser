import { getClientGameState } from "@/lib/game/getClientGameState";
import { GameRouter } from "./game-router";
import { Suspense } from "react";

export default async function GamePage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	return (
		<Suspense fallback={<div>Loading...</div>}>
			<GameRouter gameId={id} initialStatePromise={getClientGameState(id)} />
		</Suspense>
	);
}
