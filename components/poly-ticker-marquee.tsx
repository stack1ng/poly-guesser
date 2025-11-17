import Image from "next/image";
import Marquee from "react-fast-marquee";
import { TickerContent } from "@/lib/ticker-content";
import { useTickerContentFeed } from "@/hooks/useTickerContentFeed";
import { useMemo } from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./ui/hover-card";

type PolyTickerMarqueeProps = {
	initialContent: TickerContent[];
	className?: string;
	speed?: number;
};

export function PolyTickerMarquee({
	initialContent,
	className,
	speed = 40,
}: PolyTickerMarqueeProps) {
	const { contentSnapshot: items } = useTickerContentFeed(initialContent, {
		maxPoolSize: 10,
	});

	const marqueeItems = useMemo(() => {
		if (!items.length) return [];
		const repeats = Math.max(2, Math.ceil(12 / items.length));
		const limitedRepeats = Math.min(repeats, 6);
		return Array.from({ length: limitedRepeats }, (_, repeatIndex) =>
			items.map((item) => ({
				key: `${item.id}-${repeatIndex}`,
				content: item,
			}))
		).flat();
	}, [items]);

	return (
		<div className={className}>
			<Marquee gradient={false} pauseOnHover speed={speed} autoFill>
				{marqueeItems.map(({ key, content }) => (
					<TickerChip key={key} content={content} />
				))}
			</Marquee>
		</div>
	);
}

function TickerChip({ content }: { content: TickerContent }) {
	const tickerImage = (
		<div className="relative h-8 w-8 rounded-full border aspect-square bg-background">
			{content.image ? (
				<Image
					src={content.image}
					alt={content.title}
					fill
					sizes="32px"
					className="object-cover rounded-full"
				/>
			) : (
				<div className="grid h-full w-full place-items-center text-[0.55rem] font-bold">
					{content.displayTitle.slice(0, 3).toUpperCase()}
				</div>
			)}
		</div>
	);

	return (
		<HoverCard>
			<HoverCardTrigger asChild>
				<div className="flex justify-center text-xs font-mono items-center gap-2 w-36 px-2 py-1 border-r border-y">
					{tickerImage}
					<span className="max-w-[14ch] truncate">{content.displayTitle}</span>
				</div>
			</HoverCardTrigger>
			<HoverCardContent className="w-80">
				{tickerImage}
				<div className="flex justify-between gap-4">
					<div className="space-y-1">
						<h4 className="text-sm font-semibold">{content.title}</h4>
						<p className="text-sm">{content.description}</p>
						<div className="text-muted-foreground text-xs">
							Created at {content.createdAt?.toLocaleDateString()}
						</div>
					</div>
				</div>
			</HoverCardContent>
		</HoverCard>
	);
}
