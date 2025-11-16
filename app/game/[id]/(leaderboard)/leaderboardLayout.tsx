import { TypeWrittenText } from "@/components/TypeWrittenText";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/lib/auth/useAuth";
import { useCurrentRound } from "@/lib/game/currentRound";
import { ClientGameState } from "@/lib/game/state-types";
import { useSpecificPlayer } from "@/lib/game/useCurrentPlayer";
import { getPlayerScore, usePlayerScore } from "@/lib/game/usePlayerScore";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { CircleCheck } from "lucide-react";
import { useMemo } from "react";

export default function LeaderboardLayout({
	game,
	children,
}: {
	game: ClientGameState;
	children: React.ReactNode;
}) {
	return (
		<div className="relative size-full grid place-items-center">
			<Leaderboard
				game={game}
				className="absolute top-0 right-0 w-56 border m-4 divide-y rounded-lg"
			/>
			{children}
		</div>
	);
}

function Leaderboard({
	game,
	className,
}: {
	game: ClientGameState;
	className?: string;
}) {
	return (
		<ul className={className}>
			{game.currentRoundIndex !== null && (
				<div className="text-center text-3xl">
					{game.phase === "in_play"
						? `Round: ${game.currentRoundIndex + 1}/${game.rounds.length}`
						: "Results"}
				</div>
			)}

			{game.players
				.sort((a, b) => getPlayerScore(game, b.id) - getPlayerScore(game, a.id))
				.map((player, i) => (
					<li key={player.id}>
						<PlayerLeaderboardRow
							key={player.id}
							game={game}
							player={player}
							rank={i + 1}
						/>
					</li>
				))}
		</ul>
	);
}

function PlayerLeaderboardRow({
	game,
	player,
	rank,
}: {
	game: ClientGameState;
	player: ClientGameState["players"][number];
	rank: number;
}) {
	const trpc = useTRPC();
	const {
		data: name,
		isLoading: isLoadingName,
		error: errorName,
	} = useQuery(trpc.player.getName.queryOptions({ playerId: player.id }));

	const totalScore = usePlayerScore(game, player.id);

	const playerState = useSpecificPlayer(game, player.id);
	if (!playerState) throw new Error(`Player ${player.id} not found`);

	const { playerId: thisPlayerId } = useAuth();

	const currentRound = useCurrentRound(game);

	const stateIcon = useMemo(() => {
		switch (game.phase) {
			case "ended":
				switch (rank) {
					case 1:
						return "🥇";
					case 2:
						return "🥈";
					case 3:
						return "🥉";
					default:
						return "😬";
				}
			case "in_play":
				if (
					playerState.state === "not_ready" &&
					currentRound?.choices.some((choice) => choice.playerId === player.id)
				)
					return "🔒";

			default:
				return playerState.state === "ready" ? (
					"✅"
				) : (
					<LoadingSpinner className="size-4 text-muted-foreground" />
				);
		}
	}, [game.phase, rank, playerState.state, currentRound?.choices, player.id]);

	return (
		<div className="flex gap-2 font-mono justify-between items-center px-4 py-2">
			<div className="flex gap-2 items-center">
				{stateIcon}
				<h1
					className={cn("text-xl font-bold", {
						"text-sky-500": player.id === thisPlayerId,
					})}
				>
					<TypeWrittenText>
						{isLoadingName
							? "Loading..."
							: errorName
							? "Error loading name"
							: player.id === thisPlayerId
							? "You"
							: name ?? ""}
					</TypeWrittenText>
				</h1>
			</div>
			<p
				className={cn("text-sm text-muted-foreground", {
					"text-green-500": totalScore > 0,
				})}
			>
				{totalScore}
			</p>
		</div>
	);
}
