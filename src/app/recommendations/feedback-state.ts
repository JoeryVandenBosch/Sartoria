export type RecommendationFeedbackState = Readonly<{
  status: "idle" | "success" | "error";
  message: string;
}>;

export const initialRecommendationFeedbackState: RecommendationFeedbackState = Object.freeze({
  status: "idle",
  message: "",
});
