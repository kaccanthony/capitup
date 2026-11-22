import "server-only";
import {
  parseServerEnvironment,
  type ServerEnvironment,
} from "@/lib/env/server-schema";

export function getServerEnvironment(): ServerEnvironment {
  return parseServerEnvironment(process.env);
}
