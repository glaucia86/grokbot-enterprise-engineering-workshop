import { purchaseRequestService } from "../../modules/procurement/application/requests";
import { postgresRequests } from "../../modules/procurement/infrastructure/postgres-requests";

export const requests = purchaseRequestService(postgresRequests);
