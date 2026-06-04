import "server-only";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export class AuthError extends Error {
  status: number;
  constructor(message = "Unauthorized", status = 401) {
    super(message);
    this.status = status;
  }
}

export async function requireUser() {
  const { userId, orgId } = await auth();
  if (!userId) throw new AuthError();
  return { userId, orgId };
}

export function authErrorResponse(err: unknown): NextResponse {
  if (err instanceof AuthError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  return NextResponse.json({ error: "Internal error" }, { status: 500 });
}
