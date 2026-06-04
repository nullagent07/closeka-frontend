import "server-only";
import { createHmac } from "node:crypto";

export function clientPortalToken(closePeriodId: string): string {
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new Error("CRON_SECRET is not set");
  const sig = createHmac("sha256", secret).update(closePeriodId).digest("hex");
  return `${closePeriodId}.${sig}`;
}
