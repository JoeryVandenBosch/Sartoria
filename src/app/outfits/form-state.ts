export type OutfitFormState = Readonly<{
  status: "idle" | "error";
  message: string;
  fieldErrors: Readonly<Record<string, readonly string[] | undefined>>;
}>;

export const initialOutfitFormState: OutfitFormState = {
  status: "idle",
  message: "",
  fieldErrors: {},
};
