"""A complete-to-date account statement, with cash movements and known valuation limits."""

from backend.db.trading_store import TradingStore, trading_transaction
from backend.services.trading.accounting import execution_ledger, unrealized_result
from backend.services.trading.common import amount, require_bound_run
from backend.services.trading.performance import account_snapshot, calculate_performance


def get_statement(run_id):
    with trading_transaction() as conn:
        require_bound_run(conn, run_id)
        return _get_statement(run_id, conn=conn)


def _get_statement(run_id, *, conn):
    run = TradingStore("runs").required(run_id, conn=conn)
    fills = TradingStore("fills").list_scope(run_id, conn=conn)
    performance = calculate_performance(run, conn=conn)
    accounts = []
    for account in TradingStore("accounts").list_scope(run_id, conn=conn):
        snapshot = account_snapshot(run, account, conn=conn)
        ledger = execution_ledger(
            account, [row for row in fills if row["account_id"] == account["id"]]
        )
        unrealized = unrealized_result(run, account["positions"])
        accounts.append(
            {
                **snapshot,
                "opening_cash": account["capital"],
                "closing_cash": account["cash"],
                "cash_change": str(amount(account["cash"]) - amount(account["capital"])),
                "realized_pnl": str(ledger["realized_pnl"])
                if ledger["realized_pnl"] is not None and performance["fees_complete"]
                else None,
                "unrealized_pnl": str(unrealized)
                if performance["valuation_complete"] and unrealized is not None
                else None,
                "movements": ledger["movements"],
                "cash_reconciled": ledger["reconciled"],
                "expected_cash": ledger["expected_cash"],
            }
        )
    return {
        **performance,
        "run_id": run_id,
        "workspace_id": run["workspace_id"],
        "mode": run["mode"],
        "period": {
            "start_at": run["start_at"],
            "end_at": run["end_at"],
            "as_of": performance["as_of"],
        },
        "accounts": accounts,
        "fills": fills,
        "cost_basis_method": "average_cost_including_cash_fees",
        "model_cost_treatment": "separate_from_trading_pnl",
        "source": "workspace_execution_records",
        "is_broker_statement": False,
    }
