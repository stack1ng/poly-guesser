import { motion } from "motion/react";
import { cn } from "@/lib/utils";

const scoreRotation = 5;
export function ScoreMark({
	delta,
	animationDelay = 0,
	className,
}: {
	delta: number;
	animationDelay?: number;
	className?: string;
}) {
	return (
		<motion.div
			initial={{ opacity: 0, scale: 5, rotate: scoreRotation + 90 }}
			animate={{ opacity: 1, scale: 1, rotate: scoreRotation }}
			transition={{
				delay: animationDelay,
				duration: 0.2,
			}}
			className={cn(
				"absolute bottom-4 right-4 text-6xl font-extrabold text-muted-foreground",
				{
					"text-green-500": delta > 0,
					"text-red-500": delta < 0,
				},
				className
			)}
		>
			{delta > 0 ? "+" : ""}
			{delta}
		</motion.div>
	);
}
