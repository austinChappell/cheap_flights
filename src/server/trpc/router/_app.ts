// src/server/router/_app.ts
import { router } from "../trpc";

import { flightsRouter } from "./flights";

export const appRouter = router({
  flights: flightsRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
