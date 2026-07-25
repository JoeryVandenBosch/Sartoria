export type WardrobeItemFormState = Readonly<{
  status: "idle" | "error" | "success";
  message: string;
  fieldErrors: Readonly<Record<string, readonly string[] | undefined>>;
}>;

export const initialWardrobeItemFormState: WardrobeItemFormState = {
  status: "idle",
  message: "",
  fieldErrors: {},
};
