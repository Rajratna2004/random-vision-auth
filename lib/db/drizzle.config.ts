import { defineConfig } from "drizzle-kit";
import path from "path";
import { config } from "dotenv";

config({ path: path.resolve(__dirname, ".env") });

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is not set. Edit lib/db/.env and set your database URL:\n  DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/kiddo_vision'
  );
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
