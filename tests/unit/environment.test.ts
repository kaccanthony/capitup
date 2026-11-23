import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  EnvironmentValidationError,
  parsePublicEnvironment,
} from "@/lib/env/shared";
import { parseServerEnvironment } from "@/lib/env/server-schema";

describe("environment validation", () => {
  it("accepts configured public and server values", () => {
    expect(
      parsePublicEnvironment({
        NEXT_PUBLIC_APP_URL: "https://capitup.example.test",
        NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "synthetic-publishable-key",
      }),
    ).toEqual({
      NEXT_PUBLIC_APP_URL: "https://capitup.example.test",
      NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "synthetic-publishable-key",
    });

    expect(
      parseServerEnvironment({
        GEMINI_API_KEY: "synthetic-server-value",
      }),
    ).toEqual({ GEMINI_API_KEY: "synthetic-server-value" });
  });

  it("allows absent optional integration values", () => {
    expect(parsePublicEnvironment({})).toEqual({});
    expect(parseServerEnvironment({})).toEqual({});
  });

  it("reports invalid keys without exposing configured values", () => {
    const secretValue = "synthetic-value-that-must-not-appear";

    expect(() =>
      parsePublicEnvironment({ NEXT_PUBLIC_APP_URL: "not-a-url" }),
    ).toThrow(EnvironmentValidationError);

    expect(() =>
      parseServerEnvironment({
        GEMINI_API_KEY: "",
      }),
    ).toThrow(EnvironmentValidationError);

    try {
      parseServerEnvironment({
        GEMINI_API_KEY: "",
      });
    } catch (error) {
      expect(error).toBeInstanceOf(EnvironmentValidationError);
      expect(error).toMatchObject({ keys: ["GEMINI_API_KEY"] });
      expect(String(error)).not.toContain(secretValue);
    }
  });

  it("keeps client and server environment modules separate", async () => {
    const clientModule = await readFile("src/lib/env/client.ts", "utf8");
    const serverModule = await readFile("src/lib/env/server.ts", "utf8");
    const sharedModule = await readFile("src/lib/env/shared.ts", "utf8");

    expect(clientModule).not.toContain("./server");
    expect(clientModule).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(sharedModule).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(serverModule).toContain('import "server-only"');
  });
});
