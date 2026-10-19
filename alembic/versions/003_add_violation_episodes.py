"""add_violation_episodes

Revision ID: 003_add_violation_episodes
Revises: d7bd485c7244
Create Date: 2026-10-19 17:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '003_add_violation_episodes'
down_revision: Union[str, None] = 'd7bd485c7244'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'violation_episodes',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('episode_id', sa.String(length=64), nullable=False),
        sa.Column('vehicle_id', sa.String(length=64), nullable=True),
        sa.Column('license_plate', sa.String(length=32), nullable=True),
        sa.Column('assigned_bay', sa.String(length=32), nullable=True),
        sa.Column('actual_bay', sa.String(length=32), nullable=False),
        sa.Column('state', sa.String(length=32), nullable=True, server_default='WARNED'),
        sa.Column('resolution_reason', sa.String(length=64), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('duration_seconds', sa.Float(), nullable=True, server_default='0.0'),
        sa.Column('source', sa.String(length=32), nullable=True, server_default='live'),
        sa.Column('meta', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_violation_episodes_episode_id'), 'violation_episodes', ['episode_id'], unique=True)
    op.create_index(op.f('ix_violation_episodes_vehicle_id'), 'violation_episodes', ['vehicle_id'], unique=False)
    op.create_index(op.f('ix_violation_episodes_license_plate'), 'violation_episodes', ['license_plate'], unique=False)
    op.create_index(op.f('ix_violation_episodes_actual_bay'), 'violation_episodes', ['actual_bay'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_violation_episodes_actual_bay'), table_name='violation_episodes')
    op.drop_index(op.f('ix_violation_episodes_license_plate'), table_name='violation_episodes')
    op.drop_index(op.f('ix_violation_episodes_vehicle_id'), table_name='violation_episodes')
    op.drop_index(op.f('ix_violation_episodes_episode_id'), table_name='violation_episodes')
    op.drop_table('violation_episodes')
