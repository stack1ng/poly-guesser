import { memo, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { BounceIn } from "../bounce-in";
import { createPortal } from "react-dom";

export const ReadySetGo = memo(function ReadySetGo({
	targetTime,
	children,
}: {
	targetTime: Date;
	children: React.ReactNode;
}) {
	const durationUntilTarget = useMemo(
		() => targetTime.getTime() - new Date().getTime(),
		[targetTime]
	);

	const [overlay, setOverlay] = useState<ReactNode>(
		durationUntilTarget > 0 ? (
			<BounceIn key="ready" className="text-6xl">
				Ready
			</BounceIn>
		) : undefined
	);

	const hasPlayed = useRef(false);
	useEffect(() => {
		if (hasPlayed.current) return;
		hasPlayed.current = true;

		if (durationUntilTarget > 0) {
			const t1 = setTimeout(() => {
				setOverlay(
					<BounceIn key="set" className="text-6xl">
						Set
					</BounceIn>
				);
			}, durationUntilTarget * (1 / 3));
			const t2 = setTimeout(() => {
				setOverlay(
					<BounceIn key="go" className="text-6xl text-red-500 animate-alarm">
						Go!!
					</BounceIn>
				);
			}, durationUntilTarget * (2 / 3));
			const t3 = setTimeout(() => {
				setOverlay(undefined);
			}, durationUntilTarget);

			// since this only plays once, we don't need to clean up
			// return () => {
			// 	clearTimeout(t1);
			// 	clearTimeout(t2);
			// 	clearTimeout(t3);
			// };
		} else {
			setOverlay(undefined);
		}
	}, [children, durationUntilTarget, targetTime]);

	return (
		<div className="relative">
			{children}
			{overlay &&
				createPortal(
					<div className="absolute inset-0 grid place-items-center size-full bg-background">
						{overlay}
					</div>,
					document.body
				)}
		</div>
	);
});
