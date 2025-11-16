"use client";

import { Logo } from "@/components/logo";
import PolyMarketLogo from "@/components/polymarket-logo";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import Link, { useLinkStatus } from "next/link";
import { useMemo, useState } from "react";

export default function Home() {
	const [gameTopic, setGameTopic] = useState("");

	const newGameHref = useMemo(() => {
		let createUrl = `/game/new`;
		if (gameTopic) createUrl += `?topic=${gameTopic}`;
		return createUrl;
	}, [gameTopic]);

	return (
		<div className="flex flex-col text-5xl text-white gap-4 font-sans">
			<Logo />
			<div className="flex flex-col gap-2">
				<Link href={newGameHref} prefetch={false}>
					<NewGameCard />
				</Link>
				<Input
					id="gameTopic"
					className="font-mono text-foreground focus-visible:ring-0 focus-visible:ring-offset-0 bg-background/50 group-hover:bg-background transition-colors"
					placeholder="(optional) Enter a topic"
					required
					value={gameTopic}
					onChange={(e) => setGameTopic(e.target.value)}
					onClick={(e) => e}
				/>
			</div>
			<Link href="/game/join" prefetch={true}>
				<Card className="grid place-items-center h-24 w-full border-sky-500 border bg-sky-500/50 hover:bg-sky-500 transition-colors hover:text-white">
					Join Game
				</Card>
			</Link>
			<label className="text-foreground font-mono text-sm mx-auto">
				Powered by:
				<Link href="https://polymarket.com" target="_blank">
					<PolyMarketLogo className="h-16 bg-[#2E5CFF] fill-white rounded-lg p-3" />
				</Link>
			</label>
		</div>
	);
}

function NewGameCard() {
	const { pending } = useLinkStatus();

	return (
		<Card
			className={cn(
				"grid place-items-center size-96 border-emerald-500 border bg-emerald-500/50 hover:bg-emerald-500 transition-colors hover:text-white",
				{
					"animate-pulse": pending,
				}
			)}
		>
			New Game!
		</Card>
	);
}
