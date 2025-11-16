import { ClientGameState } from "@/lib/game/state-types";
import { type Event, type Market } from "polymarket-data";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { use, useEffect, useMemo, useState } from "react";
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from "@/components/ui/hover-card";
import { useRankedSelection } from "./selection-provider";
import { BounceIn } from "@/components/bounce-in";
import { toast } from "sonner";
import { submitChosenRankings } from "./lockChoices";
import { useAuth } from "@/lib/auth/useAuth";
import { useCurrentRound } from "@/lib/game/currentRound";
import { Lock, LockOpen, Timer } from "lucide-react";
import { DvdBounce } from "@/components/dvd-bounce";
import { useCurrentPlayer } from "@/lib/game/useCurrentPlayer";
import { readyPlayer } from "@/lib/game/readyAction";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { shuffleWithSeed } from "@/lib/shuffleWithSeed";
import Link from "next/link";
import { TypeWrittenText } from "@/components/TypeWrittenText";
import { maxSelectionSize } from "@/lib/maxSelectionSize";
import { getOpenEventMarkets } from "@/lib/getEventMarkets";

export function QuestionPage({
	game,
	eventPromise,
}: {
	game: ClientGameState;
	eventPromise: Promise<Event>;
}) {
	console.log("game", game);
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

	const { playerId } = useAuth();

	const { selectedIdsRanked, setSelectedIdsRanked } = useRankedSelection();
	useEffect(() => {
		// clear the selected ids when the round changes
		setSelectedIdsRanked([]);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [game.currentRoundIndex]);

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
			submitChosenRankings(game.id, game.currentRoundIndex!, playerId, []);
		}, endTime.getTime() - Date.now());
		return () => {
			clearTimeout(timeout);
			clearInterval(interval);
		};
		// when polling, we need to have a stable dependency array somehow
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [JSON.stringify(currentRound), game.currentRoundIndex, game.id, playerId]);

	const lockedChoices = useMemo(() => {
		return currentRound?.choices.find((choice) => choice.playerId === playerId);
	}, [currentRound?.choices, playerId]);

	const isLocked = useMemo(() => {
		return lockedChoices !== undefined;
	}, [lockedChoices]);

	const answersTimedOut = useMemo(() => {
		return lockedChoices && Object.keys(lockedChoices?.scoreDelta).length === 0;
	}, [lockedChoices]);

	const allPlayersLocked = useMemo(() => {
		return game.players.every((player) =>
			currentRound?.choices.some((choice) => choice.playerId === player.id)
		);
	}, [game, currentRound?.choices]);

	const pickCount = useMemo(
		() => Math.min(maxSelectionSize, markets.length),
		[markets.length]
	);
	const lockable = useMemo(() => {
		return selectedIdsRanked.length === pickCount && !isLocked;
	}, [isLocked, pickCount, selectedIdsRanked.length]);

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
							className={cn("text-4xl font-bold text-wrap block", {
								"text-blue-500 hover:underline": allPlayersLocked,
							})}
						>
							{allPlayersLocked ? (
								<Link
									href={`https://polymarket.com/event/${event.slug}`}
									target="_blank"
									rel="noopener noreferrer"
								>
									{event.title}
								</Link>
							) : (
								event.title
							)}
						</h1>
						<h2 className="text-muted-foreground font-mono text-lg">
							Select your top {pickCount} picks
						</h2>
					</HoverCardTrigger>
					<HoverCardContent className="w-96">
						<p className="font-mono text-xs">{event.description}</p>
					</HoverCardContent>
				</HoverCard>
			</div>
			<div className="grid md:grid-cols-2 gap-2 w-full">
				{markets.slice(0, 4).map((market, i) => (
					<OutcomeButton
						key={market.id}
						market={market}
						isLocked={isLocked}
						displayedDelta={
							allPlayersLocked
								? lockedChoices?.scoreDelta?.[market.id]
								: undefined
						}
						index={i}
						displayedSolution={
							market.lastTradePrice && allPlayersLocked
								? `${(market.lastTradePrice * 100).toFixed(2)}%`
								: undefined
						}
					/>
				))}
			</div>
			<Button
				className="w-full bg-destructive/50 hover:bg-destructive border border-destructive"
				onClick={() => setSelectedIdsRanked([])}
				disabled={selectedIdsRanked.length === 0 || isLocked}
			>
				Reset
			</Button>
			<Button
				className={cn(
					"group relative w-full h-24 text-2xl border border-sky-500 overflow-hidden transition-colors",
					{
						"bg-destructive/50 border-destructive": answersTimedOut,
					}
				)}
				onClick={() =>
					toast.promise(
						submitChosenRankings(
							game.id,
							game.currentRoundIndex!,
							playerId,
							selectedIdsRanked
						),
						{
							loading: "Locking in choices...",
							success: "Choices locked in!",
							error: "Failed to lock in choices",
						}
					)
				}
				disabled={!lockable}
			>
				<div
					className="absolute inset-y-0 left-0 bg-sky-500/50 group-hover:bg-sky-500 transition-[width] duration-1000"
					style={{ width: `${Math.max(0, Math.min(1, percentLeft)) * 100}%` }}
				/>
				<span
					className={cn("relative z-10 flex items-center gap-2", {
						"animate-bounce": lockable,
					})}
				>
					{lockedChoices ? (
						answersTimedOut ? (
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

const randomRotationRange = 25;
function ordinal(n: number) {
	const pr = new Intl.PluralRules("en", { type: "ordinal" });
	const suffixes: Record<Intl.LDMLPluralRule, string> = {
		zero: "th",
		one: "st",
		two: "nd",
		few: "rd",
		many: "th",
		other: "th",
	};
	return `${n}${suffixes[pr.select(n)]}`;
}

export function OutcomeButton({
	market,
	isLocked,
	displayedDelta,
	displayedSolution,
	index,
}: {
	market: Market;
	isLocked: boolean;
	displayedDelta?: number;
	displayedSolution?: string;
	index: number;
}) {
	const { selectId, selectedIdsRanked } = useRankedSelection();
	const selectionRank = useMemo(
		() => selectedIdsRanked.indexOf(market.id),
		[market.id, selectedIdsRanked]
	);

	const randomRotation = useMemo(
		// eslint-disable-next-line react-hooks/purity
		() => Math.random() * randomRotationRange - randomRotationRange / 2,
		[]
	);

	const scoreRotation = 5;

	return (
		<Button
			variant="outline"
			className="font-mono h-36 flex items-center text-xl justify-start relative disabled:opacity-100"
			onClick={() => selectId(market.id)}
			disabled={isLocked}
		>
			{selectionRank !== -1 && (
				<div
					className="absolute top-4 right-4"
					style={{ transform: `rotate(${randomRotation}deg)` }}
				>
					<BounceIn className="text-4xl">{ordinal(selectionRank + 1)}</BounceIn>
				</div>
			)}
			{displayedDelta !== undefined && (
				<motion.div
					initial={{ opacity: 0, scale: 5, rotate: scoreRotation + 90 }}
					animate={{ opacity: 1, scale: 1, rotate: scoreRotation }}
					transition={{
						delay: index * 0.4,
						duration: 0.2,
					}}
					className={cn(
						"absolute bottom-4 right-4 text-6xl font-extrabold text-muted-foreground",
						{
							"text-green-500": displayedDelta > 0,
							"text-red-500": displayedDelta < 0,
						}
					)}
				>
					{displayedDelta > 0 ? "+" : ""}
					{displayedDelta}
				</motion.div>
			)}
			<div className="absolute bottom-3 left-0 w-full text-center text-base text-sky-500">
				<TypeWrittenText>{displayedSolution ?? ""}</TypeWrittenText>
			</div>
			<Image
				className="rounded-md"
				draggable={false}
				src={market.image ?? ""}
				alt={market.question ?? ""}
				width={75}
				height={75}
			/>
			{market.groupItemTitle ?? market.question}
		</Button>
	);
}
