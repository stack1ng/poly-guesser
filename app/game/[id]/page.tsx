import type { Metadata } from "next";
import { getClientGameState } from "@/lib/game/getClientGameState";
import { GameRouter } from "./game-router";
import { Suspense } from "react";
import { get } from "@vercel/edge-config";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ id: string }>;
}): Promise<Metadata> {
	return {
		title: `PLAY NOW`,
		description:
			"Go head to head against your friends to see who is the best at predicting the future.",
	};
}

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
