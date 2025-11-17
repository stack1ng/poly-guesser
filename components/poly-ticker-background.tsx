"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import {
	useCallback,
	useEffect,
	useRef,
	useState,
	type RefObject,
} from "react";
import { useTickerContentFeed } from "@/hooks/useTickerContentFeed";
import { TickerContent } from "@/lib/ticker-content";

type TrailPoint = { x: number; y: number; time: number };

type Size = { width: number; height: number };

type Ticker = {
	id: number;
	spawnKey: number;
	x: number;
	y: number;
	vx: number;
	vy: number;
	width: number;
	height: number;
	accent: string;
	displayTitle: string;
	fullTitle: string;
	image?: string | null;
	tail: TrailPoint[];
	jitterOffset: number;
	jitterVelocity: number;
	physics: TickerPhysics;
};

type TickerPhysics = {
	gravity: number;
	restitution: number;
	jitterMagnitude: number;
	jitterResponsiveness: number;
};

type TickerView = {
	id: number;
	spawnKey: number;
	x: number;
	y: number;
	width: number;
	height: number;
	title: string;
	fullTitle: string;
	image?: string | null;
	accent: string;
};

const GRAVITY = 900; // px / s^2
const FLOOR_PADDING = 0;
const BOUNCE_RESTITUTION = 0.72;
const TRAIL_DURATION_MS = 1100;
const JITTER_MAGNITUDE = 14;
const JITTER_RESPONSIVENESS = 6;
const MAX_JITTER_VELOCITY = 45;
const LABEL_TRANSITION = {
	type: "spring" as const,
	mass: 0.6,
	damping: 22,
	stiffness: 1000,
};
const TICKER_HEIGHT = 54;
const MIN_TICKER_WIDTH = 200;
const MAX_TICKER_WIDTH = 420;
const WIDTH_PER_CHAR = 6;
const INITIAL_SPAWN_DELAY_MS = 250;
const SPAWN_INTERVAL_MIN_MS = 1000;
const SPAWN_INTERVAL_MAX_MS = 2000;
const BOUNCE_MAGNITUDE_MIN = 0.55;
const BOUNCE_MAGNITUDE_MAX = 1.1;
const BOUNCE_NEGATIVE_PROBABILITY = 0.35;
const NEGATIVE_BOUNCE_BONUS = 1.08;

interface PolyTickerBackgroundProps {
	className?: string;
	tickerCount?: number;
}

