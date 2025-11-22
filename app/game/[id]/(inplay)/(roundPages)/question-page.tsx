import { ClientGameState } from "@/lib/game/state-types";
import { type Event } from "@/lib/polymarketData";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { use, useEffect, useMemo, useState } from "react";
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from "@/components/ui/hover-card";
import { toast } from "sonner";
import { submitChoice } from "./lockChoice";
import { useAuth } from "@/lib/auth/useAuth";
import { useCurrentRound } from "@/lib/game/currentRound";
import { Lock, LockOpen, Timer } from "lucide-react";
import { DvdBounce } from "@/components/dvd-bounce";
import { useCurrentPlayer } from "@/lib/game/useCurrentPlayer";
import { readyPlayer } from "@/lib/game/readyAction";
import { cn } from "@/lib/utils";
import { shuffleWithSeed } from "@/lib/shuffleWithSeed";
import Link from "next/link";
import { getOpenEventMarkets } from "@/lib/getEventMarkets";
import { MultiMarketAnswerModal } from "./multiMarketAnswerModal";
import { SingleMarketAnswerModal } from "./singleMarketAnswerModal";
import { polymarketUrl } from "@/lib/polymarketUrl";

export function QuestionPage({
	game,
	eventPromise,
}: {
	game: ClientGameState;
	eventPromise: Promise<Event>;
}) {
	const event = use(eventPromise);
	// not quite a safe assumption... but it's ok for now
	const markets = shuffleWithSeed(
		getOpenEventMarkets(event)
			?.sort((a, b) => (b.lastTradePrice ?? 0) - (a.lastTradePrice ?? 0))
			.slice(0, 4),
		game.id
	);
	if (!markets) throw new Error("Markets not found");
	console.log("markets", event.markets);

	const isSingleProbabilityMarket = useMemo(
		() => markets.length === 1,
		[markets]
	);

	const { playerId } = useAuth();

	const currentRound = useCurrentRound(game);
	const [percentLeft, setPercentLeft] = useState(0);
	useEffect(() => {
		if (currentRound?.choices.some((choice) => choice.playerId === playerId))
			return;

		const endTime = currentRound?.details.endTime;
		if (!endTime) return;
		const startTime = currentRound?.details.startTime;
		if (!startTime) return;
		const totalDuration = endTime.getTime() - startTime.getTime();
		const computePercentLeft = () => {
			const timeLeft = endTime.getTime() - Date.now();
			setPercentLeft(timeLeft / totalDuration);
		};
		computePercentLeft();
		const interval = setInterval(computePercentLeft, 1000);

		// submit empty choices once our time is up
		const timeout = setTimeout(() => {
			clearInterval(interval);
			setPercentLeft(0);
			submitChoice(game.id, game.currentRoundIndex!, playerId, []);
		}, endTime.getTime() - Date.now());
		return () => {
			clearTimeout(timeout);
			clearInterval(interval);
		};
		// when polling, we need to have a stable dependency array somehow
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [JSON.stringify(currentRound), game.currentRoundIndex, game.id, playerId]);

	const lockedChoice = useMemo(() => {
		return currentRound?.choices.find((choice) => choice.playerId === playerId);
	}, [currentRound?.choices, playerId]);

	const isLocked = useMemo(() => {
		return lockedChoice !== undefined;
	}, [lockedChoice]);

	const answerTimedOut = useMemo(() => {
		return lockedChoice && Object.keys(lockedChoice?.scoreDelta).length === 0;
	}, [lockedChoice]);

	const allPlayersLocked = useMemo(() => {
		return game.players.every((player) =>
			currentRound?.choices.some((choice) => choice.playerId === player.id)
		);
	}, [game, currentRound?.choices]);

	const [lockFn, setLockFn] = useState<() => Promise<void>>();

	const thisPlayer = useCurrentPlayer(game);
	if (!thisPlayer) {
		console.error("Player not found: " + playerId);
		return null;
	}
	if (!currentRound) {
		console.error("Current round not found");
		return null;
	}

	console.log("allPlayersLocked", allPlayersLocked);
	return (
		<div className="flex flex-col items-center justify-center gap-4 max-w-4xl mx-auto">
			<div className="flex items-center gap-4">
				<Image
					src={
						event.image ??
						"https://upload.wikimedia.org/wikipedia/commons/7/75/Company_Logo_Polymarket.png"
					}
					alt={event.title ?? "Event image"}
					width={100}
					height={100}
				/>
				<HoverCard>
					<HoverCardTrigger>
						<h1
							className={cn("text-4xl font-bold font-sans text-wrap block", {
								"text-blue-500 hover:underline": allPlayersLocked,
							})}
						>
							{allPlayersLocked ? (
								<Link
									href={polymarketUrl(`/event/${event.slug}`)}
									target="_blank"
									rel="noopener noreferrer"
								>
									{event.title}
								</Link>
							) : (
								event.title
							)}
						</h1>
					</HoverCardTrigger>
					<HoverCardContent className="w-96">
						<p className="font-mono text-xs">{event.description}</p>
					</HoverCardContent>
				</HoverCard>
			</div>
			{isSingleProbabilityMarket ? (
				<SingleMarketAnswerModal
					key={game.currentRoundIndex}
					game={game}
					markets={markets}
					isLocked={isLocked}
					allPlayersLocked={allPlayersLocked}
					scoreDelta={lockedChoice?.scoreDelta}
					setLockFn={setLockFn}
				/>
			) : (
				<MultiMarketAnswerModal
					key={game.currentRoundIndex}
					game={game}
					markets={markets}
					isLocked={isLocked}
					allPlayersLocked={allPlayersLocked}
					scoreDelta={lockedChoice?.scoreDelta}
					setLockFn={setLockFn}
				/>
			)}
			<Button
				className={cn(
					"group relative w-full h-24 text-2xl border border-sky-500 overflow-hidden transition-colors",
					{
						"bg-destructive/50 border-destructive": answerTimedOut,
					}
				)}
				onClick={() =>
					toast.promise(lockFn!(), {
						loading: "Locking in choices...",
						success: "Choices locked in!",
						error: "Failed to lock in choices",
					})
				}
				disabled={!lockFn || isLocked}
			>
				<div
					className="absolute inset-y-0 left-0 bg-sky-500/50 group-hover:bg-sky-500 transition-[width] duration-1000"
					style={{ width: `${Math.max(0, Math.min(1, percentLeft)) * 100}%` }}
				/>
				<span
					className={cn("relative z-10 flex items-center gap-2", {
						"animate-bounce": !!lockFn && !isLocked,
					})}
				>
					{lockedChoice ? (
						answerTimedOut ? (
							<>
								<Timer className="size-4" />
								You were too slow...
							</>
						) : (
							<>
								<Lock className="size-4" />
								Locked in
							</>
						)
					) : (
						<>
							<LockOpen className="size-4" />
							LOCK IN
						</>
					)}
				</span>
			</Button>
			<Button
				disabled={!(allPlayersLocked && thisPlayer.state !== "ready")}
				className="w-full h-24 text-2xl p-0"
				onClick={() => {
					toast.promise(readyPlayer(game.id, thisPlayer.id), {
						loading: "Readying up...",
						success: "Ready for next round!",
						error: "Failed to ready up",
					});
				}}
			>
				{allPlayersLocked && thisPlayer.state !== "ready" ? (
					"Next round"
				) : isLocked ? (
					<DvdBounce>Waiting for other players...</DvdBounce>
				) : (
					"Lock in your choices first"
				)}
			</Button>
		</div>
	);
}
