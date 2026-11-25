import { listLabIdentities } from "../../../server/auth/lab-session";
import { isLabEnabled } from "../../../server/db/lab-config.mjs";
import { checkLabDatabase } from "../../../server/db/lab-database";

export const runtime = "nodejs";

export async function GET() {
  try {
    await checkLabDatabase();
    if (isLabEnabled() && (await listLabIdentities()).length === 0) {
      return Response.json({ status: "unavailable" }, { status: 503 });
    }
    return Response.json({ status: "ready" });
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503 });
  }
}
