import { ReadySetGo } from "@/components/ui/ready-set-go";
import { useCurrentRound } from "@/lib/game/currentRound";
import { ClientGameState } from "@/lib/game/state-types";
import { QuestionPage } from "./(roundPages)/question-page";
import { ErrorBoundary } from "react-error-boundary";
import { useTRPCClient } from "@/trpc/client";
import { Suspense, useMemo } from "react";

export function InPlay({ game }: { game: ClientGameState }) {
	const currentRound = useCurrentRound(game);

	const trpcClient = useTRPCClient();
	const eventPromise = useMemo(
		() =>
			currentRound
				? trpcClient.polymarketEvent.getEventBySlug.query({
						slug: currentRound.details.eventSlug,
				  })
				: undefined,
		// when polling, we need to have a stable dependency array somehow
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[currentRound?.details.eventSlug, trpcClient]
	);

	const startTime = currentRound?.details.startTime;
	if (!startTime) {
		console.error("Current round should have a start time at this point");
		return null;
	}
	if (!currentRound) {
		console.error("Current round not found");
		return null;
	}
	console.log("in-play game", game);
	return (
		<ReadySetGo targetTime={startTime}>
			<ErrorBoundary
				fallbackRender={({ error }) => <div>Error: {error.message}</div>}
			>
				<Suspense fallback={<div>Loading (0)...</div>}>
					{eventPromise && (
						<QuestionPage game={game} eventPromise={eventPromise} />
					)}
				</Suspense>
			</ErrorBoundary>
		</ReadySetGo>
	);
}
