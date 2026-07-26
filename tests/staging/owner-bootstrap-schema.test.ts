import { describe, expect, it } from "vitest";

import {
  ownerBootstrapRequestSchema,
  parseCreatedAuthenticationUser,
} from "@/modules/staging/transport/owner-bootstrap-schema";

const validRequest = {
  owner: {
    name: "  Sartoria Owner  ",
    email: "  OWNER@EXAMPLE.COM ",
    password: "correct horse battery staple",
  },
  isolationUser: {
    name: "  Isolation User  ",
    email: "  ISOLATION@EXAMPLE.COM ",
    password: "another correct horse battery staple",
  },
  operatorReference: " change-17 ",
};

describe("owner bootstrap transport", () => {
  it("normalises two bounded staging identities", () => {
    expect(ownerBootstrapRequestSchema.parse(validRequest)).toEqual({
      owner: {
        name: "Sartoria Owner",
        email: "owner@example.com",
        password: "correct horse battery staple",
      },
      isolationUser: {
        name: "Isolation User",
        email: "isolation@example.com",
        password: "another correct horse battery staple",
      },
      operatorReference: "change-17",
    });
  });

  it("rejects unknown fields, weak passwords, and duplicate emails", () => {
    expect(
      ownerBootstrapRequestSchema.safeParse({
        ...validRequest,
        owner: { ...validRequest.owner, password: "short", role: "admin" },
      }).success,
    ).toBe(false);
    expect(
      ownerBootstrapRequestSchema.safeParse({
        ...validRequest,
        isolationUser: { ...validRequest.isolationUser, email: "owner@example.com" },
      }).success,
    ).toBe(false);
  });

  it("accepts direct and wrapped Better Auth user responses", () => {
    const user = { id: "owner-1", name: "Owner", email: "owner@example.com" };
    expect(parseCreatedAuthenticationUser(user)).toEqual(user);
    expect(parseCreatedAuthenticationUser({ user })).toEqual(user);
    expect(parseCreatedAuthenticationUser({ data: user })).toEqual(user);
  });
});
