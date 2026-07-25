export type StyleProfileFormState = Readonly<{
  status: "idle" | "error" | "success";
  message: string;
  fieldErrors: Readonly<Record<string, readonly string[]>>;
}>;

export const initialStyleProfileFormState: StyleProfileFormState = {
  status: "idle",
  message: "",
  fieldErrors: {},
};
