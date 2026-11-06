# Trading workspace acceptance

These are acceptance criteria, not a claim that the criteria have passed. Consult the current
review drafts for commit-specific evidence and unresolved safety and provider limitations.

Use a synthetic, isolated QA instance on ports 8090–8099. Never use the personal book or a live funded account for these UI checks. A successful UI action is confirmed by returned backend state and persisted records, not a toast alone. Real provider and broker acceptance remain separate evidence.

## TRD-01 — Review one persistent delegation


### TRD-01-01
- GIVEN Trading
- WHEN Create with Lucius is selected
- THEN the existing conversation opens with delegation intent; an unsaved validated draft reaches the same review as Expert setup through trading.review_draft.

### TRD-01-02
- WHEN a name, original mandate, executor, environment, period, allocation and limits are reviewed
- THEN no workspace exists until the user confirms; a single confirmation creates and starts the delegated environment.

### TRD-01-03
- WHEN the workspace reloads
- THEN original instructions and current environment remain visible without requiring a second run-creation form.

### TRD-01-04
- WHEN supplied Backtest bars are entered
- THEN source/version and availability remain explicit and future bars are absent until the environment reaches them.

### TRD-01-05
- WHEN the server rejects a configuration
- THEN the error is visible and all draft fields remain editable.

### TRD-01-06
- WHEN Live is selected
- THEN explicit human authorization and dedicated broker account configuration are required; a refused start is never presented as running.

## TRD-02 — Control authority without rewriting history


### TRD-02-01
- GIVEN a reviewed workspace
- WHEN Start workspace, Pause, Resume or End workspace is confirmed
- THEN the returned persistent state is reflected without changing its allocation/mode; cancellation and retained holdings are described accurately.

### TRD-02-02
- WHEN paused work is amended
- THEN the change is reviewed, its reason/before/after/effective revision persist, the original instruction remains exact, and prior order authority remains unchanged.

### TRD-02-03
- GIVEN missing original history on a legacy workspace
- THEN Not recorded is shown rather than a fabricated original or permanent loading state.

### TRD-02-04
- GIVEN an unknown broker submission
- THEN it is labeled Outcome unknown and no retry-order shortcut is offered.

### TRD-02-05
- GIVEN an open order
- WHEN cancellation is confirmed
- THEN the request is sent once; pending cancellation and actual fills remain distinct.

### TRD-02-06
- GIVEN a run needing reconciliation
- THEN Start/Resume is unavailable and the reconciliation status/action is visible.

## TRD-03 — Inspect decisions and financial results


### TRD-03-01
- GIVEN recorded work
- THEN Market & portfolio and Agent work have equal prominence; native input/output, tool args/results, source provenance, files/versions, reported reasoning and explicit absences are inspectable. Large safe records have complete retrieval.

### TRD-03-02
- WHEN a fill marker or decision is selected
- THEN the same inspector links actual decision identity, data available then and recorded file/tool versions; absent links are not guessed.

### TRD-03-03
- WHEN valid OHLCV exists
- THEN candles/volume render from those bars; quote-only data remains explicitly quote-only.

### TRD-03-04
- WHEN an order detail opens
- THEN requested quantity, status, broker identity and actual partial fills/fees are distinguishable.

### TRD-03-05
- WHEN Holdings opens
- THEN simulated positions appear only in the trading portfolio and values are backend projections in explicit currencies.

### TRD-03-06
- WHEN a valuation is incomplete
- THEN equity/return display an unavailable state rather than zero; model cost is visibly separate from trading P&L.

### TRD-03-07
- WHEN a fetch fails
- THEN a retry action appears and any prior data remains visible with a stale/error indication.

## TRD-04 — Agent, script and external access


### TRD-04-01
- GIVEN a running managed workspace
- THEN the scheduler continues work and advances its environment automatically. Normal operation requires neither Run agent now nor Advance clicks.

### TRD-04-02
- THEN Real-provider acceptance must cover research/file persistence, actual isolated code/order execution, subsequent automatic wake/fill, same-session file reading, settled cost and no duplicate orders. A mock or a single provider cycle does not meet this criterion.

### TRD-04-03
- WHEN strategy source executes
- THEN the source and result are recorded and returned intents pass through the same order service; an isolation failure remains a visible error.

### TRD-04-04
- WHEN an external credential is issued
- THEN only the run-bound endpoint and scoped credential are shown, once; the credential never enters query cache or browser persistence.

### TRD-04-05
- WHEN the credential dialog closes (including during an issue request)
- THEN the credential is discarded; reopening cannot reveal it again.

### TRD-04-06
- WHEN Revoke run access is clicked
- THEN server-side revocation succeeds and the credential cannot perform further gateway operations.

## TRD-05 — Compare participants


### TRD-05-01
- GIVEN two runs sharing frozen conditions
- WHEN both are selected into a named comparison
- THEN results show backend return, drawdown, fees and separately reported model cost.

### TRD-05-02
- WHEN participants share the same agent label
- THEN each row remains distinguishable by run identity, mode, period and strategy version, with a link to that exact run.

### TRD-05-03
- WHEN the comparison opens
- THEN shared capital, reporting currency, universe, dataset and execution assumptions are visible alongside the backend-recorded equity series for each participant; later mandate changes invalidate an obsolete shared-scenario claim.

### TRD-05-04
- GIVEN different scenarios
- WHEN a comparison is attempted
- THEN the server refusal is shown and no fabricated ranking appears.

### TRD-05-05
- WHEN a participant result is opened
- THEN the selected workspace/run is encoded in the URL and survives refresh/back navigation.

## TRD-06 — Layout and accessibility


### TRD-06-01
- THEN At 640, 1024 and 1440 widths, with chat open/closed and sidebar expanded/collapsed, controls remain usable and tables scroll inside their panel.

### TRD-06-02
- THEN With the collapsed Lucius pill present, scrolling to the end leaves the final order actions and holdings values reachable above it.

### TRD-06-03
- THEN Modals use the shared modal primitive, retain focus containment, support Escape, and clear the Lucius dock/panel.

### TRD-06-04
- THEN Labels identify every configuration field; page/run tabs support keyboard selection; status has text in addition to color.

### TRD-06-05
- THEN Empty, loading, rejected, disconnected/stale, and populated states each have captured synthetic-data evidence.

### TRD-06-06
- THEN Trading uses a candlestick icon, distinct from Investments' trend arrow; supplied product text is English.

## Automated evidence

`frontend/src/components/tabs/trading/Trading.interactions.test.tsx` and the synthetic browser
harness `frontend/qa/trading-workspace.test.mjs` are present in the split branch. Their presence
does not prove they passed at the current head or that they cover every criterion above. The
original branch also contained an opt-in `tests/cli_live/test_trading_delegation_live.py`; that
file is not currently in the split branch, so its provider-backed scenario remains to be reconciled.
Synthetic tests do not establish authenticated funded broker acceptance or the owner's final UI
sign-off.
