"""Mark historical option strategy labels as having unknown provenance.

Legacy labels may be user supplied even when they resemble a built-in preset. Preserve them
verbatim and do not infer a preset; newly selected presets are recorded explicitly.
"""

import json

import sqlalchemy as sa
from alembic import op

revision = "202611051300_option_preset"
down_revision = "202611041900_trading_workspace"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    table = sa.table(
        "option_contracts", sa.column("id", sa.Text()), sa.column("payload", sa.JSON())
    )
    for row_id, raw in conn.execute(sa.select(table.c.id, table.c.payload)):
        payload = json.loads(raw) if isinstance(raw, str) else dict(raw)
        if "strategy_preset" not in payload:
            payload["strategy_preset"] = None
            conn.execute(table.update().where(table.c.id == row_id).values(payload=payload))


def downgrade() -> None:
    # The additive marker is safe for older readers, and removing it would lose provenance.
    pass
