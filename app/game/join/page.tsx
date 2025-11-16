"use client";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { useRouter, useSearchParams } from "next/navigation";
import { joinGame } from "./joinAction";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/useAuth";
import { Suspense } from "react";

type JoinForm = {
	gameId: string;
	username: string;
};

export default function JoinGame() {
	return (
		// useSearchParams requires a suspense boundary to work
		<Suspense fallback={<div>Loading...</div>}>
			<JoinGameInner />
		</Suspense>
	);
}

function JoinGameInner() {
	const searchParams = useSearchParams();

	const { username, setUsername, playerId, makePlayer } = useAuth();
	const {
		handleSubmit,
		register,
		formState: { isValid, isSubmitting },
	} = useForm<JoinForm>({
		mode: "onChange",
		defaultValues: {
			gameId: searchParams.get("gameId") ?? "",
			username,
		},
	});
	const router = useRouter();

	return (
		<Card className="group grid place-items-center border-sky-500 border bg-sky-500/50 hover:bg-sky-500 hover:text-white transition-colors w-96">
			<form
				className="flex flex-col gap-2 max-w-sm mx-auto"
				onSubmit={handleSubmit(async (data) => {
					setUsername(data.username);
					let thisPlayerId = playerId;
					if (!playerId)
						thisPlayerId = await toast
							.promise(makePlayer(), {
								loading: "Creating player...",
								success: "Player created!",
								error: "Failed to create player",
							})
							.unwrap();

					await toast
						.promise(joinGame(data.gameId, thisPlayerId), {
							loading: "Joining game...",
							success: "Joined game!",
							error: "Failed to join game",
						})
						.unwrap();

					router.push(`/game/${data.gameId}`);
				})}
			>
				<h1 className="text-5xl font-medium">Join Game</h1>
				<label
					className="text-foreground hover:text-white transition-colors"
					htmlFor="username"
				>
					Username
					<Input
						id="username"
						className="text-foreground focus-visible:ring-0 focus-visible:ring-offset-0 bg-background/50 group-hover:bg-background transition-colors"
						placeholder="Enter username"
						required
						{...register("username", { required: true })}
					/>
				</label>
				<label
					className="text-foreground hover:text-white transition-colors"
					htmlFor="gameId"
				>
					Game ID
					<div className="flex gap-2">
						<Input
							id="gameId"
							className="text-foreground focus-visible:ring-0 focus-visible:ring-offset-0 bg-background/50 group-hover:bg-background transition-colors"
							placeholder="Enter game ID"
							required
							{...register("gameId", { required: true, minLength: 21 })}
						/>
						<Button
							type="submit"
							className="hover:bg-emerald-500"
							disabled={!isValid || isSubmitting}
						>
							Join!
						</Button>
					</div>
				</label>
			</form>
		</Card>
	);
}
