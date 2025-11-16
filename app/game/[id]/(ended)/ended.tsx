import { ClientGameState } from "@/lib/game/state-types";
import { Leaderboard } from "../(leaderboard)/leaderboardLayout";

export function Ended({ game }: { game: ClientGameState }) {
	return (
		<div>
			<h1 className="text-6xl font-bold">Game Over!</h1>
			<p>Thank you for playing!</p>
			<Leaderboard game={game} />
		</div>
	);
}
