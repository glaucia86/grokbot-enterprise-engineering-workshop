import { authenticated, labJson } from "../../../server/http/lab-responses";
import { requests } from "../../../server/procurement/requests";

export function GET() {
  return authenticated(async (actor) => {
    const costCenters = await requests.listCostCenters(actor);
    return labJson({ costCenters });
  });
}
