import { router } from "../trpc";
import { gameRouter } from "../routers/game";
import { playerRouter } from "../routers/player";
import { polymarketMarketRouter } from "./polymarketMarket";
import { polymarketEventRouter } from "./polymarketEvent";
import { polymarketTagRouter } from "./polymarketTag";
import { polymarketSearchRouter } from "./polymarketSearch";

export const appRouter = router({
	game: gameRouter,
	player: playerRouter,
	polymarketMarket: polymarketMarketRouter,
	polymarketEvent: polymarketEventRouter,
	polymarketTag: polymarketTagRouter,
	polymarketSearch: polymarketSearchRouter,
});

// Export type router type signature,
// NOT the router itself.
export type AppRouter = typeof appRouter;
