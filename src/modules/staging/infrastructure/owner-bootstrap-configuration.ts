export class OwnerBootstrapConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OwnerBootstrapConfigurationError";
  }
}

export type OwnerBootstrapConfiguration = Readonly<{
  enabled: boolean;
  token: string | null;
}>;

export function readOwnerBootstrapConfiguration(
  environment: NodeJS.ProcessEnv = process.env,
): OwnerBootstrapConfiguration {
  const enabled = environment.SARTORIA_OWNER_BOOTSTRAP_ENABLED?.trim() === "true";
  if (!enabled) {
    return Object.freeze({ enabled: false, token: null });
  }

  if (environment.SARTORIA_DEPLOYMENT_ENV?.trim() !== "staging") {
    throw new OwnerBootstrapConfigurationError(
      "Owner bootstrap can only be enabled when SARTORIA_DEPLOYMENT_ENV=staging.",
    );
  }

  const token = environment.SARTORIA_OWNER_BOOTSTRAP_TOKEN?.trim();
  if (!token || token.length < 64) {
    throw new OwnerBootstrapConfigurationError(
      "SARTORIA_OWNER_BOOTSTRAP_TOKEN must contain at least 64 characters when bootstrap is enabled.",
    );
  }

  return Object.freeze({ enabled: true, token });
}
