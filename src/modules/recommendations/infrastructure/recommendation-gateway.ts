import type { RecommendationGateway } from "@/modules/recommendations/application/recommendation-gateway";

import {
  HttpRecommendationGateway,
  readHttpRecommendationGatewayConfiguration,
} from "./http-recommendation-gateway";

export function getRecommendationGateway(): RecommendationGateway | null {
  const mode = process.env.SARTORIA_RECOMMENDATION_MODE?.trim() || "fallback";
  if (mode === "fallback") {
    return null;
  }
  if (mode === "provider") {
    return new HttpRecommendationGateway(readHttpRecommendationGatewayConfiguration());
  }
  throw new Error(`Unsupported SARTORIA_RECOMMENDATION_MODE: ${mode}`);
}
