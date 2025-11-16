import { games, players, roundChoices, rounds } from "@/db/schema";
import { InferSelectModel } from "drizzle-orm";
import { createSelectSchema } from "drizzle-zod";

export type ClientGameState = InferSelectModel<typeof games> & {
	players: {
		id: string;
		state: "ready" | "not_ready";
	}[];
	currentRoundIndex: number | null;
	rounds: {
		index: number;
		details: InferSelectModel<typeof rounds>;
		choices: InferSelectModel<typeof roundChoices>[];
	}[];
};

export const playerSchema = createSelectSchema(players);
export const roundSchema = createSelectSchema(rounds);
export const roundChoiceSchema = createSelectSchema(roundChoices);

export type Player = InferSelectModel<typeof players>;
export type Round = InferSelectModel<typeof rounds>;
export type RoundChoice = InferSelectModel<typeof roundChoices>;
