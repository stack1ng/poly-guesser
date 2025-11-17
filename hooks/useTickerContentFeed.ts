import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	FALLBACK_TICKER_CONTENT,
	MAX_TRENDING_POOL,
	mapSeriesToTickerContent,
	TickerContent,
	TICKER_COLORS,
} from "@/lib/ticker-content";
import { useTRPC, useTRPCClient } from "@/trpc/client";

const DEFAULT_INITIAL_BATCH_SIZE = 24;
const DEFAULT_SUBSEQUENT_BATCH_SIZE = 24;
const DEFAULT_MIN_QUEUE_SIZE = 6;

type FeedOptions = {
	initialBatchSize?: number;
	subsequentBatchSize?: number;
	maxPoolSize?: number;
	minQueueBeforeFetch?: number;
};

type FeedState = {
	getNextContent: () => TickerContent | null;
	ensureContentBuffer: () => void;
	resetDisplayed: () => void;
	contentSnapshot: TickerContent[];
	hasBufferedContent: () => boolean;
	feedVersion: number;
};

export function useTickerContentFeed(options?: FeedOptions): FeedState {
	const {
		initialBatchSize = DEFAULT_INITIAL_BATCH_SIZE,
		subsequentBatchSize = DEFAULT_SUBSEQUENT_BATCH_SIZE,
		maxPoolSize = MAX_TRENDING_POOL,
		minQueueBeforeFetch = DEFAULT_MIN_QUEUE_SIZE,
	} = options ?? {};

	const trpc = useTRPC();
	const trpcClient = useTRPCClient();

	const contentQueueRef = useRef<TickerContent[]>([...FALLBACK_TICKER_CONTENT]);
	const queuedIdsRef = useRef(
		new Set(contentQueueRef.current.map((content) => content.id))
	);
	const displayedIdsRef = useRef(new Set<string>());
	const allContentRef = useRef<TickerContent[]>([...FALLBACK_TICKER_CONTENT]);
	const allContentIdsRef = useRef(
		new Set(allContentRef.current.map((content) => content.id))
	);
	const fetchStateRef = useRef({
		offset: 0,
		fetching: false,
		exhausted: false,
	});
	const initialSeriesLoadedRef = useRef(false);
	const [contentSnapshot, setContentSnapshot] = useState<TickerContent[]>(
		allContentRef.current.slice(0, maxPoolSize)
	);
	const [feedVersion, setFeedVersion] = useState(0);

	const syncContentSnapshot = useCallback(() => {
		const max = maxPoolSize;
		if (allContentRef.current.length > max) {
			allContentRef.current = allContentRef.current.slice(-max);
			allContentIdsRef.current = new Set(
				allContentRef.current.map((content) => content.id)
			);
		}
		setContentSnapshot(allContentRef.current.slice());
	}, [maxPoolSize]);

	const enqueueContent = useCallback(
		(incoming: TickerContent[]) => {
			if (!incoming.length) return;
			let snapshotChanged = false;
			const queue = contentQueueRef.current;
			const queuedIds = queuedIdsRef.current;
			const displayedIds = displayedIdsRef.current;
			const allIds = allContentIdsRef.current;

			for (const item of incoming) {
				if (!item || displayedIds.has(item.id) || queuedIds.has(item.id)) {
					if (!allIds.has(item.id)) {
						allContentRef.current.push(item);
						allIds.add(item.id);
						snapshotChanged = true;
					}
					continue;
				}

				queue.push(item);
				queuedIds.add(item.id);

				if (!allIds.has(item.id)) {
					allContentRef.current.push(item);
					allIds.add(item.id);
					snapshotChanged = true;
				}
			}

			if (snapshotChanged) {
				syncContentSnapshot();
			}
		},
		[syncContentSnapshot]
	);

	const replaceQueueWith = useCallback(
		(incoming: TickerContent[]) => {
			contentQueueRef.current = [];
			queuedIdsRef.current.clear();
			displayedIdsRef.current.clear();
			allContentRef.current = [];
			allContentIdsRef.current.clear();
			setFeedVersion((prev) => prev + 1);
			enqueueContent(incoming);
		},
		[enqueueContent]
	);

	const recycleQueue = useCallback(() => {
		if (!allContentRef.current.length) return false;
		displayedIdsRef.current.clear();

		const recycled = allContentRef.current.filter(
			(item) => !queuedIdsRef.current.has(item.id)
		);

		if (!recycled.length) return false;

		for (const item of recycled) {
			contentQueueRef.current.push(item);
			queuedIdsRef.current.add(item.id);
		}
		return true;
	}, []);

	const fetchNextPage = useCallback(async () => {
		const state = fetchStateRef.current;
		if (state.fetching || state.exhausted) return;
		state.fetching = true;
		try {
			const data = await trpcClient.polymarketEvent.listSeries.query({
				limit: subsequentBatchSize,
				offset: state.offset,
			});

			if (!data?.length) {
				state.exhausted = true;
				return;
			}

			state.offset += data.length;
			const mapped = mapSeriesToTickerContent(data, TICKER_COLORS);
			enqueueContent(mapped);

			if (mapped.length < subsequentBatchSize) {
				state.exhausted = true;
			}
		} catch (error) {
			console.error("Failed to fetch additional polymarket series", error);
		} finally {
			state.fetching = false;
		}
	}, [enqueueContent, subsequentBatchSize, trpcClient]);

	const ensureContentBuffer = useCallback(() => {
		const queueLength = contentQueueRef.current.length;
		const fetchState = fetchStateRef.current;
		if (
			queueLength >= minQueueBeforeFetch ||
			fetchState.exhausted ||
			!initialSeriesLoadedRef.current
		) {
			return;
		}
		void fetchNextPage();
	}, [fetchNextPage, minQueueBeforeFetch]);

	const getNextContent = useCallback((): TickerContent | null => {
		let attempts = 0;

		while (attempts < 2) {
			const queue = contentQueueRef.current;
			while (queue.length) {
				const next = queue.shift()!;
				queuedIdsRef.current.delete(next.id);
				if (displayedIdsRef.current.has(next.id)) continue;
				displayedIdsRef.current.add(next.id);
				ensureContentBuffer();
				return next;
			}

			const recycled = recycleQueue();
			if (!recycled) break;
			attempts += 1;
		}

		ensureContentBuffer();
		return null;
	}, [ensureContentBuffer, recycleQueue]);

	const resetDisplayed = useCallback(() => {
		displayedIdsRef.current.clear();
	}, []);

	const hasBufferedContent = useCallback(() => {
		return contentQueueRef.current.length > 0;
	}, []);

	const { data: initialSeries } = useQuery({
		...trpc.polymarketEvent.listSeries.queryOptions({
			limit: initialBatchSize,
			offset: 0,
		}),
		staleTime: 1000 * 60 * 5,
		gcTime: 1000 * 60 * 10,
		refetchOnWindowFocus: false,
	});

	useEffect(() => {
		if (!initialSeries || initialSeriesLoadedRef.current) return;
		initialSeriesLoadedRef.current = true;

		const mapped = mapSeriesToTickerContent(initialSeries, TICKER_COLORS).slice(
			0,
			maxPoolSize
		);

		if (!mapped.length) {
			fetchStateRef.current.exhausted = true;
			return;
		}

		replaceQueueWith(mapped);
		fetchStateRef.current.offset = mapped.length;
		fetchStateRef.current.exhausted = mapped.length < initialBatchSize;
		ensureContentBuffer();
	}, [
		ensureContentBuffer,
		initialSeries,
		initialBatchSize,
		maxPoolSize,
		replaceQueueWith,
	]);

	const feedState = useMemo<FeedState>(
		() => ({
			getNextContent,
			ensureContentBuffer,
			resetDisplayed,
			contentSnapshot,
			hasBufferedContent,
			feedVersion,
		}),
		[
			contentSnapshot,
			ensureContentBuffer,
			feedVersion,
			getNextContent,
			hasBufferedContent,
			resetDisplayed,
		]
	);

	return feedState;
}
