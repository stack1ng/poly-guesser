import { Button } from "@/components/ui/button";
import { BounceIn } from "@/components/bounce-in";
import { Market } from "polymarket-data";
import {
	SetStateAction,
	Dispatch,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { TypeWrittenText } from "@/components/TypeWrittenText";
import Image from "next/image";
import { ScoreDelta } from "@/db/schema";
import { Slider } from "@/components/ui/slider";
import { submitChoice } from "./lockChoice";
import { ClientGameState } from "@/lib/game/state-types";
import { useCurrentPlayer } from "@/lib/game/useCurrentPlayer";
import { ScoreMark } from "@/components/ui/score-mark";

export function SingleMarketAnswerModal({
	game,
	markets,
	isLocked,
	allPlayersLocked,
	scoreDelta,
	setLockFn,
}: {
	game: ClientGameState;
	markets: Market[];
	isLocked: boolean;
	allPlayersLocked: boolean;
	scoreDelta?: ScoreDelta;
	setLockFn: Dispatch<SetStateAction<(() => Promise<void>) | undefined>>;
}) {
	const [sliderValue, setSliderValue] = useState(0);

	const thisPlayer = useCurrentPlayer(game);
	if (!thisPlayer) throw new Error("Player not found");

	useEffect(() => {
		setLockFn(
			() => () =>
				submitChoice(
					game.id,
					game.currentRoundIndex!,
					thisPlayer!.id,
					sliderValue / 100
				)
		);
	}, [game.currentRoundIndex, game.id, setLockFn, sliderValue, thisPlayer]);

	const market = useMemo(() => markets[0], [markets]);
	const offBy = useMemo(() => {
		return Math.abs((market.lastTradePrice ?? 0) - sliderValue / 100);
	}, [market.lastTradePrice, sliderValue]);

	const thisDelta = useMemo(() => {
		return scoreDelta?.[market.id];
	}, [scoreDelta, market.id]);

	return (
		<>
			<div className="text-center text-8xl font-extrabold font-mono relative">
				{sliderValue}%
				<div className="absolute top-0 left-full text-sm w-36 text-destructive">
					<TypeWrittenText>
						{allPlayersLocked ? `Off by ${Math.round(offBy * 100)}%` : ""}
					</TypeWrittenText>
				</div>
				{thisDelta !== undefined && (
					<ScoreMark delta={thisDelta} className="bottom-0 -right-16" />
				)}
				<div className="absolute -bottom-3 left-0 w-full text-center text-base text-sky-500">
					<TypeWrittenText>
						{allPlayersLocked ? `${market.lastTradePrice?.toFixed(2)}%` : ""}
					</TypeWrittenText>
				</div>
			</div>
			<Slider
				defaultValue={[50]}
				max={100}
				step={1}
				onValueChange={(value) => setSliderValue(value[0])}
				disabled={allPlayersLocked}
			/>
		</>
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

function OutcomeButton({
	market,
	isLocked,
	displayedDelta,
	displayedSolution,
	index,
	selectedIdsRanked,
	selectId,
}: {
	market: Market;
	isLocked: boolean;
	displayedDelta?: number;
	displayedSolution?: string;
	index: number;
	selectedIdsRanked: string[];
	selectId: (id: string) => void;
}) {
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
