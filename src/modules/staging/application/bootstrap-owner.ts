import { createHash } from "node:crypto";

export type BootstrapIdentityInput = Readonly<{
  name: string;
  email: string;
  password: string;
}>;

export type BootstrapOwnerInput = Readonly<{
  owner: BootstrapIdentityInput;
  isolationUser: BootstrapIdentityInput;
  operatorReference: string | null;
}>;

export type CreatedAuthenticationUser = Readonly<{
  id: string;
  name: string;
  email: string;
}>;

export type BootstrapOwnerResult = Readonly<{
  owner: CreatedAuthenticationUser;
  isolationUser: CreatedAuthenticationUser;
  createdAt: string;
}>;

export interface OwnerBootstrapStore {
  reserve(input: Readonly<{
    ownerEmailSha256: string;
    isolationEmailSha256: string;
    operatorReference: string | null;
    startedAt: string;
  }>): Promise<void>;
  complete(input: Readonly<{
    ownerId: string;
    isolationUserId: string;
    completedAt: string;
  }>): Promise<void>;
}

export class OwnerBootstrapAlreadyCompletedError extends Error {
  constructor() {
    super("The initial Sartoria identity bootstrap has already been reserved or completed.");
    this.name = "OwnerBootstrapAlreadyCompletedError";
  }
}

export class OwnerBootstrapValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OwnerBootstrapValidationError";
  }
}

function normalizeIdentity(input: BootstrapIdentityInput): BootstrapIdentityInput {
  return Object.freeze({
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    password: input.password,
  });
}

function emailDigest(email: string): string {
  return createHash("sha256").update(email, "utf8").digest("hex");
}

export async function bootstrapOwner(
  input: BootstrapOwnerInput,
  dependencies: Readonly<{
    store: OwnerBootstrapStore;
    createAuthenticationUser: (input: BootstrapIdentityInput) => Promise<CreatedAuthenticationUser>;
    now: () => Date;
  }>,
): Promise<BootstrapOwnerResult> {
  const owner = normalizeIdentity(input.owner);
  const isolationUser = normalizeIdentity(input.isolationUser);
  if (owner.email === isolationUser.email) {
    throw new OwnerBootstrapValidationError(
      "Owner and isolation-test accounts must use different email addresses.",
    );
  }

  const operatorReference = input.operatorReference?.trim() || null;
  const startedAt = dependencies.now().toISOString();

  await dependencies.store.reserve({
    ownerEmailSha256: emailDigest(owner.email),
    isolationEmailSha256: emailDigest(isolationUser.email),
    operatorReference,
    startedAt,
  });

  const createdOwner = await dependencies.createAuthenticationUser(owner);
  const createdIsolationUser = await dependencies.createAuthenticationUser(isolationUser);
  if (createdOwner.id === createdIsolationUser.id) {
    throw new OwnerBootstrapValidationError(
      "Authentication returned the same identifier for both staging identities.",
    );
  }

  const completedAt = dependencies.now().toISOString();
  await dependencies.store.complete({
    ownerId: createdOwner.id,
    isolationUserId: createdIsolationUser.id,
    completedAt,
  });

  return Object.freeze({
    owner: createdOwner,
    isolationUser: createdIsolationUser,
    createdAt: completedAt,
  });
}
