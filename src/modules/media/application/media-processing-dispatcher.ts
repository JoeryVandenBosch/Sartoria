export interface MediaProcessingDispatcher {
  dispatch(input: Readonly<{ mediaId: string; ownerId: string }>): Promise<void>;
}
