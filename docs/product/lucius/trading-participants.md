---
title: Trading participants
description: Scoped access for a trading workspace participant.
category: lucius
order: 95
audience: [user]
status: beta
---

# Trading participants

An external participant can be given an expiring grant for one trading run. Its gateway
accepts only that grant and offers run-scoped trading tools; it cannot use general Lucius tools
or choose a different run in its arguments. An owner can revoke or rotate the grant, and the
owner's tool permissions still apply.

When allowed by the owner, a participant can write versioned research or code files, read saved
versions, and record the work it actually performed. These files are workspace records rather
than host filesystem paths; credential filtering is defensive and cannot detect every secret.
An allowed participant can run a strategy in the isolated container; its order intents still pass
through the run's permission and order checks. This requires Docker and the pinned sandbox image.

An authenticated owner can issue a grant with `POST /api/trading/runs/{run_id}/access` and revoke
it with `DELETE` at the same path. The issue response contains the grant once and is marked
`no-store`; rotation invalidates the prior grant. A participant grant cannot issue or revoke grants.

This capability is being built in stages. Workspace controls, current research tools and production
broker integrations are not included in this stage.
