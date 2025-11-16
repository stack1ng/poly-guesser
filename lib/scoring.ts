import { polymarketData } from "./polymarketData";
import { ScoreDelta } from "@/db/schema";
import { getOpenEventMarkets } from "./getEventMarkets";
import { SubmitChoiceEvent } from "./game/gameSync";
import { Market } from "polymarket-data";

export async function calculateScoreDelta(
	slug: string,
	choice: SubmitChoiceEvent["choice"]
): Promise<ScoreDelta> {
	const event = await polymarketData.gamma.events.getEventBySlug(slug);
	if (!event) throw new Error("Event not found: " + slug);

	const markets = getOpenEventMarkets(event);
	if (!markets) throw new Error("Markets not found: " + slug);

	if (typeof choice === "number") {
		return calculateScoreProbEstimate(markets, choice);
	}
	return calculateScoreDeltaFromRankings(markets, choice);
}

function calculateScoreDeltaFromRankings(
	markets: Market[],
	chosenIdsRanked: string[]
): ScoreDelta {
	if (markets.length < chosenIdsRanked.length)
		throw new Error("Not enough markets to choose from");

	const descendingRankedMarkets = markets
		.sort((a, b) => (b.lastTradePrice ?? 0) - (a.lastTradePrice ?? 0))
		.slice(0, chosenIdsRanked.length);

	const scoreDelta: ScoreDelta = {};
	for (const [index, chosenId] of chosenIdsRanked.entries()) {
		if (descendingRankedMarkets[index].id === chosenId) {
			scoreDelta[chosenId] = 1; // 1 point for an exact match
		} else if (
			descendingRankedMarkets.some((market) => market.id === chosenId)
		) {
			scoreDelta[chosenId] = 0.5; // 0.5 points for a partial match
		} else {
			scoreDelta[chosenId] = 0; // 0 points for no match
		}
	}

	return scoreDelta;
}

const fullScoreThreshold = 0.2;
const halfScoreThreshold = 0.4;
function calculateScoreProbEstimate(
	markets: Market[],
	choice: number
): ScoreDelta {
	if (markets.length !== 1)
		throw new Error("Expected 1 market, got " + markets.length);

	const market = markets[0];

	const distance = Math.abs((market.lastTradePrice ?? 0) - choice);
	if (distance <= fullScoreThreshold) return { [market.id]: 1 };
	else if (distance <= halfScoreThreshold) return { [market.id]: 0.5 };

	return { [market.id]: 0 };
}
