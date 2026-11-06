"""Broker authority and uncertain submission tests with an in-process synthetic adapter."""

import asyncio
import multiprocessing
from copy import deepcopy
from datetime import datetime, timedelta, timezone

import pytest

from backend.core.errors import ConflictError
from backend.core.trading_runtime import bind_trading_context
from backend.db.trading_store import TradingStore, trading_transaction
from backend.services import tool_permissions
from backend.services.trading import execution, lifecycle, performance, reconciliation, workspaces
from backend.services.trading.providers import register_live_adapter
from backend.services.trading_access import issue_access, revoke_access, token_digest

INSTRUMENT = {"symbol": "ACME", "venue": "simulation", "asset_class": "stock", "currency": "USD"}


class FakeBroker:
    def __init__(self, timeout=False):
        self.timeout = timeout
        self.submissions = 0
        self.orders = {}
        self.account = {
            "provider_id": "synthetic-provider",
            "broker_account_id": "synthetic-broker",
            "currency": "USD",
            "cash": "1000",
            "positions": {},
            "allocation_isolated": True,
            "capabilities": ["client_order_id", "lookup_order", "fills", "cancel"],
        }

    async def inspect_account(self, account):
        return deepcopy(self.account)

    async def submit(self, account, order):
        self.submissions += 1
        receipt = {
            "broker_order_id": "broker-" + order["id"],
            "client_order_id": order["id"],
            "status": "open",
            "fills": [],
        }
        self.orders[order["id"]] = receipt
        if self.timeout:
            raise TimeoutError("synthetic lost acknowledgement")
        return receipt

    async def cancel(self, account, order):
        receipt = self.orders[order["id"]]
        receipt["status"] = "canceled"
        return receipt

    async def reconcile(self, account, orders):
        return {"account": deepcopy(self.account), "orders": list(self.orders.values())}


@pytest.fixture(autouse=True)
def isolated(db_isolated):
    yield
    register_live_adapter("synthetic", None)


def call(coro):
    return asyncio.run(coro)


def _submit_in_process(run_id, intent, started, release, result_queue):
    broker = FakeBroker()
    original_submit = broker.submit

    async def delayed_submit(account, submitted):
        receipt = await original_submit(account, submitted)
        started.set()
        if not await asyncio.to_thread(release.wait, 15):
            raise TimeoutError("synthetic test release timed out")
        return receipt

    broker.submit = delayed_submit
    register_live_adapter("synthetic", broker)
    result_queue.put(call(execution.submit_order(run_id, intent))["status"])


def _race_submit_in_process(run_id, intent, gate, started, release, result_queue):
    broker = FakeBroker()
    original_submit = broker.submit

    async def delayed_submit(account, submitted):
        receipt = await original_submit(account, submitted)
        started.set()
        if not await asyncio.to_thread(release.wait, 15):
            raise TimeoutError("synthetic test release timed out")
        return receipt

    broker.submit = delayed_submit
    register_live_adapter("synthetic", broker)
    gate.wait(timeout=15)
    try:
        result = call(execution.submit_order(run_id, intent))
        result_queue.put(("accepted", intent["request_id"], result["status"]))
    except ConflictError:
        result_queue.put(("blocked", intent["request_id"], None))


def live_run(broker, *, authorized=True, book_account_id=None):
    register_live_adapter("synthetic", broker)
    stamp = datetime.now(timezone.utc)
    workspace = workspaces.create_workspace({"name": "Synthetic"})
    return workspaces.create_run(
        workspace["id"],
        {
            "mode": "live",
            "live_authorized": authorized,
            "start_at": (stamp - timedelta(minutes=1)).isoformat(),
            "end_at": (stamp + timedelta(days=1)).isoformat(),
            "accounts": [
                {
                    "capital": "1000",
                    "connector_id": "synthetic",
                    "broker_account_id": "synthetic-broker",
                    "book_account_id": book_account_id,
                }
            ],
            "observations": [
                {"instrument": INSTRUMENT, "timestamp": stamp.isoformat(), "price": "100"}
            ],
        },
    )


def order(run_id, request="synthetic-order"):
    account = performance.get_account(run_id)["items"][0]
    return {
        "account_id": account["id"],
        "instrument": INSTRUMENT,
        "side": "buy",
        "quantity": "1",
        "request_id": request,
    }


def test_activation_requires_authorization_and_isolated_broker():
    broker = FakeBroker()
    run = live_run(broker, authorized=False)
    with pytest.raises(ConflictError, match="Human authorization"):
        call(lifecycle.apply_run_action(run["id"], {"action": "start"}))
    other = live_run(broker)
    broker.account["allocation_isolated"] = False
    with pytest.raises(ConflictError, match="isolated"):
        call(lifecycle.apply_run_action(other["id"], {"action": "start"}))
    assert broker.submissions == 0


def test_timeout_is_unknown_and_retry_does_not_duplicate_submission():
    broker = FakeBroker(timeout=True)
    run = live_run(broker)
    call(lifecycle.apply_run_action(run["id"], {"action": "start"}))
    submitted = call(execution.submit_order(run["id"], order(run["id"])))
    assert submitted["status"] == "submission_unknown"
    assert workspaces.get_run(run["id"])["state"] == "needs_reconciliation"
    assert call(execution.submit_order(run["id"], order(run["id"])))["id"] == submitted["id"]
    assert broker.submissions == 1
    assert call(reconciliation.reconcile_run(run["id"]))["state"] == "running"
    assert execution.list_orders(run["id"])["items"][0]["status"] == "open"


