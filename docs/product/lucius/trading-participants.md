---
title: Trading participants
description: Scoped access for a trading workspace participant.
category: lucius
order: 95
audience: [user]
status: beta
---

# Trading participants

Open **Trading** in the sidebar, or from the mobile navigation sheet, to review a workspace,
inspect its account and activity, or compare compatible runs. **Expert setup** opens the reviewed
delegation form; **Create with Lucius** prepares the same unsaved review through conversation.

An external participant can be given an expiring grant for one trading run. Its gateway
accepts only that grant and offers run-scoped trading tools; it cannot use general Lucius tools
or choose a different run in its arguments. An owner can revoke or rotate the grant, and the
owner's tool permissions still apply.

An authenticated owner can review a proposed delegation at
`POST /api/trading/delegations/review` before creating it with `POST /api/trading/delegations`.
The workspace endpoints provide an overview, pause or resume actions, and reviewed mandate
amendments. A participant grant does not authorize those owner controls.
After a mandate amendment is saved, the open workspace refreshes to show the updated mandate.
Lucius can prepare an unsaved delegation for the owner's review, but cannot grant live trading
authority through that preview. Funding must be supplied explicitly in the reviewed draft.
The owner API also exposes the run's accounts, market observations, orders, fills and performance;
simulated and live orders both pass through the trading service's existing execution checks.
The run's statement and linked evidence endpoints show recorded order, fill and decision links;
the observations shown for a decision are limited to what was available at that decision time.
Comparisons require matching scenarios; they stop ranking runs when valuations are incomplete,
historical clocks diverge or a mandate changes. Historical comparisons cannot eliminate model
knowledge of later events.

When allowed by the owner, a participant can write versioned research or code files, read saved
versions, and record the work it actually performed. These files are workspace records rather
than host filesystem paths; credential filtering is defensive and cannot detect every secret.
An allowed participant can run a strategy in the isolated container; its order intents still pass
through the run's permission and order checks. This requires Docker and the pinned sandbox image.
Order permission is rechecked for each strategy order and before an unsent broker order enters
submission. Revoking permission cannot recall a broker submission already in progress.
Receipts that contradict a rejected, canceled, or expired order, or change its broker order ID,
require reconciliation before they can be applied.
A broker order awaiting a submission or cancellation receipt blocks additional broker submissions
until the outstanding operation is resolved. Interrupted or conflicting broker operations keep
the run in a reconciliation state.

In Paper or Live runs, permitted participants can search public research, fetch a public research
page, and request current Yahoo market data within the reviewed mandate and allocated account.
Historical backtests refuse current research and current market requests to prevent future data
from entering the simulation. Current quotes require provider-verified currency and time.

Active workspaces are checked periodically for the next decision cycle. If a model cycle is
interrupted and its cost cannot be established, further paid cycles stop until an owner reconciles
the receipt. An authenticated owner can submit it to
`POST /api/trading/runs/{run_id}/usage-reconciliation` with the matching turn ID, receipt ID,
and additional cost in USD. QA mode does not schedule these external calls by default.

An authenticated owner can issue a grant with `POST /api/trading/runs/{run_id}/access` and revoke
it with `DELETE` at the same path. The issue response contains the grant once and is marked
`no-store`; rotation invalidates the prior grant. A participant grant cannot issue or revoke grants.

This capability is being built in stages. The Binance Spot adapter is under review; a dedicated
wallet, matching account identity and appropriately restricted API permissions are required.
Testnet activity cannot be linked to the real book. An authenticated owner can configure the
connector in **Connectors → Binance Spot**, or using `PUT /api/binance/config`, and check it with
`POST /api/binance/test`. Saved keys cannot be retrieved from the settings screen. Production
broker validation is not included in this stage, and the adapter has not been validated against
a funded broker account.

An Alpaca MCP adapter is also under review; a configured
connector alone does not authorize a funded run. Account identity, dedicated allocation, broker
permissions and complete execution receipts must all pass the run's checks. The adapter has not
yet been validated against a funded broker account.

IBKR MCP connections currently provide setup guidance only. Managed submission, cancellation and
reconciliation remain unavailable until the authenticated execution schemas and receipts have been
reviewed. Check and cancel any existing IBKR order directly with the broker.
