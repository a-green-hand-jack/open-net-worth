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

This capability is being built in stages. The settings and workspace controls to issue a grant,
the remaining executor tools, and production broker integrations are not included in this stage.