def test_failed_unknown_state_write_blocks_new_orders(monkeypatch):
    broker = FakeBroker(timeout=True)
    run = live_run(broker)
    call(lifecycle.apply_run_action(run["id"], {"action": "start"}))
    original_unknown = execution._unknown

    def fail_write(*args, **kwargs):
        raise RuntimeError("synthetic database write failure")

    monkeypatch.setattr(execution, "_unknown", fail_write)
    with pytest.raises(RuntimeError, match="synthetic database"):
        call(execution.submit_order(run["id"], order(run["id"])))
    monkeypatch.setattr(execution, "_unknown", original_unknown)
    broker.timeout = False
    with pytest.raises(ConflictError, match="reconcil"):
        call(execution.submit_order(run["id"], order(run["id"], request="second")))
    assert broker.submissions == 1
    assert call(reconciliation.reconcile_run(run["id"]))["state"] == "running"
    second = call(execution.submit_order(run["id"], order(run["id"], request="second")))
    assert second["status"] == "open"
    assert broker.submissions == 2


def test_pending_handoff_is_blocked_by_another_unsettled_order(monkeypatch):
    broker = FakeBroker(timeout=True)
    run = live_run(broker)
    call(lifecycle.apply_run_action(run["id"], {"action": "start"}))

    def fail_write(*args, **kwargs):
        raise RuntimeError("synthetic database write failure")

    monkeypatch.setattr(execution, "_unknown", fail_write)
    with pytest.raises(RuntimeError, match="synthetic database"):
        call(execution.submit_order(run["id"], order(run["id"])))
    first = execution.list_orders(run["id"])["items"][0]
    pending = {**first, "id": "synthetic-pending", "request_id": "pending", "status": "pending"}
    with trading_transaction() as conn:
        TradingStore("orders").insert(pending, conn=conn)
    broker.timeout = False
    with pytest.raises(ConflictError, match="reconcil"):
        call(execution.dispatch_live_order(run["id"], pending["id"]))
    assert broker.submissions == 1
    assert TradingStore("orders").required(pending["id"])["status"] == "pending"


def test_concurrent_submission_waits_for_first_broker_receipt(monkeypatch):
    broker = FakeBroker()
    run = live_run(broker)
    call(lifecycle.apply_run_action(run["id"], {"action": "start"}))

    async def scenario():
        accepted, release = asyncio.Event(), asyncio.Event()
        original_submit = broker.submit

        async def delayed_submit(account, intent):
            receipt = await original_submit(account, intent)
            accepted.set()
            await asyncio.wait_for(release.wait(), timeout=5)
            return receipt

        monkeypatch.setattr(broker, "submit", delayed_submit)
        first = asyncio.create_task(execution.submit_order(run["id"], order(run["id"])))
        await asyncio.wait_for(accepted.wait(), timeout=5)
        with pytest.raises(ConflictError, match="reconcil"):
            await execution.submit_order(run["id"], order(run["id"], request="second"))
        assert broker.submissions == 1
        release.set()
        await asyncio.wait_for(first, timeout=5)
        second = await execution.submit_order(run["id"], order(run["id"], request="second"))
        assert second["status"] == "open"
        assert broker.submissions == 2

    call(scenario())


@pytest.mark.timeout(45)
def test_cross_process_submission_waits_for_first_broker_receipt():
    broker = FakeBroker()
    run = live_run(broker)
    call(lifecycle.apply_run_action(run["id"], {"action": "start"}))
    context = multiprocessing.get_context("spawn")
    started, release, results = context.Event(), context.Event(), context.Queue()
    process = context.Process(
        target=_submit_in_process, args=(run["id"], order(run["id"]), started, release, results)
    )
    try:
        process.start()
        assert started.wait(timeout=15)
        with pytest.raises(ConflictError, match="reconcil"):
            call(execution.submit_order(run["id"], order(run["id"], request="second")))
        assert execution.list_orders(run["id"])["total"] == 1
        release.set()
        process.join(timeout=15)
        assert process.exitcode == 0
        assert results.get(timeout=5) == "open"
        assert (
            call(execution.submit_order(run["id"], order(run["id"], request="second")))["status"]
            == "open"
        )
        assert execution.list_orders(run["id"])["total"] == 2
    finally:
        release.set()
        if process.is_alive():
            process.terminate()
            process.join(timeout=5)
        results.close()


@pytest.mark.timeout(50)
def test_simultaneous_processes_admit_only_one_unsettled_broker_order():
    broker = FakeBroker()
    run = live_run(broker)
    call(lifecycle.apply_run_action(run["id"], {"action": "start"}))
    context = multiprocessing.get_context("spawn")
    gate, started, release, results = (
        context.Barrier(2),
        context.Event(),
        context.Event(),
        context.Queue(),
    )
    processes = [
        context.Process(
            target=_race_submit_in_process,
            args=(
                run["id"],
                order(run["id"], request=f"race-{index}"),
                gate,
                started,
                release,
                results,
            ),
        )
        for index in range(2)
    ]
    try:
        for process in processes:
            process.start()
        assert started.wait(timeout=15)
        blocked = results.get(timeout=15)
        assert blocked[0] == "blocked"
        assert execution.list_orders(run["id"])["total"] == 1
        release.set()
        for process in processes:
            process.join(timeout=15)
            assert process.exitcode == 0
        assert results.get(timeout=5)[0] == "accepted"
        assert (
            call(execution.submit_order(run["id"], order(run["id"], request=blocked[1])))["status"]
            == "open"
        )
        assert execution.list_orders(run["id"])["total"] == 2
    finally:
        gate.abort()
        release.set()
        for process in processes:
            if process.is_alive():
                process.terminate()
                process.join(timeout=5)
        results.close()


def test_failed_cancel_unknown_state_write_blocks_new_orders(monkeypatch):
    broker = FakeBroker()
    run = live_run(broker)
    call(lifecycle.apply_run_action(run["id"], {"action": "start"}))
    submitted = call(execution.submit_order(run["id"], order(run["id"])))
    original_cancel = broker.cancel
    original_unknown = execution._unknown

    async def cancel_with_lost_receipt(account, intent):
        await original_cancel(account, intent)
        raise TimeoutError("synthetic lost cancellation receipt")

    def fail_write(*args, **kwargs):
        raise RuntimeError("synthetic database write failure")

    monkeypatch.setattr(broker, "cancel", cancel_with_lost_receipt)
    monkeypatch.setattr(execution, "_unknown", fail_write)
    with pytest.raises(RuntimeError, match="synthetic database"):
        call(execution.cancel_order(run["id"], submitted["id"]))
    monkeypatch.setattr(execution, "_unknown", original_unknown)
    with pytest.raises(ConflictError, match="reconcil"):
        call(execution.submit_order(run["id"], order(run["id"], request="second")))
    assert broker.submissions == 1
    assert call(reconciliation.reconcile_run(run["id"]))["state"] == "running"
    assert (
        call(execution.submit_order(run["id"], order(run["id"], request="second")))["status"]
        == "open"
    )
    assert broker.submissions == 2


