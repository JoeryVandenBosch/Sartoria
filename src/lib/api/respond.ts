import { NextResponse } from "next/server";
import type { ZodError } from "zod";

import { getApiUserId } from "@/lib/auth/current-user";

/**
 * Bounded response shapes for the versioned API (ADR 0013 §6).
 *
 * No response carries an exception message, a stack, a query, or an internal
 * identifier. Validation failures name only fields the client already sent.
 */

export function unauthorised(): NextResponse {
  return NextResponse.json({ error: "Authentication required." }, { status: 401 });
}

export function notFound(): NextResponse {
  // Identical for "absent" and "belongs to another owner".
  return NextResponse.json({ error: "Not found." }, { status: 404 });
}

export function invalid(error: ZodError): NextResponse {
  const fieldErrors: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "_";
    (fieldErrors[key] ??= []).push(issue.message);
  }

  return NextResponse.json({ error: "Invalid request.", fieldErrors }, { status: 400 });
}

export function malformedJson(): NextResponse {
  return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
}

/**
 * Resolves the owner for an API route, or produces the 401 the caller returns.
 * Keeps every route's authentication handling to a single line.
 */
export async function requireOwner(): Promise<
  { readonly ownerId: string; readonly refusal?: undefined } | { readonly refusal: NextResponse }
> {
  const ownerId = await getApiUserId();
  return ownerId ? { ownerId } : { refusal: unauthorised() };
}

export async function readJson(request: Request): Promise<unknown | undefined> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}
