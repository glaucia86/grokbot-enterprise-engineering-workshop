------------------------------ MODULE PH42 ------------------------------
EXTENDS Naturals, FiniteSets

CONSTANTS Clients, Tenants, Keys, None, Atomic
VARIABLES phase, scope, requests, audit, response

vars == <<phase, scope, requests, audit, response>>
Scopes == Tenants \X Keys

Init ==
    /\ phase = [c \in Clients |-> "ready"]
    /\ scope = [c \in Clients |-> <<>>]
    /\ requests = {}
    /\ audit = {}
    /\ response = [c \in Clients |-> None]

OwnersAt(pair) == {c \in requests : scope[c] = pair}

Observe(c, pair) ==
    /\ phase[c] = "ready"
    /\ scope' = [scope EXCEPT ![c] = pair]
    /\ IF OwnersAt(pair) = {}
       THEN /\ phase' = [phase EXCEPT ![c] = "miss"]
            /\ UNCHANGED response
       ELSE /\ phase' = [phase EXCEPT ![c] = "done"]
            /\ \E winner \in OwnersAt(pair):
                  response' = [response EXCEPT ![c] = winner]
    /\ UNCHANGED <<requests, audit>>

Commit(c) ==
    /\ phase[c] = "miss"
    /\ phase' = [phase EXCEPT ![c] = "done"]
    /\ IF Atomic /\ OwnersAt(scope[c]) # {}
       THEN /\ \E winner \in OwnersAt(scope[c]):
                  response' = [response EXCEPT ![c] = winner]
            /\ UNCHANGED <<requests, audit>>
       ELSE /\ requests' = requests \cup {c}
            /\ audit' = audit \cup {c}
            /\ response' = [response EXCEPT ![c] = c]
    /\ UNCHANGED scope

Next ==
    \/ \E c \in Clients, pair \in Scopes: Observe(c, pair)
    \/ \E c \in Clients: Commit(c)

Spec == Init /\ [][Next]_vars

TypeOK ==
    /\ phase \in [Clients -> {"ready", "miss", "done"}]
    /\ scope \in [Clients -> (Scopes \cup {<<>>})]
    /\ requests \subseteq Clients
    /\ audit \subseteq Clients
    /\ response \in [Clients -> (Clients \cup {None})]

UniqueRequest == \A pair \in Scopes: Cardinality(OwnersAt(pair)) <= 1
CreationAuditMatches == audit = requests
SameScopedReplay ==
    \A c \in Clients:
      IF response[c] = None THEN TRUE
      ELSE /\ response[c] \in requests
           /\ scope[response[c]] = scope[c]

=============================================================================
