import { z } from "zod";
import { switchLabIdentity } from "../../../../server/auth/lab-session";
import { isLabEnabled } from "../../../../server/db/lab-config.mjs";
import { apiError, hasSameOrigin, labJson, labOrigin, readJson } from "../../../../server/http/lab-responses";

const selection = z.strictObject({ identity: z.string().regex(/^[a-z0-9-]{1,64}$/) });

export async function POST(request: Request) {
  const origin = labOrigin(request);
  if (!isLabEnabled() || !origin) {
    return apiError("NOT_FOUND");
  }
  if (!hasSameOrigin(request)) return apiError("FORBIDDEN");

  const input = selection.safeParse(await readJson(request));
  if (!input.success) return apiError("INVALID_INPUT");

  try {
    const switched = await switchLabIdentity(input.data.identity, origin.startsWith("https:"));
    return switched ? labJson({ status: "selected" }) : apiError("INVALID_INPUT");
  } catch {
    return apiError("INTERNAL_ERROR");
  }
}
