import {
	ConfirmedEvent,
	ExtractData,
	ModelSpec,
	ModelStateChange,
	OptimisticEvent,
	SubscriptionCallback,
	SyncReturnType,
} from "@ably-labs/models";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ablyModels } from "./client";

export function useModelState<S extends () => SyncReturnType<unknown>>(
	initialState: ExtractData<S>,
	spec: ModelSpec<S>,
	initialSyncParams?: Parameters<S>
) {
	const seenMutations = useRef(new Set<string>());
	const deduplicatedSpec = useMemo(
		() => ({
			...spec,
			merge: (
				oldData: ExtractData<S>,
				event: OptimisticEvent | ConfirmedEvent
			) => {
				if (seenMutations.current.has(event.mutationId)) {
					console.warn(
						`skipping mutation ${event.mutationId} because it has already been seen`
					);
					return oldData;
				}
				seenMutations.current.add(event.mutationId);
				return spec.merge(oldData, event);
			},
		}),
		[spec]
	);
	const model = useMemo(() => {
		//  TODO: make sure this doesn't cause any bugs
		// eslint-disable-next-line react-hooks/refs
		const model = ablyModels.models.get(deduplicatedSpec);
		if (model.state === "initialized")
			model.sync(...(initialSyncParams ?? ([] as Parameters<S>)));

		return model;
	}, [initialSyncParams, deduplicatedSpec]);
	// useWhatChanged([initialSyncParams, spec], "initialSyncParams, spec");

	const [state, setState] = useState<ExtractData<S>>(initialState);
	useEffect(() => {
		// model.on((stateChange) => {
		// 	console.log("stateChange", stateChange);
		// });

		const handler: SubscriptionCallback<S> = (err, result) => {
			if (err) {
				console.error("model error", err);
				toast.error(`model ${spec.channelName} error: ${err.message}`);
				return;
			} else if (!result)
				throw new Error("Result should be defined if error is null");
			console.log("model state changed", result);
			setState(result);
		};
		const whenReady = () => {
			setState(model.data.confirmed);
			model.subscribe(handler, {
				optimistic: false,
			});
		};
		if (model.state === "ready") whenReady();
		else model.on("ready", whenReady);

		return () => model.unsubscribe(handler);
	}, [model, spec.channelName]);

	return state;
}
