import { spawn, spawnSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const baseUrl = "http://127.0.0.1:3000";
const nextCli = fileURLToPath(
  new URL("../node_modules/next/dist/bin/next", import.meta.url),
);
const playwrightCli = fileURLToPath(
  new URL("../node_modules/@playwright/test/cli.js", import.meta.url),
);

const server = spawn(
  process.execPath,
  [nextCli, "start", "--hostname", "127.0.0.1"],
  {
    detached: process.platform !== "win32",
    stdio: "inherit",
  },
);

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (server.exitCode !== null) {
      throw new Error(
        `Next.js exited before becoming ready (${server.exitCode}).`,
      );
    }

    try {
      const response = await fetch(baseUrl);
      if (response.ok) {
        return;
      }
    } catch {
      // The server is still starting.
    }

    await delay(500);
  }

  throw new Error("Timed out waiting for the Next.js test server.");
}

function stopServer() {
  if (server.exitCode !== null || server.pid === undefined) {
    return;
  }

  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], {
      stdio: "ignore",
    });
    return;
  }

  process.kill(-server.pid, "SIGTERM");
}

let exitCode = 1;

try {
  await waitForServer();

  const tests = spawn(process.execPath, [playwrightCli, "test"], {
    stdio: "inherit",
  });

  exitCode = await new Promise((resolve, reject) => {
    tests.once("error", reject);
    tests.once("exit", (code) => resolve(code ?? 1));
  });
} finally {
  stopServer();
}

process.exit(exitCode);
