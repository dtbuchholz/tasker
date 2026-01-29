import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

import * as schema from "./schema.js";

const { Pool } = pg;

function getConnectionString(): string {
  const url = process.env["DATABASE_URL"];
  if (!url) {
    throw new Error("DATABASE_URL environment variable is required");
  }
  return url;
}

let poolInstance: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!poolInstance) {
    poolInstance = new Pool({
      connectionString: getConnectionString(),
      max: 10,
    });
  }
  return poolInstance;
}

export function getDb() {
  return drizzle(getPool(), { schema });
}

export async function closePool(): Promise<void> {
  if (poolInstance) {
    await poolInstance.end();
    poolInstance = null;
  }
}

export type Db = ReturnType<typeof getDb>;