export function PolyTickerBackground({
	className,
	tickerCount = 10,
}: PolyTickerBackgroundProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
	const tickersRef = useRef<Ticker[]>([]);
	const sizeRef = useRef<Size>({ width: 0, height: 0 });
	const nextTickerIdRef = useRef(0);
	const spawnScheduleRef = useRef<{ nextSpawnAt: number | null }>({
		nextSpawnAt: null,
	});
	const rafRef = useRef<number | null>(null);
	const lastViewUpdateRef = useRef(0);
	const [tickerViews, setTickerViews] = useState<TickerView[]>([]);

	const {
		getNextContent,
		ensureContentBuffer,
		resetDisplayed,
		hasBufferedContent,
		feedVersion,
	} = useTickerContentFeed();

	const spawnTicker = useCallback((content: TickerContent | null) => {
		if (!content) return false;
		const size = sizeRef.current;
		if (size.width === 0 || size.height === 0) return false;
		const ticker = createTicker(nextTickerIdRef.current++, size, content);
		tickersRef.current.push(ticker);
		return true;
	}, []);

	const maybeSpawnTickers = useCallback(
		(ts: number) => {
			const scheduler = spawnScheduleRef.current;
			if (scheduler.nextSpawnAt === null) {
				scheduler.nextSpawnAt = ts + INITIAL_SPAWN_DELAY_MS;
			}

			let spawnedThisFrame = false;
			while (
				tickersRef.current.length < tickerCount &&
				scheduler.nextSpawnAt !== null &&
				ts >= scheduler.nextSpawnAt
			) {
				const content = getNextContent();
				if (!content) {
					ensureContentBuffer();
					scheduler.nextSpawnAt = null;
					break;
				}

				const created = spawnTicker(content);
				if (!created) {
					scheduler.nextSpawnAt = null;
					break;
				}

				spawnedThisFrame = true;
				scheduler.nextSpawnAt =
					ts + randomInRange(SPAWN_INTERVAL_MIN_MS, SPAWN_INTERVAL_MAX_MS);
				ensureContentBuffer();
			}

			const bufferAvailable = hasBufferedContent();
			if (
				tickersRef.current.length < tickerCount &&
				!spawnedThisFrame &&
				scheduler.nextSpawnAt === null &&
				bufferAvailable
			) {
				const delay = bufferAvailable
					? randomInRange(SPAWN_INTERVAL_MIN_MS, SPAWN_INTERVAL_MAX_MS)
					: INITIAL_SPAWN_DELAY_MS;
				scheduler.nextSpawnAt = ts + delay;
			}
		},
		[
			ensureContentBuffer,
			getNextContent,
			hasBufferedContent,
			spawnTicker,
			tickerCount,
		]
	);

	useEffect(() => {
		const container = containerRef.current;
		const canvas = canvasRef.current;
		if (!container || !canvas) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		ctxRef.current = ctx;

		const resetTickers = () => {
			tickersRef.current = [];
			setTickerViews([]);
			nextTickerIdRef.current = 0;
			spawnScheduleRef.current.nextSpawnAt = null;
		};

		const sizeCanvas = () => {
			const rect = container.getBoundingClientRect();
			const width = rect.width;
			const height = rect.height;
			if (width === 0 || height === 0) return;

			sizeRef.current = { width, height };
			const dpr = window.devicePixelRatio || 1;
			canvas.width = Math.floor(width * dpr);
			canvas.height = Math.floor(height * dpr);
			ctx.setTransform(1, 0, 0, 1, 0, 0);
			ctx.scale(dpr, dpr);

			resetTickers();
		};

		sizeCanvas();

		const resizeObserver = new ResizeObserver(() => {
			sizeCanvas();
		});
		resizeObserver.observe(container);

		let lastTs = performance.now();

		const animate = (ts: number) => {
			const ctx = ctxRef.current;
			if (!ctx) return;
			const dt = Math.min(ts - lastTs, 32);
			lastTs = ts;
			const size = sizeRef.current;
			if (size.width === 0 || size.height === 0) {
				rafRef.current = requestAnimationFrame(animate);
				return;
			}

			tickersRef.current = updateTickers(
				tickersRef.current,
				dt / 1000,
				size,
				ts
			);
			maybeSpawnTickers(ts);
			drawScene(ctx, tickersRef.current, size);

			if (ts - lastViewUpdateRef.current >= 32) {
				setTickerViews(tickersRef.current.map(toTickerView));
				lastViewUpdateRef.current = ts;
			}

			rafRef.current = requestAnimationFrame(animate);
		};

		rafRef.current = requestAnimationFrame(animate);

		return () => {
			if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
			resizeObserver.disconnect();
		};
	}, [maybeSpawnTickers, tickerCount]);

	useEffect(() => {
		ensureContentBuffer();
	}, [ensureContentBuffer]);

	useEffect(() => {
		if (!feedVersion) return;
		resetDisplayed();
		if (!tickersRef.current.length) return;
		const size = sizeRef.current;
		if (size.width === 0 || size.height === 0) return;

		for (const ticker of tickersRef.current) {
			const content = getNextContent();
			if (!content) break;
			applyContentToTicker(ticker, content);
		}
		setTickerViews(tickersRef.current.map(toTickerView));
	}, [feedVersion, getNextContent, resetDisplayed]);

	return (
		<div
			ref={containerRef}
			className={cn(
				"pointer-events-none absolute inset-0 overflow-hidden",
				className
			)}
		>
			<canvas ref={canvasRef} className="h-full w-full" />
			<div className="pointer-events-none absolute inset-0">
				{tickerViews.map((ticker) => (
					<TickerBadge
						key={`${ticker.id}-${ticker.spawnKey}`}
						canvasRef={canvasRef}
						view={ticker}
					/>
				))}
			</div>
		</div>
	);
}

type TickerBadgeProps = {
	canvasRef: RefObject<HTMLCanvasElement | null>;
	view: TickerView;
};

