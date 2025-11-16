import { ReadySetGo } from "@/components/ui/ready-set-go";
import { useCurrentRound } from "@/lib/game/currentRound";
import { ClientGameState } from "@/lib/game/state-types";
import { QuestionPage } from "./(roundPages)/question-page";
import { ErrorBoundary } from "react-error-boundary";
import { useTRPCClient } from "@/trpc/client";
import { Suspense, useMemo } from "react";
import { RankedSelectionProvider } from "./(roundPages)/selection-provider";

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
		[currentRound, trpcClient]
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
	// throw new Error("Current round should have a start time at this point");
	return (
		<RankedSelectionProvider>
			<ReadySetGo targetTime={startTime}>
				<ErrorBoundary
					fallbackRender={({ error }) => <div>Error: {error.message}</div>}
				>
					<Suspense fallback={<div>Loading...</div>}>
						{eventPromise && (
							<QuestionPage game={game} eventPromise={eventPromise} />
						)}
					</Suspense>
				</ErrorBoundary>
			</ReadySetGo>
		</RankedSelectionProvider>
	);
}
