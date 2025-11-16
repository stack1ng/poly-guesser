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
	if (!currentRound) throw new Error("Current round not found");

	const startTime = currentRound.details.startTime;
	if (startTime === null)
		throw new Error("Current round should have a start time at this point");

	const trpcClient = useTRPCClient();
	const eventPromise = useMemo(
		() =>
			trpcClient.polymarketEvent.getEventBySlug.query({
				slug: currentRound.details.eventSlug,
			}),
		[currentRound.details.eventSlug, trpcClient]
	);

	return (
		<RankedSelectionProvider>
			<ReadySetGo targetTime={startTime}>
				<ErrorBoundary
					fallbackRender={({ error }) => <div>Error: {error.message}</div>}
				>
					<Suspense fallback={<div>Loading...</div>}>
						<QuestionPage game={game} eventPromise={eventPromise} />
					</Suspense>
				</ErrorBoundary>
			</ReadySetGo>
		</RankedSelectionProvider>
	);
}
