import { describe, test, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { RateLimiter } from "./rate-limiter";

describe("RateLimiter", () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter();
  });

  it("should allow requests within capacity", () => {
    // Default capacity is 10 for "default" platform
    for (let i = 0; i < 10; i++) {
      expect(limiter.consume("default")).toBe(true);
    }
    expect(limiter.consume("default")).toBe(false);
  });

  it("should refill tokens over time", async () => {
    // Default refill rate is 1 token per second
    limiter.consume("default"); // 9 tokens left
    while(limiter.consume("default")); // 0 tokens left
    
    expect(limiter.canProceed("default")).toBe(false);
    
    // Wait 1.1s for at least 1 token to refill
    await new Promise(resolve => setTimeout(resolve, 1100));
    
    expect(limiter.canProceed("default")).toBe(true);
    expect(limiter.consume("default")).toBe(true);
  });

  it("should handle blocking", async () => {
    limiter.blockFor("default", 1); // Block for 1 second
    expect(limiter.canProceed("default")).toBe(false);
    
    await new Promise(resolve => setTimeout(resolve, 1100));
    expect(limiter.canProceed("default")).toBe(true);
  });

  it("should waitForToken", async () => {
    // Drain tokens
    while(limiter.consume("default"));
    
    const start = Date.now();
    await limiter.waitForToken("default");
    const elapsed = Date.now() - start;
    
    expect(elapsed).toBeGreaterThanOrEqual(1000); // Refill rate is 1/s
    expect(limiter.canProceed("default")).toBe(false); // Token consumed by waitForToken
  });
});