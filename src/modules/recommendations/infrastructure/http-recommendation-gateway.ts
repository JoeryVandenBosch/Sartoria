import type {
  RecommendationGateway,
  RecommendationGatewayInput,
  RecommendationProviderResult,
} from "@/modules/recommendations/application/recommendation-gateway";

const maximumProviderRequestBytes = 64 * 1_024;
const maximumProviderResponseBytes = 64 * 1_024;

export class RecommendationGatewayConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RecommendationGatewayConfigurationError";
  }
}

export type HttpRecommendationGatewayConfiguration = Readonly<{
  url: URL;
  secret: string;
  provider: string;
  model: string | null;
  timeoutMilliseconds: number;
}>;

export function readHttpRecommendationGatewayConfiguration(): HttpRecommendationGatewayConfiguration {
  const rawUrl = process.env.RECOMMENDATION_PROVIDER_URL?.trim();
  const secret = process.env.RECOMMENDATION_PROVIDER_SECRET?.trim();
  if (!rawUrl) {
    throw new RecommendationGatewayConfigurationError(
      "RECOMMENDATION_PROVIDER_URL is required in provider recommendation mode.",
    );
  }
  if (!secret || secret.length < 32) {
    throw new RecommendationGatewayConfigurationError(
      "RECOMMENDATION_PROVIDER_SECRET must contain at least 32 characters.",
    );
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new RecommendationGatewayConfigurationError(
      "RECOMMENDATION_PROVIDER_URL must be an absolute URL.",
    );
  }
  if (url.protocol !== "https:" && process.env.NODE_ENV === "production") {
    throw new RecommendationGatewayConfigurationError(
      "RECOMMENDATION_PROVIDER_URL must use HTTPS in production.",
    );
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new RecommendationGatewayConfigurationError(
      "RECOMMENDATION_PROVIDER_URL must use HTTP or HTTPS.",
    );
  }

  const timeoutMilliseconds = Number(process.env.RECOMMENDATION_PROVIDER_TIMEOUT_MS ?? "15000");
  if (
    !Number.isSafeInteger(timeoutMilliseconds) ||
    timeoutMilliseconds < 1_000 ||
    timeoutMilliseconds > 60_000
  ) {
    throw new RecommendationGatewayConfigurationError(
      "RECOMMENDATION_PROVIDER_TIMEOUT_MS must be between 1000 and 60000 milliseconds.",
    );
  }

  return Object.freeze({
    url,
    secret,
    provider: process.env.RECOMMENDATION_PROVIDER_NAME?.trim() || "external",
    model: process.env.RECOMMENDATION_PROVIDER_MODEL?.trim() || null,
    timeoutMilliseconds,
  });
}

export class HttpRecommendationGateway implements RecommendationGateway {
  constructor(private readonly configuration: HttpRecommendationGatewayConfiguration) {}

  async generate(input: RecommendationGatewayInput): Promise<RecommendationProviderResult> {
    const body = JSON.stringify(input);
    if (Buffer.byteLength(body, "utf8") > maximumProviderRequestBytes) {
      throw new Error("Recommendation provider request exceeded the configured size limit.");
    }

    const response = await fetch(this.configuration.url, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${this.configuration.secret}`,
        "content-type": "application/json",
      },
      body,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(this.configuration.timeoutMilliseconds),
    });

    if (!response.ok) {
      throw new Error(`Recommendation provider returned HTTP ${response.status}.`);
    }

    const declaredLength = Number(response.headers.get("content-length") ?? "0");
    if (declaredLength > maximumProviderResponseBytes) {
      throw new Error("Recommendation provider response exceeded the configured size limit.");
    }

    const text = await response.text();
    if (Buffer.byteLength(text, "utf8") > maximumProviderResponseBytes) {
      throw new Error("Recommendation provider response exceeded the configured size limit.");
    }

    let output: unknown;
    try {
      output = JSON.parse(text) as unknown;
    } catch {
      throw new Error("Recommendation provider returned invalid JSON.");
    }

    return Object.freeze({
      output,
      provider: this.configuration.provider,
      model: this.configuration.model,
    });
  }
}
