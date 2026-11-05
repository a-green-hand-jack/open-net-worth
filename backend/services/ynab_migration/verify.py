"""Compare the migrated book with YNAB, number by number (read-only on both sides)."""

from __future__ import annotations

from backend.core.user_time import user_today
from backend.services import ledger as ledger_service
from backend.services.ynab_migration import apply, source
from backend.services.ynab_migration.mapping import RTA_CATEGORY, SOURCE, amt


def _row(
    group,
    label,
    expected,
    actual,
    note="",
    unit="money",
    label_message=None,
    note_message=None,
    note_details=None,
):
    ok = (
        expected == actual
        if isinstance(expected, (int, str))
        else abs(expected - actual) < apply.TOL
    )
    return {
        "group": group,
        "label": label,
        "expected": expected,
        "actual": actual,
        "ok": ok,
        "note": note,
        "unit": unit,
        "label_message": label_message,
        "note_message": note_message,
        "note_details": note_details,
        "expected_message": {"message_id": "ynab.import.value.present", "params": {}}
        if label_message
        and label_message.get("message_id")
        in {"ynab.import.check.account", "ynab.import.check.envelope"}
        else None,
        "actual_message": {"message_id": "ynab.import.value.missing", "params": {}}
        if label_message
        and label_message.get("message_id")
        in {"ynab.import.check.account", "ynab.import.check.envelope"}
        else None,
    }


def verify_accounts(plan: dict, ynab_accounts: list[dict]) -> list[dict]:
    live = {a["id"]: a for a in ynab_accounts}
    txns = [t for t in ledger_service.transactions.all() if not t.get("deleted")]
    onw = {}
    for a in ledger_service.accounts.query_accounts(include_archived=True):
        for e in a.get("external_ids") or []:
            if e.get("source") == SOURCE:
                onw[e["ref"]] = ledger_service.account_with_balance(a, txns)
    openings = ledger_service.opening_txn_ids()
    out = []
    for pa in plan["accounts"]:
        name, row = pa["payload"]["name"], onw.get(pa["id"])
        if row is None:
            out.append(
                _row(
                    "account",
                    f"{name}: account",
                    "present",
                    "missing",
                    label_message={
                        "message_id": "ynab.import.check.account",
                        "params": {"name": name},
                    },
                )
            )
            continue
        y = live.get(pa["id"], {})
        balance = amt(y.get("balance", 0))
        ysum = pa.get("ynab_sum", balance)
        out.append(
            _row(
                "account",
                f"{name}: balance",
                balance,
                float(row["balance"]),
                ""
                if abs(ysum - balance) < apply.TOL
                else f"YNAB's transactions sum to {ysum:,.2f}",
                label_message={"message_id": "ynab.import.check.balance", "params": {"name": name}},
                note_message=None
                if abs(ysum - balance) < apply.TOL
                else {
                    "message_id": "ynab.import.note.transactionSum",
                    "params": {"amount": f"{ysum:,.2f}"},
                },
            )
        )
        adjust = pa["cleared_adjust"]
        cleared = amt(y.get("cleared_balance", 0))
        note = (
            f"YNAB {cleared:g} {adjust:+.2f}: a transfer is cleared per transaction here"
            if adjust
            else ""
        )
        out.append(
            _row(
                "account",
                f"{name}: cleared balance",
                round(cleared + adjust, 2),
                float(row.get("cleared_balance", 0)),
                note,
                label_message={
                    "message_id": "ynab.import.check.clearedBalance",
                    "params": {"name": name},
                },
                note_message={
                    "message_id": "ynab.import.note.clearedAdjustment",
                    "params": {"cleared": f"{cleared:g}", "adjustment": f"{adjust:+.2f}"},
                }
                if adjust
                else None,
            )
        )
        out.append(_count_row(name, pa, row["id"], txns, openings))
    return out


def _count_row(name: str, pa: dict, account_id: str, txns: list[dict], openings) -> dict:
    """An account linked to one already here also holds rows of its own, which YNAB does not:
    there the check is that every YNAB row is here, and the note says how many are not YNAB's."""
    mine = [t for t in txns if _touches(t, account_id)]
    ynabs = [
        t for t in mine if any(e.get("source") == SOURCE for e in t.get("external_refs") or [])
    ]
    synced = {t["id"] for t in ynabs}
    own = [t for t in mine if t["id"] not in openings and t["id"] not in synced]
    note = f"YNAB has {pa['ynab_rows']}"
    if not own:
        return _row(
            "account",
            f"{name}: transactions",
            pa["expected_rows"],
            len(mine),
            note,
            "count",
            label_message={
                "message_id": "ynab.import.check.transactions",
                "params": {"name": name},
            },
            note_message={
                "message_id": "ynab.import.note.ynabRows",
                "params": {"count": str(pa["ynab_rows"])},
            },
        )
    note += f"; {len(own)} more here are this account's own, not in YNAB"
    return _row(
        "account",
        f"{name}: YNAB transactions",
        pa["expected_rows"] - 1,
        len(ynabs),
        note,
        "count",
        label_message={
            "message_id": "ynab.import.check.ynabTransactions",
            "params": {"name": name},
        },
        note_message={
            "message_id": "ynab.import.note.ynabRowsWithOwn",
            "params": {"count": str(pa["ynab_rows"]), "own": str(len(own))},
        },
    )


