import {
	bigserial,
	boolean,
	check,
	foreignKey,
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	primaryKey,
	text,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NANO_ID_LENGTH } from "@/lib/nanoidLength";

export const gamePhase = pgEnum("game_phase", ["joinable", "in_play", "ended"]);
export const playerState = pgEnum("player_state", ["ready", "not_ready"]);
export const nanoidField = (name: string) =>
	varchar(name, { length: NANO_ID_LENGTH });

export const nanoidDefault = (name: string) =>
	nanoidField(name).$defaultFn(nanoid);

export const games = pgTable(
	"games",
	{
		id: nanoidDefault("id").notNull().primaryKey(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),

		phase: gamePhase("phase").notNull(),
		currentRoundIndex: integer("current_round_index"),
	},
	(table) => [
		check(
			"current_round_index_if_phase_in_play",
			sql`${table.phase} <> 'in_play' OR ${table.currentRoundIndex} IS NOT NULL`
		),
	]
);

export const rounds = pgTable(
	"rounds",
	{
		index: integer("index").notNull(),
		gameId: nanoidField("game_id").references(() => games.id),
		eventSlug: text("event_slug").notNull(),

		// if startTime+endTime are both null, the round is not yet started
		startTime: timestamp("start_time", { withTimezone: true }),
		endTime: timestamp("end_time", { withTimezone: true }),
	},
	(table) => [
		primaryKey({ columns: [table.gameId, table.index] }),
		check(
			"rounds_end_time_if_started",
			sql`${table.startTime} IS NULL OR ${table.endTime} IS NOT NULL`
		),
	]
);

export type ScoreDelta = {
	[marketId: string]: number;
};
export const roundChoices = pgTable(
	"round_choices",
	{
		roundGameId: nanoidField("round_game_id").references(() => games.id),
		roundIndex: integer("round_index").notNull(),
		playerId: nanoidField("player_id").references(() => players.id),
		chosenEventIdsRanked: text("chosen_event_ids_ranked").array().notNull(),
		scoreDelta: jsonb("score_delta").$type<ScoreDelta>().notNull(),
	},
	(table) => [
		primaryKey({
			columns: [table.roundGameId, table.roundIndex, table.playerId],
		}),
		foreignKey({
			columns: [table.roundGameId, table.roundIndex],
			foreignColumns: [rounds.gameId, rounds.index],
			name: "round_choices_round_fk",
		}),
	]
);

export const players = pgTable("players", {
	id: nanoidDefault("id").notNull().primaryKey(),
	name: text("name").notNull(),
});

export const gamePlayers = pgTable(
	"game_players",
	{
		gameId: nanoidField("game_id")
			.notNull()
			.references(() => games.id),
		playerId: nanoidField("player_id")
			.notNull()
			.references(() => players.id),
		state: playerState("state").notNull().default("not_ready"),
	},
	(table) => [primaryKey({ columns: [table.gameId, table.playerId] })]
);

export type Game = typeof games.$inferSelect;
export type NewGame = typeof games.$inferInsert;

export const outbox = pgTable(
	"outbox",
	{
		sequenceId: bigserial("sequence_id", { mode: "number" }).primaryKey(),
		mutationId: text("mutation_id").notNull().$defaultFn(nanoid),
		channel: text("channel").notNull(),
		name: text("name").notNull(),
		rejected: boolean("rejected").notNull().default(false),
		data: jsonb("data"),
		headers: jsonb("headers"),
		lockedBy: text("locked_by"),
		lockExpiry: timestamp("lock_expiry", { withTimezone: true }),
		processed: boolean("processed").notNull().default(false),
	},
	(table) => [index("outbox_channel_idx").on(table.channel)]
);

export const nodes = pgTable("nodes", {
	id: text("id").primaryKey(),
	expiry: timestamp("expiry", { withTimezone: true }).notNull(),
});

// define relationships
export const gameRelations = relations(games, ({ many }) => ({
	rounds: many(rounds),
	players: many(gamePlayers),
}));

export const gamePlayerRelations = relations(gamePlayers, ({ one }) => ({
	game: one(games, {
		fields: [gamePlayers.gameId],
		references: [games.id],
	}),
	player: one(players, {
		fields: [gamePlayers.playerId],
		references: [players.id],
	}),
}));

export const playerRelations = relations(players, ({ many }) => ({
	gamePlayers: many(gamePlayers),
}));

export const roundRelations = relations(rounds, ({ one, many }) => ({
	game: one(games, {
		fields: [rounds.gameId],
		references: [games.id],
	}),
	roundChoices: many(roundChoices),
}));

export const roundChoiceRelations = relations(roundChoices, ({ one }) => ({
	round: one(rounds, {
		fields: [roundChoices.roundGameId, roundChoices.roundIndex],
		references: [rounds.gameId, rounds.index],
	}),
	player: one(players, {
		fields: [roundChoices.playerId],
		references: [players.id],
	}),
}));
