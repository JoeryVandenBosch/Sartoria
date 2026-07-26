import { describe, expect, it } from "vitest";

import {
  ownerBootstrapRequestSchema,
  parseCreatedAuthenticationUser,
} from "@/modules/staging/transport/owner-bootstrap-schema";

describe("owner bootstrap transport", () => {
  it("normalises a bounded bootstrap request", () => {
    expect(
      ownerBootstrapRequestSchema.parse({
        name: "  Sartoria Owner  ",
        email: "  OWNER@EXAMPLE.COM ",
        password: "correct horse battery staple",
        operatorReference: " change-17 ",
      }),
    ).toEqual({
      name: "Sartoria Owner",
      email: "owner@example.com",
      password: "correct horse battery staple",
      operatorReference: "change-17",
    });
  });

  it("rejects unknown fields and weak passwords", () => {
    const result = ownerBootstrapRequestSchema.safeParse({
      name: "Owner",
      email: "owner@example.com",
      password: "short",
      role: "admin",
    });
    expect(result.success).toBe(false);
  });

  it("accepts direct and wrapped Better Auth user responses", () => {
    const user = { id: "owner-1", name: "Owner", email: "owner@example.com" };
    expect(parseCreatedAuthenticationUser(user)).toEqual(user);
    expect(parseCreatedAuthenticationUser({ user })).toEqual(user);
    expect(parseCreatedAuthenticationUser({ data: user })).toEqual(user);
  });
});
