import { checkLabDatabase } from "../../../server/db/lab-database";

export const runtime = "nodejs";

export async function GET() {
  try {
    await checkLabDatabase();
    return Response.json({ status: "ready" });
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503 });
  }
}
