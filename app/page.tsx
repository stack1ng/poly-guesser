import { polymarketData } from "@/lib/polymarketData";
import { mapSeriesToTickerContent } from "@/lib/ticker-content";
import ClientPage from "./client-page";

// refresh every day
export const revalidate = 86400;

export default async function Home() {
	const series = await polymarketData.gamma.series.listSeries({
		limit: 24,
		offset: 0,
	});
	const initialContent = mapSeriesToTickerContent(series);
	return <ClientPage initialContent={initialContent} />;
}