def test_cancelled_inflight_strategy_requires_reconciliation(monkeypatch):
    broker = FakeBroker()
    run = live_run(broker)
    call(lifecycle.apply_run_action(run["id"], {"action": "start"}))
    tool_permissions.set_tool_permission("core", "submit_trading_order", "always_allow")

    async def scenario():
        accepted = asyncio.Event()
        original_submit = broker.submit

        async def accepted_but_delayed(account, intent):
            await original_submit(account, intent)
            accepted.set()
            await asyncio.Event().wait()

        monkeypatch.setattr(broker, "submit", accepted_but_delayed)
        task = asyncio.create_task(
            execution.submit_order(run["id"], order(run["id"]), strategy_order=True)
        )
        await asyncio.wait_for(accepted.wait(), timeout=5)
        task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await task

    call(scenario())
    assert broker.submissions == 1
    assert workspaces.get_run(run["id"])["state"] == "needs_reconciliation"
    assert execution.list_orders(run["id"])["items"][0]["status"] == "submission_unknown"


def test_cancelled_broker_cancellation_marks_run_for_reconciliation(monkeypatch):
    broker = FakeBroker()
    run = live_run(broker)
    call(lifecycle.apply_run_action(run["id"], {"action": "start"}))
    submitted = call(execution.submit_order(run["id"], order(run["id"])))

    async def scenario():
        accepted = asyncio.Event()
        original_cancel = broker.cancel

        async def accepted_but_delayed(account, intent):
            await original_cancel(account, intent)
            accepted.set()
            await asyncio.Event().wait()

        monkeypatch.setattr(broker, "cancel", accepted_but_delayed)
        task = asyncio.create_task(execution.cancel_order(run["id"], submitted["id"]))
        await asyncio.wait_for(accepted.wait(), timeout=5)
        task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await task

    call(scenario())
    assert workspaces.get_run(run["id"])["state"] == "needs_reconciliation"
    assert execution.list_orders(run["id"])["items"][0]["status"] == "cancel_pending"


def test_late_broker_acknowledgement_respects_stop_without_resubmission():
    async def scenario():
        entered, release = asyncio.Event(), asyncio.Event()

        class SlowBroker(FakeBroker):
            async def submit(self, account, intent):
                receipt = await super().submit(account, intent)
                entered.set()
                await release.wait()
                return receipt

            async def cancel(self, account, intent):
                if not intent.get("broker_order_id"):
                    raise ConflictError("Submission identity not yet known")
                return await super().cancel(account, intent)

        broker = SlowBroker()
        run = live_run(broker)
        await lifecycle.apply_run_action(run["id"], {"action": "start"})
        task = asyncio.create_task(execution.submit_order(run["id"], order(run["id"])))
        await asyncio.wait_for(entered.wait(), timeout=5)
        await lifecycle.apply_run_action(run["id"], {"action": "stop"})
        release.set()
        ack = await asyncio.wait_for(task, timeout=5)
        settled = await reconciliation.reconcile_run(run["id"])
        assert broker.orders[ack["id"]]["status"] == "canceled"
        assert settled["state"] == "stopped"
        assert broker.submissions == 1

    call(scenario())


def test_revoked_strategy_order_is_not_sent_to_broker(monkeypatch):
    broker = FakeBroker()
    run = live_run(broker)
    call(lifecycle.apply_run_action(run["id"], {"action": "start"}))
    tool_permissions.set_tool_permission("core", "submit_trading_order", "always_allow")
    dispatch = execution.dispatch_live_order

    async def revoke_before_dispatch(run_id, order_id):
        tool_permissions.set_tool_permission("core", "submit_trading_order", "blocked")
        return await dispatch(run_id, order_id)

    monkeypatch.setattr(execution, "dispatch_live_order", revoke_before_dispatch)
    submitted = call(execution.submit_order(run["id"], order(run["id"]), strategy_order=True))
    assert submitted["status"] == "canceled"
    assert broker.submissions == 0
    assert performance.get_account(run["id"])["items"][0]["available_cash"] == "1000"
    tool_permissions.set_tool_permission("core", "submit_trading_order", "always_allow")
    retry = call(execution.submit_order(run["id"], order(run["id"]), strategy_order=True))
    assert retry["id"] == submitted["id"]
    assert retry["status"] == "canceled"
    assert broker.submissions == 0


def test_revoked_external_grant_before_handoff_leaves_owner_cancelable_pending(monkeypatch):
    broker = FakeBroker()
    run = live_run(broker)
    call(lifecycle.apply_run_action(run["id"], {"action": "start"}))
    issued = issue_access(run["id"])
    dispatch = execution.dispatch_live_order

    async def revoke_before_dispatch(run_id, order_id):
        revoke_access(run_id)
        return await dispatch(run_id, order_id)

    monkeypatch.setattr(execution, "dispatch_live_order", revoke_before_dispatch)
    with bind_trading_context(run["id"], "external", token_digest(issued["token"])):
        with pytest.raises(ConflictError, match="revoked"):
            call(execution.submit_order(run["id"], order(run["id"])))
    pending = execution.list_orders(run["id"])["items"][0]
    assert pending["status"] == "pending"
    assert broker.submissions == 0
    assert performance.get_account(run["id"])["items"][0]["available_cash"] == "900"
    canceled = call(execution.cancel_order(run["id"], pending["id"]))
    assert canceled["status"] == "canceled"
    assert performance.get_account(run["id"])["items"][0]["available_cash"] == "1000"
    assert broker.submissions == 0