function TickerBadge({ canvasRef, view }: TickerBadgeProps) {
	const [canvasReady, setCanvasReady] = useState(false);

	useEffect(() => {
		setCanvasReady(canvasRef.current !== null);
	}, [canvasRef]);

	return (
		<motion.div
			aria-hidden
			data-canvas-ready={canvasReady}
			className="pointer-events-none absolute -translate-y-1/2 rounded-full border bg-slate-950/70 text-white/80"
			initial={false}
			animate={{
				x: view.x,
				y: view.y,
			}}
			transition={LABEL_TRANSITION}
			style={{
				width: view.width,
				height: view.height,
				borderColor: withAlpha(view.accent, 0.4),
				boxShadow: `0 10px 30px ${withAlpha(view.accent, 0.2)}`,
			}}
		>
			<div className="flex h-full w-full items-center gap-3 px-4">
				<div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/5">
					{view.image ? (
						<Image
							src={view.image}
							alt={view.fullTitle}
							fill
							sizes="40px"
							className="object-cover"
						/>
					) : (
						<div className="grid h-full w-full place-items-center text-[0.65rem] font-semibold uppercase tracking-widest text-white/60">
							{view.fullTitle.slice(0, 3).toUpperCase()}
						</div>
					)}
				</div>
				<span
					className="truncate text-xs font-semibold uppercase tracking-[0.25em]"
					title={view.fullTitle}
				>
					{view.title}
				</span>
			</div>
		</motion.div>
	);
}

function createTicker(id: number, size: Size, content: TickerContent): Ticker {
	const { width, height } = size;
	const dims = measureTickerDimensions(content.displayTitle.length);
	const spawnY =
		height * (0.1 + Math.random() * 0.3) + Math.random() * FLOOR_PADDING;
	return {
		id,
		spawnKey: Math.random(),
		x: -dims.width - Math.random() * width * 0.2,
		y: spawnY,
		vx: 120 + Math.random() * 120,
		vy: 40 + Math.random() * 50,
		width: dims.width,
		height: dims.height,
		accent: content.accent,
		displayTitle: content.displayTitle,
		fullTitle: content.title,
		image: content.image,
		tail: [],
		jitterOffset: 0,
		jitterVelocity: 0,
		physics: createTickerPhysics(),
	};
}

function applyContentToTicker(ticker: Ticker, content: TickerContent) {
	const dims = measureTickerDimensions(content.displayTitle.length);
	ticker.accent = content.accent;
	ticker.displayTitle = content.displayTitle;
	ticker.fullTitle = content.title;
	ticker.image = content.image;
	ticker.width = dims.width;
	ticker.height = dims.height;
	ticker.spawnKey = Math.random();
	ticker.tail = [];
}

function createTickerPhysics(): TickerPhysics {
	return {
		gravity: GRAVITY * randomInRange(0.85, 1.15),
		restitution: sampleBounceRestitution(),
		jitterMagnitude: JITTER_MAGNITUDE * randomInRange(0.75, 1.25),
		jitterResponsiveness: JITTER_RESPONSIVENESS * randomInRange(0.7, 1.3),
	};
}

function updateTickers(tickers: Ticker[], dt: number, size: Size, ts: number) {
	const floor = size.height - FLOOR_PADDING;
	const activeTickers: Ticker[] = [];
	for (const ticker of tickers) {
		ticker.vy += ticker.physics.gravity * dt;
		ticker.x += ticker.vx * dt;
		ticker.y += ticker.vy * dt;

		if (ticker.y + ticker.height >= floor) {
			ticker.y = floor - ticker.height;
			const bounceFactor = ticker.physics.restitution;
			const bounceMagnitude = clamp(
				Math.abs(bounceFactor),
				BOUNCE_MAGNITUDE_MIN,
				BOUNCE_MAGNITUDE_MAX
			);
			ticker.vy = -Math.abs(ticker.vy) * bounceMagnitude;
			if (bounceFactor < 0) {
				ticker.vy *= NEGATIVE_BOUNCE_BONUS;
			}
			if (ticker.vy > -40) {
				ticker.vy = -40;
			}
			ticker.physics.restitution = sampleBounceRestitution();
		}

		if (ticker.x - ticker.width > size.width + 120) {
			continue;
		}

		applyJitter(ticker, dt);
		const displayY = ticker.y + ticker.jitterOffset;

		ticker.tail.push({ x: ticker.x + ticker.width / 2, y: displayY, time: ts });
		ticker.tail = ticker.tail.filter(
			(point) => ts - point.time <= TRAIL_DURATION_MS
		);
		activeTickers.push(ticker);
	}
	return activeTickers;
}

