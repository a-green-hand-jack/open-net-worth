"""The one shape every watch rule returns: ``{kind, tone, weight, severity, text}`` (+ optional
``meta`` for the numbers a later rule — materiality, the explained alert — needs)."""

from __future__ import annotations


def finding(
    kind: str,
    tone: str,
    weight: float,
    severity: str,
    text: str,
    *,
    message_id: str | None = None,
    params: dict | None = None,
) -> dict:
    result = {
        "kind": kind,
        "tone": tone,
        "weight": round(weight, 1),
        "severity": severity,
        "text": text,
    }
    if message_id:
        result["text_message"] = {"id": f"watchPulse.{message_id}", "params": params or {}}
    return result
