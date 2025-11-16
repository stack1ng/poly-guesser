import { Button } from "@/components/ui/button";
import { ClientGameState } from "@/lib/game/state-types";
import { readyPlayer } from "@/lib/game/readyAction";
import { toast } from "sonner";
import Link from "next/link";
import { DvdBounce } from "@/components/dvd-bounce";
import { useCurrentPlayer } from "@/lib/game/useCurrentPlayer";
import { redirect } from "next/navigation";
import QRCode from "react-qr-code";

export function Lobby({ game }: { game: ClientGameState }) {
	const thisPlayer = useCurrentPlayer(game);
	if (!thisPlayer) {
		if (game.phase === "joinable") {
			return redirect(`/game/join?gameId=${game.id}`);
		}
		// todo: add spectator mode?
		return <div>Game is not joinable</div>;
	}

	return (
		<div className="text-5xl grid gap-4 place-items-center">
			<p className="text-lg">Scan this to join!</p>
			<QRCode
				value={`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}/game/join?gameId=${game.id}`}
				title="Join this PolyGuesser game"
			/>
			{game.players.length} players in game
			<Button
				className="text-5xl h-36 p-0 w-full font-sans"
				onClick={
					thisPlayer?.state !== "ready"
						? () =>
								toast.promise(readyPlayer(game.id, thisPlayer.id), {
									loading: "Readying up...",
									success: "Ready to play!",
									error: "Failed to ready up",
								})
						: undefined
				}
				disabled={thisPlayer?.state === "ready"}
			>
				{thisPlayer ? (
					thisPlayer.state === "ready" ? (
						<DvdBounce>
							<span className="text-2xl">Waiting for other players</span>
						</DvdBounce>
					) : (
						"Ready up"
					)
				) : (
					<Link
						href={`/game/join?gameId=${game.id}`}
						className="size-full grid place-items-center font-sans"
					>
						Join game
					</Link>
				)}
			</Button>
		</div>
	);
}
