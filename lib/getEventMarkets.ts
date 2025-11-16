import { Event, Market } from "polymarket-data";

export function getOpenEventMarkets(event: Event) {
	const markets = event.markets as Market[];
	if (!markets) throw new Error("Markets not found: " + event.slug);
	return markets.filter((market) => market.closed === false);
}
