import { Logo } from "@/components/logo";
import PolyMarketLogo from "@/components/polymarket-logo";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Link } from "@/components/ui/link";
import { PolyTickerMarquee } from "@/components/poly-ticker-marquee";
import { mapSeriesToTickerContent } from "@/lib/ticker-content";
import { polymarketData } from "@/lib/polymarketData";
import { polymarketUrl } from "@/lib/polymarketUrl";

// refresh every day
export const revalidate = 86400;

export default async function Home() {
	const series = await polymarketData.gamma.series.listSeries({
		limit: 24,
		offset: 0,
	});
	const initialContent = mapSeriesToTickerContent(series);

	return (
		<div className="w-screen h-screen grid place-items-center">
			<div className="w-full md:w-96 flex flex-col text-5xl gap-4 font-sans z-10 bg-background h-full items-center justify-center md:drop-shadow-lg">
				<PolyTickerMarquee
					className="w-screen md:w-96 bg-accent"
					initialContent={initialContent}
				/>
				<Logo className="max-w-96" />
				<p className="text-foreground font-mono text-sm text-center px-4">
					PolyGuessr is a fun trivia game where you and your friends go head to
					head in predicting current events!
				</p>
				<div className="flex flex-col gap-4 px-4 max-w-96 items-center">
					<Link href="/game/new" prefetch>
						<Card
							className={cn(
								"grid place-items-center aspect-square border-emerald-500 border bg-emerald-500/50 hover:bg-emerald-500 transition-colors hover:text-white"
							)}
						>
							New Game!
						</Card>
					</Link>
					<Link className="w-full" href="/game/join" prefetch>
						<Card className="grid place-items-center h-24 w-full border-sky-500 border bg-sky-500/50 hover:bg-sky-500 transition-colors hover:text-white">
							Join Game
						</Card>
					</Link>
					<label className="text-foreground font-mono text-sm">
						Powered by:
						<Link href={polymarketUrl("/")} target="_blank">
							<PolyMarketLogo className="h-16 bg-[#2E5CFF] fill-white rounded-lg p-3" />
						</Link>
					</label>
				</div>
			</div>
		</div>
	);
}
