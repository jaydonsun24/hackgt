export class StageError extends Error {
  stage: string;

  constructor(stage: string, message: string) {
    super(message);
    this.name = "StageError";
    this.stage = stage;
  }
}

export function asStageError(error: unknown, fallbackStage: string): StageError {
  if (error instanceof StageError) return error;
  if (typeof error === "object" && error && "stage" in error && "message" in error) {
    const stage = (error as { stage: unknown }).stage;
    const message = (error as { message: unknown }).message;
    if (typeof stage === "string" && typeof message === "string" && message.trim()) {
      return new StageError(stage, message);
    }
  }
  if (error instanceof Error && error.message.trim()) return new StageError(fallbackStage, error.message);
  return new StageError(fallbackStage, "Something went wrong. Try again.");
}
