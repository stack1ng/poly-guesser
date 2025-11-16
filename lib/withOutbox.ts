import { db } from "@/db/client";
import type { ExtractTablesWithRelations, InferInsertModel } from "drizzle-orm";
import { outbox } from "@/db/schema";
import { PgTransaction } from "drizzle-orm/pg-core";
import { NeonQueryResultHKT } from "drizzle-orm/neon-serverless";
import * as schema from "@/db/schema";

type OutboxInsertInput = InferInsertModel<typeof outbox>;

export async function withOutbox<T>(
	values: OutboxInsertInput[],
	fn: (
		tx: ReturnType<
			PgTransaction<
				NeonQueryResultHKT,
				typeof schema,
				ExtractTablesWithRelations<typeof schema>
			>["with"]
		>
	) => Promise<T>
): Promise<T> {
	return db.transaction(async (tx) => {
		const outboxRow = tx.$with("outbox_row").as(() =>
			tx.insert(outbox).values(values).returning({
				sequenceId: outbox.sequenceId,
			})
		);
		const result = await fn(tx.with(outboxRow));
		return result;
	});
}