def test_inflight_strategy_order_retains_broker_receipt_after_revocation(monkeypatch):
    broker = FakeBroker()
    run = live_run(broker)
    call(lifecycle.apply_run_action(run["id"], {"action": "start"}))
    tool_permissions.set_tool_permission("core", "submit_trading_order", "always_allow")

    async def scenario():
        started, release = asyncio.Event(), asyncio.Event()
        original_submit = broker.submit

        async def delayed_submit(account, intent):
            started.set()
            await asyncio.wait_for(release.wait(), timeout=5)
            return await original_submit(account, intent)

        monkeypatch.setattr(broker, "submit", delayed_submit)
        pending = asyncio.create_task(
            execution.submit_order(run["id"], order(run["id"]), strategy_order=True)
        )
        await asyncio.wait_for(started.wait(), timeout=5)
        assert execution.list_orders(run["id"])["items"][0]["status"] == "submitting"
        tool_permissions.set_tool_permission("core", "submit_trading_order", "blocked")
        release.set()
        return await asyncio.wait_for(pending, timeout=5)

    submitted = call(scenario())
    assert submitted["status"] == "open"
    assert broker.submissions == 1
    tool_permissions.set_tool_permission("core", "submit_trading_order", "always_allow")
    retry = call(execution.submit_order(run["id"], order(run["id"]), strategy_order=True))
    assert retry["id"] == submitted["id"]
    assert broker.submissions == 1


def test_revoked_inflight_strategy_order_with_lost_receipt_requires_reconciliation(monkeypatch):
    broker = FakeBroker(timeout=True)
    run = live_run(broker)
    call(lifecycle.apply_run_action(run["id"], {"action": "start"}))
    tool_permissions.set_tool_permission("core", "submit_trading_order", "always_allow")

    async def scenario():
        started, release = asyncio.Event(), asyncio.Event()
        original_submit = broker.submit

        async def delayed_submit(account, intent):
            started.set()
            await asyncio.wait_for(release.wait(), timeout=5)
            return await original_submit(account, intent)

        monkeypatch.setattr(broker, "submit", delayed_submit)
        pending = asyncio.create_task(
            execution.submit_order(run["id"], order(run["id"]), strategy_order=True)
        )
        await asyncio.wait_for(started.wait(), timeout=5)
        tool_permissions.set_tool_permission("core", "submit_trading_order", "blocked")
        release.set()
        return await asyncio.wait_for(pending, timeout=5)

    submitted = call(scenario())
    assert submitted["status"] == "submission_unknown"
    assert workspaces.get_run(run["id"])["state"] == "needs_reconciliation"
    assert broker.submissions == 1
    tool_permissions.set_tool_permission("core", "submit_trading_order", "always_allow")
    retry = call(execution.submit_order(run["id"], order(run["id"]), strategy_order=True))
    assert retry["id"] == submitted["id"]
    assert retry["status"] == "submission_unknown"
    assert broker.submissions == 1


def test_same_broker_account_cannot_be_managed_by_two_running_workspaces():
    broker = FakeBroker()
    first = live_run(broker)
    call(lifecycle.apply_run_action(first["id"], {"action": "start"}))
    second = live_run(broker)
    with pytest.raises(ConflictError, match="already managed"):
        call(lifecycle.apply_run_action(second["id"], {"action": "start"}))


def test_stop_preserves_unreconciled_fill_when_book_projection_fails():
    broker = FakeBroker()
    run = live_run(broker)
    call(lifecycle.apply_run_action(run["id"], {"action": "start"}))
    submitted = call(execution.submit_order(run["id"], order(run["id"])))
    receipt = broker.orders[submitted["id"]]
    receipt.update(
        status="filled",
        fills=[
            {
                "execution_id": "unmapped-fill",
                "quantity": "1",
                "price": "100",
                "fees": "0",
                "side": "buy",
                "instrument": INSTRUMENT,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "broker_order_id": receipt["broker_order_id"],
            }
        ],
    )
    broker.account.update(
        cash="900",
        positions={
            "simulation:stock:ACME:USD": {
                "instrument": INSTRUMENT,
                "quantity": "1",
                "cost_basis": "100",
            },
        },
    )
    account = performance.get_account(run["id"])["items"][0]
    with trading_transaction() as conn:
        TradingStore("accounts").update_by_id(
            account["id"], {"book_account_id": "missing-synthetic-book-account"}, conn=conn
        )
    stopped = call(lifecycle.apply_run_action(run["id"], {"action": "stop"}))
    assert stopped["state"] == "needs_reconciliation"
    assert call(reconciliation.reconcile_run(run["id"]))["state"] == "needs_reconciliation"
    assert execution.list_fills(run["id"])["items"][0]["book_status"] == "needs_reconciliation"


def test_resume_rejects_external_open_order_even_if_cash_is_unchanged():
    broker = FakeBroker()
    run = live_run(broker)
    call(lifecycle.apply_run_action(run["id"], {"action": "start"}))
    call(lifecycle.apply_run_action(run["id"], {"action": "pause"}))
    broker.account["open_orders"] = [
        {"client_order_id": "outside-synthetic-order", "broker_order_id": "outside-1"}
    ]
    with pytest.raises(ConflictError, match="outside this managed"):
        call(lifecycle.apply_run_action(run["id"], {"action": "resume"}))
    assert workspaces.get_run(run["id"])["state"] == "paused"


