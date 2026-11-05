"""Broker authority and uncertain submission tests with an in-process synthetic adapter."""

import asyncio
from copy import deepcopy
from datetime import datetime, timedelta, timezone

import pytest

from backend.core.errors import ConflictError
from backend.db.trading_store import TradingStore
from backend.services.trading import execution, lifecycle, performance, reconciliation, workspaces
from backend.services.trading.providers import register_live_adapter

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


def test_same_broker_account_cannot_be_managed_by_two_running_workspaces():
    broker = FakeBroker()
    first = live_run(broker)
    call(lifecycle.apply_run_action(first["id"], {"action": "start"}))
    second = live_run(broker)
    with pytest.raises(ConflictError, match="already managed"):
        call(lifecycle.apply_run_action(second["id"], {"action": "start"}))


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
