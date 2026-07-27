import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Portability guard for the native client.
 *
 * ADR 0012 records that Sartoria is a native application served by this
 * repository's API, and that the domain and application layers move to the
 * native client unchanged. That is only true while those layers hold no
 * framework, rendering, or web-platform concern.
 *
 * This guard makes the rule load-bearing rather than stylistic: an import that
 * would break the native client fails here, not during a React Native bundle
 * months from now. The affordability of ADR 0012 rests entirely on this
 * property holding, so it is asserted rather than trusted.
 */

const FORBIDDEN_IMPORTS = [
  "react",
  "react-dom",
  "next",
  "server-only",
] as const;

const FORBIDDEN_GLOBALS = [
  "window.",
  "document.",
  "localStorage",
  "sessionStorage",
  "navigator.",
] as const;

async function typescriptFilesUnder(directory: string): Promise<readonly string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const full = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await typescriptFilesUnder(full)));
    } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      files.push(full);
    }
  }

  return files;
}

async function portableFiles(): Promise<readonly string[]> {
  const moduleRoot = path.join(process.cwd(), "src", "modules");
  const modules = await readdir(moduleRoot, { withFileTypes: true });
  const files: string[] = [];

  for (const moduleEntry of modules) {
    if (!moduleEntry.isDirectory()) continue;

    for (const layer of ["domain", "application"]) {
      try {
        files.push(...(await typescriptFilesUnder(path.join(moduleRoot, moduleEntry.name, layer))));
      } catch {
        // A module without that layer is acceptable.
      }
    }
  }

  return files;
}

describe("native client portability", () => {
  it("finds the portable layers, so the guard cannot pass vacuously", async () => {
    expect((await portableFiles()).length).toBeGreaterThan(20);
  });

  it("no domain or application module imports a framework", async () => {
    const offenders: string[] = [];

    for (const file of await portableFiles()) {
      const contents = await readFile(file, "utf8");

      for (const packageName of FORBIDDEN_IMPORTS) {
        if (
          contents.includes(`from "${packageName}"`) ||
          contents.includes(`from "${packageName}/`) ||
          contents.includes(`require("${packageName}")`)
        ) {
          offenders.push(`${path.relative(process.cwd(), file)} -> ${packageName}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it("no domain or application module reaches for a browser global", async () => {
    const offenders: string[] = [];

    for (const file of await portableFiles()) {
      const contents = await readFile(file, "utf8");

      for (const globalName of FORBIDDEN_GLOBALS) {
        if (contents.includes(globalName)) {
          offenders.push(`${path.relative(process.cwd(), file)} -> ${globalName}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
