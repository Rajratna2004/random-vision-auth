import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env") });

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is not set. Edit lib/db/.env and set:\n  DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/kiddo_vision'
  );
}

export default defineConfig({
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
