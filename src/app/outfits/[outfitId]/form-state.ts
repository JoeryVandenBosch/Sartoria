export type OutfitLifecycleFormState = Readonly<{
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors: Readonly<Record<string, readonly string[] | undefined>>;
}>;

export const initialOutfitLifecycleFormState: OutfitLifecycleFormState = {
  status: "idle",
  message: "",
  fieldErrors: {},
};
