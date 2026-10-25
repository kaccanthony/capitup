import "server-only";
import {
  parseServerEnvironment,
  type ServerEnvironment,
} from "@/lib/env/shared";

export function getServerEnvironment(): ServerEnvironment {
  return parseServerEnvironment(process.env);
}
