"use client";

import { Logo } from "@/components/logo";
import PolyMarketLogo from "@/components/polymarket-logo";
import { PolyTickerBackground } from "@/components/poly-ticker-background";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import Link, { useLinkStatus } from "next/link";
import { useMemo, useState } from "react";
import { PolyTickerMarquee } from "@/components/poly-ticker-marquee";
import { TickerContent } from "@/lib/ticker-content";

export default function Home({
	initialContent,
}: {
	initialContent: TickerContent[];
}) {
	const [gameTopic, setGameTopic] = useState("");

	const newGameHref = useMemo(() => {
		let createUrl = `/game/new`;
		if (gameTopic) createUrl += `?topic=${gameTopic}`;
		return createUrl;
	}, [gameTopic]);

	return (
		<div className="w-screen h-screen grid place-items-center">
			<PolyTickerBackground
				initialContent={initialContent}
				className="absolute inset-0 hidden md:block"
			/>
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
					<Link href={newGameHref} prefetch={false}>
						<NewGameCard />
					</Link>
					<Link className="w-full" href="/game/join" prefetch={true}>
						<Card className="grid place-items-center h-24 w-full border-sky-500 border bg-sky-500/50 hover:bg-sky-500 transition-colors hover:text-white">
							Join Game
						</Card>
					</Link>
					<label className="text-foreground font-mono text-sm">
						Powered by:
						<Link href="https://polymarket.com" target="_blank">
							<PolyMarketLogo className="h-16 bg-[#2E5CFF] fill-white rounded-lg p-3" />
						</Link>
					</label>
				</div>
			</div>
		</div>
	);
}

function NewGameCard() {
	const { pending } = useLinkStatus();

	return (
		<Card
			className={cn(
				"grid place-items-center aspect-square border-emerald-500 border bg-emerald-500/50 hover:bg-emerald-500 transition-colors hover:text-white",
				"[animation-delay:-0.5s]",
				{
					"animate-bounce": pending,
				}
			)}
		>
			New Game!
		</Card>
	);
}
