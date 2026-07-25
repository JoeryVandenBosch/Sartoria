import { describe, expect, it } from "vitest";

import { verifyBearerToken } from "@/lib/security/internal-token";

const token = "0123456789abcdef0123456789abcdef";

describe("internal bearer token verification", () => {
  it("accepts the exact configured token", () => {
    expect(verifyBearerToken(`Bearer ${token}`, token)).toBe(true);
  });

  it("rejects missing, short, malformed, and incorrect credentials", () => {
    expect(verifyBearerToken(null, token)).toBe(false);
    expect(verifyBearerToken(`Basic ${token}`, token)).toBe(false);
    expect(verifyBearerToken("Bearer incorrect", token)).toBe(false);
    expect(verifyBearerToken(`Bearer ${token}`, "short")).toBe(false);
  });
});
