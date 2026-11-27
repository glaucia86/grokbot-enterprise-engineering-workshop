------------------------ MODULE BoundedResourceReservation ------------------------
\* 06 — Reusable TLA+ Starter Template for Concurrent Resource / Budget Reservations
\* Run with TLC using two configs: LockResource = FALSE (expect exit 12 counterexample)
\* and LockResource = TRUE (expect exit 0 exhaustive bounded pass).
EXTENDS Integers, FiniteSets

CONSTANTS Workers, Items, Capacity, Cost, LockResource, None
VARIABLES used, approved, phase, target

vars == <<used, approved, phase, target>>

Init ==
    /\ used = 0
    /\ approved = {}
    /\ phase = [w \in Workers |-> "idle"]
    /\ target = [w \in Workers |-> None]

Start(w, i) ==
    /\ phase[w] = "idle"
    /\ phase' = [phase EXCEPT ![w] = "started"]
    /\ target' = [target EXCEPT ![w] = i]
    /\ UNCHANGED <<used, approved>>

CheckUnserialized(w) ==
    /\ ~LockResource /\ phase[w] = "started"
    /\ IF target[w] \notin approved /\ used + Cost <= Capacity
       THEN phase' = [phase EXCEPT ![w] = "checked"]
       ELSE phase' = [phase EXCEPT ![w] = "rejected"]
    /\ UNCHANGED <<used, approved, target>>

CommitUnserialized(w) ==
    /\ ~LockResource /\ phase[w] = "checked"
    /\ used' = used + Cost
    /\ approved' = approved \cup {target[w]}
    /\ phase' = [phase EXCEPT ![w] = "done"]
    /\ UNCHANGED target

AtomicCommit(w) ==
    /\ LockResource /\ phase[w] = "started"
    /\ IF target[w] \notin approved /\ used + Cost <= Capacity
       THEN /\ used' = used + Cost
            /\ approved' = approved \cup {target[w]}
            /\ phase' = [phase EXCEPT ![w] = "done"]
       ELSE /\ phase' = [phase EXCEPT ![w] = "rejected"]
            /\ UNCHANGED <<used, approved>>
    /\ UNCHANGED target

Next ==
    \/ \E w \in Workers, i \in Items: Start(w, i)
    \/ \E w \in Workers: CheckUnserialized(w)
    \/ \E w \in Workers: CommitUnserialized(w)
    \/ \E w \in Workers: AtomicCommit(w)

Spec == Init /\ [][Next]_vars

CapacityNeverExceeded == used <= Capacity
NonNegativeRemaining == (Capacity - used) >= 0
=============================================================================
