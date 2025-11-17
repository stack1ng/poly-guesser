import { getClientGameState } from "@/lib/game/getClientGameState";
import { GameRouter } from "./game-router";
import { Suspense } from "react";
import { get } from "@vercel/edge-config";

export default async function GamePage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const usePolling = (await get<boolean>("use_polling")) ?? true;
	return (
		<Suspense fallback={<div>Loading (1)...</div>}>
			<GameRouter
				gameId={id}
				initialStatePromise={getClientGameState(id)}
				usePolling={usePolling}
			/>
		</Suspense>
	);
}
