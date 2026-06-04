import { NextResponse, type NextRequest } from "next/server";

export function unauthorized(req: NextRequest) {
  return new NextResponse("Unauthorized", { status: 401 });
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function ok<T>(data: T) {
  return NextResponse.json({ data });
}
