import {
  DEPLOYMENT_ENVIRONMENTS,
  type DeploymentEnvironment,
  type OperationalEvent,
} from "@/lib/observability/operational-event";
import { isReleaseIdentifier } from "@/lib/observability/build-operational-event";

/**
 * A sink receives already-validated envelopes. It is the only place permitted
 * to touch a transport, so no domain or application module ever depends on a
 * logging, metrics, or tracing library.
 *
 * A sink may be synchronous or asynchronous. It must not use exceptions for
 * control flow; the emitter contains failures either way.
 */
export interface OperationalEventSink {
  record(event: OperationalEvent): void | Promise<void>;
}

/**
 * Resolves the deployment environment from configuration.
 *
 * A configured value that is not recognised becomes `unknown` rather than being
 * passed through, so arbitrary configuration text can never reach a sink.
 */
export function resolveDeploymentEnvironment(
  configuredEnvironment: string | undefined = process.env.SARTORIA_DEPLOYMENT_ENV,
  nodeEnvironment: string | undefined = process.env.NODE_ENV,
): DeploymentEnvironment {
  const candidate = configuredEnvironment?.trim().toLowerCase();

  if (candidate) {
    return (DEPLOYMENT_ENVIRONMENTS as readonly string[]).includes(candidate)
      ? (candidate as DeploymentEnvironment)
      : "unknown";
  }

  switch (nodeEnvironment) {
    case "production":
      return "production";
    case "test":
      return "test";
    case "development":
      return "development";
    default:
      return "unknown";
  }
}

/**
 * Resolves the release identifier. A value failing the conservative pattern is
 * dropped, because a release label is never worth the risk of emitting
 * unvalidated configuration content.
 */
export function resolveRelease(
  configuredRelease: string | undefined = process.env.SARTORIA_RELEASE,
): string | undefined {
  const candidate = configuredRelease?.trim();

  return isReleaseIdentifier(candidate) ? candidate : undefined;
}
