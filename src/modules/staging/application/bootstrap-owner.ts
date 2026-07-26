import { createHash } from "node:crypto";

export type BootstrapOwnerInput = Readonly<{
  name: string;
  email: string;
  password: string;
  operatorReference: string | null;
}>;

export type BootstrapOwnerResult = Readonly<{
  ownerId: string;
  name: string;
  email: string;
  createdAt: string;
}>;

export type CreatedAuthenticationUser = Readonly<{
  id: string;
  name: string;
  email: string;
}>;

export interface OwnerBootstrapStore {
  reserve(input: Readonly<{
    emailSha256: string;
    operatorReference: string | null;
    startedAt: string;
  }>): Promise<void>;
  complete(input: Readonly<{
    ownerId: string;
    completedAt: string;
  }>): Promise<void>;
}

export class OwnerBootstrapAlreadyCompletedError extends Error {
  constructor() {
    super("The initial Sartoria owner bootstrap has already been reserved or completed.");
    this.name = "OwnerBootstrapAlreadyCompletedError";
  }
}

function emailDigest(email: string): string {
  return createHash("sha256").update(email, "utf8").digest("hex");
}

export async function bootstrapOwner(
  input: BootstrapOwnerInput,
  dependencies: Readonly<{
    store: OwnerBootstrapStore;
    createAuthenticationUser: (
      input: Readonly<{ name: string; email: string; password: string }>,
    ) => Promise<CreatedAuthenticationUser>;
    now: () => Date;
  }>,
): Promise<BootstrapOwnerResult> {
  const normalizedName = input.name.trim();
  const normalizedEmail = input.email.trim().toLowerCase();
  const operatorReference = input.operatorReference?.trim() || null;
  const startedAt = dependencies.now().toISOString();

  await dependencies.store.reserve({
    emailSha256: emailDigest(normalizedEmail),
    operatorReference,
    startedAt,
  });

  const createdUser = await dependencies.createAuthenticationUser({
    name: normalizedName,
    email: normalizedEmail,
    password: input.password,
  });
  const completedAt = dependencies.now().toISOString();

  await dependencies.store.complete({
    ownerId: createdUser.id,
    completedAt,
  });

  return Object.freeze({
    ownerId: createdUser.id,
    name: createdUser.name,
    email: createdUser.email,
    createdAt: completedAt,
  });
}
