export type RecommendationFormState = Readonly<{
  status: "idle" | "error";
  message: string;
  fieldErrors: Readonly<Record<string, readonly string[] | undefined>>;
}>;

export const initialRecommendationFormState: RecommendationFormState = Object.freeze({
  status: "idle",
  message: "",
  fieldErrors: {},
});
