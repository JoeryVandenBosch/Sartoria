import { createHash, timingSafeEqual } from "node:crypto";

function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

export function verifyBearerToken(
  authorizationHeader: string | null,
  expectedToken: string | undefined,
): boolean {
  const expected = expectedToken?.trim();
  if (!expected || expected.length < 32 || !authorizationHeader?.startsWith("Bearer ")) {
    return false;
  }

  const supplied = authorizationHeader.slice("Bearer ".length).trim();
  if (!supplied) {
    return false;
  }

  return timingSafeEqual(digest(supplied), digest(expected));
}
