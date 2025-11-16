import { polymarketData } from "@/lib/polymarketData";
import { publicProcedure, router } from "../trpc";
import { listMarketsParamsSchema } from "polymarket-data/dist/modules/gamma/schemas";

export const polymarketMarketRouter = router({
	listMarkets: publicProcedure
		.input(listMarketsParamsSchema)
		.query((p) => polymarketData.gamma.markets.listMarkets(p.input)),
});
