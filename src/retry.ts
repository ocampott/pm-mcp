export class HttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "HttpError";
  }
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  { maxAttempts = 3, delayMs = 1000 }: { maxAttempts?: number; delayMs?: number } = {}
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const retryable =
        error instanceof TypeError ||
        (error instanceof HttpError && error.status === 429);
      if (!retryable || attempt === maxAttempts) throw error;
      await new Promise((r) => setTimeout(r, delayMs * attempt));
    }
  }
  throw lastError;
}
