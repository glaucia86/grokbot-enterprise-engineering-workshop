------------------------ MODULE ProcurementApproval ------------------------
EXTENDS Integers, FiniteSets

CONSTANTS Workers, Requests, Keys, Allocated, Amount, LockBudget, None

VARIABLES
    committed,
    reqStatus,
    commitments,
    audit,
    idempotencyKeys,
    workerPhase,
    workerReq,
    workerKey,
    observedCommitted

vars == <<
    committed,
    reqStatus,
    commitments,
    audit,
    idempotencyKeys,
    workerPhase,
    workerReq,
    workerKey,
    observedCommitted
>>

Init ==
    /\ committed = 0
    /\ reqStatus = [r \in Requests |-> "PENDING"]
    /\ commitments = {}
    /\ audit = {}
    /\ idempotencyKeys = [k \in Keys |-> None]
    /\ workerPhase = [w \in Workers |-> "idle"]
    /\ workerReq = [w \in Workers |-> None]
    /\ workerKey = [w \in Workers |-> None]
    /\ observedCommitted = [w \in Workers |-> 0]

StartApproval(w, r, k) ==
    /\ workerPhase[w] = "idle"
    /\ workerPhase' = [workerPhase EXCEPT ![w] = "started"]
    /\ workerReq' = [workerReq EXCEPT ![w] = r]
    /\ workerKey' = [workerKey EXCEPT ![w] = k]
    /\ UNCHANGED <<committed, reqStatus, commitments, audit, idempotencyKeys, observedCommitted>>

\* Defective unserialized path (models starter TOCTOU read-check-update without FOR UPDATE)
ReadBudgetUnserialized(w) ==
    /\ ~LockBudget
    /\ workerPhase[w] = "started"
    /\ LET r == workerReq[w] IN
       IF reqStatus[r] = "PENDING" /\ committed + Amount <= Allocated
       THEN /\ observedCommitted' = [observedCommitted EXCEPT ![w] = committed]
            /\ workerPhase' = [workerPhase EXCEPT ![w] = "checked"]
       ELSE /\ workerPhase' = [workerPhase EXCEPT ![w] = "rejected"]
            /\ UNCHANGED observedCommitted
    /\ UNCHANGED <<committed, reqStatus, commitments, audit, idempotencyKeys, workerReq, workerKey>>

CommitUnserialized(w) ==
    /\ ~LockBudget
    /\ workerPhase[w] = "checked"
    /\ LET r == workerReq[w] IN
       /\ committed' = committed + Amount
       /\ reqStatus' = [reqStatus EXCEPT ![r] = "APPROVED"]
       /\ commitments' = commitments \cup {r}
       /\ audit' = audit \cup {r}
       /\ workerPhase' = [workerPhase EXCEPT ![w] = "done"]
    /\ UNCHANGED <<idempotencyKeys, workerReq, workerKey, observedCommitted>>

\* Reference ACID locked path (models SELECT ... FOR UPDATE + CHECK + decision_idempotency_keys)
AtomicLockedApprove(w) ==
    /\ LockBudget
    /\ workerPhase[w] = "started"
    /\ LET r == workerReq[w]
           k == workerKey[w] IN
       IF idempotencyKeys[k] # None THEN
           IF idempotencyKeys[k] = r THEN
               \* Safe idempotent replay (INV-03): no budget, commitment, or audit mutation
               /\ workerPhase' = [workerPhase EXCEPT ![w] = "done"]
               /\ UNCHANGED <<committed, reqStatus, commitments, audit, idempotencyKeys, workerReq, workerKey, observedCommitted>>
           ELSE
               \* Payload conflict (INV-04): reject without mutating state
               /\ workerPhase' = [workerPhase EXCEPT ![w] = "conflict"]
               /\ UNCHANGED <<committed, reqStatus, commitments, audit, idempotencyKeys, workerReq, workerKey, observedCommitted>>
       ELSE IF reqStatus[r] = "PENDING" /\ committed + Amount <= Allocated THEN
           \* Atomic commit (INV-01, INV-02, INV-08, INV-09)
           /\ committed' = committed + Amount
           /\ reqStatus' = [reqStatus EXCEPT ![r] = "APPROVED"]
           /\ commitments' = commitments \cup {r}
           /\ audit' = audit \cup {r}
           /\ idempotencyKeys' = [idempotencyKeys EXCEPT ![k] = r]
           /\ workerPhase' = [workerPhase EXCEPT ![w] = "committed_awaiting_ack"]
           /\ UNCHANGED <<workerReq, workerKey, observedCommitted>>
       ELSE
           \* Insufficient budget or terminal request (INV-01, INV-07): clean rollback
           /\ workerPhase' = [workerPhase EXCEPT ![w] = "rejected"]
           /\ UNCHANGED <<committed, reqStatus, commitments, audit, idempotencyKeys, workerReq, workerKey, observedCommitted>>

