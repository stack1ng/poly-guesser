import { polymarketData } from "./polymarketData";
import { ScoreDelta } from "@/db/schema";
import { getOpenEventMarkets } from "./getEventMarkets";

export async function calculateScoreDelta(
	slug: string,
	chosenIdsRanked: string[]
): Promise<ScoreDelta> {
	const event = await polymarketData.gamma.events.getEventBySlug(slug);
	if (!event) throw new Error("Event not found: " + slug);

	const markets = getOpenEventMarkets(event);
	if (!markets) throw new Error("Markets not found: " + slug);
	if (markets.length < chosenIdsRanked.length)
		throw new Error("Not enough markets to choose from");

	const descendingRankedMarkets = markets.sort(
		(a, b) => (b.lastTradePrice ?? 0) - (a.lastTradePrice ?? 0)
	);

	const scoreDelta: ScoreDelta = {};
	for (const [index, chosenId] of chosenIdsRanked.entries()) {
		if (descendingRankedMarkets[index].id === chosenId) {
			scoreDelta[chosenId] = 1; // for now just do simple scoring
		} else {
			scoreDelta[chosenId] = 0;
		}
	}

	return scoreDelta;
}
