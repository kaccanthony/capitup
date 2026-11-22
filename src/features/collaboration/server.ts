import "server-only";

import { Liveblocks } from "@liveblocks/node";
import { getServerEnvironment } from "@/lib/env/server";

export class CollaborationProviderUnavailableError extends Error {
  constructor() {
    super("Realtime collaboration is unavailable.");
    this.name = "CollaborationProviderUnavailableError";
  }
}

export function createLiveblocksServerClient() {
  const secret = getServerEnvironment().LIVEBLOCKS_SECRET_KEY;

  if (!secret) {
    throw new CollaborationProviderUnavailableError();
  }

  return new Liveblocks({ secret });
}
