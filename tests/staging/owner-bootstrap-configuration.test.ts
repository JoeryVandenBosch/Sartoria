import { describe, expect, it } from "vitest";

import {
  OwnerBootstrapConfigurationError,
  readOwnerBootstrapConfiguration,
} from "@/modules/staging/infrastructure/owner-bootstrap-configuration";

describe("owner bootstrap configuration", () => {
  it("is hidden when bootstrap is disabled", () => {
    expect(readOwnerBootstrapConfiguration({})).toEqual({ enabled: false, token: null });
  });

  it("accepts a staging-only high-entropy bootstrap token", () => {
    const token = "a".repeat(64);
    expect(
      readOwnerBootstrapConfiguration({
        SARTORIA_DEPLOYMENT_ENV: "staging",
        SARTORIA_OWNER_BOOTSTRAP_ENABLED: "true",
        SARTORIA_OWNER_BOOTSTRAP_TOKEN: token,
      }),
    ).toEqual({ enabled: true, token });
  });

  it("rejects bootstrap outside staging", () => {
    expect(() =>
      readOwnerBootstrapConfiguration({
        SARTORIA_DEPLOYMENT_ENV: "production",
        SARTORIA_OWNER_BOOTSTRAP_ENABLED: "true",
        SARTORIA_OWNER_BOOTSTRAP_TOKEN: "a".repeat(64),
      }),
    ).toThrowError(OwnerBootstrapConfigurationError);
  });

  it("rejects a short bootstrap token", () => {
    expect(() =>
      readOwnerBootstrapConfiguration({
        SARTORIA_DEPLOYMENT_ENV: "staging",
        SARTORIA_OWNER_BOOTSTRAP_ENABLED: "true",
        SARTORIA_OWNER_BOOTSTRAP_TOKEN: "too-short",
      }),
    ).toThrow("at least 64 characters");
  });
});