def _touches(txn: dict, account_id: str) -> bool:
    return account_id in (txn.get("from_account_id"), txn.get("to_account_id"))


def verify_budget(store, plan_id: str, plan: dict, env_ids: dict[str, dict]) -> list[dict]:
    today = user_today()
    month = f"{today.year:04d}-{today.month:02d}"
    ymonth = source.fetch_month(store, plan_id, month)
    table, rows = apply.month_rows(month)
    ycats = {c["id"]: c for c in ymonth["categories"]}
    out, unsynced = [], []
    for cat in plan["categories"]:
        pair = env_ids.get(cat["id"], {})
        ycat, env = ycats.get(cat["id"]), pair.get("envelope")
        if ycat is None:
            continue
        if env is None and pair.get("category"):
            # Paired, but in a shared envelope or none: its Assigned is not synced by design.
            if ycat.get("budgeted"):
                unsynced.append(cat["label"])
            continue
        if env is None or env not in rows:
            out.append(
                _row(
                    "envelope",
                    f"{cat['label']}: envelope",
                    "present",
                    "missing",
                    label_message={
                        "message_id": "ynab.import.check.envelope",
                        "params": {"name": cat["label"]},
                    },
                )
            )
            continue
        out.append(
            _row(
                "envelope",
                f"{cat['label']}: assigned {month}",
                amt(ycat["budgeted"]),
                float(rows[env]["assigned"]),
                label_message={
                    "message_id": "ynab.import.check.assigned",
                    "params": {"name": cat["label"], "month": month},
                },
            )
        )
        out.append(
            _row(
                "envelope",
                f"{cat['label']}: available {month}",
                amt(ycat["balance"]),
                float(rows[env]["available"]),
                label_message={
                    "message_id": "ynab.import.check.available",
                    "params": {"name": cat["label"], "month": month},
                },
            )
        )
    out += _special_rows(plan, ycats, rows, table, month)
    ready_note, ready_message = _ready_note(unsynced)
    out.append(
        _row(
            "ready",
            f"Ready to Assign {month}",
            amt(ymonth["to_be_budgeted"]),
            float(table["ready_to_assign"]),
            ready_note,
            label_message={"message_id": "ynab.import.check.ready", "params": {"month": month}},
            note_message=ready_message,
        )
    )
    return out


def _ready_note(unsynced: list[str]) -> tuple[str, dict | None]:
    """Why Ready to Assign can rightly differ: money YNAB doesn't hold here, or Assigned that
    isn't synced. Empty when neither applies."""
    reasons = []
    extra_accounts = any(
        not a.get("archived")
        and not any(e.get("source") == SOURCE for e in a.get("external_ids") or [])
        for a in ledger_service.accounts.query_accounts(include_archived=False)
    )
    if extra_accounts:
        reasons.append("this book also has accounts YNAB doesn't")
    if unsynced:
        names = ", ".join(unsynced[:3]) + (" and others" if len(unsynced) > 3 else "")
        reasons.append(f"the Assigned of {names} isn't synced")
    if not reasons:
        return "", None
    key = (
        "readyBoth"
        if extra_accounts and unsynced
        else "readyAccounts"
        if extra_accounts
        else "readyUnsynced"
    )
    params = (
        {"names": ", ".join(unsynced[:3]), "others": "yes" if len(unsynced) > 3 else "no"}
        if unsynced
        else {}
    )
    return f"Can differ, as {' and '.join(reasons)}.", {
        "message_id": f"ynab.import.note.{key}",
        "params": params,
    }


def _line_diff(plan: dict, month: str, cid: str, cat_id: str | None) -> tuple[str, str, str, dict]:
    """Which transactions only one side counts for this category and month."""
    ynab = plan.get("lines", {}).get(f"{month}|{cid}", {})
    here: dict[str, float] = {}
    for t in ledger_service.transactions.all():
        if t.get("deleted") or not (t.get("date") or "").startswith(month):
            continue
        parts = [s for s in t.get("splits") or [] if s.get("category") == cat_id]
        amount = sum(s["amount"] for s in parts) if parts else None
        if amount is None and t.get("category") == cat_id:
            amount = t.get("from_amount") or t.get("to_amount") or 0
        if amount is None:
            continue
        for r in t.get("external_refs") or []:
            here[r.get("ref")] = amount
    ynab_items = [{"amount": amt(v), "ref": k[:8]} for k, v in ynab.items() if k not in here][:6]
    here_items = [
        {"amount": float(v), "ref": k[:8]}
        for k, v in here.items()
        if k not in ynab and ":" not in k
    ][:6]
    only_ynab = [f"{item['amount']:,.2f} [{item['ref']}]" for item in ynab_items]
    only_here = [f"{item['amount']:,.2f} [{item['ref']}]" for item in here_items]
    left, right = str(only_ynab[:6]), str(only_here[:6])
    return (
        f" · only in YNAB: {left} · only here: {right}",
        left,
        right,
        {"onlyYnab": ynab_items, "onlyHere": here_items},
    )


