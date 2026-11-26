export function evaluateConcurrency({ responses, requestCount, creationEventCount }) {
  const statuses = responses.map(({ status }) => status).sort((a, b) => a - b);
  const [first, second] = responses;
  const sameRequest = responses.length === 2
    && typeof first.id === "string" && first.id.length > 0 && first.id === second.id;
  const passed = statuses.length === 2 && statuses[0] === 200 && statuses[1] === 201
    && sameRequest && requestCount === 1 && creationEventCount === 1;

  return {
    status: passed ? "pass" : "fail",
    httpStatuses: statuses,
    sameRequest,
    requestCount,
    creationEventCount,
  };
}