def test_replayed_fill_is_idempotent_and_outside_activity_blocks_run():
    broker = FakeBroker()
    run = live_run(broker)
    call(lifecycle.apply_run_action(run["id"], {"action": "start"}))
    submitted = call(execution.submit_order(run["id"], order(run["id"])))
    receipt = broker.orders[submitted["id"]]
    receipt.update(
        status="filled",
        fills=[
            {
                "execution_id": "synthetic-fill",
                "quantity": "1",
                "price": "100",
                "fees": "1",
                "side": "buy",
                "instrument": INSTRUMENT,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "broker_order_id": receipt["broker_order_id"],
            }
        ],
    )
    broker.account.update(
        cash="899",
        positions={
            "simulation:stock:ACME:USD": {
                "instrument": INSTRUMENT,
                "quantity": "1",
                "cost_basis": "101",
            },
        },
    )
    assert call(reconciliation.reconcile_run(run["id"]))["state"] == "running"
    call(reconciliation.reconcile_run(run["id"]))
    assert execution.list_fills(run["id"])["total"] == 1
    assert performance.get_account(run["id"])["items"][0]["cash"] == "899"
    broker.account["cash"] = "898"
    assert call(reconciliation.reconcile_run(run["id"]))["state"] == "needs_reconciliation"


def test_restart_marks_ambiguous_submission_without_resubmitting():
    broker = FakeBroker()
    run = live_run(broker)
    call(lifecycle.apply_run_action(run["id"], {"action": "start"}))
    submitted = call(execution.submit_order(run["id"], order(run["id"])))
    TradingStore("orders").update_by_id(submitted["id"], {"status": "submitting"})
    reconciliation.recover_runs()
    assert workspaces.get_run(run["id"])["state"] == "needs_reconciliation"
    assert execution.list_orders(run["id"])["items"][0]["status"] == "submission_unknown"
    assert broker.submissions == 1


def test_book_projection_uses_execution_identity_and_is_idempotent(monkeypatch):
    from backend.core import fx
    from backend.db.account_store import AccountStore
    from backend.db.instrument_store import InstrumentStore
    from backend.db.lot_store import LotStore
    from backend.db.position_store import PositionStore
    from backend.db.transaction_store import TransactionStore
    from backend.services import ledger, lots
    from backend.services.trading.book_projection import execution_external_ref, project_live_fills

    monkeypatch.setattr(lots, "_load_rates", lambda: {"USD": 1, "SGD": 1})
    monkeypatch.setattr(lots, "base_currency", lambda: "USD")
    monkeypatch.setattr(ledger, "base_currency", lambda: "USD")
    monkeypatch.setattr(fx, "base_currency", lambda: "USD")
    monkeypatch.setattr(fx, "_fx_rates_loader", lambda: {"USD": 1})
    account = AccountStore().create(
        {"name": "Synthetic custodian", "type": "investment", "currency": "USD"}
    )
    InstrumentStore().create(
        {
            "symbol": "ACME",
            "name": "Synthetic stock",
            "asset_class": "equity",
            "asset_subclass": "stock",
            "quote_currency": "USD",
            "price_source": "manual",
            "price_source_id": "ACME",
        }
    )
    broker = FakeBroker()
    run = live_run(broker, book_account_id=account["id"])
    call(lifecycle.apply_run_action(run["id"], {"action": "start"}))
    submitted = call(execution.submit_order(run["id"], order(run["id"])))
    receipt = broker.orders[submitted["id"]]
    receipt.update(
        status="filled",
        fills=[
            {
                "execution_id": "synthetic-book-fill",
                "quantity": "1",
                "price": "100",
                "fees": "0",
                "side": "buy",
                "instrument": INSTRUMENT,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "broker_order_id": receipt["broker_order_id"],
            }
        ],
    )
    broker.account.update(
        cash="900",
        positions={
            "simulation:stock:ACME:USD": {
                "instrument": INSTRUMENT,
                "quantity": "1",
                "cost_basis": "100",
            },
        },
    )
    call(reconciliation.reconcile_run(run["id"]))
    fill = execution.list_fills(run["id"])["items"][0]
    assert fill["book_status"] == "booked"
    assert len(LotStore().all()) == len(TransactionStore().all()) == 1
    ref = execution_external_ref(fill)
    cash = TransactionStore().by_external_ref(ref["source"], ref["ref"])
    assert cash is not None
    duplicate = ledger.create_transaction(
        {
            "kind": "investment",
            "date": fill["timestamp"][:10],
            "from_account_id": account["id"],
            "from_amount": 100,
            "from_currency": "USD",
            "description": "Synthetic broker confirmation",
            "external_refs": [ref],
        },
        allow_duplicate=True,
    )
    assert duplicate["id"] == cash["id"]
    assert project_live_fills(run["id"])["items"][0]["result"]["idempotent"]
    assert len(LotStore().all()) == len(TransactionStore().all()) == 1
    assert broker.submissions == 1
    for lot in LotStore().all():
        LotStore().delete(lot["id"])
    for position in PositionStore().all():
        PositionStore().delete(position["id"])
    for transaction in TransactionStore().all():
        TransactionStore().delete(transaction["id"])
    assert project_live_fills(run["id"])["items"][0]["status"] == "booked"
    assert len(LotStore().all()) == len(TransactionStore().all()) == 1


def test_late_open_receipt_after_cancel_requires_reconciliation():
    async def scenario():
        accepted, release = asyncio.Event(), asyncio.Event()

        class DelayedBroker(FakeBroker):
            async def submit(self, account, intent):
                receipt = deepcopy(await super().submit(account, intent))
                accepted.set()
                await asyncio.wait_for(release.wait(), timeout=5)
                return receipt

            async def cancel(self, account, intent):
                if not intent.get("broker_order_id"):
                    raise ConflictError("Broker order identity required")
                return deepcopy(await super().cancel(account, intent))

        broker = DelayedBroker()
        run = live_run(broker)
        await lifecycle.apply_run_action(run["id"], {"action": "start"})
        task = asyncio.create_task(execution.submit_order(run["id"], order(run["id"])))
        await asyncio.wait_for(accepted.wait(), timeout=5)
        await reconciliation.reconcile_run(run["id"])
        identified = execution.list_orders(run["id"])["items"][0]
        assert identified["broker_order_id"]
        canceled = await execution.cancel_order(run["id"], identified["id"])
        assert canceled["status"] == "canceled"
        assert canceled["reserved_cash"] == "0"
        release.set()
        late = await asyncio.wait_for(task, timeout=5)
        assert late["status"] == "canceled"
        assert late["reserved_cash"] == "0"
        assert workspaces.get_run(run["id"])["state"] == "needs_reconciliation"
        assert broker.orders[identified["id"]]["status"] == "canceled"
        await reconciliation.reconcile_run(run["id"])
        assert execution.list_orders(run["id"])["items"][0]["status"] == "canceled"

    call(scenario())


