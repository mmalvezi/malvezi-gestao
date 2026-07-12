"""titulo nas notas do projeto

Revision ID: 4abf9b9348d2
Revises: fa1b0d717393
Create Date: 2026-07-12 09:25:51.904604

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4abf9b9348d2'
down_revision: Union[str, Sequence[str], None] = 'fa1b0d717393'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # server_default vazio: notas antigas ganham titulo "" sem quebrar o
    # NOT NULL em tabelas que ja tem linhas
    with op.batch_alter_table('notas_projeto', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column('titulo', sa.String(), nullable=False, server_default='')
        )


def downgrade() -> None:
    with op.batch_alter_table('notas_projeto', schema=None) as batch_op:
        batch_op.drop_column('titulo')
