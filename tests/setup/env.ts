import { config } from "dotenv";

// `tests/integration/**` talks to the real database, so it needs the same
// `.env.local` the app reads. Harmless for `tests/unit/**`, which mock
// `@/lib/db` and never open a connection.
config({ path: ".env.local" });
