"use client";

import { Logo } from "@/components/logo";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Link, { useLinkStatus } from "next/link";

export default function Home() {
	return (
		<div className="flex flex-col text-5xl text-white gap-4">
			<Logo />
			<Link href="/game/new" prefetch={false}>
				<NewGameCard />
			</Link>
			<Link href="/game/join" prefetch={true}>
				<Card className="grid place-items-center h-24 w-full border-sky-500 border bg-sky-500/50 hover:bg-sky-500 transition-colors hover:text-white">
					Join Game
				</Card>
			</Link>
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