def test_conflicting_terminal_receipt_does_not_overwrite_cancellation():
    from backend.services.trading.fills import apply_receipt

    broker = FakeBroker()
    run = live_run(broker)
    call(lifecycle.apply_run_action(run["id"], {"action": "start"}))
    submitted = call(execution.submit_order(run["id"], order(run["id"])))
    canceled = call(execution.cancel_order(run["id"], submitted["id"]))
    assert canceled["status"] == "canceled"
    contradictory = {
        "broker_order_id": canceled["broker_order_id"],
        "status": "rejected",
        "fills": [],
    }
    with pytest.raises(ConflictError, match="terminal"):
        with trading_transaction() as conn:
            apply_receipt(
                conn, run, TradingStore("orders").required(canceled["id"], conn=conn), contradictory
            )
    assert execution.list_orders(run["id"])["items"][0]["status"] == "canceled"


def test_receipt_cannot_replace_known_broker_order_identity():
    from backend.services.trading.fills import apply_receipt

    broker = FakeBroker()
    run = live_run(broker)
    call(lifecycle.apply_run_action(run["id"], {"action": "start"}))
    submitted = call(execution.submit_order(run["id"], order(run["id"])))
    contradictory = {"broker_order_id": "different-synthetic-id", "status": "open", "fills": []}
    with pytest.raises(ConflictError, match="identity"):
        with trading_transaction() as conn:
            apply_receipt(
                conn,
                run,
                TradingStore("orders").required(submitted["id"], conn=conn),
                contradictory,
            )
    assert (
        execution.list_orders(run["id"])["items"][0]["broker_order_id"]
        == submitted["broker_order_id"]
    )


def test_contradictory_broker_receipt_keeps_reconciliation_failed_and_retryable():
    broker = FakeBroker()
    run = live_run(broker)
    call(lifecycle.apply_run_action(run["id"], {"action": "start"}))
    submitted = call(execution.submit_order(run["id"], order(run["id"])))
    canceled = call(execution.cancel_order(run["id"], submitted["id"]))
    broker.orders[submitted["id"]]["status"] = "rejected"

    result = call(reconciliation.reconcile_run(run["id"]))
    assert result["state"] == "needs_reconciliation"
    assert execution.list_orders(run["id"])["items"][0]["status"] == "canceled"
    events = TradingStore("events").list_scope(run["id"])
    assert any(e["kind"] == "reconciliation_failed" for e in events)

    broker.orders[submitted["id"]]["status"] = "canceled"
    retried = call(reconciliation.reconcile_run(run["id"]))
    assert retried["state"] == "running"
    assert execution.list_orders(run["id"])["items"][0]["status"] == canceled["status"]


def test_contradictory_receipt_rolls_back_earlier_receipts_in_same_reconciliation():
    broker = FakeBroker()
    run = live_run(broker)
    call(lifecycle.apply_run_action(run["id"], {"action": "start"}))
    first = call(execution.submit_order(run["id"], order(run["id"], "first-synthetic")))
    second = call(execution.submit_order(run["id"], order(run["id"], "second-synthetic")))
    call(execution.cancel_order(run["id"], second["id"]))
    broker.orders[first["id"]]["status"] = "canceled"
    broker.orders[second["id"]]["status"] = "rejected"

    result = call(reconciliation.reconcile_run(run["id"]))
    rows = {row["id"]: row for row in execution.list_orders(run["id"])["items"]}
    assert result["state"] == "needs_reconciliation"
    assert rows[first["id"]]["status"] == "open"
    assert rows[first["id"]]["reserved_cash"] == first["reserved_cash"]
    assert rows[second["id"]]["status"] == "canceled"
    assert any(
        e["kind"] == "reconciliation_failed" for e in TradingStore("events").list_scope(run["id"])
    )


def test_contradictory_reconcile_cannot_leave_run_running_after_concurrent_success():
    class RacingBroker(FakeBroker):
        nested = False
        run_id = ""

        async def reconcile(self, account, orders):
            result = deepcopy(await super().reconcile(account, orders))
            if not self.nested:
                self.nested = True
                assert (await reconciliation.reconcile_run(self.run_id))["state"] == "running"
                result["orders"][0]["status"] = "rejected"
            return result

    broker = RacingBroker()
    run = live_run(broker)
    broker.run_id = run["id"]
    call(lifecycle.apply_run_action(run["id"], {"action": "start"}))
    submitted = call(execution.submit_order(run["id"], order(run["id"])))
    call(execution.cancel_order(run["id"], submitted["id"]))
    result = call(reconciliation.reconcile_run(run["id"]))
    assert result["state"] == "needs_reconciliation"
    assert workspaces.get_run(run["id"])["state"] == "needs_reconciliation"


def test_older_success_cannot_clear_newer_reconciliation_failure():
    class RacingBroker(FakeBroker):
        nested = False
        run_id = ""

        async def reconcile(self, account, orders):
            result = deepcopy(await super().reconcile(account, orders))
            if not self.nested:
                self.nested = True
                self.orders[orders[0]["id"]]["status"] = "rejected"
                assert (await reconciliation.reconcile_run(self.run_id))[
                    "state"
                ] == "needs_reconciliation"
            return result

    broker = RacingBroker()
    run = live_run(broker)
    broker.run_id = run["id"]
    call(lifecycle.apply_run_action(run["id"], {"action": "start"}))
    submitted = call(execution.submit_order(run["id"], order(run["id"])))
    call(execution.cancel_order(run["id"], submitted["id"]))
    result = call(reconciliation.reconcile_run(run["id"]))
    assert result["state"] == "needs_reconciliation"
    assert workspaces.get_run(run["id"])["state"] == "needs_reconciliation"


