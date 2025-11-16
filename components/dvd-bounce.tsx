import React, { useEffect, useRef } from "react";

type Velocity = { vx: number; vy: number };

export function DvdBounce({
	children,
	velocity,
}: {
	children: React.ReactNode;
	velocity?: Velocity;
}) {
	const containerRef = useRef<HTMLDivElement>(null);
	const innerRef = useRef<HTMLDivElement>(null);

	// Position and velocity refs so we can animate without React state
	const positionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
	const velocityRef = useRef<Velocity>(velocity ?? { vx: 40, vy: 40 }); // px/sec
	const boundsRef = useRef<{ maxX: number; maxY: number }>({
		maxX: 0,
		maxY: 0,
	});
	const rafRef = useRef<number | null>(null);

	useEffect(() => {
		const containerEl = containerRef.current;
		const innerEl = innerRef.current;
		if (!containerEl || !innerEl) return;

		// Measure available travel area for the inner element
		const measureBounds = () => {
			// Use fractional sizes to avoid rounding buffers
			const containerRect = containerEl.getBoundingClientRect();
			const innerRect = innerEl.getBoundingClientRect();
			const containerWidth = containerRect.width;
			const containerHeight = containerRect.height;
			const innerWidth = innerRect.width;
			const innerHeight = innerRect.height;
			boundsRef.current.maxX = Math.max(0, containerWidth - innerWidth);
			boundsRef.current.maxY = Math.max(0, containerHeight - innerHeight);

			// If current position is out of bounds after resize, clamp it
			positionRef.current.x = Math.min(
				positionRef.current.x,
				boundsRef.current.maxX
			);
			positionRef.current.y = Math.min(
				positionRef.current.y,
				boundsRef.current.maxY
			);
			innerEl.style.transform = `translate3d(${positionRef.current.x}px, ${positionRef.current.y}px, 0)`;
		};

		// Initialize position somewhere within bounds (randomized for fun)
		measureBounds();
		positionRef.current = {
			x: Math.random() * (boundsRef.current.maxX || 0),
			y: Math.random() * (boundsRef.current.maxY || 0),
		};
		innerEl.style.transform = `translate3d(${positionRef.current.x}px, ${positionRef.current.y}px, 0)`;

		let lastTs = performance.now();
		const tick = (ts: number) => {
			const dtMs = ts - lastTs;
			lastTs = ts;
			// Cap dt in case of tab throttling
			const dt = Math.min(dtMs, 32) / 1000; // seconds

			let { x, y } = positionRef.current;
			let { vx, vy } = velocityRef.current;
			const { maxX, maxY } = boundsRef.current;

			x += vx * dt;
			y += vy * dt;

			// Bounce on X edges
			if (x <= 0) {
				x = 0;
				vx = Math.abs(vx);
			} else if (x >= maxX) {
				x = maxX;
				vx = -Math.abs(vx);
			}

			// Bounce on Y edges
			if (y <= 0) {
				y = 0;
				vy = Math.abs(vy);
			} else if (y >= maxY) {
				y = maxY;
				vy = -Math.abs(vy);
			}

			positionRef.current = { x, y };
			velocityRef.current = { vx, vy };
			innerEl.style.transform = `translate3d(${x}px, ${y}px, 0)`;

			rafRef.current = requestAnimationFrame(tick);
		};

		rafRef.current = requestAnimationFrame(tick);

		// Resize observers to keep bounds accurate
		const resizeObserver = new ResizeObserver(() => {
			measureBounds();
		});
		resizeObserver.observe(containerEl);
		resizeObserver.observe(innerEl);

		const onWindowResize = () => measureBounds();
		window.addEventListener("resize", onWindowResize);

		return () => {
			if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
			resizeObserver.disconnect();
			window.removeEventListener("resize", onWindowResize);
		};
	}, []);

	return (
		<div
			ref={containerRef}
			className="relative overflow-hidden w-full h-full leading-none"
		>
			<div
				ref={innerRef}
				className="absolute left-0 top-0 will-change-transform inline-block w-fit h-fit align-top leading-0 origin-top-left"
			>
				{children}
			</div>
		</div>
	);
}
