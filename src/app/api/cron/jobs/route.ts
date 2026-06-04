import { NextResponse, type NextRequest } from "next/server";
import { drainJobs } from "@/lib/jobs";
import "@/lib/jobs-handlers";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  const result = await drainJobs(25);
  return NextResponse.json(result);
}

export const POST = GET;
export const config = { runtime: "nodejs" };