DeliverAck(w) ==
    /\ workerPhase[w] = "committed_awaiting_ack"
    /\ workerPhase' = [workerPhase EXCEPT ![w] = "done"]
    /\ UNCHANGED <<committed, reqStatus, commitments, audit, idempotencyKeys, workerReq, workerKey, observedCommitted>>

\* Models lost HTTP response after commit followed by client retry using the same key (INV-10)
LoseResponseAndRetry(w) ==
    /\ workerPhase[w] = "committed_awaiting_ack"
    /\ workerPhase' = [workerPhase EXCEPT ![w] = "started"]
    /\ UNCHANGED <<committed, reqStatus, commitments, audit, idempotencyKeys, workerReq, workerKey, observedCommitted>>

Next ==
    \/ \E w \in Workers, r \in Requests, k \in Keys: StartApproval(w, r, k)
    \/ \E w \in Workers: ReadBudgetUnserialized(w)
    \/ \E w \in Workers: CommitUnserialized(w)
    \/ \E w \in Workers: AtomicLockedApprove(w)
    \/ \E w \in Workers: DeliverAck(w)
    \/ \E w \in Workers: LoseResponseAndRetry(w)

Spec == Init /\ [][Next]_vars

TypeOK ==
    /\ committed \in Nat
    /\ reqStatus \in [Requests -> {"PENDING", "APPROVED"}]
    /\ commitments \subseteq Requests
    /\ audit \subseteq Requests
    /\ idempotencyKeys \in [Keys -> (Requests \cup {None})]
    /\ workerPhase \in [Workers -> {"idle", "started", "checked", "committed_awaiting_ack", "done", "rejected", "conflict"}]
    /\ workerReq \in [Workers -> (Requests \cup {None})]
    /\ workerKey \in [Workers -> (Keys \cup {None})]
    /\ observedCommitted \in [Workers -> Nat]

\* INV-01: Committed funds never exceed allocated budget
BudgetNotExceeded == committed <= Allocated

\* INV-02: Available budget never becomes negative
NonNegativeAvailability == (Allocated - committed) >= 0

\* INV-01 & INV-09: Committed balance reconciles 1:1 with approved requests and commitments
CommitmentMatchesApprovedSum ==
    LET approved == {r \in Requests : reqStatus[r] = "APPROVED"} IN
    /\ commitments = approved
    /\ committed = Cardinality(approved) * Amount

\* INV-08 & INV-09: Exactly one approval audit record per approved request
AuditMatchesApproved ==
    audit = {r \in Requests : reqStatus[r] = "APPROVED"}

\* INV-03: Every recorded idempotency key points to a durably approved, committed, audited request
IdempotentReplayConsistent ==
    \A k \in Keys :
        idempotencyKeys[k] # None =>
            /\ reqStatus[idempotencyKeys[k]] = "APPROVED"
            /\ idempotencyKeys[k] \in commitments
            /\ idempotencyKeys[k] \in audit

=============================================================================