def test_conflicting_late_receipt_cannot_reopen_without_reservation():
    async def scenario():
        accepted, release = asyncio.Event(), asyncio.Event()

        class DelayedBroker(FakeBroker):
            async def submit(self, account, intent):
                receipt = deepcopy(await super().submit(account, intent))
                accepted.set()
                await asyncio.wait_for(release.wait(), timeout=5)
                return receipt

            async def cancel(self, account, intent):
                if not intent.get("broker_order_id"):
                    raise ConflictError("Broker order identity required")
                return deepcopy(await super().cancel(account, intent))

        broker = DelayedBroker()
        run = live_run(broker)
        await lifecycle.apply_run_action(run["id"], {"action": "start"})
        task = asyncio.create_task(execution.submit_order(run["id"], order(run["id"])))
        await asyncio.wait_for(accepted.wait(), timeout=5)
        await reconciliation.reconcile_run(run["id"])
        identified = execution.list_orders(run["id"])["items"][0]
        await execution.cancel_order(run["id"], identified["id"])
        release.set()
        await asyncio.wait_for(task, timeout=5)
        broker.orders[identified["id"]]["status"] = "open"
        result = await reconciliation.reconcile_run(run["id"])
        current = execution.list_orders(run["id"])["items"][0]
        assert result["state"] == "needs_reconciliation"
        assert current["status"] != "open" or current["reserved_cash"] != "0"

    call(scenario())


def test_stale_stop_policy_cannot_clear_newer_reconciliation_failure():
    async def scenario():
        cancel_started, release_cancel = asyncio.Event(), asyncio.Event()

        class SlowCancelBroker(FakeBroker):
            fail_reconcile = False

            async def cancel(self, account, intent):
                cancel_started.set()
                await asyncio.wait_for(release_cancel.wait(), timeout=5)
                return deepcopy(await super().cancel(account, intent))

            async def reconcile(self, account, orders):
                if self.fail_reconcile:
                    raise TimeoutError("synthetic reconciliation failure")
                return deepcopy(await super().reconcile(account, orders))

        broker = SlowCancelBroker()
        run = live_run(broker)
        await lifecycle.apply_run_action(run["id"], {"action": "start"})
        await execution.submit_order(run["id"], order(run["id"]))
        with trading_transaction() as conn:
            TradingStore("runs").update_by_id(
                run["id"], {"state": "needs_reconciliation", "desired_state": "stopped"}, conn=conn
            )
        older = asyncio.create_task(reconciliation.reconcile_run(run["id"]))
        await asyncio.wait_for(cancel_started.wait(), timeout=5)
        broker.fail_reconcile = True
        newer = await reconciliation.reconcile_run(run["id"])
        assert newer["state"] == "needs_reconciliation"
        release_cancel.set()
        result = await asyncio.wait_for(older, timeout=5)
        assert result["state"] == "needs_reconciliation"
        assert workspaces.get_run(run["id"])["state"] == "needs_reconciliation"

    call(scenario())


def test_stale_direct_stop_cannot_clear_newer_reconciliation_failure():
    async def scenario():
        cancel_started, release_cancel = asyncio.Event(), asyncio.Event()

        class SlowCancelBroker(FakeBroker):
            fail_reconcile = False

            async def cancel(self, account, intent):
                cancel_started.set()
                await asyncio.wait_for(release_cancel.wait(), timeout=5)
                return deepcopy(await super().cancel(account, intent))

            async def reconcile(self, account, orders):
                if self.fail_reconcile:
                    raise TimeoutError("synthetic reconciliation failure")
                return deepcopy(await super().reconcile(account, orders))

        broker = SlowCancelBroker()
        run = live_run(broker)
        await lifecycle.apply_run_action(run["id"], {"action": "start"})
        await execution.submit_order(run["id"], order(run["id"]))
        older = asyncio.create_task(lifecycle.apply_run_action(run["id"], {"action": "stop"}))
        await asyncio.wait_for(cancel_started.wait(), timeout=5)
        broker.fail_reconcile = True
        newer = await reconciliation.reconcile_run(run["id"])
        assert newer["state"] == "needs_reconciliation"
        release_cancel.set()
        result = await asyncio.wait_for(older, timeout=5)
        assert result["state"] == "needs_reconciliation"
        assert workspaces.get_run(run["id"])["state"] == "needs_reconciliation"

    call(scenario())


def test_old_reconcile_snapshot_cannot_clear_uncertain_cancel():
    async def scenario():
        snapshot_taken, release_snapshot = asyncio.Event(), asyncio.Event()

        class SlowReconcileBroker(FakeBroker):
            async def reconcile(self, account, orders):
                snapshot = deepcopy(await super().reconcile(account, orders))
                snapshot_taken.set()
                await asyncio.wait_for(release_snapshot.wait(), timeout=5)
                return snapshot

            async def cancel(self, account, intent):
                await super().cancel(account, intent)
                raise TimeoutError("synthetic lost cancel response")

        broker = SlowReconcileBroker()
        run = live_run(broker)
        await lifecycle.apply_run_action(run["id"], {"action": "start"})
        submitted = await execution.submit_order(run["id"], order(run["id"]))
        older = asyncio.create_task(reconciliation.reconcile_run(run["id"]))
        await asyncio.wait_for(snapshot_taken.wait(), timeout=5)
        uncertain = await execution.cancel_order(run["id"], submitted["id"])
        assert uncertain["status"] == "cancel_pending"
        release_snapshot.set()
        result = await asyncio.wait_for(older, timeout=5)
        assert result["state"] == "needs_reconciliation"
        assert execution.list_orders(run["id"])["items"][0]["status"] == "cancel_pending"

    call(scenario())


