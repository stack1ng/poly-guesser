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
import { TypeWrittenText } from "@/components/TypeWrittenText";
import Image from "next/image";
import { maxSelectionSize } from "@/lib/maxSelectionSize";
import { ScoreDelta } from "@/db/schema";
import { submitChoice } from "./lockChoice";
import { ClientGameState } from "@/lib/game/state-types";
import { useCurrentPlayer } from "@/lib/game/useCurrentPlayer";
import { ScoreMark } from "@/components/ui/score-mark";

export function MultiMarketAnswerModal({
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
	const pickCount = useMemo(
		() => Math.min(maxSelectionSize, markets.length),
		[markets.length]
	);

	const [selectedIdsRanked, setSelectedIdsRanked] = useState<string[]>([]);
	const selectId = useCallback((id: string) => {
		setSelectedIdsRanked((prev) => {
			if (prev.includes(id)) {
				return prev.filter((existingId) => existingId !== id);
			} else if (prev.length >= maxSelectionSize) {
				return [...prev.slice(0, maxSelectionSize - 1), id];
			}
			return [...prev, id];
		});
	}, []);

	const thisPlayer = useCurrentPlayer(game);
	if (!thisPlayer) throw new Error("Player not found");

	const submitMultiChoice = useCallback(
		() =>
			thisPlayer &&
			submitChoice(
				game.id,
				game.currentRoundIndex!,
				thisPlayer!.id,
				selectedIdsRanked
			),
		[game.id, game.currentRoundIndex, thisPlayer, selectedIdsRanked]
	);
	useEffect(() => {
		const isLockable = selectedIdsRanked.length === pickCount && !isLocked;
		setLockFn(isLockable ? () => submitMultiChoice : undefined);
	}, [
		isLocked,
		selectedIdsRanked.length,
		submitMultiChoice,
		setLockFn,
		pickCount,
	]);

	return (
		<>
			<h2 className="text-muted-foreground font-mono text-lg">
				Select your top {pickCount} picks
			</h2>
			<div className="grid md:grid-cols-2 gap-2 w-full">
				{markets.slice(0, 4).map((market, i) => (
					<OutcomeButton
						key={market.id}
						market={market}
						isLocked={isLocked}
						displayedDelta={
							allPlayersLocked ? scoreDelta?.[market.id] : undefined
						}
						index={i}
						displayedSolution={
							market.lastTradePrice && allPlayersLocked
								? `${(market.lastTradePrice * 100).toFixed(2)}%`
								: undefined
						}
						selectedIdsRanked={selectedIdsRanked}
						selectId={selectId}
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
				<ScoreMark delta={displayedDelta} animationDelay={index * 0.4} />
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