def first_divergence(plan: dict, env_ids: dict[str, dict], until: str) -> list[dict]:
    """Walk every past month oldest-first and report, per envelope, the FIRST month whose
    activity or available differs from YNAB — the month to look at when today's figure is off."""
    labels = {c["id"]: c["label"] for c in plan["categories"]}
    labels |= {
        cid: f"{name} (card payment)" for cid, name in plan.get("card_categories", {}).items()
    }
    pending = {cid for cid in labels if env_ids.get(cid, {}).get("envelope")}
    out, rta_done = [], False
    for month in sorted(m for m in plan.get("history", {}) if m < until):
        if not pending and rta_done:
            break
        hist = plan["history"][month]
        table, rows = apply.month_rows(month)
        for cid in sorted(pending):
            row = rows.get(env_ids[cid]["envelope"])
            if row is None or cid not in hist["cats"]:
                continue
            activity, balance = (amt(v) for v in hist["cats"][cid])
            if (
                abs(activity - row["activity"]) < apply.TOL
                and abs(balance - row["available"]) < apply.TOL
            ):
                continue
            pending.discard(cid)
            diff_text, only_ynab, only_here, note_details = _line_diff(
                plan, month, cid, env_ids[cid].get("category")
            )
            out.append(
                _row(
                    "history",
                    f"{labels[cid]}: first differs {month}",
                    balance,
                    float(row["available"]),
                    f"available · activity YNAB {activity:,.2f} here {row['activity']:,.2f}"
                    + diff_text,
                    label_message={
                        "message_id": "ynab.import.check.firstDiffersCard"
                        if cid in plan.get("card_categories", {})
                        else "ynab.import.check.firstDiffers",
                        "params": {
                            "name": plan["card_categories"][cid]
                            if cid in plan.get("card_categories", {})
                            else labels[cid],
                            "month": month,
                        },
                    },
                    note_message={
                        "message_id": "ynab.import.note.historyActivity",
                        "params": {
                            "activity": f"{activity:,.2f}",
                            "here": f"{row['activity']:,.2f}",
                            "onlyYnab": only_ynab,
                            "onlyHere": only_here,
                        },
                    },
                    note_details=note_details,
                )
            )
        if not rta_done and abs(amt(hist["rta"]) - table["ready_to_assign"]) >= apply.TOL:
            rta_done = True
            out.append(
                _row(
                    "history",
                    f"Ready to Assign: first differs {month}",
                    amt(hist["rta"]),
                    float(table["ready_to_assign"]),
                    label_message={
                        "message_id": "ynab.import.check.readyFirstDiffers",
                        "params": {"month": month},
                    },
                )
            )
    return out


def _special_rows(plan, ycats, rows, table, month) -> list[dict]:
    """YNAB's credit card payment and Uncategorized categories are not migrated as envelopes
    (the app keeps its own payment envelope and uncategorized hold); compare them to those."""
    migrated = {c["id"] for c in plan["categories"]}
    by_label = {r["label"].lower(): r for r in rows.values()}
    out = []
    for cid, ycat in ycats.items():
        name = ycat.get("name") or ""
        if cid in migrated or ycat.get("deleted") or name.strip().lower() == RTA_CATEGORY:
            continue
        if name.strip().lower() == "uncategorized":
            actual = float(table.get("held_outside_envelopes") or 0)
        elif name.lower() in by_label:
            actual = float(by_label[name.lower()]["available"])
        elif ycat.get("balance") or ycat.get("activity"):
            actual = 0.0  # a YNAB category holding money that has no counterpart here
        else:
            continue
        out.append(
            _row(
                "special",
                f"{name}: available {month}",
                amt(ycat["balance"]),
                actual,
                f"YNAB activity {amt(ycat.get('activity', 0)):,.2f}, "
                f"assigned {amt(ycat.get('budgeted', 0)):,.2f}",
                label_message={
                    "message_id": "ynab.import.check.available",
                    "params": {"name": name, "month": month},
                },
                note_message={
                    "message_id": "ynab.import.note.activityAssigned",
                    "params": {
                        "activity": f"{amt(ycat.get('activity', 0)):,.2f}",
                        "assigned": f"{amt(ycat.get('budgeted', 0)):,.2f}",
                    },
                },
            )
        )
    return out


def verify(store, plan_id: str, plan: dict, env_ids: dict[str, dict], with_budget: bool) -> dict:
    """Re-reads YNAB's CURRENT figures, so it reflects the plan as it stands now."""
    rows = verify_accounts(plan, source.fetch_accounts(store, plan_id))
    if with_budget:
        rows += verify_budget(store, plan_id, plan, env_ids)
        if not all(r["ok"] for r in rows if r["group"] in ("envelope", "special")):
            today = user_today()
            rows += first_divergence(plan, env_ids, f"{today.year:04d}-{today.month:02d}")
    return {
        "rows": rows,
        "ok": all(r["ok"] for r in rows),
        "mismatches": sum(not r["ok"] for r in rows),
    }
