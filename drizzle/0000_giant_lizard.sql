CREATE TYPE "public"."game_phase" AS ENUM('joinable', 'in_play', 'ended');--> statement-breakpoint
CREATE TYPE "public"."player_state" AS ENUM('ready', 'not_ready');--> statement-breakpoint
CREATE TABLE "game_players" (
	"game_id" varchar(21) NOT NULL,
	"player_id" varchar(21) NOT NULL,
	"state" "player_state" DEFAULT 'not_ready' NOT NULL,
	CONSTRAINT "game_players_game_id_player_id_pk" PRIMARY KEY("game_id","player_id")
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" varchar(21) PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"phase" "game_phase" NOT NULL,
	"current_round_index" integer,
	CONSTRAINT "current_round_index_if_phase_in_play" CHECK ("games"."phase" <> 'in_play' OR "games"."current_round_index" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "nodes" (
	"id" text PRIMARY KEY NOT NULL,
	"expiry" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outbox" (
	"sequence_id" bigserial PRIMARY KEY NOT NULL,
	"mutation_id" text NOT NULL,
	"channel" text NOT NULL,
	"name" text NOT NULL,
	"rejected" boolean DEFAULT false NOT NULL,
	"data" jsonb,
	"headers" jsonb,
	"locked_by" text,
	"lock_expiry" timestamp with time zone,
	"processed" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" varchar(21) PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "round_choices" (
	"round_game_id" varchar(21),
	"round_index" integer NOT NULL,
	"player_id" varchar(21),
	"chosen_event_ids_ranked" text[] NOT NULL,
	"score_delta" jsonb NOT NULL,
	CONSTRAINT "round_choices_round_game_id_round_index_player_id_pk" PRIMARY KEY("round_game_id","round_index","player_id")
);
--> statement-breakpoint
CREATE TABLE "rounds" (
	"index" integer NOT NULL,
	"game_id" varchar(21),
	"event_slug" text NOT NULL,
	"start_time" timestamp with time zone,
	"end_time" timestamp with time zone,
	CONSTRAINT "rounds_game_id_index_pk" PRIMARY KEY("game_id","index"),
	CONSTRAINT "rounds_end_time_if_started" CHECK ("rounds"."start_time" IS NULL OR "rounds"."end_time" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "game_players" ADD CONSTRAINT "game_players_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_players" ADD CONSTRAINT "game_players_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "round_choices" ADD CONSTRAINT "round_choices_round_game_id_games_id_fk" FOREIGN KEY ("round_game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "round_choices" ADD CONSTRAINT "round_choices_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "round_choices" ADD CONSTRAINT "round_choices_round_fk" FOREIGN KEY ("round_game_id","round_index") REFERENCES "public"."rounds"("game_id","index") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "outbox_channel_idx" ON "outbox" USING btree ("channel");