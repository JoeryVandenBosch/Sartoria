import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";

import { assertDatabaseConfigured, getPostgresPool } from "@/lib/database/postgres-pool";

const developmentSecret = "sartoria-development-auth-secret-not-for-production";

export class AuthenticationConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthenticationConfigurationError";
  }
}

export function assertProductionAuthenticationConfigured(): void {
  assertDatabaseConfigured();

  if (!process.env.BETTER_AUTH_SECRET?.trim()) {
    throw new AuthenticationConfigurationError(
      "BETTER_AUTH_SECRET is required for production authentication.",
    );
  }

  if (!process.env.BETTER_AUTH_URL?.trim()) {
    throw new AuthenticationConfigurationError(
      "BETTER_AUTH_URL is required for production authentication.",
    );
  }
}

export function assertAuthenticationRuntimeConfigured(): void {
  const authenticationMode = process.env.SARTORIA_AUTH_MODE;

  if (
    authenticationMode &&
    authenticationMode !== "development" &&
    authenticationMode !== "better-auth"
  ) {
    throw new AuthenticationConfigurationError(
      `Unsupported SARTORIA_AUTH_MODE: ${authenticationMode}`,
    );
  }

  if (process.env.NODE_ENV === "production" || authenticationMode === "better-auth") {
    assertProductionAuthenticationConfigured();
  }
}

const configuredBaseUrl = process.env.BETTER_AUTH_URL?.trim();
const baseUrlConfiguration = configuredBaseUrl ? { baseURL: configuredBaseUrl } : {};

export const auth = betterAuth({
  ...baseUrlConfiguration,
  appName: "Sartoria",
  database: getPostgresPool(),
  secret: process.env.BETTER_AUTH_SECRET?.trim() || developmentSecret,
  emailAndPassword: {
    disableSignUp: true,
    enabled: true,
    maxPasswordLength: 128,
    minPasswordLength: 12,
    revokeSessionsOnPasswordReset: true,
  },
  plugins: [
    admin({
      adminRoles: ["admin"],
      defaultRole: "user",
    }),
    nextCookies(),
  ],
  telemetry: {
    enabled: false,
  },
});