def test_old_reconcile_snapshot_cannot_clear_inflight_cancel():
    async def scenario():
        snapshot_taken, release_snapshot = asyncio.Event(), asyncio.Event()
        cancel_started, release_cancel = asyncio.Event(), asyncio.Event()

        class HeldBroker(FakeBroker):
            async def reconcile(self, account, orders):
                snapshot = deepcopy(await super().reconcile(account, orders))
                snapshot_taken.set()
                await asyncio.wait_for(release_snapshot.wait(), timeout=5)
                return snapshot

            async def cancel(self, account, intent):
                cancel_started.set()
                await asyncio.wait_for(release_cancel.wait(), timeout=5)
                return deepcopy(await super().cancel(account, intent))

        broker = HeldBroker()
        run = live_run(broker)
        await lifecycle.apply_run_action(run["id"], {"action": "start"})
        submitted = await execution.submit_order(run["id"], order(run["id"]))
        older = asyncio.create_task(reconciliation.reconcile_run(run["id"]))
        await asyncio.wait_for(snapshot_taken.wait(), timeout=5)
        cancel = asyncio.create_task(execution.cancel_order(run["id"], submitted["id"]))
        await asyncio.wait_for(cancel_started.wait(), timeout=5)
        release_snapshot.set()
        result = await asyncio.wait_for(older, timeout=5)
        assert result["state"] == "needs_reconciliation"
        assert execution.list_orders(run["id"])["items"][0]["status"] == "cancel_pending"
        with pytest.raises(ConflictError):
            await execution.submit_order(run["id"], order(run["id"], "second-synthetic"))
        release_cancel.set()
        await asyncio.wait_for(cancel, timeout=5)

    call(scenario())


def test_pause_cannot_clear_unresolved_reconciliation():
    broker = FakeBroker()
    run = live_run(broker)
    call(lifecycle.apply_run_action(run["id"], {"action": "start"}))
    submitted = call(execution.submit_order(run["id"], order(run["id"])))
    call(execution.cancel_order(run["id"], submitted["id"]))
    with trading_transaction() as conn:
        TradingStore("runs").update_by_id(run["id"], {"state": "needs_reconciliation"}, conn=conn)
    paused = call(lifecycle.apply_run_action(run["id"], {"action": "pause"}))
    assert paused["state"] == "needs_reconciliation"
    with pytest.raises(ConflictError):
        call(lifecycle.apply_run_action(run["id"], {"action": "resume"}))


def test_superseded_internal_cancel_does_not_reach_broker():
    class CountingBroker(FakeBroker):
        cancellations = 0

        async def cancel(self, account, intent):
            self.cancellations += 1
            return await super().cancel(account, intent)

    broker = CountingBroker()
    run = live_run(broker)
    call(lifecycle.apply_run_action(run["id"], {"action": "start"}))
    submitted = call(execution.submit_order(run["id"], order(run["id"])))
    with trading_transaction() as conn:
        TradingStore("runs").update_by_id(
            run["id"], {"reconciliation_attempt": "new-attempt"}, conn=conn
        )
    with pytest.raises(ConflictError, match="superseded"):
        call(
            execution.cancel_order(
                run["id"], submitted["id"], _reconciliation_attempt="old-attempt"
            )
        )
    assert broker.cancellations == 0
    assert execution.list_orders(run["id"])["items"][0]["status"] == "open"


def test_resume_rejected_while_pause_cancellation_is_inflight():
    async def scenario():
        cancel_started, release_cancel = asyncio.Event(), asyncio.Event()

        class HeldBroker(FakeBroker):
            async def cancel(self, account, intent):
                cancel_started.set()
                await asyncio.wait_for(release_cancel.wait(), timeout=5)
                return deepcopy(await super().cancel(account, intent))

        broker = HeldBroker()
        run = live_run(broker)
        await lifecycle.apply_run_action(run["id"], {"action": "start"})
        await execution.submit_order(run["id"], order(run["id"]))
        pause = asyncio.create_task(lifecycle.apply_run_action(run["id"], {"action": "pause"}))
        await asyncio.wait_for(cancel_started.wait(), timeout=5)
        with pytest.raises(ConflictError):
            await lifecycle.apply_run_action(run["id"], {"action": "resume"})
        release_cancel.set()
        assert (await asyncio.wait_for(pause, timeout=5))["state"] == "paused"

    call(scenario())


def test_superseded_stop_does_not_cancel_second_order():
    async def scenario():
        first_cancel, release = asyncio.Event(), asyncio.Event()

        class HeldBroker(FakeBroker):
            fail_reconcile = False

            def __init__(self):
                super().__init__()
                self.cancel_ids = []

            async def cancel(self, account, intent):
                self.cancel_ids.append(intent["id"])
                if len(self.cancel_ids) == 1:
                    first_cancel.set()
                    await asyncio.wait_for(release.wait(), timeout=5)
                return deepcopy(await super().cancel(account, intent))

            async def reconcile(self, account, orders):
                if self.fail_reconcile:
                    raise TimeoutError("synthetic newer reconciliation failure")
                return deepcopy(await super().reconcile(account, orders))

        broker = HeldBroker()
        run = live_run(broker)
        await lifecycle.apply_run_action(run["id"], {"action": "start"})
        first = await execution.submit_order(run["id"], order(run["id"], "first-synthetic"))
        second = await execution.submit_order(run["id"], order(run["id"], "second-synthetic"))
        stop = asyncio.create_task(lifecycle.apply_run_action(run["id"], {"action": "stop"}))
        await asyncio.wait_for(first_cancel.wait(), timeout=5)
        broker.fail_reconcile = True
        assert (await reconciliation.reconcile_run(run["id"]))["state"] == "needs_reconciliation"
        release.set()
        with pytest.raises(ConflictError, match="superseded"):
            await asyncio.wait_for(stop, timeout=5)
        assert broker.cancel_ids == [first["id"]]
        assert broker.orders[second["id"]]["status"] == "open"
        assert workspaces.get_run(run["id"])["state"] == "needs_reconciliation"

    call(scenario())
