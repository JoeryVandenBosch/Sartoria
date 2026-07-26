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

export type OwnerBootstrapAudit = Readonly<{
  ownerId: string;
  emailSha256: string;
  operatorReference: string | null;
  createdAt: string;
}>;

export type OwnerBootstrapOperation<Result> = Readonly<{
  result: Result;
  audit: OwnerBootstrapAudit;
}>;

export interface OwnerBootstrapStore {
  runOnce<Result>(
    operation: () => Promise<OwnerBootstrapOperation<Result>>,
  ): Promise<Result>;
}

export class OwnerBootstrapAlreadyCompletedError extends Error {
  constructor() {
    super("The initial Sartoria owner bootstrap has already been completed.");
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

  return dependencies.store.runOnce(async () => {
    const createdUser = await dependencies.createAuthenticationUser({
      name: normalizedName,
      email: normalizedEmail,
      password: input.password,
    });
    const createdAt = dependencies.now().toISOString();

    return {
      result: Object.freeze({
        ownerId: createdUser.id,
        name: createdUser.name,
        email: createdUser.email,
        createdAt,
      }),
      audit: Object.freeze({
        ownerId: createdUser.id,
        emailSha256: emailDigest(normalizedEmail),
        operatorReference,
        createdAt,
      }),
    };
  });
}
