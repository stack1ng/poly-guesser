import { cn } from "@/lib/utils";
import { memo, useMemo, useState, useEffect, useRef } from "react";
import { useInView } from "react-intersection-observer";

export const TypeWrittenText = memo(function TypeWrittenText({
	keypressDelay = () => 28 + Math.random() * 40,
	children,
	isVisibleOverride,
}: {
	keypressDelay?: () => number;
	children: string | string[];
	isVisibleOverride?: boolean;
}) {
	const { ref, inView } = useInView();

	const targetText = useMemo(
		() => (Array.isArray(children) ? children.join("") : children),
		[children]
	);

	const typeWrittenText = useTypeWriteredState(
		targetText,
		isVisibleOverride ?? inView,
		keypressDelay
	);
	const needsEmptyPlaceholder = typeWrittenText.length === 0;

	return (
		<span
			ref={ref}
			className={cn({
				invisible: needsEmptyPlaceholder,
			})}
		>
			{needsEmptyPlaceholder ? "_" : typeWrittenText}
		</span>
	);
});
function useTypeWriteredState(
	targetValue: string,
	isVisible: boolean,
	keypressDelay = () => 28 + (Math.random() - 0.5) * 12
) {
	const [value, setValue] = useState(targetValue);

	const nextTypeTime = useRef<Date>(null);
	useEffect(() => {
		if (!isVisible) {
			setValue(targetValue);
			return;
		}

		nextTypeTime.current ??= new Date(Date.now() + keypressDelay());

		const nextType = setTimeout(() => {
			nextTypeTime.current = null;

			let accuratePrefix = "";
			for (let i = 0; i < value.length; i++) {
				if (value[i] !== targetValue[i]) break;
				accuratePrefix += value[i];
			}

			if (value.length > accuratePrefix.length) {
				// backspace
				// console.log("backspace", value, targetValue);
				setValue(value.slice(0, -1));
				return;
			}

			if (targetValue.length === accuratePrefix.length) return;

			// some character key
			const char = targetValue[accuratePrefix.length];
			// console.log("type", char, value, accuratePrefix);
			setValue(value + char);
		}, nextTypeTime.current.getTime() - Date.now());

		return () => clearTimeout(nextType);
	}, [targetValue, value, keypressDelay, isVisible]);

	return value;
}
