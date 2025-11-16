import { motion } from "motion/react";

export function BounceIn({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<motion.div
			initial={{ scale: 0.5 }}
			animate={{ scale: 1 }}
			transition={{
				scale: { type: "spring", stiffness: 1000, damping: 35, bounce: 0.35 },
			}}
			className={className}
		>
			{children}
		</motion.div>
	);
}
