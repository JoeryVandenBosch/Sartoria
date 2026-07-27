export type WardrobeItemFormState = Readonly<{
  status: "idle" | "error" | "success";
  message: string;
  fieldErrors: Readonly<Record<string, readonly string[] | undefined>>;
  /**
   * Identifier of the item created by the most recent successful submission.
   *
   * Present only on success. The creation form uses it to attach an optional
   * image after the item exists, since media is owner- and item-scoped and
   * cannot be stored before there is an item to attach it to.
   */
  createdItemId?: string;
  /** Increments per submission so the client can distinguish repeat successes. */
  submissionId?: number;
}>;

export const initialWardrobeItemFormState: WardrobeItemFormState = {
  status: "idle",
  message: "",
  fieldErrors: {},
};
