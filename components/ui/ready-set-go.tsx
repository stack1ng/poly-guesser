import { memo, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { BounceIn } from "../bounce-in";

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

	const [displayContent, setDisplayContent] = useState<ReactNode>(
		durationUntilTarget > 0 ? (
			<BounceIn key="ready" className="text-6xl">
				Ready
			</BounceIn>
		) : (
			children
		)
	);

	const hasPlayed = useRef(false);
	useEffect(() => {
		if (hasPlayed.current) return;
		hasPlayed.current = true;

		if (durationUntilTarget > 0) {
			const t1 = setTimeout(() => {
				setDisplayContent(
					<BounceIn key="set" className="text-6xl">
						Set
					</BounceIn>
				);
			}, durationUntilTarget * (1 / 3));
			const t2 = setTimeout(() => {
				setDisplayContent(
					<BounceIn key="go" className="text-6xl text-red-500 animate-alarm">
						Go!!
					</BounceIn>
				);
			}, durationUntilTarget * (2 / 3));
			const t3 = setTimeout(() => {
				setDisplayContent(children);
			}, durationUntilTarget);

			// since this only plays once, we don't need to clean up
			// return () => {
			// 	clearTimeout(t1);
			// 	clearTimeout(t2);
			// 	clearTimeout(t3);
			// };
		} else {
			setDisplayContent(children);
		}
	}, [children, durationUntilTarget, targetTime]);

	return (
		<div className="grid place-items-center size-full">{displayContent}</div>
	);
});
