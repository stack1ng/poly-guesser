import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";
import { Pool } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
	throw new Error("DATABASE_URL is not set");
}

const neon = new Pool({ connectionString });
export const db = drizzle(neon, { schema });

const readConnectionString = process.env.READ_DATABASE_URL;

if (!readConnectionString) {
	throw new Error("READ_DATABASE_URL is not set");
}

const readPool = new Pool({ connectionString: readConnectionString });

export const readDb = drizzle(readPool, { schema });
