"""forma de pagamento no orcamento

Revision ID: 47479ae63de3
Revises: 835357b41528
Create Date: 2026-07-12 12:34:10.564464

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '47479ae63de3'
down_revision: Union[str, Sequence[str], None] = '835357b41528'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # server_default: orcamentos existentes ficam como "parcelas" (o
    # comportamento que ja tinham), sem quebrar o NOT NULL
    with op.batch_alter_table('orcamentos', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                'forma_pagamento',
                sa.String(),
                nullable=False,
                server_default='parcelas',
            )
        )


def downgrade() -> None:
    with op.batch_alter_table('orcamentos', schema=None) as batch_op:
        batch_op.drop_column('forma_pagamento')
