import { jest } from "@jest/globals";
import { withRetry, HttpError } from "./retry.js";

describe("HttpError", () => {
  it("has correct status and message", () => {
    const err = new HttpError(429, "rate limited");
    expect(err.status).toBe(429);
    expect(err.message).toBe("rate limited");
    expect(err instanceof Error).toBe(true);
  });
});

describe("withRetry", () => {
  it("resolves immediately on success", async () => {
    const fn = jest.fn<() => Promise<string>>().mockResolvedValue("ok");
    const result = await withRetry(fn);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on HTTP 429 and succeeds on second attempt", async () => {
    const fn = jest.fn<() => Promise<string>>()
      .mockRejectedValueOnce(new HttpError(429, "rate limited"))
      .mockResolvedValueOnce("ok");
    const result = await withRetry(fn, { delayMs: 0 });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("retries on network TypeError and succeeds", async () => {
    const fn = jest.fn<() => Promise<string>>()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce("ok");
    const result = await withRetry(fn, { delayMs: 0 });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does NOT retry on 404 HttpError", async () => {
    const fn = jest.fn<() => Promise<string>>()
      .mockRejectedValue(new HttpError(404, "not found"));
    await expect(withRetry(fn, { delayMs: 0 })).rejects.toThrow("not found");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("does NOT retry on plain Error", async () => {
    const fn = jest.fn<() => Promise<string>>()
      .mockRejectedValue(new Error("bad credentials"));
    await expect(withRetry(fn, { delayMs: 0 })).rejects.toThrow("bad credentials");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("throws after maxAttempts exhausted", async () => {
    const fn = jest.fn<() => Promise<string>>()
      .mockRejectedValue(new HttpError(429, "still limited"));
    await expect(withRetry(fn, { maxAttempts: 3, delayMs: 0 })).rejects.toThrow("still limited");
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