function toTickerView(ticker: Ticker): TickerView {
	return {
		id: ticker.id,
		spawnKey: ticker.spawnKey,
		x: ticker.x,
		y: ticker.y + ticker.jitterOffset,
		width: ticker.width,
		height: ticker.height,
		title: ticker.displayTitle,
		fullTitle: ticker.fullTitle,
		image: ticker.image,
		accent: ticker.accent,
	};
}

function applyJitter(ticker: Ticker, dt: number) {
	const { jitterMagnitude, jitterResponsiveness } = ticker.physics;
	const randomTarget = (Math.random() - 0.5) * 2 * jitterMagnitude;
	const acceleration =
		(randomTarget - ticker.jitterOffset) * jitterResponsiveness;
	ticker.jitterVelocity += acceleration * dt;
	ticker.jitterVelocity = clamp(
		ticker.jitterVelocity,
		-MAX_JITTER_VELOCITY,
		MAX_JITTER_VELOCITY
	);
	ticker.jitterOffset += ticker.jitterVelocity * dt;
	ticker.jitterOffset = clamp(
		ticker.jitterOffset,
		-jitterMagnitude,
		jitterMagnitude
	);
}

function drawScene(
	ctx: CanvasRenderingContext2D,
	tickers: Ticker[],
	size: Size
) {
	ctx.clearRect(0, 0, size.width, size.height);
	for (const ticker of tickers) {
		drawTail(ctx, ticker);
	}
}

function drawTail(ctx: CanvasRenderingContext2D, ticker: Ticker) {
	if (ticker.tail.length < 2) return;
	ctx.save();
	const first = ticker.tail[0];
	const last = ticker.tail[ticker.tail.length - 1];
	const gradient = ctx.createLinearGradient(first.x, first.y, last.x, last.y);
	const color = ticker.accent;
	gradient.addColorStop(0, withAlpha(color, 0));
	gradient.addColorStop(1, withAlpha(color, 0.6));
	ctx.strokeStyle = gradient;
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.moveTo(first.x, first.y);
	for (let i = 1; i < ticker.tail.length; i++) {
		const point = ticker.tail[i];
		ctx.lineTo(point.x, point.y);
	}
	ctx.stroke();
	ctx.restore();
}

function measureTickerDimensions(titleLength: number) {
	const width = clamp(
		MIN_TICKER_WIDTH + titleLength * WIDTH_PER_CHAR,
		MIN_TICKER_WIDTH,
		MAX_TICKER_WIDTH
	);
	return { width, height: TICKER_HEIGHT };
}

function clamp(value: number, min: number, max: number) {
	return Math.max(min, Math.min(max, value));
}

function withAlpha(hex: string, alpha: number) {
	const { r, g, b } = hexToRgb(hex);
	return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function hexToRgb(hex: string) {
	let sanitized = hex.replace("#", "");
	if (sanitized.length === 3) {
		sanitized = sanitized
			.split("")
			.map((char) => char + char)
			.join("");
	}
	const num = parseInt(sanitized, 16);
	return {
		r: (num >> 16) & 255,
		g: (num >> 8) & 255,
		b: num & 255,
	};
}

function sampleBounceRestitution() {
	const magnitudeSeed = randomInRange(
		BOUNCE_MAGNITUDE_MIN,
		BOUNCE_MAGNITUDE_MAX
	);
	const baseInfluence = BOUNCE_RESTITUTION * randomInRange(0.85, 1.15);
	const magnitude = clamp(
		magnitudeSeed * randomInRange(0.9, 1.2) + baseInfluence * 0.1,
		BOUNCE_MAGNITUDE_MIN,
		BOUNCE_MAGNITUDE_MAX
	);
	const shouldFlip = Math.random() < BOUNCE_NEGATIVE_PROBABILITY;
	return shouldFlip ? -magnitude : magnitude;
}

function randomInRange(min: number, max: number) {
	return min + Math.random() * (max - min);
}
