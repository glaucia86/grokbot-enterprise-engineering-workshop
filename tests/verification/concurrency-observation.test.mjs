import assert from "node:assert/strict";
import test from "node:test";
import { evaluateConcurrency } from "../../scripts/concurrency-observation.mjs";

test("the invariant accepts one committed creation and an equivalent replay", () => {
  assert.deepEqual(evaluateConcurrency({
    responses: [{ status: 201, id: "synthetic-request" }, { status: 200, id: "synthetic-request" }],
    requestCount: 1,
    creationEventCount: 1,
  }), {
    status: "pass",
    httpStatuses: [200, 201],
    sameRequest: true,
    requestCount: 1,
    creationEventCount: 1,
  });
});

test("an illustrative duplicate observation fails the invariant", () => {
  assert.deepEqual(evaluateConcurrency({
    responses: [{ status: 201, id: "synthetic-request-1" }, { status: 201, id: "synthetic-request-2" }],
    requestCount: 2,
    creationEventCount: 2,
  }), {
    status: "fail",
    httpStatuses: [201, 201],
    sameRequest: false,
    requestCount: 2,
    creationEventCount: 2,
  });
});

test("one persisted request alone does not prove HTTP replay or audit integrity", () => {
  const responses = [{ status: 201, id: "synthetic-request" }, { status: 409 }];
  const result = evaluateConcurrency({ responses, requestCount: 1, creationEventCount: 1 });
  assert.equal(result.status, "fail");

  const accepted = [{ status: 200, id: "synthetic-request" }, { status: 201, id: "synthetic-request" }];
  assert.equal(evaluateConcurrency({
    responses: accepted, requestCount: 1, creationEventCount: 2,
  }).status, "fail");
});
