import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth/auth";
import { createDatabasePool } from "@/lib/database/database-session";
import { getPostgresPool } from "@/lib/database/postgres-pool";
import { verifyBearerToken } from "@/lib/security/internal-token";
import {
  bootstrapOwner,
  OwnerBootstrapAlreadyCompletedError,
  OwnerBootstrapValidationError,
} from "@/modules/staging/application/bootstrap-owner";
import {
  OwnerBootstrapConfigurationError,
  readOwnerBootstrapConfiguration,
} from "@/modules/staging/infrastructure/owner-bootstrap-configuration";
import {
  OwnerBootstrapStateError,
  PostgresOwnerBootstrapStore,
} from "@/modules/staging/infrastructure/postgres-owner-bootstrap-store";
import {
  ownerBootstrapRequestSchema,
  parseCreatedAuthenticationUser,
} from "@/modules/staging/transport/owner-bootstrap-schema";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<NextResponse> {
  let configuration;
  try {
    configuration = readOwnerBootstrapConfiguration();
  } catch (error) {
    if (error instanceof OwnerBootstrapConfigurationError) {
      return NextResponse.json({ error: "Identity bootstrap is misconfigured." }, { status: 503 });
    }
    throw error;
  }

  if (!configuration.enabled || !configuration.token) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  if (!verifyBearerToken(request.headers.get("authorization"), configuration.token)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request." }, { status: 400 });
  }

  const parsed = ownerBootstrapRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid identity bootstrap request.", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const result = await bootstrapOwner(
      {
        ...parsed.data,
        operatorReference: parsed.data.operatorReference ?? null,
      },
      {
        store: new PostgresOwnerBootstrapStore(createDatabasePool(getPostgresPool())),
        createAuthenticationUser: async (input) => {
          const response: unknown = await auth.api.createUser({
            body: {
              email: input.email,
              name: input.name,
              password: input.password,
              role: "user",
            },
          });
          return parseCreatedAuthenticationUser(response);
        },
        now: () => new Date(),
      },
    );

    return NextResponse.json(
      {
        owner: result.owner,
        isolationUser: result.isolationUser,
        createdAt: result.createdAt,
        bootstrap: "completed",
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof OwnerBootstrapAlreadyCompletedError) {
      return NextResponse.json(
        { error: "Identity bootstrap is already reserved or completed." },
        { status: 409 },
      );
    }
    if (error instanceof OwnerBootstrapValidationError) {
      return NextResponse.json({ error: "Identity bootstrap validation failed." }, { status: 400 });
    }
    if (error instanceof OwnerBootstrapStateError) {
      console.error("Identity bootstrap state failure.", error.name);
      return NextResponse.json(
        { error: "Identity bootstrap state requires operator review." },
        { status: 500 },
      );
    }

    console.error(
      "Identity bootstrap failed.",
      error instanceof Error ? error.name : "UnknownError",
    );
    return NextResponse.json({ error: "Identity bootstrap failed." }, { status: 500 });
  }
}
