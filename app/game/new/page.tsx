"use client";

import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { Card } from "@/components/ui/card";
import { createGame, CreateGameInput } from "./createGame";
import { MultiSelect } from "@/components/ui/multi-select";
import { toast } from "sonner";
import { Tag } from "@/lib/polymarketData";
import { useState } from "react";
import { useTRPCClient } from "@/trpc/client";
import { Button } from "@/components/ui/button";

import { cn } from "@/lib/utils";
const topicBufferPageSize = 25;

export default function NewGame() {
	const { handleSubmit, control, setValue } = useForm<CreateGameInput>({
		defaultValues: { topics: [], roundCount: 5 },
	});
	const router = useRouter();
	const trpcClient = useTRPCClient();
	const [search, setSearch] = useState("");

	// roundCount selection handled via Controller below to avoid watch() compiler warnings

	return (
		<div className="w-screen h-screen grid place-items-center">
			<Card className="group grid place-items-center border-emerald-500 border bg-emerald-500/50 hover:bg-emerald-500 hover:text-white transition-colors w-104 px-6">
				<form
					className="flex flex-col gap-2 w-full"
					onSubmit={handleSubmit(async (data) => {
						const [gameId, error] = await createGame(data);
						if (error) {
							toast.error(`failed to create game: ${error}`);
							return;
						}
						router.push(`/game/${gameId}`);
					})}
				>
					<h1 className="text-5xl font-medium font-sans">Create Game</h1>
					<label className="text-foreground hover:text-white transition-colors">
						Round Count
						<Controller
							name="roundCount"
							control={control}
							render={({ field: { value } }) => (
								<div className="flex gap-2 text-foreground">
									{[3, 5, 7].map((c) => (
										<Button
											onClick={() => setValue("roundCount", c)}
											variant={"outline"}
											className={cn("flex-1", {
												"bg-black! text-white! border-black!": c === value,
											})}
											type="button"
											key={c}
										>
											{c}
										</Button>
									))}
								</div>
							)}
						/>
					</label>
					<label
						className="text-foreground hover:text-white transition-colors"
						htmlFor="gameId"
					>
						Topic
						<Controller
							name="topics"
							control={control}
							render={({ field: { value, onChange } }) => (
								<MultiSelect<Tag>
									getLabel={(v) => v.label!}
									compare={(a, b) => a.id === b.id}
									value={value ?? []}
									onChange={(next) => {
										const current = value;
										const resolved =
											typeof next === "function" ? next(current) : next;
										onChange(resolved);
									}}
									placeholder="Select topics (optional)"
									search={search}
									setSearch={setSearch}
									initialPageParam={1}
									getNextPageParam={(lastPage, allPages, lastPageParam) => {
										if (lastPage.length === 0) return undefined;
										console.log("lastPageParam", lastPageParam);
										return lastPageParam + 1;
									}}
									queryFn={async ({ pageParam }): Promise<Tag[]> => {
										console.log("searching for", search, pageParam);
										const { tags } =
											await trpcClient.polymarketSearch.publicSearch.query({
												page: pageParam,
												q: search || "*",
												cache: true,
												events_status: "active",
												limit_per_type: topicBufferPageSize,
												sort: "volume_24hr",
												ascending: false,
												search_tags: true,
											});
										if (!tags) return [];

										return tags;
									}}
								/>
							)}
						/>
					</label>
					<Button type="submit">Create Game</Button>
				</form>
			</Card>
		</div>
	);

	// const { topic } = await searchParams;
	// const events = await pickRandomEvents(roundCount, topic);
	// if (events.length < roundCount)
	// 	return (
	// 		<div>
	// 			Sorry... {"'"}
	// 			{topic}
	// 			{"'"} is too specific, we couldn{"'"}t find enough events
	// 		</div>
	// 	);
	// const game = await db.transaction(async (tx) => {
	// 	const [game] = await tx
	// 		.insert(games)
	// 		.values({
	// 			phase: "joinable",
	// 		})
	// 		.returning({ id: games.id });

	// 	await tx.insert(rounds).values(
	// 		events.map(
	// 			(event, i): InferInsertModel<typeof rounds> => ({
	// 				index: i,
	// 				gameId: game.id,
	// 				eventSlug: event.slug!,
	// 				// eventSlug: "xi-jinping-out-before-2027",
	// 			})
	// 		)
	// 	);

	// 	return game;
	// });

	// return redirect(`/game/join?gameId=${game.id}`);
}
